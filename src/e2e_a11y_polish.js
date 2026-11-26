    // ============================================================================
    // 8. PERSONAL E2E ENCRYPTION (AES-256-GCM + 12-WORD PHRASE), A11Y WCAG 2.2 AA,
    //    KEYBOARD SHORTCUTS, i18n, PWA SHARE TARGET & HUMAN CHANGELOG
    // ============================================================================

    const E2E_WORDLIST_ES = [
      'abril', 'acero', 'agua', 'aire', 'alamo', 'alba', 'aldea', 'alga',
      'alma', 'alto', 'ambar', 'amigo', 'ancla', 'arena', 'aroma', 'arte',
      'astro', 'avena', 'avion', 'azul', 'bahia', 'bambu', 'barco', 'brisa',
      'bosque', 'bronce', 'buho', 'cable', 'cafe', 'calma', 'campo', 'canal',
      'canto', 'carta', 'cedro', 'cielo', 'clima', 'cobre', 'coral', 'costa',
      'cumbre', 'danza', 'delta', 'duna', 'eco', 'encina', 'enigma', 'epoca',
      'esfera', 'espiga', 'faro', 'fauna', 'fibra', 'finca', 'flora', 'fuego',
      'gala', 'gema', 'globo', 'grano', 'gruta', 'hacha', 'hebra', 'hielo',
      'hoja', 'huerto', 'isla', 'jade', 'jardin', 'junta', 'lago', 'lanza',
      'laurel', 'letra', 'lino', 'llama', 'llave', 'loma', 'luna', 'luz',
      'madera', 'marea', 'marfil', 'mate', 'meta', 'miel', 'mirlo', 'monte',
      'musgo', 'nacar', 'nave', 'niebla', 'nieve', 'nube', 'nuez', 'oasis',
      'olivo', 'onda', 'opalo', 'orbe', 'palma', 'pampa', 'paso', 'perla',
      'piedra', 'pino', 'plata', 'pluma', 'polen', 'prado', 'puente', 'pulso',
      'quarz', 'rama', 'rayo', 'ribera', 'roble', 'roca', 'rosa', 'ruta',
      'salvia', 'selva', 'senda', 'sierra', 'silbo', 'sol', 'sombra', 'tallo'
    ];

    function generateRecoveryPhrase12() {
      const words = [];
      const len = E2E_WORDLIST_ES.length;
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint32Array(12);
        crypto.getRandomValues(buf);
        for (let i = 0; i < 12; i++) words.push(E2E_WORDLIST_ES[buf[i] % len]);
      } else {
        for (let i = 0; i < 12; i++) words.push(E2E_WORDLIST_ES[Math.floor(Math.random() * len)]);
      }
      return words.join(' ');
    }

    function normalizeRecoveryPhrase(phrase) {
      return String(phrase || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function bytesToBase64(bytes) {
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }

    function base64ToBytes(b64) {
      const bin = atob(String(b64 || ''));
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }

    function isWebCryptoAESAvailable() {
      return typeof crypto !== 'undefined' && !!(crypto.subtle && typeof crypto.subtle.encrypt === 'function');
    }

    async function deriveE2EKeyFromPhrase(phrase, saltBytes) {
      const norm = normalizeRecoveryPhrase(phrase);
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey('raw', enc.encode(norm), 'PBKDF2', false, ['deriveKey']);
      return await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBytes, iterations: 150000, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    /**
     * Encrypt any JSON-serializable personal dataset with AES-256-GCM + PBKDF2-SHA256.
     */
    async function encryptPersonalPayloadE2E(plainObj, phrase) {
      const norm = normalizeRecoveryPhrase(phrase);
      if (norm.split(' ').length < 6) throw new Error('La frase de recuperación debe tener al menos 6 palabras');
      if (!isWebCryptoAESAvailable()) throw new Error('Web Crypto AES-GCM requiere HTTPS o localhost');

      const salt = new Uint8Array(16);
      const iv = new Uint8Array(12);
      crypto.getRandomValues(salt);
      crypto.getRandomValues(iv);

      const key = await deriveE2EKeyFromPhrase(norm, salt);
      const plaintextBytes = new TextEncoder().encode(JSON.stringify(plainObj));
      const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintextBytes);

      return {
        claridad_e2e: true,
        v: 1,
        alg: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iter: 150000,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
        createdAt: new Date().toISOString()
      };
    }

    async function decryptPersonalPayloadE2E(envelope, phrase) {
      if (!envelope || !envelope.claridad_e2e || !envelope.ciphertext) {
        throw new Error('Archivo cifrado no válido');
      }
      if (!isWebCryptoAESAvailable()) throw new Error('Web Crypto AES-GCM requiere HTTPS o localhost');
      const salt = base64ToBytes(envelope.salt);
      const iv = base64ToBytes(envelope.iv);
      const cipherBytes = base64ToBytes(envelope.ciphertext);
      const key = await deriveE2EKeyFromPhrase(phrase, salt);
      const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
      return JSON.parse(new TextDecoder().decode(plainBuf));
    }

    /** Deterministic non-crypto checksum for verifying phrase entry without storing the raw phrase */
    function computePhraseFingerprint(phrase) {
      const norm = normalizeRecoveryPhrase(phrase);
      let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
      for (let i = 0; i < norm.length; i++) {
        const ch = norm.charCodeAt(i);
        h1 ^= ch; h1 = Math.imul(h1, 0x01000193);
        h2 ^= ch; h2 = Math.imul(h2, 0x85ebca6b);
      }
      return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
    }

    function getE2EConfig() {
      try {
        const raw = localStorage.getItem('claridad_e2e_cfg_v1');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return { enabled: false, fingerprint: null, enabledAt: null };
    }

    function saveE2EConfig(cfg) {
      try { localStorage.setItem('claridad_e2e_cfg_v1', JSON.stringify(cfg)); } catch (e) {}
    }

    // --- 3-Step E2E Setup Wizard (Explain -> 12 Words + Recovery Kit -> Verification Test) ---
    let e2eWizardState = null;

    function openE2ESetupModal() {
      const phrase = generateRecoveryPhrase12();
      const words = phrase.split(' ');
      const idx1 = 2; // Word #3
      const idx2 = 8; // Word #9
      e2eWizardState = { step: 1, phrase, words, checkIdx: [idx1, idx2] };
      renderE2ESetupModal();
    }

    function renderE2ESetupModal() {
      const st = e2eWizardState;
      if (!st) return;

      if (st.step === 1) {
        openUniversalModal(`
          <div class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface flex items-center gap-2">
                ${ico('shield', 'text-secondary text-[20px]')}
                Cifrado E2E Personal (AES-256-GCM)
              </h3>
              <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
            </div>
            <div class="p-3.5 rounded-2xl bg-secondary/10 border border-secondary/25 text-xs text-on-surface leading-relaxed">
              <strong>Conocimiento cero real:</strong> tus copias y respaldos personales se cifran en tu dispositivo con <strong>AES-256-GCM</strong> antes de guardarse o exportarse. Nadie —ni siquiera el servidor— puede leer tus cifras sin tu frase de 12 palabras.
            </div>
            <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200">
              ⚠️ <strong>Importante:</strong> como nadie guarda tu frase, si la pierdes no podremos descifrar tus backups E2E. Te daremos un <strong>Kit de Recuperación imprimible</strong> en el siguiente paso.
            </div>
            <button onclick="e2eWizardState.step=2; renderE2ESetupModal()" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm active-scale">
              Generar mi frase de 12 palabras →
            </button>
          </div>
        `);
        return;
      }

      if (st.step === 2) {
        openUniversalModal(`
          <div class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Paso 2/3 · Tu frase de recuperación</h3>
                <p class="text-[11px] text-on-surface-variant">Guárdala en papel o en tu gestor de contraseñas</p>
              </div>
              <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
            </div>

            <div class="grid grid-cols-3 gap-2">
              ${st.words.map((w, i) => `
                <div class="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs flex items-center gap-1.5">
                  <span class="text-[10px] font-mono text-outline">${i + 1}.</span>
                  <strong class="font-extrabold text-on-surface">${esc(w)}</strong>
                </div>
              `).join('')}
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button onclick="copySensitiveTextWithAutoClear('${esc(st.phrase)}', 'Frase copiada (se borra del portapapeles en 60s)')" class="py-2 px-3 rounded-xl bg-surface-container text-on-surface text-xs font-extrabold active-scale">
                📋 Copiar (60s)
              </button>
              <button onclick="exportE2ERecoveryKitHTML('${esc(st.phrase)}')" class="py-2 px-3 rounded-xl bg-secondary/15 text-secondary text-xs font-extrabold active-scale">
                🖨️ Kit recuperación
              </button>
            </div>

            <button onclick="e2eWizardState.step=3; renderE2ESetupModal()" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm active-scale">
              Ya la guardé · Verificar ahora →
            </button>
          </div>
        `);
        return;
      }

      // Step 3: Mandatory 2-word verification
      const [i1, i2] = st.checkIdx;
      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Paso 3/3 · Confirmación rápida</h3>
              <p class="text-[11px] text-on-surface-variant">Comprobamos que tienes tu frase a mano antes de activar E2E</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Palabra #${i1 + 1}</label>
              <input id="e2e-chk-1" type="text" autocomplete="off" placeholder="Escribe palabra #${i1 + 1}" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            </div>
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Palabra #${i2 + 1}</label>
              <input id="e2e-chk-2" type="text" autocomplete="off" placeholder="Escribe palabra #${i2 + 1}" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="e2eWizardState.step=2; renderE2ESetupModal()" class="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold">Atrás</button>
            <button onclick="completeE2ESetupVerification()" class="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary font-extrabold text-xs active-scale">
              Verificar y activar E2E ✓
            </button>
          </div>
        </div>
      `);
    }

    function completeE2ESetupVerification() {
      const st = e2eWizardState;
      if (!st) return;
      const w1 = normalizeRecoveryPhrase($('#e2e-chk-1')?.value || '');
      const w2 = normalizeRecoveryPhrase($('#e2e-chk-2')?.value || '');
      if (w1 !== st.words[st.checkIdx[0]] || w2 !== st.words[st.checkIdx[1]]) {
        showToast('Alguna palabra no coincide. Revisa tu frase en el paso anterior.');
        return;
      }
      const fp = computePhraseFingerprint(st.phrase);
      saveE2EConfig({ enabled: true, fingerprint: fp, enabledAt: Date.now() });
      window.__claridadSessionE2EPhrase = st.phrase; // Held in RAM only during active session
      if (typeof logAuditEvent === 'function') logAuditEvent('e2e_enabled', 'Cifrado E2E AES-256-GCM activado');
      closeUniversalModal();
      renderAllViews();
      showToast('🛡️ Cifrado E2E AES-256-GCM activado ✓');
    }

    function exportE2ERecoveryKitHTML(phrase) {
      const words = normalizeRecoveryPhrase(phrase).split(' ');
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Kit de Recuperación E2E — Claridad Financiera</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111827; padding: 32px; max-width: 700px; margin: 0 auto; }
  .box { border: 2px solid #4f46e5; border-radius: 16px; padding: 24px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
  .word { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; font-size: 14px; }
  .warn { background: #fef3c7; border-radius: 10px; padding: 12px; font-size: 12px; }
  @media print { .no-print { display: none; } }
</style></head><body>
<div class="no-print" style="margin-bottom:16px"><button onclick="window.print()" style="padding:10px 18px;border-radius:10px;background:#4f46e5;color:#fff;border:0;font-weight:700;cursor:pointer">🖨️ Imprimir / Guardar PDF</button></div>
<div class="box">
  <h1 style="margin:0 0 6px;font-size:20px">🛡️ Kit de Recuperación E2E — Claridad Financiera</h1>
  <p style="margin:0;font-size:12px;color:#4b5563">Generado el ${new Date().toLocaleDateString('es-ES')} · Algoritmo AES-256-GCM + PBKDF2-SHA256</p>
  <div class="grid">
    ${words.map((w, i) => `<div class="word"><span style="color:#64748b">${i + 1}.</span> <strong>${esc(w)}</strong></div>`).join('')}
  </div>
  <div class="warn"><strong>Guarda esta hoja en un lugar seguro.</strong> Nadie tiene copia de esta frase. La necesitarás para descifrar tus backups <code>.claridad.e2e.json</code> en otro dispositivo.</div>
</div></body></html>`;
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
      else showToast('Permite ventanas emergentes para imprimir el Kit');
    }

    async function exportEncryptedE2EBackup() {
      const phrase = window.__claridadSessionE2EPhrase || prompt('Introduce tu frase de 12 palabras para cifrar la copia con AES-256-GCM:');
      if (!phrase) return;
      try {
        const envelope = await encryptPersonalPayloadE2E(S, phrase);
        const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `claridad_backup_${todayStr()}.e2e.json`;
        a.click();
        if (S.settings) S.settings.lastBackupAt = Date.now();
        saveLocalState(false);
        showToast('🔐 Copia cifrada AES-256-GCM descargada ✓');
      } catch (err) {
        showToast(`Error cifrando copia: ${err.message}`);
      }
    }

    async function importEncryptedE2EBackup(inputEl) {
      const file = inputEl?.files?.[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const env = JSON.parse(raw);
        const phrase = prompt('Introduce tu frase de 12 palabras para descifrar esta copia:');
        if (!phrase) return;
        const decoded = await decryptPersonalPayloadE2E(env, phrase);
        S = normalizeStateObject(decoded);
        saveLocalState(true);
        renderAllViews();
        showToast('🔓 Copia cifrada E2E restaurada con éxito ✓');
      } catch (err) {
        showToast('No se pudo descifrar: frase incorrecta o archivo dañado.');
      } finally {
        if (inputEl) inputEl.value = '';
      }
    }

    // ----------------------------------------------------------------------------
    // 8B. ACCESSIBILITY WCAG 2.2 AA (Keyboard Shortcuts, Live Announcer, Contrast)
    // ----------------------------------------------------------------------------
    function announceA11y(text) {
      const live = $('#a11y-live-announcer');
      if (!live) return;
      live.textContent = '';
      setTimeout(() => { live.textContent = String(text || ''); }, 30);
    }

    function applyAccessibilityPreferences() {
      const html = document.documentElement;
      const highContrast = !!S?.settings?.highContrast;
      const reduceMotion = !!S?.settings?.reduceMotion;
      html.classList.toggle('high-contrast', highContrast);
      html.classList.toggle('reduce-motion', reduceMotion);
    }

    function toggleHighContrastSetting() {
      if (!S?.settings) return;
      S.settings.highContrast = !S.settings.highContrast;
      applyAccessibilityPreferences();
      saveLocalState(true);
      renderAllViews();
      announceA11y(S.settings.highContrast ? 'Modo alto contraste activado' : 'Modo alto contraste desactivado');
      showToast(S.settings.highContrast ? '🌗 Alto contraste WCAG activado ✓' : 'Contraste estándar restaurado');
    }

    function toggleReduceMotionSetting() {
      if (!S?.settings) return;
      S.settings.reduceMotion = !S.settings.reduceMotion;
      applyAccessibilityPreferences();
      saveLocalState(true);
      renderAllViews();
      showToast(S.settings.reduceMotion ? 'Animaciones reducidas activadas ✓' : 'Animaciones estándar activadas');
    }

    function openKeyboardShortcutsModal() {
      const shortcuts = [
        { key: 'N', desc: 'Abrir menú rápido «Añadir» (gasto, ingreso, ticket, voz)' },
        { key: '/', desc: 'Ir a Movimientos y enfocar el buscador' },
        { key: 'P', desc: 'Ocultar o mostrar importes (Modo privacidad ••••)' },
        { key: '1 · 2 · 3 · 4', desc: 'Navegar entre Inicio, Social, Stats y Yo' },
        { key: '?', desc: 'Mostrar esta guía de atajos y accesibilidad' },
        { key: 'Esc', desc: 'Cerrar modal, panel o selección múltiple' }
      ];
      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">⌨️ Atajos de teclado y Accesibilidad</h3>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>
          <div class="divide-y divide-outline-variant/20">
            ${shortcuts.map(s => `
              <div class="py-2 flex items-center justify-between gap-3 text-xs">
                <span class="text-on-surface-variant">${esc(s.desc)}</span>
                <kbd class="px-2 py-0.5 rounded-lg bg-surface-container border border-outline-variant/50 font-mono text-[11px] font-extrabold text-on-surface flex-shrink-0">${esc(s.key)}</kbd>
              </div>
            `).join('')}
          </div>
          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/25">
            <button onclick="toggleHighContrastSetting()" class="py-2 px-3 rounded-xl bg-surface-container text-on-surface text-xs font-extrabold active-scale">
              🌗 ${S?.settings?.highContrast ? 'Contraste normal' : 'Alto contraste'}
            </button>
            <button onclick="toggleReduceMotionSetting()" class="py-2 px-3 rounded-xl bg-surface-container text-on-surface text-xs font-extrabold active-scale">
              ✨ ${S?.settings?.reduceMotion ? 'Animaciones ON' : 'Reducir movimiento'}
            </button>
          </div>
        </div>
      `);
    }

    function initKeyboardShortcutsWCAG() {
      if (document.body.dataset.kbBound) return;
      document.body.dataset.kbBound = 'true';
      document.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
        if (typeof isAppLocked !== 'undefined' && isAppLocked) return;

        const k = e.key;
        if (k === 'n' || k === 'N') {
          e.preventDefault();
          openQuickActionSheet();
          announceA11y('Menú añadir abierto');
        } else if (k === '/') {
          e.preventDefault();
          switchMainView('gastos');
          setTimeout(() => { $('#mov-search-input')?.focus(); }, 80);
          announceA11y('Buscador de movimientos enfocado');
        } else if (k === '?') {
          e.preventDefault();
          openKeyboardShortcutsModal();
        } else if (k === 'p' || k === 'P') {
          e.preventDefault();
          togglePrivacyMode();
        } else if (k === '1') {
          switchMainView('inicio');
        } else if (k === '2') {
          switchMainView('cuentas');
        } else if (k === '3') {
          switchMainView('analitica');
        } else if (k === '4') {
          switchMainView('ajustes');
        }
      });
    }

    // ----------------------------------------------------------------------------
    // 8C. LIGHTWEIGHT i18n ARCHITECTURE (ES / EN)
    // ----------------------------------------------------------------------------
    const I18N_DICT = {
      es: {
        nav_home: 'Inicio',
        nav_social: 'Social',
        nav_stats: 'Stats',
        nav_me: 'Yo',
        trust_seal: '🔒 Privado · 🚫 Sin anuncios · 🚫 Sin venta de datos · 🛡️ E2E opcional · 💯 Gratis para siempre'
      },
      en: {
        nav_home: 'Home',
        nav_social: 'Social',
        nav_stats: 'Stats',
        nav_me: 'Me',
        trust_seal: '🔒 Private · 🚫 Zero ads · 🚫 Zero data selling · 🛡️ Optional E2E · 💯 Free forever'
      }
    };

    function getAppLocale() {
      const loc = S?.settings?.locale || 'es';
      return I18N_DICT[loc] ? loc : 'es';
    }

    function t(key, fallback = '') {
      const loc = getAppLocale();
      return (I18N_DICT[loc] && I18N_DICT[loc][key]) || I18N_DICT.es[key] || fallback || key;
    }

    function setAppLocale(locale) {
      if (!I18N_DICT[locale] || !S?.settings) return;
      S.settings.locale = locale;
      document.documentElement.lang = locale;
      saveLocalState(true);
      renderAllViews();
      showToast(locale === 'en' ? 'Language set to English ✓' : 'Idioma establecido en Español ✓');
    }

    // ----------------------------------------------------------------------------
    // 8D. PWA SHARE TARGET HANDLER (Receive Shared Text / Bank Alerts)
    // ----------------------------------------------------------------------------
    function handleIncomingShareTarget() {
      const params = new URLSearchParams(window.location.search || '');
      const sharedText = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join(' ').trim();
      if (!sharedText || params.get('add') || params.get('code')) return false;

      try {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      } catch (e) {}

      if (typeof parseCompoundVoiceUtterance === 'function' && typeof openCompoundVoiceModal === 'function') {
        openCompoundVoiceModal(false);
        setTimeout(() => {
          if (voicePreviewState) {
            voicePreviewState.transcript = sharedText;
            voicePreviewState.parsed = parseCompoundVoiceUtterance(sharedText);
            renderCompoundVoiceModal();
          }
        }, 80);
        showToast('📲 Texto compartido recibido y analizado ✓');
        return true;
      }
      return false;
    }

    // ----------------------------------------------------------------------------
    // 8E. VIRTUALIZED PAGINATION HELPER FOR 10,000+ TRANSACTIONS
    // ----------------------------------------------------------------------------
    const MOV_PAGE_SIZE = 80;
    let movVisibleLimit = MOV_PAGE_SIZE;

    function sliceVirtualizedMovements(list, limit = movVisibleLimit) {
      const arr = Array.isArray(list) ? list : [];
      const cap = Math.max(MOV_PAGE_SIZE, Number(limit) || MOV_PAGE_SIZE);
      return {
        visible: arr.slice(0, cap),
        total: arr.length,
        remaining: Math.max(0, arr.length - cap)
      };
    }

    function loadMoreVirtualizedMovements() {
      movVisibleLimit += MOV_PAGE_SIZE;
      renderGastosView();
    }

    // ----------------------------------------------------------------------------
    // 8F. HUMAN CHANGELOG MODAL (Plain Language for Real People)
    // ----------------------------------------------------------------------------
    const HUMAN_CHANGELOG = [
      { version: '2.8', title: 'Cifrado E2E, accesibilidad total y velocidad para años de historial', items: [
        'Cifrado personal AES-256-GCM con frase de 12 palabras y kit imprimible de recuperación.',
        'Atajos de teclado (N añadir, / buscar, P privacidad, ? ayuda), alto contraste WCAG y lectores de pantalla.',
        'Listas virtualizadas para abrir más de 10.000 movimientos al instante.'
      ]},
      { version: '2.7', title: 'Centro de notificaciones tranquilo', items: [
        'Pestañas Nuevas y Anteriores, horas de silencio nocturnas (22:00–08:00) y agrupación anti-ruido.',
        'Notificaciones locales nativas en iPhone y navegador con preferencias por canal.'
      ]},
      { version: '2.6', title: 'Metas con fecha real y gamificación sin culpa', items: [
        'Simulador con deslizador («¿Y si ahorro X €/mes?») que calcula cuántos meses adelantas tu meta.',
        'Metas de reducción, plan Deuda Cero, retos opcionales contra ti mismo y vitrina silenciosa de logros.'
      ]},
      { version: '2.5', title: 'Conexión bancaria PSD2 y 7 detectores inteligentes', items: [
        'Conexión bancaria gratuita de solo lectura vía Enable Banking PSD2 + bandeja «Por clasificar».',
        'Detecta cobros duplicados, subidas silenciosas de precio, comisiones y riesgo de descubierto.'
      ]},
      { version: '2.4', title: 'Voz compuesta y escáner OCR por artículos', items: [
        'Dicta frases completas («Ayer cenamos 68€ con Laura, me debe la mitad») para crear gasto + deuda.',
        'Escanea tickets con Apple Vision offline en iPhone, reparte por artículos y guarda garantías de 3 años.'
      ]},
      { version: '2.3', title: 'Deudas sociales nivel Splitwise', items: [
        'Reparto en 5 modos exactos al céntimo y algoritmo exacto que reduce transferencias al mínimo.',
        'Modo invitado estrictamente solo lectura para compartir saldos con total tranquilidad.'
      ]}
    ];

    function openHumanChangelogModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">✨ Novedades de Claridad Financiera</h3>
              <p class="text-[11px] text-on-surface-variant">Versión ${esc(APP_BUILD_INFO.version)} · 100% gratis y privado</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-0.5">
            ${HUMAN_CHANGELOG.map(rel => `
              <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/12 text-primary">v${esc(rel.version)}</span>
                  <h4 class="text-xs font-extrabold text-on-surface">${esc(rel.title)}</h4>
                </div>
                <ul class="text-[11px] text-on-surface-variant space-y-1 list-disc pl-4">
                  ${rel.items.map(it => `<li>${esc(it)}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      `);
    }
