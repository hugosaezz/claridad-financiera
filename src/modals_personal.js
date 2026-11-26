    // ============================================================================
    // 15. PERSONAL FINANCE MODALS, VOICE, P2P & INITIALIZATION (Bolsillo)
    // ============================================================================
    let txModalState = { type: "exp", editId: null, cat: "comida", incCat: "nomina", method: "tarjeta", tripId: "" };
    let voiceRec = null;

    function openTxModal(type = "exp", editId = null, autoStartVoice = false, presetTripId = "") {
      let existing = null;
      if (editId) {
        existing = type === "exp"
          ? (S.expenses || []).find(e => e.id === editId)
          : (S.incomes || []).find(i => i.id === editId);
      }

      txModalState = {
        type,
        editId: existing ? existing.id : null,
        cat: existing && type === "exp" ? existing.cat : "comida",
        incCat: existing && type === "inc" ? (existing.cat || "extra") : "extra",
        method: existing && type === "exp" ? (existing.method || "tarjeta") : "tarjeta",
        tripId: existing && type === "exp" ? (existing.tripId || "") : presetTripId
      };

      const isExp = type === "exp";
      const amountVal = existing ? String(existing.amount) : "";
      const noteVal = existing ? (existing.note || "") : "";
      const sourceVal = existing ? (existing.source || "") : "";
      const dateVal = existing ? (existing.date || todayStr()) : todayStr();
      const refundVal = existing ? !!existing.refund : false;

      const catGridHtml = allCats().map(c => {
        const sel = txModalState.cat === c.id;
        return `
          <button type="button" onclick="selectTxCategory('${c.id}')" data-tx-cat="${c.id}" class="p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition ${sel ? 'border-primary bg-primary/10 text-primary font-extrabold' : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">
            <span style="color:${c.c}">${ico(c.icon, 'text-[20px]')}</span>
            <span class="text-[11px] truncate w-full">${esc(c.name)}</span>
          </button>`;
      }).join('');

      const incCatsHtml = INCS.map(ic => {
        const sel = txModalState.incCat === ic.id;
        return `
          <button type="button" onclick="selectTxIncCat('${ic.id}')" data-tx-inccat="${ic.id}" class="px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 transition ${sel ? 'border-secondary bg-secondary text-on-secondary' : 'border-outline-variant/40 bg-surface-container-low text-on-surface'}">
            ${ico(ic.icon, 'text-[14px]')}
            ${esc(ic.name)}
          </button>`;
      }).join('');

      const methodsHtml = PAY_METHODS.map(m => {
        const sel = txModalState.method === m.id;
        return `
          <button type="button" onclick="selectTxMethod('${m.id}')" data-tx-method="${m.id}" class="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${sel ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant'}">
            ${ico(m.icon, 'text-[14px]')}
            ${esc(m.name)}
          </button>`;
      }).join('');

      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="w-10 h-1 rounded-full bg-outline-variant/60 mx-auto -mt-1 sm:hidden"></div>
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${existing ? (isExp ? 'Editar Gasto' : 'Editar Ingreso') : (isExp ? 'Registrar Gasto Personal' : 'Registrar Ingreso')}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container active-scale">${ico('close', 'text-[19px]')}</button>
          </div>

          ${!existing ? `
            <div class="grid grid-cols-2 bg-surface-container p-1 rounded-2xl gap-1">
              <button type="button" onclick="haptic('selection'); openTxModal('exp')" class="py-2 rounded-xl text-xs font-extrabold transition ${isExp ? 'bg-surface-container-lowest text-tertiary shadow-xs' : 'text-on-surface-variant'}">Gasto (−)</button>
              <button type="button" onclick="haptic('selection'); openTxModal('inc')" class="py-2 rounded-xl text-xs font-extrabold transition ${!isExp ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant'}">Ingreso (+)</button>
            </div>
          ` : ''}

          <!-- Giant Neo-Fintech Currency Input + Quick Amount Chips -->
          <div class="flex flex-col gap-2">
            <div class="relative">
              <input id="tx-amount" type="number" step="0.01" inputmode="decimal" value="${esc(amountVal)}" placeholder="0,00" class="w-full py-3.5 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/45 font-display-currency text-3xl sm:text-4xl font-extrabold text-center text-on-surface focus:border-primary outline-none tabular-nums"/>
              <span class="absolute right-4 top-1/2 -translate-y-1/2 font-headline-md text-xl font-extrabold text-outline">€</span>
            </div>
            ${!existing ? `
              <div class="flex items-center justify-center gap-1.5 flex-wrap">
                ${(isExp ? [5, 10, 20, 50] : [50, 100, 250, 500]).map(v => `
                  <button type="button" onclick="haptic('selection'); const inp=$('#tx-amount'); if(inp){ inp.value=((parseAmount(inp.value)||0)+${v}).toFixed(2); }" class="px-3 py-1 rounded-full bg-surface-container-low hover:bg-primary/12 text-xs font-extrabold text-primary border border-outline-variant/35 active-scale">+${v} €</button>
                `).join('')}
              </div>
            ` : ''}
          </div>

          ${isExp ? `
            <button type="button" id="btn-modal-voice" onclick="toggleVoiceRecognition()" class="w-full py-2 px-3 rounded-xl border border-dashed border-outline-variant text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary flex items-center justify-center gap-1.5 transition">
              ${ico('mic', 'text-[17px]')}
              <span id="voice-status-text">Dictar por voz · Ej: «14,50 euros de menú»</span>
            </button>

            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1.5">Categoría</label>
              <div class="grid grid-cols-3 gap-2">
                ${catGridHtml}
              </div>
            </div>

            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1.5">Método de pago</label>
              <div class="flex flex-wrap gap-1.5">
                ${methodsHtml}
              </div>
            </div>
          ` : `
            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1.5">Tipo de ingreso</label>
              <div class="flex flex-wrap gap-1.5 mb-2">${incCatsHtml}</div>
              <input id="tx-source" type="text" value="${esc(sourceVal)}" placeholder="Origen (Nómina, Freelance, Bizum...)" class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            </div>
          `}

          <div>
            <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Concepto / Nota ${isExp ? '(puedes incluir #etiquetas)' : ''}</label>
            <input id="tx-note" type="text" value="${esc(noteVal)}" oninput="autoCategorizeOnType(this.value)" placeholder="${isExp ? 'Ej. Mercadona Supermercado #compra' : 'Nota opcional'}" class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Cuenta</label>
              <select id="tx-account" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${(S.accounts || defaultAccountsList()).filter(a => !a.archived).map(a => `<option value="${a.id}" ${(existing?.account_id || 'acc_main') === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Divisa</label>
              <select id="tx-currency" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${CURRENCIES.map(c => `<option value="${c.code}" ${(existing?.currency || S?.settings?.currency || 'EUR') === c.code ? 'selected' : ''}>${esc(c.code)} (${esc(c.symbol)})</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Fecha</label>
              <input id="tx-date" type="date" value="${esc(dateVal)}" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            </div>
            ${isExp ? `
              <div>
                <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Viaje (opcional)</label>
                <select id="tx-trip" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                  <option value="">— Ninguno —</option>
                  ${(S.trips || []).map(t => `<option value="${t.id}" ${txModalState.tripId === t.id ? 'selected' : ''}>✈️ ${esc(t.name)}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>

          ${isExp ? `
            <label class="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer pt-1">
              <input id="tx-refund" type="checkbox" ${refundVal ? 'checked' : ''} class="w-4 h-4 rounded text-primary"/>
              Marcar como pendiente de devolución (Amazon, ropa, fianza...)
            </label>
          ` : ''}

          <div class="flex items-center gap-2 pt-2">
            ${existing ? `
              <button type="button" onclick="deleteTx('${type}', '${existing.id}')" class="px-4 py-3 rounded-xl bg-tertiary/10 text-tertiary font-bold text-xs hover:bg-tertiary/20 transition">
                Eliminar
              </button>
            ` : ''}
            <button type="button" onclick="saveTxModal()" class="flex-1 py-3 rounded-xl ${isExp ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'} font-label-lg text-sm font-bold shadow-sm hover:opacity-95 transition active-scale">
              ${existing ? 'Guardar Cambios' : (isExp ? 'Guardar Gasto' : 'Guardar Ingreso')}
            </button>
          </div>
        </div>
      `);

      setTimeout(() => $('#tx-amount')?.focus(), 120);
      if (autoStartVoice && isExp) {
        setTimeout(() => startVoiceRecognition(), 250);
      }
    }

    function selectTxCategory(catId) {
      txModalState.cat = catId;
      $$('[data-tx-cat]').forEach(btn => {
        const sel = btn.dataset.txCat === catId;
        btn.className = `p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition ${sel ? 'border-primary bg-primary/10 text-primary font-extrabold' : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`;
      });
    }

    function selectTxIncCat(incId) {
      txModalState.incCat = incId;
      const srcInput = $('#tx-source');
      if (srcInput && !srcInput.value) srcInput.value = incById(incId).name;
      $$('[data-tx-inccat]').forEach(btn => {
        const sel = btn.dataset.txInccat === incId;
        btn.className = `px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 transition ${sel ? 'border-secondary bg-secondary text-on-secondary' : 'border-outline-variant/40 bg-surface-container-low text-on-surface'}`;
      });
    }

    function selectTxMethod(methodId) {
      txModalState.method = methodId;
      $$('[data-tx-method]').forEach(btn => {
        const sel = btn.dataset.txMethod === methodId;
        btn.className = `px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${sel ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant'}`;
      });
    }

    function autoCategorizeOnType(noteText) {
      if (txModalState.type !== 'exp' || txModalState.editId) return;
      const ruled = applyRule(noteText);
      if (ruled) {
        selectTxCategory(ruled);
        return;
      }
      const guessed = guessCatFromMerchant(noteText);
      if (guessed && guessed !== 'otros') selectTxCategory(guessed);
    }

    async function saveTxModal() {
      const amountCents = Money.toCents($('#tx-amount')?.value);
      if (!(amountCents > 0)) {
        $('#tx-amount')?.focus();
        return;
      }
      const date = $('#tx-date')?.value || todayStr();
      const note = ($('#tx-note')?.value || '').trim();
      const account_id = $('#tx-account')?.value || 'acc_main';
      const currency = $('#tx-currency')?.value || (S?.settings?.currency || 'EUR');
      const isExp = (txModalState.type === "exp");

      closeUniversalModal();

      if (isExp) {
        const payload = enrichTransactionMoney({
          amount_cents: amountCents,
          amount: Money.fromCents(amountCents),
          currency,
          account_id,
          cat: txModalState.cat,
          method: txModalState.method,
          note,
          date,
          tripId: $('#tx-trip')?.value || "",
          refund: !!$('#tx-refund')?.checked,
          source: txModalState.source || 'manual',
          ts: Date.now()
        }, 'exp');
        let savedExp = null;
        if (txModalState.editId) {
          const target = S.expenses.find(e => e.id === txModalState.editId);
          if (target) {
            Object.assign(target, payload);
            target.sync_version = (target.sync_version || 1) + 1;
            savedExp = target;
          }
        } else {
          savedExp = { id: uid(), ...payload };
          S.expenses.push(savedExp);
        }
        viewMk = monthKey(date);
        renderAllViews();
        if (savedExp) await dbUpsertPersonalExpense(savedExp);
      } else {
        const source = ($('#tx-source')?.value || '').trim() || incById(txModalState.incCat).name;
        const payload = enrichTransactionMoney({
          amount_cents: amountCents,
          amount: Money.fromCents(amountCents),
          currency,
          account_id,
          cat: txModalState.incCat,
          source,
          note,
          date
        }, 'inc');
        let savedInc = null;
        if (txModalState.editId) {
          const target = S.incomes.find(i => i.id === txModalState.editId);
          if (target) {
            Object.assign(target, payload);
            target.sync_version = (target.sync_version || 1) + 1;
            savedInc = target;
          }
        } else {
          savedInc = { id: uid(), ...payload };
          S.incomes.push(savedInc);
        }
        viewMk = monthKey(date);
        renderAllViews();
        if (savedInc) await dbUpsertPersonalIncome(savedInc);
      }

      renderAllViews();
      haptic('success');
      showToast(isExp ? "Gasto guardado ✓" : "Ingreso guardado ✓");
    }

    async function deleteTx(kind, id) {
      haptic('warning');
      const snapshot = kind === 'exp'
        ? (S.expenses || []).find(e => e.id === id)
        : (S.incomes || []).find(i => i.id === id);
      if (!snapshot) return;
      const backupCopy = JSON.parse(JSON.stringify(snapshot));
      delete backupCopy.db_id;

      // Soft-delete into 30-day recoverable trash
      const trashEntry = { trashId: uid(), kind, item: backupCopy, deletedAt: Date.now() };
      if (!Array.isArray(S.trash)) S.trash = [];
      S.trash.unshift(trashEntry);

      closeUniversalModal();
      if (kind === "exp") {
        S.expenses = (S.expenses || []).filter(e => e.id !== id);
        if (loggedUserId) await dbDeletePersonalExpense(id);
      } else {
        S.incomes = (S.incomes || []).filter(i => i.id !== id);
        if (loggedUserId) await dbDeletePersonalIncome(id);
      }
      saveLocalState(true);
      renderAllViews();
      showToast(
        kind === "exp" ? `Gasto eliminado (${fmt(backupCopy.amount)})` : `Ingreso eliminado (${fmt(backupCopy.amount)})`,
        "Deshacer",
        async () => {
          haptic('success');
          await restoreFromTrash(trashEntry.trashId);
        },
        5000
      );
    }

    // Voice Recognition (Web Speech API)
    function toggleVoiceRecognition() {
      if (voiceRec) stopVoiceRecognition();
      else startVoiceRecognition();
    }

    function stopVoiceRecognition() {
      try { if (voiceRec) voiceRec.stop(); } catch (e) {}
      voiceRec = null;
      const btn = $('#btn-modal-voice');
      if (btn) btn.classList.remove('border-tertiary', 'text-tertiary', 'bg-tertiary/10');
    }

    function startVoiceRecognition() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const txtEl = $('#voice-status-text');
      if (!SR) {
        if (txtEl) txtEl.textContent = "Tu navegador no soporta dictado por voz (usa Chrome o Safari)";
        return;
      }
      stopVoiceRecognition();
      voiceRec = new SR();
      voiceRec.lang = "es-ES";
      voiceRec.interimResults = false;
      voiceRec.maxAlternatives = 1;
      const btn = $('#btn-modal-voice');
      if (btn) btn.classList.add('border-tertiary', 'text-tertiary', 'bg-tertiary/10');
      if (txtEl) txtEl.textContent = "🔴 Escuchando... di p. ej. «15 euros en Mercadona»";

      voiceRec.onresult = (ev) => {
        const transcript = ev.results[0][0].transcript;
        if (txtEl) txtEl.textContent = `Oído: «${transcript}»`;
        const amt = parseAmount(transcript);
        if (amt > 0 && $('#tx-amount')) $('#tx-amount').value = amt.toFixed(2);
        let note = transcript.replace(/(\d+[\.,]?\d*)\s*(€|euros?)/gi, "").replace(/^(de|en|por)\s+/i, "").trim();
        if (note && $('#tx-note')) {
          const clean = note.charAt(0).toUpperCase() + note.slice(1);
          $('#tx-note').value = clean;
          autoCategorizeOnType(clean);
        }
      };
      voiceRec.onerror = () => {
        if (txtEl) txtEl.textContent = "No se pudo entender, pulsa para reintentar";
      };
      voiceRec.onend = () => stopVoiceRecognition();
      try { voiceRec.start(); } catch (e) {}
    }

    // Category Detail Modal
    function openCategoryDetailModal(catId) {
      const c = catById(catId);
      const list = monthExpenses(viewMk).filter(e => e.cat === catId).sort((a, b) => b.date.localeCompare(a.date));
      const total = sumExp(list);
      const bdg = effBudget(catId);
      const pct = bdg > 0 ? Math.min(100, Math.round((total / bdg) * 100)) : 0;

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div class="flex items-center gap-3">
              <span class="w-11 h-11 rounded-2xl flex items-center justify-center" style="background:${c.c}1a;color:${c.c}">
                ${ico(c.icon, 'text-[22px]')}
              </span>
              <div>
                <h3 class="font-headline-sm text-lg font-extrabold text-on-surface">${esc(c.name)}</h3>
                <p class="text-xs text-on-surface-variant capitalize">${monthLabel(viewMk)} • ${list.length} movimiento(s)</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>

          <div class="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-2">
            <div class="flex items-baseline justify-between">
              <span class="font-display-currency-mobile text-2xl font-extrabold text-on-surface tabular-nums">−${fmt(total)}</span>
              ${bdg > 0 ? `<span class="text-xs font-bold text-on-surface-variant">Presupuesto: ${fmt0(bdg)} (${pct}%)</span>` : ''}
            </div>
            ${bdg > 0 ? `
              <div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                <div class="h-full rounded-full ${pct >= 100 ? 'bg-tertiary' : 'bg-primary'}" style="width:${pct}%"></div>
              </div>` : ''}
          </div>

          <div class="divide-y divide-outline-variant/20 max-h-80 overflow-y-auto">
            ${list.map(e => renderExpenseRow(e)).join('') || `<p class="text-xs text-center text-on-surface-variant py-6">Sin gastos en esta categoría este mes.</p>`}
          </div>
        </div>
      `);
    }

    // ============================================================================
    // 16. PERSONAL P2P DEBTS & TRICOUNT BILL SPLITTER MODALS
    // ============================================================================
    function openP2PDebtModal(type = 'owed') {
      const isOwed = type === 'owed';
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${isOwed ? 'Registrar «Me deben»' : 'Registrar «Debo»'}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <div class="grid grid-cols-2 bg-surface-container p-1 rounded-2xl gap-1">
            <button type="button" onclick="haptic('selection'); openP2PDebtModal('owed')" class="py-2 rounded-xl text-xs font-extrabold transition ${isOwed ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-on-surface-variant'}">Me deben (+)</button>
            <button type="button" onclick="haptic('selection'); openP2PDebtModal('owe')" class="py-2 rounded-xl text-xs font-extrabold transition ${!isOwed ? 'bg-surface-container-lowest text-tertiary shadow-xs' : 'text-on-surface-variant'}">Debo (−)</button>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Persona / Contacto</label>
            <input id="p2p-person" type="text" placeholder="Ej. Carlos Mendoza, Sofía..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">Importe (€)</label>
              <input id="p2p-amount" type="number" step="0.01" placeholder="50.00" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-base font-extrabold text-on-surface"/>
            </div>
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">Fecha límite (opcional)</label>
              <input id="p2p-due" type="date" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Concepto / Motivo</label>
            <input id="p2p-note" type="text" placeholder="Ej. Entrada concierto, Gasolina viaje..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <button onclick="saveP2PDebtModal('${type}')" class="w-full py-3 rounded-xl ${isOwed ? 'bg-secondary text-on-secondary' : 'bg-tertiary text-on-tertiary'} font-label-lg text-sm font-bold hover:opacity-95 transition active-scale">
            Guardar Cuenta P2P
          </button>
        </div>
      `);
    }

    function upsertPersonalDebt(person, type, amount, note, due = "") {
      person = (person || "").trim() || "Contacto";
      let d = (S.debts || []).find(x => !x.settled && x.person.toLowerCase() === person.toLowerCase() && x.type === type);
      if (d) {
        d.amount = Math.round((d.amount + amount) * 100) / 100;
        d.initialAmount = Math.round(((d.initialAmount || d.amount) + amount) * 100) / 100;
        if (note) d.note = note;
        if (due) d.due = due;
        d.log.push({ d: todayStr(), a: Math.round(amount * 100) / 100, k: "add", n: note || "" });
      } else {
        d = {
          id: uid(),
          person,
          amount: Math.round(amount * 100) / 100,
          initialAmount: Math.round(amount * 100) / 100,
          type,
          note: note || "",
          due: due || "",
          settled: false,
          log: [{ d: todayStr(), a: Math.round(amount * 100) / 100, k: "add", n: note || "" }]
        };
        S.debts.push(d);
      }
      dbUpsertPersonalDebt(d);
      return d;
    }

    function saveP2PDebtModal(type) {
      const person = ($('#p2p-person')?.value || '').trim();
      const amount = parseAmount($('#p2p-amount')?.value);
      const note = ($('#p2p-note')?.value || '').trim();
      const due = $('#p2p-due')?.value || '';
      if (!person || !(amount > 0)) return;
      upsertPersonalDebt(person, type, amount, note, due);
      closeUniversalModal();
      renderAllViews();
      showToast("Cuenta P2P registrada en Base de Datos ✓");
    }

    function openP2PPartialModal(debtId, prefillFull = false) {
      const d = (S.debts || []).find(x => x.id === debtId);
      if (!d) return;
      const isOwed = d.type === 'owed';
      const defaultAmt = prefillFull ? d.amount.toFixed(2) : (d.amount / 2).toFixed(2);
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${prefillFull ? (isOwed ? 'Marcar Cobrado' : 'Saldar Deuda') : 'Registrar Abono Parcial'} • ${esc(d.person)}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-on-surface-variant">Saldo pendiente: <strong>${fmt(d.amount)}</strong></span>
            <button onclick="$('#p2p-partial-amount').value='${d.amount.toFixed(2)}'" class="text-primary font-bold hover:underline">Importe total (${fmt(d.amount)})</button>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Importe (€)</label>
            <input id="p2p-partial-amount" type="number" step="0.01" value="${defaultAmt}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xl font-extrabold text-on-surface text-center"/>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Nota del movimiento</label>
            <input id="p2p-partial-note" type="text" placeholder="Ej. Bizum recibido / pagado" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <label class="flex items-center gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-bold text-on-surface cursor-pointer">
            <input id="p2p-reflect-mensual" type="checkbox" class="w-4 h-4 rounded text-primary"/>
            <span>${isOwed ? `Apuntar también como Ingreso (+) en mi Control Mensual` : `Apuntar también como Gasto (−) en mi Control Mensual`}</span>
          </label>
          <button onclick="saveP2PPartialModal('${d.id}')" class="w-full py-3 rounded-xl ${isOwed ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'} font-label-lg text-sm font-bold hover:opacity-95 transition active-scale">
            ${prefillFull ? 'Confirmar Liquidación' : 'Registrar Abono'}
          </button>
        </div>
      `);
    }

    async function saveP2PPartialModal(debtId) {
      const d = (S.debts || []).find(x => x.id === debtId);
      const amt = parseAmount($('#p2p-partial-amount')?.value);
      const note = ($('#p2p-partial-note')?.value || '').trim() || 'Liquidación P2P';
      const reflect = !!$('#p2p-reflect-mensual')?.checked;
      if (!d || !(amt > 0)) return;
      d.amount = Math.max(0, Math.round((d.amount - amt) * 100) / 100);
      d.log.push({ d: todayStr(), a: amt, k: "pay", n: note });
      if (d.amount <= 0.005) {
        d.amount = 0;
        d.settled = true;
        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 65, origin: { y: 0.6 } });
      }
      closeUniversalModal();
      await dbUpsertPersonalDebt(d);

      if (reflect) {
        if (d.type === 'owed') {
          const newInc = {
            id: uid(),
            amount: Math.round(amt * 100) / 100,
            cat: 'bizum',
            source: `Cobro deuda de ${d.person}`,
            note: d.note || note,
            date: todayStr()
          };
          S.incomes.push(newInc);
          await dbUpsertPersonalIncome(newInc);
        } else {
          const newExp = {
            id: uid(),
            amount: Math.round(amt * 100) / 100,
            cat: 'otros',
            method: 'bizum',
            note: `Pago deuda a ${d.person} (${d.note || note}) #deuda`,
            date: todayStr(),
            tripId: '',
            refund: false,
            ts: Date.now()
          };
          S.expenses.push(newExp);
          await dbUpsertPersonalExpense(newExp);
        }
      }
      renderAllViews();
      showToast(d.settled ? "Cuenta totalmente saldada ✓" : `Abono registrado (restan ${fmt(d.amount)}) ✓`);
    }

    function settleFullP2PDebt(debtId) {
      openP2PPartialModal(debtId, true);
    }

    function openP2PDebtHistoryModal(debtId) {
      const d = (S.debts || []).find(x => x.id === debtId);
      if (!d) return;
      const logHtml = (d.log || []).slice().reverse().map(l => `
        <div class="py-2 flex items-center justify-between text-xs border-b border-outline-variant/20 last:border-0">
          <span>${l.k === 'add' ? '➕ Cargo' : '✅ Abono'} • ${fmtDay(l.d)} ${l.n ? '· ' + esc(l.n) : ''}</span>
          <strong class="${l.k === 'add' ? 'text-tertiary' : 'text-secondary'} tabular-nums">${l.k === 'add' ? '+' : '−'}${fmt(l.a)}</strong>
        </div>
      `).join('');

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Historial con ${esc(d.person)}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <div class="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
            <span class="text-xs font-bold text-on-surface-variant">${d.type === 'owed' ? 'Te debe actualmente' : 'Debes actualmente'}</span>
            <span class="font-headline-sm text-lg font-extrabold ${d.type === 'owed' ? 'text-secondary' : 'text-tertiary'}">${fmt(d.amount)}</span>
          </div>
          <div class="max-h-60 overflow-y-auto">${logHtml}</div>
          <div class="flex justify-between pt-2">
            <button onclick="deleteP2PDebt('${d.id}'); closeUniversalModal()" class="text-xs font-bold text-tertiary hover:underline">Eliminar registro</button>
            <button onclick="closeUniversalModal()" class="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold">Cerrar</button>
          </div>
        </div>
      `);
    }

    async function deleteP2PDebt(debtId) {
      await dbDeletePersonalDebt(debtId);
      renderAllViews();
      showToast("Deuda P2P eliminada ✓");
    }

    // Split Bill Modal
    function openSplitBillModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Dividir Ticket entre Amigos</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">Total del ticket (€)</label>
              <input id="split-total" type="number" step="0.01" placeholder="80.00" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-base font-extrabold text-on-surface"/>
            </div>
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">¿Quién pagó la cuenta?</label>
              <select id="split-payer" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                <option value="__me">Pagué yo (me deben)</option>
                <option value="__other">Pagó otro amigo (le debo)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Concepto</label>
            <input id="split-desc" type="text" placeholder="Ej. Cena Pizzería, Taxi..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Amigos participantes (separados por coma)</label>
            <input id="split-names" type="text" placeholder="Ej. Carlos, Sofía, Javi" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <label class="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
            <input id="split-add-my-exp" type="checkbox" checked class="w-4 h-4 rounded text-primary"/>
            Registrar mi parte proporcional como gasto personal de este mes
          </label>
          <button onclick="executeSplitBill()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold hover:bg-primary-container transition active-scale">
            Dividir y Generar Cuentas P2P
          </button>
        </div>
      `);
    }

    async function executeSplitBill() {
      const total = parseAmount($('#split-total')?.value);
      const desc = ($('#split-desc')?.value || '').trim() || 'Cuenta compartida';
      const payer = $('#split-payer')?.value || '__me';
      const names = ($('#split-names')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!(total > 0) || names.length === 0) return;

      const totalPeople = names.length + 1; // Friends + Me
      const share = Math.round((total / totalPeople) * 100) / 100;

      if (payer === '__me') {
        names.forEach(n => upsertPersonalDebt(n, 'owed', share, desc));
      } else {
        upsertPersonalDebt(names[0], 'owe', share, desc);
      }

      if ($('#split-add-my-exp')?.checked) {
        const myExp = {
          id: uid(),
          amount: share,
          cat: guessCatFromMerchant(desc) !== 'otros' ? guessCatFromMerchant(desc) : 'ocio',
          method: 'bizum',
          note: `${desc} (mi parte 1/${totalPeople}) #compartido`,
          date: todayStr(),
          tripId: "",
          refund: false,
          ts: Date.now()
        };
        S.expenses.push(myExp);
        await dbUpsertPersonalExpense(myExp);
      }

      closeUniversalModal();
      renderAllViews();
      showToast(`Dividido: ${fmt(share)} por persona ✓`);
    }

    // Tricount-style Local Shared Groups
    function openNewLocalGroupModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Crear Bote / Viaje Multi-Pagador</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Nombre del viaje o evento</label>
            <input id="lg-name" type="text" placeholder="Ej. Viaje Ibiza, Casa Rural..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Participantes (separados por comas)</label>
            <input id="lg-members" type="text" value="Hugo, Carlos, Sofía" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <button onclick="saveNewLocalGroup()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold">Crear Bote</button>
        </div>
      `);
    }

    function saveNewLocalGroup() {
      const name = ($('#lg-name')?.value || '').trim() || 'Bote compartido';
      const members = [...new Set(($('#lg-members')?.value || '').split(',').map(s => s.trim()).filter(Boolean))];
      if (members.length < 2) {
        alert("Incluye al menos 2 participantes.");
        return;
      }
      S.groups.push({ id: uid(), name, members, items: [] });
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast("Bote creado ✓");
    }

    function openLocalGroupDetailModal(groupId) {
      const g = (S.groups || []).find(x => x.id === groupId);
      if (!g) return;
      const bal = computeLocalGroupBalances(g);
      const plan = computeMinimumSettlementPlan(bal);

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${esc(g.name)}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>

          <div class="p-3.5 rounded-2xl bg-surface-container-low flex flex-col gap-2">
            <span class="text-[11px] font-extrabold uppercase text-primary">Añadir ticket al bote</span>
            <div class="grid grid-cols-2 gap-2">
              <input id="lgi-desc" type="text" placeholder="Concepto (ej. Gasolina)" class="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
              <input id="lgi-amount" type="number" step="0.01" placeholder="Importe (€)" class="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-on-surface-variant font-bold">Pagó:</span>
              <select id="lgi-payer" class="flex-1 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${g.members.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}
              </select>
              <button onclick="addLocalGroupExpense('${g.id}')" class="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold">+ Añadir</button>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl border border-outline-variant/30 flex flex-col gap-1.5">
            <span class="text-[11px] font-extrabold uppercase text-on-surface-variant">Quién debe a quién</span>
            ${plan.map(p => `
              <div class="flex justify-between text-xs py-1">
                <span><strong>${esc(p.from)}</strong> → paga a → <strong>${esc(p.to)}</strong></span>
                <strong class="text-secondary tabular-nums">${fmt(p.amount)}</strong>
              </div>
            `).join('') || `<span class="text-xs text-secondary font-bold">✓ Todo saldado</span>`}
          </div>

          <div class="divide-y divide-outline-variant/20 max-h-48 overflow-y-auto">
            ${(g.items || []).slice().reverse().map(it => `
              <div class="py-2 flex items-center justify-between text-xs">
                <div>
                  <p class="font-bold text-on-surface">${esc(it.desc)}</p>
                  <p class="text-on-surface-variant">Pagó ${esc(it.payer)} • ${fmtDay(it.date)}</p>
                </div>
                <div class="flex items-center gap-2">
                  <strong class="tabular-nums">${fmt(it.amount)}</strong>
                  <button onclick="deleteLocalGroupExpense('${g.id}', '${it.id}')" class="text-outline hover:text-error">${ico('delete', 'text-[16px]')}</button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="flex justify-between pt-1">
            <button onclick="deleteLocalGroup('${g.id}')" class="text-xs font-bold text-tertiary hover:underline">Eliminar bote</button>
            <button onclick="closeUniversalModal()" class="px-4 py-1.5 rounded-xl bg-surface-container text-xs font-bold">Cerrar</button>
          </div>
        </div>
      `);
    }

    function addLocalGroupExpense(groupId) {
      const g = (S.groups || []).find(x => x.id === groupId);
      const desc = ($('#lgi-desc')?.value || '').trim() || 'Gasto';
      const amount = parseAmount($('#lgi-amount')?.value);
      const payer = $('#lgi-payer')?.value;
      if (!g || !(amount > 0)) return;
      g.items.push({ id: uid(), desc, amount, payer, date: todayStr(), for: [...g.members] });
      saveLocalState(true);
      openLocalGroupDetailModal(groupId);
      renderAllViews();
    }

    function deleteLocalGroupExpense(groupId, itemId) {
      const g = (S.groups || []).find(x => x.id === groupId);
      if (!g) return;
      g.items = g.items.filter(x => x.id !== itemId);
      saveLocalState(true);
      openLocalGroupDetailModal(groupId);
      renderAllViews();
    }

    function deleteLocalGroup(groupId) {
      if (!confirm("¿Eliminar este bote compartido?")) return;
      S.groups = (S.groups || []).filter(x => x.id !== groupId);
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
    }

    // ============================================================================
    // 17. SETTINGS, GOALS, SUBSCRIPTIONS, TRIPS, EXPORT & APPLE PAY SHORTCUT
    // ============================================================================
    function updateSalarySettings(salary, day, auto) {
      if (salary !== null) S.settings.salary = Math.max(0, parseAmount(salary));
      if (day !== null) S.settings.salaryDay = Math.min(28, Math.max(1, parseInt(day) || 1));
      if (auto !== null) S.settings.salaryAuto = !!auto;
      saveLocalState(true);
      renderAllViews();
      showToast("Nómina actualizada en Base de Datos ✓");
    }

    function updateCategoryBudget(catId, val) {
      const v = parseAmount(val);
      if (v > 0) S.budgets[catId] = v;
      else delete S.budgets[catId];
      saveLocalState(true);
      renderAllViews();
      showToast("Presupuesto actualizado ✓");
    }

    function toggleCategoryRollover(catId) {
      S.rollover[catId] = !S.rollover[catId];
      if (!S.rollover[catId]) {
        delete S.rollover[catId];
        delete S.carried[catId];
      }
      saveLocalState(true);
      renderAllViews();
    }

    function openRecurringModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Nueva Suscripción o Gasto Fijo</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <input id="rec-name" type="text" placeholder="Nombre (Netflix, Gimnasio, Alquiler...)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          <div class="grid grid-cols-2 gap-3">
            <input id="rec-amount" type="number" step="0.01" placeholder="Importe (€)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            <input id="rec-day" type="number" min="1" max="31" placeholder="Día del mes (1-31)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <select id="rec-cat" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface">
            ${allCats().map(c => `<option value="${c.id}" ${c.id === 'susc' ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
          <label class="flex items-center gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-bold text-on-surface cursor-pointer">
            <input id="rec-autocharge" type="checkbox" checked class="w-4 h-4 rounded text-primary"/>
            <span>Auto-sumar al Control Mensual automáticamente cuando llegue su día de cobro</span>
          </label>
          <button onclick="saveRecurringModal()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold">Guardar Suscripción</button>
        </div>
      `);
    }

    function saveRecurringModal() {
      const name = ($('#rec-name')?.value || '').trim() || 'Suscripción';
      const amount = parseAmount($('#rec-amount')?.value);
      const day = parseInt($('#rec-day')?.value) || 1;
      const cat = $('#rec-cat')?.value || 'susc';
      const autoCharge = !!$('#rec-autocharge')?.checked;
      if (!(amount > 0)) return;
      S.recurring.push({ id: uid(), name, amount, day, cat, autoCharge });
      checkAutoRecurringExpenses();
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast("Suscripción añadida ✓");
    }

    function deleteRecurring(id) {
      S.recurring = (S.recurring || []).filter(r => r.id !== id);
      saveLocalState(true);
      renderAllViews();
    }

    function openNewGoalModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Nuevo Objetivo de Ahorro</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <input id="goal-name" type="text" placeholder="Ej. Fondo de emergencia, Viaje, Coche..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          <div class="grid grid-cols-2 gap-3">
            <input id="goal-target" type="number" step="10" placeholder="Meta total (€)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            <input id="goal-deadline" type="date" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
          </div>
          <button onclick="saveNewGoalModal()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold">Crear Objetivo</button>
        </div>
      `);
    }

    function saveNewGoalModal() {
      const name = ($('#goal-name')?.value || '').trim() || 'Objetivo';
      const target = parseAmount($('#goal-target')?.value);
      const deadline = $('#goal-deadline')?.value || '';
      if (!(target > 0)) return;
      S.goals.push({ id: uid(), name, target, saved: 0, deadline, color: "#006c4a" });
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast("Objetivo creado ✓");
    }

    function openGoalMoveModal(goalId, dir) {
      const g = (S.goals || []).find(x => x.id === goalId);
      if (!g) return;
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${dir > 0 ? 'Aportar a' : 'Retirar de'} ${esc(g.name)}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <p class="text-xs text-on-surface-variant">Ahorrado actual: <strong>${fmt(g.saved)}</strong> de ${fmt(g.target)}</p>
          <input id="goal-move-amt" type="number" step="5" placeholder="50.00" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xl font-extrabold text-center text-on-surface"/>
          <button onclick="executeGoalMove('${g.id}', ${dir})" class="w-full py-3 rounded-xl ${dir > 0 ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'} font-label-lg text-sm font-bold">
            ${dir > 0 ? 'Sumar Ahorro' : 'Retirar'}
          </button>
        </div>
      `);
    }

    function executeGoalMove(goalId, dir) {
      const amt = parseAmount($('#goal-move-amt')?.value);
      if (!(amt > 0)) return;
      closeUniversalModal();
      if (typeof applyGoalContribution === 'function') {
        applyGoalContribution(goalId, dir * Money.toCents(amt));
        return;
      }
      const g = (S.goals || []).find(x => x.id === goalId);
      if (!g) return;
      g.saved = Math.max(0, Math.round((g.saved + dir * amt) * 100) / 100);
      saveLocalState(true);
      renderAllViews();
      showToast("Objetivo actualizado ✓");
    }

    function deleteGoal(goalId) {
      if (!confirm("¿Eliminar este objetivo de ahorro?")) return;
      S.goals = (S.goals || []).filter(g => g.id !== goalId);
      saveLocalState(true);
      renderAllViews();
    }

    function openNewTripModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Nuevo Viaje</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <input id="trip-name" type="text" placeholder="Ej. Roma 5 días" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          <div class="grid grid-cols-2 gap-3">
            <input id="trip-start" type="date" value="${todayStr()}" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            <input id="trip-end" type="date" value="${todayStr()}" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
          </div>
          <input id="trip-budget" type="number" step="10" placeholder="Presupuesto total (€)" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          <button onclick="saveNewTripModal()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold">Crear Viaje</button>
        </div>
      `);
    }

    function saveNewTripModal() {
      const name = ($('#trip-name')?.value || '').trim() || 'Mi Viaje';
      const budget = parseAmount($('#trip-budget')?.value);
      const start = $('#trip-start')?.value || todayStr();
      const end = $('#trip-end')?.value || todayStr();
      S.trips.push({ id: uid(), name, budget, start, end });
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast("Viaje creado ✓");
    }

    function deleteTrip(tripId) {
      if (!confirm("¿Eliminar este viaje?")) return;
      (S.expenses || []).forEach(e => {
        if (e.tripId === tripId) {
          e.tripId = "";
          dbUpsertPersonalExpense(e);
        }
      });
      S.trips = (S.trips || []).filter(t => t.id !== tripId);
      saveLocalState(true);
      renderAllViews();
    }

    function addSmartRule() {
      const m = ($('#new-rule-match')?.value || '').trim().toLowerCase();
      const cat = $('#new-rule-cat')?.value || 'comida';
      if (!m) return;
      S.rules.push({ id: uid(), match: m, cat });
      saveLocalState(true);
      renderAllViews();
      showToast("Regla añadida ✓");
    }

    function deleteSmartRule(id) {
      S.rules = (S.rules || []).filter(r => r.id !== id);
      saveLocalState(true);
      renderAllViews();
    }

    let newCatDraft = { icon: 'category', color: '#4f46e5' };
    function openNewCategoryModal() {
      newCatDraft = { icon: ICONPICK[0], color: COLORPICK[0] };
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Crear Categoría Personalizada</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>
          <input id="custom-cat-name" type="text" placeholder="Ej. Mascota, Pádel, Universidad..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          <div>
            <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1.5">Icono</label>
            <div class="grid grid-cols-8 gap-1.5">
              ${ICONPICK.map(ic => `
                <button type="button" data-pick-ico="${ic}" onclick="newCatDraft.icon='${ic}'; $$('[data-pick-ico]').forEach(b=>{ const a=b.dataset.pickIco==='${ic}'; b.className='w-9 h-9 rounded-xl flex items-center justify-center transition '+(a?'bg-primary text-on-primary shadow-xs':'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'); })" class="w-9 h-9 rounded-xl flex items-center justify-center transition ${ic === newCatDraft.icon ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">
                  ${ico(ic, 'text-[18px]')}
                </button>
              `).join('')}
            </div>
          </div>
          <div>
            <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1.5">Color</label>
            <div class="flex flex-wrap gap-2">
              ${COLORPICK.map(col => `
                <button type="button" data-pick-col="${col}" onclick="newCatDraft.color='${col}'; $$('[data-pick-col]').forEach(b=>b.classList.toggle('ring-2', b.dataset.pickCol==='${col}'))" style="background:${col}" class="w-7 h-7 rounded-full ring-offset-2 ring-primary transition ${col === newCatDraft.color ? 'ring-2' : ''}" aria-label="Color"></button>
              `).join('')}
            </div>
          </div>
          <button onclick="saveNewCustomCategory()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold">Crear Categoría</button>
        </div>
      `);
    }

    function saveNewCustomCategory() {
      const name = ($('#custom-cat-name')?.value || '').trim();
      const icon = newCatDraft.icon || 'category';
      const c = newCatDraft.color || '#4f46e5';
      if (!name) return;
      S.customCats.push({ id: 'c_' + uid(), name, icon, c });
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast("Categoría creada ✓");
    }

    function deleteCustomCategory(catId) {
      (S.expenses || []).forEach(e => {
        if (e.cat === catId) {
          e.cat = 'otros';
          dbUpsertPersonalExpense(e);
        }
      });
      S.customCats = (S.customCats || []).filter(c => c.id !== catId);
      saveLocalState(true);
      renderAllViews();
    }

    async function markExpenseRefunded(expId) {
      const e = (S.expenses || []).find(x => x.id === expId);
      if (e) {
        e.refund = false;
        await dbUpsertPersonalExpense(e);
        renderAllViews();
        showToast("Devolución completada ✓");
      }
    }

    // Export / Import / Apple Pay URL Shortcut
    function guessCatFromMerchant(n) {
      n = String(n || "").toLowerCase();
      const has = (...ws) => ws.some(w => n.includes(w));
      if (has("mercadona", "carrefour", "lidl", "aldi", "consum", "supermercado", "dia", "eroski", "alcampo")) return "comida";
      if (has("restaurante", "tagliatella", "mcdonald", "burger", "kfc", "telepizza", "glovo", "uber eats", "starbucks", "cena", "bar", "café", "cine", "concierto")) return "ocio";
      if (has("uber", "cabify", "bolt", "renfe", "metro", "bus", "parking", "repsol", "cepsa", "gasolina", "peaje", "taxi")) return "transporte";
      if (has("netflix", "spotify", "icloud", "prime", "disney", "hbo", "youtube", "dazn")) return "susc";
      if (has("amazon", "zara", "shein", "ikea", "mediamarkt", "decathlon", "nike", "adidas", "primark")) return "compras";
      if (has("endesa", "iberdrola", "naturgy", "vodafone", "movistar", "digi", "alquiler", "luz", "agua")) return "hogar";
      if (has("farmacia", "dentista", "hospital", "fisio", "gimnasio", "padel", "pádel")) return "salud";
      if (has("vueling", "ryanair", "iberia", "booking", "airbnb", "hotel", "vuelo")) return "viajes";
      return "otros";
    }

    let pendingShortcutPayment = null;

    function parseApplePayShortcutQuery(queryString) {
      try {
        const rawStr = String(queryString || "");
        const qPart = rawStr.includes("?") ? rawStr.split("?").slice(1).join("?") : rawStr.replace(/^[?#]/, "");
        if (!qPart) return null;
        const params = {};
        qPart.split("&").forEach(pair => {
          if (!pair) return;
          const idx = pair.indexOf("=");
          const k = idx >= 0 ? decodeURIComponent(pair.slice(0, idx).replace(/\+/g, " ")).trim().toLowerCase() : decodeURIComponent(pair).trim().toLowerCase();
          const v = idx >= 0 ? decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, " ")).trim() : "";
          params[k] = v;
        });
        const rawAmt = params.add || params.amount || params.monto || params.importe;
        if (!rawAmt) return null;
        const amount = parseAmount(rawAmt);
        if (!(amount > 0)) return null;
        const note = (params.desc || params.merchant || params.comercio || params.note || "Apple Pay").trim().slice(0, 80);
        const catParam = (params.cat || params.categoria || "").trim().toLowerCase();
        const userParam = params.user || params.uid || params.usuario;
        return {
          amount: Math.round(amount * 100) / 100,
          note: note || "Apple Pay",
          catParam,
          userId: userParam ? Number(userParam) : null
        };
      } catch (e) {
        return null;
      }
    }

    async function applyPendingApplePayShortcutIfAny() {
      if (!pendingShortcutPayment) return;
      const item = pendingShortcutPayment;
      pendingShortcutPayment = null;

      if (item.userId && item.userId !== Number(loggedUserId)) {
        loggedUserId = item.userId;
        isAdmin = (loggedUserId === 2);
        localStorage.setItem('logged_user_id', String(loggedUserId));
        localStorage.setItem('is_admin', isAdmin ? 'true' : 'false');
        loadLocalStateForCurrentUser();
        await loadUserPersonalDataFromCloud(loggedUserId);
      }

      const today = todayStr();
      const nowMs = Date.now();
      const isDuplicate = (S.expenses || []).some(e =>
        e.date === today &&
        Math.abs(Number(e.amount) - item.amount) < 0.005 &&
        String(e.note || "") === item.note &&
        e.ts && (nowMs - e.ts < 15 * 60 * 1000)
      );
      if (isDuplicate) {
        showToast(` Pay: ${fmt(item.amount)} en ${item.note} ya registrado ✓`);
        return;
      }

      let cat = applyRule(item.note) || item.catParam;
      if (!allCats().some(c => c.id === cat)) {
        cat = guessCatFromMerchant(item.note);
      }

      const newExp = {
        id: uid(),
        amount: item.amount,
        cat,
        method: "applepay",
        note: item.note,
        date: today,
        tripId: "",
        refund: false,
        ts: nowMs
      };
      S.expenses.push(newExp);
      await dbUpsertPersonalExpense(newExp);
      viewMk = monthKey(today);
      renderAllViews();
      const catName = catById(cat).name;
      showToast(` Pay sumado en Base de Datos: ${fmt(item.amount)} en ${item.note} (${catName}) ✓`);
    }

    // Invoked by Web URL (?add=14.50&desc=Mercadona) on startup
    function importFromURLShortcut() {
      const parsed = parseApplePayShortcutQuery(location.search);
      if (!parsed) return;
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
      pendingShortcutPayment = parsed;
    }

    // Invoked by Native iOS .IPA WKWebView (claridad://pay?add=14.50&desc=Mercadona) at any time
    window.handleApplePayShortcutQuery = async function(queryString) {
      const parsed = parseApplePayShortcutQuery(queryString);
      if (!parsed) return;
      pendingShortcutPayment = parsed;
      await applyPendingApplePayShortcutIfAny();
    };

    async function simulateApplePayShortcutPayment() {
      const demoMerchants = [
        { desc: "Mercadona Supermercado", amount: 18.45 },
        { desc: "Gasolinera Repsol", amount: 35.00 },
        { desc: "Starbucks Coffee", amount: 4.90 },
        { desc: "Zara España", amount: 29.95 }
      ];
      const pick = demoMerchants[Math.floor(Math.random() * demoMerchants.length)];
      await window.handleApplePayShortcutQuery(`?add=${pick.amount}&desc=${encodeURIComponent(pick.desc)}&user=${loggedUserId || 2}`);
    }

    function downloadBlob(filename, content, mime) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["\ufeff" + content], { type: mime + ";charset=utf-8" }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    function exportMovementsCSV() {
      const rows = [["fecha", "tipo", "categoria", "metodo", "concepto", "importe", "etiquetas"]];
      (S.expenses || []).forEach(e => rows.push([e.date, "gasto", catById(e.cat).name, methodById(e.method).name, `"${(e.note || "").replace(/"/g, '""')}"`, e.amount.toFixed(2), tagsOf(e.note).join(" ")]));
      (S.incomes || []).forEach(i => rows.push([i.date, "ingreso", incById(i.cat).name, "banco", `"${(i.source || "").replace(/"/g, '""')}"`, i.amount.toFixed(2), ""]));
      downloadBlob("claridad-financiera-movimientos.csv", rows.map(r => r.join(";")).join("\n"), "text/csv");
    }

    function exportBackupJSON() {
      if (S && S.settings) {
        S.settings.lastBackupAt = Date.now();
        logAuditEvent('export_json', 'backup', `${(S.expenses || []).length} gastos`);
        saveLocalState(!!loggedUserId);
      }
      const documentedBundle = {
        app: 'Claridad Financiera',
        schema_version: 2,
        exported_at: new Date().toISOString(),
        currency_base: S?.settings?.currency || 'EUR',
        fx_rates_date: FX_RATES_UPDATED_DATE,
        data: S
      };
      downloadBlob(`claridad-financiera-backup-${todayStr()}.json`, JSON.stringify(documentedBundle, null, 2), "application/json");
      renderAllViews();
      showToast("Copia JSON completa descargada ✓");
    }

    function importBackupJSON(inputEl) {
      const file = inputEl.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const raw = JSON.parse(reader.result);
          const data = (raw && raw.data && Array.isArray(raw.data.expenses)) ? raw.data : raw;
          if (!data || !Array.isArray(data.expenses)) throw new Error("Formato inválido");
          await dbClearAllPersonalMonthlyData(loggedUserId);
          S = normalizeStateObject(data);
          logAuditEvent('import_json', 'backup', `${S.expenses.length} gastos restaurados`);
          saveLocalState(false);
          if (loggedUserId) await syncUserPersonalDataToCloud();
          renderAllViews();
          showToast("Copia de seguridad restaurada ✓");
        } catch (err) {
          alert("El archivo seleccionado no es una copia válida.");
        }
      };
      reader.readAsText(file);
    }

    async function resetLocalPersonalData() {
      if (!confirm("¿Borrar todos los gastos, ingresos y datos de prueba de tu Control Mensual en la base de datos?\n\n(La base de datos de Deudas y Grupos de Supabase NO se tocará)")) return;
      await dbClearAllPersonalMonthlyData(loggedUserId);
      renderAllViews();
      showToast("Control Mensual limpio a 0,00 € en Base de Datos (Deudas intactas) ✓");
    }

    // ============================================================================
    // 18. 1-TAP QUICK EXPENSE PRESETS & CAMERA RECEIPT OCR SCANNER
    // ============================================================================
    async function triggerQuickPresetExpense(presetId) {
      const qp = (S.quickPresets || []).find(x => x.id === presetId);
      if (!qp) return;
      haptic('success');
      const newExp = {
        id: uid(),
        amount: Math.round(Number(qp.amount || 0) * 100) / 100,
        cat: qp.cat || 'comida',
        method: qp.method || 'tarjeta',
        note: `${qp.emoji || ''} ${qp.label}`.trim(),
        date: todayStr(),
        tripId: '',
        refund: false,
        ts: Date.now()
      };
      S.expenses.push(newExp);
      viewMk = monthKey(todayStr());
      renderAllViews();
      await dbUpsertPersonalExpense(newExp);
      showToast(
        `⚡ Sumado: ${qp.emoji || ''} ${qp.label} (${fmt(qp.amount)})`,
        "Deshacer",
        async () => {
          haptic('light');
          await dbDeletePersonalExpense(newExp.id);
          renderAllViews();
          showToast("Gasto rápido deshecho ✓");
        }
      );
    }

    function openEditQuickPresetsModal() {
      const rowsHtml = (S.quickPresets || []).map(qp => `
        <div class="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-lg">${esc(qp.emoji || '💸')}</span>
            <div class="min-w-0">
              <p class="text-xs font-extrabold text-on-surface truncate">${esc(qp.label)}</p>
              <p class="text-[11px] text-primary font-bold">${fmt(qp.amount)} • ${esc(catById(qp.cat).name)}</p>
            </div>
          </div>
          <button onclick="deleteQuickPreset('${qp.id}')" class="p-1 text-outline hover:text-error">
            ${ico('delete', 'text-[18px]')}
          </button>
        </div>
      `).join('');

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Personalizar Gastos Rápidos (1 Toque)</h3>
              <p class="text-xs text-on-surface-variant">Tus compras frecuentes para sumar sin escribir</p>
            </div>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>

          <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2.5">
            <span class="text-[11px] font-extrabold uppercase text-primary">+ Añadir nuevo botón rápido</span>
            <div class="grid grid-cols-4 gap-2">
              <input id="qp-emoji" type="text" value="☕" placeholder="Emoji" class="col-span-1 px-2.5 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-center text-sm font-bold"/>
              <input id="qp-label" type="text" placeholder="Concepto (ej. Gimnasio, Café...)" class="col-span-3 px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <input id="qp-amount" type="number" step="0.10" placeholder="Importe (€)" class="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-extrabold text-on-surface"/>
              <select id="qp-cat" class="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${allCats().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
              </select>
            </div>
            <button onclick="addCustomQuickPreset()" class="w-full py-2 rounded-xl bg-primary text-on-primary text-xs font-extrabold hover:bg-primary-container transition">
              + Guardar Botón Rápido
            </button>
          </div>

          <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
            ${rowsHtml}
          </div>
        </div>
      `);
    }

    function addCustomQuickPreset() {
      const emoji = ($('#qp-emoji')?.value || '💸').trim().slice(0, 4);
      const label = ($('#qp-label')?.value || '').trim();
      const amount = parseAmount($('#qp-amount')?.value);
      const cat = $('#qp-cat')?.value || 'comida';
      if (!label || !(amount > 0)) return;
      S.quickPresets.push({ id: 'qp_' + uid(), emoji, label, amount: Math.round(amount * 100) / 100, cat, method: 'applepay' });
      saveLocalState(true);
      openEditQuickPresetsModal();
      renderAllViews();
      showToast("Botón rápido añadido ✓");
    }

    function deleteQuickPreset(id) {
      S.quickPresets = (S.quickPresets || []).filter(x => x.id !== id);
      saveLocalState(true);
      openEditQuickPresetsModal();
      renderAllViews();
    }

    // Camera Receipt OCR Scanner Modal
    function openReceiptScannerModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div class="flex items-center gap-2.5">
              <span class="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                ${ico('photo_camera', 'text-[20px]')}
              </span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Escáner de Tickets (Cámara / OCR)</h3>
                <p class="text-xs text-on-surface-variant">Haz una foto al ticket para extraer importe y comercio</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container">${ico('close', 'text-[19px]')}</button>
          </div>

          <label class="w-full p-5 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-center cursor-pointer flex flex-col items-center gap-2 transition active-scale">
            <span class="text-primary">${ico('add_a_photo', 'text-[34px]')}</span>
            <span class="font-label-lg text-sm font-extrabold text-primary">Hacer foto al ticket o elegir de la galería</span>
            <span class="text-[11px] text-on-surface-variant">Compatible con tickets de supermercado, restaurantes y gasolineras</span>
            <input type="file" accept="image/*" capture="environment" onchange="processReceiptImageForOCR(this)" class="hidden"/>
          </label>

          <div id="ocr-status-box" class="hidden p-3 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface flex items-center gap-2">
            ${ico('sync', 'animate-spin text-primary text-[18px]')}
            <span id="ocr-status-text">Analizando imagen del ticket...</span>
          </div>

          <img id="ocr-preview-img" class="hidden w-full max-h-40 object-contain rounded-xl border border-outline-variant/30 bg-black/5"/>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Importe detectado (€)</label>
              <input id="ocr-amount" type="number" step="0.01" placeholder="0.00" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-lg font-extrabold text-on-surface"/>
            </div>
            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Categoría</label>
              <select id="ocr-cat" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${allCats().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Comercio / Concepto</label>
              <input id="ocr-note" type="text" placeholder="Ej. Ticket Mercadona" class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            </div>
            <div>
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant block mb-1">Fecha</label>
              <input id="ocr-date" type="date" value="${todayStr()}" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            </div>
          </div>

          <button onclick="saveScannedReceiptExpense()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold shadow-sm hover:bg-primary-container transition active-scale">
            Guardar Gasto del Ticket
          </button>
        </div>
      `);
    }

    async function processReceiptImageForOCR(inputEl) {
      const file = inputEl.files?.[0];
      if (!file) return;

      const statusBox = $('#ocr-status-box');
      const statusText = $('#ocr-status-text');
      const previewImg = $('#ocr-preview-img');
      if (statusBox) statusBox.classList.remove('hidden');
      if (statusText) statusText.textContent = "Leyendo texto e importe del ticket (OCR)...";

      const url = URL.createObjectURL(file);
      if (previewImg) {
        previewImg.src = url;
        previewImg.classList.remove('hidden');
      }

      try {
        if (!window.Tesseract) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        const res = await window.Tesseract.recognize(file, 'spa');
        const rawText = res?.data?.text || "";
        const extracted = extractReceiptDataFromOCRText(rawText, file.name);

        if (extracted.amount > 0 && $('#ocr-amount')) $('#ocr-amount').value = extracted.amount.toFixed(2);
        if (extracted.merchant && $('#ocr-note')) $('#ocr-note').value = extracted.merchant;
        if (extracted.cat && $('#ocr-cat')) $('#ocr-cat').value = extracted.cat;
        if (extracted.date && $('#ocr-date')) $('#ocr-date').value = extracted.date;

        if (statusText) {
          statusText.textContent = extracted.amount > 0
            ? `✓ Detectado: ${fmt(extracted.amount)} en ${extracted.merchant}`
            : `Texto leído. Confirma o ajusta el importe abajo.`;
        }
      } catch (e) {
        if (statusText) statusText.textContent = "Foto cargada. Confirma el importe y guarda.";
      }
    }

    function extractReceiptDataFromOCRText(text, fallbackName = "") {
      const clean = String(text || "");
      const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      // 1. Detect merchant from known brands or first non-numeric line
      let merchant = "Ticket escaneado";
      const knownBrands = ["Mercadona", "Carrefour", "Lidl", "Aldi", "Consum", "Repsol", "Cepsa", "Zara", "Ikea", "Decathlon", "McDonald", "Starbucks", "Tagliatella", "El Corte Inglés", "Dia", "Eroski"];
      for (const b of knownBrands) {
        if (clean.toLowerCase().includes(b.toLowerCase())) {
          merchant = b;
          break;
        }
      }
      if (merchant === "Ticket escaneado" && lines.length > 0) {
        const firstLine = lines.find(l => l.length >= 3 && !/^\d+$/.test(l));
        if (firstLine) merchant = firstLine.slice(0, 36);
      }

      // 2. Extract amount (prioritize lines with TOTAL / IMPORTE / EUR / €)
      let amount = 0;
      const totalRegex = /(?:total|importe|pagar|venta|eur|€)[^\d]{0,18}(\d{1,4}[\.,]\d{2})/gi;
      const totalMatches = [...clean.matchAll(totalRegex)].map(m => parseFloat(m[1].replace(',', '.'))).filter(n => n > 0 && n < 10000);
      if (totalMatches.length > 0) {
        amount = Math.max(...totalMatches);
      } else {
        const allNums = [...clean.matchAll(/(\d{1,4}[\.,]\d{2})/g)].map(m => parseFloat(m[1].replace(',', '.'))).filter(n => n > 0 && n < 5000);
        if (allNums.length > 0) amount = Math.max(...allNums);
      }

      // 3. Extract date DD/MM/YYYY or DD-MM-YYYY
      let date = todayStr();
      const dateMatch = clean.match(/\b(\d{2})[\/\-](\d{2})[\/\-](20\d{2})\b/);
      if (dateMatch) {
        date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }

      const cat = applyRule(merchant) || guessCatFromMerchant(merchant + " " + fallbackName);
      return { amount, merchant, cat, date };
    }

    async function saveScannedReceiptExpense() {
      const amount = parseAmount($('#ocr-amount')?.value);
      if (!(amount > 0)) {
        $('#ocr-amount')?.focus();
        return;
      }
      const note = ($('#ocr-note')?.value || '').trim() || 'Ticket escaneado';
      const cat = $('#ocr-cat')?.value || 'comida';
      const date = $('#ocr-date')?.value || todayStr();

      const newExp = {
        id: uid(),
        amount: Math.round(amount * 100) / 100,
        cat,
        method: 'tarjeta',
        note: `${note} #ticket`,
        date,
        tripId: '',
        refund: false,
        ts: Date.now()
      };
      S.expenses.push(newExp);
      closeUniversalModal();
      viewMk = monthKey(date);
      renderAllViews();
      await dbUpsertPersonalExpense(newExp);
      showToast(`📷 Ticket guardado en Base de Datos: ${fmt(amount)} en ${note} ✓`);
    }

    // ============================================================================
    // 19. INITIALIZATION ON DOM CONTENT LOADED
    // ============================================================================
    document.addEventListener("DOMContentLoaded", () => {
      hydrateAppIcons(document);
      loadLocalStateForCurrentUser();
      ClaridadDB.open().then(async (db) => {
        if (!db) return;
        const key = userStorageKey(loggedUserId);
        // Hydrate from IndexedDB if localStorage was empty/cleared
        if ((S.expenses || []).length === 0 && (S.incomes || []).length === 0) {
          const snap = await ClaridadDB.loadStateSnapshot(key);
          if (snap && ((snap.expenses && snap.expenses.length > 0) || (snap.incomes && snap.incomes.length > 0))) {
            S = normalizeStateObject(snap);
            localStorage.setItem(key, JSON.stringify(S));
            renderAllViews();
          }
        } else {
          ClaridadDB.persistStateSnapshot(key, S);
        }
      });
      initTheme();
      applyPrivacyModeUI();
      if (typeof applyAccessibilityPreferences === 'function') applyAccessibilityPreferences();
      initSecurityLifecycle();
      if (typeof initKeyboardShortcutsWCAG === 'function') initKeyboardShortcutsWCAG();
      viewMk = monthKey(todayStr());

      window.addEventListener('online', () => {
        if (loggedUserId) flushOfflineSyncQueue();
      });

      // Prevent pinch-to-zoom and double-tap zoom on iOS Safari & WKWebView
      document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
      document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
      document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
      let lastTouchEnd = 0;
      document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 280) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      }, { passive: false });

      // Backdrop & keyboard Escape handlers
      $('#quick-action-sheet')?.addEventListener('click', (e) => {
        if (e.target.id === 'quick-action-sheet') closeQuickActionSheet();
      });
      $('#universal-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'universal-modal') closeUniversalModal();
      });
      $('#notifications-drawer')?.addEventListener('click', (e) => {
        if (e.target.id === 'notifications-drawer') toggleNotificationsDrawer();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeQuickActionSheet();
          closeUniversalModal();
          $('#notifications-drawer')?.classList.add('hidden');
          if (bulkSelectMode) exitBulkSelectMode();
        }
      });

      // Touch gestures (FAB long-press voice, Home month swipe, Row swipe edit/delete, Long-press multi-select, PTR)
      initGesturesAndInteractions();

      // Deep Links router
      window.addEventListener('hashchange', () => navigateFromHash());

      // Live synchronization whenever window regains focus (only if cloud account is active)
      window.addEventListener('focus', () => {
        if (loggedUserId && !isHydratingFromCloud) cargarDatosSupabase(false);
      });
      document.addEventListener('visibilitychange', () => {
        if (loggedUserId && document.visibilityState === 'visible' && !isHydratingFromCloud) {
          cargarDatosSupabase(false);
        }
      });

      importFromURLShortcut();
      if (typeof handleBankOAuthCallback === 'function') handleBankOAuthCallback();
      if (typeof handleIncomingShareTarget === 'function') handleIncomingShareTarget();
      if (!navigateFromHash()) {
        renderAllViews();
      }
      if (shouldShowOnboarding()) {
        openOnboardingFlow(0);
      }

      // Sync cloud catalog in background (doesn't disrupt local mode UI)
      cargarDatosSupabase(false).finally(() => {
        applyPendingApplePayShortcutIfAny();
      });

      if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      }
    });
  </script>
</body>
</html>
