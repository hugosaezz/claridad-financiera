    // ============================================================================
    // 8. NAVIGATION, PERIOD & VIEW RENDERER ORCHESTRATION
    // ============================================================================
    function switchMainView(viewName, subTab = null) {
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

      // Update large bottom navigation tabs (inicio and gastos both map to 'nav-inicio')
      const activeNavKey = (viewName === 'gastos') ? 'inicio' : viewName;
      ['inicio', 'cuentas', 'analitica', 'ajustes'].forEach(k => {
        const navBtn = $('#nav-' + k);
        if (!navBtn) return;
        const iconSpan = navBtn.querySelector('.material-symbols-outlined');
        const pillSpan = navBtn.querySelector('.nav-pill');
        const isActive = (k === activeNavKey);
        navBtn.className = isActive
          ? "nav-tab flex flex-col items-center justify-center text-primary font-extrabold gap-1 py-1.5 rounded-2xl transition-all active-scale"
          : "nav-tab flex flex-col items-center justify-center text-on-surface-variant font-bold gap-1 py-1.5 rounded-2xl hover:text-primary transition-all active-scale relative";
        if (iconSpan) iconSpan.classList.toggle('filled', isActive);
        if (pillSpan) {
          pillSpan.className = isActive
            ? "nav-pill px-3.5 py-1 rounded-full bg-primary/15 flex items-center justify-center transition-all"
            : "nav-pill px-3.5 py-1 rounded-full flex items-center justify-center transition-all";
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
    function renderInicioView() {
      const el = $('#view-inicio');
      if (!el) return;

      const userName = currentLoggedUserName();
      const exps = monthExpenses(viewMk).sort((a, b) => b.date.localeCompare(a.date));
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

      const hasPersonalData = (S.expenses || []).length > 0 || (S.incomes || []).length > 0 || (S.debts || []).length > 0 || S.isDemoSeeded;

      // Top Monthly Control Bar (Resumen vs Movimientos + Borrar datos de prueba)
      const monthlyTopNavHtml = `
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center bg-surface-container p-1 rounded-xl gap-1">
            <button onclick="switchMainView('inicio')" class="px-3.5 py-2 rounded-lg text-xs font-extrabold bg-surface-container-lowest text-primary shadow-xs transition flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">dashboard</span>
              Resumen Mensual
            </button>
            <button onclick="switchMainView('gastos')" class="px-3.5 py-2 rounded-lg text-xs font-bold text-on-surface-variant hover:text-on-surface transition flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">receipt_long</span>
              Movimientos (${exps.length + incs.length})
            </button>
          </div>
          ${hasPersonalData ? `
            <button onclick="resetLocalPersonalData()" class="px-3 py-2 rounded-xl bg-tertiary/10 hover:bg-tertiary/20 text-tertiary text-xs font-extrabold flex items-center gap-1 transition active-scale" title="Borra los gastos/datos de prueba del Control Mensual sin tocar la base de datos de Deudas de Supabase">
              <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
              Borrar datos de Control Mensual
            </button>
          ` : ''}
        </div>
      `;

      // 1-Tap Quick Expense Presets Bar
      const quickPresetsHtml = `
        <section class="bento-card p-3.5 rounded-2xl flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="font-label-sm text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">bolt</span>
              Gasto Rápido en 1 Toque (Suma al instante)
            </span>
            <button onclick="openEditQuickPresetsModal()" class="text-[11px] font-bold text-on-surface-variant hover:text-primary flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[14px]">edit</span>
              Personalizar
            </button>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto custom-scroll pb-0.5">
            ${(S.quickPresets || []).map(qp => `
              <button onclick="triggerQuickPresetExpense('${qp.id}')" class="px-3 py-2 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-outline-variant/40 hover:border-primary/40 flex items-center gap-2 flex-shrink-0 transition active-scale text-left">
                <span class="text-base">${esc(qp.emoji || '💸')}</span>
                <div>
                  <p class="text-xs font-extrabold text-on-surface leading-tight">${esc(qp.label)}</p>
                  <p class="text-[11px] font-bold text-primary tabular-nums">${fmt(qp.amount)}</p>
                </div>
              </button>
            `).join('')}
          </div>
        </section>
      `;

      // Welcome onboarding banner if this user has no personal expenses and no salary set yet
      const isFreshAccount = (S.expenses || []).length === 0 && !(S.settings.salary > 0);
      const onboardingBannerHtml = isFreshAccount ? `
        <div class="bento-card p-4 rounded-2xl border-l-4 border-l-primary bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined">verified_user</span>
            </span>
            <div>
              <h3 class="font-headline-sm text-sm font-extrabold text-on-surface">Cuenta limpia a 0,00 € (${esc(userName)})</h3>
              <p class="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Sin datos aleatorios. Configura tu nómina, usa los botones de «Gasto Rápido en 1 toque» o escanea un ticket con la cámara.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button onclick="switchMainView('ajustes', 'ingresos')" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition active-scale">
              Configurar Nómina
            </button>
          </div>
        </div>
      ` : '';

      // Multi-segment stacked bar & category grid (Stitch design)
      const topCats = cats.slice(0, 6);
      const multiBarSegments = topCats.length > 0 ? topCats.map(d => {
        const c = catById(d.cat);
        const pct = totalExp > 0 ? Math.max(4, Math.round((d.total / totalExp) * 100)) : 0;
        return `<div class="h-full transition-all duration-500" style="width:${pct}%;background:${c.c}" title="${esc(c.name)} (${pct}%)"></div>`;
      }).join('') : `<div class="bg-outline-variant/40 h-full w-full"></div>`;

      const catCardsHtml = (topCats.length > 0 ? topCats : CATS.slice(0, 6).map(c => ({ cat: c.id, total: 0 }))).map(d => {
        const c = catById(d.cat);
        const pct = totalExp > 0 ? Math.round((d.total / totalExp) * 100) : 0;
        const bdg = effBudget(c.id);
        const over = bdg > 0 && d.total > bdg;
        return `
          <button onclick="openCategoryDetailModal('${c.id}')" class="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition flex flex-col text-left active-scale border ${over ? 'border-tertiary/40' : 'border-transparent'}">
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${c.c}"></span>
                <span class="font-label-sm text-xs font-bold text-on-surface-variant truncate">${esc(c.name)}</span>
              </div>
              <span class="material-symbols-outlined text-[16px]" style="color:${c.c}">${c.icon}</span>
            </div>
            <span class="font-headline-sm text-[16px] font-extrabold text-on-surface mt-1 tabular-nums">${fmt0(d.total)}</span>
            <span class="font-body-sm text-[11px] ${over ? 'text-tertiary font-bold' : 'text-outline'}">
              ${pct}% del total${bdg > 0 ? ` • Lím. ${fmt0(bdg)}` : ''}
            </span>
          </button>`;
      }).join('');

      // Recent Monthly Transactions (Expenses & Incomes)
      const recentMixed = [
        ...exps.map(e => ({ ...e, _k: 'exp' })),
        ...incs.map(i => ({ ...i, _k: 'inc' }))
      ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

      const recentRowsHtml = recentMixed.map(x => {
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
                <p class="font-body-sm text-xs text-on-surface-variant">${fmtDay(x.date)} • ${x.auto ? 'Nómina automática' : esc(ic.name)}</p>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="font-headline-sm text-[15px] font-extrabold text-secondary tabular-nums">+${fmt(x.amount)}</span>
              <p class="font-label-sm text-[10px] text-secondary uppercase">Ingreso</p>
            </div>
          </div>`;
      }).join('') || `
        <div class="p-8 text-center text-on-surface-variant text-sm">
          Sin movimientos registrados en ${monthLabel(viewMk)}.
        </div>`;

      // Upcoming Subscriptions & Goals Summary
      const upcomingHtml = upRecList.slice(0, 3).map(r => {
        const c = catById(r.cat);
        return `
          <div class="py-2 flex items-center justify-between text-xs border-b border-outline-variant/20 last:border-0">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]" style="color:${c.c}">${c.icon}</span>
              <span class="font-bold text-on-surface">${esc(r.name)}</span>
              <span class="text-outline">${r.day ? `Día ${r.day}` : 'Este mes'}</span>
            </div>
            <strong class="font-extrabold text-on-surface tabular-nums">−${fmt(r.amount)}</strong>
          </div>`;
      }).join('');

      el.innerHTML = `
        ${monthlyTopNavHtml}
        ${onboardingBannerHtml}
        ${quickPresetsHtml}

        <!-- SECTION: MONTHLY CONTROL EXECUTIVE BENTO GRID (100% Personal Finance) -->
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <!-- HERO KPI (2 cols): PUEDES GASTAR ESTE MES (SAFE TO SPEND) -->
          <div class="col-span-2 hero-indigo text-on-primary p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-3 relative overflow-hidden">
            <div class="flex items-start justify-between gap-2 relative z-10">
              <div class="flex flex-col">
                <span class="font-label-sm text-[10px] text-on-primary-container font-bold tracking-wider uppercase">PUEDES GASTAR ESTE MES (DISPONIBLE REAL)</span>
                <div class="flex items-baseline gap-2 mt-0.5">
                  <span class="font-display-currency-mobile text-[30px] sm:text-[34px] leading-9 font-extrabold text-white tabular-nums">${fmt(safe)}</span>
                  <span class="font-body-sm text-xs text-on-primary-container">libres</span>
                </div>
              </div>
              <div onclick="switchMainView('analitica')" class="cursor-pointer bg-white/15 hover:bg-white/25 transition backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-right">
                <span class="font-label-sm text-xs text-white font-extrabold flex items-center justify-end gap-1">
                  <span class="material-symbols-outlined text-[16px]">auto_awesome</span>
                  Score ${scoreObj.score}/100
                </span>
                <p class="font-body-sm text-[11px] text-on-primary-container">Ahorro: ${savingsRate}%</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/15 text-xs relative z-10">
              <div>
                <span class="text-on-primary-container text-[10px] uppercase font-bold block">Balance Mes</span>
                <strong class="text-white font-extrabold tabular-nums">${fmtSigned(netMonth)}</strong>
              </div>
              <div>
                <span class="text-on-primary-container text-[10px] uppercase font-bold block">Fijos pend.</span>
                <strong class="text-amber-200 font-extrabold tabular-nums">−${fmt0(upRecTotal)}</strong>
              </div>
              <div class="text-right">
                <span class="text-on-primary-container text-[10px] uppercase font-bold block">Reserva Obj.</span>
                <strong class="text-emerald-200 font-extrabold tabular-nums">${fmt0(reserveGoals)}</strong>
              </div>
            </div>
          </div>

          <!-- KPI 2: INGRESOS DEL MES -->
          <div onclick="switchMainView('ajustes', 'ingresos')" class="col-span-1 bento-card p-4 rounded-2xl flex flex-col justify-between cursor-pointer active-scale">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-[10px] tracking-wider text-on-surface-variant font-extrabold uppercase">INGRESOS DEL MES</span>
              <span class="w-7 h-7 rounded-full bg-secondary-fixed/60 text-secondary flex items-center justify-center">
                <span class="material-symbols-outlined text-[16px]">trending_up</span>
              </span>
            </div>
            <div>
              <p class="font-display-currency-mobile text-[24px] sm:text-[26px] leading-8 font-extrabold text-secondary tracking-tight tabular-nums">+${fmt(totalInc)}</p>
              <span class="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-secondary px-2 py-0.5 rounded-full bg-secondary/10">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                ${incs.length} ingreso${incs.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <!-- KPI 3: GASTADO ESTE MES -->
          <div onclick="switchMainView('gastos')" class="col-span-1 bento-card p-4 rounded-2xl flex flex-col justify-between cursor-pointer active-scale">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-[10px] tracking-wider text-on-surface-variant font-extrabold uppercase">GASTADO ESTE MES</span>
              <span class="w-7 h-7 rounded-full bg-tertiary-fixed/60 text-tertiary flex items-center justify-center">
                <span class="material-symbols-outlined text-[16px]">receipt_long</span>
              </span>
            </div>
            <div>
              <p class="font-display-currency-mobile text-[24px] sm:text-[26px] leading-8 font-extrabold text-tertiary tracking-tight tabular-nums">−${fmt(totalExp)}</p>
              <span class="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container">
                Media: ${fmt0(fc.avg)}/día
              </span>
            </div>
          </div>

          <!-- KPI 4: GASTO MENSUAL VS PRESUPUESTO -->
          <div class="col-span-2 lg:col-span-4 bento-card p-4 rounded-2xl flex flex-col gap-2.5">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
                <span class="font-label-lg text-sm font-bold text-on-surface">Gasto mensual vs. Presupuesto</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-label-md text-xs font-extrabold ${budgetPct >= 100 ? 'text-tertiary bg-tertiary/10' : budgetPct >= 80 ? 'text-amber-700 bg-amber-500/15' : 'text-primary bg-primary/10'} px-2.5 py-0.5 rounded-lg">
                  ${budgetPct}% gastado
                </span>
                <button onclick="switchMainView('ajustes', 'pres')" class="text-xs font-bold text-primary hover:underline">Ajustar límites</button>
              </div>
            </div>
            <div class="flex items-baseline justify-between">
              <p class="font-headline-md text-[22px] text-on-surface font-extrabold tabular-nums">
                ${fmt(totalExp)} <span class="font-body-md text-sm text-on-surface-variant font-medium">/ ${fmt0(budgetTotal)}</span>
              </p>
              <p class="font-label-sm text-xs ${budgetRest >= 0 ? 'text-secondary' : 'text-tertiary'} font-extrabold tabular-nums">
                ${budgetRest >= 0 ? `${fmt0(budgetRest)} restantes` : `${fmt0(-budgetRest)} excedido`}
              </p>
            </div>
            <div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
              <div class="${budgetPct >= 100 ? 'bg-tertiary' : budgetPct >= 85 ? 'bg-amber-500' : 'bg-primary'} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, budgetPct)}%;"></div>
            </div>
          </div>
        </section>

        <!-- QUICK MONTHLY ACTION BAR -->
        <section class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button onclick="openTxModal('exp')" class="bento-card p-3 rounded-2xl flex items-center gap-2.5 hover:bg-surface-container-low transition active-scale text-left">
            <span class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[19px]">add_shopping_cart</span>
            </span>
            <div>
              <p class="font-label-lg text-xs font-extrabold text-on-surface">+ Añadir Gasto</p>
              <p class="text-[10px] text-on-surface-variant">Comida, ocio, recibo</p>
            </div>
          </button>

          <button onclick="openReceiptScannerModal()" class="bento-card p-3 rounded-2xl flex items-center gap-2.5 hover:bg-surface-container-low transition active-scale text-left">
            <span class="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[19px]">photo_camera</span>
            </span>
            <div>
              <p class="font-label-lg text-xs font-extrabold text-on-surface">Escanear Ticket</p>
              <p class="text-[10px] text-on-surface-variant">Foto / OCR automático</p>
            </div>
          </button>

          <button onclick="openTxModal('exp', null, true)" class="bento-card p-3 rounded-2xl flex items-center gap-2.5 hover:bg-surface-container-low transition active-scale text-left">
            <span class="w-9 h-9 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[19px]">mic</span>
            </span>
            <div>
              <p class="font-label-lg text-xs font-extrabold text-on-surface">Dictar Gasto</p>
              <p class="text-[10px] text-on-surface-variant">Reconocimiento voz</p>
            </div>
          </button>

          <button onclick="openTxModal('inc')" class="bento-card p-3 rounded-2xl flex items-center gap-2.5 hover:bg-surface-container-low transition active-scale text-left">
            <span class="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[19px]">payments</span>
            </span>
            <div>
              <p class="font-label-lg text-xs font-extrabold text-on-surface">+ Añadir Ingreso</p>
              <p class="text-[10px] text-on-surface-variant">Extra, Bizum, venta</p>
            </div>
          </button>
        </section>

        <!-- 2-COLUMN MONTHLY BREAKDOWN & RECENT MOVEMENTS -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          <!-- LEFT (6 cols): CATEGORY BREAKDOWN & UPCOMING SUBSCRIPTIONS -->
          <section class="lg:col-span-6 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">Desglose por categorías</h2>
                <p class="font-body-sm text-xs text-on-surface-variant capitalize">Distribución de ${monthLabel(viewMk)} • Toca una categoría para ver detalle</p>
              </div>
              <button onclick="switchMainView('ajustes', 'pres')" class="font-label-md text-xs text-primary font-bold hover:underline">Presupuestos</button>
            </div>

            <div class="bento-card p-4 rounded-2xl flex flex-col gap-4">
              <div class="flex h-3 w-full rounded-full overflow-hidden gap-0.5 bg-surface-container">
                ${multiBarSegments}
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                ${catCardsHtml}
              </div>
            </div>

            ${upRecList.length > 0 ? `
              <div class="bento-card p-4 rounded-2xl flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-amber-600 text-[18px]">schedule</span>
                    <h3 class="font-label-lg text-sm font-bold text-on-surface">Próximos cargos fijos del mes</h3>
                  </div>
                  <button onclick="switchMainView('ajustes', 'rec')" class="text-xs font-bold text-primary hover:underline">Gestionar (${fmt(upRecTotal)})</button>
                </div>
                <div class="divide-y divide-outline-variant/20">
                  ${upcomingHtml}
                </div>
              </div>
            ` : ''}
          </section>

          <!-- RIGHT (6 cols): RECENT MONTHLY TRANSACTIONS -->
          <section class="lg:col-span-6 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="font-headline-sm text-headline-sm font-extrabold text-on-surface">Últimos movimientos del mes</h2>
                <p class="font-body-sm text-xs text-on-surface-variant">Tus gastos e ingresos personales</p>
              </div>
              <button onclick="switchMainView('gastos')" class="font-label-md text-xs text-primary font-bold hover:underline">Ver todos (${exps.length + incs.length})</button>
            </div>

            <div class="bento-card rounded-2xl overflow-hidden">
              <div class="divide-y divide-outline-variant/20">
                ${recentRowsHtml}
              </div>
              <button onclick="switchMainView('gastos')" class="w-full block text-center py-3 bg-surface-container-low text-primary font-label-lg text-xs font-bold hover:bg-surface-container transition-colors border-t border-outline-variant/20 capitalize">
                Ir al listado completo y buscador de ${monthLabel(viewMk)}
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
            <span class="font-headline-sm text-[15px] font-extrabold text-on-surface tabular-nums">−${fmt(e.amount)}</span>
            <p class="font-label-sm text-[10px] text-on-surface-variant uppercase">${esc(c.name)}</p>
          </div>
        </div>
      `;
    }
