    // ============================================================================
    // 8. NAVIGATION, PERIOD & VIEW RENDERER ORCHESTRATION
    // ============================================================================
    function switchMainView(viewName, subTab = null) {
      // Guest guard: unauthenticated visitors can ONLY view Deudas -> Grupo General
      if (!loggedUserId && viewName !== 'cuentas') {
        activeMainView = 'cuentas';
        activeP2PTab = 'cloud';
        renderAllViews();
        showToast("🔒 Inicia sesión con tu usuario y PIN para acceder a tu Control Mensual");
        openProfileOrLogin();
        return;
      }
      if (!loggedUserId) {
        viewName = 'cuentas';
        activeP2PTab = 'cloud';
      }
      activeMainView = viewName;
      ['inicio', 'gastos', 'cuentas', 'analitica', 'ajustes'].forEach(v => {
        const container = $('#view-' + v);
        if (container) {
          if (v === viewName) {
            container.classList.remove('hidden');
            container.classList.add('flex');
          } else {
            container.classList.add('hidden');
            container.classList.remove('flex');
          }
        }
      });

      // Update floating dock tabs (inicio and gastos both map to 'nav-inicio')
      const activeNavKey = !loggedUserId ? 'cuentas' : (viewName === 'gastos') ? 'inicio' : viewName;
      ['inicio', 'cuentas', 'analitica', 'ajustes'].forEach(k => {
        const navBtn = $('#nav-' + k);
        if (!navBtn) return;
        const iconSpan = navBtn.querySelector('.material-symbols-outlined');
        const pillSpan = navBtn.querySelector('.nav-pill');
        const isActive = (k === activeNavKey);
        const isGuestLocked = !loggedUserId && k !== 'cuentas';
        navBtn.className = isActive
          ? "nav-tab flex flex-col items-center justify-center text-primary font-extrabold gap-0.5 py-1.5 rounded-2xl transition-all active-scale"
          : `nav-tab flex flex-col items-center justify-center text-on-surface-variant font-bold gap-0.5 py-1.5 rounded-2xl hover:text-primary transition-all active-scale relative ${isGuestLocked ? 'opacity-55' : ''}`;
        if (iconSpan) iconSpan.classList.toggle('filled', isActive);
        if (pillSpan) {
          pillSpan.className = isActive
            ? "nav-pill px-3 py-1 rounded-full bg-primary/15 flex items-center justify-center transition-all"
            : "nav-pill px-3 py-1 rounded-full flex items-center justify-center transition-all";
        }
      });

      // Hide monthly period filter bar when inside Deudas ('cuentas') so Deudas is a completely separate workspace
      const periodBar = $('#period-filter-bar');
      if (periodBar) {
        if (viewName === 'cuentas') {
          periodBar.classList.add('hidden');
          periodBar.classList.remove('flex');
        } else {
          periodBar.classList.remove('hidden');
          periodBar.classList.add('flex');
        }
      }

      if (viewName === 'cuentas' && subTab) activeP2PTab = subTab;
      if (viewName === 'ajustes' && subTab !== null) activeAjustesSub = subTab;
      renderAllViews();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function shiftMonth(delta) {
      const p = viewMk.split('-');
      const dt = new Date(+p[0], +p[1] - 1 + delta, 1);
      viewMk = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
      renderAllViews();
    }

    function resetToCurrentMonth() {
      viewMk = monthKey(todayStr());
      renderAllViews();
    }

    function renderPeriodBar() {
      const lbl = $('#period-label');
      if (lbl) lbl.textContent = monthLabel(viewMk);
      const streak = currentStreak();
      if (streak > (S.streak.best || 0)) {
        S.streak.best = streak;
        saveLocalState(false);
      }
      const sp = $('#streak-pill');
      if (sp) sp.textContent = `🔥 ${streak} día${streak === 1 ? '' : 's'} sin gastar`;
      const btnToday = $('#btn-period-today');
      if (btnToday) {
        const isCurrent = viewMk === monthKey(todayStr());
        btnToday.textContent = isCurrent ? "Actual" : "Ir a Hoy";
        btnToday.className = isCurrent
          ? "font-label-md text-xs text-on-surface-variant px-2 py-0.5 rounded-md font-semibold"
          : "font-label-md text-xs bg-primary text-on-primary px-2.5 py-0.5 rounded-lg font-bold shadow-xs";
      }
    }

    function renderAllViews() {
      if (!loggedUserId) {
        activeMainView = 'cuentas';
        activeP2PTab = 'cloud';
      }
      ['inicio', 'gastos', 'cuentas', 'analitica', 'ajustes'].forEach(v => {
        const container = $('#view-' + v);
        if (container) {
          if (v === activeMainView) {
            container.classList.remove('hidden');
            container.classList.add('flex');
          } else {
            container.classList.add('hidden');
            container.classList.remove('flex');
          }
        }
      });
      const periodBar = $('#period-filter-bar');
      if (periodBar) {
        if (activeMainView === 'cuentas') {
          periodBar.classList.add('hidden');
          periodBar.classList.remove('flex');
        } else {
          periodBar.classList.remove('hidden');
          periodBar.classList.add('flex');
        }
      }
      // Ensure bottom nav visual state matches activeMainView
      const activeNavKey = !loggedUserId ? 'cuentas' : (activeMainView === 'gastos') ? 'inicio' : activeMainView;
      ['inicio', 'cuentas', 'analitica', 'ajustes'].forEach(k => {
        const navBtn = $('#nav-' + k);
        if (!navBtn) return;
        const iconSpan = navBtn.querySelector('.material-symbols-outlined');
        const pillSpan = navBtn.querySelector('.nav-pill');
        const isActive = (k === activeNavKey);
        const isGuestLocked = !loggedUserId && k !== 'cuentas';
        navBtn.className = isActive
          ? "nav-tab flex flex-col items-center justify-center text-primary font-extrabold gap-0.5 py-1.5 rounded-2xl transition-all active-scale"
          : `nav-tab flex flex-col items-center justify-center text-on-surface-variant font-bold gap-0.5 py-1.5 rounded-2xl hover:text-primary transition-all active-scale relative ${isGuestLocked ? 'opacity-55' : ''}`;
        if (iconSpan) iconSpan.classList.toggle('filled', isActive);
        if (pillSpan) {
          pillSpan.className = isActive
            ? "nav-pill px-3 py-1 rounded-full bg-primary/15 flex items-center justify-center transition-all"
            : "nav-pill px-3 py-1 rounded-full flex items-center justify-center transition-all";
        }
      });

      ensureCarried();
      renderPeriodBar();
      updateCloudHeaderUI();
      if (activeMainView === 'inicio') renderInicioView();
      if (activeMainView === 'cuentas') renderCuentasView();
      if (activeMainView === 'gastos') renderGastosView();
      if (activeMainView === 'analitica') renderAnaliticaView();
      if (activeMainView === 'ajustes') renderAjustesView();
    }

    // ============================================================================
    // 9. VIEW 1: CONTROL MENSUAL (100% Personal Monthly Finances — Separated from Debts)
    // ============================================================================
    function renderCategoryDonutSVG(cats, totalExp) {
      const R = 36, C = 2 * Math.PI * R;
      if (!(totalExp > 0) || !cats || cats.length === 0) {
        return `
          <svg width="96" height="96" viewBox="0 0 96 96" class="flex-shrink-0">
            <circle cx="48" cy="48" r="${R}" fill="none" stroke="currentColor" class="text-surface-container-high" stroke-width="11"/>
            <text x="48" y="46" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor" class="text-on-surface">0 €</text>
            <text x="48" y="59" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor" class="text-outline">MES LIMPIO</text>
          </svg>`;
      }
      let offset = 0;
      const circles = cats.slice(0, 6).map(d => {
        const c = catById(d.cat);
        const len = Math.max(2, (d.total / totalExp) * C);
        const seg = `<circle cx="48" cy="48" r="${R}" fill="none" stroke="${c.c}" stroke-width="11" stroke-dasharray="${len.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 48 48)"/>`;
        offset += (d.total / totalExp) * C;
        return seg;
      }).join('');
      const topCat = catById(cats[0].cat);
      const topPct = Math.round((cats[0].total / totalExp) * 100);
      return `
        <svg width="96" height="96" viewBox="0 0 96 96" class="flex-shrink-0">
          <circle cx="48" cy="48" r="${R}" fill="none" stroke="currentColor" class="text-surface-container-high" stroke-width="11"/>
          ${circles}
          <text x="48" y="46" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor" class="text-on-surface">${topPct}%</text>
          <text x="48" y="59" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor" class="text-on-surface-variant">${esc(topCat.name.slice(0, 9))}</text>
        </svg>`;
    }

    function renderDateGroupedTransactionsHtml(mixedRows) {
      if (!mixedRows || mixedRows.length === 0) return '';
      const groups = [];
      const map = {};
      mixedRows.forEach(item => {
        const d = item.date || todayStr();
        if (!map[d]) {
          map[d] = { date: d, items: [], expSum: 0, incSum: 0 };
          groups.push(map[d]);
        }
        map[d].items.push(item);
        if (item._k === 'exp') map[d].expSum += Number(item.amount || 0);
        else map[d].incSum += Number(item.amount || 0);
      });

      return groups.map(g => {
        const netDay = g.incSum - g.expSum;
        const dayHeaderRight = g.expSum > 0 && g.incSum === 0
          ? `−${fmt(g.expSum)}`
          : g.incSum > 0 && g.expSum === 0
            ? `+${fmt(g.incSum)}`
            : fmtSigned(netDay);

        const rows = g.items.map(x => {
          if (x._k === 'exp') return renderExpenseRow(x);
          const ic = incById(x.cat);
          return `
            <div ${x.auto ? `onclick="switchMainView('ajustes','ingresos')"` : `onclick="openTxModal('inc', '${x.id}')"`} class="p-3.5 flex items-center justify-between hover:bg-surface-container-low/60 transition cursor-pointer gap-2">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-[20px]">${ic.icon}</span>
                </div>
                <div class="min-w-0">
                  <p class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(x.source || ic.name)}</p>
                  <p class="font-body-sm text-xs text-on-surface-variant">${x.auto ? 'Nómina automática mensual' : esc(ic.name)}${x.note ? ' • ' + esc(x.note) : ''}</p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="font-headline-sm text-[15px] font-extrabold text-secondary tabular-nums privacy-val">+${fmt(x.amount)}</span>
                <p class="font-label-sm text-[10px] text-secondary uppercase">Ingreso</p>
              </div>
            </div>`;
        }).join('');

        return `
          <div class="flex flex-col">
            <div class="px-4 py-2 bg-surface-container-low/90 border-y border-outline-variant/25 flex items-center justify-between">
              <span class="font-label-sm text-[10px] font-extrabold tracking-wider text-on-surface-variant uppercase">${esc(fmtRelativeDateHeader(g.date))}</span>
              <span class="font-label-sm text-[11px] font-extrabold tabular-nums privacy-val ${g.expSum > g.incSum ? 'text-on-surface-variant' : 'text-secondary'}">${dayHeaderRight}</span>
            </div>
            <div class="divide-y divide-outline-variant/20">
              ${rows}
            </div>
          </div>`;
      }).join('');
    }

    function renderInicioView() {
      const el = $('#view-inicio');
      if (!el) return;

      const userName = currentLoggedUserName();
      const exps = monthExpenses(viewMk).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.ts || 0) - (a.ts || 0));
      const incs = incomeRows(viewMk);
      const totalExp = sumExp(exps);
      const totalInc = monthIncomeTotal(viewMk);
      const netMonth = totalInc - totalExp;
      const savingsRate = totalInc > 0 ? Math.round(((totalInc - totalExp) / totalInc) * 100) : 0;
      const budgetTotal = totalMonthlyBudget();
      const budgetPct = budgetTotal > 0 ? Math.min(100, Math.round((totalExp / budgetTotal) * 100)) : 0;
      const budgetRest = budgetTotal - totalExp;
      const safe = safeToSpend(viewMk);
      const upRecList = upcomingRecurring(viewMk);
      const upRecTotal = upcomingRecurringTotal(viewMk);
      const reserveGoals = goalsReserve();
      const scoreObj = finScore(viewMk);
      const fc = forecast(viewMk);
      const cats = byCat(exps);

      // Month-over-Month Trend Comparison
      const pMk = prevMonthKey(viewMk);
      const prevExp = sumExp(monthExpenses(pMk));
      const expDeltaPct = prevExp > 0 ? Math.round(((totalExp - prevExp) / prevExp) * 100) : null;

      // Copilot Money-style Daily Pace Calculation
      const [Y, M] = viewMk.split('-').map(Number);
      const isCurMonth = viewMk === monthKey(todayStr());
      const daysInMonth = new Date(Y, M, 0).getDate();
      const currentDay = isCurMonth ? new Date().getDate() : daysInMonth;
      const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
      const dailySafeAllowance = Math.max(0, safe / daysRemaining);
      const elapsedMonthPct = Math.min(100, Math.round((currentDay / daysInMonth) * 100));
      const expectedSpendByToday = budgetTotal > 0 ? (budgetTotal * (currentDay / daysInMonth)) : 0;
      const paceDiff = expectedSpendByToday - totalExp;
      const isPaceGood = totalExp <= expectedSpendByToday + 0.01;

      const syncTimeText = lastCloudSyncTime
        ? lastCloudSyncTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : 'En vivo';

      // Top Monthly Control Bar
      const monthlyTopNavHtml = `
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center bg-surface-container/90 p-1 rounded-2xl border border-outline-variant/30 gap-1">
            <button onclick="haptic('selection'); switchMainView('inicio')" class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-surface-container-lowest text-primary shadow-xs transition flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">dashboard</span>
              Resumen
            </button>
            <button onclick="haptic('selection'); switchMainView('gastos')" class="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface transition flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">receipt_long</span>
              Movimientos (${exps.length + incs.length})
            </button>
          </div>
          <button onclick="haptic('medium'); cargarDatosSupabase(true)" class="px-3 py-1.5 rounded-full bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/45 flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant shadow-xs transition active-scale" title="Actualizar desde Supabase">
            <span class="w-2 h-2 rounded-full ${sbConnected ? 'bg-secondary animate-pulse' : 'bg-amber-500'}"></span>
            <span>BD ${esc(userName)} · ${esc(syncTimeText)}</span>
          </button>
        </div>
      `;

      // Welcome onboarding banner if account is clean at 0 €
      const isFreshAccount = (S.expenses || []).length === 0 && !(S.settings.salary > 0);
      const onboardingBannerHtml = isFreshAccount ? `
        <div class="bento-card p-4 rounded-3xl border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="w-10 h-10 rounded-2xl hero-indigo text-white flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[20px]">cloud_done</span>
            </span>
            <div>
              <h3 class="font-headline-sm text-sm font-extrabold text-on-surface">Bienvenido a tu espacio personal, ${esc(userName)}</h3>
              <p class="font-body-sm text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Tu registro personal en Supabase está limpio a 0,00 €. Configura tu nómina o toca un botón de Gasto Rápido para empezar.
              </p>
            </div>
          </div>
          <button onclick="switchMainView('ajustes', 'ingresos')" class="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-xs font-extrabold hover:bg-primary-container transition active-scale flex-shrink-0">
            Configurar Nómina
          </button>
        </div>
      ` : '';

      // 1-Tap Quick Expense Presets Strip (Sleek Horizontal Chips)
      const quickPresetsHtml = `
        <section class="flex flex-col gap-2">
          <div class="flex items-center justify-between px-1">
            <span class="font-label-sm text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px] text-primary">bolt</span>
              Gasto en 1 Toque
            </span>
            <button onclick="openEditQuickPresetsModal()" class="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[14px]">tune</span>
              Editar
            </button>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto custom-scroll pb-1">
            ${(S.quickPresets || []).map(qp => `
              <button onclick="triggerQuickPresetExpense('${qp.id}')" class="bento-card px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 flex-shrink-0 hover:border-primary/50 active-scale text-left">
                <span class="w-8 h-8 rounded-xl bg-surface-container-low flex items-center justify-center text-base">${esc(qp.emoji || '💸')}</span>
                <div>
                  <p class="text-xs font-extrabold text-on-surface leading-tight">${esc(qp.label)}</p>
                  <p class="text-[11px] font-extrabold text-primary tabular-nums privacy-val mt-0.5">${fmt(qp.amount)}</p>
                </div>
              </button>
            `).join('')}
          </div>
        </section>
      `;

      // Multi-segment stacked bar & category grid (Copilot / Monarch Money style)
      const topCats = cats.slice(0, 6);
      const multiBarSegments = topCats.length > 0 ? topCats.map(d => {
        const c = catById(d.cat);
        const pct = totalExp > 0 ? Math.max(4, Math.round((d.total / totalExp) * 100)) : 0;
        return `<div class="h-full transition-all duration-500" style="width:${pct}%;background:${c.c}" title="${esc(c.name)} (${pct}%)"></div>`;
      }).join('') : `<div class="bg-outline-variant/40 h-full w-full"></div>`;

      const catCardsHtml = (topCats.length > 0 ? topCats : CATS.slice(0, 6).map(c => ({ cat: c.id, total: 0 }))).map(d => {
        const c = catById(d.cat);
        const pctOfTotal = totalExp > 0 ? Math.round((d.total / totalExp) * 100) : 0;
        const bdg = effBudget(c.id);
        const bdgPct = bdg > 0 ? Math.min(100, Math.round((d.total / bdg) * 100)) : pctOfTotal;
        const over = bdg > 0 && d.total > bdg;
        return `
          <button onclick="haptic('light'); openCategoryDetailModal('${c.id}')" class="p-3 rounded-2xl bg-surface-container-low/80 hover:bg-surface-container transition flex flex-col justify-between gap-2 text-left active-scale border ${over ? 'border-tertiary/50 bg-tertiary/5' : 'border-outline-variant/25'}">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${c.c}1c;color:${c.c}">
                  <span class="material-symbols-outlined text-[16px]">${c.icon}</span>
                </span>
                <span class="font-label-sm text-xs font-extrabold text-on-surface truncate">${esc(c.name)}</span>
              </div>
              <span class="text-[10px] font-extrabold ${over ? 'text-tertiary' : 'text-on-surface-variant'}">${bdg > 0 ? `${bdgPct}%` : `${pctOfTotal}%`}</span>
            </div>
            <div>
              <div class="flex items-baseline justify-between">
                <span class="font-headline-sm text-[15px] font-extrabold text-on-surface tabular-nums privacy-val">${fmt0(d.total)}</span>
                ${bdg > 0 ? `<span class="text-[10px] text-outline tabular-nums privacy-val">/ ${fmt0(bdg)}</span>` : ''}
              </div>
              <div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mt-1.5">
                <div class="h-full rounded-full transition-all duration-500" style="width:${bdgPct}%;background:${over ? '#e11d48' : c.c}"></div>
              </div>
            </div>
          </button>`;
      }).join('');

      // Recent Monthly Transactions grouped by Date (Apple Wallet / Revolut style)
      const recentMixed = [
        ...exps.map(e => ({ ...e, _k: 'exp' })),
        ...incs.map(i => ({ ...i, _k: 'inc' }))
      ].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.ts || 0) - (a.ts || 0)).slice(0, 8);

      const recentRowsHtml = recentMixed.length > 0
        ? renderDateGroupedTransactionsHtml(recentMixed)
        : `
          <div class="p-8 text-center text-on-surface-variant text-sm flex flex-col items-center gap-2">
            <span class="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline">
              <span class="material-symbols-outlined text-2xl">receipt_long</span>
            </span>
            <p class="font-bold text-on-surface">Sin movimientos en ${monthLabel(viewMk)}</p>
            <p class="text-xs max-w-xs">Usa un botón de Gasto en 1 Toque o pulsa el botón central «+» para registrar tu primer gasto o ingreso.</p>
          </div>`;

      // Upcoming Subscriptions
      const upcomingHtml = upRecList.slice(0, 4).map(r => {
        const c = catById(r.cat);
        return `
          <div class="py-2.5 flex items-center justify-between text-xs border-b border-outline-variant/20 last:border-0">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${c.c}1c;color:${c.c}">
                <span class="material-symbols-outlined text-[15px]">${c.icon}</span>
              </span>
              <div class="min-w-0">
                <p class="font-bold text-on-surface truncate">${esc(r.name)}</p>
                <p class="text-[11px] text-outline">${r.day ? `Día ${r.day} de cada mes` : 'Este mes'}</p>
              </div>
            </div>
            <strong class="font-extrabold text-on-surface tabular-nums privacy-val">−${fmt(r.amount)}</strong>
          </div>`;
      }).join('');

      // Active Goals Mini Preview
      const goalsMiniHtml = (S.goals || []).length > 0 ? `
        <div class="bento-card p-4 rounded-3xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-secondary text-[18px]">emoji_events</span>
              <h3 class="font-label-lg text-sm font-extrabold text-on-surface">Metas de Ahorro</h3>
            </div>
            <button onclick="switchMainView('ajustes', 'obj')" class="text-xs font-bold text-primary hover:underline">Ver todas</button>
          </div>
          <div class="flex flex-col gap-2.5">
            ${(S.goals || []).slice(0, 2).map(g => {
              const gPct = Math.min(100, g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0);
              return `
                <div onclick="openGoalMoveModal('${g.id}', 1)" class="cursor-pointer p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition flex flex-col gap-1.5 active-scale">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-extrabold text-on-surface">${esc(g.name)}</span>
                    <span class="font-extrabold text-secondary tabular-nums privacy-val">${fmt0(g.saved)} / ${fmt0(g.target)} (${gPct}%)</span>
                  </div>
                  <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style="width:${gPct}%"></div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      ` : '';

      el.innerHTML = `
        ${monthlyTopNavHtml}
        ${onboardingBannerHtml}

        <!-- HERO EXECUTIVE CARD + KPI BENTO GRID -->
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <!-- FLAGSHIP HERO CARD (2 cols): PUEDES GASTAR ESTE MES + DAILY SAFE VERDICT -->
          <div class="col-span-2 hero-indigo text-white p-5 rounded-3xl flex flex-col justify-between gap-4 relative overflow-hidden">
            <div class="flex items-start justify-between gap-2 relative z-10">
              <div class="flex flex-col">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="font-label-sm text-[10px] text-indigo-100/90 font-extrabold tracking-widest uppercase">DISPONIBLE REAL DEL MES</span>
                  <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/15 text-white backdrop-blur-xs privacy-val">${fmt0(dailySafeAllowance)}/día</span>
                </div>
                <div class="flex items-baseline gap-2 mt-1.5">
                  <span class="font-display-currency text-[34px] sm:text-[38px] leading-none font-extrabold text-white tracking-tight tabular-nums privacy-val">${fmt(safe)}</span>
                </div>
                <p class="text-[11px] text-indigo-100/80 mt-1 font-medium">
                  ${daysRemaining} día${daysRemaining === 1 ? '' : 's'} restante${daysRemaining === 1 ? '' : 's'} · Previsión fin de mes: <strong class="text-white tabular-nums privacy-val">${fmtSigned(fc.end)}</strong>
                </p>
              </div>

              <button onclick="haptic('light'); switchMainView('analitica')" class="bg-white/15 hover:bg-white/25 transition backdrop-blur-xs px-3 py-2 rounded-2xl border border-white/20 text-right flex-shrink-0 active-scale">
                <span class="font-label-sm text-xs text-white font-extrabold flex items-center justify-end gap-1">
                  <span class="material-symbols-outlined text-[15px]">auto_awesome</span>
                  ${scoreObj.score}/100
                </span>
                <p class="text-[10px] text-indigo-100/90 font-semibold mt-0.5">Ahorro ${savingsRate}%</p>
              </button>
            </div>

            <div class="grid grid-cols-3 gap-2 pt-3 border-t border-white/15 text-xs relative z-10">
              <div>
                <span class="text-indigo-200/80 text-[10px] uppercase font-bold block">Balance Mes</span>
                <strong class="text-white font-extrabold tabular-nums privacy-val">${fmtSigned(netMonth)}</strong>
              </div>
              <div>
                <span class="text-indigo-200/80 text-[10px] uppercase font-bold block">Fijos pend.</span>
                <strong class="text-amber-200 font-extrabold tabular-nums privacy-val">−${fmt0(upRecTotal)}</strong>
              </div>
              <div class="text-right">
                <span class="text-indigo-200/80 text-[10px] uppercase font-bold block">Reserva Obj.</span>
                <strong class="text-emerald-200 font-extrabold tabular-nums privacy-val">${fmt0(reserveGoals)}</strong>
              </div>
            </div>
          </div>

          <!-- KPI 2: INGRESOS DEL MES -->
          <div onclick="haptic('light'); switchMainView('ajustes', 'ingresos')" class="col-span-1 bento-card p-4 rounded-3xl flex flex-col justify-between cursor-pointer active-scale">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-[10px] tracking-wider text-on-surface-variant font-extrabold uppercase">INGRESOS</span>
              <span class="w-8 h-8 rounded-xl bg-secondary/12 text-secondary flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">trending_up</span>
              </span>
            </div>
            <div>
              <p class="font-display-currency-mobile text-[22px] sm:text-[26px] leading-7 font-extrabold text-secondary tracking-tight tabular-nums privacy-val">+${fmt(totalInc)}</p>
              <span class="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-secondary px-2 py-0.5 rounded-full bg-secondary/10">
                ${incs.length} registro${incs.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <!-- KPI 3: GASTADO ESTE MES + MONTH-OVER-MONTH BADGE -->
          <div onclick="haptic('light'); switchMainView('gastos')" class="col-span-1 bento-card p-4 rounded-3xl flex flex-col justify-between cursor-pointer active-scale">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-[10px] tracking-wider text-on-surface-variant font-extrabold uppercase">GASTADO</span>
              <span class="w-8 h-8 rounded-xl bg-tertiary/12 text-tertiary flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">receipt_long</span>
              </span>
            </div>
            <div>
              <p class="font-display-currency-mobile text-[22px] sm:text-[26px] leading-7 font-extrabold text-tertiary tracking-tight tabular-nums privacy-val">−${fmt(totalExp)}</p>
              <div class="flex flex-wrap items-center gap-1.5 mt-2">
                <span class="text-[11px] font-bold text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container privacy-val">
                  ${fmt0(fc.avg)}/día
                </span>
                ${expDeltaPct !== null ? `
                  <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${expDeltaPct <= 0 ? 'bg-secondary/12 text-secondary' : 'bg-tertiary/12 text-tertiary'}">
                    ${expDeltaPct <= 0 ? '↓' : '↑'}${Math.abs(expDeltaPct)}% vs ant.
                  </span>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- KPI 4: COPILOT MONEY-STYLE PACING BAR -->
          <div class="col-span-2 lg:col-span-4 bento-card p-4 sm:p-5 rounded-3xl flex flex-col gap-3">
            <div class="flex flex-wrap justify-between items-center gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span class="material-symbols-outlined text-[18px]">speed</span>
                </span>
                <span class="font-label-lg text-sm font-extrabold text-on-surface">Ritmo de Presupuesto</span>
                <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${isPaceGood ? 'bg-secondary/12 text-secondary' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'} privacy-val">
                  ${isPaceGood ? `🟢 Óptimo (${fmt0(Math.abs(paceDiff))} bajo ritmo)` : `🟠 Alto (+${fmt0(Math.abs(paceDiff))} sobre día ${currentDay})`}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-label-md text-xs font-extrabold ${budgetPct >= 100 ? 'text-tertiary bg-tertiary/10' : budgetPct >= 80 ? 'text-amber-700 bg-amber-500/15' : 'text-primary bg-primary/10'} px-2.5 py-0.5 rounded-full">
                  ${budgetPct}% en el ${elapsedMonthPct}% del mes
                </span>
                <button onclick="switchMainView('ajustes', 'pres')" class="text-xs font-bold text-primary hover:underline">Límites</button>
              </div>
            </div>

            <div class="flex items-baseline justify-between">
              <p class="font-headline-md text-[20px] sm:text-[22px] text-on-surface font-extrabold tabular-nums privacy-val">
                ${fmt(totalExp)} <span class="font-body-md text-sm text-on-surface-variant font-medium">/ ${fmt0(budgetTotal)}</span>
              </p>
              <p class="font-label-sm text-xs ${budgetRest >= 0 ? 'text-secondary' : 'text-tertiary'} font-extrabold tabular-nums privacy-val">
                ${budgetRest >= 0 ? `${fmt0(budgetRest)} libres` : `${fmt0(-budgetRest)} excedido`}
              </p>
            </div>

            <div class="relative w-full pt-1 pb-2">
              <div class="w-full bg-surface-container h-3 rounded-full overflow-hidden">
                <div class="${budgetPct >= 100 ? 'bg-tertiary' : !isPaceGood ? 'bg-amber-500' : 'bg-gradient-to-r from-primary to-indigo-400'} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, budgetPct)}%;"></div>
              </div>
              ${isCurMonth ? `
                <div class="absolute top-0 bottom-1 flex flex-col items-center pointer-events-none" style="left: clamp(5%, ${elapsedMonthPct}%, 95%); transform: translateX(-50%);">
                  <div class="w-0.5 h-5 bg-on-surface rounded-full shadow-xs"></div>
                  <span class="text-[9px] font-extrabold text-on-surface uppercase tracking-tight mt-0.5 bg-surface-container-lowest px-1.5 py-0.2 rounded-full border border-outline-variant/60 shadow-xs">Hoy D${currentDay}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </section>

        ${quickPresetsHtml}

        <!-- QUICK MONTHLY ACTION BAR -->
        <section class="grid grid-cols-4 gap-2">
          <button onclick="haptic('light'); openTxModal('exp')" class="bento-card p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 hover:bg-surface-container-low transition active-scale text-center sm:text-left">
            <span class="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[19px]">add_shopping_cart</span>
            </span>
            <div class="min-w-0">
              <p class="font-label-lg text-[11px] sm:text-xs font-extrabold text-on-surface truncate">Gasto</p>
              <p class="text-[10px] text-on-surface-variant hidden sm:block">Manual / #tag</p>
            </div>
          </button>

          <button onclick="haptic('light'); openReceiptScannerModal()" class="bento-card p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 hover:bg-surface-container-low transition active-scale text-center sm:text-left">
            <span class="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[19px]">photo_camera</span>
            </span>
            <div class="min-w-0">
              <p class="font-label-lg text-[11px] sm:text-xs font-extrabold text-on-surface truncate">Ticket OCR</p>
              <p class="text-[10px] text-on-surface-variant hidden sm:block">Foto cámara</p>
            </div>
          </button>

          <button onclick="haptic('light'); openTxModal('exp', null, true)" class="bento-card p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 hover:bg-surface-container-low transition active-scale text-center sm:text-left">
            <span class="w-9 h-9 rounded-xl bg-tertiary/12 text-tertiary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[19px]">mic</span>
            </span>
            <div class="min-w-0">
              <p class="font-label-lg text-[11px] sm:text-xs font-extrabold text-on-surface truncate">Voz</p>
              <p class="text-[10px] text-on-surface-variant hidden sm:block">Dictar gasto</p>
            </div>
          </button>

          <button onclick="haptic('light'); openTxModal('inc')" class="bento-card p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 hover:bg-surface-container-low transition active-scale text-center sm:text-left">
            <span class="w-9 h-9 rounded-xl bg-secondary/12 text-secondary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[19px]">payments</span>
            </span>
            <div class="min-w-0">
              <p class="font-label-lg text-[11px] sm:text-xs font-extrabold text-on-surface truncate">Ingreso</p>
              <p class="text-[10px] text-on-surface-variant hidden sm:block">Extra / Bizum</p>
            </div>
          </button>
        </section>

        <!-- 2-COLUMN MONTHLY BREAKDOWN & RECENT MOVEMENTS -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          <!-- LEFT (6 cols): INTERACTIVE DONUT + CATEGORY BENTO GRID & UPCOMING -->
          <section class="lg:col-span-6 flex flex-col gap-4">
            <div class="flex items-center justify-between px-1">
              <div>
                <h2 class="font-headline-sm text-base font-extrabold text-on-surface">Desglose por categorías</h2>
                <p class="font-body-sm text-xs text-on-surface-variant capitalize">Distribución de ${monthLabel(viewMk)}</p>
              </div>
              <button onclick="switchMainView('ajustes', 'pres')" class="font-label-md text-xs text-primary font-bold hover:underline">Límites</button>
            </div>

            <div class="bento-card p-4 rounded-3xl flex flex-col gap-4">
              <div class="flex items-center gap-4">
                ${renderCategoryDonutSVG(cats, totalExp)}
                <div class="flex-1 flex flex-col gap-2 min-w-0">
                  <div class="flex items-baseline justify-between">
                    <span class="text-xs font-extrabold text-on-surface">Total gastado</span>
                    <span class="font-headline-sm text-base font-extrabold text-on-surface tabular-nums privacy-val">${fmt(totalExp)}</span>
                  </div>
                  <div class="flex h-3 w-full rounded-full overflow-hidden gap-0.5 bg-surface-container">
                    ${multiBarSegments}
                  </div>
                  <p class="text-[11px] text-on-surface-variant">
                    ${cats.length > 0 ? `${cats.length} categoría(s) · Top: <strong class="text-on-surface">${esc(catById(cats[0].cat).name)}</strong>` : 'Sin gastos registrados este mes'}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                ${catCardsHtml}
              </div>
            </div>

            ${goalsMiniHtml}

            ${upRecList.length > 0 ? `
              <div class="bento-card p-4 rounded-3xl flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-amber-600 text-[18px]">schedule</span>
                    <h3 class="font-label-lg text-sm font-extrabold text-on-surface">Próximos cargos fijos</h3>
                  </div>
                  <button onclick="switchMainView('ajustes', 'rec')" class="text-xs font-bold text-primary hover:underline privacy-val">Ver (${fmt(upRecTotal)})</button>
                </div>
                <div>
                  ${upcomingHtml}
                </div>
              </div>
            ` : ''}
          </section>

          <!-- RIGHT (6 cols): DATE-GROUPED RECENT ACTIVITY FEED -->
          <section class="lg:col-span-6 flex flex-col gap-3">
            <div class="flex items-center justify-between px-1">
              <div>
                <h2 class="font-headline-sm text-base font-extrabold text-on-surface">Actividad reciente</h2>
                <p class="font-body-sm text-xs text-on-surface-variant">Agrupada por día · Sincronizada en tiempo real</p>
              </div>
              <button onclick="switchMainView('gastos')" class="font-label-md text-xs text-primary font-bold hover:underline">Ver todos (${exps.length + incs.length})</button>
            </div>

            <div class="bento-card rounded-3xl overflow-hidden">
              <div>
                ${recentRowsHtml}
              </div>
              <button onclick="switchMainView('gastos')" class="w-full block text-center py-3.5 bg-surface-container-low text-primary font-label-lg text-xs font-extrabold hover:bg-surface-container transition-colors border-t border-outline-variant/25 capitalize">
                Explorar libro completo de ${monthLabel(viewMk)} →
              </button>
            </div>
          </section>

        </div>
      `;
    }

    // Helper: Render a Supabase Cloud Member Card in Stitch Style
    function renderCloudMemberCard(user, index) {
      const deuda = parseFloat(user.deuda || 0);
      const isClear = deuda <= 0.005;
      const esMayorMoroso = (index === 0 && deuda > 0);
      const pagosPendientes = sbMovimientos.filter(m => Number(m.usuario_id) === Number(user.id) && m.tipo === 'pago' && m.estado === 'pendiente');
      const hasPending = pagosPendientes.length > 0;
      const totalPending = pagosPendientes.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);

      const lastMov = sbMovimientos.find(m => Number(m.usuario_id) === Number(user.id));
      const lastConcept = lastMov ? `${lastMov.tipo === 'cargo' ? 'Cargo' : 'Pago'}: ${lastMov.concepto || 'Movimiento'}` : 'Sin cargos recientes en este grupo';
      const lastDate = lastMov && lastMov.created_at ? fmtDay(lastMov.created_at.slice(0, 10)) : 'Al día';

      const currGroup = sbGrupos.find(g => String(g.id) === String(currentGroupId));
      const canManageGroup = isAdmin || (currGroup && Number(currGroup.admin_id) === Number(loggedUserId));
      const isMe = Number(user.id) === Number(loggedUserId);

      const avatarBg = isClear
        ? "bg-secondary-fixed text-on-secondary-fixed"
        : esMayorMoroso
          ? "bg-tertiary-fixed text-on-tertiary-fixed ring-2 ring-tertiary/40"
          : "bg-primary-fixed text-on-primary-fixed";

      return `
        <div class="bento-card p-3.5 rounded-2xl flex flex-col gap-3 ${isMe ? 'ring-1 ring-primary/40' : ''}">
          <div class="flex items-start justify-between gap-2">
            <div onclick="openCloudUserDetailsModal(${user.id}, '${esc(user.nombre)}')" class="flex items-center gap-3 cursor-pointer group min-w-0">
              <div class="w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                ${initials(user.nombre)}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h4 class="font-label-lg text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                    ${esc(user.nombre)} ${isMe ? '<span class="text-[10px] font-extrabold text-primary">(Tú)</span>' : ''}
                  </h4>
                  ${esMayorMoroso ? `<span class="text-xs px-1.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-extrabold" title="Mayor Moroso del grupo">🔥 Top</span>` : ''}
                </div>
                <p class="font-body-sm text-xs text-on-surface-variant truncate">${esc(lastConcept)}</p>
                <span class="font-body-sm text-[11px] text-outline">${esc(lastDate)} • Ver desglose en todos los grupos</span>
              </div>
            </div>

            <div class="text-right flex-shrink-0">
              <span class="font-headline-sm text-[17px] font-extrabold tabular-nums ${isClear ? 'text-secondary' : 'text-tertiary'}">
                ${isClear ? '0,00 €' : fmt(deuda)}
              </span>
              <div class="mt-1">
                ${hasPending
                  ? `<span class="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">⏳ Pagó ${fmt(totalPending)} (Rev.)</span>`
                  : isClear
                    ? `<span class="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Al día ✓</span>`
                    : `<span class="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">${isMe ? 'Debes' : 'Pendiente'}</span>`
                }
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/20">
            ${canManageGroup ? `
              <button onclick="openIndivChargeModal(${user.id}, '${esc(user.nombre)}')" class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition active-scale">
                <span class="material-symbols-outlined text-[15px]">add_circle</span>
                + Cargo
              </button>
            ` : ''}

            <button onclick="openCloudPaymentModal(${user.id}, '${esc(user.nombre)}', ${deuda})" class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl ${canManageGroup ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' : 'bg-primary/10 text-primary hover:bg-primary/20'} font-label-md text-xs font-bold transition active-scale">
              <span class="material-symbols-outlined text-[15px]">check_circle</span>
              ${canManageGroup ? 'Marcar cobrado' : 'He pagado'}
            </button>

            ${(!isClear && !isMe) ? `
              <button onclick="openBizumClaimModal('${esc(user.nombre)}', ${deuda}, '${esc(currGroup ? currGroup.nombre : 'Grupo')}')" class="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-tertiary/10 text-tertiary font-label-md text-xs font-bold hover:bg-tertiary/20 transition active-scale" title="Reclamar por Bizum / WhatsApp">
                <span class="material-symbols-outlined text-[15px]">send</span>
                <span class="hidden sm:inline">Bizum</span>
              </button>
            ` : ''}

            ${canManageGroup ? `
              <button onclick="undoLastCloudAction(${user.id}, '${esc(user.nombre)}')" class="p-1.5 rounded-xl text-on-surface-variant hover:text-amber-600 hover:bg-amber-500/10 transition" title="Deshacer último movimiento">
                <span class="material-symbols-outlined text-[16px]">undo</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Helper: Render a Personal P2P Debt Card ("Me deben" / "Debo") in Stitch Style
    function renderPersonalDebtCard(d) {
      const isOwed = d.type === 'owed';
      const isOverdue = d.due && d.due < todayStr();
      const paidSoFar = (d.log || []).filter(l => l.k === 'pay').reduce((a, l) => a + Number(l.a || 0), 0);
      const isPartial = paidSoFar > 0 && d.amount > 0;
      const lastDate = (d.log && d.log.length > 0) ? fmtDay(d.log[d.log.length - 1].d) : fmtDay(todayStr());

      let badgeHtml = `<span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Pendiente</span>`;
      if (isOverdue) {
        badgeHtml = `<span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-error-container text-on-error-container">Vencido</span>`;
      } else if (isPartial) {
        badgeHtml = `<span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pago parcial (abonó ${fmt0(paidSoFar)})</span>`;
      }

      const avatarStyle = isOwed
        ? (isOverdue ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-secondary-fixed text-on-secondary-fixed")
        : "bg-tertiary-fixed text-on-tertiary-fixed";

      return `
        <div class="bento-card p-3.5 rounded-2xl flex flex-col gap-3">
          <div class="flex items-start justify-between gap-2">
            <div onclick="openP2PDebtHistoryModal('${d.id}')" class="flex items-center gap-3 cursor-pointer min-w-0">
              <div class="w-10 h-10 rounded-full ${avatarStyle} flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                ${initials(d.person)}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h4 class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(d.person)}</h4>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">Directo P2P</span>
                </div>
                <p class="font-body-sm text-xs text-on-surface-variant truncate">${esc(d.note || (isOwed ? 'Préstamo personal' : 'Deuda pendiente'))}</p>
                <span class="font-body-sm text-[11px] ${isOverdue ? 'text-error font-semibold' : 'text-outline'}">
                  ${lastDate}${d.due ? ` • Vence ${fmtDay(d.due)}` : ''}
                </span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="font-headline-sm text-[17px] font-extrabold tabular-nums ${isOwed ? 'text-secondary' : 'text-tertiary'}">
                ${isOwed ? '+' : '−'}${fmt(d.amount)}
              </span>
              <div class="mt-1">${badgeHtml}</div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/20">
            <button onclick="openP2PPartialModal('${d.id}')" class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition active-scale">
              <span class="material-symbols-outlined text-[15px]">edit_note</span>
              Registrar abono
            </button>
            ${isOwed ? `
              <button onclick="openBizumClaimModal('${esc(d.person)}', ${d.amount}, '${esc(d.note || 'Préstamo P2P')}')" class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-tertiary/10 text-tertiary font-label-md text-xs font-bold hover:bg-tertiary/20 transition active-scale">
                <span class="material-symbols-outlined text-[15px]">send</span>
                Reclamar Bizum
              </button>
            ` : `
              <button onclick="openP2PDebtHistoryModal('${d.id}')" class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-surface-container-low text-on-surface-variant font-label-md text-xs font-semibold hover:bg-surface-container transition active-scale">
                <span class="material-symbols-outlined text-[15px]">history</span>
                Historial
              </button>
            `}
            <button onclick="settleFullP2PDebt('${d.id}')" class="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl ${isOwed ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' : 'bg-primary/10 text-primary hover:bg-primary/20'} font-label-md text-xs font-bold transition active-scale">
              <span class="material-symbols-outlined text-[15px]">check_circle</span>
              ${isOwed ? 'Marcar cobrado' : 'Saldar deuda'}
            </button>
          </div>
        </div>
      `;
    }

    // Helper: Render a Stitch Expense Row
    function renderExpenseRow(e) {
      const c = catById(e.cat);
      const m = methodById(e.method);
      const tags = tagsOf(e.note);
      const title = cleanNoteText(e.note, c.name);
      const trip = e.tripId ? (S.trips || []).find(t => t.id === e.tripId) : null;

      return `
        <div onclick="openTxModal('exp', '${e.id}')" class="p-3.5 flex items-center justify-between hover:bg-surface-container-low/60 transition cursor-pointer gap-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${c.c}1a; color:${c.c}">
              <span class="material-symbols-outlined text-[20px]">${c.icon}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <p class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(title)}</p>
                ${e.refund ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Devolución</span>` : ''}
                ${trip ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600">✈️ ${esc(trip.name)}</span>` : ''}
              </div>
              <div class="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-xs mt-0.5 flex-wrap">
                <span>${fmtDay(e.date)}</span>
                <span>•</span>
                <span class="inline-flex items-center gap-0.5"><span class="material-symbols-outlined text-[13px]">${m.icon}</span> ${esc(m.name)}</span>
                ${tags.map(t => `<span class="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">${esc(t)}</span>`).join('')}
              </div>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="font-headline-sm text-[15px] font-extrabold text-on-surface tabular-nums privacy-val">−${fmt(e.amount)}</span>
            <p class="font-label-sm text-[10px] text-on-surface-variant uppercase">${esc(c.name)}</p>
          </div>
        </div>
      `;
    }
