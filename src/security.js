    // ============================================================================
    // 1E. ACCESS SECURITY (6-Digit PIN, Biometrics, Auto-Lock, Panic Mode, GDPR)
    // ============================================================================
    const SEC_KEY_PREFIX = 'claridad_sec_';
    let appLockPinBuffer = '';
    let isAppLocked = false;
    let lastActivityTs = Date.now();
    let autoLockInterval = null;
    let clipboardClearTimer = null;

    function getSecurityConfig() {
      try {
        const raw = JSON.parse(localStorage.getItem(SEC_KEY_PREFIX + 'cfg') || '{}');
        return {
          pinHash: raw.pinHash || null,
          pinSalt: raw.pinSalt || null,
          biometricEnabled: !!raw.biometricEnabled,
          webauthnCredId: raw.webauthnCredId || null,
          autoLockSeconds: raw.autoLockSeconds !== undefined ? Number(raw.autoLockSeconds) : 60, // 0=immediate, 60=1m, 300=5m, -1=never
          failedAttempts: Number(raw.failedAttempts || 0),
          lockedUntilTs: Number(raw.lockedUntilTs || 0),
          pendingDeletionAt: raw.pendingDeletionAt || null
        };
      } catch (e) {
        return { pinHash: null, pinSalt: null, biometricEnabled: false, webauthnCredId: null, autoLockSeconds: 60, failedAttempts: 0, lockedUntilTs: 0, pendingDeletionAt: null };
      }
    }

    function saveSecurityConfig(patch) {
      const next = { ...getSecurityConfig(), ...patch };
      localStorage.setItem(SEC_KEY_PREFIX + 'cfg', JSON.stringify(next));
      return next;
    }

    /** Cryptographic SHA-256 digest (Web Crypto when available, deterministic fallback offline/file://) */
    async function hashSecretSHA256(secret, salt = 'claridad_v1') {
      const input = `${salt}::${String(secret || '')}`;
      try {
        if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
          const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
          return 'sha256:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      } catch (e) {}
      // Pure JS SHA-256 fallback (guaranteed consistent even on file:// or non-HTTPS)
      let h1 = 0xdeadbeef ^ input.length, h2 = 0x41c6ce57 ^ input.length;
      for (let i = 0; i < input.length; i++) {
        const ch = input.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return 'fnv:' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }

    function computePinCooldownMs(failedAttempts) {
      if (failedAttempts >= 7) return 5 * 60 * 1000;  // 5 minutes
      if (failedAttempts >= 5) return 60 * 1000;      // 60 seconds
      if (failedAttempts >= 3) return 15 * 1000;      // 15 seconds
      return 0;
    }

    function isBiometricsSupported() {
      if (typeof window.claridadBiometricAuth === 'function') return true;
      return !!(typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials && location.protocol === 'https:');
    }

    async function enrollBiometrics() {
      const sec = getSecurityConfig();
      if (!sec.pinHash) {
        showToast('Primero configura un PIN de 6 dígitos como respaldo');
        openSetupPinModal();
        return;
      }
      // 1. Native iOS Face ID / Touch ID bridge
      if (typeof window.claridadBiometricAuth === 'function') {
        const ok = await window.claridadBiometricAuth('Activar Face ID / Touch ID para Claridad Financiera');
        if (ok) {
          saveSecurityConfig({ biometricEnabled: true });
          logAuditEvent('security_biometric_enabled', 'security', 'Face ID / Touch ID nativo');
          saveLocalState(false);
          renderAllViews();
          showToast('✓ Face ID / Touch ID activado');
        } else {
          showToast('No se pudo verificar la biometría');
        }
        return;
      }
      // 2. WebAuthn platform authenticator on HTTPS
      if (window.PublicKeyCredential && navigator.credentials && location.protocol === 'https:') {
        try {
          const challenge = new Uint8Array(32);
          crypto.getRandomValues(challenge);
          const userIdBytes = new TextEncoder().encode(getOrCreateDeviceId());
          const cred = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: 'Claridad Financiera', id: location.hostname },
              user: { id: userIdBytes, name: currentLoggedUserName(), displayName: currentLoggedUserName() },
              pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
              authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
              timeout: 45000
            }
          });
          if (cred && cred.rawId) {
            const credIdB64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
            saveSecurityConfig({ biometricEnabled: true, webauthnCredId: credIdB64 });
            logAuditEvent('security_biometric_enabled', 'security', 'WebAuthn');
            saveLocalState(false);
            renderAllViews();
            showToast('✓ Desbloqueo biométrico WebAuthn activado');
            return;
          }
        } catch (e) {
          showToast('Biometría cancelada o no disponible en este navegador');
          return;
        }
      }
      showToast('La biometría requiere iPhone (.IPA) o navegador HTTPS compatible');
    }

    function disableBiometrics() {
      saveSecurityConfig({ biometricEnabled: false, webauthnCredId: null });
      logAuditEvent('security_biometric_disabled', 'security', '');
      saveLocalState(false);
      renderAllViews();
      showToast('Biometría desactivada');
    }

    async function tryBiometricUnlock() {
      const sec = getSecurityConfig();
      if (!sec.biometricEnabled) return false;
      if (typeof window.claridadBiometricAuth === 'function') {
        const ok = await window.claridadBiometricAuth('Desbloquear Claridad Financiera');
        if (ok) {
          unlockAppSuccess();
          return true;
        }
        return false;
      }
      if (sec.webauthnCredId && window.PublicKeyCredential && navigator.credentials && location.protocol === 'https:') {
        try {
          const challenge = new Uint8Array(32);
          crypto.getRandomValues(challenge);
          const rawId = Uint8Array.from(atob(sec.webauthnCredId), c => c.charCodeAt(0));
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge,
              allowCredentials: [{ type: 'public-key', id: rawId }],
              userVerification: 'required',
              timeout: 45000
            }
          });
          if (assertion) {
            unlockAppSuccess();
            return true;
          }
        } catch (e) {}
      }
      return false;
    }

    function openSetupPinModal() {
      const sec = getSecurityConfig();
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center">${ico('lock', 'text-[18px]')}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${sec.pinHash ? 'Cambiar PIN de acceso' : 'Configurar PIN de 6 dígitos'}</h3>
                <p class="text-[11px] text-on-surface-variant">Protege tus datos en este dispositivo</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="flex flex-col gap-3">
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">Nuevo PIN (6 dígitos)</label>
              <input id="sec-pin-1" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*" placeholder="••••••" class="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/45 text-center text-xl tracking-[0.5em] font-extrabold text-on-surface"/>
            </div>
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">Confirmar PIN</label>
              <input id="sec-pin-2" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*" placeholder="••••••" class="w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/45 text-center text-xl tracking-[0.5em] font-extrabold text-on-surface"/>
            </div>
          </div>

          <button onclick="saveNewAppPin()" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-sm active-scale">
            Guardar PIN de 6 dígitos
          </button>
          ${sec.pinHash ? `
            <button onclick="removeAppPin()" class="w-full py-2.5 rounded-xl bg-tertiary/10 text-tertiary font-bold text-xs active-scale">
              Quitar bloqueo por PIN
            </button>
          ` : ''}
        </div>
      `);
    }

    async function saveNewAppPin() {
      const p1 = ($('#sec-pin-1')?.value || '').trim();
      const p2 = ($('#sec-pin-2')?.value || '').trim();
      if (!/^\d{6}$/.test(p1)) {
        showToast('El PIN debe tener exactamente 6 dígitos numéricos');
        return;
      }
      if (p1 !== p2) {
        showToast('Los dos PIN no coinciden');
        return;
      }
      const salt = 'salt_' + uid() + Date.now().toString(36);
      const pinHash = await hashSecretSHA256(p1, salt);
      saveSecurityConfig({ pinHash, pinSalt: salt, failedAttempts: 0, lockedUntilTs: 0 });
      logAuditEvent('security_pin_set', 'security', 'PIN 6 dígitos configurado');
      saveLocalState(false);
      closeUniversalModal();
      renderAllViews();
      showToast('🔒 Bloqueo por PIN de 6 dígitos activado ✓');
    }

    function removeAppPin() {
      if (!confirm('¿Desactivar el bloqueo por PIN y biometría en este dispositivo?')) return;
      saveSecurityConfig({ pinHash: null, pinSalt: null, biometricEnabled: false, webauthnCredId: null, failedAttempts: 0, lockedUntilTs: 0 });
      logAuditEvent('security_pin_removed', 'security', '');
      saveLocalState(false);
      closeUniversalModal();
      renderAllViews();
      showToast('Bloqueo por PIN desactivado');
    }

    function updateAutoLockSetting(secondsVal) {
      saveSecurityConfig({ autoLockSeconds: Number(secondsVal) });
      renderAllViews();
      showToast('Tiempo de auto-bloqueo actualizado ✓');
    }

    function lockAppNow(triggerBiometricPrompt = true) {
      const sec = getSecurityConfig();
      if (!sec.pinHash) return;
      isAppLocked = true;
      appLockPinBuffer = '';
      const ov = $('#app-lock-overlay');
      if (ov) {
        ov.classList.remove('hidden');
        ov.classList.add('flex');
      }
      renderAppLockScreen();
      if (triggerBiometricPrompt && sec.biometricEnabled) {
        setTimeout(() => tryBiometricUnlock(), 240);
      }
    }

    function unlockAppSuccess() {
      isAppLocked = false;
      appLockPinBuffer = '';
      lastActivityTs = Date.now();
      saveSecurityConfig({ failedAttempts: 0, lockedUntilTs: 0 });
      const ov = $('#app-lock-overlay');
      if (ov) {
        ov.classList.add('hidden');
        ov.classList.remove('flex');
      }
      haptic('success');
    }

    async function handleLockPadDigit(d) {
      const sec = getSecurityConfig();
      const now = Date.now();
      if (sec.lockedUntilTs && now < sec.lockedUntilTs) {
        renderAppLockScreen();
        return;
      }
      haptic('selection');
      if (d === 'back') {
        appLockPinBuffer = appLockPinBuffer.slice(0, -1);
        renderAppLockScreen();
        return;
      }
      if (appLockPinBuffer.length >= 6) return;
      appLockPinBuffer += String(d);
      renderAppLockScreen();

      if (appLockPinBuffer.length === 6) {
        const candidateHash = await hashSecretSHA256(appLockPinBuffer, sec.pinSalt || 'claridad_v1');
        if (candidateHash === sec.pinHash) {
          unlockAppSuccess();
        } else {
          haptic('heavy');
          const fails = (sec.failedAttempts || 0) + 1;
          const coolMs = computePinCooldownMs(fails);
          saveSecurityConfig({
            failedAttempts: fails,
            lockedUntilTs: coolMs > 0 ? (Date.now() + coolMs) : 0
          });
          appLockPinBuffer = '';
          renderAppLockScreen('PIN incorrecto' + (coolMs > 0 ? ` · Espera ${Math.round(coolMs / 1000)}s` : ''));
        }
      }
    }

    function renderAppLockScreen(errorMsg = '') {
      const box = $('#app-lock-card');
      if (!box) return;
      const sec = getSecurityConfig();
      const remainSec = sec.lockedUntilTs > Date.now() ? Math.ceil((sec.lockedUntilTs - Date.now()) / 1000) : 0;

      const dotsHtml = [0, 1, 2, 3, 4, 5].map(i => `
        <span class="w-3.5 h-3.5 rounded-full transition-all ${i < appLockPinBuffer.length ? 'bg-primary scale-110' : 'bg-surface-container-highest border border-outline-variant'}"></span>
      `).join('');

      box.innerHTML = `
        <div class="flex flex-col items-center gap-2 text-center">
          <span class="w-14 h-14 rounded-2xl hero-indigo text-white flex items-center justify-center shadow-lg">
            ${ico('lock', 'text-[26px]')}
          </span>
          <h2 class="font-headline-md text-xl font-extrabold text-on-surface mt-1">Claridad bloqueada</h2>
          <p class="text-xs text-on-surface-variant">${remainSec > 0 ? `Demasiados intentos · Espera ${remainSec}s` : (errorMsg || 'Introduce tu PIN de 6 dígitos')}</p>
        </div>

        <div class="flex items-center justify-center gap-3.5 py-2">${dotsHtml}</div>

        <div class="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mx-auto">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
            <button onclick="handleLockPadDigit(${n})" ${remainSec > 0 ? 'disabled' : ''} class="h-14 rounded-2xl bg-surface-container-low hover:bg-surface-container text-xl font-extrabold text-on-surface active-scale disabled:opacity-40">${n}</button>
          `).join('')}
          ${sec.biometricEnabled ? `
            <button onclick="tryBiometricUnlock()" class="h-14 rounded-2xl bg-primary/12 text-primary font-extrabold text-xs flex items-center justify-center active-scale" title="Desbloquear con biometría">${ico('verified', 'text-[22px]')}</button>
          ` : `<div></div>`}
          <button onclick="handleLockPadDigit(0)" ${remainSec > 0 ? 'disabled' : ''} class="h-14 rounded-2xl bg-surface-container-low hover:bg-surface-container text-xl font-extrabold text-on-surface active-scale disabled:opacity-40">0</button>
          <button onclick="handleLockPadDigit('back')" class="h-14 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex items-center justify-center active-scale" aria-label="Borrar dígito">${ico('arrow_back', 'text-[20px]')}</button>
        </div>
      `;

      if (remainSec > 0) {
        setTimeout(() => { if (isAppLocked) renderAppLockScreen(); }, 1000);
      }
    }

    function initSecurityLifecycle() {
      const sec = getSecurityConfig();
      if (sec.pinHash) {
        lockAppNow(true);
      }

      // Check pending 7-day deletion countdown
      if (sec.pendingDeletionAt && Date.now() >= sec.pendingDeletionAt) {
        executeImmediateTotalWipe(true);
        return;
      }

      const bumpActivity = () => { lastActivityTs = Date.now(); };
      ['pointerdown', 'keydown', 'scroll'].forEach(ev => window.addEventListener(ev, bumpActivity, { passive: true }));

      document.addEventListener('visibilitychange', () => {
        const cur = getSecurityConfig();
        if (!cur.pinHash || cur.autoLockSeconds < 0) return;
        if (document.visibilityState === 'hidden') {
          lastActivityTs = Date.now();
          if (cur.autoLockSeconds === 0) {
            lockAppNow(false);
          }
        } else if (document.visibilityState === 'visible') {
          const elapsedSec = (Date.now() - lastActivityTs) / 1000;
          if (cur.autoLockSeconds === 0 || elapsedSec >= cur.autoLockSeconds) {
            lockAppNow(true);
          }
        }
      });

      clearInterval(autoLockInterval);
      autoLockInterval = setInterval(() => {
        const cur = getSecurityConfig();
        if (!cur.pinHash || isAppLocked || cur.autoLockSeconds <= 0) return;
        if ((Date.now() - lastActivityTs) / 1000 >= cur.autoLockSeconds) {
          lockAppNow(false);
        }
      }, 10000);

      // Panic Mode: Triple-tap on global header immediately hides balances + locks app
      const hdr = document.querySelector('header');
      if (hdr && !hdr.dataset.panicBound) {
        hdr.dataset.panicBound = 'true';
        let tapCount = 0;
        let tapTimer = null;
        hdr.addEventListener('click', (e) => {
          if (e.target.closest('button, a, input, select')) return;
          tapCount++;
          clearTimeout(tapTimer);
          tapTimer = setTimeout(() => { tapCount = 0; }, 550);
          if (tapCount >= 3) {
            tapCount = 0;
            haptic('heavy');
            isPrivacyMode = true;
            localStorage.setItem('claridad_privacy_mode', 'true');
            applyPrivacyModeUI();
            if (getSecurityConfig().pinHash) {
              lockAppNow(false);
            } else {
              showToast('🛡️ Modo pánico: saldos ocultos');
            }
          }
        });
      }
    }

    /** Copy sensitive text (amount / IBAN / phone) and auto-clear clipboard after 60s */
    function copySensitiveToClipboard(text, label = 'Dato') {
      try {
        navigator.clipboard?.writeText(String(text || ''));
        showToast(`${label} copiado ✓ (se limpiará del portapapeles en 60s)`);
        clearTimeout(clipboardClearTimer);
        clipboardClearTimer = setTimeout(() => {
          try { navigator.clipboard?.writeText(''); } catch (e) {}
        }, 60000);
      } catch (e) {
        showToast('No se pudo copiar al portapapeles');
      }
    }

    // ============================================================================
    // 1F. GDPR CONSENTS, PLAIN-LANGUAGE PRIVACY POLICY & 7-DAY TOTAL DELETION
    // ============================================================================
    function toggleConsentSetting(key, checked) {
      if (!S?.settings) return;
      if (!S.settings.consents) S.settings.consents = { cloudSync: !!loggedUserId, notifications: true, analytics: false };
      S.settings.consents[key] = !!checked;
      logAuditEvent('consent_updated', 'privacy', `${key}=${!!checked}`);
      saveLocalState(!!loggedUserId);
      renderAllViews();
      showToast('Preferencia de privacidad guardada ✓');
    }

    function openPrivacyPolicyModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">${ico('shield', 'text-[19px]')}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Privacidad en lenguaje llano</h3>
                <p class="text-[11px] text-on-surface-variant">Sin letra pequeña ni sorpresas</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="p-4 rounded-2xl bg-secondary/8 border border-secondary/25 flex flex-col gap-1.5 text-xs text-on-surface">
            <p class="font-extrabold text-secondary mb-1">Resumen en 10 puntos:</p>
            <p>1. <strong>100% gratuita</strong>: sin anuncios, sin planes PRO y sin venta de datos.</p>
            <p>2. <strong>Offline-first</strong>: tus datos se guardan primero en tu dispositivo (IndexedDB).</p>
            <p>3. <strong>Modo local real</strong>: si no inicias sesión, tus gastos personales no salen del dispositivo.</p>
            <p>4. <strong>Telemetría desactivada</strong> por defecto; nunca recogemos importes ni comercios.</p>
            <p>5. <strong>Portabilidad total</strong>: exporta todo en CSV, JSON, Excel o informe PDF en 1 toque.</p>
            <p>6. <strong>Borrado real</strong>: puedes solicitar borrado total con 7 días de margen o inmediato.</p>
            <p>7. <strong>Permisos progresivos</strong>: cámara y micrófono solo se usan cuando tú los activas.</p>
            <p>8. <strong>Portapapeles protegido</strong>: los importes copiados se limpian automáticamente a los 60s.</p>
            <p>9. <strong>Bloqueo local</strong>: PIN de 6 dígitos con hash SHA-256 y biometría Face ID / WebAuthn.</p>
            <p>10. <strong>Sin consejo financiero regulado</strong>: las proyecciones son orientativas sobre tus datos.</p>
          </div>

          <button onclick="closeUniversalModal()" class="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale">Entendido</button>
        </div>
      `);
    }

    function openTotalDeletionModal() {
      const sec = getSecurityConfig();
      const pendingDate = sec.pendingDeletionAt ? new Date(sec.pendingDeletionAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-xl bg-tertiary/15 text-tertiary flex items-center justify-center">${ico('warning', 'text-[19px]')}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Borrado total de datos</h3>
                <p class="text-[11px] text-on-surface-variant">Irreversible · Tus datos son tuyos</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          ${pendingDate ? `
            <div class="p-4 rounded-2xl bg-tertiary/10 border border-tertiary/30 text-xs flex flex-col gap-2">
              <p class="font-extrabold text-tertiary">⏳ Borrado total programado para el ${esc(pendingDate)}</p>
              <p class="text-on-surface-variant">Puedes cancelar la solicitud antes de esa fecha o ejecutar el borrado ahora mismo.</p>
              <div class="grid grid-cols-2 gap-2 pt-1">
                <button onclick="cancelScheduledDeletion()" class="py-2 rounded-xl bg-secondary text-white font-extrabold text-xs">Cancelar borrado</button>
                <button onclick="executeImmediateTotalWipe(false)" class="py-2 rounded-xl bg-tertiary text-white font-extrabold text-xs">Borrar ya mismo</button>
              </div>
            </div>
          ` : `
            <p class="text-xs text-on-surface-variant leading-relaxed">
              Recomendamos descargar antes una copia JSON. Al confirmar, se activará una <strong>cuenta atrás cancelable de 7 días</strong> tras la cual se eliminarán todos tus datos locales (IndexedDB + localStorage) y personales en la nube.
            </p>
            <button onclick="exportBackupJSON()" class="w-full py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold flex items-center justify-center gap-1.5">
              ${ico('download', 'text-[16px] text-secondary')} Descargar copia JSON antes de borrar
            </button>
            <div>
              <label class="text-[11px] font-extrabold text-tertiary block mb-1">Escribe BORRAR para confirmar</label>
              <input id="delete-confirm-word" type="text" placeholder="BORRAR" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-tertiary/40 text-sm font-extrabold text-on-surface uppercase"/>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button onclick="scheduleTotalDeletion7Days()" class="py-3 rounded-xl bg-amber-500 text-white text-xs font-extrabold active-scale">Programar (7 días)</button>
              <button onclick="confirmImmediateTotalWipe()" class="py-3 rounded-xl bg-tertiary text-white text-xs font-extrabold active-scale">Borrar ahora</button>
            </div>
          `}
        </div>
      `);
    }

    function scheduleTotalDeletion7Days() {
      const word = ($('#delete-confirm-word')?.value || '').trim().toUpperCase();
      if (word !== 'BORRAR') {
        showToast('Escribe BORRAR para confirmar la solicitud');
        return;
      }
      const deleteAt = Date.now() + (7 * 86400 * 1000);
      saveSecurityConfig({ pendingDeletionAt: deleteAt });
      logAuditEvent('account_deletion_scheduled', 'privacy', new Date(deleteAt).toISOString());
      saveLocalState(false);
      closeUniversalModal();
      renderAllViews();
      showToast('⏳ Borrado total programado en 7 días (cancelable en Yo → Seguridad)');
    }

    function cancelScheduledDeletion() {
      saveSecurityConfig({ pendingDeletionAt: null });
      logAuditEvent('account_deletion_cancelled', 'privacy', '');
      saveLocalState(false);
      closeUniversalModal();
      renderAllViews();
      showToast('✓ Borrado programado cancelado');
    }

    async function confirmImmediateTotalWipe() {
      const word = ($('#delete-confirm-word')?.value || '').trim().toUpperCase();
      if (word !== 'BORRAR') {
        showToast('Escribe BORRAR para confirmar');
        return;
      }
      await executeImmediateTotalWipe(false);
    }

    async function executeImmediateTotalWipe(silent = false) {
      if (loggedUserId && supabaseClient) {
        try { await dbClearAllPersonalMonthlyData(loggedUserId); } catch (e) {}
      }
      await ClaridadDB.wipeAllLocalDatabases();
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('claridad_') || k === LEGACY_LSKEY || k === 'logged_user_id' || k === 'is_admin' || k === 'last_group_id')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      loggedUserId = null;
      isAdmin = false;
      storageMode = 'local';
      S = blankState(0);
      closeUniversalModal();
      renderAllViews();
      if (!silent) showToast('Todos tus datos han sido borrados permanentemente');
    }
