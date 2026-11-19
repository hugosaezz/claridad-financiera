    // ============================================================================
    // 13. VIEW 5: PLANIFICACIÓN, OBJETIVOS, VIAJES & CUENTA CLOUD
    // ============================================================================
    function renderAjustesView() {
      const el = $('#view-ajustes');
      if (!el) return;

      const userName = currentLoggedUserName();
      const recSum = (S.recurring || []).reduce((a, r) => a + Number(r.amount || 0), 0);
      const refunds = (S.expenses || []).filter(e => e.refund);

      const modules = [
        { id: "ingresos", label: "Nómina e Ingresos", icon: "payments", badge: fmt0(monthIncomeTotal(viewMk)) },
        { id: "pres",     label: "Presupuestos & ↻",  icon: "track_changes", badge: fmt0(totalMonthlyBudget()) },
        { id: "rec",      label: "Suscripciones",     icon: "autorenew", badge: `${fmt0(recSum)}/mes` },
        { id: "obj",      label: "Objetivos Ahorro",  icon: "emoji_events", badge: `${(S.goals || []).length}` },
        { id: "viajes",   label: "Modo Viaje",        icon: "flight_takeoff", badge: `${(S.trips || []).length}` },
        { id: "reglas",   label: "Reglas & Categorías", icon: "auto_fix_high", badge: `${(S.rules || []).length}` },
        { id: "devol",    label: "Devoluciones",      icon: "assignment_return", badge: `${refunds.length}` },
        { id: "cloud",    label: "Mi Cuenta & BD Cloud", icon: "cloud_sync", badge: userName }
      ];

      if (!activeAjustesSub) activeAjustesSub = "ingresos";

      const navCardsHtml = modules.map(m => {
        const active = activeAjustesSub === m.id;
        return `
          <button onclick="activeAjustesSub='${m.id}'; renderAjustesView()" class="p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 active-scale ${active ? 'bg-primary text-on-primary border-primary shadow-sm' : 'bento-card text-on-surface hover:bg-surface-container-low'}">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="material-symbols-outlined text-[20px] ${active ? 'text-on-primary' : 'text-primary'}">${m.icon}</span>
              <span class="font-label-md text-xs font-extrabold truncate">${esc(m.label)}</span>
            </div>
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'}">${esc(m.badge)}</span>
          </button>`;
      }).join('');

      let subBodyHtml = '';

      if (activeAjustesSub === "ingresos") {
        const st = S.settings;
        const rows = incomeRows(viewMk);
        subBodyHtml = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-secondary">account_balance_wallet</span>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Nómina Mensual de ${esc(userName)}</h3>
              </div>
              <div class="flex items-center justify-between gap-3">
                <label class="text-xs font-bold text-on-surface-variant">Importe neto mensual (€)</label>
                <input type="number" step="10" value="${st.salary || 0}" onchange="updateSalarySettings(this.value, null, null)" class="w-32 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-right font-extrabold text-sm text-on-surface"/>
              </div>
              <div class="flex items-center justify-between gap-3">
                <label class="text-xs font-bold text-on-surface-variant">Día de cobro (1 - 28)</label>
                <input type="number" min="1" max="28" value="${st.salaryDay || 1}" onchange="updateSalarySettings(null, this.value, null)" class="w-24 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-right font-extrabold text-sm text-on-surface"/>
              </div>
              <div class="flex items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
                <div>
                  <p class="text-xs font-bold text-on-surface">Sumar nómina automáticamente cada mes</p>
                  <p class="text-[11px] text-on-surface-variant">Se añade al cálculo de «Puedes gastar» y ahorro</p>
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
                      <span class="font-headline-sm text-sm font-extrabold text-secondary tabular-nums">+${fmt(r.amount)}</span>
                      ${!r.auto ? `<button onclick="deleteTx('inc','${r.id}')" class="text-outline hover:text-error"><span class="material-symbols-outlined text-[18px]">delete</span></button>` : ''}
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
              <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary">Total presupuestado: ${fmt0(totalMonthlyBudget())}</span>
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
                          <span class="material-symbols-outlined text-[18px]">${c.icon}</span>
                        </span>
                        <div>
                          <p class="font-label-lg text-sm font-bold text-on-surface">${esc(c.name)}</p>
                          ${carried ? `<span class="text-[10px] font-bold text-primary">Incluye ${fmtSigned(carried)} arrastrados</span>` : ''}
                        </div>
                      </div>
                      <span class="text-xs font-extrabold tabular-nums">${fmt0(s)} / ${fmt0(effB)}</span>
                    </div>
                    <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                      <div class="h-full rounded-full ${pct >= 100 ? 'bg-tertiary' : pct >= 80 ? 'bg-amber-500' : 'bg-secondary'}" style="width:${pct}%"></div>
                    </div>
                    <div class="flex items-center justify-between gap-2 pt-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[11px] font-bold text-on-surface-variant">Límite €:</span>
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
                <p class="text-xs text-on-surface-variant">Coste mensual: <strong>${fmt(recSum)}/mes</strong> • Coste anual: <strong>${fmt0(recSum * 12)}/año</strong></p>
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
                        <span class="material-symbols-outlined text-[20px]">${c.icon}</span>
                      </span>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                          <p class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(r.name)}</p>
                          ${r.autoCharge !== false ? `<span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary">Auto-cobro</span>` : ''}
                        </div>
                        <p class="text-xs text-on-surface-variant">${esc(c.name)} • Día ${r.day || '—'} de cada mes • ${paid ? '<span class="text-secondary font-bold">Sumado este mes ✓</span>' : '<span class="text-amber-600 font-bold">Pendiente este mes</span>'}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span class="font-headline-sm text-sm font-extrabold text-on-surface tabular-nums">${fmt(r.amount)}</span>
                      <button onclick="deleteRecurring('${r.id}')" class="p-1 text-outline hover:text-error"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  </div>`;
              }).join('') || `<p class="text-xs text-on-surface-variant py-6 text-center col-span-2">Sin suscripciones registradas.</p>`}
            </div>
          </div>`;
      } else if (activeAjustesSub === "obj") {
        subBodyHtml = `
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Objetivos y Metas de Ahorro</h3>
                <p class="text-xs text-on-surface-variant">Reserva mensual recomendada: ${fmt(goalsReserve())}/mes</p>
              </div>
              <button onclick="openNewGoalModal()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition active-scale">
                + Nuevo Objetivo
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              ${(S.goals || []).map(g => {
                const pct = Math.min(100, g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0);
                return `
                  <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2.5">
                    <div class="flex items-center justify-between">
                      <h4 class="font-label-lg text-base font-extrabold text-on-surface">${esc(g.name)}</h4>
                      <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full ${pct >= 100 ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'}">${pct}%</span>
                    </div>
                    <div class="flex items-baseline justify-between text-xs">
                      <span class="font-extrabold text-on-surface tabular-nums">${fmt(g.saved)} <span class="font-normal text-on-surface-variant">de ${fmt(g.target)}</span></span>
                      ${g.deadline ? `<span class="text-outline">Meta: ${fmtDay(g.deadline)}</span>` : ''}
                    </div>
                    <div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div class="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style="width:${pct}%"></div>
                    </div>
                    <div class="flex items-center gap-2 pt-1">
                      <button onclick="openGoalMoveModal('${g.id}', 1)" class="flex-1 py-1.5 rounded-xl bg-secondary/15 text-secondary font-bold text-xs hover:bg-secondary/25 transition">+ Aportar</button>
                      <button onclick="openGoalMoveModal('${g.id}', -1)" class="flex-1 py-1.5 rounded-xl bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition">− Retirar</button>
                      <button onclick="deleteGoal('${g.id}')" class="p-1.5 text-outline hover:text-error"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  </div>`;
              }).join('') || `<p class="text-xs text-on-surface-variant py-6 text-center col-span-2">No tienes objetivos de ahorro todavía.</p>`}
            </div>
          </div>`;
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
                    <div class="flex justify-between text-xs font-extrabold tabular-nums">
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
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Reglas Inteligentes &amp; Atajo Apple Pay</h3>
                <button onclick="openIOSDownloadModal()" class="px-3 py-1.5 rounded-xl bg-secondary/15 text-secondary text-xs font-extrabold hover:bg-secondary/25 transition flex items-center gap-1">
                  <span class="material-symbols-outlined text-[15px]">contactless</span>
                  Configurar Atajo iOS
                </button>
              </div>
              <p class="text-xs text-on-surface-variant">Cuando pagues con Apple Pay en tu iPhone (tanto si el atajo abre la app <code>.ipa</code> con <code>claridad://pay?add=...</code> como la web con <code>?add=...&amp;desc=...</code>), se sumará el gasto a tu cuenta y se categorizará solo.</p>
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
                    <button onclick="deleteSmartRule('${r.id}')" class="text-outline hover:text-error"><span class="material-symbols-outlined text-[16px]">delete</span></button>
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
                          <span class="material-symbols-outlined text-[16px]">${c.icon}</span>
                        </span>
                        <span class="text-xs font-bold text-on-surface truncate">${esc(c.name)}</span>
                      </div>
                      ${isCustom ? `<button onclick="deleteCustomCategory('${c.id}')" class="text-outline hover:text-error"><span class="material-symbols-outlined text-[16px]">close</span></button>` : ''}
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
              <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-800">${fmt(sumExp(refunds))} pendientes</span>
            </div>
            <div class="divide-y divide-outline-variant/20">
              ${refunds.map(e => `
                <div class="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p class="font-label-lg text-sm font-bold text-on-surface">${esc(cleanNoteText(e.note, catById(e.cat).name))}</p>
                    <p class="text-xs text-on-surface-variant">${fmtDay(e.date)} • ${esc(catById(e.cat).name)}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="font-headline-sm text-sm font-extrabold text-on-surface tabular-nums">${fmt(e.amount)}</span>
                    <button onclick="markExpenseRefunded('${e.id}')" class="px-3 py-1.5 rounded-xl bg-secondary/15 text-secondary font-bold text-xs hover:bg-secondary/25 transition">✓ Ya devuelto</button>
                  </div>
                </div>
              `).join('') || `<p class="text-xs text-on-surface-variant py-6 text-center">No tienes devoluciones pendientes.</p>`}
            </div>
          </div>`;
      } else {
        // 'cloud': Mi Cuenta Multi-Usuario, Usuarios Cloud Supabase & Esquema SQL
        subBodyHtml = `
          <!-- Active User Cloud Profile Card -->
          <div class="bento-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-secondary">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-primary text-on-primary font-extrabold text-lg flex items-center justify-center">
                ${isAdmin ? '👑' : initials(userName)}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Cuenta activa: ${esc(userName)} (ID #${loggedUserId || 'Invitado'})</h3>
                  <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">☁️ Registro Propio en Supabase</span>
                </div>
                <p class="text-xs text-on-surface-variant mt-0.5">
                  Tienes ${(S.expenses || []).length} gastos, ${(S.incomes || []).length} ingresos y ${(S.debts || []).length} cuentas P2P guardados en tu perfil personal.
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="syncUserPersonalDataToCloud().then(()=>showToast('Datos guardados en Supabase Cloud ✓'))" class="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:opacity-95 transition active-scale">
                ☁️ Guardar en Nube ahora
              </button>
              <button onclick="openProfileOrLogin()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition active-scale">
                Cambiar o Crear Usuario
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div class="md:col-span-7 bento-card p-5 rounded-2xl flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Usuarios Registrados en Supabase (${sbGlobalUsers.length})</h3>
                  <p class="text-xs text-on-surface-variant">Cada usuario tiene su propio registro de Control Mensual y Deudas</p>
                </div>
                <button onclick="openProfileOrLogin(true)" class="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold">+ Registrar Usuario</button>
              </div>

              ${isAdmin ? `
                <div class="overflow-x-auto rounded-xl border border-outline-variant/30 max-h-80 overflow-y-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-surface-container-low text-on-surface-variant uppercase font-extrabold border-b border-outline-variant/30 sticky top-0">
                      <tr>
                        <th class="px-3 py-2.5">ID</th>
                        <th class="px-3 py-2.5">Nombre</th>
                        <th class="px-3 py-2.5">PIN</th>
                        <th class="px-3 py-2.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-outline-variant/20">
                      ${sbGlobalUsers.map(u => `
                        <tr class="hover:bg-surface-container-low/50 ${Number(u.id) === Number(loggedUserId) ? 'bg-primary/5' : ''}">
                          <td class="px-3 py-2.5 font-mono text-outline">#${u.id}</td>
                          <td class="px-3 py-2.5 font-bold text-on-surface">
                            ${u.nombre.toLowerCase() === 'hugo' ? '👑 ' : ''}${esc(u.nombre)}
                            ${Number(u.id) === Number(loggedUserId) ? '<span class="ml-1 text-[10px] text-primary font-extrabold">(Activo)</span>' : ''}
                          </td>
                          <td class="px-3 py-2.5">
                            <span class="font-mono font-bold px-2 py-0.5 rounded bg-surface-container text-on-surface">${esc(u.password || '0000')}</span>
                          </td>
                          <td class="px-3 py-2.5 text-right space-x-1">
                            <button onclick="quickSwitchToUser(${u.id})" class="px-2 py-1 rounded-lg bg-secondary/10 text-secondary font-bold hover:bg-secondary/20" title="Entrar como este usuario">Entrar</button>
                            <button onclick="editSupabaseUserAdmin(${u.id})" class="px-2 py-1 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20">Editar</button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : `
                <div class="p-4 rounded-xl bg-surface-container-low text-xs text-on-surface-variant">
                  Estás conectado con tu cuenta personal (<strong>${esc(userName)}</strong>). Solo el administrador global (Hugo) puede ver los PINs del resto de usuarios.
                </div>
              `}

              <!-- SQL Schema Upgrade Helper -->
              <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2 mt-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-extrabold text-on-surface flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-primary text-[17px]">database</span>
                    Esquema Base de Datos Supabase
                  </span>
                  <button onclick="copySupabaseMigrationSQL()" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-container transition">
                    Copiar SQL de Columnas
                  </button>
                </div>
                <p class="text-[11px] text-on-surface-variant leading-relaxed">
                  La sincronización multi-usuario en la nube <strong>ya está activa y funcionando</strong> automáticamente en Supabase. Además, tienes el archivo <code>supabase_migration.sql</code> por si deseas añadir las columnas nativas (<code>datos_personales JSONB</code>, <code>telefono_bizum</code>, <code>acreedor_id</code>) en el SQL Editor de Supabase.
                </p>
              </div>
            </div>

            <div class="md:col-span-5 bento-card p-5 rounded-2xl flex flex-col gap-3">
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Exportación y Copia de ${esc(userName)}</h3>
              <p class="text-xs text-on-surface-variant">Descarga los datos de tu cuenta en Excel/CSV o guarda un backup JSON.</p>

              <button onclick="exportMovementsCSV()" class="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-2 transition">
                <span class="material-symbols-outlined text-[18px] text-primary">table_view</span>
                Exportar Movimientos (CSV)
              </button>

              <button onclick="exportBackupJSON()" class="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-2 transition">
                <span class="material-symbols-outlined text-[18px] text-secondary">download</span>
                Descargar Copia de mi Cuenta (JSON)
              </button>

              <label class="w-full py-2.5 px-4 rounded-xl border border-dashed border-primary/40 hover:bg-primary/5 text-primary font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition">
                <span class="material-symbols-outlined text-[18px]">upload_file</span>
                Restaurar Copia de Seguridad (JSON)
                <input type="file" accept=".json,application/json" onchange="importBackupJSON(this)" class="hidden"/>
              </label>

              <button onclick="seedDemoForCurrentUser()" class="w-full py-2.5 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-bold text-xs flex items-center justify-center gap-2 transition">
                <span class="material-symbols-outlined text-[18px]">auto_fix_high</span>
                Cargar Datos de Ejemplo en esta Cuenta
              </button>

              <button onclick="resetLocalPersonalData()" class="mt-1 w-full py-2.5 px-4 rounded-xl bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-extrabold text-xs flex items-center justify-center gap-2 transition active-scale" title="Borra únicamente los gastos, ingresos y datos de prueba del Control Mensual sin tocar la base de datos de Deudas">
                <span class="material-symbols-outlined text-[18px]">delete_sweep</span>
                Borrar datos de Control Mensual
              </button>
            </div>
          </div>`;
      }

      el.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          ${navCardsHtml}
        </div>
        ${subBodyHtml}
      `;
    }
