  <script>
    "use strict";

    // ============================================================================
    // 1. SUPABASE CONFIGURATION & LIVE MULTI-USER CLOUD STATE
    // ============================================================================
    const SUPABASE_URL = 'https://gtzupuhyuolmhkfqsmho.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_WA_OFqeRUfItMPYlpkWHwg_Ul0WG3EG';
    const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

    let sbGrupos = [];
    let sbAllGrupos = [];
    let sbGlobalUsers = [];
    let sbUsuariosGrupo = [];
    let sbMovimientos = [];
    let sbAllGroupRelations = [];
    let currentGroupId = localStorage.getItem('last_group_id') || null;
    let loggedUserId = localStorage.getItem('logged_user_id') ? Number(localStorage.getItem('logged_user_id')) : 2;
    let isAdmin = localStorage.getItem('is_admin') !== null ? localStorage.getItem('is_admin') === 'true' : (loggedUserId === 2);
    let sbConnected = false;
    let hasDatosPersonalesColumn = false;
    let cloudSyncTimer = null;

    // ============================================================================
    // 2. PERSONAL FINANCE STATE & CATEGORIES (Per-User Isolated State)
    // ============================================================================
    const LEGACY_LSKEY = "bolsillo_v1";
    const userStorageKey = (uidNum) => `claridad_user_${uidNum || 'guest'}`;

    let S = null;
    let viewMk = null;
    let activeMainView = "inicio"; // 'inicio' (Mensual) | 'gastos' (Movimientos) | 'cuentas' (Deudas) | 'analitica' | 'ajustes'
    let activeP2PTab = "owed";     // 'owed' (Me deben) | 'owe' (Debo) | 'cloud' (Grupos Cloud) | 'split' (Reparto Tricount)
    let activeAjustesSub = null;
    let movFilter = { q: "", type: "all", cat: "", tag: "", method: "" };

    const CATS = [
      { id: "hogar",      name: "Vivienda & Hogar", c: "#4f46e5", icon: "home",            bg: "bg-indigo-500/15", text: "text-indigo-600 dark:text-indigo-400" },
      { id: "comida",     name: "Alimentación",     c: "#006c4a", icon: "shopping_cart",   bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
      { id: "ocio",       name: "Ocio & Restaur.",  c: "#f59e0b", icon: "restaurant",      bg: "bg-amber-500/15",  text: "text-amber-600 dark:text-amber-400" },
      { id: "transporte", name: "Transporte",       c: "#0ea5e9", icon: "train",           bg: "bg-sky-500/15",    text: "text-sky-600 dark:text-sky-400" },
      { id: "compras",    name: "Compras",          c: "#ec4899", icon: "shopping_bag",    bg: "bg-pink-500/15",   text: "text-pink-600 dark:text-pink-400" },
      { id: "susc",       name: "Suscripciones",    c: "#8b5cf6", icon: "autorenew",       bg: "bg-violet-500/15", text: "text-violet-600 dark:text-violet-400" },
      { id: "salud",      name: "Salud & Deporte",  c: "#e11d48", icon: "favorite",        bg: "bg-rose-500/15",   text: "text-rose-600 dark:text-rose-400" },
      { id: "viajes",     name: "Viajes",           c: "#14b8a6", icon: "flight_takeoff",  bg: "bg-teal-500/15",   text: "text-teal-600 dark:text-teal-400" },
      { id: "otros",      name: "Otros gastos",     c: "#64748b", icon: "category",        bg: "bg-slate-500/15",  text: "text-slate-600 dark:text-slate-400" }
    ];

    const INCS = [
      { id: "nomina",    name: "Nómina",      icon: "payments" },
      { id: "freelance", name: "Freelance",   icon: "bolt" },
      { id: "bizum",     name: "Bizum / P2P", icon: "send_to_mobile" },
      { id: "ventas",    name: "Ventas",      icon: "storefront" },
      { id: "extra",     name: "Extra",       icon: "redeem" },
      { id: "otros",     name: "Otros",       icon: "account_balance_wallet" }
    ];

    const PAY_METHODS = [
      { id: "tarjeta",       name: "Tarjeta débito", icon: "credit_card" },
      { id: "bizum",         name: "Bizum",          icon: "send_to_mobile" },
      { id: "domiciliacion", name: "Domiciliación",  icon: "account_balance" },
      { id: "efectivo",      name: "Efectivo",       icon: "payments" },
      { id: "applepay",      name: "Apple Pay",      icon: "contactless" }
    ];

    const NEEDS = ["comida", "transporte", "hogar", "salud"];
    const WANTS = ["ocio", "compras", "viajes", "susc"];
    const ICONPICK = ["restaurant", "shopping_cart", "train", "sports_esports", "shopping_bag", "home", "favorite", "flight_takeoff", "category", "music_note", "fitness_center", "menu_book", "directions_car", "redeem", "pets", "bolt"];
    const COLORPICK = ["#4f46e5", "#006c4a", "#f59e0b", "#0ea5e9", "#ec4899", "#8b5cf6", "#e11d48", "#14b8a6", "#64748b", "#84cc16", "#f97316"];

    // ============================================================================
    // 3. HELPER & FORMATTING FUNCTIONS
    // ============================================================================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const uid = () => Math.random().toString(36).slice(2, 10);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const dstr = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const todayStr = () => dstr(new Date());
    const monthKey = (ds) => String(ds || todayStr()).slice(0, 7);

    function fmt(n) {
      const val = Number(n) || 0;
      return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    }
    function fmt0(n) {
      const val = Number(n) || 0;
      return Math.round(val).toLocaleString('es-ES') + ' €';
    }
    function fmtSigned(n) {
      const val = Number(n) || 0;
      return (val > 0 ? '+' : val < 0 ? '−' : '') + fmt(Math.abs(val));
    }
    function fmtDay(ds) {
      const d = new Date(ds + 'T12:00:00');
      return isNaN(d) ? ds : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
    function monthLabel(mk) {
      const p = String(mk || monthKey(todayStr())).split('-');
      return new Date(+p[0], +p[1] - 1, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    }
    function parseAmount(str) {
      if (str === null || str === undefined) return 0;
      let s = String(str).toLowerCase().replace(/€|euros?/g, '').trim().replace(',', '.');
      const m = s.match(/(\d+(?:\.\d+)?)/);
      return m ? parseFloat(m[1]) : 0;
    }
    function initials(name) {
      const parts = String(name || 'U').trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return String(name || 'U').slice(0, 2).toUpperCase();
    }
    function currentLoggedUserName() {
      const u = sbGlobalUsers.find(x => Number(x.id) === Number(loggedUserId));
      return u ? u.nombre : (loggedUserId === 2 ? "Hugo" : "Invitado");
    }
    function allCats() {
      return CATS.concat((S && Array.isArray(S.customCats)) ? S.customCats.map(c => ({
        ...c,
        icon: ICONPICK.includes(c.icon) ? c.icon : "category"
      })) : []);
    }
    function catById(id) {
      return allCats().find(c => c.id === id) || CATS[8];
    }
    function incById(id) {
      return INCS.find(c => c.id === id) || INCS[5];
    }
    function methodById(id) {
      return PAY_METHODS.find(m => m.id === id) || PAY_METHODS[0];
    }
    function tagsOf(note) {
      const m = String(note || '').match(/#[\p{L}\d_]+/gu);
      return m || [];
    }
    function cleanNoteText(note, fallback = "") {
      return String(note || '').replace(/#[\p{L}\d_]+/gu, '').trim() || fallback;
    }

    // ============================================================================
    // 4. PERSONAL FINANCE CALCULATIONS (Control Mensual Engine)
    // ============================================================================
    function sumExp(list) {
      return (list || []).reduce((a, e) => a + (Number(e.amount) || 0), 0);
    }
    function byCat(list) {
      const m = {};
      (list || []).forEach(e => { m[e.cat] = (m[e.cat] || 0) + (Number(e.amount) || 0); });
      return Object.entries(m).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total);
    }
    function monthExpenses(mk) {
      return (S.expenses || []).filter(e => monthKey(e.date) === mk);
    }
    function monthIncomes(mk) {
      return (S.incomes || []).filter(i => monthKey(i.date) === mk);
    }
    function salaryFor(mk) {
      if (!S.settings.salaryAuto || !(S.settings.salary > 0)) return null;
      if (S.startMk && mk < S.startMk) return null;
      return {
        id: 'salary-auto',
        amount: Number(S.settings.salary),
        cat: 'nomina',
        source: 'Nómina mensual',
        date: mk + '-' + String(Math.min(S.settings.salaryDay || 1, 28)).padStart(2, '0'),
        auto: true
      };
    }
    function incomeRows(mk) {
      const rows = monthIncomes(mk).map(i => ({ ...i, auto: false }));
      const sal = salaryFor(mk);
      if (sal && sal.amount > 0) rows.push(sal);
      return rows.sort((a, b) => b.date.localeCompare(a.date));
    }
    function monthIncomeTotal(mk) {
      return incomeRows(mk).reduce((a, i) => a + (Number(i.amount) || 0), 0);
    }
    function monthBalance(mk) {
      return monthIncomeTotal(mk) - sumExp(monthExpenses(mk));
    }
    function recPaidThisMonth(r, mk) {
      const nm = String(r.name || '').toLowerCase();
      return monthExpenses(mk).some(e => String(e.note || '').toLowerCase().includes(nm));
    }
    function upcomingRecurring(mk) {
      const isCur = mk === monthKey(todayStr());
      const today = new Date().getDate();
      return (S.recurring || []).filter(r => !recPaidThisMonth(r, mk) && (!isCur || r.day == null || r.day >= today));
    }
    function upcomingRecurringTotal(mk) {
      return upcomingRecurring(mk).reduce((a, r) => a + (Number(r.amount) || 0), 0);
    }
    function goalsReserve() {
      return (S.goals || []).reduce((a, g) => a + Math.max(0, (g.target - g.saved)) / 6, 0);
    }
    function safeToSpend(mk) {
      return monthIncomeTotal(mk) - sumExp(monthExpenses(mk)) - upcomingRecurringTotal(mk) - goalsReserve();
    }
    function currentStreak() {
      let d = new Date(), n = 0, guard = 0;
      const hasExp = ds => (S.expenses || []).some(e => e.date === ds);
      while (!hasExp(dstr(d)) && guard < 365) {
        n++;
        d = new Date(d.getTime() - 864e5);
        guard++;
      }
      return n;
    }
    function ensureCarried() {
      const cur = monthKey(todayStr());
      if (S.carriedMk === cur) return;
      const pd = new Date();
      pd.setMonth(pd.getMonth() - 1);
      const pmk = pd.getFullYear() + "-" + String(pd.getMonth() + 1).padStart(2, "0");
      const spent = {};
      monthExpenses(pmk).forEach(e => spent[e.cat] = (spent[e.cat] || 0) + e.amount);
      S.carried = {};
      Object.keys(S.rollover || {}).forEach(cat => {
        if (S.rollover[cat]) S.carried[cat] = Math.round(((S.budgets[cat] || 0) - (spent[cat] || 0)) * 100) / 100;
      });
      S.carriedMk = cur;
      saveLocalState(false);
    }
    function effBudget(cat) {
      return (S.budgets[cat] || 0) + (S.carried[cat] || 0);
    }
    function totalMonthlyBudget() {
      const sumB = Object.keys(S.budgets || {}).reduce((acc, k) => acc + Math.max(0, effBudget(k)), 0);
      return sumB > 0 ? sumB : (S.settings.salary || 0);
    }
    function applyRule(note) {
      const n = String(note || '').toLowerCase();
      const r = (S.rules || []).find(r => n.includes(String(r.match || '').toLowerCase()));
      return r ? r.cat : null;
    }
    function finScore(mk) {
      const exps = monthExpenses(mk), total = sumExp(exps), inc = monthIncomeTotal(mk);
      const sr = inc > 0 ? (inc - total) / inc : 0;
      let sc = 0;
      const tips = [];
      const sPts = sr >= 0.2 ? 40 : sr >= 0.1 ? 25 : sr >= 0 ? 12 : 0;
      sc += sPts;
      if (sPts < 40) tips.push(sr < 0 ? "Gastas más de lo que ingresas este mes." : "Sube tu ahorro al 20% para sumar hasta 40 pts.");
      const bcats = Object.keys(S.budgets || {}).filter(c => (S.budgets[c] || 0) > 0);
      let bPts = 15;
      if (bcats.length) {
        const ok = bcats.filter(c => (byCat(exps).find(d => d.cat === c) || { total: 0 }).total <= effBudget(c)).length;
        bPts = Math.round(25 * ok / bcats.length);
        if (ok < bcats.length) tips.push(`Mantén todas las categorías dentro de su límite (+${25 - bPts} pts).`);
      }
      sc += bPts;
      const st = currentStreak(), stPts = Math.min(10, st);
      sc += stPts;
      if (stPts < 10) tips.push("Encadena días sin gastar (+1 pt por día).");
      const emg = (S.goals || []).find(g => /emergencia|colch[oó]n|fondo/i.test(g.name));
      let ePts = 0;
      if (emg && emg.target > 0) {
        ePts = Math.round(15 * Math.min(1, emg.saved / emg.target));
        if (ePts < 15) tips.push("Sigue aportando a tu fondo de emergencia (+15 pts).");
      } else {
        tips.push("Crea un objetivo 'Fondo de emergencia' (+15 pts).");
      }
      sc += ePts;
      const p2p = computeP2PMetrics();
      const dPts = p2p.totalQueDebo > 0 ? 0 : 10;
      sc += dPts;
      if (!dPts) tips.push("Salda tus deudas pendientes en el apartado Deudas (+10 pts).");
      return { score: Math.min(100, Math.round(sc)), tips: tips.slice(0, 3) };
    }
    function forecast(mk) {
      const [Y, M] = mk.split("-").map(Number);
      const isCur = mk === monthKey(todayStr());
      const dim = new Date(Y, M, 0).getDate();
      const startDay = isCur ? new Date().getDate() : dim;
      const inc = monthIncomeTotal(mk), spent = sumExp(monthExpenses(mk));
      const daysElapsed = isCur ? Math.max(1, new Date().getDate()) : dim;
      const avg = spent / daysElapsed;
      const up = upcomingRecurring(mk);
      const vals = [];
      let v = inc - spent;
      for (let d = startDay; d <= dim; d++) {
        v -= avg;
        up.forEach(r => { if (r.day === d) v -= r.amount; });
        vals.push(Math.round(v * 100) / 100);
      }
      return { vals: vals.length ? vals : [inc - spent], end: vals.length ? vals[vals.length - 1] : inc - spent, avg };
    }

    // ============================================================================
    // 5. MULTI-USER DEBT ENGINE (Personalized per loggedUserId)
    // ============================================================================
    function computeP2PMetrics() {
      // 1. Personal P2P debts saved in this user's personal profile
      const activeLocal = (S.debts || []).filter(d => !d.settled && d.amount > 0);
      const localOwed = activeLocal.filter(d => d.type === 'owed');
      const localOwe = activeLocal.filter(d => d.type === 'owe');
      const localOwedSum = localOwed.reduce((a, d) => a + Number(d.amount || 0), 0);
      const localOweSum = localOwe.reduce((a, d) => a + Number(d.amount || 0), 0);

      // 2. Supabase Cloud group debts FROM THE PERSPECTIVE OF THE LOGGED-IN USER
      // - If loggedUserId is the Admin of a group (or Hugo on General/Deudas/Fantasy), members with deuda > 0 OWE THIS USER (cloudOwedItems).
      // - If loggedUserId is a member with deuda > 0 in a group, THIS USER OWES that group's admin/pot (cloudOweItems).
      const cloudOwedItems = [];
      const cloudOweItems = [];
      const activeUid = Number(loggedUserId || 0);

      sbAllGroupRelations.forEach(rel => {
        const d = parseFloat(rel.deuda || 0);
        if (d <= 0.005) return;
        const grp = sbAllGrupos.find(g => Number(g.id) === Number(rel.grupo_id));
        if (!grp) return;
        const memberUser = sbGlobalUsers.find(u => Number(u.id) === Number(rel.usuario_id));
        const memberName = memberUser ? memberUser.nombre : `Usuario #${rel.usuario_id}`;
        const groupAdminId = grp.admin_id ? Number(grp.admin_id) : 2; // General defaults to Hugo (ID 2)
        const adminUser = sbGlobalUsers.find(u => Number(u.id) === groupAdminId);
        const adminName = adminUser ? adminUser.nombre : "Hugo";
        const isFantasy = grp.nombre.toLowerCase().includes('fantasy');

        if (Number(rel.usuario_id) === activeUid) {
          // It's the logged-in user's own debt row in a group!
          cloudOweItems.push({
            relacion_id: rel.id,
            grupo_id: grp.id,
            grupo_nombre: grp.nombre,
            usuario_id: activeUid,
            usuario_nombre: memberName,
            acreedor_nombre: isFantasy ? `Bote ${grp.nombre}` : adminName,
            deuda: d
          });
        } else if (groupAdminId === activeUid || (isAdmin && activeUid === 2)) {
          // Another member owes money in a group managed by the logged-in user!
          cloudOwedItems.push({
            relacion_id: rel.id,
            grupo_id: grp.id,
            grupo_nombre: grp.nombre,
            usuario_id: rel.usuario_id,
            usuario_nombre: memberName,
            deuda: d
          });
        }
      });

      const cloudOwedSum = cloudOwedItems.reduce((a, x) => a + x.deuda, 0);
      const cloudOweSum = cloudOweItems.reduce((a, x) => a + x.deuda, 0);

      const totalMeDeben = cloudOwedSum + localOwedSum;
      const countMeDeben = cloudOwedItems.length + localOwed.length;
      const totalQueDebo = cloudOweSum + localOweSum;
      const countQueDebo = cloudOweItems.length + localOwe.length;
      const balanceNeto = totalMeDeben - totalQueDebo;

      return {
        totalMeDeben,
        countMeDeben,
        cloudOwedSum,
        cloudOwedCount: cloudOwedItems.length,
        cloudOwedItems,
        localOwedSum,
        localOwedCount: localOwed.length,
        localOwed,
        totalQueDebo,
        countQueDebo,
        cloudOweSum,
        cloudOweCount: cloudOweItems.length,
        cloudOweItems,
        localOweSum,
        localOweCount: localOwe.length,
        localOwe,
        balanceNeto
      };
    }

    // ============================================================================
    // 6. PER-USER STATE MANAGEMENT & SUPABASE CLOUD SYNC
    // ============================================================================
    function blankState(defaultSalary = 0) {
      return {
        expenses: [],
        incomes: [],
        budgets: { hogar: 450, comida: 300, ocio: 180, transporte: 150, compras: 150, susc: 50, salud: 80, otros: 80 },
        rollover: { comida: true, ocio: true },
        carried: {},
        carriedMk: "",
        recurring: [],
        debts: [],
        groups: [],
        trips: [],
        goals: [],
        rules: [
          { id: uid(), match: "mercadona", cat: "comida" },
          { id: uid(), match: "spotify", cat: "susc" },
          { id: uid(), match: "repsol", cat: "transporte" }
        ],
        streak: { best: 0 },
        customCats: [],
        settings: { salary: defaultSalary, salaryDay: 1, salaryAuto: defaultSalary > 0, dark: false, bizumPhone: "" },
        seeded: true,
        startMk: monthKey(todayStr()),
        updatedAt: Date.now()
      };
    }

    function normalizeStateObject(obj) {
      if (!obj || typeof obj !== 'object') obj = blankState(0);
      if (!Array.isArray(obj.expenses)) obj.expenses = [];
      if (!Array.isArray(obj.incomes)) obj.incomes = [];
      if (!Array.isArray(obj.goals)) obj.goals = [];
      if (!Array.isArray(obj.groups)) obj.groups = [];
      if (!Array.isArray(obj.rules)) obj.rules = [];
      if (!Array.isArray(obj.customCats)) obj.customCats = [];
      if (!Array.isArray(obj.debts)) obj.debts = [];
      if (!Array.isArray(obj.recurring)) obj.recurring = [];
      if (!Array.isArray(obj.trips)) obj.trips = [];
      if (!obj.budgets) obj.budgets = { hogar: 450, comida: 300, ocio: 180, transporte: 150, compras: 150, otros: 80 };
      if (!obj.rollover) obj.rollover = {};
      if (!obj.carried) obj.carried = {};
      if (!obj.streak || typeof obj.streak !== "object") obj.streak = { best: 0 };
      if (!obj.settings || typeof obj.settings !== "object") obj.settings = { salary: 0, salaryDay: 1, salaryAuto: false, dark: false };
      if (typeof obj.settings.salary !== "number") obj.settings.salary = 0;
      if (typeof obj.settings.salaryDay !== "number") obj.settings.salaryDay = 1;
      if (typeof obj.settings.salaryAuto !== "boolean") obj.settings.salaryAuto = obj.settings.salary > 0;
      obj.debts.forEach(d => {
        if (!Array.isArray(d.log)) d.log = [];
        if (typeof d.settled !== "boolean") d.settled = false;
      });
      obj.expenses.forEach(e => {
        if (!e.method) e.method = "tarjeta";
        if (typeof e.refund !== "boolean") e.refund = false;
      });
      return obj;
    }

    function saveLocalState(syncCloud = true) {
      if (!S) return;
      S.updatedAt = Date.now();
      const key = userStorageKey(loggedUserId);
      localStorage.setItem(key, JSON.stringify(S));
      if (Number(loggedUserId) === 2) {
        localStorage.setItem(LEGACY_LSKEY, JSON.stringify(S));
      }
      if (syncCloud && loggedUserId) {
        clearTimeout(cloudSyncTimer);
        cloudSyncTimer = setTimeout(() => {
          syncUserPersonalDataToCloud();
        }, 450);
      }
    }

    function loadLocalStateForCurrentUser() {
      const key = userStorageKey(loggedUserId);
      let loaded = null;
      try {
        loaded = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        loaded = null;
      }

      // If Hugo (ID 2) doesn't have `claridad_user_2` yet, check legacy `bolsillo_v1` or seed Hugo's data
      if (!loaded && Number(loggedUserId) === 2) {
        try {
          loaded = JSON.parse(localStorage.getItem(LEGACY_LSKEY));
        } catch (e) {
          loaded = null;
        }
        if (!loaded || !loaded.seeded) {
          loaded = blankState(1800);
          S = loaded;
          seedInitialData();
        }
      }

      // For any other user (e.g. Ivan, Lucia, Ximo, new user), start with a clean personal profile
      if (!loaded) {
        loaded = blankState(0);
      }

      S = normalizeStateObject(loaded);
      localStorage.setItem(key, JSON.stringify(S));
    }

    // Cloud Sync of per-user personal state (`Control Mensual` + personal `Deudas`) in Supabase
    async function loadUserPersonalDataFromCloud(uidNum) {
      if (!supabaseClient || !uidNum) return;
      try {
        // 1. Check if `datos_personales` column exists on `usuarios`
        const userRow = sbGlobalUsers.find(u => Number(u.id) === Number(uidNum));
        if (userRow && userRow.datos_personales && typeof userRow.datos_personales === 'object' && Object.keys(userRow.datos_personales).length > 0) {
          hasDatosPersonalesColumn = true;
          const cloudState = userRow.datos_personales;
          if (!S || (cloudState.updatedAt || 0) >= (S.updatedAt || 0) || (S.expenses.length === 0 && (cloudState.expenses || []).length > 0)) {
            S = normalizeStateObject(cloudState);
            localStorage.setItem(userStorageKey(uidNum), JSON.stringify(S));
          }
          return;
        }

        // 2. Fallback / Zero-Config table storage in `movimientos` (tipo = 'sync_bolsillo', grupo_id = null)
        const { data: syncRows, error } = await supabaseClient
          .from('movimientos')
          .select('id, concepto, created_at')
          .eq('usuario_id', uidNum)
          .eq('tipo', 'sync_bolsillo')
          .is('grupo_id', null)
          .order('id', { ascending: false })
          .limit(1);

        if (!error && syncRows && syncRows.length > 0) {
          const parsed = JSON.parse(syncRows[0].concepto || '{}');
          if (parsed && typeof parsed === 'object') {
            const localEmpty = (S.expenses || []).length === 0 && (S.debts || []).length === 0 && (S.incomes || []).length === 0;
            if (localEmpty || (parsed.updatedAt || 0) >= (S.updatedAt || 0)) {
              S = normalizeStateObject(parsed);
              localStorage.setItem(userStorageKey(uidNum), JSON.stringify(S));
            }
          }
        } else if ((S.expenses || []).length > 0 || (S.debts || []).length > 0) {
          // First time syncing this user's local data up to Supabase
          await syncUserPersonalDataToCloud();
        }
      } catch (e) {
        console.warn("Cloud user state load warning:", e);
      }
    }

    async function syncUserPersonalDataToCloud() {
      if (!supabaseClient || !loggedUserId || !S) return;
      try {
        const serialized = JSON.stringify(S);

        // If `datos_personales` column exists on `usuarios`, update it directly
        if (hasDatosPersonalesColumn) {
          await supabaseClient.from('usuarios').update({ datos_personales: S }).eq('id', loggedUserId);
        }

        // Also persist in `movimientos` (tipo = 'sync_bolsillo', grupo_id = null) so it works immediately even without DDL
        const { data: existing } = await supabaseClient
          .from('movimientos')
          .select('id')
          .eq('usuario_id', loggedUserId)
          .eq('tipo', 'sync_bolsillo')
          .is('grupo_id', null)
          .order('id', { ascending: false });

        if (existing && existing.length > 0) {
          await supabaseClient
            .from('movimientos')
            .update({ concepto: serialized, monto: S.settings?.salary || 0, estado: 'sync' })
            .eq('id', existing[0].id);
          // Clean up any older duplicate sync rows
          if (existing.length > 1) {
            const oldIds = existing.slice(1).map(r => r.id);
            await supabaseClient.from('movimientos').delete().in('id', oldIds);
          }
        } else {
          await supabaseClient.from('movimientos').insert([{
            usuario_id: loggedUserId,
            tipo: 'sync_bolsillo',
            monto: S.settings?.salary || 0,
            concepto: serialized,
            estado: 'sync',
            categoria: 'Sistema',
            grupo_id: null
          }]);
        }
      } catch (e) {
        console.warn("Cloud sync warning:", e);
      }
    }

    async function ingestPendingApplePayQueueFromCloud(uidNum) {
      if (!supabaseClient || !uidNum || !S) return;
      try {
        const { data: queueRows, error } = await supabaseClient
          .from('movimientos')
          .select('id, monto, concepto, categoria, created_at')
          .eq('usuario_id', uidNum)
          .eq('tipo', 'applepay_queue')
          .is('grupo_id', null)
          .order('id', { ascending: true });

        if (!error && queueRows && queueRows.length > 0) {
          let addedCount = 0;
          queueRows.forEach(row => {
            const amt = parseAmount(row.monto);
            if (!(amt > 0)) return;
            const note = String(row.concepto || 'Apple Pay').trim().slice(0, 80);
            const dt = row.created_at ? row.created_at.slice(0, 10) : todayStr();
            let cat = applyRule(note) || String(row.categoria || '').toLowerCase();
            if (!allCats().some(c => c.id === cat)) {
              cat = (typeof guessCatFromMerchant === 'function') ? guessCatFromMerchant(note) : 'otros';
            }
            S.expenses.push({
              id: uid(),
              amount: Math.round(amt * 100) / 100,
              cat,
              method: 'applepay',
              note,
              date: dt,
              tripId: '',
              refund: false,
              ts: Date.now()
            });
            addedCount++;
          });

          const qIds = queueRows.map(r => r.id);
          await supabaseClient.from('movimientos').delete().in('id', qIds);
          if (addedCount > 0) {
            saveLocalState(false);
            await syncUserPersonalDataToCloud();
            showToast(` Pay: ${addedCount} pago(s) sumado(s) automáticamente ✓`);
          }
        }
      } catch (e) {
        console.warn("Apple Pay queue ingest warning:", e);
      }
    }

    function seedInitialData() {
      const now = new Date();
      const mk = monthKey(todayStr());
      S.settings.salary = 1800;
      S.settings.salaryAuto = true;
      S.budgets = { hogar: 450, comida: 320, ocio: 200, transporte: 180, compras: 180, susc: 60, salud: 90, otros: 100 };
      S.expenses = [
        { id: uid(), amount: 450.00, cat: "hogar",      note: "Alquiler y suministros #piso", date: mk + "-02", method: "domiciliacion", tripId: "", refund: false },
        { id: uid(), amount: 74.20,  cat: "comida",     note: "Mercadona Supermercado #compra", date: mk + "-05", method: "tarjeta", tripId: "", refund: false },
        { id: uid(), amount: 54.60,  cat: "transporte", note: "Abono Transporte Metro", date: mk + "-07", method: "domiciliacion", tripId: "", refund: false },
        { id: uid(), amount: 42.50,  cat: "ocio",       note: "Restaurante La Tagliatella #cena", date: mk + "-10", method: "efectivo", tripId: "", refund: false },
        { id: uid(), amount: 68.40,  cat: "comida",     note: "Carrefour Market #semanal", date: mk + "-12", method: "applepay", tripId: "", refund: false },
        { id: uid(), amount: 48.00,  cat: "transporte", note: "Gasolina Repsol #coche", date: mk + "-14", method: "tarjeta", tripId: "", refund: false },
        { id: uid(), amount: 34.90,  cat: "compras",    note: "Zara Camisa (devolución) #ropa", date: mk + "-15", method: "tarjeta", tripId: "", refund: true },
        { id: uid(), amount: 21.00,  cat: "susc",       note: "Spotify Familiar #musica", date: mk + "-16", method: "domiciliacion", tripId: "", refund: false }
      ];
      for (let m = 1; m <= 3; m++) {
        const d0 = new Date(now.getFullYear(), now.getMonth() - m, 10);
        const pmk = dstr(d0).slice(0, 7);
        S.expenses.push(
          { id: uid(), amount: 450, cat: "hogar", note: "Alquiler y facturas", date: pmk + "-02", method: "domiciliacion", tripId: "", refund: false },
          { id: uid(), amount: 260 + m * 15, cat: "comida", note: "Supermercado Mercadona", date: pmk + "-09", method: "tarjeta", tripId: "", refund: false },
          { id: uid(), amount: 140 + m * 10, cat: "ocio", note: "Cenas y salidas #amigos", date: pmk + "-18", method: "bizum", tripId: "", refund: false },
          { id: uid(), amount: 110, cat: "transporte", note: "Gasolina y Metro", date: pmk + "-22", method: "tarjeta", tripId: "", refund: false }
        );
        S.incomes.push(
          { id: uid(), amount: 180, cat: "freelance", source: "Proyecto extra", note: "", date: pmk + "-15" }
        );
      }
      S.recurring = [
        { id: uid(), name: "Spotify Familiar", amount: 21.00, cat: "susc", day: 30 },
        { id: uid(), name: "Netflix",          amount: 13.99, cat: "susc", day: 7 },
        { id: uid(), name: "Gimnasio",         amount: 35.00, cat: "salud", day: 1 },
        { id: uid(), name: "iCloud+ 200GB",    amount: 2.99,  cat: "susc", day: 20 }
      ];
      S.debts = [
        { id: uid(), person: "Carlos Mendoza", amount: 240.00, initialAmount: 240.00, type: "owed", note: "Viaje a Valencia (Gasolina + Alojamiento)", due: mk + "-25", settled: false, log: [{ d: mk + "-12", a: 240, k: "add", n: "Viaje Valencia" }] },
        { id: uid(), person: "Sofía Herrera",  amount: 35.00,  initialAmount: 100.00, type: "owed", note: "Cena cumpleaños", due: mk + "-20", settled: false, log: [{ d: mk + "-01", a: 100, k: "add", n: "Cena" }, { d: mk + "-08", a: 65, k: "pay", n: "Abono Bizum" }] },
        { id: uid(), person: "Javier Ruiz",    amount: 120.00, initialAmount: 120.00, type: "owed", note: "Entrada concierto Rock", due: "2026-09-15", settled: false, log: [{ d: "2026-09-01", a: 120, k: "add", n: "Entrada" }] },
        { id: uid(), person: "Laura Gómez",    amount: 45.00,  initialAmount: 45.00,  type: "owe",  note: "Regalo conjunto cumpleaños", due: mk + "-28", settled: false, log: [{ d: mk + "-10", a: 45, k: "add", n: "Regalo" }] },
        { id: uid(), person: "Marcos Vidal",   amount: 28.50,  initialAmount: 28.50,  type: "owe",  note: "Pista de pádel y bolas", due: mk + "-22", settled: false, log: [{ d: mk + "-11", a: 28.5, k: "add", n: "Pádel" }] }
      ];
      S.trips = [
        { id: uid(), name: "Escapada Lisboa", budget: 600, start: "2026-11-06", end: "2026-11-09" }
      ];
      S.expenses.push({ id: uid(), amount: 89.00, cat: "viajes", note: "Vuelo ida Lisboa", date: mk + "-06", method: "tarjeta", tripId: S.trips[0].id, refund: false });
      S.goals = [
        { id: uid(), name: "Fondo de emergencia", target: 2000, saved: 850, deadline: "2027-06-01", color: "#006c4a" },
        { id: uid(), name: "Viaje a Japón",       target: 2500, saved: 620, deadline: "2027-10-01", color: "#4f46e5" }
      ];
      S.groups = [
        {
          id: uid(),
          name: "Viaje Valencia Amigos",
          members: ["Hugo", "Carlos", "Sofía", "Javi"],
          items: [
            { id: uid(), desc: "Alojamiento Airbnb", amount: 320, payer: "Hugo", date: mk + "-10", for: ["Hugo", "Carlos", "Sofía", "Javi"] },
            { id: uid(), desc: "Compra Supermercado", amount: 84, payer: "Sofía", date: mk + "-11", for: ["Hugo", "Carlos", "Sofía", "Javi"] },
            { id: uid(), desc: "Gasolina Peajes", amount: 68, payer: "Carlos", date: mk + "-12", for: ["Hugo", "Carlos", "Sofía", "Javi"] }
          ]
        }
      ];
    }

    // ============================================================================
    // 7. SUPABASE CLOUD SYNC & OPERATIONS
    // ============================================================================
    async function cargarDatosSupabase(showToastOnSuccess = false) {
      if (!supabaseClient) return;
      const syncIcon = $('#sync-icon');
      if (syncIcon) syncIcon.classList.add('animate-spin');

      try {
        const resGrupos = await supabaseClient.from('grupos').select('*').order('id', { ascending: true });
        if (resGrupos.error) throw resGrupos.error;
        sbAllGrupos = resGrupos.data || [];
        if (sbAllGrupos.length > 0) window.generalGroupId = sbAllGrupos[0].id;

        const resUsers = await supabaseClient.from('usuarios').select('*').order('id', { ascending: true });
        if (resUsers.error) throw resUsers.error;
        sbGlobalUsers = resUsers.data || [];
        if (sbGlobalUsers.length > 0 && 'datos_personales' in sbGlobalUsers[0]) {
          hasDatosPersonalesColumn = true;
        }

        const resAllRels = await supabaseClient.from('grupo_usuarios').select('*');
        sbAllGroupRelations = resAllRels.data || [];

        // Load or sync the currently logged-in user's personal profile from Supabase
        if (loggedUserId) {
          await loadUserPersonalDataFromCloud(loggedUserId);
          await ingestPendingApplePayQueueFromCloud(loggedUserId);
        }
        if (typeof applyPendingApplePayShortcutIfAny === 'function') {
          await applyPendingApplePayShortcutIfAny();
        }

        // Filter visible groups for this user
        if (isAdmin) {
          sbGrupos = sbAllGrupos;
        } else if (loggedUserId) {
          const misGruposIds = sbAllGroupRelations.filter(r => Number(r.usuario_id) === Number(loggedUserId)).map(r => r.grupo_id);
          sbGrupos = sbAllGrupos.filter(g => Number(g.admin_id) === Number(loggedUserId) || misGruposIds.includes(g.id));
          if (sbGrupos.length === 0 && sbAllGrupos.length > 0) sbGrupos = [sbAllGrupos[0]];
        } else {
          sbGrupos = sbAllGrupos.length > 0 ? [sbAllGrupos[0]] : [];
        }

        if (sbGrupos.length > 0) {
          if (!currentGroupId || !sbGrupos.some(g => String(g.id) === String(currentGroupId))) {
            currentGroupId = sbGrupos[0].id;
          }
          localStorage.setItem('last_group_id', currentGroupId);

          const relsGrupo = sbAllGroupRelations.filter(r => String(r.grupo_id) === String(currentGroupId));
          sbUsuariosGrupo = relsGrupo.map(rel => {
            const gu = sbGlobalUsers.find(u => Number(u.id) === Number(rel.usuario_id));
            return gu ? { ...gu, relacion_id: rel.id, deuda: parseFloat(rel.deuda || 0) } : null;
          }).filter(Boolean);

          const resMovs = await supabaseClient
            .from('movimientos')
            .select('*')
            .eq('grupo_id', currentGroupId)
            .order('created_at', { ascending: false });
          if (resMovs.error) throw resMovs.error;
          sbMovimientos = (resMovs.data || []).filter(m => m.tipo !== 'sync_bolsillo');
        }

        sbConnected = true;
        updateCloudHeaderUI();
        renderAllViews();
        if (sbUsuariosGrupo.length > 0) {
          checkAutoCobroSpotify();
        }
        if (showToastOnSuccess) showToast(`Cuenta de ${currentLoggedUserName()} sincronizada ✓`);
      } catch (err) {
        console.error("Supabase sync error:", err);
        sbConnected = false;
        updateCloudHeaderUI();
        renderAllViews();
      } finally {
        if (syncIcon) syncIcon.classList.remove('animate-spin');
      }
    }

    function updateCloudHeaderUI() {
      const userName = currentLoggedUserName();
      const avatarEl = $('#header-avatar');
      const greetEl = $('#header-greeting');
      const badgeEl = $('#header-role-badge');
      const dotEl = $('#cloud-status-dot');
      const userPill = $('#header-user-pill');
      const secTitle = $('#header-section-title');

      if (avatarEl) avatarEl.textContent = isAdmin ? "👑" : initials(userName);
      if (greetEl) greetEl.textContent = loggedUserId ? `Cuenta de ${userName} 👋 • Toca para cambiar` : `Modo Invitado • Identifícate o regístrate`;
      if (userPill) userPill.textContent = userName;

      const sectionNames = {
        inicio: "Control Mensual",
        gastos: "Movimientos del Mes",
        cuentas: "Deudas y Grupos",
        analitica: "Analítica y Asesor",
        ajustes: "Planificación y Cuenta"
      };
      if (secTitle) secTitle.textContent = sectionNames[activeMainView] || "Claridad Financiera";

      // Update top mode switcher pills
      const pillMensual = $('#top-pill-mensual');
      const pillDeudas = $('#top-pill-deudas');
      if (pillMensual && pillDeudas) {
        const isDeudas = activeMainView === 'cuentas';
        pillMensual.className = !isDeudas
          ? "px-3 py-1 rounded-lg text-xs font-extrabold bg-surface-container-lowest text-primary shadow-xs transition-all flex items-center gap-1"
          : "px-3 py-1 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-1";
        pillDeudas.className = isDeudas
          ? "px-3 py-1 rounded-lg text-xs font-extrabold bg-surface-container-lowest text-primary shadow-xs transition-all flex items-center gap-1"
          : "px-3 py-1 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-1";
      }

      if (badgeEl) {
        if (isAdmin) {
          badgeEl.textContent = "Super Admin";
          badgeEl.classList.remove('hidden');
        } else if (loggedUserId) {
          badgeEl.textContent = "Cuenta Personal";
          badgeEl.classList.remove('hidden');
        } else {
          badgeEl.classList.add('hidden');
        }
      }
      if (dotEl) {
        dotEl.className = `absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-surface ${sbConnected ? 'bg-secondary' : 'bg-amber-500'}`;
      }

      // Notification badge count
      const pendingPayments = sbMovimientos.filter(m => m.tipo === 'pago' && m.estado === 'pendiente');
      const overdueP2P = (S.debts || []).filter(d => !d.settled && d.type === 'owed' && d.due && d.due < todayStr());
      const refunds = (S.expenses || []).filter(e => e.refund);
      const totalNotifs = (isAdmin ? pendingPayments.length : 0) + overdueP2P.length + refunds.length;

      const notifBadge = $('#notif-badge');
      if (notifBadge) {
        if (totalNotifs > 0) {
          notifBadge.textContent = totalNotifs;
          notifBadge.classList.remove('hidden');
        } else {
          notifBadge.classList.add('hidden');
        }
      }
    }

    async function changeSupabaseGroup(groupId) {
      if (!groupId) return;
      currentGroupId = groupId;
      localStorage.setItem('last_group_id', currentGroupId);
      await cargarDatosSupabase(false);
    }

    async function checkAutoCobroSpotify() {
      const today = new Date();
      if (today.getDate() < 30 || !supabaseClient || !currentGroupId) return;
      if (Number(currentGroupId) !== 1 && Number(currentGroupId) !== Number(window.generalGroupId)) return;

      const currentMonthYear = `${today.getMonth() + 1}-${today.getFullYear()}`;
      const concept = `Spotify ${currentMonthYear}`;
      const { data } = await supabaseClient.from('movimientos').select('id').eq('concepto', concept).eq('grupo_id', currentGroupId).limit(1);
      if (data && data.length === 0) {
        const totalSpotify = 21.00;
        const rels = sbAllGroupRelations.filter(r => String(r.grupo_id) === String(currentGroupId));
        if (rels.length === 0) return;
        const porCabeza = totalSpotify / rels.length;
        const nuevos = [];
        for (const rel of rels) {
          const nuevaDeuda = parseFloat(rel.deuda || 0) + porCabeza;
          await supabaseClient.from('grupo_usuarios').update({ deuda: nuevaDeuda }).eq('id', rel.id);
          nuevos.push({
            usuario_id: rel.usuario_id,
            tipo: 'cargo',
            monto: porCabeza,
            concepto: concept,
            estado: 'completado',
            categoria: 'Suscripción',
            grupo_id: currentGroupId
          });
        }
        await supabaseClient.from('movimientos').insert(nuevos);
        await cargarDatosSupabase();
      }
    }
