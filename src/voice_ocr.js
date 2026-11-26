    // ============================================================================
    // 4. COMPOUND VOICE NLP PARSER & ITEM-LEVEL RECEIPT OCR ENGINE
    // ============================================================================

    const SPANISH_NUM_WORDS = {
      cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
      seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
      trece: 13, catorce: 14, quince: 15, dieciseis: 16, 'dieciséis': 16,
      diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
      veintiuno: 21, veintiun: 21, veintidos: 22, 'veintidós': 22, veintitres: 23, 'veintitrés': 23,
      veinticuatro: 24, veinticinco: 25, veintiseis: 26, 'veintiséis': 26,
      veintisiete: 27, veintiocho: 28, veintinueve: 29,
      treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
      cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400,
      quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
      mil: 1000
    };

    /** Convert Spanish spoken number phrases ("veinticinco con veinte", "sesenta y ocho", "dos mil cien") into numeric strings */
    function normalizeSpokenNumbersES(input) {
      let s = String(input || '');
      // Handle "X con Y" (e.g. "veinticinco con veinte" -> "25.20")
      const wordGroup = Object.keys(SPANISH_NUM_WORDS).join('|');
      const phraseRe = new RegExp(`\\b((?:${wordGroup})(?:\\s+(?:y\\s+)?(?:${wordGroup}))*)\\b`, 'gi');

      const wordsToNum = (phrase) => {
        const toks = phrase.toLowerCase().split(/\s+/).filter(w => w !== 'y');
        let total = 0, cur = 0;
        for (const t of toks) {
          const v = SPANISH_NUM_WORDS[t];
          if (v === undefined) return null;
          if (v === 1000) {
            cur = cur === 0 ? 1000 : cur * 1000;
            total += cur;
            cur = 0;
          } else {
            cur += v;
          }
        }
        return total + cur;
      };

      // Replace "WORD con WORD" first
      const decRe = new RegExp(`\\b((?:${wordGroup})(?:\\s+(?:y\\s+)?(?:${wordGroup}))*)\\s+con\\s+((?:${wordGroup})(?:\\s+(?:y\\s+)?(?:${wordGroup}))*)\\b`, 'gi');
      s = s.replace(decRe, (full, a, b) => {
        const na = wordsToNum(a), nb = wordsToNum(b);
        if (na === null || nb === null || nb >= 100) return full;
        return `${na}.${String(nb).padStart(2, '0')}`;
      });

      // Replace standalone spoken numbers (avoid replacing isolated "un"/"una" articles unless followed by currency/unit)
      s = s.replace(phraseRe, (full) => {
        const low = full.toLowerCase().trim();
        if (low === 'un' || low === 'una') return full;
        const val = wordsToNum(low);
        return val !== null ? String(val) : full;
      });

      return s;
    }

    /** Resolve relative Spanish dates ("ayer", "anteayer", "el martes", "la semana pasada", "el día 3") */
    function parseRelativeDateES(text, baseDate = new Date()) {
      const ql = String(text || '').toLowerCase();
      const dt = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

      if (/\banteayer\b/.test(ql)) { dt.setDate(dt.getDate() - 2); return dstr(dt); }
      if (/\bayer\b/.test(ql)) { dt.setDate(dt.getDate() - 1); return dstr(dt); }
      if (/\bsemana pasada\b/.test(ql)) { dt.setDate(dt.getDate() - 7); return dstr(dt); }

      const dayNumM = ql.match(/\bel\s+d[ií]a\s+(\d{1,2})\b/);
      if (dayNumM) {
        const dNum = Math.max(1, Math.min(28, parseInt(dayNumM[1], 10)));
        if (dNum > dt.getDate()) dt.setMonth(dt.getMonth() - 1);
        dt.setDate(dNum);
        return dstr(dt);
      }

      const dowMap = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, 'miércoles': 3, jueves: 4, viernes: 5, sabado: 6, 'sábado': 6 };
      for (const [dName, targetDow] of Object.entries(dowMap)) {
        if (new RegExp(`\\bel\\s+${dName}\\b`).test(ql)) {
          let diff = (dt.getDay() - targetDow + 7) % 7;
          if (diff === 0) diff = 7;
          dt.setDate(dt.getDate() - diff);
          return dstr(dt);
        }
      }
      return dstr(dt);
    }

    function guessVoiceCategory(text) {
      const ql = String(text || '').toLowerCase();
      // Check user's learned personal synonyms first
      const syns = S?.voiceSynonyms || {};
      for (const [kw, catId] of Object.entries(syns)) {
        if (kw && ql.includes(kw.toLowerCase())) return { cat: catId, confidence: 0.96 };
      }
      const ruled = typeof applyRule === 'function' ? applyRule(ql) : null;
      if (ruled) return { cat: ruled, confidence: 0.95 };

      const patterns = [
        { cat: 'ocio',       re: /(cen[aeo]|cenamos|restaur|men[uú]|bar\b|copas?|caf[eé]|birra|cerveza|pizza|sushi|burger|cine|concierto|delivery|glovo|uber eats|tapas|desayun)/ },
        { cat: 'comida',     re: /(s[uú]per|supermercado|mercadona|carrefour|lidl|aldi|dia\b|eroski|consum|fruter|panader|carnicer|compra semanal|mercado)/ },
        { cat: 'transporte', re: /(gasofa|gasolina|di[eé]sel|repsol|cepsa|metro|bus|autob[uú]s|tren|renfe|uber|cabify|taxi|parking|peaje|aparcamiento)/ },
        { cat: 'hogar',      re: /(alquiler|luz|agua|gas\b|internet|fibra|ikea|ferreter|limpieza|detergente)/ },
        { cat: 'susc',       re: /(spotify|netflix|hbo|disney|amazon prime|icloud|chatgpt|suscripci)/ },
        { cat: 'salud',      re: /(farmacia|m[eé]dico|dentista|fisio|gimnasio|gym|deporte|p[aá]del|pastillas)/ },
        { cat: 'compras',    re: /(zara|ropa|zapatos|zapatillas|amazon|mediamarkt|fnac|decathlon|regalo|perfume)/ },
        { cat: 'viajes',     re: /(vuelo|hotel|airbnb|viaje|escapada|billete|maleta)/ }
      ];
      for (const p of patterns) {
        if (p.re.test(ql)) return { cat: p.cat, confidence: 0.9 };
      }
      const fallback = typeof guessCatFromMerchant === 'function' ? guessCatFromMerchant(ql) : 'otros';
      return { cat: fallback || 'otros', confidence: fallback && fallback !== 'otros' ? 0.8 : 0.55 };
    }

    /** Fuzzy match a mentioned person against existing debt contacts and group members */
    function resolveKnownPersonName(rawName) {
      const clean = String(rawName || '').trim().replace(/[.,;:!?]+$/, '');
      if (!clean) return '';
      const low = clean.toLowerCase();
      const known = new Set();
      (S?.debts || []).forEach(d => { if (d.person) known.add(d.person); });
      (S?.groups || []).forEach(g => (g.members || []).forEach(m => { if (m && m !== 'Yo') known.add(m); }));
      (sbGlobalUsers || []).forEach(u => { if (u.nombre) known.add(u.nombre); });

      for (const k of known) {
        if (k.toLowerCase() === low || k.toLowerCase().startsWith(low) || low.startsWith(k.toLowerCase())) {
          return k;
        }
      }
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    /**
     * Compound Spanish NLP Voice Parser:
     * Handles single expenses, multi-expenses ("35 de súper y 12 de gasolina"),
     * incomes ("me han pagado la nómina 2100", "Bizum de mamá 20€"),
     * and compound expense + debt ("Ayer cenamos fuera con Laura y pagué yo, fueron 68 euros, ella me debe la mitad").
     */
    function parseCompoundVoiceUtterance(rawText, baseDate = new Date()) {
      const original = String(rawText || '').trim();
      if (!original) return { original: '', date: dstr(baseDate), expenses: [], incomes: [], debts: [] };

      const norm = normalizeSpokenNumbersES(original);
      const date = parseRelativeDateES(norm, baseDate);
      const ql = norm.toLowerCase();

      const expenses = [];
      const incomes = [];
      const debts = [];

      // Helper to extract first monetary amount in cents from a clause
      const extractAmountCents = (clause) => {
        const m = String(clause).match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?|pavos?|eur|usd|\$|£)?\b/i);
        if (!m) return 0;
        return Money.toCents(m[1]);
      };

      // 1. Detect INCOME intents first ("me han pagado la nómina 2100", "Bizum de mamá 20€", "ingreso de 300")
      const isIncome = /(me han pagado|he cobrado|me ingresaron|me han ingresado|n[oó]mina|bizum de\s+[a-záéíóúñ]+|me devolvieron|devoluci[oó]n de)/.test(ql)
        && !/(pagu[eé] yo|me debe|le debo|gast[eé])/.test(ql);
      if (isIncome) {
        const cents = extractAmountCents(norm);
        if (cents > 0) {
          const cat = /n[oó]mina/.test(ql) ? 'nomina' : /bizum/.test(ql) ? 'bizum' : /freelance/.test(ql) ? 'freelance' : 'extra';
          const fromM = norm.match(/(?:de|por)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,20})/i);
          const src = cat === 'nomina' ? 'Nómina mensual' : (fromM ? `Bizum / Ingreso de ${resolveKnownPersonName(fromM[1])}` : original.slice(0, 40));
          incomes.push({
            id: uid(),
            amount_cents: cents,
            cat,
            source: src,
            date,
            note: original,
            confidence: 0.9
          });
          return { original, date, expenses, incomes, debts };
        }
      }

      // 2. Detect COMPOUND EXPENSE + P2P DEBT ("con Laura ... 68 euros ... me debe la mitad / a medias / entre tres")
      const hasSplitCue = /(me debe|le debo|a medias|la mitad|entre\s+(?:dos|tres|cuatro|cinco|\d+)|pagu[eé]\s+yo)/.test(ql);
      if (hasSplitCue) {
        const totalCents = extractAmountCents(norm);
        // Extract person name ("con Laura", "a Carlos", "de Marta", "Laura me debe")
        let personRaw = '';
        const pWith = norm.match(/\bcon\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,20})/i);
        const pBeforeOwe = norm.match(/\b([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,20})\s+me\s+debe\b/i);
        const pAfterOwe = norm.match(/\ble\s+debo\s+(?:a\s+)?([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,20})\b/i);
        const pronouns = new Set(['ella', 'el', 'él', 'ellos', 'ellas', 'nadie', 'alguien', 'esto', 'eso', 'mitad', 'todo']);
        if (pWith && !pronouns.has(pWith[1].toLowerCase())) personRaw = pWith[1];
        else if (pBeforeOwe && !pronouns.has(pBeforeOwe[1].toLowerCase())) personRaw = pBeforeOwe[1];
        else if (pAfterOwe && !pronouns.has(pAfterOwe[1].toLowerCase())) personRaw = pAfterOwe[1];

        const person = resolveKnownPersonName(personRaw || 'Contacto');
        const catGuess = guessVoiceCategory(norm);
        const conceptBase = /cen[aeo]|cenamos/.test(ql) ? `Cena con ${person}` :
          /comi|almuer|men[uú]/.test(ql) ? `Comida con ${person}` :
          /viaje|gasolina/.test(ql) ? `Gasto compartido con ${person}` :
          `${catById(catGuess.cat).name} con ${person}`;

        if (totalCents > 0) {
          const iPaid = /(pagu[eé]\s+yo|me debe|a medias|la mitad)/.test(ql) && !/\ble debo\b/.test(ql);
          // Determine debt share
          let debtCents = 0;
          const explicitDebtM = ql.match(/(?:me debe|le debo)\s+(\d+(?:[.,]\d{1,2})?)/);
          const betweenM = ql.match(/entre\s+(\d+)/);
          if (explicitDebtM) {
            debtCents = Money.toCents(explicitDebtM[1]);
          } else if (/(la mitad|a medias)/.test(ql)) {
            debtCents = Math.round(totalCents / 2);
          } else if (betweenM) {
            const n = Math.max(2, parseInt(betweenM[1], 10));
            debtCents = Math.floor(totalCents / n);
          } else {
            debtCents = Math.round(totalCents / 2);
          }

          if (iPaid) {
            expenses.push({
              id: uid(),
              amount_cents: totalCents,
              cat: catGuess.cat,
              date,
              note: conceptBase,
              confidence: catGuess.confidence
            });
          }

          if (debtCents > 0) {
            debts.push({
              id: uid(),
              person,
              type: iPaid ? 'owed' : 'owe',
              amount_cents: debtCents,
              note: conceptBase,
              confidence: personRaw ? 0.92 : 0.6
            });
          }
          return { original, date, expenses, incomes, debts };
        }
      }

      // 3. Detect MULTI-EXPENSE ("35 de súper y 12 de gasolina", "14€ menú y 3€ café")
      const segments = norm.split(/\s+(?:y|más|mas|,)\s+(?=\d)/i).map(s => s.trim()).filter(Boolean);
      segments.forEach(seg => {
        const cents = extractAmountCents(seg);
        if (!(cents > 0)) return;
        const catGuess = guessVoiceCategory(seg);
        const cleanConcept = seg
          .replace(/\b(ayer|hoy|anteayer|gast[eé]|fueron|pagu[eé]|de|en|el|la|un|una)\b/gi, ' ')
          .replace(/\d+(?:[.,]\d{1,2})?\s*(?:€|euros?|pavos?|eur)?/gi, ' ')
          .replace(/\s+/g, ' ').trim();
        expenses.push({
          id: uid(),
          amount_cents: cents,
          cat: catGuess.cat,
          date,
          note: cleanConcept ? (cleanConcept.charAt(0).toUpperCase() + cleanConcept.slice(1)) : catById(catGuess.cat).name,
          confidence: catGuess.confidence
        });
      });

      return { original, date, expenses, incomes, debts };
    }

    // ----------------------------------------------------------------------------
    // 4B. COMPOUND VOICE PREVIEW & HANDS-FREE MODAL
    // ----------------------------------------------------------------------------
    let voicePreviewState = null;
    let compoundVoiceRec = null;

    function openCompoundVoiceModal(autoStart = false) {
      voicePreviewState = {
        transcript: '',
        parsed: null,
        handsFree: false,
        listening: false
      };
      renderCompoundVoiceModal();
      if (autoStart) {
        setTimeout(() => toggleCompoundVoiceListen(), 180);
      }
    }

    function stopCompoundVoiceListen() {
      try { if (compoundVoiceRec) compoundVoiceRec.stop(); } catch (e) {}
      compoundVoiceRec = null;
      if (voicePreviewState) voicePreviewState.listening = false;
    }

    function toggleCompoundVoiceListen() {
      if (!voicePreviewState) return;
      if (voicePreviewState.listening) {
        stopCompoundVoiceListen();
        renderCompoundVoiceModal();
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        showToast('Tu navegador no soporta dictado directo; escribe la frase natural abajo');
        return;
      }
      try {
        compoundVoiceRec = new SR();
        compoundVoiceRec.lang = 'es-ES';
        compoundVoiceRec.interimResults = false;
        compoundVoiceRec.maxAlternatives = 1;
        voicePreviewState.listening = true;
        renderCompoundVoiceModal();

        compoundVoiceRec.onresult = (ev) => {
          const text = ev.results?.[0]?.[0]?.transcript || '';
          voicePreviewState.listening = false;
          if (voicePreviewState.handsFree && voicePreviewState.parsed && /^\s*(guardar|confirmar|listo)\s*$/i.test(text)) {
            confirmCompoundVoicePreview();
            return;
          }
          voicePreviewState.transcript = text;
          voicePreviewState.parsed = parseCompoundVoiceUtterance(text);
          renderCompoundVoiceModal();
        };
        compoundVoiceRec.onerror = () => {
          voicePreviewState.listening = false;
          renderCompoundVoiceModal();
        };
        compoundVoiceRec.onend = () => {
          voicePreviewState.listening = false;
          renderCompoundVoiceModal();
        };
        compoundVoiceRec.start();
      } catch (e) {
        voicePreviewState.listening = false;
        renderCompoundVoiceModal();
      }
    }

    function analyzeVoiceTextInput(val) {
      if (!voicePreviewState) return;
      voicePreviewState.transcript = val;
      voicePreviewState.parsed = val.trim() ? parseCompoundVoiceUtterance(val) : null;
      renderCompoundVoiceModal();
    }

    function renderCompoundVoiceModal() {
      const st = voicePreviewState;
      if (!st) return;
      const p = st.parsed;
      const hasEntities = p && (p.expenses.length + p.incomes.length + p.debts.length) > 0;

      const examples = [
        'Ayer cenamos con Laura y pagué yo 68 euros, me debe la mitad',
        '35 de súper y 12 de gasolina',
        'Bizum de mamá 20 euros'
      ];

      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-xl bg-tertiary/15 text-tertiary flex items-center justify-center">${ico('mic', 'text-[19px]')}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Dictado inteligente por voz</h3>
                <p class="text-[11px] text-on-surface-variant">Una frase = múltiples gastos, ingresos o deudas</p>
              </div>
            </div>
            <button onclick="stopCompoundVoiceListen(); closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <button onclick="haptic('medium'); toggleCompoundVoiceListen()" class="w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition active-scale ${st.listening ? 'bg-tertiary text-white animate-pulse' : 'hero-indigo text-white shadow-md'}">
            ${ico('mic', 'text-[20px]')}
            ${st.listening ? 'Escuchando... toca para parar' : 'Pulsar y hablar en español'}
          </button>

          <div class="flex flex-col gap-1.5">
            <textarea id="voice-compound-input" rows="2" placeholder="O escribe una frase natural: «Ayer cenamos con Laura, pagué 68€, me debe la mitad»" onchange="analyzeVoiceTextInput(this.value)" class="w-full px-3.5 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/45 text-xs font-bold text-on-surface outline-none focus:border-primary">${esc(st.transcript)}</textarea>
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant cursor-pointer">
                <input type="checkbox" ${st.handsFree ? 'checked' : ''} onchange="voicePreviewState.handsFree=this.checked" class="w-3.5 h-3.5 rounded text-primary"/>
                Manos libres (di «guardar» para confirmar)
              </label>
              <button onclick="analyzeVoiceTextInput($('#voice-compound-input')?.value || '')" class="px-3 py-1 rounded-lg bg-primary/12 text-primary text-[11px] font-extrabold">Analizar frase</button>
            </div>
          </div>

          ${!hasEntities ? `
            <div class="flex flex-col gap-1.5">
              <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Ejemplos en 1 toque:</span>
              ${examples.map(ex => `
                <button onclick="analyzeVoiceTextInput('${esc(ex)}')" class="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-left text-[11px] font-semibold text-on-surface-variant">«${esc(ex)}»</button>
              `).join('')}
            </div>
          ` : `
            <div class="flex flex-col gap-2.5">
              <span class="text-[10px] font-extrabold uppercase text-primary">Vista previa editable (confirma antes de guardar)</span>

              ${p.expenses.map((ex, i) => `
                <div class="p-3 rounded-2xl border ${ex.confidence < 0.7 ? 'border-amber-500/60 bg-amber-500/8' : 'border-outline-variant/40 bg-surface-container-low'} flex flex-col gap-2">
                  <div class="flex items-center justify-between text-[10px] font-extrabold uppercase">
                    <span class="text-tertiary">Gasto #${i + 1}</span>
                    <span class="text-outline">${ex.confidence < 0.7 ? '⚠️ Revisa categoría' : '✓ Detectado'}</span>
                  </div>
                  <div class="grid grid-cols-12 gap-2">
                    <input type="text" value="${esc(ex.note)}" onchange="voicePreviewState.parsed.expenses[${i}].note=this.value" class="col-span-7 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
                    <input type="number" step="0.01" value="${Money.fromCents(ex.amount_cents).toFixed(2)}" onchange="voicePreviewState.parsed.expenses[${i}].amount_cents=Money.toCents(this.value)" class="col-span-5 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-extrabold text-right text-on-surface"/>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <select onchange="voicePreviewState.parsed.expenses[${i}].cat=this.value; voicePreviewState.parsed.expenses[${i}]._userCorrected=true" class="px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface">
                      ${allCats().map(c => `<option value="${c.id}" ${ex.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
                    </select>
                    <input type="date" value="${esc(ex.date)}" onchange="voicePreviewState.parsed.expenses[${i}].date=this.value" class="px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
                  </div>
                </div>
              `).join('')}

              ${p.incomes.map((inc, i) => `
                <div class="p-3 rounded-2xl border border-secondary/35 bg-secondary/8 flex flex-col gap-2">
                  <span class="text-[10px] font-extrabold uppercase text-secondary">Ingreso detectado</span>
                  <div class="grid grid-cols-12 gap-2">
                    <input type="text" value="${esc(inc.source)}" onchange="voicePreviewState.parsed.incomes[${i}].source=this.value" class="col-span-7 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
                    <input type="number" step="0.01" value="${Money.fromCents(inc.amount_cents).toFixed(2)}" onchange="voicePreviewState.parsed.incomes[${i}].amount_cents=Money.toCents(this.value)" class="col-span-5 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-extrabold text-right text-secondary"/>
                  </div>
                </div>
              `).join('')}

              ${p.debts.map((d, i) => `
                <div class="p-3 rounded-2xl border ${d.confidence < 0.7 ? 'border-amber-500/60 bg-amber-500/8' : 'border-primary/35 bg-primary/6'} flex flex-col gap-2">
                  <div class="flex items-center justify-between text-[10px] font-extrabold uppercase">
                    <span class="text-primary">🤝 Deuda vinculada (${d.type === 'owed' ? 'Te debe' : 'Le debes'})</span>
                    <span class="text-outline">${d.confidence < 0.7 ? '⚠️ Confirma nombre' : '✓ Vinculada'}</span>
                  </div>
                  <div class="grid grid-cols-12 gap-2">
                    <input type="text" value="${esc(d.person)}" onchange="voicePreviewState.parsed.debts[${i}].person=this.value" class="col-span-7 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface"/>
                    <input type="number" step="0.01" value="${Money.fromCents(d.amount_cents).toFixed(2)}" onchange="voicePreviewState.parsed.debts[${i}].amount_cents=Money.toCents(this.value)" class="col-span-5 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-extrabold text-right text-primary"/>
                  </div>
                </div>
              `).join('')}

              <button onclick="confirmCompoundVoicePreview()" class="w-full py-3 rounded-2xl bg-secondary text-white font-extrabold text-sm shadow-sm active-scale">
                Confirmar y guardar todo ✓
              </button>
            </div>
          `}
        </div>
      `);
    }

    async function confirmCompoundVoicePreview() {
      const p = voicePreviewState?.parsed;
      if (!p) return;
      stopCompoundVoiceListen();

      // Save dictation history & learn personal synonyms from corrections
      if (!Array.isArray(S.voiceHistory)) S.voiceHistory = [];
      S.voiceHistory.unshift({ id: uid(), text: voicePreviewState.transcript, date: todayStr(), ts: Date.now() });
      if (S.voiceHistory.length > 40) S.voiceHistory = S.voiceHistory.slice(0, 40);

      for (const ex of p.expenses) {
        if (!(ex.amount_cents > 0)) continue;
        if (ex._userCorrected && ex.note) {
          if (!S.voiceSynonyms || typeof S.voiceSynonyms !== 'object') S.voiceSynonyms = {};
          const firstWord = ex.note.toLowerCase().split(/\s+/)[0];
          if (firstWord && firstWord.length >= 3) S.voiceSynonyms[firstWord] = ex.cat;
        }
        const obj = enrichTransactionMoney({
          id: uid(),
          amount_cents: ex.amount_cents,
          amount: Money.fromCents(ex.amount_cents),
          cat: ex.cat,
          method: 'tarjeta',
          note: ex.note,
          date: ex.date || todayStr(),
          tripId: '',
          refund: false,
          source: 'voz',
          ts: Date.now()
        }, 'exp');
        S.expenses.push(obj);
        if (loggedUserId) await dbUpsertPersonalExpense(obj);
      }

      for (const inc of p.incomes) {
        if (!(inc.amount_cents > 0)) continue;
        const obj = enrichTransactionMoney({
          id: uid(),
          amount_cents: inc.amount_cents,
          amount: Money.fromCents(inc.amount_cents),
          cat: inc.cat || 'extra',
          source: inc.source || 'Ingreso por voz',
          note: inc.note || '',
          date: inc.date || todayStr(),
          ts: Date.now()
        }, 'inc');
        S.incomes.push(obj);
        if (loggedUserId) await dbUpsertPersonalIncome(obj);
      }

      for (const d of p.debts) {
        if (!(d.amount_cents > 0)) continue;
        upsertPersonalDebt(d.person, d.type, Money.fromCents(d.amount_cents), d.note || 'Dictado por voz');
      }

      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      haptic('success');
      showToast(`🎤 Guardado: ${p.expenses.length} gasto(s), ${p.incomes.length} ingreso(s), ${p.debts.length} deuda(s) ✓`);
    }

    // ----------------------------------------------------------------------------
    // 4C. ITEM-LEVEL RECEIPT OCR PARSER, PER-ITEM CATEGORIZATION & RECEIPTS GALLERY
    // ----------------------------------------------------------------------------
    const RECEIPT_ITEM_CAT_RULES = [
      { cat: 'ocio',   re: /(vino|cerveza|birra|copa|gin|ron|whisky|chocolate|bomb[oó]n|helado|patatas fritas|chips|galletas|boller[ií]a|refresco|coca|fanta|postre|tarta|caf[eé]|sushi|pizza)/i, indulgence: true },
      { cat: 'hogar',  re: /(detergente|suavizante|lej[ií]a|papel higi|servilleta|estropajo|fregasuelos|lavavajillas|bolsa basura|pilas|bombilla|limpiador)/i },
      { cat: 'salud',  re: /(gel\b|champ[uú]|pasta dental|cepillo|paracetamol|ibuprofeno|farmacia|crema|desodorante|vitamina|tirita)/i },
      { cat: 'comida', re: /(leche|pan\b|huevo|pollo|ternera|cerdo|pescado|salm[oó]n|at[uú]n|lechuga|tomate|patata|cebolla|manzana|pl[aá]tano|fruta|verdura|arroz|pasta|aceite|queso|yogur|jam[oó]n|agua)/i }
    ];

    function categorizeReceiptItem(itemName, fallbackCat = 'comida') {
      const s = String(itemName || '');
      for (const r of RECEIPT_ITEM_CAT_RULES) {
        if (r.re.test(s)) return { cat: r.cat, indulgence: !!r.indulgence };
      }
      return { cat: fallbackCat, indulgence: false };
    }

    /**
     * Detailed Receipt Layout Parser:
     * Extracts merchant, date, NIF/CIF, payment card last4, tax, total, AND individual item lines
     * with quantity, line price in integer cents, and per-item category!
     */
    function parseReceiptLinesDetailed(rawText, fallbackName = '') {
      const text = String(rawText || '');
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      const knownStores = [
        'Mercadona', 'Carrefour', 'Lidl', 'Aldi', 'Dia', 'Consum', 'Eroski', 'Alcampo',
        'El Corte Inglés', 'Zara', 'Pull&Bear', 'Bershka', 'Ikea', 'Decathlon',
        'Repsol', 'Cepsa', 'BP', 'MediaMarkt', 'Fnac', 'Amazon', 'McDonald', 'Burger King', 'Starbucks', 'Tagliatella'
      ];
      let storeName = '';
      for (const brand of knownStores) {
        if (text.toLowerCase().includes(brand.toLowerCase())) { storeName = brand; break; }
      }
      if (!storeName) {
        const firstClean = lines.find(l => l.length >= 3 && !/^\d[\d\s\/\-\.:€]*$/.test(l) && !/factura|ticket|nif|cif/i.test(l));
        storeName = firstClean ? firstClean.slice(0, 36) : (fallbackName ? fallbackName.replace(/\.[^.]+$/, '') : 'Ticket escaneado');
      }

      // Date extraction
      let date = todayStr();
      const dm = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|\d{2})/);
      if (dm) {
        let y = parseInt(dm[3], 10);
        if (y < 100) y += 2000;
        date = `${y}-${String(dm[2]).padStart(2, '0')}-${String(dm[1]).padStart(2, '0')}`;
      }

      // NIF / CIF & card last 4
      const nifM = text.match(/\b(?:NIF|CIF)[:\s]*([A-Z0-9\-]{8,12})\b/i);
      const cardM = text.match(/(?:\*{2,4}|XXXX)[\s\-]?(\d{4})\b/);

      // Total & IVA
      let totalCents = 0;
      let taxCents = 0;
      const items = [];
      const fallbackCat = guessCatFromMerchant(storeName) || 'comida';

      const ignoreLineRe = /\b(total|subtotal|importe|a pagar|efectivo|cambio|entregado|tarjeta|visa|mastercard|iva|base imponible|descuento|dto|cuota)\b/i;

      lines.forEach(line => {
        const priceM = line.match(/(-?\d{1,4}[.,]\d{2})\s*€?\s*[A-Z]?\s*$/);
        if (!priceM) return;
        const cents = Money.toCents(priceM[1]);
        const labelPart = line.slice(0, priceM.index).trim();

        if (/\b(total|a pagar|importe total)\b/i.test(line) && !/subtotal/i.test(line)) {
          if (Math.abs(cents) > totalCents) totalCents = Math.abs(cents);
          return;
        }
        if (/\biva\b/i.test(line)) {
          taxCents = Math.abs(cents);
          return;
        }
        if (ignoreLineRe.test(line) || cents <= 0) return;

        // Parse optional leading quantity ("2 x LECHE" or "2 LECHE")
        let qty = 1;
        let name = labelPart;
        const qm = labelPart.match(/^(\d+)\s*(?:x|\*)?\s+(.+)$/i);
        if (qm && parseInt(qm[1], 10) <= 50) {
          qty = parseInt(qm[1], 10);
          name = qm[2].trim();
        }
        name = name.replace(/\s+\d+[.,]\d{2}\s*$/, '').trim();
        if (name.length < 2) return;

        const catRes = categorizeReceiptItem(name, fallbackCat);
        items.push({
          id: uid(),
          name,
          qty,
          priceCents: cents,
          cat: catRes.cat,
          indulgence: catRes.indulgence,
          confidence: 0.85
        });
      });

      const itemsSumCents = items.reduce((a, it) => a + it.priceCents, 0);
      if (totalCents === 0 && itemsSumCents > 0) totalCents = itemsSumCents;
      const mismatchCents = totalCents > 0 && items.length > 0 ? Math.abs(totalCents - itemsSumCents) : 0;

      // Optional witty note when humor tone is active and an indulgence item was detected
      const topIndulgence = items.find(it => it.indulgence);
      const humorNote = (typeof getCoachTone === 'function' && getCoachTone() === 'humor' && topIndulgence)
        ? `Ese «${topIndulgence.name}» de ${fmt(Money.fromCents(topIndulgence.priceCents))} no era estrictamente necesario 😏`
        : '';

      return {
        storeName,
        date,
        nif: nifM ? nifM[1] : '',
        cardLast4: cardM ? cardM[1] : '',
        taxCents,
        totalCents,
        itemsSumCents,
        mismatchWarning: mismatchCents > 5,
        items,
        humorNote,
        defaultCat: fallbackCat
      };
    }

    /** Compress receipt image into a lightweight JPEG/WebP thumbnail dataURL for offline gallery storage */
    function compressReceiptImageToDataUrl(file, maxW = 640, quality = 0.72) {
      return new Promise((resolve) => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const scale = Math.min(1, maxW / Math.max(1, img.width));
              const w = Math.round(img.width * scale);
              const h = Math.round(img.height * scale);
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => resolve(reader.result);
            img.src = reader.result;
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        } catch (e) {
          resolve('');
        }
      });
    }

    let receiptScanState = null;

    function openEnhancedReceiptScannerModal() {
      receiptScanState = {
        images: [],
        storeName: '',
        date: todayStr(),
        totalCents: 0,
        cat: 'comida',
        nif: '',
        cardLast4: '',
        items: [],
        mismatchWarning: false,
        humorNote: '',
        trackWarranty: false,
        status: '',
        scanning: false
      };
      renderEnhancedReceiptScannerModal();
    }

    async function handleEnhancedReceiptFiles(inputEl) {
      const files = Array.from(inputEl.files || []);
      if (!files.length || !receiptScanState) return;
      receiptScanState.scanning = true;
      receiptScanState.status = 'Analizando ticket y extrayendo artículos...';
      renderEnhancedReceiptScannerModal();

      let combinedText = '';
      for (const file of files) {
        const thumb = await compressReceiptImageToDataUrl(file, 720, 0.75);
        if (thumb) receiptScanState.images.push(thumb);

        // 1. Prefer native Apple Vision OCR on iPhone .IPA (instant, 0 MB download, ultra-accurate!)
        let ocrText = '';
        if (typeof window.claridadNativeOCR === 'function' && thumb) {
          try {
            ocrText = await window.claridadNativeOCR(thumb);
          } catch (e) {}
        }
        // 2. Fallback to Tesseract.js on Web
        if (!ocrText) {
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
            ocrText = res?.data?.text || '';
          } catch (e) {}
        }
        if (ocrText) combinedText += '\n' + ocrText;
      }

      const parsed = parseReceiptLinesDetailed(combinedText, files[0]?.name || '');
      receiptScanState.storeName = parsed.storeName;
      receiptScanState.date = parsed.date;
      receiptScanState.totalCents = parsed.totalCents;
      receiptScanState.cat = parsed.defaultCat;
      receiptScanState.nif = parsed.nif;
      receiptScanState.cardLast4 = parsed.cardLast4;
      receiptScanState.items = parsed.items;
      receiptScanState.mismatchWarning = parsed.mismatchWarning;
      receiptScanState.humorNote = parsed.humorNote;
      receiptScanState.trackWarranty = parsed.totalCents >= 10000; // Auto-suggest warranty for >100€
      receiptScanState.scanning = false;
      receiptScanState.status = parsed.items.length > 0
        ? `✓ ${parsed.storeName}: ${parsed.items.length} artículo(s) detectados (${fmt(Money.fromCents(parsed.totalCents))})`
        : (parsed.totalCents > 0 ? `✓ Detectado ${fmt(Money.fromCents(parsed.totalCents))} en ${parsed.storeName}` : 'Foto guardada. Confirma o añade los artículos abajo.');
      renderEnhancedReceiptScannerModal();
    }

    function sendReceiptItemsToSmartSplit() {
      const st = receiptScanState;
      if (!st) return;
      openSmartSplitModal({
        mode: 'items',
        concept: st.storeName || 'Ticket compartido',
        total: Money.fromCents(st.totalCents),
        items: st.items.map(it => ({ name: it.name, cents: it.priceCents }))
      });
    }

    function renderEnhancedReceiptScannerModal() {
      const st = receiptScanState;
      if (!st) return;

      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div class="flex items-center gap-2.5">
              <span class="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center">${ico('photo_camera', 'text-[19px]')}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Escáner OCR por artículos</h3>
                <p class="text-[11px] text-on-surface-variant">${window.__CLARIDAD_IOS_NATIVE__ ? 'Apple Vision nativo offline' : 'OCR local + archivo de tickets'}</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <label class="w-full p-4 rounded-2xl border-2 border-dashed border-primary/45 bg-primary/5 hover:bg-primary/10 text-center cursor-pointer flex flex-col items-center gap-1.5 transition active-scale">
            <span class="text-primary">${ico('add_a_photo', 'text-[28px]')}</span>
            <span class="text-xs font-extrabold text-primary">${st.images.length > 0 ? 'Añadir otra foto (ticket largo)' : 'Hacer foto o subir ticket (1 o varias fotos)'}</span>
            <input type="file" accept="image/*" multiple capture="environment" onchange="handleEnhancedReceiptFiles(this)" class="hidden"/>
          </label>

          ${st.status ? `
            <div class="p-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface flex items-center gap-2">
              ${st.scanning ? ico('sync', 'animate-spin text-primary text-[16px]') : ico('check_circle', 'text-secondary text-[16px]')}
              <span>${esc(st.status)}</span>
            </div>
          ` : ''}

          ${st.humorNote ? `<div class="p-2.5 rounded-xl bg-amber-500/12 border border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-200">${esc(st.humorNote)}</div>` : ''}
          ${st.mismatchWarning ? `<div class="p-2.5 rounded-xl bg-tertiary/10 border border-tertiary/30 text-[11px] font-bold text-tertiary">⚠️ La suma de artículos no coincide exactamente con el total del ticket. Revísalo antes de guardar.</div>` : ''}

          ${st.images.length > 0 ? `
            <div class="flex gap-2 overflow-x-auto custom-scroll">
              ${st.images.map(src => `<img src="${src}" alt="Ticket" class="h-24 rounded-xl border border-outline-variant/35 object-cover flex-shrink-0"/>`).join('')}
            </div>
          ` : ''}

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Comercio</label>
              <input type="text" value="${esc(st.storeName)}" placeholder="Ej. Mercadona" oninput="receiptScanState.storeName=this.value" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            </div>
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Total (${esc(currencySymbol())})</label>
              <input type="number" step="0.01" value="${st.totalCents ? Money.fromCents(st.totalCents).toFixed(2) : ''}" placeholder="0.00" oninput="receiptScanState.totalCents=Money.toCents(this.value)" class="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-right text-on-surface"/>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <input type="date" value="${esc(st.date)}" onchange="receiptScanState.date=this.value" class="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            <select onchange="receiptScanState.cat=this.value" class="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
              ${allCats().map(c => `<option value="${c.id}" ${st.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
          </div>

          <!-- Extracted Line Items (Per-Item Categorization) -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Artículos del ticket (${st.items.length})</span>
              <button onclick="receiptScanState.items.push({id:uid(),name:'',qty:1,priceCents:0,cat:receiptScanState.cat}); renderEnhancedReceiptScannerModal()" class="text-[11px] font-extrabold text-primary hover:underline">+ Línea</button>
            </div>
            <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              ${st.items.map((it, i) => `
                <div class="grid grid-cols-12 gap-1.5 items-center">
                  <input type="text" value="${esc(it.name)}" placeholder="Artículo" onchange="receiptScanState.items[${i}].name=this.value" class="col-span-5 px-2 py-1 rounded-lg bg-surface-container-low border border-outline-variant/35 text-[11px] font-bold text-on-surface"/>
                  <select onchange="receiptScanState.items[${i}].cat=this.value" class="col-span-4 px-1.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/35 text-[10px] font-bold text-on-surface">
                    ${allCats().map(c => `<option value="${c.id}" ${it.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
                  </select>
                  <input type="number" step="0.01" value="${it.priceCents ? Money.fromCents(it.priceCents).toFixed(2) : ''}" onchange="receiptScanState.items[${i}].priceCents=Money.toCents(this.value)" class="col-span-2 px-1.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/35 text-[11px] font-extrabold text-right text-on-surface"/>
                  <button onclick="receiptScanState.items.splice(${i},1); renderEnhancedReceiptScannerModal()" class="col-span-1 text-outline hover:text-tertiary text-center">×</button>
                </div>
              `).join('') || `<p class="text-[11px] text-on-surface-variant">Opcional: los artículos detectados se categorizan individualmente.</p>`}
            </div>
          </div>

          <label class="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
            <input type="checkbox" ${st.trackWarranty ? 'checked' : ''} onchange="receiptScanState.trackWarranty=this.checked" class="w-4 h-4 rounded text-primary"/>
            Guardar garantía legal (3 años) con aviso antes de caducar
          </label>

          <div class="grid grid-cols-2 gap-2 pt-1">
            ${st.items.length > 0 ? `
              <button onclick="sendReceiptItemsToSmartSplit()" class="py-3 px-3 rounded-2xl bg-surface-container text-primary font-extrabold text-xs active-scale">
                👥 Repartir ítems
              </button>
            ` : `<span></span>`}
            <button onclick="saveEnhancedReceiptExpense()" class="${st.items.length > 0 ? '' : 'col-span-2'} py-3 px-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-sm active-scale">
              Guardar ticket ✓
            </button>
          </div>
        </div>
      `);
    }

    async function saveEnhancedReceiptExpense() {
      const st = receiptScanState;
      if (!st) return;
      const totalCents = st.totalCents || st.items.reduce((a, it) => a + (it.priceCents || 0), 0);
      if (!(totalCents > 0)) {
        showToast('Introduce el importe total del ticket');
        return;
      }

      const receiptId = 'rcp_' + uid();
      const txId = uid();
      const store = (st.storeName || '').trim() || 'Ticket escaneado';
      const warrantyEnds = st.trackWarranty
        ? (parseInt(st.date.slice(0, 4), 10) + 3) + st.date.slice(4)
        : null;

      // Save archived receipt record (with compressed thumbnails & items)
      if (!Array.isArray(S.receipts)) S.receipts = [];
      S.receipts.unshift({
        id: receiptId,
        transaction_id: txId,
        store_name: store,
        date: st.date || todayStr(),
        total_cents: totalCents,
        nif: st.nif || '',
        card_last4: st.cardLast4 || '',
        items: st.items.map(it => ({ name: it.name, qty: it.qty || 1, priceCents: it.priceCents || 0, cat: it.cat || st.cat })),
        images: st.images.slice(0, 3),
        warranty_until: warrantyEnds,
        returned: false,
        created_at: Date.now()
      });

      // Compute per-category internal split summary if multiple item categories exist
      const catBreakdown = {};
      st.items.forEach(it => {
        if (it.priceCents > 0) catBreakdown[it.cat] = (catBreakdown[it.cat] || 0) + it.priceCents;
      });

      const expObj = enrichTransactionMoney({
        id: txId,
        amount_cents: totalCents,
        amount: Money.fromCents(totalCents),
        cat: st.cat || 'comida',
        method: 'tarjeta',
        note: `${store} #ticket`,
        date: st.date || todayStr(),
        receipt_id: receiptId,
        categorySplits: Object.keys(catBreakdown).length > 1 ? catBreakdown : null,
        tripId: '',
        refund: false,
        source: 'ocr',
        ts: Date.now()
      }, 'exp');

      S.expenses.push(expObj);
      saveLocalState(true);
      closeUniversalModal();
      viewMk = monthKey(expObj.date);
      renderAllViews();
      if (loggedUserId) await dbUpsertPersonalExpense(expObj);
      showToast(`📸 Ticket guardado y archivado: ${fmt(Money.fromCents(totalCents))} en ${store} ✓`);
    }

    async function createReturnFromReceipt(receiptId) {
      const r = (S.receipts || []).find(x => x.id === receiptId);
      if (!r || r.returned) return;
      if (!confirm(`¿Registrar devolución de ${fmt(Money.fromCents(r.total_cents))} para el ticket de ${r.store_name}?`)) return;
      r.returned = true;
      const inc = enrichTransactionMoney({
        id: uid(),
        amount_cents: r.total_cents,
        amount: Money.fromCents(r.total_cents),
        cat: 'extra',
        source: `Devolución ${r.store_name}`,
        note: `Devolución vinculada al ticket ${r.date}`,
        date: todayStr(),
        receipt_id: r.id,
        ts: Date.now()
      }, 'inc');
      S.incomes.push(inc);
      saveLocalState(true);
      renderAllViews();
      if (loggedUserId) await dbUpsertPersonalIncome(inc);
      showToast(`↩️ Devolución de ${fmt(Money.fromCents(r.total_cents))} registrada ✓`);
    }

    function openReceiptDetailModal(receiptId) {
      const r = (S.receipts || []).find(x => x.id === receiptId);
      if (!r) return;
      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${esc(r.store_name)}</h3>
              <p class="text-xs text-on-surface-variant">${fmtDay(r.date)} · ${fmt(Money.fromCents(r.total_cents))}${r.card_last4 ? ` · Tarjeta ****${esc(r.card_last4)}` : ''}</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          ${(r.images && r.images.length > 0) ? `
            <div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
              ${r.images.map(src => `<img src="${src}" alt="Ticket" class="w-full rounded-2xl border border-outline-variant/35"/>`).join('')}
            </div>
          ` : ''}

          ${r.warranty_until ? `
            <div class="p-3 rounded-xl bg-secondary/10 border border-secondary/25 text-xs font-bold text-secondary">
              🛡️ Garantía legal válida hasta el <strong>${esc(r.warranty_until)}</strong>
            </div>
          ` : ''}

          ${(r.items && r.items.length > 0) ? `
            <div class="flex flex-col gap-1 text-xs">
              <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Desglose de artículos</span>
              ${r.items.map(it => `
                <div class="flex justify-between py-1 border-b border-outline-variant/15 last:border-0">
                  <span>${it.qty > 1 ? `${it.qty}× ` : ''}${esc(it.name)} <span class="text-[10px] text-primary">(${esc(catById(it.cat).name)})</span></span>
                  <strong class="tabular-nums">${fmt(Money.fromCents(it.priceCents))}</strong>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="grid grid-cols-2 gap-2">
            ${!r.returned ? `<button onclick="closeUniversalModal(); createReturnFromReceipt('${r.id}')" class="py-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-xs">Registrar devolución</button>` : `<span class="py-2.5 text-center text-xs font-bold text-secondary">✓ Devuelto</span>`}
            <button onclick="S.receipts=S.receipts.filter(x=>x.id!=='${r.id}'); saveLocalState(true); closeUniversalModal(); renderAllViews(); showToast('Ticket borrado del archivo')" class="py-2.5 rounded-xl bg-tertiary/10 text-tertiary font-extrabold text-xs">Eliminar archivo</button>
          </div>
        </div>
      `);
    }

    /** Returns archived receipts whose legal warranty expires within `withinDays` days */
    function getExpiringWarranties(withinDays = 30, baseDate = new Date()) {
      const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
      return (S?.receipts || []).map(r => {
        if (!r || !r.warranty_until || r.returned) return null;
        const expDt = new Date(r.warranty_until + 'T00:00:00');
        if (isNaN(expDt)) return null;
        const daysLeft = Math.round((expDt - today) / 86400000);
        if (daysLeft >= 0 && daysLeft <= withinDays) {
          return { ...r, daysLeft };
        }
        return null;
      }).filter(Boolean).sort((a, b) => a.daysLeft - b.daysLeft);
    }

    /** Export archived receipts & warranties as a clean printable HTML/PDF bundle for accounting/gestoría */
    function exportReceiptsArchiveHTML() {
      const list = (S?.receipts || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      if (list.length === 0) {
        showToast('No tienes tickets archivados todavía');
        return;
      }
      const totalCents = list.reduce((a, r) => a + (r.total_cents || 0), 0);
      const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Archivo de Tickets y Garantías — Claridad Financiera</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; color: #111827; padding: 28px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  .meta { font-size: 12px; color: #4b5563; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
  th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
  th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
  .card { page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
  img { max-height: 220px; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 8px; }
  @media print { .no-print { display: none; } }
</style></head><body>
<div class="no-print" style="margin-bottom:16px"><button onclick="window.print()" style="padding:10px 18px;border-radius:10px;background:#4f46e5;color:#fff;border:0;font-weight:700;cursor:pointer">🖨️ Imprimir / Guardar PDF para gestoría</button></div>
<h1>Archivo de Tickets y Garantías</h1>
<p class="meta">Generado el ${new Date().toLocaleDateString('es-ES')} · ${list.length} ticket(s) · Suma total: ${fmt(Money.fromCents(totalCents))}</p>
<table>
  <thead><tr><th>Fecha</th><th>Comercio</th><th>NIF/CIF</th><th>Garantía</th><th>Estado</th><th class="num">Total</th></tr></thead>
  <tbody>
    ${list.map(r => `<tr>
      <td>${esc(r.date || '')}</td>
      <td><strong>${esc(r.store_name || '')}</strong></td>
      <td>${esc(r.nif || '—')}</td>
      <td>${r.warranty_until ? `Hasta ${esc(r.warranty_until)}` : '—'}</td>
      <td>${r.returned ? 'Devuelto' : 'Vigente'}</td>
      <td class="num">${fmt(Money.fromCents(r.total_cents || 0))}</td>
    </tr>`).join('')}
  </tbody>
</table>
${list.map(r => `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <strong>${esc(r.store_name)} — ${esc(r.date)}</strong>
      <strong>${fmt(Money.fromCents(r.total_cents || 0))}</strong>
    </div>
    ${r.items && r.items.length ? `<ul style="font-size:11px;margin:8px 0 0;padding-left:18px">${r.items.map(it => `<li>${it.qty > 1 ? `${it.qty}× ` : ''}${esc(it.name)} (${esc(catById(it.cat).name)}) — ${fmt(Money.fromCents(it.priceCents || 0))}</li>`).join('')}</ul>` : ''}
    ${(r.images && r.images.length) ? `<div>${r.images.map(src => `<img src="${src}" alt="Ticket"/>`).join(' ')}</div>` : ''}
  </div>
`).join('')}
</body></html>`;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      } else {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `claridad_tickets_${todayStr()}.html`;
        a.click();
      }
      showToast('📄 Archivo de tickets listo para imprimir/PDF ✓');
    }
