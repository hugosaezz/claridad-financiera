    // ============================================================================
    // 13. VIEW 5: YO (PERFIL, METAS, AJUSTES, BACKUP, PAPELERA & AVANZADO)
    // ============================================================================
    function updateCurrencySetting(code) {
      if (!S?.settings) return;
      S.settings.currency = code || 'EUR';
      saveLocalState(true);
      renderAllViews();
      showToast(`Moneda cambiada a ${code} ✓`);
    }

    function updateMonthStartDaySetting(val) {
      if (!S?.settings) return;
      const d = Math.max(1, Math.min(28, parseInt(val, 10) || 1));
      S.settings.monthStartDay = d;
      saveLocalState(true);
      viewMk = monthKey(todayStr());
      renderAllViews();
      showToast(`Inicio de mes financiero: día ${d} ✓`);
    }

    function updateDisplayNameSetting(val) {
      if (!S?.settings) return;
      S.settings.displayName = String(val || '').trim();
      saveLocalState(false);
      updateCloudHeaderUI();
      showToast('Nombre actualizado ✓');
    }

    function renderAjustesView() {
      const el = $('#view-ajustes');
      if (!el) return;

      const userName = currentLoggedUserName();
      const recSum = (S.recurring || []).reduce((a, r) => a + Number(r.amount || 0), 0);
      const refunds = (S.expenses || []).filter(e => e.refund);
      const trashCount = (S.trash || []).length;
      const isDark = document.documentElement.classList.contains('dark');
      const curObj = currentCurrencyObj();
      const secCfg = getSecurityConfig();
      const activeAccounts = (S.accounts || defaultAccountsList()).filter(a => !a.archived);
      const receiptsCount = (S.receipts || []).length;
      const bankConnsCount = (S.bankConnections || []).length;
      const pendingInboxCount = (S.pendingInbox || []).length;
      const detectorAlertsCount = typeof runSmartFinancialDetectors === 'function' ? runSmartFinancialDetectors().length : 0;

      const modules = [
        { id: "perfil",    label: "Perfil y Ajustes",    icon: "settings",          badge: loggedUserId ? '☁️ Nube' : '💾 Local' },
        { id: "bancos",    label: "Bancos & Alertas",    icon: "account_balance",   badge: (pendingInboxCount + detectorAlertsCount) > 0 ? `${pendingInboxCount + detectorAlertsCount} avisos` : (bankConnsCount > 0 ? `${bankConnsCount} PSD2` : 'PSD2') },
        { id: "cuentas",   label: "Mis Cuentas",         icon: "account_balance_wallet", badge: `${activeAccounts.length}` },
        { id: "tickets",   label: "Tickets & Garantías", icon: "receipt_long",      badge: `${receiptsCount}` },
        { id: "seguridad", label: "Seguridad & GDPR",    icon: "shield",            badge: secCfg.pinHash ? '🔒 PIN' : 'Libre' },
        { id: "datos",     label: "Exportar & Papelera", icon: "download",          badge: trashCount > 0 ? `🗑️ ${trashCount}` : 'Portab.' },
        { id: "ingresos",  label: "Nómina e Ingresos",   icon: "payments",          badge: fmt0(monthIncomeTotal(viewMk)) },
        { id: "pres",      label: "Presupuestos & ↻",    icon: "track_changes",     badge: fmt0(totalMonthlyBudget()) },
        { id: "rec",       label: "Suscripciones",       icon: "autorenew",         badge: `${fmt0(recSum)}/mes` },
        { id: "obj",       label: "Metas & Retos",       icon: "emoji_events",      badge: `${(S.goals || []).length + (S.challenges || []).length}` },
        { id: "viajes",    label: "Modo Viaje",          icon: "flight_takeoff",    badge: `${(S.trips || []).length}` },
        { id: "reglas",    label: "Reglas y Categorías", icon: "auto_fix_high",     badge: `${(S.rules || []).length}` },
        { id: "devol",     label: "Devoluciones",        icon: "assignment_return", badge: `${refunds.length}` }
      ];

      if (!activeAjustesSub || !modules.some(m => m.id === activeAjustesSub)) {
        activeAjustesSub = "perfil";
      }

      const deletionWarningBanner = secCfg.pendingDeletionAt ? `
        <div class="bento-card p-4 rounded-2xl border-l-4 border-l-tertiary bg-tertiary/10 flex flex-wrap items-center justify-between gap-3">
          <div class="text-xs">
            <p class="font-extrabold text-tertiary">⏳ Borrado total programado para el ${new Date(secCfg.pendingDeletionAt).toLocaleDateString('es-ES')}</p>
            <p class="text-on-surface-variant">Tus datos siguen intactos hasta esa fecha. Puedes cancelarlo en 1 toque.</p>
          </div>
          <button onclick="cancelScheduledDeletion()" class="px-3.5 py-2 rounded-xl bg-secondary text-white text-xs font-extrabold active-scale">Cancelar borrado</button>
        </div>
      ` : '';

      // Top Profile Summary Banner (Explicit Cloud vs Local status — NEVER "Invitado")
      const profileBannerHtml = `
        <div class="bento-card p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${loggedUserId ? 'border-l-secondary' : 'border-l-primary'}">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-12 h-12 rounded-2xl ${loggedUserId ? 'bg-secondary/15 text-secondary' : 'bg-primary/12 text-primary'} font-extrabold text-lg flex items-center justify-center flex-shrink-0">
              ${loggedUserId ? (isAdmin ? '👑' : esc(initials(userName))) : ico('hard_drive', 'text-[22px]')}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-headline-sm text-base font-extrabold text-on-surface truncate">${esc(userName)}</h2>
                ${loggedUserId
                  ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">☁️ Copia en la nube</span>`
                  : `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">💾 Local</span>`
                }
              </div>
              <p class="text-xs text-on-surface-variant mt-0.5">
                ${loggedUserId
                  ? `${(S.expenses || []).length} gastos · ${(S.incomes || []).length} ingresos · ${(S.debts || []).length} deudas P2P sincronizados`
                  : `Guardado solo en este dispositivo · ${(S.expenses || []).length} gastos y ${(S.debts || []).length} deudas`}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${loggedUserId ? `
              <button onclick="syncUserPersonalDataToCloud().then(()=>showToast('Sincronizado con la nube ✓'))" class="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold hover:opacity-95 transition active-scale inline-flex items-center gap-1.5">
                ${ico('sync', 'text-[14px]')} Sincronizar
              </button>
              <button onclick="openProfileOrLogin()" class="px-3.5 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition active-scale">
                Cambiar cuenta
              </button>
            ` : `
              <button onclick="exportBackupJSON()" class="px-3.5 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition active-scale inline-flex items-center gap-1.5">
                ${ico('download', 'text-[14px]')} Backup
              </button>
              <button onclick="openProfileOrLogin()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-extrabold hover:bg-primary-container transition active-scale inline-flex items-center gap-1.5">
                ${ico('cloud_done', 'text-[14px]')} Activar nube
              </button>
            `}
          </div>
        </div>
      `;

      const navCardsHtml = modules.map(m => {
        const active = activeAjustesSub === m.id;
        return `
          <button onclick="haptic('selection'); activeAjustesSub='${m.id}'; renderAjustesView(); syncRouteHash();" class="p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 active-scale ${active ? 'bg-primary text-on-primary border-primary shadow-sm' : 'bento-card text-on-surface hover:bg-surface-container-low'}">
            <div class="flex items-center gap-2 min-w-0">
              ${ico(m.icon, `text-[18px] ${active ? 'text-on-primary' : 'text-primary'}`, active)}
              <span class="font-label-md text-xs font-extrabold truncate">${esc(m.label)}</span>
            </div>
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'}">${esc(m.badge)}</span>
          </button>`;
      }).join('');

      let subBodyHtml = '';

      if (activeAjustesSub === "perfil") {
        const st = S.settings || {};
        subBodyHtml = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
              <div class="flex items-center gap-2">
                ${ico('tune', 'text-primary text-[19px]')}
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Preferencias generales</h3>
              </div>

              ${!loggedUserId ? `
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-on-surface-variant">Tu nombre (opcional, solo local)</label>
                  <input type="text" value="${esc(st.displayName || '')}" placeholder="Ej. Hugo" onchange="updateDisplayNameSetting(this.value)" class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
                </div>
              ` : ''}

              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-on-surface-variant">Moneda principal</label>
                <select onchange="updateCurrencySetting(this.value)" class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface">
                  ${CURRENCIES.map(c => `
                    <option value="${c.code}" ${curObj.code === c.code ? 'selected' : ''}>
                      ${esc(c.code)} (${esc(c.symbol)}) — ${esc(c.name)}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-bold text-on-surface">Día de inicio del mes financiero</p>
                  <p class="text-[11px] text-on-surface-variant">Día 1 por defecto (o tu día de cobro, ej. 25)</p>
                </div>
                <input type="number" min="1" max="28" value="${st.monthStartDay || 1}" onchange="updateMonthStartDaySetting(this.value)" class="w-20 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-center font-extrabold text-sm text-on-surface"/>
              </div>

              <div class="flex items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
                <div class="flex items-center gap-2.5">
                  <span class="w-9 h-9 rounded-xl bg-surface-container text-primary flex items-center justify-center">${ico(isDark ? 'light_mode' : 'dark_mode', 'text-[18px]')}</span>
                  <div>
                    <p class="text-xs font-bold text-on-surface">Tema de apariencia</p>
                    <p class="text-[11px] text-on-surface-variant">${isDark ? 'Modo oscuro activo' : 'Modo claro activo'}</p>
                  </div>
                </div>
                <button onclick="toggleTheme(); renderAjustesView()" class="px-3.5 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-extrabold hover:bg-surface-container-high transition active-scale">
                  Cambiar a ${isDark ? 'claro' : 'oscuro'}
                </button>
              </div>

              <div class="flex items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
                <div class="flex items-center gap-2.5">
                  <span class="w-9 h-9 rounded-xl bg-surface-container text-primary flex items-center justify-center">${ico(isPrivacyMode ? 'visibility_off' : 'visibility', 'text-[18px]')}</span>
                  <div>
                    <p class="text-xs font-bold text-on-surface">Modo privacidad de saldos</p>
                    <p class="text-[11px] text-on-surface-variant">Muestra •••• en lugar de cifras reales</p>
                  </div>
                </div>
                <button onclick="togglePrivacyMode(); renderAjustesView()" class="px-3.5 py-2 rounded-xl ${isPrivacyMode ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'} text-xs font-extrabold transition active-scale">
                  ${isPrivacyMode ? 'Activado' : 'Activar'}
                </button>
              </div>

              <div class="flex items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
                <div>
                  <p class="text-xs font-bold text-on-surface">Idioma / Language</p>
                  <p class="text-[11px] text-on-surface-variant">Arquitectura i18n preparada</p>
                </div>
                <select onchange="setAppLocale(this.value)" class="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-extrabold text-on-surface">
                  <option value="es" ${(st.locale || 'es') === 'es' ? 'selected' : ''}>🇪🇸 Español</option>
                  <option value="en" ${st.locale === 'en' ? 'selected' : ''}>🇬🇧 English</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
                <button onclick="toggleHighContrastSetting()" class="py-2 px-3 rounded-xl ${st.highContrast ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'} text-xs font-extrabold active-scale">
                  🌗 ${st.highContrast ? 'Contraste WCAG ON' : 'Alto contraste'}
                </button>
                <button onclick="toggleReduceMotionSetting()" class="py-2 px-3 rounded-xl ${st.reduceMotion ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'} text-xs font-extrabold active-scale">
                  ✨ ${st.reduceMotion ? 'Movimiento reducido' : 'Reducir animaciones'}
                </button>
              </div>
            </div>

            <div class="bento-card p-5 rounded-2xl flex flex-col justify-between gap-4">
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2">
                  ${ico('shield', 'text-secondary text-[19px]')}
                  <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Privacidad y filosofía</h3>
                </div>
                <div class="p-3.5 rounded-2xl bg-secondary/8 border border-secondary/20 text-xs text-on-surface flex flex-col gap-1.5">
                  <p class="font-extrabold text-secondary">${typeof t === 'function' ? esc(t('trust_seal')) : '🔒 Privado · 🚫 Sin anuncios · 🚫 Sin venta de datos · 💯 Gratis para siempre'}</p>
                  <p class="text-[11px] text-on-surface-variant leading-relaxed">
                    Tus datos son tuyos. Puedes cifrarlos E2E, exportarlos en cualquier momento o borrarlos por completo sin límites ni suscripciones.
                  </p>
                </div>

                <button onclick="openHumanChangelogModal()" class="w-full py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary font-extrabold text-xs flex items-center justify-between transition active-scale">
                  <span class="flex items-center gap-2">${ico('auto_awesome', 'text-[17px]')} Novedades (Changelog v2.8)</span>
                  ${ico('chevron_right', 'text-[16px]')}
                </button>

                <button onclick="openKeyboardShortcutsModal()" class="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-between transition active-scale">
                  <span class="flex items-center gap-2">⌨️ Atajos de teclado y Accesibilidad (?)</span>
                  ${ico('chevron_right', 'text-outline text-[16px]')}
                </button>

                <button onclick="openOnboardingFlow(0)" class="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-between transition active-scale">
                  <span class="flex items-center gap-2">${ico('info', 'text-primary text-[17px]')} Ver guía de bienvenida</span>
                  ${ico('chevron_right', 'text-outline text-[16px]')}
                </button>

                <button onclick="openStreakModal()" class="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-between transition active-scale">
                  <span class="flex items-center gap-2">🔥 Racha de control y congeladores</span>
                  ${ico('chevron_right', 'text-outline text-[16px]')}
                </button>

                <button onclick="openIOSDownloadModal()" class="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-between transition active-scale">
                  <span class="flex items-center gap-2">${ico('contactless', 'text-secondary text-[17px]')} Automatización Apple Pay</span>
                  ${ico('chevron_right', 'text-outline text-[16px]')}
                </button>
              </div>

              <!-- Advanced / Build Information (Hidden by default from main user UI) -->
              <details class="rounded-2xl bg-surface-container-low/70 border border-outline-variant/35 p-3.5 text-xs">
                <summary class="font-extrabold text-on-surface-variant cursor-pointer flex items-center justify-between list-none select-none">
                  <span class="flex items-center gap-2">${ico('code', 'text-[16px]')} Avanzado · Información de build</span>
                  ${ico('chevron_down', 'text-[15px]')}
                </summary>
                <div class="mt-3 pt-3 border-t border-outline-variant/25 flex flex-col gap-2.5 text-[11px] text-on-surface-variant">
                  <div class="grid grid-cols-2 gap-1.5">
                    <span>Versión:</span><strong class="text-on-surface text-right font-mono">${esc(APP_BUILD_INFO.version)}</strong>
                    <span>Plataforma:</span><strong class="text-on-surface text-right">${esc(APP_BUILD_INFO.platform)}</strong>
                    <span>Almacenamiento:</span><strong class="text-on-surface text-right">${loggedUserId ? 'Cloud + Local' : 'Solo local'}</strong>
                    <span>Actualización:</span><strong class="text-on-surface text-right font-mono">${esc(APP_BUILD_INFO.updated)}</strong>
                  </div>

                  <div class="flex flex-wrap gap-2 pt-1">
                    <button onclick="openIOSDownloadModal()" class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold inline-flex items-center gap-1">
                      ${ico('phone_iphone', 'text-[14px]')} Paquete iPhone (.IPA)
                    </button>
                    <button onclick="copySupabaseMigrationSQL()" class="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-bold inline-flex items-center gap-1">
                      ${ico('database', 'text-[14px]')} Copiar SQL
                    </button>
                  </div>

                  ${isAdmin ? `
                    <div class="pt-2 border-t border-outline-variant/25 flex flex-col gap-2">
                      <p class="font-extrabold text-on-surface">Administración de usuarios (${sbGlobalUsers.length})</p>
                      <div class="overflow-x-auto rounded-xl border border-outline-variant/30 max-h-56 overflow-y-auto bg-surface-container-lowest">
                        <table class="w-full text-left text-[11px]">
                          <thead class="bg-surface-container-low text-on-surface-variant uppercase font-extrabold border-b border-outline-variant/30 sticky top-0">
                            <tr>
                              <th class="px-2.5 py-2">ID</th>
                              <th class="px-2.5 py-2">Nombre</th>
                              <th class="px-2.5 py-2 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-outline-variant/20">
                            ${sbGlobalUsers.map(u => `
                              <tr>
                                <td class="px-2.5 py-2 font-mono text-outline">#${u.id}</td>
                                <td class="px-2.5 py-2 font-bold text-on-surface">${esc(u.nombre)}</td>
                                <td class="px-2.5 py-2 text-right space-x-1">
                                  <button onclick="quickSwitchToUser(${u.id})" class="px-2 py-0.5 rounded bg-secondary/10 text-secondary font-bold">Entrar</button>
                                  <button onclick="editSupabaseUserAdmin(${u.id})" class="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">Editar</button>
                                </td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ` : ''}
                </div>
              </details>
            </div>
          </div>`;
      } else if (activeAjustesSub === "ingresos") {
        const st = S.settings;
        const rows = incomeRows(viewMk);
        subBodyHtml = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
              <div class="flex items-center gap-2">
                ${ico('account_balance_wallet', 'text-secondary text-[19px]')}
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Nómina Mensual</h3>
              </div>
              <div class="flex items-center justify-between gap-3">
                <label class="text-xs font-bold text-on-surface-variant">Importe neto mensual (${esc(currencySymbol())})</label>
                <input type="number" step="10" value="${st.salary || 0}" onchange="updateSalarySettings(this.value, null, null)" class="w-32 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-right font-extrabold text-sm text-on-surface"/>
              </div>
              <div class="flex items-center justify-between gap-3">
                <label class="text-xs font-bold text-on-surface-variant">Día de cobro (1 - 28)</label>
                <input type="number" min="1" max="28" value="${st.salaryDay || 1}" onchange="updateSalarySettings(null, this.value, null)" class="w-24 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-right font-extrabold text-sm text-on-surface"/>
              </div>
              <div class="flex items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
                <div>
                  <p class="text-xs font-bold text-on-surface">Sumar nómina automáticamente cada mes</p>
                  <p class="text-[11px] text-on-surface-variant">Se añade al cálculo de margen disponible y ahorro</p>
                </div>
                <input type="checkbox" ${st.salaryAuto ? 'checked' : ''} onchange="updateSalarySettings(null, null, this.checked)" class="w-5 h-5 rounded text-primary focus:ring-primary"/>
              </div>
            </div>

            <div class="bento-card p-5 rounded-2xl flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface capitalize">Ingresos de ${monthLabel(viewMk)}</h3>
                <button onclick="openTxModal('inc')" class="px-3 py-1.5 rounded-xl bg-secondary text-on-secondary font-label-md text-xs font-bold hover:opacity-90 transition">+ Ingreso Extra</button>
              </div>
              <div class="divide-y divide-outline-variant/20">
                ${rows.map(r => `
                  <div class="py-2.5 flex items-center justify-between">
                    <div>
                      <p class="font-label-lg text-sm font-bold text-on-surface">${esc(r.source || 'Ingreso')}</p>
                      <p class="text-xs text-on-surface-variant">${fmtDay(r.date)} • ${r.auto ? 'Nómina automática' : esc(incById(r.cat).name)}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-headline-sm text-sm font-extrabold text-secondary tabular-nums privacy-val">+${fmt(r.amount)}</span>
                      ${!r.auto ? `<button onclick="deleteTx('inc','${r.id}')" class="text-outline hover:text-error">${ico('delete', 'text-[17px]')}</button>` : ''}
                    </div>
                  </div>
                `).join('') || `<p class="text-xs text-on-surface-variant py-6 text-center">Sin ingresos registrados este mes.</p>`}
              </div>
            </div>
          </div>`;
      } else if (activeAjustesSub === "pres") {
        const spentMap = {};
        monthExpenses(viewMk).forEach(e => spentMap[e.cat] = (spentMap[e.cat] || 0) + e.amount);

        subBodyHtml = `
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Presupuestos por Categoría con Arrastre (↻ Rollover)</h3>
                <p class="text-xs text-on-surface-variant">Si activas ↻ Arrastre, lo que no gastes este mes se suma a tu límite del mes siguiente</p>
              </div>
              <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary privacy-val">Total presupuestado: ${fmt0(totalMonthlyBudget())}</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              ${allCats().filter(c => c.id !== 'viajes').map(c => {
                const baseB = S.budgets[c.id] || 0;
                const effB = effBudget(c.id);
                const s = spentMap[c.id] || 0;
                const pct = effB > 0 ? Math.min(100, Math.round((s / effB) * 100)) : 0;
                const ro = !!S.rollover[c.id];
                const carried = S.carried[c.id] || 0;
                return `
                  <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:${c.c}1a;color:${c.c}">
                          ${ico(c.icon, 'text-[17px]')}
                        </span>
                        <div>
                          <p class="font-label-lg text-sm font-bold text-on-surface">${esc(c.name)}</p>
                          ${carried ? `<span class="text-[10px] font-bold text-primary">Incluye ${fmtSigned(carried)} arrastrados</span>` : ''}
                        </div>
                      </div>
                      <span class="text-xs font-extrabold tabular-nums privacy-val">${fmt0(s)} / ${fmt0(effB)}</span>
                    </div>
                    <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                      <div class="h-full rounded-full ${pct >= 100 ? 'bg-tertiary' : pct >= 80 ? 'bg-amber-500' : 'bg-secondary'}" style="width:${pct}%"></div>
                    </div>
                    <div class="flex items-center justify-between gap-2 pt-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[11px] font-bold text-on-surface-variant">Límite (${esc(currencySymbol())}):</span>
                        <input type="number" step="10" value="${baseB || ''}" placeholder="0" onchange="updateCategoryBudget('${c.id}', this.value)" class="w-24 px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
                      </div>
                      <button onclick="toggleCategoryRollover('${c.id}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${ro ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}">
                        ↻ ${ro ? 'Arrastre activo' : 'Activar arrastre'}
                      </button>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>`;
      } else if (activeAjustesSub === "rec") {
        subBodyHtml = `
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Suscripciones y Gastos Fijos</h3>
                <p class="text-xs text-on-surface-variant">Coste mensual: <strong class="privacy-val">${fmt(recSum)}/mes</strong> • Coste anual: <strong class="privacy-val">${fmt0(recSum * 12)}/año</strong></p>
              </div>
              <button onclick="openRecurringModal()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition active-scale">
                + Añadir Suscripción
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${(S.recurring || []).map(r => {
                const c = catById(r.cat);
                const paid = recPaidThisMonth(r, viewMk);
                return `
                  <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${c.c}1a;color:${c.c}">
                        ${ico(c.icon, 'text-[19px]')}
                      </span>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                          <p class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(r.name)}</p>
                          ${r.autoCharge !== false ? `<span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary">Auto-cobro</span>` : ''}
                        </div>
                        <p class="text-xs text-on-surface-variant">${esc(c.name)} • Día ${r.day || '—'} • ${paid ? '<span class="text-secondary font-bold">Sumado ✓</span>' : '<span class="text-amber-600 font-bold">Pendiente</span>'}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span class="font-headline-sm text-sm font-extrabold text-on-surface tabular-nums privacy-val">${fmt(r.amount)}</span>
                      <button onclick="deleteRecurring('${r.id}')" class="p-1 text-outline hover:text-error">${ico('delete', 'text-[17px]')}</button>
                    </div>
                  </div>`;
              }).join('') || `<p class="text-xs text-on-surface-variant py-6 text-center col-span-2">Sin suscripciones registradas.</p>`}
            </div>
          </div>`;
      } else if (activeAjustesSub === "obj") {
        subBodyHtml = typeof renderGamificationHubHtml === 'function' ? renderGamificationHubHtml() : '';
      } else if (activeAjustesSub === "viajes") {
        subBodyHtml = `
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Modo Viaje (Presupuestos de Escapadas)</h3>
                <p class="text-xs text-on-surface-variant">Controla el ritmo de gasto diario en tus viajes</p>
              </div>
              <button onclick="openNewTripModal()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition active-scale">
                + Nuevo Viaje
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              ${(S.trips || []).map(t => {
                const tExps = (S.expenses || []).filter(e => e.tripId === t.id);
                const spent = sumExp(tExps);
                const pct = t.budget > 0 ? Math.min(100, Math.round((spent / t.budget) * 100)) : 0;
                const d0 = new Date(t.start + "T12:00:00"), d1 = new Date(t.end + "T12:00:00");
                const days = Math.max(1, Math.round((d1 - d0) / 864e5) + 1);
                return `
                  <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2.5">
                    <div class="flex items-center justify-between">
                      <h4 class="font-label-lg text-base font-extrabold text-on-surface">✈️ ${esc(t.name)}</h4>
                      <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-600">${pct}%</span>
                    </div>
                    <p class="text-xs text-on-surface-variant">${t.start} → ${t.end} (${days} días) • Media prevista: ${fmt0(t.budget / days)}/día</p>
                    <div class="flex justify-between text-xs font-extrabold tabular-nums privacy-val">
                      <span>Gastado: ${fmt(spent)}</span>
                      <span>Presupuesto: ${fmt(t.budget)}</span>
                    </div>
                    <div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div class="h-full rounded-full bg-teal-500" style="width:${pct}%"></div>
                    </div>
                    <div class="flex items-center justify-between pt-1">
                      <button onclick="openTxModal('exp', null, false, '${t.id}')" class="text-xs font-bold text-primary hover:underline">+ Añadir gasto al viaje</button>
                      <button onclick="deleteTrip('${t.id}')" class="text-xs font-bold text-tertiary hover:underline">Eliminar</button>
                    </div>
                  </div>`;
              }).join('') || `<p class="text-xs text-on-surface-variant py-6 text-center col-span-2">Sin viajes creados.</p>`}
            </div>
          </div>`;
      } else if (activeAjustesSub === "reglas") {
        subBodyHtml = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bento-card p-5 rounded-2xl flex flex-col gap-3">
              <div class="flex items-center justify-between gap-2">
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Reglas Inteligentes</h3>
                <button onclick="openIOSDownloadModal()" class="px-3 py-1.5 rounded-xl bg-secondary/15 text-secondary text-xs font-extrabold hover:bg-secondary/25 transition flex items-center gap-1">
                  ${ico('contactless', 'text-[15px]')}
                  Atajo Apple Pay
                </button>
              </div>
              <p class="text-xs text-on-surface-variant">Clasifica automáticamente tus gastos por comercio o palabra clave.</p>
              <div class="flex items-center gap-2">
                <input id="new-rule-match" type="text" placeholder="Palabra clave (ej. mercadona)" class="flex-1 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
                <select id="new-rule-cat" class="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                  ${allCats().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
                </select>
                <button onclick="addSmartRule()" class="px-3 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold">+ Regla</button>
              </div>
              <div class="divide-y divide-outline-variant/20">
                ${(S.rules || []).map(r => `
                  <div class="py-2 flex items-center justify-between text-xs">
                    <span>Si contiene <strong>«${esc(r.match)}»</strong> → <span class="text-primary font-bold">${esc(catById(r.cat).name)}</span></span>
                    <button onclick="deleteSmartRule('${r.id}')" class="text-outline hover:text-error">${ico('delete', 'text-[16px]')}</button>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="bento-card p-5 rounded-2xl flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Mis Categorías</h3>
                <button onclick="openNewCategoryModal()" class="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold">+ Crear Categoría</button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                ${allCats().map(c => {
                  const isCustom = (S.customCats || []).some(x => x.id === c.id);
                  return `
                    <div class="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${c.c}1a;color:${c.c}">
                          ${ico(c.icon, 'text-[15px]')}
                        </span>
                        <span class="text-xs font-bold text-on-surface truncate">${esc(c.name)}</span>
                      </div>
                      ${isCustom ? `<button onclick="deleteCustomCategory('${c.id}')" class="text-outline hover:text-error">${ico('close', 'text-[15px]')}</button>` : ''}
                    </div>`;
                }).join('')}
              </div>
            </div>
          </div>`;
      } else if (activeAjustesSub === "devol") {
        subBodyHtml = `
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Compras Pendientes de Devolución</h3>
                <p class="text-xs text-on-surface-variant">Amazon, Zara, Wallapop o fianzas por recuperar</p>
              </div>
              <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-800 privacy-val">${fmt(sumExp(refunds))} pendientes</span>
            </div>
            <div class="divide-y divide-outline-variant/20">
              ${refunds.map(e => `
                <div class="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p class="font-label-lg text-sm font-bold text-on-surface">${esc(cleanNoteText(e.note, catById(e.cat).name))}</p>
                    <p class="text-xs text-on-surface-variant">${fmtDay(e.date)} • ${esc(catById(e.cat).name)}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="font-headline-sm text-sm font-extrabold text-on-surface tabular-nums privacy-val">${fmt(e.amount)}</span>
                    <button onclick="markExpenseRefunded('${e.id}')" class="px-3 py-1.5 rounded-xl bg-secondary/15 text-secondary font-bold text-xs hover:bg-secondary/25 transition">✓ Ya devuelto</button>
                  </div>
                </div>
              `).join('') || `<p class="text-xs text-on-surface-variant py-6 text-center">No tienes devoluciones pendientes.</p>`}
            </div>
          </div>`;
      } else if (activeAjustesSub === "cuentas") {
        const allAccs = (S.accounts || defaultAccountsList());
        const totalNetCents = allAccs.filter(a => !a.archived).reduce((sum, a) => sum + computeAccountBalanceCents(a.id), 0);
        subBodyHtml = `
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Mis Cuentas y Carteras</h3>
                <p class="text-xs text-on-surface-variant">Saldo neto combinado (en céntimos exactos): <strong class="text-on-surface privacy-val">${fmt(Money.fromCents(totalNetCents))}</strong></p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button onclick="openConnectBankModal()" class="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold inline-flex items-center gap-1.5 active-scale">
                  ${ico('account_balance', 'text-[15px]')} Conectar banco (PSD2)
                </button>
                <button onclick="openNewAccountModal()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale">+ Nueva cuenta</button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${allAccs.map(a => {
                const balCents = computeAccountBalanceCents(a.id);
                const typeMeta = ACCOUNT_TYPES.find(t => t.id === a.type) || ACCOUNT_TYPES[0];
                return `
                  <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex items-center justify-between gap-3 ${a.archived ? 'opacity-55' : ''}">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${a.color || typeMeta.color}1c;color:${a.color || typeMeta.color}">
                        ${ico(a.icon || typeMeta.icon, 'text-[19px]')}
                      </span>
                      <div class="min-w-0">
                        <p class="text-sm font-extrabold text-on-surface truncate">${esc(a.name)}</p>
                        <p class="text-[11px] text-on-surface-variant">${esc(typeMeta.name)}${a.archived ? ' · Archivada' : ''}</p>
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <span class="font-headline-sm text-base font-extrabold tabular-nums privacy-val ${balCents >= 0 ? 'text-on-surface' : 'text-tertiary'}">${fmt(Money.fromCents(balCents))}</span>
                      <button onclick="toggleArchiveAccount('${a.id}')" class="text-[10px] font-bold text-primary hover:underline">${a.archived ? 'Reactivar' : 'Archivar'}</button>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>`;
      } else if (activeAjustesSub === "seguridad") {
        const consents = S?.settings?.consents || { cloudSync: !!loggedUserId, notifications: true, analytics: false };
        const bioAvail = isBiometricsSupported();
        const auditRows = (S.auditLog || []).slice(0, 8);
        subBodyHtml = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bento-card p-5 rounded-2xl flex flex-col gap-3.5">
              <div class="flex items-center gap-2">
                ${ico('lock', 'text-primary text-[19px]')}
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Bloqueo de acceso</h3>
              </div>

              <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-2">
                <div>
                  <p class="text-xs font-extrabold text-on-surface">PIN de 6 dígitos (SHA-256)</p>
                  <p class="text-[11px] text-on-surface-variant">${secCfg.pinHash ? 'Activo · Con bloqueo progresivo ante intentos fallidos' : 'Sin configurar'}</p>
                </div>
                <button onclick="openSetupPinModal()" class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale">${secCfg.pinHash ? 'Cambiar' : 'Activar'}</button>
              </div>

              <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-2">
                <div>
                  <p class="text-xs font-extrabold text-on-surface">Face ID / Touch ID / WebAuthn</p>
                  <p class="text-[11px] text-on-surface-variant">${secCfg.biometricEnabled ? 'Activo en este dispositivo ✓' : (bioAvail ? 'Compatible con tu dispositivo' : 'Disponible en iPhone .IPA o HTTPS')}</p>
                </div>
                <button onclick="${secCfg.biometricEnabled ? 'disableBiometrics()' : 'enrollBiometrics()'}" class="px-3 py-1.5 rounded-xl ${secCfg.biometricEnabled ? 'bg-secondary/15 text-secondary' : 'bg-surface-container text-on-surface'} text-xs font-extrabold active-scale">
                  ${secCfg.biometricEnabled ? 'Activo ✓' : 'Activar'}
                </button>
              </div>

              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-bold text-on-surface">Auto-bloqueo por inactividad</p>
                  <p class="text-[11px] text-on-surface-variant">Triple-tap en la barra superior activa Modo Pánico</p>
                </div>
                <select onchange="updateAutoLockSetting(this.value)" class="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                  <option value="0" ${secCfg.autoLockSeconds === 0 ? 'selected' : ''}>Inmediato</option>
                  <option value="60" ${secCfg.autoLockSeconds === 60 ? 'selected' : ''}>1 minuto</option>
                  <option value="300" ${secCfg.autoLockSeconds === 300 ? 'selected' : ''}>5 minutos</option>
                  <option value="-1" ${secCfg.autoLockSeconds < 0 ? 'selected' : ''}>Nunca</option>
                </select>
              </div>

              ${secCfg.pinHash ? `
                <button onclick="lockAppNow(false)" class="w-full py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-extrabold hover:bg-surface-container-high transition active-scale flex items-center justify-center gap-1.5">
                  ${ico('lock', 'text-[15px]')} Bloquear aplicación ahora
                </button>
              ` : ''}

              <div class="p-3.5 rounded-2xl bg-secondary/8 border border-secondary/25 flex flex-col gap-2.5">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <p class="text-xs font-extrabold text-on-surface">🛡️ Cifrado E2E Personal (AES-256-GCM)</p>
                    <p class="text-[11px] text-on-surface-variant">${typeof getE2EConfig === 'function' && getE2EConfig().enabled ? 'Activo · Frase de 12 palabras verificada' : 'Opcional · Conocimiento cero con frase de 12 palabras'}</p>
                  </div>
                  <button onclick="openE2ESetupModal()" class="px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold active-scale">${typeof getE2EConfig === 'function' && getE2EConfig().enabled ? 'Rotar' : 'Configurar'}</button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button onclick="exportEncryptedE2EBackup()" class="py-1.5 px-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-extrabold text-on-surface active-scale">🔐 Exportar .e2e.json</button>
                  <label class="py-1.5 px-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-extrabold text-on-surface text-center cursor-pointer active-scale">
                    🔓 Descifrar backup
                    <input type="file" accept=".json,application/json" onchange="importEncryptedE2EBackup(this)" class="hidden"/>
                  </label>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/25 text-[11px] text-on-surface-variant">
                <p class="font-extrabold text-on-surface">Dispositivo actual</p>
                <p class="mt-0.5">${esc(getDeviceLabel())} · ID <code class="font-mono">${esc(getOrCreateDeviceId())}</code></p>
                <p class="mt-1">Motor local: <strong>IndexedDB + Céntimos enteros</strong> · Portapapeles auto-limpia a los 60s.</p>
              </div>
            </div>

            <div class="bento-card p-5 rounded-2xl flex flex-col justify-between gap-4">
              <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    ${ico('shield', 'text-secondary text-[19px]')}
                    <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Consentimientos GDPR</h3>
                  </div>
                  <button onclick="openPrivacyPolicyModal()" class="text-xs font-bold text-primary hover:underline">Política clara</button>
                </div>

                <label class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 text-xs cursor-pointer">
                  <div>
                    <p class="font-bold text-on-surface">Sincronización en la nube</p>
                    <p class="text-[11px] text-on-surface-variant">Sincronizar movimientos con tu cuenta Cloud</p>
                  </div>
                  <input type="checkbox" ${consents.cloudSync ? 'checked' : ''} onchange="toggleConsentSetting('cloudSync', this.checked)" class="w-4 h-4 rounded text-primary"/>
                </label>

                <label class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 text-xs cursor-pointer">
                  <div>
                    <p class="font-bold text-on-surface">Avisos y recordatorios</p>
                    <p class="text-[11px] text-on-surface-variant">Alertas de vencimientos, devoluciones y copias</p>
                  </div>
                  <input type="checkbox" ${consents.notifications ? 'checked' : ''} onchange="toggleConsentSetting('notifications', this.checked)" class="w-4 h-4 rounded text-primary"/>
                </label>

                <label class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 text-xs cursor-pointer">
                  <div>
                    <p class="font-bold text-on-surface">Telemetría anónima de mejora</p>
                    <p class="text-[11px] text-on-surface-variant">Desactivada por defecto · Nunca importes ni comercios</p>
                  </div>
                  <input type="checkbox" ${consents.analytics ? 'checked' : ''} onchange="toggleConsentSetting('analytics', this.checked)" class="w-4 h-4 rounded text-primary"/>
                </label>

                ${auditRows.length > 0 ? `
                  <details class="rounded-xl bg-surface-container-low/70 border border-outline-variant/30 p-3 text-[11px]">
                    <summary class="font-extrabold text-on-surface-variant cursor-pointer">Registro de actividad local (${auditRows.length})</summary>
                    <div class="mt-2 flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                      ${auditRows.map(a => `<div class="flex justify-between gap-2"><span>${esc(a.action)} ${a.detail ? '· ' + esc(a.detail) : ''}</span><span class="text-outline font-mono">${new Date(a.timestamp).toLocaleDateString('es-ES')}</span></div>`).join('')}
                    </div>
                  </details>
                ` : ''}
              </div>

              <button onclick="openTotalDeletionModal()" class="w-full py-2.5 px-4 rounded-xl bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-extrabold text-xs flex items-center justify-center gap-2 transition active-scale">
                ${ico('delete_sweep', 'text-[17px]')}
                Solicitar borrado total de datos (7 días / inmediato)
              </button>
            </div>
          </div>`;
      } else if (activeAjustesSub === "bancos") {
        const conns = S.bankConnections || [];
        const inbox = S.pendingInbox || [];
        const alerts = typeof runSmartFinancialDetectors === 'function' ? runSmartFinancialDetectors() : [];
        const dismissedCount = (S.dismissedDetectors || []).length;

        subBodyHtml = `
          <div class="flex flex-col gap-4">
            <!-- Connected Banks PSD2 Panel -->
            <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="font-headline-sm text-base font-extrabold text-on-surface flex items-center gap-2">
                    ${ico('account_balance', 'text-primary text-[19px]')}
                    Conexión Bancaria PSD2 (Enable Banking)
                  </h3>
                  <p class="text-xs text-on-surface-variant">Saldo real y movimientos automáticos de solo lectura (sin depender de Apple Pay Shortcuts)</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  ${conns.length > 0 ? `
                    <button onclick="syncAllConnectedBanks()" class="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-extrabold inline-flex items-center gap-1.5 active-scale">
                      ${ico('sync', 'text-[15px] text-primary')} Sincronizar
                    </button>
                  ` : ''}
                  <button onclick="openConnectBankModal()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-extrabold inline-flex items-center gap-1.5 active-scale">
                    ${ico('add', 'text-[15px]')} Conectar banco
                  </button>
                </div>
              </div>

              ${conns.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  ${conns.map(c => {
                    const acc = (S.accounts || []).find(a => a.id === c.accountId);
                    const balCents = acc && typeof acc.syncedBalanceCents === 'number' ? acc.syncedBalanceCents : computeAccountBalanceCents(c.accountId);
                    const daysLeft = c.expiresAt ? Math.max(0, Math.ceil((c.expiresAt - Date.now()) / 86400000)) : 90;
                    return `
                      <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex flex-col gap-2.5">
                        <div class="flex items-start justify-between gap-2">
                          <div>
                            <div class="flex items-center gap-1.5">
                              <p class="text-sm font-extrabold text-on-surface">${esc(c.bankName)}</p>
                              <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${c.mode === 'live' ? 'bg-secondary/15 text-secondary' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}">${c.mode === 'live' ? 'PSD2 Real' : 'Sandbox'}</span>
                            </div>
                            <p class="text-[11px] text-on-surface-variant">${esc(c.ibanMasked || 'Cuenta bancaria')} · SCA válido ${daysLeft}d</p>
                          </div>
                          <span class="font-headline-sm text-base font-extrabold text-on-surface tabular-nums privacy-val">${fmt(Money.fromCents(balCents))}</span>
                        </div>
                        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/20 text-[11px]">
                          <span class="text-on-surface-variant">${c.lastSyncedAt ? `Últ. sync: ${new Date(c.lastSyncedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Pendiente de sync'}</span>
                          <div class="flex items-center gap-2">
                            <button onclick="syncBankConnection('${c.id}')" class="font-extrabold text-primary hover:underline">Sincronizar</button>
                            <button onclick="if(confirm('¿Desconectar ${esc(c.bankName)}? Se conservará tu historial importado.')) disconnectBankConnection('${c.id}', true)" class="font-bold text-tertiary hover:underline">Desconectar</button>
                          </div>
                        </div>
                      </div>`;
                  }).join('')}
                </div>
              ` : `
                <div class="p-5 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="text-xs">
                    <p class="font-extrabold text-on-surface">Conecta tu banco español en solo lectura (0 €/mes)</p>
                    <p class="text-on-surface-variant mt-0.5">BBVA, Santander, CaixaBank, ING, Revolut, N26, Sabadell, Openbank y más. También puedes probar el modo Sandbox al instante.</p>
                  </div>
                  <button onclick="openConnectBankModal()" class="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-extrabold flex-shrink-0 active-scale">Elegir mi banco →</button>
                </div>
              `}

              <!-- Pending Classification Inbox Bar -->
              <div class="p-3.5 rounded-2xl ${inbox.length > 0 ? 'bg-primary/8 border border-primary/25' : 'bg-surface-container-low border border-outline-variant/30'} flex flex-wrap items-center justify-between gap-2">
                <div class="text-xs">
                  <p class="font-extrabold text-on-surface">📥 Bandeja «Por clasificar»: ${inbox.length} pendiente(s)</p>
                  <p class="text-[11px] text-on-surface-variant">Comercios nuevos o con baja confianza esperan tu toque para crear regla automática.</p>
                </div>
                <button onclick="openPendingInboxModal()" class="px-3.5 py-2 rounded-xl ${inbox.length > 0 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface'} text-xs font-extrabold active-scale">
                  ${inbox.length > 0 ? `Clasificar (${inbox.length})` : 'Abrir bandeja'}
                </button>
              </div>
            </div>

            <!-- 7 Smart Financial Detectors -->
            <div class="bento-card p-5 rounded-2xl flex flex-col gap-3.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 class="font-headline-sm text-base font-extrabold text-on-surface flex items-center gap-2">
                    ${ico('auto_awesome', 'text-primary text-[19px]')}
                    Detectores Inteligentes (${alerts.length})
                  </h3>
                  <p class="text-xs text-on-surface-variant">Suscripciones, cobros duplicados &lt;48h, subidas de precio, gastos inusuales, nómina 50/30/20, comisiones y descubierto</p>
                </div>
                ${dismissedCount > 0 ? `
                  <button onclick="S.dismissedDetectors=[]; saveLocalState(true); renderAllViews(); showToast('Alertas restauradas ✓')" class="text-xs font-bold text-primary hover:underline">
                    Ver descartadas (${dismissedCount})
                  </button>
                ` : ''}
              </div>

              ${alerts.length > 0 ? `
                <div class="flex flex-col gap-2.5">
                  ${alerts.map(a => {
                    const cls = a.severity === 'high'
                      ? 'bg-tertiary/8 border-tertiary/30'
                      : a.severity === 'medium'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : a.severity === 'positive'
                          ? 'bg-secondary/10 border-secondary/30'
                          : 'bg-surface-container-low border-outline-variant/35';
                    return `
                      <div class="p-3.5 rounded-2xl border ${cls} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-start gap-2.5 min-w-0">
                          <span class="w-9 h-9 rounded-xl bg-surface-container-lowest border border-outline-variant/25 text-primary flex items-center justify-center flex-shrink-0">
                            ${ico(a.icon, 'text-[18px]')}
                          </span>
                          <div class="min-w-0">
                            <p class="text-xs font-extrabold text-on-surface">${esc(a.title)}</p>
                            <p class="text-[11px] text-on-surface-variant mt-0.5">${esc(a.body)}</p>
                          </div>
                        </div>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                          ${a.type === 'recurring_candidate' ? `
                            <button onclick="acceptDetectedSubscription('${a.id}', '${esc(a.merchant)}', ${a.amount_cents}, '${a.cat}', ${a.day})" class="px-3 py-1.5 rounded-xl bg-secondary text-white text-[11px] font-extrabold active-scale">Añadir fija</button>
                          ` : ''}
                          ${a.type === 'salary_503020' ? `
                            <button onclick="applySalary503020Plan('${a.id}', ${a.salary_cents})" class="px-3 py-1.5 rounded-xl bg-secondary text-white text-[11px] font-extrabold active-scale">Aplicar 50/30/20</button>
                          ` : ''}
                          <button onclick="dismissDetectorAlert('${a.id}')" class="px-2.5 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-[11px] font-bold active-scale">Entendido</button>
                        </div>
                      </div>`;
                  }).join('')}
                </div>
              ` : `
                <div class="py-8 text-center text-xs text-on-surface-variant">
                  ✨ Todo limpio: no se han detectado cobros duplicados, subidas silenciosas ni comisiones anómalas.
                </div>
              `}
            </div>
          </div>`;
      } else if (activeAjustesSub === "tickets") {
        const q = String(window.__ticketsSearchQ || '').trim().toLowerCase();
        const allReceipts = (S.receipts || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        const filtered = allReceipts.filter(r => {
          if (!q) return true;
          const totalStr = Money.fromCents(r.total_cents || 0).toFixed(2);
          return String(r.store_name || '').toLowerCase().includes(q)
            || String(r.date || '').includes(q)
            || totalStr.includes(q.replace(',', '.'))
            || (r.items || []).some(it => String(it.name || '').toLowerCase().includes(q));
        });
        const activeWarranties = allReceipts.filter(r => r.warranty_until && !r.returned && r.warranty_until >= todayStr());
        const voiceSyns = Object.entries(S.voiceSynonyms || {});

        subBodyHtml = `
          <div class="flex flex-col gap-4">
            <div class="bento-card p-5 rounded-2xl flex flex-col gap-3.5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="font-headline-sm text-base font-extrabold text-on-surface flex items-center gap-2">
                    ${ico('receipt_long', 'text-primary text-[19px]')}
                    Archivo de Tickets y Garantías (${allReceipts.length})
                  </h3>
                  <p class="text-xs text-on-surface-variant">${activeWarranties.length} garantía(s) activa(s) de 3 años · Búsqueda por comercio, fecha, importe o artículo</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <button onclick="openEnhancedReceiptScannerModal()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-extrabold inline-flex items-center gap-1.5 active-scale">
                    ${ico('photo_camera', 'text-[15px]')} Escanear ticket
                  </button>
                  <button onclick="openCompoundVoiceModal(true)" class="px-3.5 py-2 rounded-xl bg-tertiary/12 text-tertiary text-xs font-extrabold inline-flex items-center gap-1.5 active-scale">
                    ${ico('mic', 'text-[15px]')} Dictar voz
                  </button>
                  <button onclick="exportReceiptsArchiveHTML()" class="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold inline-flex items-center gap-1.5 active-scale">
                    ${ico('download', 'text-[15px]')} Exportar gestoría
                  </button>
                </div>
              </div>

              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">${ico('search', 'text-[17px]')}</span>
                <input type="search" value="${esc(window.__ticketsSearchQ || '')}" oninput="window.__ticketsSearchQ=this.value; renderAjustesView();" placeholder="Buscar comercio, producto, fecha (2026-11) o importe..." class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
              </div>

              ${filtered.length > 0 ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  ${filtered.map(r => {
                    const thumb = (r.images && r.images.length) ? r.images[0] : '';
                    return `
                      <button onclick="openReceiptDetailModal('${r.id}')" class="p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/35 text-left flex flex-col gap-2.5 transition active-scale">
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0">
                            <p class="text-xs font-extrabold text-on-surface truncate">${esc(r.store_name || 'Ticket')}</p>
                            <p class="text-[11px] text-on-surface-variant">${fmtDay(r.date || todayStr())} · ${(r.items || []).length} art.</p>
                          </div>
                          <span class="text-sm font-extrabold text-primary tabular-nums privacy-val flex-shrink-0">${fmt(Money.fromCents(r.total_cents || 0))}</span>
                        </div>
                        ${thumb ? `<img src="${thumb}" alt="Miniatura ticket" class="w-full h-24 object-cover rounded-xl border border-outline-variant/25"/>` : ''}
                        <div class="flex flex-wrap items-center gap-1.5">
                          ${r.warranty_until ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">🛡️ Hasta ${esc(r.warranty_until)}</span>` : ''}
                          ${r.returned ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">↩️ Devuelto</span>` : ''}
                          ${r.card_last4 ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">•••• ${esc(r.card_last4)}</span>` : ''}
                        </div>
                      </button>`;
                  }).join('')}
                </div>
              ` : `
                <div class="py-10 text-center flex flex-col items-center gap-2 text-on-surface-variant">
                  <span class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">${ico('photo_camera', 'text-[24px]')}</span>
                  <p class="text-xs font-extrabold text-on-surface">${allReceipts.length === 0 ? 'Aún no has escaneado ningún ticket' : 'Ningún ticket coincide con tu búsqueda'}</p>
                  <p class="text-[11px] max-w-xs">Haz foto a cualquier compra para desglosar sus artículos, repartirlos con amigos o guardar la garantía de 3 años.</p>
                </div>
              `}
            </div>

            <div class="bento-card p-4 rounded-2xl flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-extrabold text-on-surface flex items-center gap-1.5">
                  ${ico('mic', 'text-tertiary text-[16px]')}
                  Diccionario personal de voz (${voiceSyns.length}) &amp; últimos dictados (${(S.voiceHistory || []).length})
                </h4>
              </div>
              ${voiceSyns.length > 0 ? `
                <div class="flex flex-wrap gap-1.5">
                  ${voiceSyns.map(([kw, catId]) => `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low border border-outline-variant/35 text-[11px] font-bold text-on-surface">
                      «${esc(kw)}» → <span class="text-primary">${esc(catById(catId).name)}</span>
                      <button onclick="delete S.voiceSynonyms['${esc(kw)}']; saveLocalState(false); renderAjustesView()" class="text-outline hover:text-tertiary">×</button>
                    </span>
                  `).join('')}
                </div>
              ` : `<p class="text-[11px] text-on-surface-variant">Cuando corrijas la categoría de un dictado por voz (ej. «gasofa» → Transporte), la app lo aprenderá automáticamente para ti.</p>`}
            </div>
          </div>`;
      } else {
        // 'datos': Full Export (CSV tables, JSON v2, Multi-Sheet Excel, PDF Report), Smart CSV Importer & 30d Trash
        const lastBackupText = S?.settings?.lastBackupAt
          ? `Última copia: ${new Date(S.settings.lastBackupAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : 'Aún no has descargado ninguna copia local';

        subBodyHtml = `
          <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div class="md:col-span-6 bento-card p-5 rounded-2xl flex flex-col gap-3">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Exportación total (los datos son tuyos)</h3>
                <p class="text-xs text-on-surface-variant mt-0.5">${esc(lastBackupText)}</p>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button onclick="exportFullExcelWorkbook()" class="py-2.5 px-3 rounded-xl bg-primary text-on-primary font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs active-scale">
                  ${ico('table_view', 'text-[16px]')} Excel multi-hoja
                </button>
                <button onclick="exportBackupJSON()" class="py-2.5 px-3 rounded-xl bg-secondary text-on-secondary font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs active-scale">
                  ${ico('download', 'text-[16px]')} Backup JSON v2
                </button>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button onclick="exportPrintablePDFReport('month')" class="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 active-scale">
                  ${ico('receipt_long', 'text-[15px] text-primary')} PDF Mensual
                </button>
                <button onclick="exportPrintablePDFReport('year')" class="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 active-scale">
                  ${ico('calendar_month', 'text-[15px] text-primary')} PDF Anual
                </button>
              </div>

              <div class="grid grid-cols-3 gap-1.5">
                <button onclick="exportMovementsCSV()" class="py-2 px-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-[11px] transition">CSV Movim.</button>
                <button onclick="exportDebtsCSV()" class="py-2 px-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-[11px] transition">CSV Deudas</button>
                <button onclick="exportBudgetsCSV()" class="py-2 px-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-[11px] transition">CSV Presup.</button>
              </div>

              <div class="pt-2 border-t border-outline-variant/25 flex flex-col gap-2">
                <p class="text-[11px] font-extrabold uppercase text-on-surface-variant">Importar datos</p>
                <button onclick="openCSVImporterModal()" class="w-full py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/18 text-primary font-extrabold text-xs flex items-center justify-center gap-2 transition active-scale">
                  ${ico('upload_file', 'text-[17px]')}
                  Importar CSV de Banco / Fintonic / Splitwise (con deduplicación)
                </button>
                <label class="w-full py-2.5 px-4 rounded-xl border border-dashed border-outline-variant hover:bg-surface-container-low text-on-surface font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition">
                  ${ico('upload_file', 'text-[16px]')}
                  Restaurar Copia JSON
                  <input type="file" accept=".json,application/json" onchange="importBackupJSON(this)" class="hidden"/>
                </label>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-1">
                <button onclick="seedDemoForCurrentUser()" class="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-bold text-[11px] transition">Cargar ejemplo</button>
                <button onclick="resetLocalPersonalData()" class="py-2 px-3 rounded-xl bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-extrabold text-[11px] transition">Limpiar movim.</button>
              </div>
            </div>

            <!-- 30-Day Recoverable Trash -->
            <div class="md:col-span-6 bento-card p-5 rounded-2xl flex flex-col gap-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="font-headline-sm text-base font-extrabold text-on-surface flex items-center gap-1.5">
                    ${ico('delete', 'text-[18px] text-on-surface-variant')}
                    Papelera (${trashCount})
                  </h3>
                  <p class="text-xs text-on-surface-variant">Recuperables durante 30 días tras borrar</p>
                </div>
                ${trashCount > 0 ? `<button onclick="emptyTrash()" class="px-3 py-1.5 rounded-xl bg-tertiary/10 text-tertiary text-xs font-extrabold hover:bg-tertiary/20 transition">Vaciar</button>` : ''}
              </div>

              <div class="divide-y divide-outline-variant/20 max-h-80 overflow-y-auto">
                ${(S.trash || []).map(t => {
                  const isExp = t.kind === 'exp';
                  const title = isExp ? cleanNoteText(t.item?.note, catById(t.item?.cat).name) : (t.item?.source || 'Ingreso');
                  return `
                    <div class="py-2.5 flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-xs font-extrabold text-on-surface truncate">${esc(title)}</p>
                        <p class="text-[11px] text-on-surface-variant">${fmtDay(t.item?.date || todayStr())} • ${isExp ? 'Gasto' : 'Ingreso'}</p>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-xs font-extrabold tabular-nums privacy-val ${isExp ? 'text-on-surface' : 'text-secondary'}">${isExp ? '−' : '+'}${fmt(t.item?.amount || 0)}</span>
                        <button onclick="restoreFromTrash('${t.trashId}')" class="px-2.5 py-1 rounded-lg bg-primary/12 text-primary text-[11px] font-extrabold hover:bg-primary/20 transition">Restaurar</button>
                      </div>
                    </div>`;
                }).join('') || `
                  <div class="py-8 text-center text-xs text-on-surface-variant">
                    La papelera está vacía. Si borras un movimiento por error, aparecerá aquí durante 30 días.
                  </div>
                `}
              </div>
            </div>
          </div>`;
      }

      el.innerHTML = `
        ${deletionWarningBanner}
        ${profileBannerHtml}
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          ${navCardsHtml}
        </div>
        ${subBodyHtml}
      `;
    }
