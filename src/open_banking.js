    // ============================================================================
    // 5. OPEN BANKING PSD2 ENGINE (Enable Banking + Sandbox) & SMART DETECTORS
    // ============================================================================

    const SUPPORTED_BANKS_ES = [
      { id: 'bbva',           aspsp: 'BBVA',           name: 'BBVA',           country: 'ES', color: '#004481', emoji: '🏦' },
      { id: 'santander',      aspsp: 'Santander',      name: 'Banco Santander',country: 'ES', color: '#ec0000', emoji: '🔴' },
      { id: 'caixabank',      aspsp: 'CaixaBank',      name: 'CaixaBank',      country: 'ES', color: '#007eae', emoji: '⭐' },
      { id: 'imagin',         aspsp: 'imagin',         name: 'imaginBank',     country: 'ES', color: '#00b4a0', emoji: '✨' },
      { id: 'ing',            aspsp: 'ING',            name: 'ING España',     country: 'ES', color: '#ff6200', emoji: '🦁' },
      { id: 'revolut',        aspsp: 'Revolut',        name: 'Revolut',        country: 'ES', color: '#111827', emoji: '⚡' },
      { id: 'n26',            aspsp: 'N26',            name: 'N26',            country: 'ES', color: '#36a18b', emoji: '💳' },
      { id: 'sabadell',       aspsp: 'Banco Sabadell', name: 'Banco Sabadell', country: 'ES', color: '#006ec1', emoji: '🏛️' },
      { id: 'openbank',       aspsp: 'Openbank',       name: 'Openbank',       country: 'ES', color: '#d81e5b', emoji: '🔓' },
      { id: 'bankinter',      aspsp: 'Bankinter',      name: 'Bankinter',      country: 'ES', color: '#f97316', emoji: '🟠' },
      { id: 'abanca',         aspsp: 'ABANCA',         name: 'ABANCA',         country: 'ES', color: '#0284c7', emoji: '🌊' },
      { id: 'unicaja',        aspsp: 'Unicaja Banco',  name: 'Unicaja Banco',  country: 'ES', color: '#16a34a', emoji: '🌿' },
      { id: 'kutxabank',      aspsp: 'Kutxabank',      name: 'Kutxabank',      country: 'ES', color: '#1d4ed8', emoji: '🛡️' },
      { id: 'evobanco',       aspsp: 'EVO Banco',      name: 'EVO Banco',      country: 'ES', color: '#0f172a', emoji: '🚀' },
      { id: 'traderepublic',  aspsp: 'Trade Republic', name: 'Trade Republic', country: 'ES', color: '#334155', emoji: '📈' },
      { id: 'wise',           aspsp: 'Wise',           name: 'Wise',           country: 'ES', color: '#10b981', emoji: '🌍' }
    ];

    const BANK_MERCHANT_DICT = [
      { re: /mercadona/i,                 brand: 'Mercadona',         cat: 'comida',     conf: 0.96 },
      { re: /carrefour/i,                 brand: 'Carrefour',         cat: 'comida',     conf: 0.96 },
      { re: /\blidl\b/i,                  brand: 'Lidl',              cat: 'comida',     conf: 0.96 },
      { re: /\baldi\b/i,                  brand: 'Aldi',              cat: 'comida',     conf: 0.95 },
      { re: /supermercados?\s*dia|\bdia\s+es\b/i, brand: 'DIA',       cat: 'comida',     conf: 0.93 },
      { re: /eroski/i,                    brand: 'Eroski',            cat: 'comida',     conf: 0.95 },
      { re: /consum\b/i,                  brand: 'Consum',            cat: 'comida',     conf: 0.94 },
      { re: /alcampo/i,                   brand: 'Alcampo',           cat: 'comida',     conf: 0.95 },
      { re: /spotify/i,                   brand: 'Spotify',           cat: 'susc',       conf: 0.98 },
      { re: /netflix/i,                   brand: 'Netflix',           cat: 'susc',       conf: 0.98 },
      { re: /disney\+|disney\s*plus/i,    brand: 'Disney+',           cat: 'susc',       conf: 0.98 },
      { re: /hbo|max\.com/i,              brand: 'Max (HBO)',         cat: 'susc',       conf: 0.96 },
      { re: /apple\.com\/bill|icloud/i,   brand: 'Apple / iCloud',    cat: 'susc',       conf: 0.95 },
      { re: /openai|chatgpt/i,            brand: 'ChatGPT / OpenAI',  cat: 'susc',       conf: 0.97 },
      { re: /amazon\s*prime/i,            brand: 'Amazon Prime',      cat: 'susc',       conf: 0.96 },
      { re: /amazon|amzn/i,               brand: 'Amazon',            cat: 'compras',    conf: 0.90 },
      { re: /zara\b/i,                    brand: 'Zara',              cat: 'compras',    conf: 0.95 },
      { re: /bershka|pull&bear|stradivarius|massimo/i, brand: 'Inditex', cat: 'compras', conf: 0.93 },
      { re: /mediamarkt/i,                brand: 'MediaMarkt',        cat: 'compras',    conf: 0.95 },
      { re: /decathlon/i,                 brand: 'Decathlon',         cat: 'compras',    conf: 0.94 },
      { re: /ikea/i,                      brand: 'IKEA',              cat: 'hogar',      conf: 0.95 },
      { re: /leroy\s*merlin/i,            brand: 'Leroy Merlin',      cat: 'hogar',      conf: 0.95 },
      { re: /iberdrola|endesa|naturgy|repsol\s*luz|holaluz/i, brand: 'Luz / Gas', cat: 'hogar', conf: 0.96 },
      { re: /digi\b|movistar|vodafone|orange|pepephone|o2\b|lowi/i, brand: 'Fibra / Móvil', cat: 'hogar', conf: 0.94 },
      { re: /repsol|cepsa|bp\s|galp|ballenoil|plenoil/i, brand: 'Gasolinera', cat: 'transporte', conf: 0.95 },
      { re: /renfe|ouigo|iryo|metro\s|emt\b|tmb\b|alsa/i, brand: 'Transporte Público', cat: 'transporte', conf: 0.95 },
      { re: /\buber\b(?!\s*eats)|cabify|bolt\b|freenow/i, brand: 'VTC / Taxi', cat: 'transporte', conf: 0.93 },
      { re: /uber\s*eats|glovo|just\s*eat/i, brand: 'Delivery',       cat: 'ocio',       conf: 0.95 },
      { re: /mcdonald|burger\s*king|starbucks|vips\b|tagliatella|goiko|kfc/i, brand: 'Restauración', cat: 'ocio', conf: 0.94 },
      { re: /farmacia|sanitas|adeslas|asisa|basic-?fit|mcfit|vivagym/i, brand: 'Salud / Gimnasio', cat: 'salud', conf: 0.94 },
      { re: /ryanair|iberia|vueling|airbnb|booking\.com/i, brand: 'Viajes', cat: 'viajes', conf: 0.95 }
    ];

    /**
     * Clean raw bank transaction descriptions into normalized merchant name,
     * category, confidence (0..1), and structural flags (transfer / bizum / bankFee / salary).
     */
    function normalizeBankMerchant(rawText, amountCents = 0, isCredit = false) {
      const original = String(rawText || '').trim();
      const low = original.toLowerCase();

      // 1. Detect internal transfers (should NOT inflate expenses or incomes!)
      const isTransfer = /(traspaso\s+interno|transferencia\s+propia|traspaso\s+a\s+cuenta|traspaso\s+entre\s+cuentas|ahorro\s+autom[aá]tico|movimiento\s+interno)/.test(low);
      if (isTransfer) {
        return {
          merchant: 'Transferencia interna',
          cat: 'otros',
          confidence: 0.98,
          isTransfer: true,
          isBizum: false,
          bizumPerson: '',
          isBankFee: false,
          isSalary: false
        };
      }

      // 2. Detect bank fees / commissions
      const isBankFee = /(comisi[oó]n\s+(?:de\s+)?(?:mantenimiento|administraci[oó]n|tarjeta|descubierto|emisi[oó]n|cambio|transferencia)|gastos?\s+de\s+mantenimiento|intereses?\s+descubierto)/.test(low);
      if (isBankFee && !isCredit) {
        return {
          merchant: 'Comisión bancaria',
          cat: 'otros',
          confidence: 0.96,
          isTransfer: false,
          isBizum: false,
          bizumPerson: '',
          isBankFee: true,
          isSalary: false
        };
      }

      // 3. Detect Bizum (sent or received) + extract person name
      if (/\bbizum\b/.test(low)) {
        const pMatch = original.match(/bizum\s+(?:recibido\s+de|enviado\s+a|de|a|para)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)/i);
        const rawPerson = pMatch ? pMatch[1].trim() : '';
        const prettyPerson = rawPerson
          ? rawPerson.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
          : '';
        return {
          merchant: prettyPerson ? `Bizum ${isCredit ? 'de' : 'a'} ${prettyPerson}` : 'Bizum',
          cat: isCredit ? 'bizum' : 'otros',
          confidence: isCredit ? 0.94 : 0.72, // Outgoing Bizum goes to Inbox if unsure whether it's food/debt/ocio
          isTransfer: false,
          isBizum: true,
          bizumPerson: prettyPerson,
          isBankFee: false,
          isSalary: false
        };
      }

      // 4. Detect Salary credit
      const isSalary = isCredit && (/(n[oó]mina|salario|haber\s+mensual|payroll|sueldo)/.test(low) || amountCents >= 90000);
      if (isSalary && /(n[oó]mina|salario|haber|payroll|sueldo)/.test(low)) {
        return {
          merchant: 'Nómina mensual',
          cat: 'nomina',
          confidence: 0.98,
          isTransfer: false,
          isBizum: false,
          bizumPerson: '',
          isBankFee: false,
          isSalary: true
        };
      }

      // 5. Check user's custom auto-rules first (highest priority!)
      const userRuleCat = typeof applyRule === 'function' ? applyRule(low) : null;

      // Strip common bank noise prefixes/suffixes ("COMPRA TARJ. 4821 ...", "PAYPAL *", dates, card numbers, "MADRID ES")
      let cleaned = original
        .replace(/^(?:compra\s+(?:en\s+)?(?:tarj(?:eta)?\.?|comercio)|pago\s+(?:con\s+)?(?:movil|m[oó]vil|tarjeta|apple\s*pay)|recibo\s+domiciliado|adeudo\s+sepa|paypal\s*\*|sq\s*\*|sumup\s*\*)\s*/i, '')
        .replace(/\b(?:tarj(?:eta)?\.?\s*\*?\d{4}|\*{2,4}\d{4})\b/gi, ' ')
        .replace(/\b\d{2}[\/\-]\d{2}(?:[\/\-]\d{2,4})?\b/g, ' ')
        .replace(/\b(?:s\.?a\.?|s\.?l\.?u?\.?|ltd|inc|gmbh|b\.?v\.?)\b/gi, ' ')
        .replace(/\b(?:madrid|barcelona|valencia|sevilla|bilbao|malaga|zaragoza|spain|espana|españa|es|ie|nl|lu|gb)\b\s*$/gi, ' ')
        .replace(/\b\d{6,}\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleaned) cleaned = original.slice(0, 32) || 'Movimiento bancario';

      // 6. Match against curated Spanish/European merchant dictionary
      for (const entry of BANK_MERCHANT_DICT) {
        if (entry.re.test(original) || entry.re.test(cleaned)) {
          return {
            merchant: entry.brand,
            cat: userRuleCat || entry.cat,
            confidence: userRuleCat ? 0.97 : entry.conf,
            isTransfer: false,
            isBizum: false,
            bizumPerson: '',
            isBankFee: false,
            isSalary: false
          };
        }
      }

      // Title-case unknown merchant
      const niceName = cleaned
        .split(/\s+/)
        .slice(0, 4)
        .map(w => w.length > 2 ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : w.toUpperCase())
        .join(' ');

      if (userRuleCat) {
        return {
          merchant: niceName,
          cat: userRuleCat,
          confidence: 0.95,
          isTransfer: false,
          isBizum: false,
          bizumPerson: '',
          isBankFee: false,
          isSalary: false
        };
      }

      // Low confidence -> routes to "Por clasificar" inbox!
      const fallbackCat = isCredit ? 'extra' : (typeof guessCatFromMerchant === 'function' ? guessCatFromMerchant(low) : 'otros');
      const fallbackConf = (fallbackCat && fallbackCat !== 'otros' && !isCredit) ? 0.78 : 0.45;
      return {
        merchant: niceName,
        cat: fallbackCat || (isCredit ? 'extra' : 'otros'),
        confidence: isCredit ? 0.86 : fallbackConf,
        isTransfer: false,
        isBizum: false,
        bizumPerson: '',
        isBankFee: false,
        isSalary: false
      };
    }

    // ----------------------------------------------------------------------------
    // 5B. BANK PROVIDER ABSTRACTION (Enable Banking Edge Function + Sandbox)
    // ----------------------------------------------------------------------------
    function getOpenBankingEndpoint() {
      return `${SUPABASE_URL}/functions/v1/open-banking`;
    }

    async function callOpenBankingEdge(payload) {
      const res = await fetch(getOpenBankingEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.error || `HTTP ${res.status}`);
        err.code = data?.error || `HTTP_${res.status}`;
        throw err;
      }
      return data;
    }

    const EnableBankingProvider = {
      id: 'enable_banking',
      label: 'Enable Banking PSD2 (Real)',
      async checkAvailable() {
        try {
          const data = await callOpenBankingEdge({ action: 'health' });
          return !!data.configured;
        } catch (e) {
          return false;
        }
      },
      async startAuth(bankObj) {
        const redirectUrl = window.location.origin + window.location.pathname;
        const state = `claridad_bank_${bankObj.id}_${uid()}`;
        localStorage.setItem('claridad_pending_bank_auth', JSON.stringify({
          state,
          bankId: bankObj.id,
          bankName: bankObj.name,
          aspsp: bankObj.aspsp,
          startedAt: Date.now()
        }));
        const data = await callOpenBankingEdge({
          action: 'start_auth',
          aspsp_name: bankObj.aspsp,
          country: bankObj.country || 'ES',
          redirect_url: redirectUrl,
          state
        });
        if (!data?.url) throw new Error('No se recibió URL de autorización bancaria');
        window.location.href = data.url;
      },
      async completeSession(code) {
        return await callOpenBankingEdge({ action: 'complete_session', code });
      },
      async syncAccount(accountUid, dateFrom) {
        return await callOpenBankingEdge({ action: 'sync_account', account_uid: accountUid, date_from: dateFrom });
      },
      async revokeSession(sessionId) {
        return await callOpenBankingEdge({ action: 'revoke_session', session_id: sessionId });
      }
    };

    /** Generate realistic Spanish bank movements for instant Sandbox preview/testing */
    function generateSandboxBankTransactions(bankName, baseDate = new Date()) {
      const fmtOffset = (daysBack) => {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - daysBack);
        return dstr(d);
      };
      return [
        { external_id: `sbx_${bankName}_sal`, date: fmtOffset(14), amount_cents: 215000, isCredit: true,  raw: 'NOMINA EMPRESA TECH SL' },
        { external_id: `sbx_${bankName}_m1`,  date: fmtOffset(6),  amount_cents: 4860,   isCredit: false, raw: 'COMPRA TARJ. 4821 MERCADONA S.A. MADRID ES' },
        { external_id: `sbx_${bankName}_sp`,  date: fmtOffset(5),  amount_cents: 1199,   isCredit: false, raw: 'PAYPAL *SPOTIFY AB 35314369001' },
        { external_id: `sbx_${bankName}_dp1`, date: fmtOffset(3),  amount_cents: 1590,   isCredit: false, raw: 'COMPRA TARJ. 4821 UBER EATS MADRID ES' },
        { external_id: `sbx_${bankName}_dp2`, date: fmtOffset(2),  amount_cents: 1590,   isCredit: false, raw: 'COMPRA TARJ. 4821 UBER EATS MADRID ES' },
        { external_id: `sbx_${bankName}_tr`,  date: fmtOffset(2),  amount_cents: 25000,  isCredit: false, raw: 'TRASPASO INTERNO A CUENTA AHORRO' },
        { external_id: `sbx_${bankName}_fee`, date: fmtOffset(1),  amount_cents: 350,    isCredit: false, raw: 'COMISION MANTENIMIENTO CUENTA' },
        { external_id: `sbx_${bankName}_unk`, date: fmtOffset(1),  amount_cents: 2740,   isCredit: false, raw: 'COMERCIO LOCAL 8492 SLU' }
      ];
    }

    /**
     * Ingest raw bank transactions into Claridad state with:
     * - Strict deduplication (external_id + date/cents/merchant fingerprint)
     * - Internal transfer exclusion
     * - Auto-classification (>= 0.85 confidence) vs "Por clasificar" Inbox (< 0.85)
     * - Bizum P2P debt match notification
     */
    function ingestBankTransactions(conn, rawTxs) {
      if (!Array.isArray(S.expenses)) S.expenses = [];
      if (!Array.isArray(S.incomes)) S.incomes = [];
      if (!Array.isArray(S.pendingInbox)) S.pendingInbox = [];

      const existingExternalIds = new Set();
      const existingFingerprints = new Set();

      const addKey = (date, cents, text) => {
        const fp = `${date}|${cents}|${String(text || '').toLowerCase().slice(0, 14)}`;
        existingFingerprints.add(fp);
      };
      S.expenses.forEach(e => {
        if (e.external_id) existingExternalIds.add(e.external_id);
        addKey(e.date, e.amount_cents || Money.toCents(e.amount || 0), e.note);
      });
      S.incomes.forEach(i => {
        if (i.external_id) existingExternalIds.add(i.external_id);
        addKey(i.date, i.amount_cents || Money.toCents(i.amount || 0), i.source || i.note);
      });
      S.pendingInbox.forEach(p => {
        if (p.external_id) existingExternalIds.add(p.external_id);
        addKey(p.date, p.amount_cents, p.merchant);
      });

      let importedAuto = 0, sentToInbox = 0, skippedDuplicates = 0, skippedTransfers = 0;
      const bizumDebtMatches = [];

      (rawTxs || []).forEach(tx => {
        const cents = Math.abs(Math.round(tx.amount_cents || 0));
        if (!(cents > 0)) return;
        const extId = tx.external_id || `${conn.id}_${tx.date}_${cents}_${String(tx.raw || '').slice(0, 12)}`;
        const norm = normalizeBankMerchant(tx.raw, cents, !!tx.isCredit);
        const fp = `${tx.date}|${cents}|${norm.merchant.toLowerCase().slice(0, 14)}`;

        if (existingExternalIds.has(extId) || existingFingerprints.has(fp)) {
          skippedDuplicates++;
          return;
        }
        existingExternalIds.add(extId);
        existingFingerprints.add(fp);

        if (norm.isTransfer) {
          skippedTransfers++;
          return;
        }

        // Check if incoming Bizum matches an open P2P debt owed to the user!
        if (tx.isCredit && norm.isBizum && norm.bizumPerson) {
          const matchDebt = (S.debts || []).find(d =>
            !d.settled && d.type === 'owed' &&
            String(d.person || '').toLowerCase().includes(norm.bizumPerson.toLowerCase().split(' ')[0])
          );
          if (matchDebt) {
            bizumDebtMatches.push({ debtId: matchDebt.id, person: matchDebt.person, amount_cents: cents });
          }
        }

        // Route low-confidence outgoing movements to "Por clasificar" inbox
        if (!tx.isCredit && norm.confidence < 0.85) {
          S.pendingInbox.unshift({
            id: 'ibx_' + uid(),
            external_id: extId,
            bankConnectionId: conn.id,
            accountId: conn.accountId,
            date: tx.date || todayStr(),
            amount_cents: cents,
            raw: tx.raw || '',
            merchant: norm.merchant,
            suggestedCat: norm.cat,
            confidence: norm.confidence,
            isBizum: norm.isBizum,
            createdAt: Date.now()
          });
          sentToInbox++;
          return;
        }

        if (tx.isCredit) {
          const incObj = enrichTransactionMoney({
            id: uid(),
            external_id: extId,
            bankConnectionId: conn.id,
            account_id: conn.accountId,
            amount_cents: cents,
            amount: Money.fromCents(cents),
            cat: norm.cat || 'extra',
            source: norm.merchant,
            note: tx.raw || '',
            date: tx.date || todayStr(),
            source_kind: 'bank',
            ts: Date.now()
          }, 'inc');
          S.incomes.push(incObj);
          importedAuto++;
        } else {
          const expObj = enrichTransactionMoney({
            id: uid(),
            external_id: extId,
            bankConnectionId: conn.id,
            account_id: conn.accountId,
            amount_cents: cents,
            amount: Money.fromCents(cents),
            cat: norm.cat || 'otros',
            method: norm.isBizum ? 'bizum' : 'tarjeta',
            note: norm.merchant,
            rawMerchant: tx.raw || '',
            isBankFee: !!norm.isBankFee,
            date: tx.date || todayStr(),
            tripId: '',
            refund: false,
            source_kind: 'bank',
            ts: Date.now()
          }, 'exp');
          S.expenses.push(expObj);
          importedAuto++;
        }
      });

      return { importedAuto, sentToInbox, skippedDuplicates, skippedTransfers, bizumDebtMatches };
    }

    /** Convert Enable Banking API transaction payload into our canonical format */
    function mapEnableBankingTransactions(txResp) {
      const list = Array.isArray(txResp?.transactions) ? txResp.transactions : [];
      return list.map(t => {
        const amt = parseFloat(t?.transaction_amount?.amount || '0');
        const isCredit = String(t?.credit_debit_indicator || '').toUpperCase() === 'CRDT' || amt > 0 && String(t?.credit_debit_indicator || '').toUpperCase() !== 'DBIT';
        const rawParts = [
          t?.creditor?.name,
          t?.debtor?.name,
          Array.isArray(t?.remittance_information) ? t.remittance_information.join(' ') : t?.remittance_information,
          t?.note
        ].filter(Boolean);
        return {
          external_id: t?.entry_reference || t?.transaction_id || '',
          date: (t?.booking_date || t?.value_date || todayStr()).slice(0, 10),
          amount_cents: Money.toCents(Math.abs(amt)),
          isCredit,
          raw: rawParts.join(' — ') || 'Movimiento bancario'
        };
      });
    }

    function extractEnableBankingBalanceCents(balancesResp) {
      const list = Array.isArray(balancesResp?.balances) ? balancesResp.balances : [];
      const pref = list.find(b => /CLAV|ITAV|XPCD/i.test(String(b?.balance_type || ''))) || list[0];
      if (!pref?.balance_amount?.amount) return null;
      return Money.toCents(parseFloat(pref.balance_amount.amount));
    }

    /** Handle OAuth PSD2 callback when returning from bank authorization */
    async function handleBankOAuthCallback() {
      const params = new URLSearchParams(window.location.search || '');
      const code = params.get('code');
      const state = params.get('state') || '';
      if (!code || !state.startsWith('claridad_bank_')) return false;

      const pendingRaw = localStorage.getItem('claridad_pending_bank_auth');
      localStorage.removeItem('claridad_pending_bank_auth');
      const pending = pendingRaw ? JSON.parse(pendingRaw) : { bankName: 'Banco conectado', aspsp: 'Banco' };

      // Clean URL params immediately
      try {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      } catch (e) {}

      try {
        showToast(`Conectando ${pending.bankName} por PSD2...`);
        const session = await EnableBankingProvider.completeSession(code);
        const accounts = Array.isArray(session?.accounts) ? session.accounts : [];
        if (!Array.isArray(S.bankConnections)) S.bankConnections = [];
        if (!Array.isArray(S.accounts)) S.accounts = defaultAccountsList();

        let totalImported = 0;
        for (const bAcc of accounts) {
          const iban = bAcc?.account_id?.iban || bAcc?.uid || '';
          const maskedIban = iban ? `•••• ${iban.slice(-4)}` : 'Cuenta PSD2';
          const accId = 'acc_bank_' + uid();
          const connId = 'bconn_' + uid();

          S.accounts.push({
            id: accId,
            name: `${pending.bankName} (${maskedIban})`,
            type: 'banco',
            currency: bAcc?.currency || 'EUR',
            initial_cents: 0,
            color: '#4f46e5',
            icon: 'account_balance',
            syncedBalanceCents: null,
            bankConnectionId: connId,
            archived: false
          });

          const conn = {
            id: connId,
            provider: 'enable_banking',
            mode: 'live',
            bankId: pending.bankId || 'custom',
            bankName: pending.bankName || 'Banco PSD2',
            accountId: accId,
            accountUid: bAcc.uid,
            sessionId: session.session_id || '',
            ibanMasked: maskedIban,
            connectedAt: Date.now(),
            expiresAt: Date.now() + (90 * 86400 * 1000),
            lastSyncedAt: null,
            status: 'active'
          };
          S.bankConnections.push(conn);

          const syncRes = await syncBankConnection(connId, true);
          totalImported += (syncRes?.importedAuto || 0) + (syncRes?.sentToInbox || 0);
        }

        saveLocalState(true);
        renderAllViews();
        showToast(`🏦 ${pending.bankName} conectado ✓ (${totalImported} movimientos importados)`);
        return true;
      } catch (err) {
        console.error('Bank OAuth callback error:', err);
        showToast(`Error al completar conexión bancaria: ${err.message}`);
        return false;
      }
    }

    async function syncBankConnection(connId, silent = false) {
      const conn = (S.bankConnections || []).find(c => c.id === connId);
      if (!conn) return null;
      const acc = (S.accounts || []).find(a => a.id === conn.accountId);

      try {
        let rawTxs = [];
        let balanceCents = null;

        if (conn.mode === 'sandbox') {
          rawTxs = generateSandboxBankTransactions(conn.bankName);
          balanceCents = 248650; // 2.486,50 € realistic demo balance
        } else {
          const dateFrom = new Date(Date.now() - 45 * 86400 * 1000).toISOString().slice(0, 10);
          const data = await EnableBankingProvider.syncAccount(conn.accountUid, dateFrom);
          rawTxs = mapEnableBankingTransactions(data.transactions);
          balanceCents = extractEnableBankingBalanceCents(data.balances);
        }

        const res = ingestBankTransactions(conn, rawTxs);
        conn.lastSyncedAt = Date.now();
        conn.status = 'active';
        if (acc && typeof balanceCents === 'number') {
          acc.syncedBalanceCents = balanceCents;
          acc.lastSyncedAt = Date.now();
        }
        if (typeof logAuditEvent === 'function') {
          logAuditEvent('bank_sync', `${conn.bankName}: +${res.importedAuto} auto, +${res.sentToInbox} por clasificar`);
        }
        saveLocalState(true);
        renderAllViews();

        if (!silent) {
          const msg = res.importedAuto + res.sentToInbox > 0
            ? `🏦 ${conn.bankName}: ${res.importedAuto} importados${res.sentToInbox ? `, ${res.sentToInbox} por clasificar` : ''} ✓`
            : `🏦 ${conn.bankName} al día (sin movimientos nuevos)`;
          showToast(msg);
        }
        return res;
      } catch (err) {
        conn.status = 'error';
        saveLocalState(false);
        if (!silent) showToast(`Error sincronizando ${conn.bankName}: ${err.message}`);
        return null;
      }
    }

    async function syncAllConnectedBanks() {
      const conns = (S.bankConnections || []).filter(c => c.status !== 'revoked');
      if (!conns.length) {
        openConnectBankModal();
        return;
      }
      let totalNew = 0;
      for (const c of conns) {
        const r = await syncBankConnection(c.id, true);
        if (r) totalNew += r.importedAuto + r.sentToInbox;
      }
      showToast(totalNew > 0 ? `🏦 Bancos sincronizados: ${totalNew} mov. nuevos ✓` : '🏦 Todos tus bancos están al día ✓');
    }

    async function disconnectBankConnection(connId, keepHistory = true) {
      const conn = (S.bankConnections || []).find(c => c.id === connId);
      if (!conn) return;
      if (conn.mode === 'live' && conn.sessionId) {
        try { await EnableBankingProvider.revokeSession(conn.sessionId); } catch (e) {}
      }
      S.bankConnections = (S.bankConnections || []).filter(c => c.id !== connId);
      if (!keepHistory) {
        S.expenses = (S.expenses || []).filter(e => e.bankConnectionId !== connId);
        S.incomes = (S.incomes || []).filter(i => i.bankConnectionId !== connId);
        S.pendingInbox = (S.pendingInbox || []).filter(p => p.bankConnectionId !== connId);
      }
      const acc = (S.accounts || []).find(a => a.id === conn.accountId);
      if (acc) {
        acc.bankConnectionId = null;
        acc.syncedBalanceCents = null;
      }
      if (typeof logAuditEvent === 'function') logAuditEvent('bank_disconnect', conn.bankName);
      saveLocalState(true);
      renderAllViews();
      showToast(`Banco ${conn.bankName} desconectado${keepHistory ? ' (historial conservado)' : ' (historial borrado)'} ✓`);
    }

    function getExpiringBankConnections(withinDays = 7, nowMs = Date.now()) {
      return (S?.bankConnections || []).map(c => {
        if (!c || c.status === 'revoked' || !c.expiresAt) return null;
        const daysLeft = Math.ceil((c.expiresAt - nowMs) / 86400000);
        if (daysLeft <= withinDays) return { ...c, daysLeft };
        return null;
      }).filter(Boolean);
    }

    // ----------------------------------------------------------------------------
    // 5C. CONNECT BANK FLOW MODAL (Picker -> Explicit PSD2 Consent -> Live / Sandbox)
    // ----------------------------------------------------------------------------
    let bankConnectState = { step: 'pick', query: '', selectedBank: null, liveConfigured: null };

    async function openConnectBankModal() {
      bankConnectState = { step: 'pick', query: '', selectedBank: null, liveConfigured: null };
      renderConnectBankModal();
      const liveOk = await EnableBankingProvider.checkAvailable();
      bankConnectState.liveConfigured = liveOk;
      if (bankConnectState.step === 'pick' || bankConnectState.step === 'consent') {
        renderConnectBankModal();
      }
    }

    function selectBankForConsent(bankId) {
      const bank = SUPPORTED_BANKS_ES.find(b => b.id === bankId);
      if (!bank) return;
      bankConnectState.selectedBank = bank;
      bankConnectState.step = 'consent';
      renderConnectBankModal();
    }

    async function executeBankConnection(mode = 'live') {
      const bank = bankConnectState.selectedBank;
      if (!bank) return;
      if (mode === 'live') {
        try {
          showToast(`Abriendo autorización PSD2 de ${bank.name}...`);
          await EnableBankingProvider.startAuth(bank);
        } catch (err) {
          showToast('Edge Function Enable Banking aún no desplegada. Puedes probar el modo Sandbox o seguir la guía de 3 min.');
          bankConnectState.step = 'setup_guide';
          renderConnectBankModal();
        }
        return;
      }

      // Sandbox Mode: instant full end-to-end test with real normalization, inbox & detectors!
      if (!Array.isArray(S.bankConnections)) S.bankConnections = [];
      if (!Array.isArray(S.accounts)) S.accounts = defaultAccountsList();

      const accId = 'acc_sbx_' + uid();
      const connId = 'bconn_sbx_' + uid();
      S.accounts.push({
        id: accId,
        name: `${bank.name} (Demo PSD2)`,
        type: 'banco',
        currency: 'EUR',
        initial_cents: 0,
        color: bank.color || '#4f46e5',
        icon: 'account_balance',
        syncedBalanceCents: 248650,
        bankConnectionId: connId,
        archived: false
      });
      S.bankConnections.push({
        id: connId,
        provider: 'sandbox',
        mode: 'sandbox',
        bankId: bank.id,
        bankName: bank.name,
        accountId: accId,
        ibanMasked: 'ES91 •••• 4821',
        connectedAt: Date.now(),
        expiresAt: Date.now() + (90 * 86400 * 1000),
        lastSyncedAt: null,
        status: 'active'
      });

      const res = await syncBankConnection(connId, true);
      closeUniversalModal();
      showToast(`🏦 ${bank.name} (Sandbox) conectado: ${res?.importedAuto || 0} importados y ${res?.sentToInbox || 0} por clasificar ✓`);
    }

    function renderConnectBankModal() {
      const st = bankConnectState;
      const statusBadge = st.liveConfigured === true
        ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">● PSD2 Real listo</span>`
        : st.liveConfigured === false
          ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">● Sandbox listo · Real requiere 3 min setup</span>`
          : `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Comprobando puente PSD2...</span>`;

      if (st.step === 'pick') {
        const q = String(st.query || '').trim().toLowerCase();
        const banks = SUPPORTED_BANKS_ES.filter(b => !q || b.name.toLowerCase().includes(q) || b.aspsp.toLowerCase().includes(q));
        openUniversalModal(`
          <div class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface flex items-center gap-2">
                  ${ico('account_balance', 'text-primary text-[19px]')}
                  Conectar banco (PSD2)
                </h3>
                <div class="mt-1">${statusBadge}</div>
              </div>
              <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
            </div>

            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">${ico('search', 'text-[16px]')}</span>
              <input type="search" value="${esc(st.query)}" oninput="bankConnectState.query=this.value; renderConnectBankModal()" placeholder="Buscar tu banco (BBVA, Santander, ING, Revolut...)" class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface"/>
            </div>

            <div class="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-0.5">
              ${banks.map(b => `
                <button onclick="selectBankForConsent('${b.id}')" class="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/35 flex items-center gap-2.5 text-left transition active-scale">
                  <span class="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style="background:${b.color}18">${b.emoji}</span>
                  <div class="min-w-0">
                    <p class="text-xs font-extrabold text-on-surface truncate">${esc(b.name)}</p>
                    <p class="text-[10px] text-on-surface-variant">PSD2 · España</p>
                  </div>
                </button>
              `).join('')}
            </div>

            <button onclick="bankConnectState.step='setup_guide'; renderConnectBankModal()" class="text-[11px] font-bold text-primary hover:underline text-center">
              ¿Cómo activar conexión real gratuita con Enable Banking? (Guía 3 min)
            </button>
          </div>
        `);
        return;
      }

      if (st.step === 'setup_guide') {
        openUniversalModal(`
          <div class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Activar Open Banking Real (0 €/mes)</h3>
              <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
            </div>
            <div class="p-3.5 rounded-2xl bg-secondary/8 border border-secondary/25 text-xs text-on-surface leading-relaxed">
              Ya hemos creado la Supabase Edge Function lista para desplegar en <code class="font-mono text-[11px]">supabase/functions/open-banking/index.ts</code>. Solo necesitas tu App ID gratuito de <strong>Enable Banking</strong> (plan Personal PSD2).
            </div>
            <ol class="text-xs text-on-surface-variant flex flex-col gap-2 list-decimal pl-4">
              <li>Regístrate gratis en <strong>enablebanking.com/cp</strong> y crea una app Personal añadiendo la URL de esta app como <em>Redirect URL</em>.</li>
              <li>Descarga tu clave RSA (<code>private.pem</code>) y súbela a los secretos de tu Supabase:
                <pre class="mt-1 p-2 rounded-xl bg-surface-container text-[10px] overflow-x-auto font-mono text-on-surface">supabase secrets set ENABLE_BANKING_APP_ID="tu-uuid"
supabase secrets set ENABLE_BANKING_PRIVATE_KEY="$(cat private_pkcs8.pem)"
supabase functions deploy open-banking --no-verify-jwt</pre>
              </li>
              <li>Vuelve aquí: el indicador pasará automáticamente a <strong class="text-secondary">● PSD2 Real listo</strong> y podrás sincronizar saldos y movimientos reales sin usar Apple Pay Shortcuts.</li>
            </ol>
            <button onclick="bankConnectState.step='pick'; renderConnectBankModal()" class="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-extrabold">← Volver al selector de bancos</button>
          </div>
        `);
        return;
      }

      // Step 2: Explicit PSD2 Consent Screen
      const bank = st.selectedBank;
      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div class="flex items-center gap-2.5">
              <span class="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style="background:${bank.color}18">${bank.emoji}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Consentimiento PSD2 · ${esc(bank.name)}</h3>
                <p class="text-[11px] text-on-surface-variant">Acceso regulado de solo lectura</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div class="p-3 rounded-2xl bg-secondary/10 border border-secondary/25 flex flex-col gap-1.5">
              <p class="font-extrabold text-secondary">✅ Qué SÍ autorizas</p>
              <ul class="text-[11px] text-on-surface-variant space-y-1">
                <li>• Leer saldo real de tu cuenta</li>
                <li>• Importar movimientos automáticamente</li>
                <li>• Válido 90 días (aviso antes de renovar)</li>
                <li>• Revocable en 1 toque cuando quieras</li>
              </ul>
            </div>
            <div class="p-3 rounded-2xl bg-tertiary/8 border border-tertiary/25 flex flex-col gap-1.5">
              <p class="font-extrabold text-tertiary">🚫 Qué NUNCA podemos hacer</p>
              <ul class="text-[11px] text-on-surface-variant space-y-1">
                <li>• Nunca podemos mover ni transferir dinero</li>
                <li>• Nunca vemos tu usuario ni contraseña</li>
                <li>• Nunca vendemos ni compartimos tus datos</li>
              </ul>
            </div>
          </div>

          <div class="flex flex-col gap-2 pt-1">
            ${st.liveConfigured ? `
              <button onclick="executeBankConnection('live')" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-md active-scale">
                Autorizar ${esc(bank.name)} por PSD2 real →
              </button>
            ` : `
              <button onclick="executeBankConnection('sandbox')" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-md active-scale">
                Conectar ${esc(bank.name)} en modo prueba (Sandbox) →
              </button>
              <button onclick="bankConnectState.step='setup_guide'; renderConnectBankModal()" class="w-full py-2.5 rounded-2xl bg-secondary/12 text-secondary font-extrabold text-xs active-scale">
                Configurar conexión PSD2 real (gratis · 3 min)
              </button>
            `}
            <button onclick="bankConnectState.step='pick'; renderConnectBankModal()" class="w-full py-2 rounded-xl bg-surface-container text-on-surface-variant font-bold text-xs">
              ← Elegir otro banco
            </button>
          </div>
        </div>
      `);
    }

    // ----------------------------------------------------------------------------
    // 5D. BANDEJA "POR CLASIFICAR" (Low-Confidence Bank Movements + 1-Tap Rules)
    // ----------------------------------------------------------------------------
    function openPendingInboxModal() {
      const items = S.pendingInbox || [];
      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">📥 Bandeja «Por clasificar» (${items.length})</h3>
              <p class="text-[11px] text-on-surface-variant">Movimientos bancarios con baja confianza: 1 toque para clasificar y aprender regla</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          ${items.length > 0 ? `
            <div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-0.5">
              ${items.map(it => `
                <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-extrabold text-on-surface truncate">${esc(it.merchant)}</p>
                      <p class="text-[10px] text-on-surface-variant truncate">${fmtDay(it.date)} · ${esc(it.raw)}</p>
                    </div>
                    <span class="text-sm font-extrabold text-tertiary tabular-nums flex-shrink-0">−${fmt(Money.fromCents(it.amount_cents))}</span>
                  </div>

                  <div class="flex flex-wrap gap-1.5">
                    ${allCats().slice(0, 8).map(c => `
                      <button onclick="classifyInboxItem('${it.id}', '${c.id}', true)" class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition active-scale ${it.suggestedCat === c.id ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest text-on-surface border-outline-variant/40 hover:bg-surface-container'}">
                        ${esc(c.name)}
                      </button>
                    `).join('')}
                  </div>

                  <div class="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-[11px]">
                    <span class="text-on-surface-variant">Al elegir categoría se guardará regla automática</span>
                    <button onclick="ignoreInboxItemAsTransfer('${it.id}')" class="font-bold text-primary hover:underline">Es transferencia interna</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="py-8 text-center flex flex-col items-center gap-2 text-on-surface-variant">
              <span class="w-12 h-12 rounded-2xl bg-secondary/12 text-secondary flex items-center justify-center">${ico('check_circle', 'text-[24px]')}</span>
              <p class="text-sm font-extrabold text-on-surface">¡Bandeja limpia!</p>
              <p class="text-xs">Todos tus movimientos bancarios están perfectamente clasificados.</p>
            </div>
          `}
        </div>
      `);
    }

    async function classifyInboxItem(inboxId, catId, learnRule = true) {
      const idx = (S.pendingInbox || []).findIndex(x => x.id === inboxId);
      if (idx === -1) return;
      const it = S.pendingInbox[idx];
      S.pendingInbox.splice(idx, 1);

      const expObj = enrichTransactionMoney({
        id: uid(),
        external_id: it.external_id,
        bankConnectionId: it.bankConnectionId,
        account_id: it.accountId,
        amount_cents: it.amount_cents,
        amount: Money.fromCents(it.amount_cents),
        cat: catId || it.suggestedCat || 'otros',
        method: it.isBizum ? 'bizum' : 'tarjeta',
        note: it.merchant,
        rawMerchant: it.raw,
        date: it.date || todayStr(),
        tripId: '',
        refund: false,
        source_kind: 'bank',
        ts: Date.now()
      }, 'exp');
      S.expenses.push(expObj);

      if (learnRule && it.merchant) {
        const kw = it.merchant.toLowerCase().trim();
        if (kw.length >= 3 && !(S.rules || []).some(r => r.match === kw)) {
          S.rules.push({ id: uid(), match: kw, cat: catId });
        }
      }

      saveLocalState(true);
      if (loggedUserId) await dbUpsertPersonalExpense(expObj);
      renderAllViews();
      if ((S.pendingInbox || []).length > 0) openPendingInboxModal();
      else closeUniversalModal();
      showToast(`✓ ${it.merchant} → ${catById(catId).name}${learnRule ? ' (regla aprendida)' : ''}`);
    }

    function ignoreInboxItemAsTransfer(inboxId) {
      S.pendingInbox = (S.pendingInbox || []).filter(x => x.id !== inboxId);
      saveLocalState(true);
      renderAllViews();
      if ((S.pendingInbox || []).length > 0) openPendingInboxModal();
      else closeUniversalModal();
      showToast('Marcado como transferencia interna (excluido de gastos) ✓');
    }

    // ----------------------------------------------------------------------------
    // 5E. 7 SMART FINANCIAL DETECTORS (100% Local, Deterministic & Anti-Fatigue)
    // ----------------------------------------------------------------------------
    function runSmartFinancialDetectors(baseDate = new Date()) {
      const alerts = [];
      const dismissed = new Set(S?.dismissedDetectors || []);
      const expenses = (S?.expenses || []).slice();
      const incomes = (S?.incomes || []).slice();
      const recurring = (S?.recurring || []).slice();

      const normMerchantKey = (e) => cleanNoteText(e.note || '', catById(e.cat).name).toLowerCase().replace(/\s+/g, ' ').trim();
      const getCents = (e) => typeof e.amount_cents === 'number' ? e.amount_cents : Money.toCents(e.amount || 0);

      // Group expenses by normalized merchant
      const byMerchant = {};
      expenses.forEach(e => {
        const k = normMerchantKey(e);
        if (!k || k.length < 2) return;
        if (!byMerchant[k]) byMerchant[k] = [];
        byMerchant[k].push({ ...e, _cents: getCents(e) });
      });

      // --- DETECTOR 1: Duplicate Charges (< 48 hours, same merchant & exact same cents) ---
      Object.entries(byMerchant).forEach(([k, list]) => {
        if (list.length < 2) return;
        const sorted = list.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1], cur = sorted[i];
          if (prev._cents !== cur._cents || prev._cents <= 0) continue;
          const d1 = new Date(prev.date + 'T00:00:00');
          const d2 = new Date(cur.date + 'T00:00:00');
          const diffDays = Math.abs((d2 - d1) / 86400000);
          if (diffDays <= 2) {
            const id = `dup_${k}_${cur._cents}_${cur.date}`;
            if (!dismissed.has(id)) {
              alerts.push({
                id,
                type: 'duplicate_charge',
                severity: 'high',
                icon: 'warning',
                title: `Posible cobro duplicado en ${cleanNoteText(cur.note, k)}`,
                body: `Dos cargos idénticos de ${fmt(Money.fromCents(cur._cents))} en menos de 48h (${fmtDay(prev.date)} y ${fmtDay(cur.date)}).`,
                merchant: cleanNoteText(cur.note, k),
                amount_cents: cur._cents
              });
            }
            break;
          }
        }
      });

      // --- DETECTOR 2 & 3: Unregistered Recurring Subscriptions & Silent Price Hikes ---
      Object.entries(byMerchant).forEach(([k, list]) => {
        const byMonth = {};
        list.forEach(e => {
          const mk = String(e.date || '').slice(0, 7);
          if (!byMonth[mk]) byMonth[mk] = [];
          byMonth[mk].push(e);
        });
        const months = Object.keys(byMonth).sort();
        if (months.length < 2) return;

        const latest = byMonth[months[months.length - 1]][0];
        const prev = byMonth[months[months.length - 2]][0];
        const ratio = prev._cents > 0 ? latest._cents / prev._cents : 1;

        // Price hike detector (>= 5% and <= 60% increase on recurring merchant)
        if (ratio >= 1.05 && ratio <= 1.60) {
          const diffCents = latest._cents - prev._cents;
          const id = `hike_${k}_${latest._cents}`;
          if (!dismissed.has(id)) {
            alerts.push({
              id,
              type: 'price_hike',
              severity: 'medium',
              icon: 'trending_up',
              title: `Subida silenciosa en ${cleanNoteText(latest.note, k)}`,
              body: `Pasó de ${fmt(Money.fromCents(prev._cents))} a ${fmt(Money.fromCents(latest._cents))}/mes (+${fmt(Money.fromCents(diffCents))}/mes · +${fmt0(Money.fromCents(diffCents * 12))}/año).`,
              merchant: cleanNoteText(latest.note, k),
              diff_cents: diffCents,
              annual_diff_cents: diffCents * 12
            });
          }
        }

        // Unregistered subscription candidate (similar price ±10% across >= 2 months)
        const alreadyTracked = recurring.some(r => String(r.name || '').toLowerCase().includes(k) || k.includes(String(r.name || '').toLowerCase()));
        if (!alreadyTracked && ratio >= 0.90 && ratio <= 1.10) {
          const day = Math.min(28, Math.max(1, parseInt(String(latest.date || '').slice(8, 10), 10) || 1));
          const id = `subcand_${k}`;
          if (!dismissed.has(id)) {
            alerts.push({
              id,
              type: 'recurring_candidate',
              severity: 'info',
              icon: 'autorenew',
              title: `Suscripción detectada: ${cleanNoteText(latest.note, k)}`,
              body: `Se repite en ${months.length} meses (~${fmt(Money.fromCents(latest._cents))} sobre el día ${day}). ¿La añadimos a tus gastos fijos?`,
              merchant: cleanNoteText(latest.note, k),
              amount_cents: latest._cents,
              cat: latest.cat || 'susc',
              day
            });
          }
        }
      });

      // --- DETECTOR 4: Unusual Spend by Category (z-score > 2.0 or >= 2.5x category mean) ---
      const byCatMap = {};
      expenses.forEach(e => {
        if (!byCatMap[e.cat]) byCatMap[e.cat] = [];
        byCatMap[e.cat].push({ ...e, _cents: getCents(e) });
      });
      Object.entries(byCatMap).forEach(([catId, list]) => {
        if (list.length < 4) return;
        const vals = list.map(x => x._cents);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / vals.length;
        const std = Math.sqrt(variance);
        const recent = list.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
        if (!recent) return;
        const z = std > 0 ? (recent._cents - mean) / std : 0;
        if ((z >= 2.0 && recent._cents >= mean * 2.0) || recent._cents >= mean * 2.8) {
          const id = `unusual_${recent.id}`;
          if (!dismissed.has(id)) {
            alerts.push({
              id,
              type: 'unusual_spend',
              severity: 'info',
              icon: 'insights',
              title: `Gasto inusual en ${catById(catId).name}`,
              body: `${cleanNoteText(recent.note, catById(catId).name)} (${fmt(Money.fromCents(recent._cents))}) es ${(recent._cents / Math.max(1, mean)).toFixed(1)}× tu media habitual (${fmt0(Money.fromCents(Math.round(mean)))}).`,
              expenseId: recent.id,
              amount_cents: recent._cents
            });
          }
        }
      });

      // --- DETECTOR 5: Bank Fees Detected ---
      const feeRows = expenses.filter(e => e.isBankFee || /comisi[oó]n|mantenimiento\s+cuenta/i.test(String(e.note || '') + ' ' + String(e.rawMerchant || '')));
      if (feeRows.length > 0) {
        const feeSumCents = feeRows.reduce((a, e) => a + getCents(e), 0);
        const id = `fees_${feeRows.length}_${feeSumCents}`;
        if (!dismissed.has(id)) {
          alerts.push({
            id,
            type: 'bank_fees',
            severity: 'medium',
            icon: 'account_balance',
            title: `Comisiones bancarias detectadas (${fmt(Money.fromCents(feeSumCents))})`,
            body: `Hemos detectado ${feeRows.length} cargo(s) de comisiones bancarias. A este ritmo pueden suponer ~${fmt0(Money.fromCents(feeSumCents * 12))}/año.`,
            amount_cents: feeSumCents
          });
        }
      }

      // --- DETECTOR 6: Salary Detected -> 50/30/20 Distribution Assistant ---
      const curMk = monthKey(dstr(baseDate));
      const salaryInc = incomes.find(i => (i.cat === 'nomina' || /n[oó]mina|salario/i.test(String(i.source || ''))) && monthKey(i.date) === curMk);
      if (salaryInc) {
        const salCents = getCents(salaryInc);
        const id = `sal503020_${curMk}_${salCents}`;
        if (salCents >= 50000 && !dismissed.has(id)) {
          alerts.push({
            id,
            type: 'salary_503020',
            severity: 'positive',
            icon: 'payments',
            title: `Nómina de ${fmt0(Money.fromCents(salCents))} detectada`,
            body: `Sugerencia 50/30/20: ${fmt0(Money.fromCents(Math.round(salCents * 0.5)))} necesidades · ${fmt0(Money.fromCents(Math.round(salCents * 0.3)))} ocio · ${fmt0(Money.fromCents(Math.round(salCents * 0.2)))} ahorro.`,
            salary_cents: salCents
          });
        }
      }

      // --- DETECTOR 7: Projected Overdraft Warning (Next 7 Days vs Upcoming Recurring) ---
      const todayDay = baseDate.getDate();
      const upcoming7 = recurring.filter(r => {
        const d = Number(r.day || 1);
        const delta = d >= todayDay ? (d - todayDay) : (d + 30 - todayDay);
        return delta >= 0 && delta <= 7 && !recPaidThisMonth(r, curMk);
      });
      const upcoming7Cents = upcoming7.reduce((a, r) => a + Money.toCents(r.amount || 0), 0);
      if (upcoming7Cents > 0) {
        // Use synced bank balance if available, else month balance
        const syncedAccs = (S?.accounts || []).filter(a => !a.archived && typeof a.syncedBalanceCents === 'number');
        const availCents = syncedAccs.length > 0
          ? syncedAccs.reduce((a, x) => a + x.syncedBalanceCents, 0)
          : Money.toCents(monthBalance(curMk));
        if (availCents < upcoming7Cents) {
          const id = `overdraft_${curMk}_${upcoming7Cents}`;
          if (!dismissed.has(id)) {
            alerts.push({
              id,
              type: 'overdraft_risk',
              severity: 'high',
              icon: 'warning',
              title: 'Riesgo de descubierto en los próximos 7 días',
              body: `Llegan ${upcoming7.length} recibo(s) por ${fmt(Money.fromCents(upcoming7Cents))} y tu saldo disponible estimado es ${fmt(Money.fromCents(availCents))}.`,
              upcoming_cents: upcoming7Cents,
              available_cents: availCents
            });
          }
        }
      }

      const order = { high: 0, medium: 1, positive: 2, info: 3 };
      return alerts.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
    }

    function dismissDetectorAlert(alertId) {
      if (!Array.isArray(S.dismissedDetectors)) S.dismissedDetectors = [];
      if (!S.dismissedDetectors.includes(alertId)) S.dismissedDetectors.push(alertId);
      saveLocalState(true);
      renderAllViews();
      showToast('Aviso descartado ✓');
    }

    function acceptDetectedSubscription(alertId, merchant, amountCents, cat, day) {
      if (!Array.isArray(S.recurring)) S.recurring = [];
      S.recurring.push({
        id: uid(),
        name: merchant,
        amount: Money.fromCents(amountCents),
        cat: cat || 'susc',
        day: Math.min(28, Math.max(1, Number(day) || 1)),
        autoCharge: true
      });
      dismissDetectorAlert(alertId);
      showToast(`🔄 ${merchant} añadido a tus suscripciones ✓`);
    }

    function applySalary503020Plan(alertId, salaryCents) {
      const sal = Money.fromCents(salaryCents);
      S.settings.salary = sal;
      S.settings.salaryAuto = true;
      // 50% needs split across hogar/comida/transporte/salud, 30% wants across ocio/compras/susc
      S.budgets = {
        ...S.budgets,
        hogar:      Math.round(sal * 0.25),
        comida:     Math.round(sal * 0.14),
        transporte: Math.round(sal * 0.06),
        salud:      Math.round(sal * 0.05),
        ocio:       Math.round(sal * 0.14),
        compras:    Math.round(sal * 0.10),
        susc:       Math.round(sal * 0.04),
        otros:      Math.round(sal * 0.02)
      };
      dismissDetectorAlert(alertId);
      showToast(`✨ Presupuesto 50/30/20 aplicado sobre ${fmt0(sal)} ✓`);
    }

    /** Compact card for Home when there are pending bank inbox items or high/medium smart detector alerts */
    function renderHomeBankDetectorsCardHtml() {
      const inboxCount = (S?.pendingInbox || []).length;
      const alerts = runSmartFinancialDetectors();
      const topAlert = alerts[0] || null;
      if (inboxCount === 0 && !topAlert) return '';

      const toneCls = topAlert?.severity === 'high'
        ? 'border-l-tertiary bg-tertiary/6'
        : topAlert?.severity === 'medium'
          ? 'border-l-amber-500 bg-amber-500/8'
          : topAlert?.severity === 'positive'
            ? 'border-l-secondary bg-secondary/8'
            : 'border-l-primary bg-primary/5';

      return `
        <section class="bento-card p-4 rounded-3xl border-l-4 ${toneCls} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <span class="w-10 h-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-primary flex items-center justify-center flex-shrink-0">
              ${ico(topAlert ? topAlert.icon : 'account_balance', 'text-[20px]')}
            </span>
            <div class="min-w-0">
              ${topAlert ? `
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-primary">Detector inteligente</span>
                  ${alerts.length > 1 ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">+${alerts.length - 1} más</span>` : ''}
                </div>
                <p class="text-sm font-extrabold text-on-surface leading-snug">${esc(topAlert.title)}</p>
                <p class="text-xs text-on-surface-variant mt-0.5">${esc(topAlert.body)}</p>
              ` : `
                <p class="text-sm font-extrabold text-on-surface">📥 Tienes ${inboxCount} movimiento(s) bancario(s) por clasificar</p>
                <p class="text-xs text-on-surface-variant mt-0.5">Clasifícalos en 1 toque para que la app aprenda tus comercios.</p>
              `}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
            ${inboxCount > 0 ? `
              <button onclick="openPendingInboxModal()" class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale">
                Clasificar (${inboxCount})
              </button>
            ` : ''}
            ${topAlert?.type === 'recurring_candidate' ? `
              <button onclick="acceptDetectedSubscription('${topAlert.id}', '${esc(topAlert.merchant)}', ${topAlert.amount_cents}, '${topAlert.cat}', ${topAlert.day})" class="px-3 py-1.5 rounded-xl bg-secondary text-white text-xs font-extrabold active-scale">Añadir fija</button>
            ` : ''}
            ${topAlert?.type === 'salary_503020' ? `
              <button onclick="applySalary503020Plan('${topAlert.id}', ${topAlert.salary_cents})" class="px-3 py-1.5 rounded-xl bg-secondary text-white text-xs font-extrabold active-scale">Aplicar 50/30/20</button>
            ` : ''}
            ${topAlert ? `
              <button onclick="dismissDetectorAlert('${topAlert.id}')" class="px-2.5 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-bold active-scale">Entendido</button>
            ` : ''}
            <button onclick="switchMainView('ajustes', 'bancos')" class="px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/35 text-on-surface text-xs font-bold active-scale">Ver todo</button>
          </div>
        </section>
      `;
    }
