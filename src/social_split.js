    // ============================================================================
    // 3. NEXT-GEN SOCIAL DEBTS, 5-MODE SMART SPLIT & EXACT DP DEBT SIMPLIFICATION
    // ============================================================================

    const GROUP_PRESETS = [
      { id: 'piso',   label: 'Piso compartido', emoji: '🏠', desc: 'Alquiler, luz e internet mensuales', defaultCurrency: 'EUR' },
      { id: 'viaje',  label: 'Viaje',           emoji: '✈️', desc: 'Multidivisa con conversión automática', defaultCurrency: 'EUR' },
      { id: 'evento', label: 'Evento / Cena',   emoji: '🎉', desc: 'Reparto puntual rápido', defaultCurrency: 'EUR' },
      { id: 'pareja', label: 'Pareja',          emoji: '❤️', desc: 'Balance continuo del día a día', defaultCurrency: 'EUR' },
      { id: 'otro',   label: 'Otro',            emoji: '👥', desc: 'Grupo personalizado', defaultCurrency: 'EUR' }
    ];

    const SPLIT_AVATAR_COLORS = ['#4f46e5', '#059669', '#e11d48', '#d97706', '#0ea5e9', '#8b5cf6', '#14b8a6', '#ec4899'];

    function generateGroupInviteCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    }

    // ----------------------------------------------------------------------------
    // 3A. EXACT SUBSET-SUM DP (<=12) + GREEDY DEBT SIMPLIFICATION ENGINE (IN CENTS)
    // ----------------------------------------------------------------------------

    /** Computes exact net balance in integer cents per member in a group */
    function computeGroupBalancesCents(g) {
      const bal = {};
      const baseCur = g.currency || S?.settings?.currency || 'EUR';
      (g.members || []).forEach(m => { bal[m] = 0; });

      (g.items || []).forEach(it => {
        const amtCents = typeof it.amount_base_cents === 'number'
          ? it.amount_base_cents
          : Money.convertCents(typeof it.amount_cents === 'number' ? it.amount_cents : Money.toCents(it.amount || 0), it.currency || baseCur, baseCur);
        if (!(amtCents > 0)) return;
        const payer = it.payer;
        if (!(payer in bal)) bal[payer] = 0;
        bal[payer] += amtCents;

        // Support custom per-person cent shares (from exact / percent / items / shares split) or equal split
        if (it.sharesCents && typeof it.sharesCents === 'object' && Object.keys(it.sharesCents).length > 0) {
          Object.entries(it.sharesCents).forEach(([member, shareC]) => {
            if (!(member in bal)) bal[member] = 0;
            bal[member] -= Math.round(Number(shareC || 0));
          });
        } else {
          const who = (it.for || []).filter(m => m in bal);
          if (who.length === 0) return;
          // Put payer first so any remainder cent stays with payer deterministically
          const ordered = who.includes(payer) ? [payer, ...who.filter(m => m !== payer)] : who;
          const parts = Money.splitEqual(amtCents, ordered.length);
          ordered.forEach((m, idx) => { bal[m] -= parts[idx]; });
        }
      });

      // Apply recorded settlements inside group
      (g.settlements || []).forEach(st => {
        const c = typeof st.amount_cents === 'number' ? st.amount_cents : Money.toCents(st.amount || 0);
        if (c > 0 && st.status !== 'disputado') {
          bal[st.from] = (bal[st.from] || 0) + c;
          bal[st.to] = (bal[st.to] || 0) - c;
        }
      });

      return bal;
    }

    /** Raw unsimplified directed debts (one edge per pair who owes payer directly) */
    function computeRawGroupDebtsCents(g) {
      const pairMap = {};
      const baseCur = g.currency || S?.settings?.currency || 'EUR';
      (g.items || []).forEach(it => {
        const amtCents = typeof it.amount_base_cents === 'number'
          ? it.amount_base_cents
          : Money.convertCents(typeof it.amount_cents === 'number' ? it.amount_cents : Money.toCents(it.amount || 0), it.currency || baseCur, baseCur);
        if (!(amtCents > 0)) return;
        const payer = it.payer;
        const shares = {};
        if (it.sharesCents && typeof it.sharesCents === 'object' && Object.keys(it.sharesCents).length > 0) {
          Object.assign(shares, it.sharesCents);
        } else {
          const who = (it.for || []);
          if (!who.length) return;
          const ordered = who.includes(payer) ? [payer, ...who.filter(m => m !== payer)] : who;
          const parts = Money.splitEqual(amtCents, ordered.length);
          ordered.forEach((m, i) => { shares[m] = parts[i]; });
        }
        Object.entries(shares).forEach(([member, sc]) => {
          if (member !== payer && sc > 0) {
            const key = `${member}|||${payer}`;
            pairMap[key] = (pairMap[key] || 0) + Math.round(sc);
          }
        });
      });

      return Object.entries(pairMap)
        .filter(([_, c]) => c > 0)
        .map(([k, c]) => {
          const [from, to] = k.split('|||');
          return { from, to, amount_cents: c, amount: Money.fromCents(c) };
        })
        .sort((a, b) => b.amount_cents - a.amount_cents);
    }

    /** Greedy settlement for a subset of non-zero balances */
    function greedySettleSubset(entries) {
      const cred = entries.filter(e => e.v > 0).map(e => ({ n: e.n, v: e.v })).sort((a, b) => b.v - a.v);
      const debt = entries.filter(e => e.v < 0).map(e => ({ n: e.n, v: -e.v })).sort((a, b) => b.v - a.v);
      const tx = [];
      let i = 0, j = 0;
      while (i < cred.length && j < debt.length) {
        const amt = Math.min(cred[i].v, debt[j].v);
        if (amt > 0) {
          tx.push({ from: debt[j].n, to: cred[i].n, amount_cents: amt, amount: Money.fromCents(amt) });
        }
        cred[i].v -= amt;
        debt[j].v -= amt;
        if (cred[i].v === 0) i++;
        if (debt[j].v === 0) j++;
      }
      return tx;
    }

    /**
     * Exact Minimum Transaction Settlement Algorithm:
     * - For <=12 non-zero participants: bitmask subset-sum DP finds the maximum number
     *   of zero-sum subsets, mathematically guaranteeing the absolute minimum # of transfers!
     * - For >12 participants: fast greedy matching.
     */
    function computeSimplifiedSettlementsCents(balancesCents) {
      const nonZero = Object.entries(balancesCents || {})
        .map(([n, v]) => ({ n, v: Math.round(Number(v) || 0) }))
        .filter(e => e.v !== 0);

      if (nonZero.length <= 1) return [];

      // Fast path: if >12 active participants, use greedy
      if (nonZero.length > 12) {
        return greedySettleSubset(nonZero);
      }

      const n = nonZero.length;
      const totalMasks = 1 << n;
      const subsetSum = new Int32Array(totalMasks);
      for (let mask = 1; mask < totalMasks; mask++) {
        const lsb = mask & -mask;
        const bitIdx = Math.clz32(lsb) ^ 31;
        subsetSum[mask] = subsetSum[mask ^ lsb] + nonZero[bitIdx].v;
      }

      // dp[mask] = max number of disjoint zero-sum subsets partitioning `mask`
      const dp = new Int8Array(totalMasks);
      const parent = new Int32Array(totalMasks);
      for (let mask = 1; mask < totalMasks; mask++) {
        if (subsetSum[mask] !== 0) continue;
        dp[mask] = 1;
        parent[mask] = mask;
        // Iterate proper non-empty submasks
        for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
          if (dp[sub] > 0 && dp[mask ^ sub] > 0) {
            const candidate = dp[sub] + dp[mask ^ sub];
            if (candidate > dp[mask]) {
              dp[mask] = candidate;
              parent[mask] = sub;
            }
          }
        }
      }

      const fullMask = totalMasks - 1;
      if (dp[fullMask] <= 1) {
        return greedySettleSubset(nonZero);
      }

      // Reconstruct disjoint minimal zero-sum components and settle each
      const components = [];
      const stack = [fullMask];
      while (stack.length > 0) {
        const m = stack.pop();
        const sub = parent[m];
        if (sub === m || sub === 0) {
          components.push(m);
        } else {
          stack.push(sub);
          stack.push(m ^ sub);
        }
      }

      const result = [];
      components.forEach(compMask => {
        const groupEntries = [];
        for (let i = 0; i < n; i++) {
          if (compMask & (1 << i)) groupEntries.push(nonZero[i]);
        }
        result.push(...greedySettleSubset(groupEntries));
      });
      return result;
    }

    // ----------------------------------------------------------------------------
    // 3B. 5-MODE SMART TICKET SPLITTER (Equal | Items | Exact | Percent | Shares)
    // ----------------------------------------------------------------------------
    let smartSplitState = null;
    let smartSplitHistory = [];

    function pushSmartSplitUndo() {
      if (!smartSplitState) return;
      smartSplitHistory.push(JSON.stringify(smartSplitState));
      if (smartSplitHistory.length > 20) smartSplitHistory.shift();
    }

    function undoSmartSplit() {
      if (smartSplitHistory.length === 0) return;
      smartSplitState = JSON.parse(smartSplitHistory.pop());
      renderSmartSplitModal();
    }

    function openSmartSplitModal(opts = {}) {
      const me = currentLoggedUserName() === 'Modo local' ? 'Yo' : currentLoggedUserName();
      const targetGroup = opts.groupId ? (S.groups || []).find(g => g.id === opts.groupId) : null;
      const defaultParticipants = opts.participants
        ? [...opts.participants]
        : (targetGroup && targetGroup.members.length > 0 ? [...targetGroup.members] : [me, 'Amigo 1', 'Amigo 2']);

      smartSplitHistory = [];
      smartSplitState = {
        mode: opts.mode || (opts.items && opts.items.length > 0 ? 'items' : 'equal'),
        concept: opts.concept || '',
        totalInput: opts.total ? Number(opts.total).toFixed(2) : '',
        currency: opts.currency || (targetGroup?.currency) || (S?.settings?.currency || 'EUR'),
        payer: opts.payer || defaultParticipants[0],
        participants: defaultParticipants,
        groupId: opts.groupId || '',
        alsoLogMyExpense: false,
        // Mode: items
        items: (opts.items && opts.items.length > 0) ? opts.items.map(it => ({
          id: uid(),
          name: it.name || 'Artículo',
          cents: typeof it.cents === 'number' ? it.cents : Money.toCents(it.price || 0),
          assigned: Array.isArray(it.assigned) && it.assigned.length > 0 ? [...it.assigned] : [...defaultParticipants]
        })) : [
          { id: uid(), name: 'Entrantes al centro', cents: 1200, assigned: [...defaultParticipants] }
        ],
        tipCents: 0,
        discountCents: 0,
        tipProportional: true,
        // Mode: exact / percent / shares
        exactInputs: {},
        percentInputs: {},
        sharesInputs: {}
      };

      defaultParticipants.forEach(p => {
        smartSplitState.sharesInputs[p] = 1;
        smartSplitState.percentInputs[p] = Math.round(100 / defaultParticipants.length);
        smartSplitState.exactInputs[p] = '';
      });

      renderSmartSplitModal();
    }

    /** Computes exact per-person shares in integer cents for all 5 split modes */
    function computeSmartSplitBreakdown(st) {
      const people = st.participants || [];
      if (people.length === 0) return { totalCents: 0, sharesCents: {}, valid: false, message: 'Añade al menos 1 persona' };

      const ordered = people.includes(st.payer) ? [st.payer, ...people.filter(p => p !== st.payer)] : [...people];
      const sharesCents = {};
      people.forEach(p => { sharesCents[p] = 0; });

      if (st.mode === 'items') {
        let subtotal = 0;
        (st.items || []).forEach(it => {
          const c = Math.max(0, Math.round(Number(it.cents) || 0));
          subtotal += c;
          const assign = (it.assigned || []).filter(p => people.includes(p));
          if (assign.length === 0 || c === 0) return;
          const ordA = assign.includes(st.payer) ? [st.payer, ...assign.filter(p => p !== st.payer)] : assign;
          const parts = Money.splitEqual(c, ordA.length);
          ordA.forEach((p, idx) => { sharesCents[p] += parts[idx]; });
        });

        const netExtras = Math.round(Number(st.tipCents || 0)) - Math.round(Number(st.discountCents || 0));
        const totalCents = Math.max(0, subtotal + netExtras);

        if (netExtras !== 0 && people.length > 0) {
          if (st.tipProportional && subtotal > 0) {
            let assignedExtra = 0;
            ordered.forEach((p, idx) => {
              if (idx === 0) return;
              const prop = Math.round((sharesCents[p] / subtotal) * netExtras);
              sharesCents[p] = Math.max(0, sharesCents[p] + prop);
              assignedExtra += prop;
            });
            sharesCents[ordered[0]] = Math.max(0, sharesCents[ordered[0]] + (netExtras - assignedExtra));
          } else {
            const parts = Money.splitEqual(netExtras, ordered.length);
            ordered.forEach((p, idx) => { sharesCents[p] = Math.max(0, sharesCents[p] + parts[idx]); });
          }
        }

        const sumAssigned = Object.values(sharesCents).reduce((a, b) => a + b, 0);
        const valid = totalCents > 0 && sumAssigned === totalCents;
        return { totalCents, sharesCents, valid, diffCents: totalCents - sumAssigned, message: valid ? 'Cuadrado exacto ✓' : 'Asigna personas a cada artículo' };
      }

      const totalCents = Money.toCents(st.totalInput || 0);
      if (!(totalCents > 0)) {
        return { totalCents: 0, sharesCents, valid: false, diffCents: 0, message: 'Introduce un importe mayor que 0' };
      }

      if (st.mode === 'equal') {
        const parts = Money.splitEqual(totalCents, ordered.length);
        ordered.forEach((p, idx) => { sharesCents[p] = parts[idx]; });
        return { totalCents, sharesCents, valid: true, diffCents: 0, message: 'Reparto exacto a partes iguales ✓' };
      }

      if (st.mode === 'exact') {
        ordered.forEach(p => { sharesCents[p] = Math.max(0, Money.toCents(st.exactInputs[p] || 0)); });
        const check = Money.validateExactSplit(totalCents, Object.values(sharesCents));
        return {
          totalCents,
          sharesCents,
          valid: check.valid,
          diffCents: check.diffCents,
          message: check.valid ? 'Suma exacta ✓' : (check.diffCents > 0 ? `Faltan ${fmt(Money.fromCents(check.diffCents))} por asignar` : `Sobran ${fmt(Money.fromCents(-check.diffCents))}`)
        };
      }

      if (st.mode === 'percent') {
        let sumPct = 0;
        ordered.forEach(p => { sumPct += Number(st.percentInputs[p] || 0); });
        const validPct = Math.abs(sumPct - 100) < 0.05;
        let allocated = 0;
        ordered.forEach((p, idx) => {
          if (idx === 0) return;
          const c = Math.round(totalCents * (Number(st.percentInputs[p] || 0) / 100));
          sharesCents[p] = c;
          allocated += c;
        });
        sharesCents[ordered[0]] = Math.max(0, totalCents - allocated);
        return {
          totalCents,
          sharesCents,
          valid: validPct,
          diffCents: 0,
          message: validPct ? 'Suma 100% exacta ✓' : `Los porcentajes suman ${sumPct.toFixed(1)}% (deben sumar 100%)`
        };
      }

      // mode === 'shares' (e.g. 1x, 2x, 0.5x)
      let totalShares = 0;
      ordered.forEach(p => { totalShares += Math.max(0, Number(st.sharesInputs[p] || 0)); });
      if (!(totalShares > 0)) return { totalCents, sharesCents, valid: false, diffCents: totalCents, message: 'Asigna al menos 1 parte' };
      let allocated = 0;
      ordered.forEach((p, idx) => {
        if (idx === 0) return;
        const w = Math.max(0, Number(st.sharesInputs[p] || 0));
        const c = Math.round(totalCents * (w / totalShares));
        sharesCents[p] = c;
        allocated += c;
      });
      sharesCents[ordered[0]] = Math.max(0, totalCents - allocated);
      return { totalCents, sharesCents, valid: true, diffCents: 0, message: `Repartido en ${totalShares} parte(s) ✓` };
    }

    function autoSquareExactSplit() {
      if (!smartSplitState) return;
      pushSmartSplitUndo();
      const totalCents = Money.toCents(smartSplitState.totalInput || 0);
      const others = smartSplitState.participants.filter(p => p !== smartSplitState.payer);
      let othersSum = 0;
      others.forEach(p => { othersSum += Math.max(0, Money.toCents(smartSplitState.exactInputs[p] || 0)); });
      const rem = Math.max(0, totalCents - othersSum);
      smartSplitState.exactInputs[smartSplitState.payer] = Money.fromCents(rem).toFixed(2);
      renderSmartSplitModal();
    }

    function addSmartSplitParticipant() {
      const inp = $('#split-new-person');
      const name = (inp?.value || '').trim();
      if (!name || !smartSplitState) return;
      if (smartSplitState.participants.includes(name)) return;
      pushSmartSplitUndo();
      smartSplitState.participants.push(name);
      smartSplitState.sharesInputs[name] = 1;
      smartSplitState.percentInputs[name] = 0;
      smartSplitState.exactInputs[name] = '';
      renderSmartSplitModal();
    }

    function removeSmartSplitParticipant(name) {
      if (!smartSplitState || smartSplitState.participants.length <= 2) return;
      pushSmartSplitUndo();
      smartSplitState.participants = smartSplitState.participants.filter(p => p !== name);
      if (smartSplitState.payer === name) smartSplitState.payer = smartSplitState.participants[0];
      smartSplitState.items.forEach(it => { it.assigned = it.assigned.filter(p => p !== name); });
      renderSmartSplitModal();
    }

    function addSmartSplitItem() {
      if (!smartSplitState) return;
      pushSmartSplitUndo();
      smartSplitState.items.push({ id: uid(), name: '', cents: 0, assigned: [...smartSplitState.participants] });
      renderSmartSplitModal();
    }

    function toggleSmartSplitItemPerson(itemId, person) {
      if (!smartSplitState) return;
      pushSmartSplitUndo();
      const it = smartSplitState.items.find(x => x.id === itemId);
      if (!it) return;
      if (it.assigned.includes(person)) it.assigned = it.assigned.filter(p => p !== person);
      else it.assigned.push(person);
      renderSmartSplitModal();
    }

    function renderSmartSplitModal() {
      const st = smartSplitState;
      if (!st) return;
      const calc = computeSmartSplitBreakdown(st);
      const modeTabs = [
        { id: 'equal',   label: 'Iguales' },
        { id: 'items',   label: 'Por ítems' },
        { id: 'exact',   label: 'Exactos' },
        { id: 'percent', label: '%' },
        { id: 'shares',  label: 'Partes' }
      ];

      let modeBodyHtml = '';
      if (st.mode === 'items') {
        modeBodyHtml = `
          <div class="flex flex-col gap-2.5">
            ${st.items.map((it, idx) => `
              <div class="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <input type="text" value="${esc(it.name)}" placeholder="Artículo ${idx + 1} (ej. Pizza)" onchange="pushSmartSplitUndo(); smartSplitState.items[${idx}].name=this.value" class="flex-1 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
                  <input type="number" step="0.01" value="${it.cents ? Money.fromCents(it.cents).toFixed(2) : ''}" placeholder="0.00" onchange="pushSmartSplitUndo(); smartSplitState.items[${idx}].cents=Money.toCents(this.value); renderSmartSplitModal()" class="w-24 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-extrabold text-right text-on-surface"/>
                  ${st.items.length > 1 ? `<button onclick="pushSmartSplitUndo(); smartSplitState.items.splice(${idx},1); renderSmartSplitModal()" class="text-outline hover:text-tertiary">${ico('delete', 'text-[16px]')}</button>` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  ${st.participants.map((p, pIdx) => {
                    const active = it.assigned.includes(p);
                    const col = SPLIT_AVATAR_COLORS[pIdx % SPLIT_AVATAR_COLORS.length];
                    return `
                      <button type="button" onclick="haptic('selection'); toggleSmartSplitItemPerson('${it.id}','${esc(p)}')" style="${active ? `background:${col};color:#fff;border-color:${col}` : ''}" class="px-2.5 py-1 rounded-full border text-[11px] font-bold transition ${active ? '' : 'border-outline-variant/50 text-on-surface-variant bg-surface-container-lowest'}">
                        ${esc(p)}
                      </button>`;
                  }).join('')}
                </div>
              </div>
            `).join('')}
            <button onclick="addSmartSplitItem()" class="w-full py-2 rounded-xl border border-dashed border-primary/50 text-primary text-xs font-extrabold hover:bg-primary/5 transition">+ Añadir línea del ticket</button>
            <div class="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label class="text-[10px] font-bold text-on-surface-variant block mb-0.5">Propina / Impuesto (+)</label>
                <input type="number" step="0.50" value="${st.tipCents ? Money.fromCents(st.tipCents).toFixed(2) : ''}" placeholder="0.00" onchange="pushSmartSplitUndo(); smartSplitState.tipCents=Money.toCents(this.value); renderSmartSplitModal()" class="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
              </div>
              <div>
                <label class="text-[10px] font-bold text-on-surface-variant block mb-0.5">Descuento / Cupón (−)</label>
                <input type="number" step="0.50" value="${st.discountCents ? Money.fromCents(st.discountCents).toFixed(2) : ''}" placeholder="0.00" onchange="pushSmartSplitUndo(); smartSplitState.discountCents=Money.toCents(this.value); renderSmartSplitModal()" class="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
              </div>
            </div>
            <label class="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant cursor-pointer">
              <input type="checkbox" ${st.tipProportional ? 'checked' : ''} onchange="smartSplitState.tipProportional=this.checked; renderSmartSplitModal()" class="w-4 h-4 rounded text-primary"/>
              Repartir propina y descuento proporcional al consumo
            </label>
          </div>`;
      } else if (st.mode === 'exact') {
        modeBodyHtml = `
          <div class="flex flex-col gap-2">
            ${st.participants.map(p => `
              <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low">
                <span class="text-xs font-bold text-on-surface">${esc(p)} ${p === st.payer ? '<span class="text-[10px] text-primary">(Pagó)</span>' : ''}</span>
                <input type="number" step="0.01" value="${esc(st.exactInputs[p] || '')}" placeholder="0.00" onchange="pushSmartSplitUndo(); smartSplitState.exactInputs['${esc(p)}']=this.value; renderSmartSplitModal()" class="w-28 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-right text-xs font-extrabold text-on-surface"/>
              </div>
            `).join('')}
            <div class="flex items-center justify-between text-xs pt-1">
              <span class="font-bold ${calc.valid ? 'text-secondary' : 'text-tertiary'}">${esc(calc.message)}</span>
              ${!calc.valid ? `<button onclick="autoSquareExactSplit()" class="px-2.5 py-1 rounded-lg bg-primary/12 text-primary font-extrabold text-[11px]">Auto-cuadrar</button>` : ''}
            </div>
          </div>`;
      } else if (st.mode === 'percent') {
        modeBodyHtml = `
          <div class="flex flex-col gap-2">
            ${st.participants.map(p => `
              <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low">
                <span class="text-xs font-bold text-on-surface">${esc(p)}</span>
                <div class="flex items-center gap-1.5">
                  <input type="number" step="1" min="0" max="100" value="${Number(st.percentInputs[p] || 0)}" onchange="pushSmartSplitUndo(); smartSplitState.percentInputs['${esc(p)}']=Number(this.value); renderSmartSplitModal()" class="w-20 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-right text-xs font-extrabold text-on-surface"/>
                  <span class="text-xs font-bold text-outline">%</span>
                </div>
              </div>
            `).join('')}
            <p class="text-xs font-bold ${calc.valid ? 'text-secondary' : 'text-tertiary'}">${esc(calc.message)}</p>
          </div>`;
      } else if (st.mode === 'shares') {
        modeBodyHtml = `
          <div class="flex flex-col gap-2">
            ${st.participants.map(p => `
              <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low">
                <span class="text-xs font-bold text-on-surface">${esc(p)}</span>
                <div class="flex items-center gap-1.5">
                  <button onclick="pushSmartSplitUndo(); smartSplitState.sharesInputs['${esc(p)}']=Math.max(0,(Number(smartSplitState.sharesInputs['${esc(p)}']||1)-0.5)); renderSmartSplitModal()" class="w-7 h-7 rounded-lg bg-surface-container font-extrabold">−</button>
                  <span class="w-10 text-center text-xs font-extrabold tabular-nums">${Number(st.sharesInputs[p] || 0)}×</span>
                  <button onclick="pushSmartSplitUndo(); smartSplitState.sharesInputs['${esc(p)}']=(Number(smartSplitState.sharesInputs['${esc(p)}']||1)+0.5); renderSmartSplitModal()" class="w-7 h-7 rounded-lg bg-surface-container font-extrabold">+</button>
                </div>
              </div>
            `).join('')}
          </div>`;
      } else {
        modeBodyHtml = `<p class="text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-xl">El total se reparte en partes iguales exactas (si sobra 1 céntimo, se asigna al pagador).</p>`;
      }

      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Reparto inteligente de gasto</h3>
              <p class="text-[11px] text-on-surface-variant">Sin cuenta requerida · Céntimos exactos</p>
            </div>
            <div class="flex items-center gap-1">
              ${smartSplitHistory.length > 0 ? `<button onclick="undoSmartSplit()" class="p-2 rounded-full text-primary hover:bg-primary/10" title="Deshacer">${ico('undo', 'text-[17px]')}</button>` : ''}
              <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
            </div>
          </div>

          <div class="grid grid-cols-5 bg-surface-container p-1 rounded-2xl gap-1">
            ${modeTabs.map(t => `
              <button onclick="haptic('selection'); pushSmartSplitUndo(); smartSplitState.mode='${t.id}'; renderSmartSplitModal()" class="py-1.5 rounded-xl text-[11px] font-extrabold transition ${st.mode === t.id ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">${t.label}</button>
            `).join('')}
          </div>

          <div class="grid grid-cols-12 gap-2">
            <input type="text" value="${esc(st.concept)}" placeholder="Concepto (ej. Cena italiana)" oninput="smartSplitState.concept=this.value" class="col-span-7 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            ${st.mode !== 'items' ? `
              <input type="number" step="0.01" value="${esc(st.totalInput)}" placeholder="Total" oninput="smartSplitState.totalInput=this.value; renderSmartSplitModal()" class="col-span-5 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-right text-on-surface"/>
            ` : `
              <div class="col-span-5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-extrabold text-right tabular-nums">${fmt(Money.fromCents(calc.totalCents))}</div>
            `}
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Pagó</label>
              <select onchange="smartSplitState.payer=this.value; renderSmartSplitModal()" class="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${st.participants.map(p => `<option value="${esc(p)}" ${st.payer === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Guardar en</label>
              <select onchange="smartSplitState.groupId=this.value" class="w-full px-2.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                <option value="" ${!st.groupId ? 'selected' : ''}>Deudas directas P2P</option>
                ${(S.groups || []).filter(g => !g.archived).map(g => `<option value="${g.id}" ${st.groupId === g.id ? 'selected' : ''}>Grupo: ${esc(g.name)}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Participants Chips + Quick Add Guest -->
          <div class="flex flex-col gap-1.5">
            <div class="flex flex-wrap gap-1.5">
              ${st.participants.map((p, idx) => `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-surface-container text-on-surface">
                  <span class="w-2 h-2 rounded-full" style="background:${SPLIT_AVATAR_COLORS[idx % SPLIT_AVATAR_COLORS.length]}"></span>
                  ${esc(p)}
                  ${st.participants.length > 2 ? `<button onclick="removeSmartSplitParticipant('${esc(p)}')" class="text-outline hover:text-tertiary ml-0.5">×</button>` : ''}
                </span>
              `).join('')}
            </div>
            <div class="flex gap-1.5">
              <input id="split-new-person" type="text" placeholder="+ Añadir invitado (sin cuenta)" onkeydown="if(event.key==='Enter') addSmartSplitParticipant()" class="flex-1 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs font-bold text-on-surface"/>
              <button onclick="addSmartSplitParticipant()" class="px-3 py-1.5 rounded-xl bg-surface-container text-xs font-extrabold text-primary">Añadir</button>
            </div>
          </div>

          ${modeBodyHtml}

          <!-- Live Final Preview per Person -->
          <div class="p-3 rounded-2xl bg-primary/6 border border-primary/20 flex flex-col gap-1">
            <span class="text-[10px] font-extrabold uppercase text-primary">Vista previa por persona (${fmt(Money.fromCents(calc.totalCents))})</span>
            <div class="grid grid-cols-2 gap-1.5 text-xs pt-1">
              ${st.participants.map(p => `
                <div class="flex justify-between bg-surface-container-lowest/80 px-2.5 py-1 rounded-lg">
                  <span class="font-bold text-on-surface truncate">${esc(p)}</span>
                  <strong class="tabular-nums text-primary">${fmt(Money.fromCents(calc.sharesCents[p] || 0))}</strong>
                </div>
              `).join('')}
            </div>
          </div>

          <button onclick="confirmSmartSplit()" ${!calc.valid ? 'disabled' : ''} class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-sm active-scale disabled:opacity-45">
            Confirmar reparto ✓
          </button>
        </div>
      `);
    }

    async function confirmSmartSplit() {
      const st = smartSplitState;
      if (!st) return;
      const calc = computeSmartSplitBreakdown(st);
      if (!calc.valid) return;

      const concept = (st.concept || '').trim() || 'Gasto compartido';
      if (st.groupId) {
        const g = (S.groups || []).find(x => x.id === st.groupId);
        if (g) {
          st.participants.forEach(p => { if (!g.members.includes(p)) g.members.push(p); });
          const baseCur = g.currency || S?.settings?.currency || 'EUR';
          const baseCents = Money.convertCents(calc.totalCents, st.currency, baseCur);
          g.items.push({
            id: uid(),
            note: concept,
            amount_cents: calc.totalCents,
            amount_base_cents: baseCents,
            amount: Money.fromCents(baseCents),
            currency: st.currency,
            payer: st.payer,
            for: [...st.participants],
            sharesCents: { ...calc.sharesCents },
            splitMode: st.mode,
            date: todayStr(),
            reactions: {},
            comments: []
          });
          saveLocalState(true);
          closeUniversalModal();
          renderAllViews();
          showToast(`✓ Gasto repartido en «${g.name}»`);
          return;
        }
      }

      // Create P2P debts for everyone except payer
      let count = 0;
      const me = currentLoggedUserName() === 'Modo local' ? 'Yo' : currentLoggedUserName();
      const payerIsMe = (st.payer === me || st.payer === 'Yo');
      Object.entries(calc.sharesCents).forEach(([person, shareC]) => {
        if (person === st.payer || !(shareC > 0)) return;
        if (payerIsMe) {
          upsertPersonalDebt(person, 'owed', Money.fromCents(shareC), concept);
          count++;
        } else if (person === me || person === 'Yo') {
          upsertPersonalDebt(st.payer, 'owe', Money.fromCents(shareC), concept);
          count++;
        }
      });

      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast(`✓ Reparto confirmado (${count} deuda(s) P2P creadas)`);
    }

    // ----------------------------------------------------------------------------
    // 3C. POWERFUL GROUPS (Presets, Recurring, Multicurrency, Reactions, Simplify)
    // ----------------------------------------------------------------------------
    let groupSimplifyViewMode = true; // true = Simplified ✨ | false = All raw transfers

    function openEnhancedNewGroupModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Nuevo Grupo Social</h3>
              <p class="text-[11px] text-on-surface-variant">Piso, viaje multidivisa, evento o pareja</p>
            </div>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <div class="grid grid-cols-5 gap-1.5">
            ${GROUP_PRESETS.map((pr, idx) => `
              <button type="button" data-gp-type="${pr.id}" onclick="$('#lg-type').value='${pr.id}'; $$('[data-gp-type]').forEach(b=>b.classList.toggle('border-primary', b.dataset.gpType==='${pr.id}'));" class="p-2 rounded-xl border text-center flex flex-col items-center gap-0.5 bg-surface-container-low ${idx === 0 ? 'border-primary' : 'border-outline-variant/35'}">
                <span class="text-lg">${pr.emoji}</span>
                <span class="text-[9px] font-extrabold text-on-surface truncate w-full">${esc(pr.label.split(' ')[0])}</span>
              </button>
            `).join('')}
          </div>
          <input type="hidden" id="lg-type" value="piso"/>
          <input id="lg-name" type="text" placeholder="Nombre del grupo (ej. Piso Madrid, Viaje Roma...)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[11px] font-bold text-on-surface-variant block mb-1">Moneda base</label>
              <select id="lg-currency" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${CURRENCIES.map(c => `<option value="${c.code}" ${(S?.settings?.currency || 'EUR') === c.code ? 'selected' : ''}>${esc(c.code)} (${esc(c.symbol)})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-[11px] font-bold text-on-surface-variant block mb-1">Participantes (comas)</label>
              <input id="lg-members" type="text" value="Yo, Carlos, Marta" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            </div>
          </div>
          <button onclick="saveEnhancedLocalGroup()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-extrabold active-scale">Crear Grupo</button>
        </div>
      `);
    }

    function saveEnhancedLocalGroup() {
      const name = ($('#lg-name')?.value || '').trim();
      const type = $('#lg-type')?.value || 'otro';
      const currency = $('#lg-currency')?.value || (S?.settings?.currency || 'EUR');
      const members = ($('#lg-members')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!name || members.length < 2) {
        showToast('Escribe un nombre y al menos 2 participantes');
        return;
      }
      S.groups.push({
        id: uid(),
        name,
        type,
        currency,
        members,
        inviteCode: generateGroupInviteCode(),
        items: [],
        recurring: [],
        settlements: [],
        archived: false,
        createdAt: Date.now()
      });
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast(`Grupo «${name}» creado ✓`);
    }

    function reactToGroupItem(groupId, itemId, emoji) {
      const g = (S.groups || []).find(x => x.id === groupId);
      const it = g?.items?.find(x => x.id === itemId);
      if (!it) return;
      if (!it.reactions || typeof it.reactions !== 'object') it.reactions = {};
      it.reactions[emoji] = (it.reactions[emoji] || 0) + 1;
      saveLocalState(true);
      openEnhancedGroupDetailModal(groupId);
    }

    function addCommentToGroupItem(groupId, itemId) {
      const text = prompt('Escribe un comentario sobre este gasto:');
      if (!text || !text.trim()) return;
      const g = (S.groups || []).find(x => x.id === groupId);
      const it = g?.items?.find(x => x.id === itemId);
      if (!it) return;
      if (!Array.isArray(it.comments)) it.comments = [];
      it.comments.push({ id: uid(), author: currentLoggedUserName(), text: text.trim(), date: todayStr() });
      saveLocalState(true);
      openEnhancedGroupDetailModal(groupId);
    }

    function addGroupRecurringRule(groupId) {
      const g = (S.groups || []).find(x => x.id === groupId);
      if (!g) return;
      const title = prompt('Gasto fijo mensual del grupo (ej. Alquiler, Internet):');
      if (!title || !title.trim()) return;
      const amtStr = prompt('Importe mensual total:');
      const cents = Money.toCents(amtStr || 0);
      if (!(cents > 0)) return;
      if (!Array.isArray(g.recurring)) g.recurring = [];
      g.recurring.push({ id: uid(), note: title.trim(), amount_cents: cents, payer: g.members[0], day: 1 });
      saveLocalState(true);
      openEnhancedGroupDetailModal(groupId);
      showToast('Gasto recurrente de grupo guardado ✓');
    }

    function applyGroupRecurringNow(groupId, recId) {
      const g = (S.groups || []).find(x => x.id === groupId);
      const rec = g?.recurring?.find(r => r.id === recId);
      if (!rec) return;
      g.items.push({
        id: uid(),
        note: `${rec.note} (${monthLabel(monthKey(todayStr()))})`,
        amount_cents: rec.amount_cents,
        amount_base_cents: rec.amount_cents,
        amount: Money.fromCents(rec.amount_cents),
        currency: g.currency || 'EUR',
        payer: rec.payer || g.members[0],
        for: [...g.members],
        date: todayStr(),
        reactions: {},
        comments: []
      });
      saveLocalState(true);
      openEnhancedGroupDetailModal(groupId);
      showToast(`✓ «${rec.note}» añadido al grupo`);
    }

    function recordGroupSettlement(groupId, from, to, cents) {
      const g = (S.groups || []).find(x => x.id === groupId);
      if (!g) return;
      if (!Array.isArray(g.settlements)) g.settlements = [];
      g.settlements.push({ id: uid(), from, to, amount_cents: cents, amount: Money.fromCents(cents), status: 'confirmado', date: todayStr() });
      saveLocalState(true);
      openEnhancedGroupDetailModal(groupId);
      renderAllViews();
      showToast(`✓ Pago de ${from} a ${to} (${fmt(Money.fromCents(cents))}) registrado`);
    }

    function toggleArchiveLocalGroup(groupId) {
      const g = (S.groups || []).find(x => x.id === groupId);
      if (!g) return;
      if (!g.archived) {
        const plan = computeSimplifiedSettlementsCents(computeGroupBalancesCents(g));
        if (plan.length > 0 && !confirm(`Aún quedan ${plan.length} pagos pendientes en este grupo. ¿Marcar como perdonados y archivar?`)) return;
      }
      g.archived = !g.archived;
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast(g.archived ? 'Grupo archivado (historial consultable)' : 'Grupo reactivado ✓');
    }

    function openEnhancedGroupDetailModal(groupId) {
      const g = (S.groups || []).find(x => x.id === groupId);
      if (!g) return;
      if (!g.inviteCode) { g.inviteCode = generateGroupInviteCode(); saveLocalState(false); }
      const preset = GROUP_PRESETS.find(p => p.id === g.type) || GROUP_PRESETS[4];
      const balCents = computeGroupBalancesCents(g);
      const rawPlan = computeRawGroupDebtsCents(g);
      const simpPlan = computeSimplifiedSettlementsCents(balCents);
      const shownPlan = groupSimplifyViewMode ? simpPlan : rawPlan;
      const savedTransfers = Math.max(0, rawPlan.length - simpPlan.length);

      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-lg">${preset.emoji}</span>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${esc(g.name)}</h3>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">${esc(g.currency || 'EUR')}</span>
              </div>
              <p class="text-[11px] text-on-surface-variant">${g.members.join(' · ')} · Código <strong class="font-mono text-primary">${esc(g.inviteCode)}</strong></p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="flex flex-wrap gap-2">
            <button onclick="openSmartSplitModal({ groupId: '${g.id}' })" class="flex-1 py-2.5 px-3 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale flex items-center justify-center gap-1.5">
              ${ico('call_split', 'text-[15px]')} + Repartir gasto
            </button>
            <button onclick="addGroupRecurringRule('${g.id}')" class="py-2.5 px-3 rounded-xl bg-surface-container-low text-on-surface text-xs font-bold hover:bg-surface-container">+ Fijo mensual</button>
            <button onclick="copySensitiveToClipboard('Únete a mi grupo «${esc(g.name)}» en Claridad Financiera con el código ${esc(g.inviteCode)}', 'Invitación')" class="py-2.5 px-3 rounded-xl bg-surface-container-low text-primary text-xs font-bold hover:bg-surface-container">Invitar</button>
          </div>

          <!-- Simplification Before / After Comparison -->
          <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs font-extrabold text-on-surface">Simplificación de deudas</p>
                ${savedTransfers > 0 ? `<p class="text-[10px] font-extrabold text-secondary">✨ De ${rawPlan.length} transferencias a solo ${simpPlan.length}</p>` : `<p class="text-[10px] text-on-surface-variant">Algoritmo exacto activo</p>`}
              </div>
              <div class="flex bg-surface-container p-0.5 rounded-xl text-[10px] font-extrabold">
                <button onclick="groupSimplifyViewMode=true; openEnhancedGroupDetailModal('${g.id}')" class="px-2.5 py-1 rounded-lg ${groupSimplifyViewMode ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">Simplificado ✨</button>
                <button onclick="groupSimplifyViewMode=false; openEnhancedGroupDetailModal('${g.id}')" class="px-2.5 py-1 rounded-lg ${!groupSimplifyViewMode ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">Todas (${rawPlan.length})</button>
              </div>
            </div>
            ${shownPlan.length > 0 ? shownPlan.map(p => `
              <div class="flex items-center justify-between gap-2 py-1.5 border-b border-outline-variant/20 last:border-0 text-xs">
                <span class="font-bold text-on-surface">${esc(p.from)} <span class="text-primary font-extrabold">→</span> ${esc(p.to)}</span>
                <div class="flex items-center gap-2">
                  <strong class="font-extrabold text-secondary tabular-nums">${fmt(Money.fromCents(p.amount_cents))}</strong>
                  ${groupSimplifyViewMode ? `<button onclick="recordGroupSettlement('${g.id}','${esc(p.from)}','${esc(p.to)}',${p.amount_cents})" class="px-2 py-1 rounded-lg bg-secondary/15 text-secondary text-[10px] font-extrabold">Pagado ✓</button>` : ''}
                </div>
              </div>
            `).join('') : `<p class="text-xs font-bold text-secondary">✓ Todas las cuentas del grupo están a cero</p>`}
          </div>

          ${(g.recurring && g.recurring.length > 0) ? `
            <div class="flex flex-col gap-1.5">
              <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Gastos fijos del grupo</span>
              ${g.recurring.map(r => `
                <div class="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-xs">
                  <span class="font-bold text-on-surface">${esc(r.note)} · ${fmt(Money.fromCents(r.amount_cents))}</span>
                  <button onclick="applyGroupRecurringNow('${g.id}','${r.id}')" class="px-2.5 py-1 rounded-lg bg-primary/12 text-primary text-[11px] font-extrabold">Aplicar este mes</button>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Social Activity Feed (Reactions + Comments) -->
          <div class="flex flex-col gap-2 max-h-56 overflow-y-auto">
            ${(g.items || []).slice().reverse().map(it => `
              <div class="p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/25 flex flex-col gap-1.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-extrabold text-on-surface truncate">${esc(it.note || 'Gasto')}</p>
                    <p class="text-[10px] text-on-surface-variant">Pagó ${esc(it.payer)} · ${it.date ? fmtDay(it.date) : 'Hoy'}${it.currency && it.currency !== (g.currency || 'EUR') ? ` · ${Money.fromCents(it.amount_cents || Money.toCents(it.amount)).toFixed(2)} ${esc(it.currency)}` : ''}</p>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <strong class="font-extrabold text-on-surface tabular-nums">${fmt(it.amount)}</strong>
                    <button onclick="deleteLocalGroupExpense('${g.id}','${it.id}')" class="text-outline hover:text-tertiary">${ico('delete', 'text-[15px]')}</button>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-2 pt-1">
                  <div class="flex items-center gap-1">
                    ${['🍕', '🔥', '👏'].map(em => `
                      <button onclick="reactToGroupItem('${g.id}','${it.id}','${em}')" class="px-1.5 py-0.5 rounded-full bg-surface-container text-[10px] font-bold hover:bg-primary/15">${em}${it.reactions?.[em] ? ' ' + it.reactions[em] : ''}</button>
                    `).join('')}
                  </div>
                  <button onclick="addCommentToGroupItem('${g.id}','${it.id}')" class="text-[10px] font-bold text-primary hover:underline">💬 ${(it.comments || []).length || 'Comentar'}</button>
                </div>
                ${(it.comments && it.comments.length > 0) ? `
                  <div class="pt-1 border-t border-outline-variant/20 flex flex-col gap-0.5 text-[10px] text-on-surface-variant">
                    ${it.comments.map(cm => `<p><strong>${esc(cm.author)}:</strong> ${esc(cm.text)}</p>`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('') || `<p class="text-xs text-center text-on-surface-variant py-4">Sin gastos en este grupo todavía.</p>`}
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-outline-variant/25">
            <button onclick="toggleArchiveLocalGroup('${g.id}')" class="text-xs font-bold text-on-surface-variant hover:text-primary">${g.archived ? 'Reactivar grupo' : 'Archivar grupo'}</button>
            <button onclick="deleteLocalGroup('${g.id}')" class="text-xs font-bold text-tertiary hover:underline">Eliminar grupo</button>
          </div>
        </div>
      `);
    }

    // ----------------------------------------------------------------------------
    // 3D. PERSON TIMELINE, 1-TAP SETTLE ALL & CONFIGURABLE HUMOR/FRIENDLY REMINDERS
    // ----------------------------------------------------------------------------
    function openPersonSocialTimelineModal(personName) {
      const target = String(personName || '').trim();
      const lower = target.toLowerCase();
      const matchingDebts = (S.debts || []).filter(d => String(d.person || '').trim().toLowerCase() === lower);
      const activeDebts = matchingDebts.filter(d => !d.settled && Number(d.amount || 0) > 0);

      let netCents = 0;
      activeDebts.forEach(d => {
        const c = typeof d.amount_cents === 'number' ? d.amount_cents : Money.toCents(d.amount);
        netCents += (d.type === 'owed' ? c : -c);
      });

      const timelineEvents = [];
      matchingDebts.forEach(d => {
        (d.log || []).forEach(entry => {
          timelineEvents.push({
            date: entry.d || todayStr(),
            kind: entry.k === 'pay' ? 'pay' : d.type,
            amount: Number(entry.a || 0),
            note: entry.n || d.note || 'Movimiento P2P'
          });
        });
      });
      timelineEvents.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary/12 text-primary font-extrabold flex items-center justify-center">${initials(target)}</div>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${esc(target)}</h3>
                <p class="text-xs text-on-surface-variant">${activeDebts.length} deuda(s) activa(s)</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="p-4 rounded-2xl ${netCents >= 0 ? 'bg-secondary/10 border-secondary/25' : 'bg-tertiary/10 border-tertiary/25'} border flex items-center justify-between gap-2">
            <div>
              <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Balance neto con ${esc(target)}</span>
              <p class="text-2xl font-extrabold tabular-nums ${netCents >= 0 ? 'text-secondary' : 'text-tertiary'}">${fmtSigned(Money.fromCents(netCents))}</p>
            </div>
            ${activeDebts.length > 0 ? `
              <button onclick="settleAllWithPerson('${esc(target)}')" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale">
                Saldar todo ✓
              </button>
            ` : ''}
          </div>

          ${netCents > 0 ? `
            <div class="flex flex-col gap-2">
              <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Recordatorio amistoso (máx. 1/semana)</span>
              <div class="grid grid-cols-2 gap-2">
                <button onclick="sendConfigurableReminder('${esc(target)}', ${netCents}, 'suave')" class="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface">🙂 Tono suave</button>
                <button onclick="sendConfigurableReminder('${esc(target)}', ${netCents}, 'humor')" class="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-xs font-extrabold text-amber-700 dark:text-amber-300">☕ Con humor</button>
              </div>
            </div>
          ` : ''}

          <div class="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Timeline compartido</span>
            ${timelineEvents.map(ev => `
              <div class="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-xs">
                <div>
                  <p class="font-bold text-on-surface">${esc(ev.note)}</p>
                  <p class="text-[10px] text-on-surface-variant">${fmtDay(ev.date)} • ${ev.kind === 'pay' ? 'Abono / Liquidación' : (ev.kind === 'owed' ? 'Te debe' : 'Le debes')}</p>
                </div>
                <strong class="tabular-nums ${ev.kind === 'owe' ? 'text-tertiary' : 'text-secondary'}">${ev.kind === 'owe' ? '−' : '+'}${fmt(ev.amount)}</strong>
              </div>
            `).join('') || `<p class="text-xs text-on-surface-variant py-4 text-center">Sin historial todavía.</p>`}
          </div>
        </div>
      `);
    }

    async function settleAllWithPerson(personName) {
      const lower = String(personName || '').trim().toLowerCase();
      const targets = (S.debts || []).filter(d => !d.settled && String(d.person || '').trim().toLowerCase() === lower);
      if (targets.length === 0) return;
      for (const d of targets) {
        d.log = d.log || [];
        d.log.push({ d: todayStr(), a: d.amount, k: 'pay', n: 'Liquidación total en 1 toque' });
        d.amount = 0;
        d.amount_cents = 0;
        d.settled = true;
        if (loggedUserId) await dbUpsertPersonalDebt(d);
      }
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast(`✓ Todas las cuentas con ${personName} liquidadas`);
    }

    function sendConfigurableReminder(personName, amountCents, style = 'suave') {
      // Anti-abuse check: quiet hours (22:00 - 08:00) + max 1/week per person
      const hr = new Date().getHours();
      if (hr >= 22 || hr < 8) {
        if (!confirm('Son horas de descanso (22:00–08:00). ¿Seguro que quieres enviar el recordatorio ahora?')) return;
      }
      const key = 'claridad_rem_' + personName.toLowerCase().replace(/\s+/g, '_');
      const lastSent = Number(localStorage.getItem(key) || 0);
      if (lastSent && (Date.now() - lastSent) < (7 * 86400 * 1000)) {
        if (!confirm(`Ya enviaste un recordatorio a ${personName} hace menos de 7 días. ¿Enviar de nuevo?`)) return;
      }
      localStorage.setItem(key, String(Date.now()));

      const amtStr = fmt(Money.fromCents(amountCents));
      const msg = style === 'humor'
        ? `Oye ${personName}, tenemos pendiente ${amtStr}. Te mando un ☕ virtual hasta que cuadremos cuentas 😄💸`
        : `¡Hola ${personName}! Recordatorio amistoso: tenemos pendiente ${amtStr} 🙂. Cuando puedas lo dejamos saldado. ¡Gracias!`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    }
