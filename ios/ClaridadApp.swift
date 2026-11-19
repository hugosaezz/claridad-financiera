import UIKit
import WebKit

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
}

class ClaridadViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, UIScrollViewDelegate {
    private var webView: WKWebView!
    private var pendingQuery: String?
    private var isPageLoaded = false

    override func viewDidLoad() {
        super.viewDidLoad()
        // Match Claridad surface color so status bar / safe area never flashes white
        view.backgroundColor = UIColor(red: 250.0/255.0, green: 248.0/255.0, blue: 255.0/255.0, alpha: 1.0)

        let config = WKWebViewConfiguration()
        config.websiteDataStore = WKWebsiteDataStore.default()
        config.allowsInlineMediaPlayback = true

        // Inject viewport lock script so pinch-to-zoom and double-tap zoom are disabled natively
        let noZoomJS = """
        var meta = document.querySelector('meta[name=viewport]');
        if (meta) {
          meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
        document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
        """
        let userScript = WKUserScript(source: noZoomJS, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        config.userContentController.addUserScript(userScript)

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.scrollView.delegate = self

        // Edge-to-edge full screen: let CSS env(safe-area-inset-top) and env(safe-area-inset-bottom) cover status bar & home indicator seamlessly
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0
        webView.scrollView.bouncesZoom = false
        webView.isOpaque = false
        webView.backgroundColor = .clear

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
