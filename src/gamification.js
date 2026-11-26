    // ============================================================================
    // 6. HEALTHY GAMIFICATION: ADVANCED GOALS, SELF-CHALLENGES & SILENT BADGES
    // ============================================================================

    const CHALLENGE_TEMPLATES = [
      {
        id: 'no_spend_7',
        kind: 'no_spend_days',
        emoji: '🌿',
        title: '7 días sin gasto variable',
        desc: 'Consigue 7 días este mes con 0 € de gasto (excluyendo suscripciones fijas).',
        targetValue: 7
      },
      {
        id: 'delivery_detox',
        kind: 'keyword_cap',
        emoji: '🍳',
        title: 'Mes con menos delivery',
        desc: 'Mantén tus pedidos a domicilio (Glovo, Uber Eats, Just Eat) por debajo de 30 € este mes.',
        keywords: ['glovo', 'uber eats', 'just eat', 'delivery'],
        maxCents: 3000
      },
      {
        id: 'coffee_cap',
        kind: 'keyword_cap',
        emoji: '☕',
        title: 'Cafés y caprichos bajo control',
        desc: 'Mantén los cafés y desayunos fuera por debajo de 35 € este mes.',
        keywords: ['café', 'cafe', 'starbucks', 'desayun', 'boller'],
        maxCents: 3500
      },
      {
        id: 'savings_20',
        kind: 'savings_rate',
        emoji: '🎯',
        title: 'Ahorrar al menos el 20%',
        desc: 'Cierra el mes guardando al menos un 20% de tus ingresos totales.',
        targetPct: 20
      },
      {
        id: 'goal_boost_3',
        kind: 'goal_contributions',
        emoji: '🚀',
        title: '3 aportaciones a tus metas',
        desc: 'Haz al menos 3 aportaciones (del importe que quieras) a tus metas este mes.',
        targetValue: 3
      }
    ];

    const BADGE_CATALOG = [
      { id: 'first_tx',          emoji: '🌱', title: 'Primer paso',          desc: 'Registraste tu primer movimiento financiero.' },
      { id: 'budget_keeper',     emoji: '🧭', title: 'Mes en calma',         desc: 'Mantuviste tu gasto mensual dentro de tu presupuesto.' },
      { id: 'streak_7',          emoji: '🔥', title: '7 días al día',        desc: 'Alcanzaste una racha de control de 7 días seguidos.' },
      { id: 'streak_30',         emoji: '🏔️', title: 'Hábito sólido',        desc: 'Alcanzaste una racha de control de 30 días.' },
      { id: 'debt_free',         emoji: '🕊️', title: 'Cero deudas propias',  desc: 'No debes nada a nadie tras saldar deudas sociales.' },
      { id: 'savings_rate_20',   emoji: '💎', title: 'Regla del 20%',        desc: 'Lograste una tasa de ahorro mensual igual o superior al 20%.' },
      { id: 'goal_milestone_50', emoji: '⭐', title: 'A mitad de camino',    desc: 'Superaste el 50% en una de tus metas personales.' },
      { id: 'goal_completed',    emoji: '🏆', title: 'Meta cumplida',        desc: 'Completaste al 100% una meta de ahorro o reducción.' },
      { id: 'smart_scanner',     emoji: '📸', title: 'Archivo organizado',   desc: 'Escaneaste y archivaste tu primer ticket con OCR.' },
      { id: 'challenge_winner',  emoji: '✨', title: 'Reto superado',        desc: 'Completaste un reto personal contra ti mismo.' }
    ];

    function triggerGentleCelebration(message) {
      showToast(message);
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const enabled = S?.settings?.confettiEnabled !== false;
      if (enabled && !reduced && typeof confetti === 'function') {
        try {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.65 } });
        } catch (e) {}
      }
    }

    /**
     * Compute exact goal projection, milestones (25/50/75/100%), and ETA date.
     * Supports 3 goal kinds: 'savings' (default), 'reduction', 'debt_zero'.
     */
    function computeGoalProjection(goal, overrideMonthlyCents = null, baseDate = new Date()) {
      const kind = goal?.kind || 'savings';
      const curMk = monthKey(dstr(baseDate));

      if (kind === 'reduction') {
        const catId = goal.cat || 'ocio';
        const baselineCents = Math.max(100, Money.toCents(goal.baselineAmount || goal.target || 200));
        const reductionPct = Math.max(5, Math.min(80, Number(goal.reductionPct || 20)));
        const maxAllowedCents = Math.round(baselineCents * (1 - reductionPct / 100));
        const spentThisMonthCents = Money.toCents(
          sumExp(monthExpenses(curMk).filter(e => e.cat === catId))
        );
        const savedVsBaselineCents = Math.max(0, baselineCents - spentThisMonthCents);
        const onTrack = spentThisMonthCents <= maxAllowedCents;
        const pct = maxAllowedCents > 0
          ? (onTrack ? Math.min(100, Math.round((1 - (spentThisMonthCents / Math.max(1, baselineCents))) / (reductionPct / 100) * 100)) : Math.max(0, Math.round((maxAllowedCents / Math.max(1, spentThisMonthCents)) * 60)))
          : 100;
        return {
          kind: 'reduction',
          pct: Math.max(0, Math.min(100, pct)),
          targetCents: maxAllowedCents,
          currentCents: spentThisMonthCents,
          baselineCents,
          savedVsBaselineCents,
          onTrack,
          milestones: [25, 50, 75, 100].map(m => ({ pct: m, reached: pct >= m })),
          etaLabel: onTrack ? 'En objetivo este mes ✓' : 'Ritmo algo alto (ajustable)'
        };
      }

      if (kind === 'debt_zero') {
        const p2p = typeof computeP2PMetrics === 'function' ? computeP2PMetrics() : { totalQueDebo: 0 };
        const currentDebtCents = Money.toCents(p2p.totalQueDebo || 0);
        const initialDebtCents = Math.max(currentDebtCents, Money.toCents(goal.initialDebt || goal.target || currentDebtCents || 100));
        const paidCents = Math.max(0, initialDebtCents - currentDebtCents);
        const pct = currentDebtCents <= 0 ? 100 : (initialDebtCents > 0 ? Math.min(99, Math.round((paidCents / initialDebtCents) * 100)) : 0);
        const monthlyCents = overrideMonthlyCents !== null
          ? Math.max(0, Math.round(overrideMonthlyCents))
          : Math.max(1000, Money.toCents(goal.monthlyPlan || 100));
        const monthsNeeded = currentDebtCents <= 0 ? 0 : (monthlyCents > 0 ? Math.ceil(currentDebtCents / monthlyCents) : null);
        let etaDate = null, etaLabel = '¡Libre de deudas! 🎉';
        if (monthsNeeded && monthsNeeded > 0) {
          const dt = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsNeeded, 1);
          etaDate = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
          etaLabel = dt.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        }
        return {
          kind: 'debt_zero',
          pct,
          targetCents: initialDebtCents,
          currentCents: paidCents,
          remainingCents: currentDebtCents,
          monthlyRateCents: monthlyCents,
          monthsNeeded,
          etaDate,
          etaLabel,
          milestones: [25, 50, 75, 100].map(m => ({ pct: m, reached: pct >= m }))
        };
      }

      // Default: 'savings' goal
      const targetCents = Math.max(0, Money.toCents(goal.target || 0));
      const savedCents = Math.max(0, Money.toCents(goal.saved || 0));
      const remainingCents = Math.max(0, targetCents - savedCents);
      const pct = targetCents > 0 ? Math.min(100, Math.round((savedCents / targetCents) * 100)) : 0;

      // Determine baseline monthly savings rate
      let monthlyRateCents = overrideMonthlyCents !== null ? Math.max(0, Math.round(overrideMonthlyCents)) : Money.toCents(goal.monthlyPlan || 0);
      if (!(monthlyRateCents > 0)) {
        const net = monthBalance(curMk);
        const autoRate = net > 0 ? Math.max(2500, Math.round(Money.toCents(net) * 0.4)) : 10000;
        monthlyRateCents = autoRate;
      }

      let monthsNeeded = 0;
      let etaDate = null;
      let etaLabel = '¡Meta alcanzada! 🎉';
      if (remainingCents > 0) {
        if (monthlyRateCents > 0) {
          monthsNeeded = Math.ceil(remainingCents / monthlyRateCents);
          const dt = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsNeeded, 1);
          etaDate = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
          etaLabel = dt.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        } else {
          monthsNeeded = null;
          etaLabel = 'Define aportación mensual';
        }
      }

      return {
        kind: 'savings',
        pct,
        targetCents,
        currentCents: savedCents,
        remainingCents,
        monthlyRateCents,
        monthsNeeded,
        etaDate,
        etaLabel,
        milestones: [25, 50, 75, 100].map(m => ({ pct: m, reached: pct >= m }))
      };
    }

    /** Record a goal contribution with milestone detection (25/50/75/100%) and gentle celebration */
    function applyGoalContribution(goalId, amountCents) {
      const g = (S.goals || []).find(x => x.id === goalId);
      if (!g || !amountCents) return null;
      const prevPct = g.target > 0 ? Math.floor((g.saved / g.target) * 100) : 0;
      const newSavedCents = Math.max(0, Money.toCents(g.saved || 0) + amountCents);
      g.saved = Money.fromCents(newSavedCents);
      if (amountCents > 0) {
        if (!Array.isArray(g.contributions)) g.contributions = [];
        g.contributions.push({ date: todayStr(), amount_cents: amountCents });
      }
      const nextPct = g.target > 0 ? Math.min(100, Math.floor((g.saved / g.target) * 100)) : 0;

      const crossed = [25, 50, 75, 100].filter(m => prevPct < m && nextPct >= m);
      saveLocalState(true);
      renderAllViews();

      if (crossed.includes(100)) {
        triggerGentleCelebration(`🏆 ¡Meta «${g.name}» completada al 100%!`);
      } else if (crossed.length > 0) {
        const topM = crossed[crossed.length - 1];
        triggerGentleCelebration(`✨ ¡Hito ${topM}% alcanzado en «${g.name}»!`);
      } else {
        showToast(`Meta «${g.name}» actualizada ✓`);
      }
      return { prevPct, nextPct, crossed };
    }

    // ----------------------------------------------------------------------------
    // 6B. ADVANCED GOAL CREATION & INTERACTIVE SLIDER SIMULATOR MODALS
    // ----------------------------------------------------------------------------
    let newGoalDraftKind = 'savings';

    function openAdvancedGoalModal(kind = 'savings') {
      newGoalDraftKind = kind;
      const p2p = typeof computeP2PMetrics === 'function' ? computeP2PMetrics() : { totalQueDebo: 0 };

      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Nueva Meta Inteligente</h3>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="grid grid-cols-3 bg-surface-container p-1 rounded-xl gap-1">
            <button onclick="openAdvancedGoalModal('savings')" class="py-2 rounded-lg text-xs font-extrabold transition ${kind === 'savings' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">🎯 Ahorro</button>
            <button onclick="openAdvancedGoalModal('reduction')" class="py-2 rounded-lg text-xs font-extrabold transition ${kind === 'reduction' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">📉 Reducción</button>
            <button onclick="openAdvancedGoalModal('debt_zero')" class="py-2 rounded-lg text-xs font-extrabold transition ${kind === 'debt_zero' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">🕊️ Deuda 0</button>
          </div>

          ${kind === 'savings' ? `
            <input id="adv-g-name" type="text" placeholder="Ej. Viaje a Japón, Fondo de emergencia..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Objetivo (${esc(currencySymbol())})</label>
                <input id="adv-g-target" type="number" step="50" placeholder="2400" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-on-surface"/>
              </div>
              <div>
                <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Ya ahorrado</label>
                <input id="adv-g-saved" type="number" step="10" value="0" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-on-surface"/>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Aportación mensual</label>
                <input id="adv-g-monthly" type="number" step="10" value="150" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-on-surface"/>
              </div>
              <div>
                <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Fecha objetivo (opc.)</label>
                <input id="adv-g-deadline" type="date" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
              </div>
            </div>
          ` : kind === 'reduction' ? `
            <input id="adv-g-name" type="text" placeholder="Ej. Bajar gasto en Restaurantes un 20%" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Categoría</label>
                <select id="adv-g-cat" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                  ${allCats().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Reducir (%)</label>
                <input id="adv-g-redpct" type="number" min="5" max="70" value="20" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-on-surface"/>
              </div>
            </div>
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Gasto mensual habitual actual (${esc(currencySymbol())})</label>
              <input id="adv-g-base" type="number" step="10" value="200" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-on-surface"/>
            </div>
          ` : `
            <div class="p-3.5 rounded-2xl bg-secondary/10 border border-secondary/25 text-xs text-on-surface">
              Tus deudas activas actuales («Debo»): <strong class="text-secondary">${fmt(p2p.totalQueDebo)}</strong>. Esta meta se actualiza sola cada vez que saldas un pago.
            </div>
            <input id="adv-g-name" type="text" value="Plan Deuda Cero" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Deuda inicial (${esc(currencySymbol())})</label>
                <input id="adv-g-initdebt" type="number" step="10" value="${Math.max(100, Math.round(p2p.totalQueDebo || 0))}" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-on-surface"/>
              </div>
              <div>
                <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Pago mensual planificado</label>
                <input id="adv-g-monthly" type="number" step="10" value="100" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-on-surface"/>
              </div>
            </div>
          `}

          <button onclick="saveAdvancedGoal()" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-sm active-scale">
            Crear meta ✓
          </button>
        </div>
      `);
    }

    function saveAdvancedGoal() {
      const kind = newGoalDraftKind;
      if (!Array.isArray(S.goals)) S.goals = [];

      if (kind === 'reduction') {
        const cat = $('#adv-g-cat')?.value || 'ocio';
        const redPct = Math.max(5, Math.min(70, parseInt($('#adv-g-redpct')?.value || '20', 10)));
        const baseAmt = Math.max(10, parseAmount($('#adv-g-base')?.value || '200'));
        const name = ($('#adv-g-name')?.value || '').trim() || `Reducir ${catById(cat).name} un ${redPct}%`;
        S.goals.push({
          id: uid(),
          kind: 'reduction',
          name,
          cat,
          reductionPct: redPct,
          baselineAmount: baseAmt,
          target: Math.round(baseAmt * (1 - redPct / 100) * 100) / 100,
          saved: 0,
          createdAt: Date.now()
        });
      } else if (kind === 'debt_zero') {
        const name = ($('#adv-g-name')?.value || '').trim() || 'Plan Deuda Cero';
        const initDebt = Math.max(10, parseAmount($('#adv-g-initdebt')?.value || '100'));
        const monthlyPlan = Math.max(10, parseAmount($('#adv-g-monthly')?.value || '100'));
        S.goals.push({
          id: uid(),
          kind: 'debt_zero',
          name,
          initialDebt: initDebt,
          target: initDebt,
          saved: 0,
          monthlyPlan,
          createdAt: Date.now()
        });
      } else {
        const name = ($('#adv-g-name')?.value || '').trim() || 'Nueva meta';
        const target = parseAmount($('#adv-g-target')?.value);
        const saved = parseAmount($('#adv-g-saved')?.value);
        const monthlyPlan = Math.max(0, parseAmount($('#adv-g-monthly')?.value));
        const deadline = $('#adv-g-deadline')?.value || '';
        if (!(target > 0)) { showToast('Indica un importe objetivo mayor que 0'); return; }
        S.goals.push({
          id: uid(),
          kind: 'savings',
          name,
          target,
          saved,
          monthlyPlan,
          deadline,
          contributions: [],
          createdAt: Date.now()
        });
      }

      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast('🎯 Meta inteligente creada ✓');
    }

    function openGoalSimulatorModal(goalId, sliderVal = null) {
      const g = (S.goals || []).find(x => x.id === goalId);
      if (!g) return;
      const baseProj = computeGoalProjection(g);
      const curMonthly = Math.max(10, Math.round(Money.fromCents(baseProj.monthlyRateCents || 10000)));
      const simMonthly = sliderVal !== null ? Math.max(10, Number(sliderVal)) : curMonthly;
      const simProj = computeGoalProjection(g, Money.toCents(simMonthly));
      const maxSlider = Math.max(500, Math.round((g.target || 1000) / 2));
      const monthsSaved = (baseProj.monthsNeeded && simProj.monthsNeeded)
        ? baseProj.monthsNeeded - simProj.monthsNeeded
        : 0;

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Simulador · ${esc(g.name)}</h3>
              <p class="text-[11px] text-on-surface-variant">Mueve el deslizador para ver cuándo llegarás</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="p-4 rounded-2xl hero-indigo text-white flex flex-col gap-1.5">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-100">Fecha estimada con ${fmt0(simMonthly)}/mes</span>
            <p id="goal-sim-eta" class="font-headline-md text-2xl font-extrabold capitalize">${esc(simProj.etaLabel)}</p>
            <p id="goal-sim-delta" class="text-xs text-indigo-100/90">
              ${simProj.remainingCents <= 0
                ? '¡Ya alcanzaste el 100%!'
                : `Te faltan ${fmt(Money.fromCents(simProj.remainingCents))} · ${simProj.monthsNeeded} mes(es)${monthsSaved > 0 ? ` (${monthsSaved} mes(es) antes)` : monthsSaved < 0 ? ` (${Math.abs(monthsSaved)} mes(es) más tarde)` : ''}`}
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-xs font-extrabold">
              <span class="text-on-surface-variant">¿Y si aporto al mes...</span>
              <span id="goal-sim-val" class="text-primary text-base tabular-nums">${fmt0(simMonthly)}/mes</span>
            </div>
            <input id="goal-sim-slider" type="range" min="10" max="${maxSlider}" step="10" value="${simMonthly}"
              oninput="updateGoalSimulatorLive('${g.id}', this.value)"
              class="w-full accent-indigo-600 cursor-pointer"/>
            <div class="flex justify-between text-[10px] text-on-surface-variant font-bold">
              <span>${fmt0(10)}/mes</span>
              <span>${fmt0(Math.round(maxSlider / 2))}/mes</span>
              <span>${fmt0(maxSlider)}/mes</span>
            </div>
          </div>

          <!-- 25 / 50 / 75 / 100% Milestones Strip -->
          <div class="grid grid-cols-4 gap-2">
            ${simProj.milestones.map(m => `
              <div class="p-2 rounded-xl text-center border ${m.reached ? 'bg-secondary/15 border-secondary/35 text-secondary' : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant'}">
                <span class="text-xs font-extrabold block">${m.reached ? '✓' : '○'} ${m.pct}%</span>
              </div>
            `).join('')}
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button onclick="saveGoalMonthlyPlan('${g.id}', Number($('#goal-sim-slider')?.value || ${simMonthly}))" class="py-2.5 px-3 rounded-xl bg-primary text-on-primary font-extrabold text-xs active-scale">
              Fijar ritmo mensual
            </button>
            <button onclick="closeUniversalModal(); openGoalMoveModal('${g.id}', 1)" class="py-2.5 px-3 rounded-xl bg-secondary/15 text-secondary font-extrabold text-xs active-scale">
              + Aportar ahora
            </button>
          </div>
        </div>
      `);
    }

    function updateGoalSimulatorLive(goalId, val) {
      const g = (S.goals || []).find(x => x.id === goalId);
      if (!g) return;
      const monthly = Math.max(10, Number(val || 10));
      const baseProj = computeGoalProjection(g);
      const simProj = computeGoalProjection(g, Money.toCents(monthly));
      const diff = (baseProj.monthsNeeded && simProj.monthsNeeded) ? baseProj.monthsNeeded - simProj.monthsNeeded : 0;

      const valEl = $('#goal-sim-val');
      const etaEl = $('#goal-sim-eta');
      const deltaEl = $('#goal-sim-delta');
      if (valEl) valEl.textContent = `${fmt0(monthly)}/mes`;
      if (etaEl) etaEl.textContent = simProj.etaLabel;
      if (deltaEl) {
        deltaEl.textContent = simProj.remainingCents <= 0
          ? '¡Ya alcanzaste el 100%!'
          : `Te faltan ${fmt(Money.fromCents(simProj.remainingCents))} · ${simProj.monthsNeeded} mes(es)${diff > 0 ? ` (${diff} mes(es) antes ✨)` : diff < 0 ? ` (${Math.abs(diff)} mes(es) más tarde)` : ''}`;
      }
    }

    function saveGoalMonthlyPlan(goalId, monthlyAmount) {
      const g = (S.goals || []).find(x => x.id === goalId);
      if (!g) return;
      g.monthlyPlan = Math.max(10, Number(monthlyAmount || 50));
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast(`Ritmo mensual fijado en ${fmt0(g.monthlyPlan)}/mes ✓`);
    }

    // ----------------------------------------------------------------------------
    // 6C. OPTIONAL SELF-ONLY CHALLENGES ENGINE (Zero Rankings, Zero Guilt)
    // ----------------------------------------------------------------------------
    function evaluateChallengeProgress(ch, baseDate = new Date()) {
      const mk = ch.monthKey || monthKey(dstr(baseDate));
      const exps = monthExpenses(mk);
      const incTotal = monthIncomeTotal(mk);
      const expTotal = sumExp(exps);

      if (ch.kind === 'no_spend_days') {
        const [Y, M] = mk.split('-').map(Number);
        const dim = new Date(Y, M, 0).getDate();
        const isCur = mk === monthKey(dstr(baseDate));
        const maxDay = isCur ? baseDate.getDate() : dim;
        const spendDays = new Set(exps.filter(e => e.cat !== 'susc' && e.cat !== 'hogar').map(e => e.date));
        let noSpend = 0;
        for (let d = 1; d <= maxDay; d++) {
          const ds = `${mk}-${String(d).padStart(2, '0')}`;
          if (!spendDays.has(ds)) noSpend++;
        }
        const target = Math.max(1, Number(ch.targetValue || 7));
        const pct = Math.min(100, Math.round((noSpend / target) * 100));
        const completed = noSpend >= target;
        return {
          currentLabel: `${noSpend} de ${target} días sin gasto`,
          pct,
          completed,
          statusTone: completed ? 'completed' : 'active',
          gentleNote: completed ? '¡Reto conseguido a tu ritmo! ✨' : `Te faltan ${target - noSpend} día(s) tranquilo(s) este mes.`
        };
      }

      if (ch.kind === 'keyword_cap' || ch.kind === 'category_cap') {
        const kws = (ch.keywords || []).map(k => k.toLowerCase());
        const matched = exps.filter(e => {
          if (ch.kind === 'category_cap') return e.cat === ch.cat;
          const txt = `${e.note || ''} ${catById(e.cat).name}`.toLowerCase();
          return kws.some(k => txt.includes(k));
        });
        const spentCents = Money.toCents(sumExp(matched));
        const maxCents = Math.max(100, Number(ch.maxCents || 3000));
        const underCap = spentCents <= maxCents;
        const pct = underCap ? Math.min(100, Math.round(((maxCents - spentCents) / maxCents) * 100)) : 0;
        const isMonthEnded = mk < monthKey(dstr(baseDate));
        return {
          currentLabel: `${fmt(Money.fromCents(spentCents))} de máx. ${fmt(Money.fromCents(maxCents))}`,
          pct: underCap ? Math.max(15, 100 - Math.round((spentCents / maxCents) * 100)) : 100,
          completed: underCap && (isMonthEnded || spentCents === 0),
          overLimit: !underCap,
          statusTone: underCap ? 'active' : 'gentle',
          gentleNote: underCap
            ? `Margen disponible: ${fmt(Money.fromCents(maxCents - spentCents))}. ¡Vas genial!`
            : `¡Casi! Llevas ${fmt(Money.fromCents(spentCents))}. Sin estrés: siempre puedes reintentarlo el mes que viene.`
        };
      }

      if (ch.kind === 'savings_rate') {
        const targetPct = Math.max(5, Number(ch.targetPct || 20));
        const rate = incTotal > 0 ? Math.round(((incTotal - expTotal) / incTotal) * 100) : 0;
        const completed = rate >= targetPct;
        return {
          currentLabel: `Tasa actual: ${rate}% (meta ${targetPct}%)`,
          pct: Math.max(0, Math.min(100, Math.round((Math.max(0, rate) / targetPct) * 100))),
          completed,
          statusTone: completed ? 'completed' : 'active',
          gentleNote: completed ? `¡Superaste el ${targetPct}% de ahorro! 💎` : `Cada pequeño ajuste te acerca al ${targetPct}%.`
        };
      }

      if (ch.kind === 'goal_contributions') {
        const target = Math.max(1, Number(ch.targetValue || 3));
        let count = 0;
        (S.goals || []).forEach(g => {
          (g.contributions || []).forEach(c => {
            if (monthKey(c.date) === mk) count++;
          });
        });
        const completed = count >= target;
        return {
          currentLabel: `${count} de ${target} aportaciones este mes`,
          pct: Math.min(100, Math.round((count / target) * 100)),
          completed,
          statusTone: completed ? 'completed' : 'active',
          gentleNote: completed ? '¡Constancia conseguida! 🚀' : `Aporta cualquier cantidad a una meta para sumar.`
        };
      }

      return { currentLabel: 'En marcha', pct: 0, completed: false, statusTone: 'active', gentleNote: '' };
    }

    function openNewChallengeModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Retos contra ti mismo</h3>
              <p class="text-[11px] text-on-surface-variant">100% opcionales · Sin rankings sociales · Sin culpa</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
            ${CHALLENGE_TEMPLATES.map(t => `
              <button onclick="startChallengeFromTemplate('${t.id}')" class="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/35 flex items-center justify-between gap-3 text-left transition active-scale">
                <div class="flex items-start gap-2.5 min-w-0">
                  <span class="text-xl flex-shrink-0">${t.emoji}</span>
                  <div class="min-w-0">
                    <p class="text-xs font-extrabold text-on-surface">${esc(t.title)}</p>
                    <p class="text-[11px] text-on-surface-variant">${esc(t.desc)}</p>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-xl bg-primary/12 text-primary text-[11px] font-extrabold flex-shrink-0">Activar</span>
              </button>
            `).join('')}
          </div>

          <div class="pt-2 border-t border-outline-variant/25 flex flex-col gap-2">
            <p class="text-[10px] font-extrabold uppercase text-on-surface-variant">O crea tu reto personalizado por categoría</p>
            <div class="grid grid-cols-2 gap-2">
              <select id="cust-ch-cat" class="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${allCats().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
              </select>
              <input id="cust-ch-max" type="number" step="5" placeholder="Tope € (ej. 80)" class="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-extrabold text-on-surface"/>
            </div>
            <button onclick="createCustomCategoryChallenge()" class="w-full py-2.5 rounded-xl bg-surface-container text-on-surface font-extrabold text-xs active-scale">
              + Crear reto personalizado
            </button>
          </div>
        </div>
      `);
    }

    function startChallengeFromTemplate(templateId) {
      const tpl = CHALLENGE_TEMPLATES.find(t => t.id === templateId);
      if (!tpl) return;
      if (!Array.isArray(S.challenges)) S.challenges = [];
      S.challenges.unshift({
        ...tpl,
        id: 'ch_' + uid(),
        templateId: tpl.id,
        monthKey: monthKey(todayStr()),
        archived: false,
        startedAt: Date.now()
      });
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast(`${tpl.emoji} Reto «${tpl.title}» activado ✓`);
    }

    function createCustomCategoryChallenge() {
      const cat = $('#cust-ch-cat')?.value || 'ocio';
      const maxAmt = parseAmount($('#cust-ch-max')?.value);
      if (!(maxAmt > 0)) { showToast('Indica un importe máximo mayor que 0'); return; }
      if (!Array.isArray(S.challenges)) S.challenges = [];
      S.challenges.unshift({
        id: 'ch_' + uid(),
        kind: 'category_cap',
        emoji: '🎯',
        title: `${catById(cat).name} bajo ${fmt0(maxAmt)}`,
        desc: `Mantener ${catById(cat).name} por debajo de ${fmt0(maxAmt)} este mes.`,
        cat,
        maxCents: Money.toCents(maxAmt),
        monthKey: monthKey(todayStr()),
        archived: false,
        startedAt: Date.now()
      });
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast('🎯 Reto personalizado creado ✓');
    }

    function deleteChallenge(chId) {
      S.challenges = (S.challenges || []).filter(c => c.id !== chId);
      saveLocalState(true);
      renderAllViews();
      showToast('Reto quitado ✓');
    }

    // ----------------------------------------------------------------------------
    // 6D. SILENT ACHIEVEMENTS / BADGES SHOWCASE
    // ----------------------------------------------------------------------------
    function computeUnlockedBadges(baseDate = new Date()) {
      const curMk = monthKey(dstr(baseDate));
      const expsAll = S?.expenses || [];
      const incsAll = S?.incomes || [];
      const goals = S?.goals || [];
      const challenges = S?.challenges || [];
      const streakDays = Math.max(S?.streak?.best || 0, typeof computeControlStreak === 'function' ? computeControlStreak().days : 0);
      const curInc = monthIncomeTotal(curMk);
      const curExp = sumExp(monthExpenses(curMk));
      const curBudget = totalMonthlyBudget();
      const savingsRate = curInc > 0 ? ((curInc - curExp) / curInc) * 100 : 0;
      const p2p = typeof computeP2PMetrics === 'function' ? computeP2PMetrics() : { totalQueDebo: 0 };
      const hadSettledDebt = (S?.debts || []).some(d => d.settled);

      const goalProjs = goals.map(g => computeGoalProjection(g, null, baseDate));
      const anyChallengeDone = challenges.some(c => evaluateChallengeProgress(c, baseDate).completed);

      const checks = {
        first_tx:          (expsAll.length + incsAll.length) >= 1,
        budget_keeper:     curBudget > 0 && curExp > 0 && curExp <= curBudget,
        streak_7:          streakDays >= 7,
        streak_30:         streakDays >= 30,
        debt_free:         (p2p.totalQueDebo <= 0.005) && hadSettledDebt,
        savings_rate_20:   curInc > 0 && savingsRate >= 20,
        goal_milestone_50: goalProjs.some(p => p.pct >= 50),
        goal_completed:    goalProjs.some(p => p.pct >= 100),
        smart_scanner:     (S?.receipts || []).length >= 1,
        challenge_winner:  anyChallengeDone
      };

      return BADGE_CATALOG.map(b => ({ ...b, unlocked: !!checks[b.id] }));
    }

    function toggleConfettiSetting() {
      if (!S?.settings) return;
      S.settings.confettiEnabled = S.settings.confettiEnabled === false ? true : false;
      saveLocalState(true);
      renderAllViews();
      showToast(S.settings.confettiEnabled ? '🎉 Celebraciones activadas' : 'Celebraciones discretas (sin confeti)');
    }

    /** Full Fase 6 Hub rendered inside Yo -> Metas y Retos (`obj`) */
    function renderGamificationHubHtml() {
      const goals = S.goals || [];
      const challenges = (S.challenges || []).filter(c => !c.archived);
      const badges = computeUnlockedBadges();
      const unlockedCount = badges.filter(b => b.unlocked).length;
      const confettiOn = S?.settings?.confettiEnabled !== false;

      return `
        <div class="flex flex-col gap-4">
          <!-- 1. ADVANCED GOALS WITH DATED PROJECTION & MILESTONES -->
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface flex items-center gap-2">
                  ${ico('emoji_events', 'text-secondary text-[19px]')}
                  Metas con Proyección Fechada (${goals.length})
                </h3>
                <p class="text-xs text-on-surface-variant">Ahorro, reducción de gasto o deuda cero · Hitos 25 / 50 / 75 / 100%</p>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="toggleConfettiSetting()" class="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-[11px] font-bold active-scale" title="Activar o desactivar confeti en hitos">
                  ${confettiOn ? '🎉 Confeti ON' : '🔕 Discreto'}
                </button>
                <button onclick="openAdvancedGoalModal('savings')" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale">
                  + Nueva Meta
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              ${goals.map(g => {
                const p = computeGoalProjection(g);
                const kindBadge = p.kind === 'reduction' ? '📉 Reducción' : p.kind === 'debt_zero' ? '🕊️ Deuda 0' : '🎯 Ahorro';
                return `
                  <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex flex-col gap-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-primary">${kindBadge}</span>
                        <h4 class="font-label-lg text-sm font-extrabold text-on-surface truncate">${esc(g.name)}</h4>
                      </div>
                      <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full ${p.pct >= 100 ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'} flex-shrink-0">${p.pct}%</span>
                    </div>

                    <div class="flex items-baseline justify-between text-xs">
                      ${p.kind === 'reduction'
                        ? `<span class="font-extrabold text-on-surface tabular-nums privacy-val">${fmt(Money.fromCents(p.currentCents))} <span class="font-normal text-on-surface-variant">de tope ${fmt(Money.fromCents(p.targetCents))}</span></span>`
                        : `<span class="font-extrabold text-on-surface tabular-nums privacy-val">${fmt(Money.fromCents(p.currentCents))} <span class="font-normal text-on-surface-variant">de ${fmt(Money.fromCents(p.targetCents))}</span></span>`
                      }
                      <span class="text-[11px] font-bold text-secondary capitalize">${esc(p.etaLabel)}</span>
                    </div>

                    <div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div class="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style="width:${p.pct}%"></div>
                    </div>

                    <div class="flex items-center justify-between text-[10px] font-bold text-on-surface-variant">
                      ${p.milestones.map(m => `<span class="${m.reached ? 'text-secondary font-extrabold' : ''}">${m.reached ? '●' : '○'} ${m.pct}%</span>`).join('')}
                    </div>

                    <div class="flex items-center gap-1.5 pt-1">
                      ${p.kind !== 'reduction' ? `
                        <button onclick="openGoalSimulatorModal('${g.id}')" class="px-2.5 py-1.5 rounded-xl bg-primary/12 text-primary font-extrabold text-[11px] active-scale">🎛️ Simular</button>
                      ` : ''}
                      ${p.kind === 'savings' ? `
                        <button onclick="openGoalMoveModal('${g.id}', 1)" class="flex-1 py-1.5 rounded-xl bg-secondary/15 text-secondary font-extrabold text-xs active-scale">+ Aportar</button>
                        <button onclick="openGoalMoveModal('${g.id}', -1)" class="py-1.5 px-2.5 rounded-xl bg-surface-container text-on-surface font-bold text-xs">−</button>
                      ` : ''}
                      <button onclick="deleteGoal('${g.id}')" class="p-1.5 text-outline hover:text-tertiary ml-auto">${ico('delete', 'text-[16px]')}</button>
                    </div>
                  </div>`;
              }).join('') || `
                <div class="md:col-span-2 py-8 text-center flex flex-col items-center gap-2 text-on-surface-variant">
                  <p class="text-xs font-extrabold text-on-surface">Crea tu primera meta inteligente</p>
                  <p class="text-[11px] max-w-sm">Ahorro con fecha estimada y slider interactivo, reducción de una categoría o plan Deuda Cero.</p>
                </div>
              `}
            </div>
          </div>

          <!-- 2. OPTIONAL SELF-ONLY CHALLENGES -->
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-3.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface flex items-center gap-2">
                  ${ico('track_changes', 'text-primary text-[19px]')}
                  Retos Personales (${challenges.length})
                </h3>
                <p class="text-xs text-on-surface-variant">Solo tú contra tu propio ritmo · Sin comparaciones ni presión</p>
              </div>
              <button onclick="openNewChallengeModal()" class="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold active-scale">
                + Activar reto
              </button>
            </div>

            ${challenges.length > 0 ? `
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${challenges.map(ch => {
                  const ev = evaluateChallengeProgress(ch);
                  return `
                    <div class="p-3.5 rounded-2xl border ${ev.completed ? 'bg-secondary/10 border-secondary/30' : 'bg-surface-container-low border-outline-variant/35'} flex flex-col gap-2">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-lg">${ch.emoji || '🎯'}</span>
                          <div class="min-w-0">
                            <p class="text-xs font-extrabold text-on-surface truncate">${esc(ch.title)}</p>
                            <p class="text-[11px] font-bold text-primary">${esc(ev.currentLabel)}</p>
                          </div>
                        </div>
                        <button onclick="deleteChallenge('${ch.id}')" class="text-outline hover:text-tertiary p-1">${ico('close', 'text-[15px]')}</button>
                      </div>
                      <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                        <div class="h-full rounded-full ${ev.overLimit ? 'bg-amber-500' : 'bg-secondary'} transition-all" style="width:${ev.pct}%"></div>
                      </div>
                      <p class="text-[11px] text-on-surface-variant">${esc(ev.gentleNote)}</p>
                    </div>`;
                }).join('')}
              </div>
            ` : `
              <p class="text-xs text-on-surface-variant py-4 text-center">No tienes retos activos. Activa uno opcional cuando te apetezca probar un objetivo mensual suave.</p>
            `}
          </div>

          <!-- 3. SILENT ACHIEVEMENTS / BADGES SHOWCASE -->
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-3.5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">🏅 Vitrina de Logros (${unlockedCount}/${badges.length})</h3>
                <p class="text-xs text-on-surface-variant">Se desbloquean en silencio con tus hábitos reales</p>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              ${badges.map(b => `
                <div class="p-3 rounded-2xl border text-center flex flex-col items-center gap-1 ${b.unlocked ? 'bg-secondary/8 border-secondary/30' : 'bg-surface-container-low/60 border-outline-variant/25 opacity-55 grayscale'}">
                  <span class="text-2xl">${b.emoji}</span>
                  <p class="text-[11px] font-extrabold text-on-surface leading-tight">${esc(b.title)}</p>
                  <p class="text-[10px] text-on-surface-variant leading-tight">${esc(b.desc)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
