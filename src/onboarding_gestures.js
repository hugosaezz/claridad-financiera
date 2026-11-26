    // ============================================================================
    // 7. SOFT 4-STEP ONBOARDING, MONTH PICKER, STREAK MODAL, DEEP LINKS & GESTURES
    // ============================================================================
    let onboardingStep = 0;
    let onboardingDraft = {
      mode: 'local',
      currency: 'EUR',
      monthStartDay: 1,
      salary: ''
    };
    let monthPickerYear = new Date().getFullYear();

    function shouldShowOnboarding() {
      if (localStorage.getItem('claridad_onboarding_done') === 'true') return false;
      // If user already logged in or already has saved personal data, mark onboarding complete automatically
      if (loggedUserId) {
        localStorage.setItem('claridad_onboarding_done', 'true');
        return false;
      }
      const hasExistingData = S && (
        (S.expenses && S.expenses.length > 0) ||
        (S.incomes && S.incomes.length > 0) ||
        (S.debts && S.debts.length > 0) ||
        (S.settings && S.settings.salary > 0)
      );
      if (hasExistingData) {
        localStorage.setItem('claridad_onboarding_done', 'true');
        return false;
      }
      return true;
    }

    function openOnboardingFlow(startStep = 0) {
      onboardingStep = startStep;
      onboardingDraft = {
        mode: loggedUserId ? 'cloud' : (storageMode || 'local'),
        currency: S?.settings?.currency || 'EUR',
        monthStartDay: S?.settings?.monthStartDay || 1,
        salary: S?.settings?.salary > 0 ? String(S.settings.salary) : ''
      };
      const overlay = $('#onboarding-overlay');
      if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
      }
      renderOnboardingStep();
    }

    function closeOnboardingOverlay() {
      const overlay = $('#onboarding-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
      }
    }

    function finishOnboarding(applyDraft = true) {
      if (applyDraft && S && S.settings) {
        S.settings.currency = onboardingDraft.currency || 'EUR';
        const mDay = parseInt(onboardingDraft.monthStartDay, 10);
        S.settings.monthStartDay = (mDay >= 1 && mDay <= 28) ? mDay : 1;
        const sal = parseAmount(onboardingDraft.salary);
        if (sal > 0) {
          S.settings.salary = sal;
          S.settings.salaryAuto = true;
          S.settings.salaryDay = S.settings.monthStartDay;
        }
        if (!S.streak.startedAt) S.streak.startedAt = todayStr();
        saveLocalState(true);
      }
      if (!loggedUserId) {
        storageMode = 'local';
        localStorage.setItem('claridad_storage_mode', 'local');
      } else {
        storageMode = 'cloud';
        localStorage.setItem('claridad_storage_mode', 'cloud');
      }
      localStorage.setItem('claridad_onboarding_done', 'true');
      closeOnboardingOverlay();
      viewMk = monthKey(todayStr());
      activeMainView = 'inicio';
      renderAllViews();
      haptic('medium');
      showToast('✨ Todo listo. Bienvenido a Claridad Financiera');
    }

    function renderOnboardingStep() {
      const card = $('#onboarding-card');
      if (!card) return;

      const dotsHtml = [0, 1, 2, 3].map(i => `
        <span class="h-1.5 rounded-full transition-all duration-200 ${i === onboardingStep ? 'w-7 bg-primary' : i < onboardingStep ? 'w-3 bg-primary/50' : 'w-2 bg-outline-variant/60'}"></span>
      `).join('');

      const topBarHtml = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">${dotsHtml}</div>
          ${onboardingStep > 0 ? `
            <button onclick="haptic('selection'); finishOnboarding(onboardingStep >= 2)" class="text-xs font-bold text-on-surface-variant hover:text-primary px-2 py-1 rounded-lg transition">
              Omitir
            </button>
          ` : `<span class="text-[11px] font-extrabold text-primary">1 / 4</span>`}
        </div>
      `;

      let bodyHtml = '';

      if (onboardingStep === 0) {
        // Screen 1: Value Proposition + Animated Dashboard Illustration
        bodyHtml = `
          ${topBarHtml}
          <div class="relative rounded-3xl hero-indigo p-5 text-white overflow-hidden">
            <div class="flex flex-col gap-3 relative z-10">
              <div class="animate-float-soft bg-white/14 backdrop-blur-sm border border-white/20 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wider text-white/75">Margen diario seguro</p>
                  <p class="text-xl font-extrabold tabular-nums mt-0.5">24,50 € / día</p>
                </div>
                <span class="px-2.5 py-1 rounded-full bg-emerald-400/25 text-emerald-100 text-[11px] font-extrabold">En ritmo ✓</span>
              </div>
              <div class="grid grid-cols-2 gap-2.5 animate-float-soft-delay">
                <div class="bg-white/12 backdrop-blur-sm border border-white/15 rounded-2xl p-3">
                  <p class="text-[10px] text-white/75 font-bold">Balance social</p>
                  <p class="text-sm font-extrabold text-emerald-200 mt-0.5">+33,00 €</p>
                </div>
                <div class="bg-white/12 backdrop-blur-sm border border-white/15 rounded-2xl p-3">
                  <p class="text-[10px] text-white/75 font-bold">Racha de control</p>
                  <p class="text-sm font-extrabold text-amber-200 mt-0.5">🔥 12 días</p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2 text-center">
            <h1 class="font-headline-lg text-[24px] leading-tight font-extrabold text-on-surface tracking-tight">
              Tu copiloto financiero.<br/>Gratis. Privado. Tuyo.
            </h1>
            <p class="text-xs sm:text-[13px] text-on-surface-variant leading-relaxed">
              Controla tu mes, predice cómo llegarás a final de mes y liquida gastos compartidos sin suscripciones ni anuncios.
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-extrabold text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-2xl border border-outline-variant/30">
            <span>🔒 Privado</span>
            <span>·</span>
            <span>🚫 Sin anuncios</span>
            <span>·</span>
            <span>🚫 Sin venta de datos</span>
            <span>·</span>
            <span>💯 Gratis para siempre</span>
          </div>

          <button onclick="haptic('medium'); onboardingStep=1; renderOnboardingStep()" class="w-full py-3.5 rounded-2xl hero-indigo text-white font-extrabold text-sm shadow-lg active-scale flex items-center justify-center gap-2">
            Empezar
            ${ico('chevron_right', 'text-[18px]')}
          </button>
        `;
      } else if (onboardingStep === 1) {
        // Screen 2: Honest Data Storage Mode Choice
        const isLocal = onboardingDraft.mode === 'local';
        bodyHtml = `
          ${topBarHtml}
          <div>
            <h2 class="font-headline-md text-xl font-extrabold text-on-surface">¿Dónde guardamos tus datos?</h2>
            <p class="text-xs text-on-surface-variant mt-1">Puedes cambiar esta decisión cuando quieras desde <strong>Yo → Datos</strong>.</p>
          </div>

          <div class="flex flex-col gap-3">
            <button onclick="haptic('selection'); onboardingDraft.mode='local'; renderOnboardingStep()" class="p-4 rounded-2xl border-2 text-left transition-all active-scale flex flex-col gap-2 ${isLocal ? 'border-primary bg-primary/5' : 'border-outline-variant/40 bg-surface-container-low/60 hover:bg-surface-container-low'}">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2.5">
                  <span class="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
                    ${ico('hard_drive', 'text-[20px]')}
                  </span>
                  <div>
                    <p class="text-sm font-extrabold text-on-surface">Solo en este dispositivo</p>
                    <p class="text-[11px] font-bold text-primary">Sin cuenta · 100% offline</p>
                  </div>
                </div>
                <span class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${isLocal ? 'border-primary bg-primary text-white' : 'border-outline-variant'}">
                  ${isLocal ? ico('check', 'text-[13px]') : ''}
                </span>
              </div>
              <p class="text-[11px] text-on-surface-variant leading-relaxed bg-surface-container-lowest/80 p-2.5 rounded-xl border border-outline-variant/25">
                ⚠️ <strong>Aviso honesto:</strong> Si pierdes o borras este dispositivo, pierdes los datos. Podrás crear una copia de seguridad en 1 toque cuando quieras y te lo recordaremos cada mes.
              </p>
            </button>

            <button onclick="haptic('selection'); onboardingDraft.mode='cloud'; renderOnboardingStep()" class="p-4 rounded-2xl border-2 text-left transition-all active-scale flex flex-col gap-2 ${!isLocal ? 'border-secondary bg-secondary/5' : 'border-outline-variant/40 bg-surface-container-low/60 hover:bg-surface-container-low'}">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2.5">
                  <span class="w-10 h-10 rounded-xl bg-secondary/12 text-secondary flex items-center justify-center flex-shrink-0">
                    ${ico('cloud_done', 'text-[20px]')}
                  </span>
                  <div>
                    <p class="text-sm font-extrabold text-on-surface">Con copia en la nube</p>
                    <p class="text-[11px] font-bold text-secondary">Multi-dispositivo + Grupos compartidos</p>
                  </div>
                </div>
                <span class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${!isLocal ? 'border-secondary bg-secondary text-white' : 'border-outline-variant'}">
                  ${!isLocal ? ico('check', 'text-[13px]') : ''}
                </span>
              </div>
              <p class="text-[11px] text-on-surface-variant leading-relaxed bg-surface-container-lowest/80 p-2.5 rounded-xl border border-outline-variant/25">
                🔒 Sincroniza entre móvil y web, comparte grupos con amigos y recupera tus datos si cambias de teléfono. ${loggedUserId ? `<strong class="text-secondary">Sesión activa: ${esc(currentLoggedUserName())} ✓</strong>` : 'Inicia sesión o crea tu cuenta en el siguiente paso.'}
              </p>
            </button>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button onclick="haptic('selection'); onboardingStep=0; renderOnboardingStep()" class="px-4 py-3 rounded-2xl bg-surface-container text-on-surface font-bold text-xs active-scale">Atrás</button>
            <button onclick="haptic('medium'); continueFromOnboardingModeStep()" class="flex-1 py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-md active-scale">
              ${isLocal ? 'Usar en modo local →' : (loggedUserId ? 'Continuar con mi cuenta →' : 'Conectar o crear cuenta →')}
            </button>
          </div>
        `;
      } else if (onboardingStep === 2) {
        // Screen 3: Minimal Initial Configuration (30 Currencies, Financial Month Start Day, Optional Salary)
        bodyHtml = `
          ${topBarHtml}
          <div>
            <h2 class="font-headline-md text-xl font-extrabold text-on-surface">Ajuste inicial rápido</h2>
            <p class="text-xs text-on-surface-variant mt-1">Solo lo mínimo para que tus cálculos cuadren desde el primer día.</p>
          </div>

          <div class="flex flex-col gap-3.5">
            <div>
              <label class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block mb-1.5">Moneda principal</label>
              <select id="onb-currency" onchange="onboardingDraft.currency=this.value" class="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/50 text-sm font-bold text-on-surface">
                ${CURRENCIES.map(c => `
                  <option value="${c.code}" ${onboardingDraft.currency === c.code ? 'selected' : ''}>
                    ${esc(c.code)} (${esc(c.symbol)}) — ${esc(c.name)}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block mb-1.5">Día de inicio de tu mes financiero</label>
              <div class="flex items-center gap-3">
                <input id="onb-month-day" type="number" min="1" max="28" value="${onboardingDraft.monthStartDay}" oninput="onboardingDraft.monthStartDay=this.value" class="w-24 px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/50 text-center text-sm font-extrabold text-on-surface"/>
                <p class="text-[11px] text-on-surface-variant leading-snug flex-1">
                  Día <strong>1</strong> por defecto. Si cobras el día 25, pon <strong>25</strong> para que tu mes financiero empiece con tu nómina.
                </p>
              </div>
            </div>

            <div>
              <label class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block mb-1.5">Ingreso mensual aproximado <span class="font-medium lowercase text-outline">(opcional)</span></label>
              <input id="onb-salary" type="number" step="50" min="0" value="${esc(onboardingDraft.salary)}" oninput="onboardingDraft.salary=this.value" placeholder="Ej. 1800 (puedes dejarlo vacío)" class="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/50 text-sm font-extrabold text-on-surface"/>
              <p class="text-[11px] text-on-surface-variant mt-1">Sirve para calcular tu <strong>margen diario seguro</strong> desde hoy.</p>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button onclick="haptic('selection'); onboardingStep=1; renderOnboardingStep()" class="px-4 py-3 rounded-2xl bg-surface-container text-on-surface font-bold text-xs active-scale">Atrás</button>
            <button onclick="haptic('medium'); onboardingStep=3; renderOnboardingStep()" class="flex-1 py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-md active-scale">
              Continuar →
            </button>
          </div>
        `;
      } else {
        // Screen 4: Progressive Permissions Context (Never ask all upfront!)
        bodyHtml = `
          ${topBarHtml}
          <div>
            <h2 class="font-headline-md text-xl font-extrabold text-on-surface">Permisos solo cuando los uses</h2>
            <p class="text-xs text-on-surface-variant mt-1">Respetamos tu privacidad: <strong>no pedimos permisos ahora</strong>. Solo te los solicitaremos la primera vez que uses cada herramienta.</p>
          </div>

          <div class="flex flex-col gap-2.5">
            <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">${ico('photo_camera', 'text-[20px]')}</span>
              <div>
                <p class="text-xs font-extrabold text-on-surface">Cámara</p>
                <p class="text-[11px] text-on-surface-variant">Solo para escanear tickets y extraer importes automáticamente.</p>
              </div>
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-tertiary/12 text-tertiary flex items-center justify-center flex-shrink-0">${ico('mic', 'text-[20px]')}</span>
              <div>
                <p class="text-xs font-extrabold text-on-surface">Micrófono</p>
                <p class="text-[11px] text-on-surface-variant">Solo cuando mantengas «+» o pulses «Dictar» para anotar gastos por voz.</p>
              </div>
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-secondary/12 text-secondary flex items-center justify-center flex-shrink-0">${ico('notifications_active', 'text-[20px]')}</span>
              <div>
                <p class="text-xs font-extrabold text-on-surface">Notificaciones</p>
                <p class="text-[11px] text-on-surface-variant">Solo para avisarte de vencimientos, devoluciones y cobros pendientes.</p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button onclick="haptic('selection'); onboardingStep=2; renderOnboardingStep()" class="px-4 py-3 rounded-2xl bg-surface-container text-on-surface font-bold text-xs active-scale">Atrás</button>
            <button onclick="haptic('medium'); finishOnboarding(true)" class="flex-1 py-3.5 rounded-2xl hero-indigo text-white font-extrabold text-sm shadow-lg active-scale">
              Entrar a mi panel ✨
            </button>
          </div>
        `;
      }

      card.innerHTML = bodyHtml;
    }

    function continueFromOnboardingModeStep() {
      if (onboardingDraft.mode === 'cloud' && !loggedUserId) {
        // Open login/register modal on top; after login succeeds, resume onboarding at step 2
        window.__resumeOnboardingAfterAuth = true;
        openProfileOrLogin(false);
        return;
      }
      onboardingStep = 2;
      renderOnboardingStep();
    }

    // ============================================================================
    // 7B. INTERACTIVE MONTH PICKER MODAL (Tap month in global header)
    // ============================================================================
    function openMonthPickerModal() {
      const curParts = String(viewMk || monthKey(todayStr())).split('-').map(Number);
      monthPickerYear = curParts[0] || new Date().getFullYear();
      renderMonthPickerModal();
    }

    function renderMonthPickerModal() {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const curTodayMk = monthKey(todayStr());

      const gridHtml = monthNames.map((name, idx) => {
        const mk = `${monthPickerYear}-${String(idx + 1).padStart(2, '0')}`;
        const count = monthExpenses(mk).length + monthIncomes(mk).length;
        const isSelected = mk === viewMk;
        const isNow = mk === curTodayMk;
        return `
          <button onclick="haptic('selection'); viewMk='${mk}'; closeUniversalModal(); renderAllViews();" class="p-3 rounded-2xl border text-center transition-all active-scale flex flex-col items-center gap-0.5 ${isSelected ? 'bg-primary text-on-primary border-primary shadow-sm' : isNow ? 'border-primary/50 bg-primary/8 text-primary' : 'border-outline-variant/35 bg-surface-container-low hover:bg-surface-container text-on-surface'}">
            <span class="text-sm font-extrabold">${name}</span>
            <span class="text-[10px] font-bold ${isSelected ? 'text-white/85' : 'text-on-surface-variant'}">${count > 0 ? `${count} mov.` : (isNow ? 'Actual' : '—')}</span>
          </button>`;
      }).join('');

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Seleccionar mes</h3>
              <p class="text-[11px] text-on-surface-variant">${getMonthStartDay() > 1 ? `Ciclo financiero desde el día ${getMonthStartDay()}` : 'Mes natural (día 1 al final de mes)'}</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-2xl border border-outline-variant/30">
            <button onclick="haptic('selection'); monthPickerYear--; renderMonthPickerModal()" class="w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface">${ico('chevron_left', 'text-[19px]')}</button>
            <span class="font-headline-sm text-lg font-extrabold text-on-surface tabular-nums">${monthPickerYear}</span>
            <button onclick="haptic('selection'); monthPickerYear++; renderMonthPickerModal()" class="w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface">${ico('chevron_right', 'text-[19px]')}</button>
          </div>

          <div class="grid grid-cols-3 gap-2.5">${gridHtml}</div>

          <button onclick="haptic('selection'); resetToCurrentMonth(); closeUniversalModal();" class="w-full py-2.5 rounded-xl bg-primary/12 text-primary font-extrabold text-xs hover:bg-primary/20 transition active-scale">
            Volver al mes actual (${monthLabel(curTodayMk)})
          </button>
        </div>
      `);
    }

    // ============================================================================
    // 7C. CONTROL STREAK EXPLAINER & CHECK-IN MODAL (Anti-Anxiety Design)
    // ============================================================================
    function openStreakModal() {
      const info = computeControlStreak();
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xl">🔥</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Racha de control</h3>
                <p class="text-[11px] text-on-surface-variant">Días consecutivos con tus gastos al día</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="p-4 rounded-2xl bg-gradient-to-br from-amber-500/12 to-orange-500/5 border border-amber-500/25 flex items-center justify-between">
            <div>
              <p class="text-3xl font-extrabold text-on-surface tabular-nums">🔥 ${info.days} ${info.days === 1 ? 'día' : 'días'}</p>
              <p class="text-xs font-bold text-amber-700 dark:text-amber-300 mt-1">${esc(info.statusText)}</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-extrabold uppercase text-on-surface-variant">Mejor marca</p>
              <p class="text-lg font-extrabold text-on-surface tabular-nums">${info.best} d</p>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2 text-xs text-on-surface-variant">
            <p class="font-extrabold text-on-surface">Reglas saludables (sin ansiedad):</p>
            <div class="flex items-start gap-2">
              <span class="text-secondary font-extrabold">✓</span>
              <span><strong>No gastar suma:</strong> los días sin gastos cuentan como días positivos en tu racha.</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-primary font-extrabold">✓</span>
              <span><strong>1 día de gracia por semana:</strong> si un día olvidas anotar algo, tu racha no se rompe.</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-sky-500 font-extrabold">❄️</span>
              <span><strong>2 congeladores al mes:</strong> úsalos en vacaciones o días desconectado (${info.freezesRemaining}/2 disponibles este mes).</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button onclick="haptic('medium'); toggleTodayNoSpendCheckin()" class="py-3 px-3.5 rounded-2xl font-extrabold text-xs transition active-scale flex items-center justify-center gap-1.5 ${info.todayActive ? 'bg-secondary/15 text-secondary border border-secondary/30' : 'bg-primary text-on-primary shadow-sm'}">
              ${ico('check_circle', 'text-[16px]')}
              ${info.todayActive ? 'Hoy confirmado al día ✓' : 'Marcar hoy al día ✓'}
            </button>
            <button onclick="haptic('selection'); toggleTodayStreakFreeze()" class="py-3 px-3.5 rounded-2xl font-extrabold text-xs transition active-scale flex items-center justify-center gap-1.5 ${info.todayFrozen ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/35' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}">
              ${ico('snowflake', 'text-[16px]')}
              ${info.todayFrozen ? 'Congelador activo hoy' : `Congelar hoy (${info.freezesRemaining}/2)`}
            </button>
          </div>
        </div>
      `);
    }

    // ============================================================================
    // 7D. GROUP SPLIT SHORTCUT FROM 2x3 ADD SHEET
    // ============================================================================
    function openGroupSplitShortcut() {
      if (loggedUserId && sbGrupos.length > 0) {
        openUniversalModal(`
          <div class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Repartir gasto en grupo</h3>
                <p class="text-[11px] text-on-surface-variant">Elige cómo quieres dividir el gasto</p>
              </div>
              <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
            </div>
            <button onclick="closeUniversalModal(); openGlobalChargeModal()" class="p-4 rounded-2xl bg-primary/8 hover:bg-primary/14 border border-primary/25 text-left flex items-center gap-3 active-scale">
              <span class="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">${ico('groups', 'text-[20px]')}</span>
              <div class="flex-1">
                <p class="text-sm font-extrabold text-on-surface">Grupo en la nube</p>
                <p class="text-xs text-on-surface-variant">Repartir cargo en tus grupos sincronizados</p>
              </div>
              ${ico('chevron_right', 'text-outline')}
            </button>
            <button onclick="closeUniversalModal(); openSmartSplitModal()" class="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-left flex items-center gap-3 active-scale">
              <span class="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">${ico('call_split', 'text-[20px]')}</span>
              <div class="flex-1">
                <p class="text-sm font-extrabold text-on-surface">Reparto inteligente (5 modos)</p>
                <p class="text-xs text-on-surface-variant">Por ítems, partes iguales, exactos, % o shares</p>
              </div>
              ${ico('chevron_right', 'text-outline')}
            </button>
          </div>
        `);
      } else {
        openSmartSplitModal();
      }
    }

    // ============================================================================
    // 7E. DEEP LINKS ROUTER (#/inicio, #/social/grupos, #/stats, #/yo, #/add/voz)
    // ============================================================================
    let isHandlingHashRoute = false;

    function syncRouteHash() {
      if (isHandlingHashRoute) return;
      let route = '#/inicio';
      if (activeMainView === 'cuentas') {
        route = `#/social/${activeP2PTab || 'balance'}`;
      } else if (activeMainView === 'analitica') {
        route = '#/stats';
      } else if (activeMainView === 'ajustes') {
        route = activeAjustesSub ? `#/yo/${activeAjustesSub}` : '#/yo';
      } else if (activeMainView === 'gastos') {
        route = '#/movimientos';
      }
      if (window.location.hash !== route) {
        try {
          history.replaceState(null, '', route);
        } catch (e) {}
      }
    }

    function navigateFromHash() {
      const raw = (window.location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
      if (!raw) return false;
      const parts = raw.split('/').filter(Boolean);
      const head = parts[0];
      const sub = parts[1] || null;

      isHandlingHashRoute = true;
      try {
        if (head === 'inicio' || head === 'home') {
          switchMainView('inicio');
        } else if (head === 'social' || head === 'deudas' || head === 'cuentas') {
          const validSub = ['balance', 'grupos', 'historial'].includes(sub) ? sub : 'balance';
          switchMainView('cuentas', validSub);
        } else if (head === 'stats' || head === 'analitica') {
          switchMainView('analitica');
        } else if (head === 'yo' || head === 'ajustes') {
          switchMainView('ajustes', sub || 'perfil');
        } else if (head === 'movimientos' || head === 'gastos') {
          switchMainView('gastos');
        } else if (head === 'add') {
          switchMainView('inicio');
          if (sub === 'voz') openCompoundVoiceModal(true);
          else if (sub === 'ticket') openEnhancedReceiptScannerModal();
          else if (sub === 'ingreso') openTxModal('inc');
          else if (sub === 'gasto') openTxModal('exp');
          else openQuickActionSheet();
        } else {
          return false;
        }
        return true;
      } finally {
        isHandlingHashRoute = false;
      }
    }

    // ============================================================================
    // 7F. BULK MULTI-SELECT MODE (Triggered by Long-Press on any Transaction Row)
    // ============================================================================
    function updateBulkSelectBarUI() {
      const bar = $('#bulk-select-bar');
      const cnt = $('#bulk-select-count');
      if (!bar) return;
      if (bulkSelectMode && bulkSelectedIds.size > 0) {
        bar.classList.remove('hidden');
        if (cnt) cnt.textContent = String(bulkSelectedIds.size);
      } else {
        bar.classList.add('hidden');
      }
    }

    function enterBulkSelectMode(txKey) {
      haptic('heavy');
      bulkSelectMode = true;
      bulkSelectedIds = new Set([txKey]);
      renderAllViews();
      updateBulkSelectBarUI();
    }

    function toggleBulkSelectItem(txKey) {
      haptic('selection');
      if (bulkSelectedIds.has(txKey)) {
        bulkSelectedIds.delete(txKey);
        if (bulkSelectedIds.size === 0) {
          exitBulkSelectMode();
          return;
        }
      } else {
        bulkSelectedIds.add(txKey);
      }
      renderAllViews();
      updateBulkSelectBarUI();
    }

    function exitBulkSelectMode() {
      bulkSelectMode = false;
      bulkSelectedIds.clear();
      updateBulkSelectBarUI();
      renderAllViews();
    }

    function openBulkCategoryModal() {
      const expKeys = Array.from(bulkSelectedIds).filter(k => k.startsWith('exp:'));
      if (expKeys.length === 0) {
        showToast('Selecciona al menos un gasto para recategorizar');
        return;
      }
      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Mover ${expKeys.length} gasto(s) a categoría</h3>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            ${allCats().map(c => `
              <button onclick="applyBulkCategory('${c.id}')" class="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/35 flex items-center gap-2 text-left active-scale">
                <span class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${c.c}1c;color:${c.c}">${ico(c.icon, 'text-[17px]')}</span>
                <span class="text-xs font-extrabold text-on-surface truncate">${esc(c.name)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `);
    }

    async function applyBulkCategory(catId) {
      const expIds = Array.from(bulkSelectedIds).filter(k => k.startsWith('exp:')).map(k => k.slice(4));
      let changed = 0;
      for (const id of expIds) {
        const exp = (S.expenses || []).find(e => e.id === id);
        if (exp) {
          exp.cat = catId;
          changed++;
          if (loggedUserId) await dbUpsertPersonalExpense(exp);
        }
      }
      saveLocalState(true);
      closeUniversalModal();
      exitBulkSelectMode();
      showToast(`✓ ${changed} gasto(s) movidos a ${catById(catId).name}`);
    }

    async function deleteSelectedTransactions() {
      const keys = Array.from(bulkSelectedIds);
      if (keys.length === 0) return;
      const trashEntries = [];
      for (const k of keys) {
        const [kind, id] = k.split(':');
        if (kind === 'exp') {
          const item = (S.expenses || []).find(e => e.id === id);
          if (item) {
            const entry = { trashId: uid(), kind: 'exp', item: { ...item }, deletedAt: Date.now() };
            S.trash.unshift(entry);
            trashEntries.push(entry);
            S.expenses = S.expenses.filter(e => e.id !== id);
            if (loggedUserId) await dbDeletePersonalExpense(id);
          }
        } else if (kind === 'inc') {
          const item = (S.incomes || []).find(i => i.id === id);
          if (item) {
            const entry = { trashId: uid(), kind: 'inc', item: { ...item }, deletedAt: Date.now() };
            S.trash.unshift(entry);
            trashEntries.push(entry);
            S.incomes = S.incomes.filter(i => i.id !== id);
            if (loggedUserId) await dbDeletePersonalIncome(id);
          }
        }
      }
      saveLocalState(true);
      exitBulkSelectMode();
      showToast(`🗑️ ${trashEntries.length} movimiento(s) enviados a papelera`, 'Deshacer', async () => {
        for (const entry of trashEntries) {
          await restoreFromTrash(entry.trashId);
        }
      }, 5000);
    }

    // ============================================================================
    // 7G. TOUCH GESTURES ENGINE (FAB Long-Press, Home Month Swipe, Row Swipe, PTR)
    // ============================================================================
    function initGesturesAndInteractions() {
      // 1. Central '+' FAB: Tap = Quick Action Sheet | Long-Press = Direct Voice Dictation
      const fab = $('#fab-add-btn');
      if (fab && !fab.dataset.bound) {
        fab.dataset.bound = 'true';
        let lpTimer = null;
        let didLongPress = false;

        const startPress = () => {
          didLongPress = false;
          fab.classList.add('is-longpressing');
          lpTimer = setTimeout(() => {
            didLongPress = true;
            fab.classList.remove('is-longpressing');
            haptic('heavy');
            openCompoundVoiceModal(true);
          }, 480);
        };
        const cancelPress = () => {
          clearTimeout(lpTimer);
          fab.classList.remove('is-longpressing');
        };

        fab.addEventListener('pointerdown', startPress);
        fab.addEventListener('pointerup', () => {
          cancelPress();
          if (!didLongPress) {
            haptic('medium');
            openQuickActionSheet();
          }
        });
        fab.addEventListener('pointerleave', cancelPress);
        fab.addEventListener('pointercancel', cancelPress);
        fab.addEventListener('contextmenu', (e) => e.preventDefault());
      }

      // 2. Horizontal Swipe on Home (#view-inicio) changes month
      const mainCanvas = $('#app-main-canvas');
      if (mainCanvas && !mainCanvas.dataset.swipeBound) {
        mainCanvas.dataset.swipeBound = 'true';
        let homeStartX = 0, homeStartY = 0, homeEligible = false;

        mainCanvas.addEventListener('touchstart', (e) => {
          if (activeMainView !== 'inicio' || e.touches.length !== 1) { homeEligible = false; return; }
          const target = e.target;
          if (target.closest('.custom-scroll') || target.closest('.tx-swipe-wrap') || target.closest('input, select, textarea')) {
            homeEligible = false;
            return;
          }
          homeStartX = e.touches[0].clientX;
          homeStartY = e.touches[0].clientY;
          homeEligible = true;
        }, { passive: true });

        mainCanvas.addEventListener('touchend', (e) => {
          if (!homeEligible || e.changedTouches.length !== 1) return;
          const dx = e.changedTouches[0].clientX - homeStartX;
          const dy = e.changedTouches[0].clientY - homeStartY;
          homeEligible = false;
          if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.6) {
            haptic('selection');
            shiftMonth(dx < 0 ? 1 : -1);
          }
        }, { passive: true });
      }

      // 3. Web Pull-to-Refresh (when not inside iOS native wrapper which already has UIRefreshControl)
      if (!window.__CLARIDAD_IOS_NATIVE__ && !document.body.dataset.ptrBound) {
        document.body.dataset.ptrBound = 'true';
        let ptrStartY = 0, ptrPulling = false, ptrDist = 0;
        const ptrEl = $('#ptr-indicator');
        const ptrText = $('#ptr-text');

        window.addEventListener('touchstart', (e) => {
          if (window.scrollY <= 2 && e.touches.length === 1 && !$('#universal-modal')?.classList.contains('flex')) {
            ptrStartY = e.touches[0].clientY;
            ptrPulling = true;
            ptrDist = 0;
          }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
          if (!ptrPulling) return;
          const dy = e.touches[0].clientY - ptrStartY;
          if (dy > 16 && window.scrollY <= 2) {
            ptrDist = Math.min(96, dy);
            if (ptrEl) ptrEl.style.transform = `translateY(${Math.min(64, ptrDist - 36)}px)`;
            if (ptrText) ptrText.textContent = ptrDist > 70 ? 'Suelta para sincronizar' : 'Desliza para actualizar';
          } else {
            ptrPulling = false;
          }
        }, { passive: true });

        window.addEventListener('touchend', () => {
          if (!ptrPulling) return;
          ptrPulling = false;
          if (ptrEl) ptrEl.style.transform = '';
          if (ptrDist > 70) {
            haptic('medium');
            if (loggedUserId) cargarDatosSupabase(true);
            else { renderAllViews(); showToast('Datos actualizados ✓'); }
          }
          ptrDist = 0;
        }, { passive: true });
      }

      // 4. Delegated Swipe (Left = Edit, Right = Delete+Undo) & Long-Press (Multi-Select) on .tx-swipe-wrap
      if (!document.body.dataset.txGestureBound) {
        document.body.dataset.txGestureBound = 'true';
        let activeWrap = null;
        let contentEl = null;
        let startX = 0, startY = 0, currentDx = 0;
        let isHorizontal = false;
        let rowLpTimer = null;
        let rowLongPressed = false;

        document.addEventListener('touchstart', (e) => {
          const wrap = e.target.closest('.tx-swipe-wrap');
          if (!wrap || e.touches.length !== 1) return;
          activeWrap = wrap;
          contentEl = wrap.querySelector('.tx-swipe-content');
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          currentDx = 0;
          isHorizontal = false;
          rowLongPressed = false;

          const txKey = wrap.dataset.txKey;
          if (txKey && !bulkSelectMode) {
            rowLpTimer = setTimeout(() => {
              rowLongPressed = true;
              enterBulkSelectMode(txKey);
            }, 500);
          }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
          if (!activeWrap || !contentEl) return;
          const dx = e.touches[0].clientX - startX;
          const dy = e.touches[0].clientY - startY;
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            clearTimeout(rowLpTimer);
          }
          if (bulkSelectMode) return;
          if (!isHorizontal && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            isHorizontal = true;
            activeWrap.classList.add('is-swiping');
          }
          if (isHorizontal) {
            currentDx = Math.max(-110, Math.min(110, dx));
            contentEl.style.transform = `translateX(${currentDx}px)`;
          }
        }, { passive: true });

        document.addEventListener('touchend', () => {
          clearTimeout(rowLpTimer);
          if (!activeWrap || !contentEl) return;
          const wrap = activeWrap;
          const dx = currentDx;
          const wasHorizontal = isHorizontal;
          wrap.classList.remove('is-swiping');
          contentEl.style.transform = '';
          activeWrap = null;
          contentEl = null;
          isHorizontal = false;
          currentDx = 0;

          if (rowLongPressed || !wasHorizontal) return;
          const kind = wrap.dataset.txKind;
          const id = wrap.dataset.txId;
          if (!kind || !id) return;

          if (dx <= -68) {
            // Swipe LEFT -> Edit
            haptic('light');
            openTxModal(kind, id);
          } else if (dx >= 68) {
            // Swipe RIGHT -> Delete with 5s Undo Toast
            haptic('medium');
            deleteTx(kind, id);
          }
        }, { passive: true });
      }
    }
