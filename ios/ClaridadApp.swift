import UIKit
import WebKit
import LocalAuthentication
import Vision
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    private var mainVC: ClaridadViewController?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let vc = ClaridadViewController()
        self.mainVC = vc
        let win = UIWindow(frame: UIScreen.main.bounds)
        win.rootViewController = vc
        win.makeKeyAndVisible()
        self.window = win

        if let url = launchOptions?[.url] as? URL {
            vc.handleIncomingURL(url)
        }
        return true
    }

    // Handle claridad://pay?add=14.50&desc=Mercadona&user=2 from iPhone Apple Pay Shortcuts
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        mainVC?.handleIncomingURL(url)
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        mainVC?.notifyAppForeground()
    }
}

class ClaridadViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, UIScrollViewDelegate, WKScriptMessageHandler {
    private var webView: WKWebView!
    private var pendingQuery: String?
    private var isPageLoaded = false
    private var currentIsDark = false
    private let refreshControl = UIRefreshControl()

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return currentIsDark ? .lightContent : .darkContent
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        applyNativeThemeBackground(isDark: traitCollection.userInterfaceStyle == .dark)

        let config = WKWebViewConfiguration()
        config.websiteDataStore = WKWebsiteDataStore.default()
        config.allowsInlineMediaPlayback = true

        // Native JS <-> Swift bridge for Haptics, Theme/Status Bar Sync, and Native Share Sheet
        let controller = config.userContentController
        controller.add(self, name: "claridadNative")

        // Inject viewport lock + native bridge helper at document start/end
        let nativeInitJS = """
        window.__CLARIDAD_IOS_NATIVE__ = true;
        window.claridadHaptic = function(style) {
          try { window.webkit.messageHandlers.claridadNative.postMessage({ type: 'haptic', style: style || 'light' }); } catch(e) {}
        };
        window.claridadSetNativeTheme = function(isDark) {
          try { window.webkit.messageHandlers.claridadNative.postMessage({ type: 'theme', dark: !!isDark }); } catch(e) {}
        };
        window.claridadNativeShare = function(title, text, url) {
          try { window.webkit.messageHandlers.claridadNative.postMessage({ type: 'share', title: title || '', text: text || '', url: url || '' }); return true; } catch(e) { return false; }
        };
        window.__claridadBioResolvers = {};
        window.__claridadBioResolve = function(id, ok) {
          var fn = window.__claridadBioResolvers[id];
          delete window.__claridadBioResolvers[id];
          if (typeof fn === 'function') fn(!!ok);
        };
        window.claridadBiometricAuth = function(reason) {
          return new Promise(function(resolve) {
            var id = 'bio_' + Math.random().toString(36).slice(2, 10);
            window.__claridadBioResolvers[id] = resolve;
            try {
              window.webkit.messageHandlers.claridadNative.postMessage({ type: 'biometric', id: id, reason: reason || 'Desbloquear Claridad Financiera' });
            } catch(e) {
              delete window.__claridadBioResolvers[id];
              resolve(false);
            }
          });
        };
        window.__claridadOcrResolvers = {};
        window.__claridadOcrResolve = function(id, text) {
          var fn = window.__claridadOcrResolvers[id];
          delete window.__claridadOcrResolvers[id];
          if (typeof fn === 'function') fn(text || '');
        };
        window.claridadNativeOCR = function(dataUrl) {
          return new Promise(function(resolve) {
            var id = 'ocr_' + Math.random().toString(36).slice(2, 10);
            window.__claridadOcrResolvers[id] = resolve;
            try {
              window.webkit.messageHandlers.claridadNative.postMessage({ type: 'ocr', id: id, dataUrl: String(dataUrl || '') });
            } catch(e) {
              delete window.__claridadOcrResolvers[id];
              resolve('');
            }
          });
        };
        window.__claridadNotifResolvers = {};
        window.__claridadNotifResolve = function(id, ok) {
          var fn = window.__claridadNotifResolvers[id];
          delete window.__claridadNotifResolvers[id];
          if (typeof fn === 'function') fn(!!ok);
        };
        window.claridadRequestNotifPermission = function() {
          return new Promise(function(resolve) {
            var id = 'np_' + Math.random().toString(36).slice(2, 10);
            window.__claridadNotifResolvers[id] = resolve;
            try {
              window.webkit.messageHandlers.claridadNative.postMessage({ type: 'notif_perm', id: id });
            } catch(e) {
              delete window.__claridadNotifResolvers[id];
              resolve(false);
            }
          });
        };
        window.claridadScheduleLocalNotif = function(id, title, body, delaySeconds) {
          try {
            window.webkit.messageHandlers.claridadNative.postMessage({
              type: 'notif_local',
              id: String(id || 'claridad_notif'),
              title: String(title || 'Claridad Financiera'),
              body: String(body || ''),
              delay: Number(delaySeconds || 1)
            });
            return true;
          } catch(e) { return false; }
        };
        """
        controller.addUserScript(WKUserScript(source: nativeInitJS, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let noZoomJS = """
        var meta = document.querySelector('meta[name=viewport]');
        if (meta) {
          meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
        document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
        """
        controller.addUserScript(WKUserScript(source: noZoomJS, injectionTime: .atDocumentEnd, forMainFrameOnly: true))

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.scrollView.delegate = self

        // Edge-to-edge full screen: CSS env(safe-area-inset-top/bottom) covers Dynamic Island, status bar & home indicator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0
        webView.scrollView.bouncesZoom = false
        webView.isOpaque = false
        webView.backgroundColor = .clear

        // Native iOS Pull-to-Refresh for live Supabase sync
        refreshControl.tintColor = UIColor(red: 79.0/255.0, green: 70.0/255.0, blue: 229.0/255.0, alpha: 1.0)
        refreshControl.addTarget(self, action: #selector(handlePullToRefresh), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl

        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
        } else if let remoteURL = URL(string: "https://hugosaezz.github.io/claridad-financiera/") {
            webView.load(URLRequest(url: remoteURL))
        }
    }

    @objc private func handlePullToRefresh() {
        triggerHaptic(style: "medium")
        webView.evaluateJavaScript("window.cargarDatosSupabase && window.cargarDatosSupabase(true);") { [weak self] _, _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
                self?.refreshControl.endRefreshing()
            }
        }
    }

    func notifyAppForeground() {
        guard isPageLoaded else { return }
        webView.evaluateJavaScript("window.cargarDatosSupabase && window.cargarDatosSupabase(false);", completionHandler: nil)
    }

    private func applyNativeThemeBackground(isDark: Bool) {
        currentIsDark = isDark
        if isDark {
            view.backgroundColor = UIColor(red: 11.0/255.0, green: 15.0/255.0, blue: 25.0/255.0, alpha: 1.0)
            refreshControl.tintColor = UIColor(red: 129.0/255.0, green: 140.0/255.0, blue: 248.0/255.0, alpha: 1.0)
        } else {
            view.backgroundColor = UIColor(red: 246.0/255.0, green: 247.0/255.0, blue: 251.0/255.0, alpha: 1.0)
            refreshControl.tintColor = UIColor(red: 79.0/255.0, green: 70.0/255.0, blue: 229.0/255.0, alpha: 1.0)
        }
        setNeedsStatusBarAppearanceUpdate()
    }

    private func triggerHaptic(style: String) {
        switch style {
        case "success":
            let gen = UINotificationFeedbackGenerator()
            gen.prepare()
            gen.notificationOccurred(.success)
        case "warning":
            let gen = UINotificationFeedbackGenerator()
            gen.prepare()
            gen.notificationOccurred(.warning)
        case "error":
            let gen = UINotificationFeedbackGenerator()
            gen.prepare()
            gen.notificationOccurred(.error)
        case "medium":
            let gen = UIImpactFeedbackGenerator(style: .medium)
            gen.prepare()
            gen.impactOccurred()
        case "heavy":
            let gen = UIImpactFeedbackGenerator(style: .heavy)
            gen.prepare()
            gen.impactOccurred()
        case "selection":
            let gen = UISelectionFeedbackGenerator()
            gen.prepare()
            gen.selectionChanged()
        default:
            let gen = UIImpactFeedbackGenerator(style: .light)
            gen.prepare()
            gen.impactOccurred()
        }
    }

    // Receive messages from Web JS
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "claridadNative", let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if type == "haptic" {
                let style = body["style"] as? String ?? "light"
                self.triggerHaptic(style: style)
            } else if type == "theme" {
                let dark = body["dark"] as? Bool ?? false
                self.applyNativeThemeBackground(isDark: dark)
            } else if type == "biometric" {
                let reqId = body["id"] as? String ?? ""
                let reason = body["reason"] as? String ?? "Desbloquear Claridad Financiera"
                let ctx = LAContext()
                var authErr: NSError?
                if ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authErr) {
                    ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, _ in
                        DispatchQueue.main.async {
                            let safeId = reqId.replacingOccurrences(of: "'", with: "")
                            self.webView.evaluateJavaScript("window.__claridadBioResolve && window.__claridadBioResolve('\(safeId)', \(success ? "true" : "false"));", completionHandler: nil)
                        }
                    }
                } else {
                    let safeId = reqId.replacingOccurrences(of: "'", with: "")
                    self.webView.evaluateJavaScript("window.__claridadBioResolve && window.__claridadBioResolve('\(safeId)', false);", completionHandler: nil)
                }
            } else if type == "ocr" {
                let reqId = body["id"] as? String ?? ""
                let dataUrl = body["dataUrl"] as? String ?? ""
                self.performNativeVisionOCR(reqId: reqId, dataUrl: dataUrl)
            } else if type == "notif_perm" {
                let reqId = body["id"] as? String ?? ""
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                    DispatchQueue.main.async {
                        let safeId = reqId.replacingOccurrences(of: "'", with: "")
                        self.webView.evaluateJavaScript("window.__claridadNotifResolve && window.__claridadNotifResolve('\(safeId)', \(granted ? "true" : "false"));", completionHandler: nil)
                    }
                }
            } else if type == "notif_local" {
                let nId = body["id"] as? String ?? UUID().uuidString
                let nTitle = body["title"] as? String ?? "Claridad Financiera"
                let nBody = body["body"] as? String ?? ""
                let delay = max(1.0, (body["delay"] as? Double) ?? 1.0)
                let content = UNMutableNotificationContent()
                content.title = nTitle
                content.body = nBody
                content.sound = .default
                let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
                let req = UNNotificationRequest(identifier: nId, content: content, trigger: trigger)
                UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
            } else if type == "share" {
                var items: [Any] = []
                if let text = body["text"] as? String, !text.isEmpty { items.append(text) }
                if let urlStr = body["url"] as? String, let u = URL(string: urlStr) { items.append(u) }
                if !items.isEmpty {
                    let activityVC = UIActivityViewController(activityItems: items, applicationActivities: nil)
                    activityVC.popoverPresentationController?.sourceView = self.view
                    self.present(activityVC, animated: true)
                }
            }
        }
    }

    // Native offline Apple Vision OCR (VNRecognizeTextRequest) for instant item-level ticket scanning
    private func performNativeVisionOCR(reqId: String, dataUrl: String) {
        let safeId = reqId.replacingOccurrences(of: "'", with: "")
        let resolveJS: (String) -> Void = { [weak self] text in
            DispatchQueue.main.async {
                guard let self = self else { return }
                let jsonData = (try? JSONSerialization.data(withJSONObject: [text], options: [])) ?? Data()
                let jsonArr = String(data: jsonData, encoding: .utf8) ?? "[\"\"]"
                self.webView.evaluateJavaScript("window.__claridadOcrResolve && window.__claridadOcrResolve('\(safeId)', (\(jsonArr))[0]);", completionHandler: nil)
            }
        }

        let base64Part: String
        if let commaIdx = dataUrl.firstIndex(of: ",") {
            base64Part = String(dataUrl[dataUrl.index(after: commaIdx)...])
        } else {
            base64Part = dataUrl
        }
        guard let imgData = Data(base64Encoded: base64Part, options: .ignoreUnknownCharacters),
              let uiImage = UIImage(data: imgData),
              let cgImage = uiImage.cgImage else {
            resolveJS("")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNRecognizeTextRequest { req, _ in
                let observations = (req.results as? [VNRecognizedTextObservation]) ?? []
                let lines = observations.compactMap { $0.topCandidates(1).first?.string }
                resolveJS(lines.joined(separator: "\n"))
            }
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["es-ES", "en-US"]
            request.usesLanguageCorrection = true
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                resolveJS("")
            }
        }
    }

    // Completely disable zooming in WKWebView scrollView
    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
        return nil
    }

    func scrollViewWillBeginZooming(_ scrollView: UIScrollView, with view: UIView?) {
        scrollView.pinchGestureRecognizer?.isEnabled = false
    }

    func handleIncomingURL(_ url: URL) {
        guard let query = url.query, !query.isEmpty else { return }
        if isPageLoaded {
            let escaped = query.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
            webView.evaluateJavaScript("window.handleApplePayShortcutQuery && window.handleApplePayShortcutQuery('?\(escaped)');", completionHandler: nil)
        } else {
            pendingQuery = query
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isPageLoaded = true
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        if let q = pendingQuery {
            pendingQuery = nil
            let escaped = q.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
            webView.evaluateJavaScript("window.handleApplePayShortcutQuery && window.handleApplePayShortcutQuery('?\(escaped)');", completionHandler: nil)
        }
    }

    // Open WhatsApp / external links in native iOS apps
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if let url = navigationAction.request.url {
            let scheme = url.scheme?.lowercased() ?? ""
            if url.host?.contains("whatsapp.com") == true || scheme == "whatsapp" || scheme == "mailto" || scheme == "tel" || scheme == "altstore" || scheme == "sidestore" {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
        return nil
    }

    // Native iOS Alert / Confirm / Prompt dialogs for JS
    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = UIAlertController(title: "Claridad Financiera", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Aceptar", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = UIAlertController(title: "Confirmar", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "Confirmar", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        let alert = UIAlertController(title: "Claridad Financiera", message: prompt, preferredStyle: .alert)
        alert.addTextField { tf in tf.text = defaultText }
        alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "Guardar", style: .default) { _ in
            completionHandler(alert.textFields?.first?.text)
        })
        present(alert, animated: true)
    }
}
