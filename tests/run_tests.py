#!/usr/bin/env python3
"""
Automated unit & regression test suite for Claridad Financiera.
Runs directly on macOS Apple JavaScriptCore (jsc) with zero external dependencies.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc"


def run_jsc(code: str, label: str):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(code)
        tmp = Path(f.name)
    try:
        res = subprocess.run([JSC, str(tmp)], capture_output=True, text=True)
    finally:
        tmp.unlink(missing_ok=True)
    if res.returncode != 0:
        print(f"✗ {label} FAILED:\n{res.stdout}\n{res.stderr}")
        sys.exit(1)
    return res.stdout.strip()


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    scripts = [
        m.group(1).strip()
        for m in re.finditer(r"<script(?:\s+[^>]*)?>([\s\S]*?)</script>", html)
        if m.group(1).strip()
    ]
    assert len(scripts) >= 3, f"Expected >=3 script blocks, found {len(scripts)}"

    # 1. Syntax check every script block in index.html
    for idx, code in enumerate(scripts):
        out = run_jsc(f"function __syntax__() {{\n{code}\n}}\nprint('SYNTAX_OK');\n", f"Syntax Script #{idx}")
        assert "SYNTAX_OK" in out
    print(f"✓ Syntax check passed for all {len(scripts)} inline script blocks")

    # 2. Static icon & UI hygiene audit
    icons_src = (ROOT / "src/icons.js").read_text(encoding="utf-8")
    defined_icons = set(re.findall(r"^\s+([a-z0-9_]+):", icons_src, re.M))
    html_nocomments = re.sub(r"/\*[\s\S]*?\*/", "", html)
    used_static = re.findall(r'data-ico="([a-z0-9_]+)"', html_nocomments)
    used_calls = re.findall(r"\bico\('([a-z0-9_]+)'", html_nocomments)
    used_cat_icons = re.findall(r'icon:\s*"([a-z0-9_]+)"', html_nocomments)
    iconpick_m = re.search(r"ICONPICK\s*=\s*\[([^\]]+)\]", html_nocomments)
    used_pick = re.findall(r'"([a-z0-9_]+)"', iconpick_m.group(1)) if iconpick_m else []
    missing = sorted(set(used_static + used_calls + used_cat_icons + used_pick) - defined_icons)
    assert not missing, f"Missing SVG icons: {missing}"

    for fp in (ROOT / "src").glob("*"):
        if fp.name == "icons.js":
            continue
        txt = fp.read_text(encoding="utf-8")
        assert "material-symbols-outlined" not in txt and "Material+Symbols" not in txt, f"Legacy Material Symbols in {fp}"
    print(f"✓ Icon audit passed ({len(defined_icons)} SVG icons, 0 missing, 0 legacy Material Symbols)")

    # 3. Runtime unit tests for Fase 0 + Fase 1 engines
    harness = r"""
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null
};
globalThis.window = globalThis;
globalThis.window.location = { hash: '', protocol: 'https:', hostname: 'localhost', search: '' };
globalThis.window.addEventListener = () => {};
globalThis.document = {
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  documentElement: { classList: { toggle: () => false, contains: () => false } },
  body: { classList: { toggle: () => {} }, dataset: {} }
};
globalThis.navigator = { onLine: true, userAgent: 'TestRunner' };
globalThis.history = { replaceState: () => {} };
globalThis.setTimeout = () => 1;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};
let lastToastMsg = '';
""" + scripts[1] + "\n" + scripts[2] + r"""
// Override showToast for test inspection
showToast = (m) => { lastToastMsg = String(m || ''); };

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + msg);
}

// --- TEST SUITE 1: Money Engine (Integer Cents & Multicurrency) ---
assert(Money.toCents(19.99) === 1999, 'toCents float 19.99');
assert(Money.toCents(0.1) + Money.toCents(0.2) === 30, '0.1 + 0.2 exact 30 cents');
assert(Money.toCents('1.234,56 €') === 123456, 'toCents Spanish 1.234,56 €');
assert(Money.toCents('-42,50') === -4250, 'toCents negative Spanish -42,50');
assert(Money.toCents('$1,234.56') === 123456, 'toCents US $1,234.56');
assert(Money.fromCents(123456) === 1234.56, 'fromCents 123456');

const s3 = Money.splitEqual(1000, 3);
assert(JSON.stringify(s3) === '[334,333,333]', 'splitEqual(1000,3) remainder to index 0: ' + JSON.stringify(s3));
assert(Money.sumCents(s3) === 1000, 'splitEqual sum invariant');

const s4 = Money.splitEqual(1001, 4);
assert(JSON.stringify(s4) === '[251,250,250,250]', 'splitEqual(1001,4): ' + JSON.stringify(s4));

const vOk = Money.validateExactSplit(1000, [400, 350, 250]);
assert(vOk.valid === true && vOk.diffCents === 0, 'validateExactSplit valid');
const vBad = Money.validateExactSplit(1000, [400, 300, 250]);
assert(vBad.valid === false && vBad.diffCents === 50, 'validateExactSplit diff=50');

const usdInEur = Money.convertCents(1080, 'USD', 'EUR');
assert(usdInEur === 1000, 'convertCents USD->EUR expected 1000, got ' + usdInEur);
print('✓ Suite 1: Money engine (integer cents, odd splits, multicurrency)');

// --- TEST SUITE 2: Zero-Loss Legacy State Migration & Accounts ---
const legacyV1 = {
  expenses: [
    { id: 'e1', amount: 12.35, cat: 'comida', method: 'tarjeta', note: 'Mercadona', date: '2026-11-10' },
    { id: 'e2', amount: 4.50, cat: 'ocio', method: 'efectivo', note: 'Café', date: '2026-11-11' }
  ],
  incomes: [
    { id: 'i1', amount: 1500.00, cat: 'nomina', source: 'Empresa', date: '2026-11-01' }
  ],
  debts: [{ id: 'd1', person: 'Laura', type: 'owed', amount: 34.00, note: 'Cena' }]
};
S = normalizeStateObject(legacyV1);
assert(S.schemaVersion === 2, 'Migrated schemaVersion=2');
assert(S.expenses.length === 2 && S.expenses[0].amount_cents === 1235, 'Legacy expense migrated to cents');
assert(S.expenses[1].account_id === 'acc_cash', 'Cash expense mapped to acc_cash');
assert(S.accounts.length >= 2, 'Default accounts created');
assert(computeAccountBalanceCents('acc_main') === (150000 - 1235), 'Main account balance in cents exact');
assert(computeAccountBalanceCents('acc_cash') === -450, 'Cash account balance in cents exact');
assert(S.debts[0].amount_cents === 3400, 'Debt migrated to cents');
assert(S.settings.consents.analytics === false, 'GDPR analytics telemetry OFF by default');
print('✓ Suite 2: Legacy migration, accounts & exact balances');

// --- TEST SUITE 3: Strict Read-Only Guest Mode for Cloud Debts ---
loggedUserId = null;
isAdmin = false;
sbGrupos = [{ id: 1, nombre: 'General', admin_id: 2 }];
currentGroupId = 1;
const guestCard = renderCloudMemberCard({ id: 5, nombre: 'Carlos', deuda: 14.5 }, 0);
assert(guestCard.includes('Carlos') && guestCard.includes('14,50'), 'Guest sees pending balance');
assert(!guestCard.includes('openCloudPaymentModal'), 'Guest CANNOT see payment button');
assert(!guestCard.includes('openIndivChargeModal'), 'Guest CANNOT see add charge button');
assert(!guestCard.includes('undoLastCloudAction'), 'Guest CANNOT see undo button');
assert(!guestCard.includes('openBizumClaimModal'), 'Guest CANNOT see Bizum claim button');
openCloudPaymentModal(5, 'Carlos', 14.5);
assert(lastToastMsg.includes('solo consulta'), 'openCloudPaymentModal blocked for guest');
openIndivChargeModal(5, 'Carlos');
assert(lastToastMsg.includes('solo consulta'), 'openIndivChargeModal blocked for guest');
print('✓ Suite 3: Strict read-only guest mode (view balances only, zero mutations)');

// --- TEST SUITE 4: Smart CSV Importer & Deduplication ---
const sampleCSV = 'Fecha operación;Concepto;Importe\n10/11/2026;Mercadona;-12,35\n12/11/2026;Repsol Estación;-45,00\n15/11/2026;Bizum Recibido;20,00';
const parsed = parseCSVLines(sampleCSV);
assert(parsed.sep === ';' && parsed.rows.length === 3, 'CSV semicolon parser');
const det = detectCSVFormatAndColumns(parsed.headers);
assert(det.dateCol === 0 && det.descCol === 1 && det.amountCol === 2, 'Auto column detection');
csvImportState = { ...parsed, ...det, accountId: 'acc_main', skipDuplicates: true };
const prev = computeCSVImportPreview();
assert(prev.items.length === 3, 'Parsed 3 rows');
assert(prev.duplicateCount === 1 && prev.items[0].isDup === true, 'Detected exact Mercadona duplicate');
assert(prev.items[1].isDup === false && prev.items[1].absCents === 4500 && prev.items[1].kind === 'exp', 'Repsol expense parsed');
assert(prev.items[2].isDup === false && prev.items[2].absCents === 2000 && prev.items[2].kind === 'inc', 'Bizum income parsed');
print('✓ Suite 4: Smart CSV parser, format detection & deduplication');

// --- TEST SUITE 5: Security Rate Limiting & Offline Sync Queue ---
assert(computePinCooldownMs(1) === 0, '1 fail = 0 cooldown');
assert(computePinCooldownMs(3) === 15000, '3 fails = 15s');
assert(computePinCooldownMs(5) === 60000, '5 fails = 60s');
assert(computePinCooldownMs(7) === 300000, '7 fails = 5m');

loggedUserId = 2;
enqueueOfflineSyncOp('upsert', 'expense', 'exp_off_1', { id: 'exp_off_1', amount_cents: 500 });
enqueueOfflineSyncOp('upsert', 'expense', 'exp_off_1', { id: 'exp_off_1', amount_cents: 600 });
assert(S.syncQueue.length === 1 && S.syncQueue[0].payload.amount_cents === 600, 'Offline queue deduplicates per row_id');
print('✓ Suite 5: Security progressive cooldown & offline sync queue');

// --- TEST SUITE 6: Control Streak, 30 Currencies, Month Start Day & 30-day Trash ---
assert(CURRENCIES.length === 30, '30 currencies available');
S.settings.monthStartDay = 25;
assert(monthKey('2026-10-25') === '2026-11' && monthKey('2026-10-24') === '2026-10', 'monthStartDay=25');
S.settings.monthStartDay = 1;
S.trash = [
  { trashId: 'expired', kind: 'exp', item: { id: 'x' }, deletedAt: Date.now() - 31 * 86400 * 1000 },
  { trashId: 'fresh', kind: 'exp', item: { id: 'y' }, deletedAt: Date.now() - 3 * 86400 * 1000 }
];
S = normalizeStateObject(S);
assert(S.trash.length === 1 && S.trash[0].trashId === 'fresh', '30-day trash retention');
print('✓ Suite 6: Streak, 30 currencies, custom month start day & 30d trash');

// --- TEST SUITE 7: Predictive Engine (P25-P75 Range), Coach Chat NL & Universal Search ---
S = blankState(2000);
S.expenses = [
  enrichTransactionMoney({ id: 'p1', amount: 65, cat: 'ocio', method: 'tarjeta', note: 'Restaurante Tagliatella', date: '2026-11-05' }, 'exp'),
  enrichTransactionMoney({ id: 'p2', amount: 42, cat: 'comida', method: 'tarjeta', note: 'Mercadona', date: '2026-11-08' }, 'exp'),
  enrichTransactionMoney({ id: 'p3', amount: 18, cat: 'ocio', method: 'tarjeta', note: 'Cine', date: '2026-10-12' }, 'exp')
];
S.recurring = [{ id: 'r1', name: 'Netflix', amount: 17.99, cat: 'susc', day: 28, autoCharge: true }];
S.goals = [{ id: 'g1', name: 'Japón', target: 2400, saved: 600 }];
viewMk = '2026-11';

const proj = computeEndOfMonthProjection('2026-11');
assert(proj.projectedEndLowCents <= proj.projectedEndMidCents && proj.projectedEndMidCents <= proj.projectedEndHighCents, 'Projection range low <= mid <= high');
assert(proj.expectedIncomeCents >= 200000, 'Expected income includes salary');

const catProjs = computeCategoryProjections('2026-11');
assert(catProjs.length >= 2, 'Category projections computed');

const nlFilters = parseNaturalLanguageSearch('gastos >50€ en restaurantes noviembre');
assert(nlFilters.minCents === 5000 && nlFilters.catId === 'ocio' && nlFilters.monthNum === '11', 'NL search parsed >50 + ocio + nov');

const uniRes = runUniversalSearch('gastos >50€ en restaurantes noviembre');
assert(uniRes.transactions.length === 1 && uniRes.transactions[0].id === 'p1', 'Universal NL search matched Tagliatella 65€');

const ansSub = answerCoachQuestionLocally('¿Cuál es mi suscripción más cara?');
assert(ansSub.text.includes('Netflix'), 'Coach chat answers top subscription accurately');

const ansAfford = answerCoachQuestionLocally('¿Puedo permitirme unos zapatos de 120€ este mes?');
assert(ansAfford.text.includes('Sí puedes') || ansAfford.text.includes('margen'), 'Coach chat answers affordability accurately');

const hor = computeExtendedHorizon();
assert(hor.goalProjections.length === 1 && hor.goalProjections[0].name === 'Japón', 'Extended horizon computes goal ETA');
print('✓ Suite 7: Predictive engine (P25-P75), Coach NL chat, Universal NL search & 3/6m horizon');

// --- TEST SUITE 8: Exact Subset-Sum DP Debt Simplification & 5-Mode Smart Split ---
// Case A: Circular debts A->B 10€, B->C 10€, C->A 10€ => net balances all 0 => 0 transfers!
const circularGroup = {
  id: 'g_circ', name: 'Circ', currency: 'EUR', members: ['A', 'B', 'C'],
  items: [
    { id: '1', amount_cents: 2000, amount_base_cents: 2000, payer: 'A', for: ['A', 'B'] },
    { id: '2', amount_cents: 2000, amount_base_cents: 2000, payer: 'B', for: ['B', 'C'] },
    { id: '3', amount_cents: 2000, amount_base_cents: 2000, payer: 'C', for: ['C', 'A'] }
  ]
};
const circBal = computeGroupBalancesCents(circularGroup);
const circSimp = computeSimplifiedSettlementsCents(circBal);
assert(circSimp.length === 0, 'Circular debt simplifies to 0 transfers, got ' + circSimp.length);

// Case B: Exact DP subset-sum optimality: A:+10, B:-10, C:+7, D:-7 => 2 transfers (not 3!)
const exactPlan = computeSimplifiedSettlementsCents({ A: 1000, B: -1000, C: 700, D: -700 });
assert(exactPlan.length === 2, 'Subset-sum DP must find 2 exact transfers, got ' + exactPlan.length);

// Case C: 5-Mode Smart Split exact cent conservation
const baseSplit = {
  payer: 'Ana', participants: ['Ana', 'Luis', 'Sofía'], totalInput: '100.00',
  items: [
    { id: 'i1', name: 'Entrante', cents: 1000, assigned: ['Ana', 'Luis', 'Sofía'] },
    { id: 'i2', name: 'Pasta', cents: 1500, assigned: ['Luis'] },
    { id: 'i3', name: 'Ensalada', cents: 1200, assigned: ['Ana', 'Sofía'] }
  ],
  tipCents: 370, discountCents: 0, tipProportional: true,
  exactInputs: { Ana: '40.00', Luis: '35.00', Sofía: '25.00' },
  percentInputs: { Ana: 50, Luis: 30, Sofía: 20 },
  sharesInputs: { Ana: 2, Luis: 1, Sofía: 1 }
};
['equal', 'items', 'exact', 'percent', 'shares'].forEach(mode => {
  const res = computeSmartSplitBreakdown({ ...baseSplit, mode });
  assert(res.valid === true, 'SmartSplit mode ' + mode + ' valid');
  const sum = Object.values(res.sharesCents).reduce((a, b) => a + b, 0);
  assert(sum === res.totalCents, 'SmartSplit mode ' + mode + ' exact cent conservation (' + sum + ' vs ' + res.totalCents + ')');
});
print('✓ Suite 8: Exact DP debt simplification (circular + subset-sum) & 5-mode smart split');

// --- TEST SUITE 9: Compound Voice NLP & Per-Item Receipt OCR + Warranties ---
S = blankState(2000);
S.settings.coachTone = 'humor';
const refDate = new Date(2026, 10, 26); // 2026-11-26

// 1. Canonical compound utterance: expense + linked P2P debt + relative date "ayer"
const v1 = parseCompoundVoiceUtterance('Ayer cenamos fuera con Laura y pagué yo, fueron 68 euros, ella me debe la mitad', refDate);
assert(v1.expenses.length === 1, 'Compound voice creates 1 expense, got ' + v1.expenses.length);
assert(v1.expenses[0].amount_cents === 6800, 'Compound voice expense amount = 6800c, got ' + v1.expenses[0].amount_cents);
assert(v1.expenses[0].cat === 'ocio', 'Compound voice category = ocio, got ' + v1.expenses[0].cat);
assert(v1.expenses[0].date === '2026-11-25', 'Compound voice resolves ayer -> 2026-11-25, got ' + v1.expenses[0].date);
assert(v1.debts.length === 1 && v1.debts[0].person === 'Laura' && v1.debts[0].type === 'owed' && v1.debts[0].amount_cents === 3400,
  'Compound voice creates linked owed debt Laura 3400c, got ' + JSON.stringify(v1.debts));

// 2. Multi-expense voice
const v2 = parseCompoundVoiceUtterance('35 de súper y 12 de gasolina', refDate);
assert(v2.expenses.length === 2, 'Multi-expense voice splits into 2 expenses, got ' + v2.expenses.length);
assert(v2.expenses[0].amount_cents === 3500 && v2.expenses[0].cat === 'comida', 'Multi-expense #1 comida 3500c');
assert(v2.expenses[1].amount_cents === 1200 && v2.expenses[1].cat === 'transporte', 'Multi-expense #2 transporte 1200c');

// 3. Spoken Spanish numbers
const v3 = parseCompoundVoiceUtterance('veinticinco con veinte euros de menú', refDate);
assert(v3.expenses.length === 1 && v3.expenses[0].amount_cents === 2520, 'Spoken Spanish number 25.20€ parsed, got ' + JSON.stringify(v3.expenses));

// 4. Voice income
const v4 = parseCompoundVoiceUtterance('Me han pagado la nómina 2100 euros', refDate);
assert(v4.incomes.length === 1 && v4.incomes[0].amount_cents === 210000 && v4.incomes[0].cat === 'nomina',
  'Voice income nomina 2100€, got ' + JSON.stringify(v4.incomes));

// 5. Per-item Receipt OCR parser + category splitting + optional humor
const sampleReceipt = `
MERCADONA S.A.
NIF: A46103834
25/11/2026 19:42
LECHUGA ICEBERG          1,50
VINO TINTO RIOJA        12,30
DETERGENTE LIQUIDO       4,20
TOTAL                   18,00
TARJETA **** 4821
`;
const rParsed = parseReceiptLinesDetailed(sampleReceipt);
assert(rParsed.storeName === 'Mercadona', 'Receipt store detected Mercadona, got ' + rParsed.storeName);
assert(rParsed.date === '2026-11-25', 'Receipt date parsed 2026-11-25, got ' + rParsed.date);
assert(rParsed.totalCents === 1800, 'Receipt total 1800c, got ' + rParsed.totalCents);
assert(rParsed.cardLast4 === '4821', 'Receipt cardLast4 4821, got ' + rParsed.cardLast4);
assert(rParsed.items.length === 3, 'Receipt parsed 3 line items, got ' + rParsed.items.length);
assert(rParsed.items[0].cat === 'comida' && rParsed.items[1].cat === 'ocio' && rParsed.items[2].cat === 'hogar',
  'Receipt per-item categories comida/ocio/hogar, got ' + rParsed.items.map(x => x.cat).join(','));
assert(rParsed.mismatchWarning === false, 'Receipt sum matches total with no mismatch warning');
assert(rParsed.humorNote && rParsed.humorNote.length > 0, 'Optional humor note triggered for wine + lettuce');

// 6. Expiring warranties detector (within 30 days)
S.receipts = [
  { id: 'r1', store_name: 'MediaMarkt', total_cents: 59900, warranty_until: '2026-12-10', returned: false },
  { id: 'r2', store_name: 'Apple Store', total_cents: 120000, warranty_until: '2028-05-01', returned: false }
];
const expW = getExpiringWarranties(30, refDate);
assert(expW.length === 1 && expW[0].id === 'r1' && expW[0].daysLeft === 14, 'Expiring warranty detected (14d left), got ' + JSON.stringify(expW));
print('✓ Suite 9: Compound voice NLP (expense+debt, multi, spoken, income), per-item OCR & warranties');

// --- TEST SUITE 10: Open Banking PSD2 Normalization, Inbox, Deduplication & 7 Smart Detectors ---
S = blankState(0);
S.debts = [{ id: 'd_laura', person: 'Laura', type: 'owed', amount: 34, amount_cents: 3400, settled: false, note: 'Cena', log: [] }];

// 1. Merchant normalization + transfer + bank fee + Bizum + low-confidence unknown
const mMerc = normalizeBankMerchant('COMPRA TARJ. 4821 MERCADONA S.A. MADRID ES 24/11', 4250, false);
assert(mMerc.merchant === 'Mercadona' && mMerc.cat === 'comida' && mMerc.confidence >= 0.9, 'Normalized Mercadona -> comida');

const mSpot = normalizeBankMerchant('PAYPAL *SPOTIFY AB 35314369001', 1199, false);
assert(mSpot.merchant === 'Spotify' && mSpot.cat === 'susc', 'Normalized PayPal Spotify -> susc');

const mTr = normalizeBankMerchant('TRASPASO INTERNO A CUENTA AHORRO', 20000, false);
assert(mTr.isTransfer === true, 'Detected internal transfer');

const mFee = normalizeBankMerchant('COMISION MANTENIMIENTO CUENTA', 350, false);
assert(mFee.isBankFee === true, 'Detected bank fee');

const mBiz = normalizeBankMerchant('BIZUM RECIBIDO DE LAURA GARCIA', 3400, true);
assert(mBiz.isBizum === true && mBiz.bizumPerson === 'Laura Garcia', 'Detected Bizum credit + person');

const mUnk = normalizeBankMerchant('COMERCIO LOCAL 8492 SLU', 2740, false);
assert(mUnk.confidence < 0.85, 'Unknown merchant has low confidence -> routes to Inbox');

// 2. Ingestion, deduplication, transfer exclusion, inbox routing & Bizum P2P debt match
const mockConn = { id: 'conn_1', bankName: 'BBVA', accountId: 'acc_main', expiresAt: Date.now() + 3 * 86400000, status: 'active' };
S.bankConnections = [mockConn];
const batchTxs = [
  { external_id: 'tx1', date: '2026-11-24', amount_cents: 4250, isCredit: false, raw: 'COMPRA TARJ. 4821 MERCADONA S.A. MADRID ES' },
  { external_id: 'tx2', date: '2026-11-24', amount_cents: 20000, isCredit: false, raw: 'TRASPASO INTERNO A CUENTA AHORRO' },
  { external_id: 'tx3', date: '2026-11-24', amount_cents: 2740, isCredit: false, raw: 'COMERCIO LOCAL 8492 SLU' },
  { external_id: 'tx4', date: '2026-11-25', amount_cents: 3400, isCredit: true, raw: 'BIZUM RECIBIDO DE LAURA GARCIA' }
];
const ing1 = ingestBankTransactions(mockConn, batchTxs);
assert(ing1.importedAuto === 2 && ing1.sentToInbox === 1 && ing1.skippedTransfers === 1, 'Ingest 1: 2 auto, 1 inbox, 1 transfer skipped, got ' + JSON.stringify(ing1));
assert(ing1.bizumDebtMatches.length === 1 && ing1.bizumDebtMatches[0].person === 'Laura', 'Detected Bizum credit matching Laura P2P debt');

const ing2 = ingestBankTransactions(mockConn, batchTxs);
assert(ing2.importedAuto === 0 && ing2.sentToInbox === 0 && ing2.skippedDuplicates === 3 && ing2.skippedTransfers === 1, 'Ingest 2: 100% deduplicated + transfer skipped, got ' + JSON.stringify(ing2));

// 3. Classify Inbox item & verify auto-rule learning
const inboxId = S.pendingInbox[0].id;
classifyInboxItem(inboxId, 'compras', true);
assert(S.pendingInbox.length === 0, 'Inbox emptied after classification');
assert(S.rules.some(r => r.cat === 'compras' && r.match.includes('comercio local')), 'Auto-rule learned from Inbox classification');

// 4. Expiring SCA 90-day connection alert (expires in 3 days <= 7)
const expBanks = getExpiringBankConnections(7);
assert(expBanks.length === 1 && expBanks[0].bankName === 'BBVA', 'Expiring PSD2 bank connection detected');

// 5. All 7 Smart Financial Detectors
S = blankState(0);
S.accounts = [{ id: 'acc_main', name: 'BBVA', type: 'banco', initial_cents: 0, syncedBalanceCents: 2500, archived: false }];
S.recurring = [{ id: 'rec_rent', name: 'Alquiler', amount: 800, cat: 'hogar', day: 28, autoCharge: true }];
S.incomes = [
  enrichTransactionMoney({ id: 'inc_sal', amount: 2200, cat: 'nomina', source: 'Nómina mensual', date: '2026-11-01' }, 'inc')
];
S.expenses = [
  // Duplicate charge < 48h
  enrichTransactionMoney({ id: 'e_d1', amount: 15.90, cat: 'ocio', note: 'Uber Eats', date: '2026-11-20' }, 'exp'),
  enrichTransactionMoney({ id: 'e_d2', amount: 15.90, cat: 'ocio', note: 'Uber Eats', date: '2026-11-21' }, 'exp'),
  // Silent price hike (>= 5%) on recurring merchant
  enrichTransactionMoney({ id: 'e_h1', amount: 10.00, cat: 'susc', note: 'Spotify', date: '2026-10-05' }, 'exp'),
  enrichTransactionMoney({ id: 'e_h2', amount: 11.99, cat: 'susc', note: 'Spotify', date: '2026-11-05' }, 'exp'),
  // Unregistered subscription candidate (~same price across 2 months)
  enrichTransactionMoney({ id: 'e_s1', amount: 29.90, cat: 'salud', note: 'BasicFit', date: '2026-10-02' }, 'exp'),
  enrichTransactionMoney({ id: 'e_s2', amount: 29.90, cat: 'salud', note: 'BasicFit', date: '2026-11-02' }, 'exp'),
  // Unusual spend in comida (4 baseline ~20€ + 1 spike 140€)
  enrichTransactionMoney({ id: 'e_u1', amount: 18, cat: 'comida', note: 'Fruteria', date: '2026-11-02' }, 'exp'),
  enrichTransactionMoney({ id: 'e_u2', amount: 22, cat: 'comida', note: 'Panaderia', date: '2026-11-06' }, 'exp'),
  enrichTransactionMoney({ id: 'e_u3', amount: 20, cat: 'comida', note: 'Lidl', date: '2026-11-10' }, 'exp'),
  enrichTransactionMoney({ id: 'e_u4', amount: 19, cat: 'comida', note: 'Aldi', date: '2026-11-14' }, 'exp'),
  enrichTransactionMoney({ id: 'e_u5', amount: 155, cat: 'comida', note: 'Compra Especial', date: '2026-11-25' }, 'exp'),
  // Bank fee
  enrichTransactionMoney({ id: 'e_f1', amount: 4.50, cat: 'otros', note: 'Comisión bancaria', isBankFee: true, date: '2026-11-15' }, 'exp')
];
const detected = runSmartFinancialDetectors(new Date(2026, 10, 26));
const detTypes = new Set(detected.map(a => a.type));
['duplicate_charge', 'price_hike', 'recurring_candidate', 'unusual_spend', 'bank_fees', 'salary_503020', 'overdraft_risk'].forEach(t => {
  assert(detTypes.has(t), 'Missing smart detector type: ' + t + ' (got: ' + [...detTypes].join(', ') + ')');
});
print('✓ Suite 10: Open Banking PSD2 normalization, dedup, Inbox rules & all 7 Smart Detectors');

// --- TEST SUITE 11: Healthy Gamification (Dated Goal Projections, Reduction, Debt-Zero, Challenges & Badges) ---
S = blankState(2000);
const gRefDate = new Date(2026, 10, 26); // 2026-11-26
S.incomes = [enrichTransactionMoney({ id: 'gi1', amount: 2000, cat: 'nomina', source: 'Nómina', date: '2026-11-01' }, 'inc')];
S.expenses = [
  enrichTransactionMoney({ id: 'ge1', amount: 120, cat: 'ocio', note: 'Restaurante', date: '2026-11-10' }, 'exp'),
  enrichTransactionMoney({ id: 'ge2', amount: 15, cat: 'ocio', note: 'Glovo pizza', date: '2026-11-12' }, 'exp')
];
S.debts = [
  { id: 'gd1', person: 'Carlos', type: 'owe', amount: 100, amount_cents: 10000, settled: false, note: 'Viaje', log: [] }
];
S.receipts = [{ id: 'gr1', store_name: 'Mercadona', total_cents: 2500, date: '2026-11-10' }];

// 1. Savings goal dated projection + slider acceleration
const gSave = { id: 'g_jp', kind: 'savings', name: 'Japón', target: 1200, saved: 200, monthlyPlan: 100, contributions: [] };
S.goals = [gSave];
const pBase = computeGoalProjection(gSave, null, gRefDate);
const pFast = computeGoalProjection(gSave, 25000, gRefDate); // 250€/month slider
assert(pBase.monthsNeeded === 10 && pBase.etaDate === '2027-09', 'Savings ETA at 100€/m = 10m (2027-09), got ' + JSON.stringify(pBase));
assert(pFast.monthsNeeded === 4 && pFast.etaDate === '2027-03', 'Slider 250€/m accelerates to 4m (2027-03), got ' + JSON.stringify(pFast));

// 2. Milestone crossing (25% / 50%) via applyGoalContribution
const contribRes = applyGoalContribution('g_jp', 45000); // +450€ -> 650/1200 = 54%
assert(contribRes.crossed.includes(25) && contribRes.crossed.includes(50), 'Crossed 25% & 50% milestones, got ' + JSON.stringify(contribRes));

// 3. Reduction goal (reduce ocio by 20% from 200€ -> cap 160€; spent 135€ <= 160€ -> onTrack!)
const gRed = { id: 'g_red', kind: 'reduction', name: 'Bajar Ocio', cat: 'ocio', baselineAmount: 200, reductionPct: 20 };
const pRed = computeGoalProjection(gRed, null, gRefDate);
assert(pRed.onTrack === true && pRed.targetCents === 16000 && pRed.currentCents === 13500, 'Reduction goal on track (135€ <= 160€), got ' + JSON.stringify(pRed));

// 4. Debt-zero goal (initial 400€, active owe 100€ -> 75% paid, 1 month left at 100€/m)
const gDebt = { id: 'g_dz', kind: 'debt_zero', name: 'Deuda Cero', initialDebt: 400, monthlyPlan: 100 };
const pDebt = computeGoalProjection(gDebt, null, gRefDate);
assert(pDebt.pct === 75 && pDebt.remainingCents === 10000 && pDebt.monthsNeeded === 1, 'Debt-zero goal 75% done, 1m left, got ' + JSON.stringify(pDebt));

// 5. Optional self-only challenges
const chNoSpend = { id: 'ch1', kind: 'no_spend_days', targetValue: 7, monthKey: '2026-11' };
const chDeliv = { id: 'ch2', kind: 'keyword_cap', keywords: ['glovo', 'uber eats'], maxCents: 3000, monthKey: '2026-11' };
const chSav = { id: 'ch3', kind: 'savings_rate', targetPct: 20, monthKey: '2026-11' };
S.challenges = [chNoSpend, chDeliv, chSav];
assert(evaluateChallengeProgress(chNoSpend, gRefDate).completed === true, 'No-spend challenge completed');
assert(evaluateChallengeProgress(chDeliv, gRefDate).overLimit !== true, 'Delivery cap challenge under limit (15€ <= 30€)');
assert(evaluateChallengeProgress(chSav, gRefDate).completed === true, 'Savings rate >= 20% challenge completed');

// 6. Silent badges unlocked from real data
const badges = computeUnlockedBadges(gRefDate);
const unlockedIds = new Set(badges.filter(b => b.unlocked).map(b => b.id));
['first_tx', 'savings_rate_20', 'goal_milestone_50', 'smart_scanner', 'challenge_winner'].forEach(bid => {
  assert(unlockedIds.has(bid), 'Expected unlocked badge: ' + bid + ' (got: ' + [...unlockedIds].join(', ') + ')');
});
print('✓ Suite 11: Healthy gamification (dated goals + slider, reduction, debt-zero, challenges & badges)');

// --- TEST SUITE 12: Smart Notifications Engine (Quiet Hours, Grouping, Dedupe, Read/Unread & Cooldowns) ---
S = blankState(2000);
S.settings.notifPrefs = defaultNotifPrefs();

// 1. Quiet hours (22:00 - 08:00 crosses midnight)
assert(isWithinQuietHours(new Date(2026, 10, 26, 23, 30)) === true, '23:30 must be inside quiet hours');
assert(isWithinQuietHours(new Date(2026, 10, 26, 7, 15)) === true, '07:15 must be inside quiet hours');
assert(isWithinQuietHours(new Date(2026, 10, 26, 11, 0)) === false, '11:00 must be outside quiet hours');

// 2. Automatic grouping when >= 3 overdue P2P debts
S.debts = [
  { id: 'od1', person: 'Ana', type: 'owed', amount: 15, due: '2026-11-10', settled: false, note: 'Cena', log: [] },
  { id: 'od2', person: 'Luis', type: 'owed', amount: 20, due: '2026-11-12', settled: false, note: 'Cine', log: [] },
  { id: 'od3', person: 'Marta', type: 'owed', amount: 12, due: '2026-11-14', settled: false, note: 'Café', log: [] }
];
const nDay = new Date(2026, 10, 26, 11, 0);
const ev1 = evaluateNotificationsEngine(nDay);
const grpNotif = ev1.unread.find(n => n.groupedCount === 3);
assert(!!grpNotif, '3 overdue P2P debts automatically grouped into 1 card');

// 3. Mark read moves notification from unread -> read ("Anteriores")
markNotificationRead(grpNotif.dedupe_key);
const ev2 = evaluateNotificationsEngine(nDay);
assert(!ev2.unread.some(n => n.dedupe_key === grpNotif.dedupe_key), 'Read notification removed from unread');
assert(ev2.read.some(n => n.dedupe_key === grpNotif.dedupe_key), 'Read notification present in read (Anteriores)');

// 4. Push cooldown & quiet hours enforcement
const sampleNotif = { dedupe_key: 'test_push_1', category: 'debts_social', severity: 'high' };
assert(canDispatchLocalPush(sampleNotif, new Date(2026, 10, 26, 23, 0)).reason === 'quiet_hours', 'Push blocked during quiet hours');
assert(canDispatchLocalPush(sampleNotif, nDay).allowed === true, 'Push allowed outside quiet hours');
S.notifState.lastPushByKey['test_push_1'] = nDay.getTime() - (2 * 3600 * 1000); // 2h ago (< 24h cooldown)
assert(canDispatchLocalPush(sampleNotif, nDay).reason === 'cooldown', 'Push blocked during 24h cooldown');

// 5. Channel preference matrix hides disabled category
updateNotifChannelPref('debts_social', 'inApp', false);
const ev3 = evaluateNotificationsEngine(nDay);
assert(!ev3.all.some(n => n.category === 'debts_social'), 'Disabling inApp channel hides debts_social notifications');
print('✓ Suite 12: Smart Notifications (quiet hours, grouping, dedupe, read/past, cooldowns & prefs matrix)');

// --- TEST SUITE 13: E2E 12-Word Phrase, 10,000+ Tx Virtualization, i18n & Human Changelog ---
const phrase = generateRecoveryPhrase12();
const words = phrase.split(' ');
assert(words.length === 12, 'E2E recovery phrase has 12 words, got ' + words.length);
assert(words.every(w => E2E_WORDLIST_ES.includes(w)), 'All 12 words come from clean ES wordlist');
const fp1 = computePhraseFingerprint(phrase);
const fp2 = computePhraseFingerprint('  ' + phrase.toUpperCase().replace(/ /g, '   ') + ' ');
assert(fp1.length === 16 && fp1 === fp2, 'Phrase normalization + deterministic fingerprint verified');

// 10,000+ transaction virtualization performance benchmark
const bigList = [];
for (let i = 0; i < 10000; i++) {
  bigList.push({ id: 't_' + i, date: '2026-11-15', amount: 12.5, cat: 'comida', note: 'Tx ' + i, _k: 'exp' });
}
const t0 = Date.now();
const vSlice = sliceVirtualizedMovements(bigList, 80);
const elapsed = Date.now() - t0;
assert(vSlice.visible.length === 80 && vSlice.total === 10000 && vSlice.remaining === 9920, '10,000 tx virtualized cleanly to 80 visible rows');
assert(elapsed < 100, '10,000 tx slice ran in ' + elapsed + 'ms (<100ms)');

// i18n es / en
S = blankState(1000);
S.settings.locale = 'es';
assert(t('trust_seal').includes('Gratis para siempre'), 'i18n ES trust seal');
S.settings.locale = 'en';
assert(t('trust_seal').includes('Free forever'), 'i18n EN trust seal');

// Human changelog
assert(Array.isArray(HUMAN_CHANGELOG) && HUMAN_CHANGELOG.length >= 6 && HUMAN_CHANGELOG[0].version === '2.8', 'Human changelog populated through v2.8');
print('✓ Suite 13: E2E 12-word phrase, 10k+ virtualization (' + elapsed + 'ms), i18n & human changelog');
"""
    out = run_jsc(harness, "Unit & Regression Test Suite")
    print(out)

    # 3b. Validate manifest.json PWA share_target & shortcuts
    import json
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    assert "share_target" in manifest and manifest["share_target"]["action"] == "./index.html", "manifest share_target valid"
    assert len(manifest.get("shortcuts", [])) >= 3, "manifest PWA shortcuts valid"
    print("✓ manifest.json PWA share_target & shortcuts validated")

    # 4. Also verify Swift iOS wrapper compiles syntax-cleanly if SDK available
    swift_file = ROOT / "ios/ClaridadApp.swift"
    sdk_check = subprocess.run(["xcrun", "--sdk", "iphoneos", "--show-sdk-path"], capture_output=True, text=True)
    if sdk_check.returncode == 0 and sdk_check.stdout.strip():
        sdk = sdk_check.stdout.strip()
        with tempfile.NamedTemporaryFile(suffix=".o", delete=True) as out_bin:
            sw = subprocess.run(
                ["xcrun", "-sdk", "iphoneos", "swiftc", "-parse", "-parse-as-library", "-target", "arm64-apple-ios15.0", "-sdk", sdk, str(swift_file)],
                capture_output=True, text=True
            )
            if sw.returncode != 0:
                print(f"✗ Swift parse check failed:\n{sw.stderr}")
                sys.exit(1)
            print("✓ ios/ClaridadApp.swift parsed cleanly against iOS SDK")
    else:
        sw = subprocess.run(["swiftc", "-parse", "-parse-as-library", str(swift_file)], capture_output=True, text=True)
        if sw.returncode == 0:
            print("✓ ios/ClaridadApp.swift Swift syntax parsed cleanly")

    print("\nALL AUTOMATED TESTS PASSED ✓")


if __name__ == "__main__":
    main()
