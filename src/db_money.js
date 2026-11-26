    // ============================================================================
    // 1B. INTEGER-CENTS MONEY ENGINE, MULTICURRENCY, ACCOUNTS & INDEXEDDB LAYER
    // ============================================================================
    const CLARIDAD_IDB_NAME = 'claridad_financiera_db';
    const CLARIDAD_IDB_VERSION = 1;
    let claridadIDB = null;

    // Approximate cached FX rates relative to 1 EUR (base reference for multi-currency conversion)
    const FX_RATES_PER_EUR = {
      EUR: 1.00,   USD: 1.08,   GBP: 0.85,   MXN: 21.50,  COP: 4650,
      ARS: 1080,   CLP: 1030,   PEN: 4.05,   BRL: 6.20,   CHF: 0.94,
      CAD: 1.51,   AUD: 1.66,   JPY: 165.0,  CNY: 7.80,   SEK: 11.50,
      NOK: 11.80,  DKK: 7.46,   PLN: 4.32,   CZK: 25.30,  HUF: 408.0,
      RON: 4.98,   TRY: 37.50,  INR: 91.20,  KRW: 1500,   SGD: 1.45,
      HKD: 8.40,   NZD: 1.82,   ZAR: 19.60,  UYU: 45.20,  CRC: 550.0
    };
    const FX_RATES_UPDATED_DATE = '2026-11-26';

    const ACCOUNT_TYPES = [
      { id: 'banco',     name: 'Cuenta bancaria', icon: 'account_balance',        color: '#4f46e5' },
      { id: 'tarjeta',   name: 'Tarjeta',         icon: 'credit_card',            color: '#0ea5e9' },
      { id: 'efectivo',  name: 'Efectivo',        icon: 'payments',               color: '#059669' },
      { id: 'ahorro',    name: 'Ahorro',          icon: 'savings',                color: '#8b5cf6' },
      { id: 'inversion', name: 'Inversión',       icon: 'trending_up',            color: '#f59e0b' }
    ];

    const Money = {
      /** Convert decimal number or localized string to integer cents (NEVER floats for storage/math) */
      toCents(val) {
        if (typeof val === 'number' && Number.isFinite(val)) {
          return Math.round(val * 100);
        }
        if (typeof val === 'string') {
          let s = val.replace(/[€$£¥₹₩\s]/g, '').trim();
          // Handle European format "1.234,56" vs US format "1,234.56"
          if (/^\-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
            s = s.replace(/\./g, '').replace(',', '.');
          } else if (/^\-?\d+,\d+$/.test(s)) {
            s = s.replace(',', '.');
          } else {
            s = s.replace(/,/g, '');
          }
          const n = parseFloat(s);
          return Number.isFinite(n) ? Math.round(n * 100) : 0;
        }
        return 0;
      },

      /** Convert integer cents to decimal amount (2 decimal places) */
      fromCents(cents) {
        const c = Number.isFinite(Number(cents)) ? Math.round(Number(cents)) : 0;
        return c / 100;
      },

      /** Sum an array of integer cents safely */
      sumCents(arr) {
        return (arr || []).reduce((acc, v) => acc + (Math.round(Number(v)) || 0), 0);
      },

      /**
       * Split totalCents equally among N participants.
       * Remainder cents ALWAYS go deterministically to index 0 (the payer),
       * guaranteeing sum(result) === totalCents with zero floating drift.
       */
      splitEqual(totalCents, count) {
        const total = Math.round(Number(totalCents) || 0);
        const n = Math.max(1, Math.floor(Number(count) || 1));
        const sign = total < 0 ? -1 : 1;
        const absTotal = Math.abs(total);
        const base = Math.floor(absTotal / n);
        const rem = absTotal - base * n;
        const shares = new Array(n).fill(base);
        for (let i = 0; i < rem; i++) {
          shares[i] += 1;
        }
        return shares.map(x => x * sign);
      },

      /** Validate exact split shares sum to totalCents */
      validateExactSplit(totalCents, partsCents) {
        const total = Math.round(Number(totalCents) || 0);
        const sum = Money.sumCents(partsCents);
        return { valid: sum === total, diffCents: total - sum, sumCents: sum };
      },

      /** Convert integer cents between currencies using cached FX table */
      convertCents(amountCents, fromCurrency = 'EUR', toCurrency = 'EUR') {
        const c = Math.round(Number(amountCents) || 0);
        const f = String(fromCurrency || 'EUR').toUpperCase();
        const t = String(toCurrency || 'EUR').toUpperCase();
        if (f === t) return c;
        const rFrom = FX_RATES_PER_EUR[f] || 1;
        const rTo = FX_RATES_PER_EUR[t] || 1;
        return Math.round((c / rFrom) * rTo);
      }
    };

    function getOrCreateDeviceId() {
      let id = localStorage.getItem('claridad_device_id');
      if (!id) {
        id = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        localStorage.setItem('claridad_device_id', id);
      }
      return id;
    }

    function getDeviceLabel() {
      const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
      if (window.__CLARIDAD_IOS_NATIVE__) return 'iPhone App (Claridad)';
      if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad Safari';
      if (/Android/i.test(ua)) return 'Android Browser';
      if (/Mac/i.test(ua)) return 'Mac Browser';
      if (/Win/i.test(ua)) return 'Windows Browser';
      return 'Navegador Web';
    }

    function defaultAccountsList() {
      return [
        { id: 'acc_main', name: 'Cuenta Principal', type: 'banco', initial_cents: 0, color: '#4f46e5', icon: 'account_balance', archived: false },
        { id: 'acc_cash', name: 'Efectivo',         type: 'efectivo', initial_cents: 0, color: '#059669', icon: 'payments', archived: false }
      ];
    }

    function accountById(accId) {
      const list = (S && Array.isArray(S.accounts) && S.accounts.length > 0) ? S.accounts : defaultAccountsList();
      return list.find(a => a.id === accId) || list[0];
    }

    function computeAccountBalanceCents(accId) {
      const acc = accountById(accId);
      if (!acc) return 0;
      if (typeof acc.syncedBalanceCents === 'number') return Math.round(acc.syncedBalanceCents);
      let bal = Math.round(Number(acc.initial_cents || 0));
      const baseCur = S?.settings?.currency || 'EUR';
      (S?.incomes || []).forEach(i => {
        const targetAcc = i.account_id || 'acc_main';
        if (targetAcc === acc.id) {
          bal += (typeof i.amount_base_cents === 'number') ? i.amount_base_cents : Money.toCents(i.amount);
        }
      });
      (S?.expenses || []).forEach(e => {
        const targetAcc = e.account_id || (e.method === 'efectivo' ? 'acc_cash' : 'acc_main');
        if (targetAcc === acc.id) {
          const c = (typeof e.amount_base_cents === 'number') ? e.amount_base_cents : Money.toCents(e.amount);
          bal -= c;
        }
      });
      return bal;
    }

    function enrichTransactionMoney(item, kind = 'exp') {
      if (!item || typeof item !== 'object') return item;
      const baseCur = S?.settings?.currency || 'EUR';
      if (typeof item.amount_cents !== 'number' || !Number.isFinite(item.amount_cents)) {
        item.amount_cents = Money.toCents(item.amount || 0);
      }
      // Keep decimal `amount` strictly synced from integer cents for backward compatibility
      item.amount = Money.fromCents(item.amount_cents);
      if (!item.currency) item.currency = baseCur;
      item.amount_base_cents = Money.convertCents(item.amount_cents, item.currency, baseCur);
      if (!item.fx_date) item.fx_date = FX_RATES_UPDATED_DATE;
      if (!item.account_id) {
        item.account_id = (kind === 'exp' && item.method === 'efectivo') ? 'acc_cash' : 'acc_main';
      }
      if (!item.source) item.source = 'manual';
      if (!item.sync_version) item.sync_version = 1;
      if (!item.device_id) item.device_id = getOrCreateDeviceId();
      return item;
    }

    function logAuditEvent(action, entity, detail = '') {
      if (!S) return;
      if (!Array.isArray(S.auditLog)) S.auditLog = [];
      S.auditLog.unshift({
        id: uid(),
        action,
        entity,
        detail: String(detail || '').slice(0, 140),
        timestamp: Date.now(),
        device_id: getOrCreateDeviceId(),
        device_name: getDeviceLabel()
      });
      if (S.auditLog.length > 120) S.auditLog = S.auditLog.slice(0, 120);
    }

    // ============================================================================
    // 1C. INDEXEDDB OFFLINE-FIRST STORAGE ENGINE (Normalized Stores + Migrations)
    // ============================================================================
    const ClaridadDB = {
      isSupported() {
        return typeof indexedDB !== 'undefined' && indexedDB !== null;
      },

      open() {
        if (claridadIDB) return Promise.resolve(claridadIDB);
        if (!ClaridadDB.isSupported()) return Promise.resolve(null);
        return new Promise((resolve) => {
          try {
            const req = indexedDB.open(CLARIDAD_IDB_NAME, CLARIDAD_IDB_VERSION);
            req.onupgradeneeded = (ev) => {
              const db = ev.target.result;
              const stores = [
                { name: 'profiles',      keyPath: 'profileKey' },
                { name: 'accounts',      keyPath: 'id', idx: ['profileKey'] },
                { name: 'transactions',  keyPath: 'id', idx: ['profileKey', 'date', 'category_id'] },
                { name: 'debts',         keyPath: 'id', idx: ['profileKey', 'status'] },
                { name: 'groups',        keyPath: 'id', idx: ['profileKey'] },
                { name: 'goals',         keyPath: 'id', idx: ['profileKey'] },
                { name: 'sync_queue',    keyPath: 'id', idx: ['created_at'] },
                { name: 'audit_log',     keyPath: 'id', idx: ['timestamp'] }
              ];
              stores.forEach(st => {
                if (!db.objectStoreNames.contains(st.name)) {
                  const os = db.createObjectStore(st.name, { keyPath: st.keyPath });
                  (st.idx || []).forEach(ix => os.createIndex(ix, ix, { unique: false }));
                }
              });
            };
            req.onsuccess = (ev) => {
              claridadIDB = ev.target.result;
              resolve(claridadIDB);
            };
            req.onerror = () => resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      },

      async persistStateSnapshot(profileKey, stateObj) {
        const db = await ClaridadDB.open();
        if (!db || !stateObj) return false;
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(['profiles', 'accounts', 'transactions', 'debts', 'sync_queue', 'audit_log'], 'readwrite');
            tx.objectStore('profiles').put({
              profileKey,
              schema_version: 2,
              updated_at: stateObj.updatedAt || Date.now(),
              snapshot: stateObj
            });

            const accStore = tx.objectStore('accounts');
            (stateObj.accounts || []).forEach(a => accStore.put({ ...a, profileKey }));

            const txStore = tx.objectStore('transactions');
            (stateObj.expenses || []).forEach(e => txStore.put({ ...e, _kind: 'exp', category_id: e.cat, profileKey }));
            (stateObj.incomes || []).forEach(i => txStore.put({ ...i, _kind: 'inc', category_id: i.cat, profileKey }));

            const debtStore = tx.objectStore('debts');
            (stateObj.debts || []).forEach(d => debtStore.put({ ...d, status: d.settled ? 'saldada' : 'pendiente', profileKey }));

            const qStore = tx.objectStore('sync_queue');
            (stateObj.syncQueue || []).forEach(q => qStore.put({ ...q, profileKey }));

            const aStore = tx.objectStore('audit_log');
            (stateObj.auditLog || []).slice(0, 40).forEach(a => aStore.put({ ...a, profileKey }));

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (e) {
            resolve(false);
          }
        });
      },

      async loadStateSnapshot(profileKey) {
        const db = await ClaridadDB.open();
        if (!db) return null;
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(['profiles'], 'readonly');
            const req = tx.objectStore('profiles').get(profileKey);
            req.onsuccess = () => resolve(req.result?.snapshot || null);
            req.onerror = () => resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      },

      async wipeAllLocalDatabases() {
        try {
          if (claridadIDB) {
            claridadIDB.close();
            claridadIDB = null;
          }
          if (ClaridadDB.isSupported()) {
            await new Promise((res) => {
              const del = indexedDB.deleteDatabase(CLARIDAD_IDB_NAME);
              del.onsuccess = del.onerror = del.onblocked = () => res();
            });
          }
        } catch (e) {}
      }
    };

    // ============================================================================
    // 1D. OFFLINE SYNC QUEUE WITH EXPONENTIAL RETRY
    // ============================================================================
    let syncRetryTimer = null;

    function enqueueOfflineSyncOp(operation, entity, rowId, payload) {
      if (!S || !loggedUserId) return;
      if (!Array.isArray(S.syncQueue)) S.syncQueue = [];
      // Deduplicate pending ops for the same entity + rowId
      S.syncQueue = S.syncQueue.filter(q => !(q.entity === entity && q.row_id === rowId));
      S.syncQueue.push({
        id: uid(),
        operation,
        entity,
        row_id: rowId,
        payload,
        attempts: 0,
        created_at: Date.now()
      });
      saveLocalState(false);
      updateCloudHeaderUI();
      scheduleSyncQueueFlush();
    }

    function scheduleSyncQueueFlush() {
      if (!S || !Array.isArray(S.syncQueue) || S.syncQueue.length === 0 || !loggedUserId) return;
      const maxAttempts = S.syncQueue.reduce((m, q) => Math.max(m, q.attempts || 0), 0);
      const delay = Math.min(60000, 2000 * Math.pow(2, Math.min(maxAttempts, 5)));
      clearTimeout(syncRetryTimer);
      syncRetryTimer = setTimeout(() => flushOfflineSyncQueue(), delay);
    }

    async function flushOfflineSyncQueue() {
      if (!S || !Array.isArray(S.syncQueue) || S.syncQueue.length === 0 || !loggedUserId || !supabaseClient) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

      const remaining = [];
      for (const op of S.syncQueue) {
        try {
          if (op.entity === 'expense' && op.operation === 'upsert') {
            await dbUpsertPersonalExpense(op.payload, true);
          } else if (op.entity === 'expense' && op.operation === 'delete') {
            await dbDeletePersonalExpense(op.row_id, true);
          } else if (op.entity === 'income' && op.operation === 'upsert') {
            await dbUpsertPersonalIncome(op.payload, true);
          } else if (op.entity === 'income' && op.operation === 'delete') {
            await dbDeletePersonalIncome(op.row_id, true);
          } else if (op.entity === 'debt' && op.operation === 'upsert') {
            await dbUpsertPersonalDebt(op.payload, true);
          } else if (op.entity === 'debt' && op.operation === 'delete') {
            await dbDeletePersonalDebt(op.row_id, true);
          }
        } catch (err) {
          op.attempts = (op.attempts || 0) + 1;
          remaining.push(op);
        }
      }
      S.syncQueue = remaining;
      saveLocalState(false);
      updateCloudHeaderUI();
      if (remaining.length > 0) scheduleSyncQueueFlush();
    }
