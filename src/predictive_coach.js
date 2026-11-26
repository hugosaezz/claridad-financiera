    // ============================================================================
    // 2. EXPLAINABLE PREDICTIVE ENGINE, LOCAL AI COACH & NATURAL LANGUAGE SEARCH
    // ============================================================================

    // Seasonal spending multipliers by calendar month (0=Jan .. 11=Dec)
    const SEASONALITY_BY_MONTH = [0.96, 0.94, 0.98, 1.00, 1.00, 1.03, 1.07, 1.09, 1.01, 1.00, 1.04, 1.18];

    function shiftMonthKeyStr(mk, deltaMonths) {
      const [y, m] = String(mk || monthKey(todayStr())).split('-').map(Number);
      const dt = new Date(y, m - 1 + deltaMonths, 1);
      return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    }

    function sumExpCents(list) {
      return (list || []).reduce((acc, e) => {
        if (typeof e.amount_base_cents === 'number') return acc + e.amount_base_cents;
        if (typeof e.amount_cents === 'number') return acc + e.amount_cents;
        return acc + Money.toCents(e.amount || 0);
      }, 0);
    }

    function sumIncCents(list) {
      return (list || []).reduce((acc, i) => {
        if (typeof i.amount_base_cents === 'number') return acc + i.amount_base_cents;
        if (typeof i.amount_cents === 'number') return acc + i.amount_cents;
        return acc + Money.toCents(i.amount || 0);
      }, 0);
    }

    /**
     * Weighted 3-month historical moving average (weights 0.5, 0.3, 0.2) per category and total.
     */
    function computeHistoricalBaseline(mk) {
      const prevMks = [shiftMonthKeyStr(mk, -1), shiftMonthKeyStr(mk, -2), shiftMonthKeyStr(mk, -3)];
      const weights = [0.5, 0.3, 0.2];
      const catTotals = {};
      let activeWeightSum = 0;
      let weightedExpCents = 0;
      let weightedVarIncCents = 0;
      const monthExpSamples = [];

      prevMks.forEach((pmk, idx) => {
        const w = weights[idx];
        const exps = monthExpenses(pmk);
        const expC = sumExpCents(exps);
        const varIncC = sumIncCents(monthIncomes(pmk));
        if (expC > 0 || varIncC > 0) {
          activeWeightSum += w;
          weightedExpCents += expC * w;
          weightedVarIncCents += varIncC * w;
          monthExpSamples.push(expC);
        }
        exps.forEach(e => {
          const c = typeof e.amount_base_cents === 'number' ? e.amount_base_cents : Money.toCents(e.amount || 0);
          catTotals[e.cat] = (catTotals[e.cat] || 0) + c * w;
        });
      });

      const normFactor = activeWeightSum > 0 ? (1 / activeWeightSum) : 0;
      const avgMonthlyExpCents = Math.round(weightedExpCents * normFactor);
      const avgVarIncCents = Math.round(weightedVarIncCents * normFactor);

      const byCategoryAvgCents = {};
      Object.keys(catTotals).forEach(catId => {
        byCategoryAvgCents[catId] = Math.round(catTotals[catId] * normFactor);
      });

      // Compute relative volatility (IQR-like spread) for confidence interval P25/P75
      let volatilityRatio = 0.14;
      if (monthExpSamples.length >= 2 && avgMonthlyExpCents > 0) {
        const mean = monthExpSamples.reduce((a, b) => a + b, 0) / monthExpSamples.length;
        const variance = monthExpSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / monthExpSamples.length;
        const std = Math.sqrt(variance);
        volatilityRatio = Math.max(0.08, Math.min(0.28, (std / Math.max(1, mean)) * 0.674));
      }

      return {
        avgMonthlyExpCents,
        avgVarIncCents,
        byCategoryAvgCents,
        volatilityRatio,
        monthsUsed: monthExpSamples.length
      };
    }

    /**
     * Full End-of-Month Projection (on-device, deterministic, integer cents, with P25/P75 range).
     */
    function computeEndOfMonthProjection(mk) {
      const targetMk = mk || monthKey(todayStr());
      const [Y, M] = targetMk.split('-').map(Number);
      const isCur = targetMk === monthKey(todayStr());
      const isPast = targetMk < monthKey(todayStr());
      const daysInMonth = new Date(Y, M, 0).getDate();
      const currentDay = isCur ? Math.min(daysInMonth, new Date().getDate()) : (isPast ? daysInMonth : 1);
      const daysRemaining = isPast ? 0 : Math.max(0, daysInMonth - currentDay);
      const daysRemainingInclusive = isPast ? 1 : Math.max(1, daysInMonth - currentDay + 1);

      const exps = monthExpenses(targetMk);
      const actualExpCents = sumExpCents(exps);
      const confirmedIncCents = sumIncCents(incomeRows(targetMk));
      const committedRemainingCents = Money.toCents(upcomingRecurringTotal(targetMk));
      const goalsReserveCents = Money.toCents(goalsReserve());
      const safetyBufferCents = Math.max(0, Math.round(Number(S?.settings?.safetyBufferCents || 0)));

      const base = computeHistoricalBaseline(targetMk);
      const seasonMult = SEASONALITY_BY_MONTH[(M - 1) % 12] || 1.0;

      // Expected variable income remaining (conservative: only 35% of historical variable income if still early)
      const expectedExtraIncCents = (!isPast && base.monthsUsed >= 2 && daysRemaining > 5)
        ? Math.round(base.avgVarIncCents * (daysRemaining / daysInMonth) * 0.35)
        : 0;
      const expectedIncomeCents = confirmedIncCents + expectedExtraIncCents;

      // Remaining variable spending trend: blend current month daily pace + weighted 3-month history * seasonality
      const elapsedDays = Math.max(1, currentDay);
      const currentDailyPaceCents = Math.round(actualExpCents / elapsedDays);
      const histDailyCents = base.avgMonthlyExpCents > 0 ? Math.round((base.avgMonthlyExpCents * seasonMult) / daysInMonth) : currentDailyPaceCents;

      // Blend weight favors current month more as month progresses
      const progressRatio = Math.min(1, elapsedDays / daysInMonth);
      const blendedDailyCents = base.avgMonthlyExpCents > 0
        ? Math.round(currentDailyPaceCents * (0.35 + 0.45 * progressRatio) + histDailyCents * (0.65 - 0.45 * progressRatio))
        : currentDailyPaceCents;

      const remainingVariableMidCents = isPast ? 0 : Math.round(blendedDailyCents * daysRemaining);
      const spreadCents = isPast ? 0 : Math.max(
        Math.round(remainingVariableMidCents * base.volatilityRatio),
        remainingVariableMidCents > 0 ? 1500 : 0 // at least 15 EUR band when active
      );

      const projectedTotalExpMidCents = actualExpCents + committedRemainingCents + remainingVariableMidCents;
      const projectedEndMidCents = expectedIncomeCents - projectedTotalExpMidCents;
      const projectedEndLowCents = projectedEndMidCents - spreadCents;  // pessimistic (P75 spend)
      const projectedEndHighCents = projectedEndMidCents + spreadCents; // optimistic (P25 spend)

      // Safe Daily Margin = (current remaining budget after committed + goals + safety buffer) / daysRemainingInclusive
      const availableForVariableCents = confirmedIncCents - actualExpCents - committedRemainingCents - goalsReserveCents - safetyBufferCents;
      const dailySafeCents = Math.round(availableForVariableCents / daysRemainingInclusive);

      let status = 'green';
      if (availableForVariableCents < 0 || projectedEndMidCents < -safetyBufferCents) status = 'red';
      else if (dailySafeCents < 1500 || projectedEndLowCents < 0) status = 'amber';

      return {
        mk: targetMk,
        isCur,
        isPast,
        daysInMonth,
        currentDay,
        daysRemaining,
        daysRemainingInclusive,
        seasonMult,
        expectedIncomeCents,
        confirmedIncCents,
        expectedExtraIncCents,
        actualExpCents,
        committedRemainingCents,
        remainingVariableMidCents,
        goalsReserveCents,
        safetyBufferCents,
        projectedTotalExpMidCents,
        projectedEndMidCents,
        projectedEndLowCents,
        projectedEndHighCents,
        availableForVariableCents,
        dailySafeCents,
        dailyPaceCents: currentDailyPaceCents,
        status,
        monthsHistoryUsed: base.monthsUsed,
        volatilityRatio: base.volatilityRatio
      };
    }

    /**
     * Per-category end-of-month forecast compared to 3-month historical average.
     */
    function computeCategoryProjections(mk) {
      const proj = computeEndOfMonthProjection(mk);
      const base = computeHistoricalBaseline(mk);
      const exps = monthExpenses(mk);
      const byCatMap = {};
      exps.forEach(e => {
        const c = typeof e.amount_base_cents === 'number' ? e.amount_base_cents : Money.toCents(e.amount || 0);
        byCatMap[e.cat] = (byCatMap[e.cat] || 0) + c;
      });

      const progress = Math.max(0.12, proj.currentDay / Math.max(1, proj.daysInMonth));
      const catIds = new Set([...Object.keys(byCatMap), ...Object.keys(base.byCategoryAvgCents)]);
      const results = [];

      catIds.forEach(catId => {
        const spentCents = byCatMap[catId] || 0;
        const avgCents = base.byCategoryAvgCents[catId] || 0;
        if (spentCents === 0 && avgCents === 0) return;

        const linearEst = Math.round(spentCents / progress);
        const estEndCents = proj.isPast
          ? spentCents
          : (avgCents > 0
            ? Math.round(spentCents + Math.max(0, (avgCents * proj.seasonMult) * (1 - progress) * 0.6 + (linearEst - spentCents) * 0.4))
            : linearEst);

        const diffVsAvgCents = avgCents > 0 ? (estEndCents - avgCents) : 0;
        const pctVsAvg = avgCents > 0 ? Math.round((diffVsAvgCents / avgCents) * 100) : null;
        results.push({
          catId,
          cat: catById(catId),
          spentCents,
          estEndCents,
          avgCents,
          diffVsAvgCents,
          pctVsAvg
        });
      });

      return results.sort((a, b) => b.estEndCents - a.estEndCents);
    }

    /**
     * Extended 3 & 6 month savings horizon + dated goal projections.
     */
    function computeExtendedHorizon() {
      const mk = viewMk || monthKey(todayStr());
      const p = computeEndOfMonthProjection(mk);
      const base = computeHistoricalBaseline(mk);
      const monthlyNetCents = p.projectedEndMidCents;
      const avgMonthlyNetCents = base.monthsUsed >= 1
        ? Math.round(((p.confirmedIncCents - base.avgMonthlyExpCents) + monthlyNetCents) / 2)
        : monthlyNetCents;

      const horizon3Cents = avgMonthlyNetCents * 3;
      const horizon6Cents = avgMonthlyNetCents * 6;

      const goalProjections = (S.goals || []).map(g => {
        const targetCents = Money.toCents(g.target || 0);
        const savedCents = Money.toCents(g.saved || 0);
        const remainingCents = Math.max(0, targetCents - savedCents);
        const monthlyContribCents = Math.max(1000, Math.round(Math.max(0, avgMonthlyNetCents) * 0.35) || Math.round(remainingCents / 12));
        const monthsNeeded = remainingCents > 0 ? Math.ceil(remainingCents / Math.max(100, monthlyContribCents)) : 0;
        const boostedMonths = remainingCents > 0 ? Math.ceil(remainingCents / Math.max(100, monthlyContribCents + 3000)) : 0;

        const fmtEta = (mAhead) => {
          if (mAhead <= 0) return '¡Alcanzada!';
          const d = new Date();
          d.setMonth(d.getMonth() + mAhead);
          return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        };

        return {
          id: g.id,
          name: g.name,
          remainingCents,
          monthlyContribCents,
          monthsNeeded,
          etaLabel: fmtEta(monthsNeeded),
          boostedMonths,
          boostedEtaLabel: fmtEta(boostedMonths)
        };
      });

      return { avgMonthlyNetCents, horizon3Cents, horizon6Cents, goalProjections };
    }

    /**
     * Transparency Modal: "¿Cómo se calcula?"
     */
    function openProjectionExplainModal(mk) {
      const p = computeEndOfMonthProjection(mk || viewMk);
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center">${ico('info', 'text-[19px]')}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">¿Cómo calculamos tu previsión?</h3>
                <p class="text-[11px] text-on-surface-variant">100% local, transparente y explicable</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="flex flex-col gap-2 text-xs">
            <div class="p-3 rounded-xl bg-surface-container-low flex justify-between">
              <span class="text-on-surface-variant">Ingresos esperados del mes</span>
              <strong class="text-secondary tabular-nums">+${fmt(Money.fromCents(p.expectedIncomeCents))}</strong>
            </div>
            <div class="p-3 rounded-xl bg-surface-container-low flex justify-between">
              <span class="text-on-surface-variant">Gasto variable ya registrado (día ${p.currentDay})</span>
              <strong class="text-tertiary tabular-nums">−${fmt(Money.fromCents(p.actualExpCents))}</strong>
            </div>
            <div class="p-3 rounded-xl bg-surface-container-low flex justify-between">
              <span class="text-on-surface-variant">Gastos fijos comprometidos pendientes</span>
              <strong class="text-amber-600 tabular-nums">−${fmt(Money.fromCents(p.committedRemainingCents))}</strong>
            </div>
            <div class="p-3 rounded-xl bg-surface-container-low flex justify-between">
              <span class="text-on-surface-variant">Tendencia restante (${p.daysRemaining}d × estacionalidad ×${p.seasonMult.toFixed(2)})</span>
              <strong class="text-on-surface tabular-nums">−${fmt(Money.fromCents(p.remainingVariableMidCents))}</strong>
            </div>
            <div class="p-3 rounded-xl bg-primary/8 border border-primary/25 flex justify-between items-center">
              <span class="font-extrabold text-on-surface">Rango estimado fin de mes (P25–P75)</span>
              <strong class="text-primary font-extrabold tabular-nums">Entre ${fmtSigned(Money.fromCents(p.projectedEndLowCents))} y ${fmtSigned(Money.fromCents(p.projectedEndHighCents))}</strong>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-extrabold text-on-surface">Colchón mínimo intocable (${esc(currencySymbol())})</p>
              <p class="text-[11px] text-on-surface-variant">Se descuenta al calcular tu margen diario seguro</p>
            </div>
            <input type="number" step="50" min="0" value="${Math.round((S?.settings?.safetyBufferCents || 0) / 100)}" onchange="updateSafetyBufferSetting(this.value)" class="w-24 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-right font-extrabold text-xs text-on-surface"/>
          </div>

          <p class="text-[11px] text-outline leading-relaxed">
            <strong>Aviso legal:</strong> Estas proyecciones son estimaciones orientativas calculadas localmente a partir de tus propios movimientos e histórico (${p.monthsHistoryUsed} mes(es) previos). No constituyen asesoramiento financiero regulado.
          </p>
        </div>
      `);
    }

    function updateSafetyBufferSetting(val) {
      if (!S?.settings) return;
      S.settings.safetyBufferCents = Math.max(0, Money.toCents(val || 0));
      saveLocalState(true);
      renderAllViews();
      showToast(`Colchón mínimo actualizado a ${fmt0(Money.fromCents(S.settings.safetyBufferCents))} ✓`);
    }

    // ============================================================================
    // 2B. PROACTIVE COACH ENGINE (Prioritized Insights + Tone + Rescue Plan)
    // ============================================================================
    let activeCoachInsightIdx = 0;

    function getCoachTone() {
      return S?.settings?.coachTone || 'motivador'; // 'motivador' | 'neutro' | 'humor'
    }

    function setCoachTone(tone) {
      if (!S?.settings) return;
      S.settings.coachTone = tone;
      saveLocalState(true);
      renderAllViews();
      showToast(`Tono del Coach: ${tone} ✓`);
    }

    function generateCoachInsights(mk) {
      const targetMk = mk || monthKey(todayStr());
      const p = computeEndOfMonthProjection(targetMk);
      const base = computeHistoricalBaseline(targetMk);
      const catProjs = computeCategoryProjections(targetMk);
      const exps = monthExpenses(targetMk);
      const tone = getCoachTone();
      const insights = [];

      // 1. Structural deficit (consecutive deficit months or severe current deficit)
      let deficitStreak = 0;
      for (let i = 1; i <= 3; i++) {
        const pmk = shiftMonthKeyStr(targetMk, -i);
        const pInc = sumIncCents(incomeRows(pmk));
        const pExp = sumExpCents(monthExpenses(pmk));
        if (pInc > 0 && pExp > pInc) deficitStreak++;
      }
      if (p.confirmedIncCents > 0 && (p.projectedEndMidCents < -5000 || deficitStreak >= 2)) {
        const gap = Math.abs(p.projectedEndMidCents);
        const topVarCat = catProjs.find(c => WANTS.includes(c.catId)) || catProjs[0];
        const cutSuggestion = topVarCat ? Math.round(topVarCat.estEndCents * 0.25) : Math.round(gap * 0.5);
        const recCents = Money.toCents((S.recurring || []).reduce((a, r) => a + Number(r.amount || 0), 0));
        insights.push({
          id: 'deficit_risk',
          priority: 98,
          tone: 'tertiary',
          badge: deficitStreak >= 2 ? `Déficit ${deficitStreak} meses` : 'Plan de rescate',
          title: deficitStreak >= 2
            ? `Llevas ${deficitStreak} meses gastando más de lo que ingresas`
            : `A este ritmo acabarás entre ${fmtSigned(Money.fromCents(p.projectedEndLowCents))} y ${fmtSigned(Money.fromCents(p.projectedEndHighCents))}`,
          body: tone === 'humor'
            ? `Tu cartera pide un pequeño respiro antes de fin de mes 😅. Con un par de ajustes suaves le damos la vuelta sin drama.`
            : `Te propongo recortar ~${fmt0(Money.fromCents(cutSuggestion))} en ${topVarCat ? topVarCat.cat.name : 'gasto variable'}${recCents > 0 ? ` y auditar ${fmt0(Money.fromCents(recCents))}/mes en suscripciones` : ''}.`,
          primaryLabel: 'Abrir Plan de Rescate',
          primaryJs: `openRescuePlanWizard('${targetMk}')`,
          secondaryLabel: 'Simular ajustes',
          secondaryJs: `openWhatIfSimulatorModal('${targetMk}')`
        });
      }

      // 2. Weekday spending pattern detection (e.g. Fridays/Sundays spike)
      if (exps.length >= 5) {
        const dayNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
        const byDow = Array.from({ length: 7 }, () => ({ cents: 0, days: new Set() }));
        exps.forEach(e => {
          const dt = new Date((e.date || todayStr()) + 'T12:00:00');
          if (!isNaN(dt)) {
            const dow = dt.getDay();
            byDow[dow].cents += (typeof e.amount_base_cents === 'number' ? e.amount_base_cents : Money.toCents(e.amount));
            byDow[dow].days.add(e.date);
          }
        });
        let peakDow = -1, peakAvg = 0, totalAvg = 0, activeDowCount = 0;
        byDow.forEach((d, idx) => {
          if (d.days.size > 0) {
            const avg = d.cents / d.days.size;
            totalAvg += avg;
            activeDowCount++;
            if (avg > peakAvg) { peakAvg = avg; peakDow = idx; }
          }
        });
        const overallAvg = activeDowCount > 0 ? totalAvg / activeDowCount : 0;
        if (peakDow >= 0 && peakAvg > overallAvg * 1.45 && peakAvg >= 1500) {
          insights.push({
            id: 'weekday_pattern',
            priority: 72,
            tone: 'primary',
            badge: 'Patrón detectado',
            title: `Los ${dayNames[peakDow]} gastas de media ${fmt0(Money.fromCents(peakAvg))}`,
            body: tone === 'humor'
              ? `Parece que los ${dayNames[peakDow]} tu tarjeta entra en modo fiesta 🎉. ¿Es intencional o le ponemos un límite suave?`
              : `Es un ${Math.round(((peakAvg - overallAvg) / Math.max(1, overallAvg)) * 100)}% más que tu media diaria. Puedes ponerle un presupuesto específico a tu categoría principal.`,
            primaryLabel: 'Ajustar límites',
            primaryJs: `switchMainView('ajustes', 'pres')`,
            secondaryLabel: 'Ver heatmap',
            secondaryJs: `switchMainView('analitica')`
          });
        }
      }

      // 3. Category victory (spending >=15% less than 3-month average)
      const bestVictory = catProjs.find(c => c.avgCents >= 3000 && c.pctVsAvg !== null && c.pctVsAvg <= -15);
      if (bestVictory) {
        const savedCents = Math.abs(bestVictory.diffVsAvgCents);
        insights.push({
          id: 'cat_victory',
          priority: 65,
          tone: 'secondary',
          badge: 'Victoria del mes 🎉',
          title: `Gastas un ${Math.abs(bestVictory.pctVsAvg)}% menos en ${bestVictory.cat.name}`,
          body: `Son ~${fmt0(Money.fromCents(savedCents))} menos que tu media habitual que se quedan contigo este mes.`,
          primaryLabel: 'Mover a una meta',
          primaryJs: `switchMainView('ajustes', 'obj')`,
          secondaryLabel: 'Ver Stats',
          secondaryJs: `switchMainView('analitica')`
        });
      }

      // 4. Subscriptions audit opportunity
      const recTotalCents = Money.toCents((S.recurring || []).reduce((a, r) => a + Number(r.amount || 0), 0));
      if ((S.recurring || []).length >= 2 && recTotalCents >= 2000) {
        insights.push({
          id: 'subs_opportunity',
          priority: 58,
          tone: 'primary',
          badge: 'Oportunidad',
          title: `Tus ${(S.recurring || []).length} suscripciones suman ${fmt0(Money.fromCents(recTotalCents))}/mes`,
          body: `Al año son ${fmt0(Money.fromCents(recTotalCents * 12))}. Revisa si sigues aprovechando todas ellas.`,
          primaryLabel: 'Revisar suscripciones',
          primaryJs: `switchMainView('ajustes', 'rec')`,
          secondaryLabel: 'Preguntar al Coach',
          secondaryJs: `openCoachChatModal()`
        });
      }

      // 5. Fallback / Welcome healthy insight
      if (insights.length === 0) {
        if (p.confirmedIncCents === 0 && p.actualExpCents === 0) {
          insights.push({
            id: 'start_tip',
            priority: 50,
            tone: 'primary',
            badge: 'Primer paso',
            title: 'Activa tu copiloto en 10 segundos',
            body: 'Añade tu nómina aproximada o registra tu primer gasto para desbloquear tu margen diario seguro y las proyecciones.',
            primaryLabel: 'Configurar nómina',
            primaryJs: `switchMainView('ajustes', 'ingresos')`,
            secondaryLabel: 'Chat con Coach',
            secondaryJs: `openCoachChatModal()`
          });
        } else {
          insights.push({
            id: 'healthy_pace',
            priority: 45,
            tone: 'secondary',
            badge: 'Buen ritmo ✓',
            title: `Hoy puedes gastar ${fmt0(Money.fromCents(Math.max(0, p.dailySafeCents)))} sin comprometer tu mes`,
            body: `Cierre previsto entre ${fmtSigned(Money.fromCents(p.projectedEndLowCents))} y ${fmtSigned(Money.fromCents(p.projectedEndHighCents))}.`,
            primaryLabel: '¿Cómo se calcula?',
            primaryJs: `openProjectionExplainModal('${targetMk}')`,
            secondaryLabel: 'Chat con Coach',
            secondaryJs: `openCoachChatModal()`
          });
        }
      }

      return insights.sort((a, b) => b.priority - a.priority);
    }

    function rotateCoachInsight() {
      activeCoachInsightIdx++;
      renderAllViews();
    }

    // ============================================================================
    // 2C. INTERACTIVE WHAT-IF SIMULATOR (Sliders adjust end-of-month live!)
    // ============================================================================
    let whatIfDeltasCents = {};

    function openWhatIfSimulatorModal(mk) {
      const targetMk = mk || viewMk;
      whatIfDeltasCents = {};
      renderWhatIfSimulatorModal(targetMk);
    }

    function renderWhatIfSimulatorModal(mk) {
      const p = computeEndOfMonthProjection(mk);
      const catProjs = computeCategoryProjections(mk).slice(0, 5);
      const totalReductionCents = Object.values(whatIfDeltasCents).reduce((a, b) => a + b, 0);
      const simEndCents = p.projectedEndMidCents + totalReductionCents;

      const slidersHtml = catProjs.map(cp => {
        const maxCut = Math.max(2000, Math.round(cp.estEndCents * 0.7));
        const curCut = whatIfDeltasCents[cp.catId] || 0;
        return `
          <div class="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-extrabold text-on-surface flex items-center gap-1.5">
                <span style="color:${cp.cat.c}">${ico(cp.cat.icon, 'text-[15px]')}</span>
                ${esc(cp.cat.name)}
              </span>
              <span class="font-extrabold text-secondary tabular-nums">${curCut > 0 ? `−${fmt0(Money.fromCents(curCut))}` : 'Sin cambio'}</span>
            </div>
            <input type="range" min="0" max="${maxCut}" step="500" value="${curCut}" oninput="whatIfDeltasCents['${cp.catId}']=Number(this.value); renderWhatIfSimulatorModal('${mk}')" class="w-full accent-primary"/>
            <div class="flex justify-between text-[10px] text-outline">
              <span>Previsto: ${fmt0(Money.fromCents(cp.estEndCents))}</span>
              <span>Nuevo objetivo: ${fmt0(Money.fromCents(Math.max(0, cp.estEndCents - curCut)))}</span>
            </div>
          </div>`;
      }).join('') || `<p class="text-xs text-on-surface-variant text-center py-4">Registra algunos gastos este mes para simular recortes por categoría.</p>`;

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Simulador What-If en tiempo real</h3>
              <p class="text-[11px] text-on-surface-variant">Mueve los sliders y mira cómo cambia tu cierre de mes</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="p-4 rounded-2xl ${simEndCents >= 0 ? 'hero-emerald' : 'hero-indigo'} text-white flex items-center justify-between gap-2">
            <div>
              <p class="text-[10px] font-extrabold uppercase text-white/80">Saldo estimado con tus ajustes</p>
              <p class="text-2xl font-extrabold tabular-nums mt-0.5">${fmtSigned(Money.fromCents(simEndCents))}</p>
              <p class="text-[11px] text-white/85 mt-0.5">${totalReductionCents > 0 ? `Ahorras +${fmt0(Money.fromCents(totalReductionCents))} extra respecto al ritmo actual` : 'Desliza cualquier categoría para probar'}</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-white/20 text-xs font-extrabold">${simEndCents >= 0 ? 'Positivo ✓' : 'Ajustar más'}</span>
          </div>

          <div class="flex flex-col gap-2.5 max-h-72 overflow-y-auto">${slidersHtml}</div>

          ${totalReductionCents > 0 ? `
            <button onclick="applyWhatIfAsBudgets('${mk}')" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-sm active-scale">
              Aplicar estos objetivos a mis presupuestos ✓
            </button>
          ` : ''}
        </div>
      `);
    }

    function applyWhatIfAsBudgets(mk) {
      const catProjs = computeCategoryProjections(mk);
      let applied = 0;
      Object.entries(whatIfDeltasCents).forEach(([catId, cutCents]) => {
        if (cutCents > 0) {
          const cp = catProjs.find(c => c.catId === catId);
          if (cp) {
            S.budgets[catId] = Math.max(0, Math.round(Money.fromCents(cp.estEndCents - cutCents)));
            applied++;
          }
        }
      });
      if (applied > 0) {
        saveLocalState(true);
        closeUniversalModal();
        renderAllViews();
        showToast(`✓ ${applied} presupuesto(s) actualizados según tu simulación`);
      }
    }

    // ============================================================================
    // 2D. 3-STEP RESCUE PLAN WIZARD (When month is running hot)
    // ============================================================================
    let rescueStep = 1;
    let rescueCutsCents = {};

    function openRescuePlanWizard(mk) {
      rescueStep = 1;
      rescueCutsCents = {};
      const catProjs = computeCategoryProjections(mk || viewMk).slice(0, 4);
      catProjs.forEach(c => {
        if (WANTS.includes(c.catId)) rescueCutsCents[c.catId] = Math.round(c.estEndCents * 0.2);
      });
      renderRescuePlanWizard(mk || viewMk);
    }

    function renderRescuePlanWizard(mk) {
      const p = computeEndOfMonthProjection(mk);
      const catProjs = computeCategoryProjections(mk).slice(0, 4);
      const totalCutCents = Object.values(rescueCutsCents).reduce((a, b) => a + b, 0);
      const rescuedEndCents = p.projectedEndMidCents + totalCutCents;

      let stepHtml = '';
      if (rescueStep === 1) {
        stepHtml = `
          <div class="p-4 rounded-2xl bg-tertiary/10 border border-tertiary/25 text-xs flex flex-col gap-1.5">
            <p class="font-extrabold text-tertiary">Paso 1 de 3 · Diagnóstico sin dramas</p>
            <p class="text-on-surface leading-relaxed">Al ritmo actual cerrarías ${monthLabel(mk)} cerca de <strong>${fmtSigned(Money.fromCents(p.projectedEndMidCents))}</strong> (quedan ${p.daysRemaining} días). Aquí es donde más margen tienes para ajustar:</p>
          </div>
          <div class="flex flex-col gap-2">
            ${catProjs.map(c => `
              <div class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between text-xs">
                <span class="font-bold text-on-surface flex items-center gap-2"><span style="color:${c.cat.c}">${ico(c.cat.icon, 'text-[16px]')}</span>${esc(c.cat.name)}</span>
                <span class="font-extrabold tabular-nums">Llevas ${fmt0(Money.fromCents(c.spentCents))} → ~${fmt0(Money.fromCents(c.estEndCents))}</span>
              </div>
            `).join('')}
          </div>
          <button onclick="rescueStep=2; renderRescuePlanWizard('${mk}')" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm active-scale">Elegir ajustes →</button>
        `;
      } else if (rescueStep === 2) {
        stepHtml = `
          <div class="p-3.5 rounded-2xl ${rescuedEndCents >= 0 ? 'bg-secondary/12 border-secondary/30 text-secondary' : 'bg-amber-500/12 border-amber-500/30 text-amber-700 dark:text-amber-300'} border text-xs flex justify-between items-center">
            <span class="font-extrabold">Cierre con plan: ${fmtSigned(Money.fromCents(rescuedEndCents))}</span>
            <span class="font-bold">Mejora: +${fmt0(Money.fromCents(totalCutCents))}</span>
          </div>
          <div class="flex flex-col gap-2.5">
            ${catProjs.map(c => {
              const cur = rescueCutsCents[c.catId] || 0;
              const max = Math.max(1500, Math.round(c.estEndCents * 0.6));
              return `
                <div class="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1">
                  <div class="flex justify-between text-xs"><span class="font-bold text-on-surface">${esc(c.cat.name)}</span><strong class="text-secondary">−${fmt0(Money.fromCents(cur))}</strong></div>
                  <input type="range" min="0" max="${max}" step="500" value="${cur}" oninput="rescueCutsCents['${c.catId}']=Number(this.value); renderRescuePlanWizard('${mk}')" class="w-full accent-primary"/>
                </div>`;
            }).join('')}
          </div>
          <div class="flex gap-2">
            <button onclick="rescueStep=1; renderRescuePlanWizard('${mk}')" class="px-4 py-3 rounded-2xl bg-surface-container text-xs font-bold">Atrás</button>
            <button onclick="rescueStep=3; renderRescuePlanWizard('${mk}')" class="flex-1 py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm active-scale">Revisar compromiso →</button>
          </div>
        `;
      } else {
        const newDailyCents = Math.round((p.availableForVariableCents + totalCutCents) / p.daysRemainingInclusive);
        stepHtml = `
          <div class="p-4 rounded-2xl bg-secondary/10 border border-secondary/25 flex flex-col gap-2 text-xs">
            <p class="font-extrabold text-secondary">Paso 3 de 3 · Tu plan realista 💪</p>
            <p class="text-on-surface leading-relaxed">Reduciendo <strong>${fmt0(Money.fromCents(totalCutCents))}</strong> repartidos en tus categorías elegidas, tu cierre previsto pasa a <strong>${fmtSigned(Money.fromCents(rescuedEndCents))}</strong> y tu nuevo objetivo diario es <strong>${fmt0(Money.fromCents(Math.max(0, newDailyCents)))}/día</strong>.</p>
          </div>
          <div class="flex gap-2">
            <button onclick="rescueStep=2; renderRescuePlanWizard('${mk}')" class="px-4 py-3 rounded-2xl bg-surface-container text-xs font-bold">Atrás</button>
            <button onclick="commitRescuePlan('${mk}')" class="flex-1 py-3 rounded-2xl bg-secondary text-white font-extrabold text-sm active-scale">Aceptar plan y ajustar límites ✓</button>
          </div>
        `;
      }

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Plan de Rescate · Paso ${rescueStep}/3</h3>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>
          ${stepHtml}
        </div>
      `);
    }

    function commitRescuePlan(mk) {
      whatIfDeltasCents = { ...rescueCutsCents };
      if (S) {
        S.rescuePlan = { mk, cuts: { ...rescueCutsCents }, createdAt: Date.now() };
      }
      applyWhatIfAsBudgets(mk);
      showToast('💪 Plan de rescate activado. Vamos día a día');
    }

    // ============================================================================
    // 2E. DETERMINISTIC NATURAL LANGUAGE COACH CHAT (100% Local, Zero Hallucinations)
    // ============================================================================
    let coachChatHistory = [];

    function answerCoachQuestionLocally(rawQuestion) {
      const q = String(rawQuestion || '').trim();
      const ql = q.toLowerCase();
      const curMk = viewMk || monthKey(todayStr());

      // Detect target month from question
      let targetMk = curMk;
      let periodDesc = monthLabel(curMk);
      const monthMap = {
        enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
        julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
      };
      if (ql.includes('mes pasado') || ql.includes('anterior')) {
        targetMk = shiftMonthKeyStr(curMk, -1);
        periodDesc = monthLabel(targetMk);
      } else {
        for (const [mName, mNum] of Object.entries(monthMap)) {
          if (ql.includes(mName)) {
            const yr = curMk.slice(0, 4);
            targetMk = `${yr}-${mNum}`;
            periodDesc = monthLabel(targetMk);
            break;
          }
        }
      }

      // 1. Affordability question: "¿Puedo permitirme X de 120€?"
      if (/(permitir|comprar|puedo gastar|me llega|me alcanza)/.test(ql)) {
        const amtMatch = ql.match(/(\d+(?:[.,]\d+)?)/);
        if (amtMatch) {
          const priceCents = Money.toCents(amtMatch[1]);
          const p = computeEndOfMonthProjection(curMk);
          const restCents = p.availableForVariableCents - priceCents;
          if (restCents >= 0) {
            return {
              text: `Sí puedes permitirte ${fmt(Money.fromCents(priceCents))} este mes ✓. Tras esa compra aún te quedarían ${fmt(Money.fromCents(restCents))} de margen disponible (${fmt0(Money.fromCents(Math.round(restCents / p.daysRemainingInclusive)))}/día).`,
              actionLabel: 'Registrar este gasto',
              actionJs: `closeUniversalModal(); openTxModal('exp')`
            };
          }
          return {
            text: `Ahora mismo ese gasto de ${fmt(Money.fromCents(priceCents))} te dejaría ${fmt(Money.fromCents(Math.abs(restCents)))} por debajo de tu margen seguro este mes. Puedes probar a recortar otra categoría en el simulador.`,
            actionLabel: 'Simular recortes',
            actionJs: `openWhatIfSimulatorModal('${curMk}')`
          };
        }
      }

      // 2. Subscriptions question: "¿Cuál es mi suscripción más cara?"
      if (/(suscripci|fijo|recurrente|netflix|spotify)/.test(ql)) {
        const subs = [...(S.recurring || [])].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
        if (subs.length === 0) {
          return { text: 'No tienes suscripciones registradas todavía. Puedes añadirlas en Yo → Suscripciones para que entren en tus previsiones.', actionLabel: 'Añadir suscripción', actionJs: `closeUniversalModal(); openRecurringModal()` };
        }
        const tot = subs.reduce((a, r) => a + Number(r.amount || 0), 0);
        return {
          text: `Tu suscripción más cara es «${subs[0].name}» (${fmt(subs[0].amount)}/mes). En total tienes ${subs.length} suscripciones que suman ${fmt(tot)}/mes (${fmt0(tot * 12)}/año).`,
          actionLabel: 'Gestionar suscripciones',
          actionJs: `closeUniversalModal(); switchMainView('ajustes', 'rec')`
        };
      }

      // 3. Debts / Social question
      if (/(debe|debo|deuda|bizum|social)/.test(ql)) {
        const p2p = computeP2PMetrics();
        return {
          text: `En Social te deben ${fmt(p2p.totalMeDeben)} (${p2p.countMeDeben} cobros) y tú debes ${fmt(p2p.totalQueDebo)} (${p2p.countQueDebo} pagos). Tu balance neto social es ${fmtSigned(p2p.balanceNeto)}.`,
          actionLabel: 'Ir a Social',
          actionJs: `closeUniversalModal(); switchMainView('cuentas', 'balance')`
        };
      }

      // 4. Goals question
      if (/(meta|objetivo|ahorr|jap[oó]n|viaje)/.test(ql)) {
        const h = computeExtendedHorizon();
        if (h.goalProjections.length === 0) {
          return { text: 'Aún no tienes metas de ahorro creadas. Crea una en Yo → Metas y te calcularé la fecha estimada para conseguirla.', actionLabel: 'Crear meta', actionJs: `closeUniversalModal(); openNewGoalModal()` };
        }
        const g = h.goalProjections[0];
        return {
          text: `Para «${g.name}» te faltan ${fmt(Money.fromCents(g.remainingCents))}. Al ritmo estimado llegarías en ${g.etaLabel}; aportando +30 €/mes extra, en ${g.boostedEtaLabel}.`,
          actionLabel: 'Ver metas',
          actionJs: `closeUniversalModal(); switchMainView('ajustes', 'obj')`
        };
      }

      // 5. Daily margin / forecast question
      if (/(margen|hoy puedo|acabar|previsi|fin de mes|sobra|ritmo)/.test(ql)) {
        const p = computeEndOfMonthProjection(curMk);
        return {
          text: `Hoy puedes gastar ${fmt0(Money.fromCents(Math.max(0, p.dailySafeCents)))} sin comprometer tu mes. Estimamos que acabarás entre ${fmtSigned(Money.fromCents(p.projectedEndLowCents))} y ${fmtSigned(Money.fromCents(p.projectedEndHighCents))}.`,
          actionLabel: '¿Cómo se calcula?',
          actionJs: `openProjectionExplainModal('${curMk}')`
        };
      }

      // 6. Category or merchant spending query ("¿Cuánto gasté en restaurantes / comida / mercadona?")
      const exps = ql.includes('año') || ql.includes('verano')
        ? (S.expenses || []).filter(e => String(e.date || '').startsWith(curMk.slice(0, 4)))
        : monthExpenses(targetMk);
      const matchedCat = allCats().find(c => ql.includes(c.name.toLowerCase()) || ql.includes(c.id))
        || (/(restaur|cena|bar|delivery|comer fuera)/.test(ql) ? catById('ocio')
        : /(super|mercadona|comida|compra)/.test(ql) ? catById('comida')
        : /(gasolina|metro|uber|transporte)/.test(ql) ? catById('transporte') : null);

      if (matchedCat) {
        const filtered = exps.filter(e => e.cat === matchedCat.id);
        const sumC = sumExpCents(filtered);
        return {
          text: `En ${matchedCat.name} (${ql.includes('año') ? 'este año' : periodDesc}) llevas ${fmt(Money.fromCents(sumC))} repartidos en ${filtered.length} movimiento(s).`,
          actionLabel: 'Ver movimientos',
          actionJs: `closeUniversalModal(); movFilter.cat='${matchedCat.id}'; switchMainView('gastos')`
        };
      }

      // 7. Generic merchant/keyword lookup or total summary
      const tokens = ql.replace(/[¿?¡!.,]/g, '').split(/\s+/).filter(w => w.length >= 4 && !['cuanto', 'cuánto', 'gaste', 'gasté', 'gastado', 'este', 'pasado', 'mes'].includes(w));
      if (tokens.length > 0) {
        const matchedByWord = (S.expenses || []).filter(e => tokens.some(t => String(e.note || '').toLowerCase().includes(t)));
        if (matchedByWord.length > 0) {
          const sumC = sumExpCents(matchedByWord);
          return {
            text: `He encontrado ${matchedByWord.length} gasto(s) relacionados con «${tokens[0]}» por un total de ${fmt(Money.fromCents(sumC))}.`,
            actionLabel: 'Filtrar en movimientos',
            actionJs: `closeUniversalModal(); movFilter.q='${esc(tokens[0])}'; switchMainView('gastos')`
          };
        }
      }

      const p = computeEndOfMonthProjection(targetMk);
      return {
        text: `En ${periodDesc} llevas ${fmt(Money.fromCents(p.actualExpCents))} gastados y ${fmt(Money.fromCents(p.confirmedIncCents))} de ingresos. Pregúntame por una categoría, un comercio, una suscripción o si te puedes permitir una compra concreta.`,
        actionLabel: 'Abrir simulador',
        actionJs: `openWhatIfSimulatorModal('${targetMk}')`
      };
    }

    function openCoachChatModal() {
      if (coachChatHistory.length === 0) {
        coachChatHistory.push({
          role: 'coach',
          text: '¡Hola! Soy tu Coach financiero 100% local (tus datos nunca salen de tu dispositivo). Pregúntame sobre tus gastos, suscripciones, metas o si puedes permitirte una compra.'
        });
      }
      renderCoachChatModal();
    }

    function sendCoachChatPrompt(presetText = null) {
      const inp = $('#coach-chat-input');
      const q = (presetText || inp?.value || '').trim();
      if (!q) return;
      coachChatHistory.push({ role: 'user', text: q });
      const ans = answerCoachQuestionLocally(q);
      coachChatHistory.push({ role: 'coach', ...ans });
      renderCoachChatModal();
    }

    function renderCoachChatModal() {
      const quickChips = [
        '¿Cuál es mi margen hoy?',
        '¿Puedo permitirme algo de 120€?',
        '¿Cuál es mi suscripción más cara?',
        '¿Cuánto gasté en restaurantes?',
        '¿Quién me debe dinero?'
      ];
      openUniversalModal(`
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-xl hero-indigo text-white flex items-center justify-center">${ico('auto_awesome', 'text-[18px]')}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Chat con tu Coach</h3>
                <p class="text-[10px] text-secondary font-extrabold">🔒 100% local · Consultas exactas sobre tus datos</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="flex items-center gap-1.5 text-[10px] font-bold">
            <span class="text-on-surface-variant">Tono:</span>
            ${['motivador', 'neutro', 'humor'].map(t => `
              <button onclick="setCoachTone('${t}'); renderCoachChatModal()" class="px-2.5 py-1 rounded-full capitalize transition ${getCoachTone() === t ? 'bg-primary text-on-primary font-extrabold' : 'bg-surface-container-low text-on-surface-variant'}">${t}</button>
            `).join('')}
          </div>

          <div id="coach-chat-log" class="flex flex-col gap-2.5 max-h-64 overflow-y-auto p-1">
            ${coachChatHistory.map(m => m.role === 'user'
              ? `<div class="self-end max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-primary text-on-primary text-xs font-bold">${esc(m.text)}</div>`
              : `<div class="self-start max-w-[90%] p-3 rounded-2xl rounded-bl-sm bg-surface-container-low border border-outline-variant/35 text-xs text-on-surface flex flex-col gap-2">
                   <p class="leading-relaxed">${esc(m.text)}</p>
                   ${m.actionLabel ? `<button onclick="${m.actionJs}" class="self-start px-3 py-1.5 rounded-xl bg-primary/12 text-primary font-extrabold text-[11px] hover:bg-primary/20 transition">${esc(m.actionLabel)} →</button>` : ''}
                 </div>`
            ).join('')}
          </div>

          <div class="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-0.5">
            ${quickChips.map(ch => `<button onclick="sendCoachChatPrompt('${esc(ch)}')" class="px-2.5 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/35 text-[11px] font-bold text-on-surface flex-shrink-0">${esc(ch)}</button>`).join('')}
          </div>

          <div class="flex items-center gap-2">
            <input id="coach-chat-input" type="text" placeholder="Pregunta sobre tus finanzas..." onkeydown="if(event.key==='Enter') sendCoachChatPrompt()" class="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/45 text-xs font-bold text-on-surface outline-none focus:border-primary"/>
            <button onclick="sendCoachChatPrompt()" class="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-extrabold text-xs active-scale">Enviar</button>
          </div>
        </div>
      `);
      setTimeout(() => {
        const log = $('#coach-chat-log');
        if (log) log.scrollTop = log.scrollHeight;
      }, 30);
    }

    // ============================================================================
    // 2F. UNIVERSAL NATURAL LANGUAGE SEARCH & SAVED FILTER VIEWS
    // ============================================================================
    function parseNaturalLanguageSearch(query) {
      const raw = String(query || '').trim();
      const ql = raw.toLowerCase();
      const filters = { minCents: null, maxCents: null, catId: null, monthNum: null, keyword: '' };

      // Extract ">50€", "más de 50", "<20€", "menos de 20"
      const gt = ql.match(/(?:>|m[aá]s de|mayor(?:es)? (?:de|que))\s*(\d+(?:[.,]\d+)?)/);
      if (gt) filters.minCents = Money.toCents(gt[1]);
      const lt = ql.match(/(?:<|menos de|menor(?:es)? (?:de|que))\s*(\d+(?:[.,]\d+)?)/);
      if (lt) filters.maxCents = Money.toCents(lt[1]);

      // Extract month name
      const months = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
      for (const [mName, mNum] of Object.entries(months)) {
        if (ql.includes(mName)) { filters.monthNum = mNum; break; }
      }

      // Extract category
      const matchedCat = allCats().find(c => ql.includes(c.name.toLowerCase()) || ql.includes(c.id))
        || (/(restaur|bar|cena|ocio)/.test(ql) ? catById('ocio')
        : /(super|comida|alimenta)/.test(ql) ? catById('comida')
        : /(gasolina|transporte|metro)/.test(ql) ? catById('transporte') : null);
      if (matchedCat) filters.catId = matchedCat.id;

      // Remaining clean keyword
      let cleaned = ql
        .replace(/(?:>|m[aá]s de|mayor(?:es)? (?:de|que)|<|menos de|menor(?:es)? (?:de|que))\s*\d+(?:[.,]\d+)?\s*(?:€|euros?)?/g, '')
        .replace(/\b(gastos?|ingresos?|en|de|del|los|las|el|la|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/g, ' ')
        .replace(/\s+/g, ' ').trim();
      if (matchedCat && (cleaned === matchedCat.id || cleaned.includes('restaur'))) cleaned = '';
      filters.keyword = cleaned;

      return filters;
    }

    function runUniversalSearch(query) {
      const raw = String(query || '').trim();
      if (!raw) return { filters: null, transactions: [], debts: [], groups: [] };
      const f = parseNaturalLanguageSearch(raw);
      const ql = raw.toLowerCase();

      const transactions = (S.expenses || []).filter(e => {
        const c = typeof e.amount_base_cents === 'number' ? e.amount_base_cents : Money.toCents(e.amount || 0);
        if (f.minCents !== null && c < f.minCents) return false;
        if (f.maxCents !== null && c > f.maxCents) return false;
        if (f.catId && e.cat !== f.catId) return false;
        if (f.monthNum && String(e.date || '').slice(5, 7) !== f.monthNum) return false;
        if (f.keyword) {
          const hay = `${e.note || ''} ${catById(e.cat).name} ${methodById(e.method).name}`.toLowerCase();
          if (!hay.includes(f.keyword)) return false;
        }
        return true;
      }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const debts = (S.debts || []).filter(d =>
        `${d.person || ''} ${d.note || ''}`.toLowerCase().includes(f.keyword || ql)
      );
      const groups = (S.groups || []).filter(g =>
        `${g.name || ''} ${(g.members || []).join(' ')}`.toLowerCase().includes(f.keyword || ql)
      );

      return { filters: f, transactions, debts, groups };
    }

    function openHeatmapDayModal(dateStr) {
      const dayExps = (S.expenses || []).filter(e => e.date === dateStr);
      const dayIncs = (S.incomes || []).filter(i => i.date === dateStr);
      const mixed = [...dayExps.map(e => ({ ...e, _k: 'exp' })), ...dayIncs.map(i => ({ ...i, _k: 'inc' }))];
      openUniversalModal(`
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${esc(fmtRelativeDateHeader(dateStr))}</h3>
              <p class="text-xs text-on-surface-variant">${dayExps.length} gasto(s) · Total ${fmt(sumExp(dayExps))}</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>
          <div class="rounded-2xl border border-outline-variant/30 overflow-hidden max-h-80 overflow-y-auto">
            ${mixed.length > 0 ? renderDateGroupedTransactionsHtml(mixed) : `<p class="p-6 text-center text-xs text-on-surface-variant">Sin movimientos registrados este día ✓</p>`}
          </div>
        </div>
      `);
    }

    function saveCurrentMovFilterView() {
      const name = prompt('Nombre para esta vista favorita (ej. "Viajes >50€", "Supermercado"):');
      if (!name || !name.trim()) return;
      if (!Array.isArray(S.savedViews)) S.savedViews = [];
      S.savedViews.push({ id: uid(), name: name.trim(), filter: { ...movFilter } });
      saveLocalState(true);
      renderGastosView();
      showToast(`⭐ Vista «${name.trim()}» guardada`);
    }

    function applySavedMovFilterView(viewId) {
      const v = (S.savedViews || []).find(x => x.id === viewId);
      if (!v) return;
      movFilter = { q: "", type: "all", cat: "", tag: "", method: "", account: "", minAmt: "", maxAmt: "", dateFrom: "", dateTo: "", ...v.filter };
      renderGastosView();
    }

    function deleteSavedMovFilterView(viewId) {
      S.savedViews = (S.savedViews || []).filter(x => x.id !== viewId);
      saveLocalState(true);
      renderGastosView();
    }
