    // ============================================================================
    // 1G. PORTABILITY ENGINE (CSV, JSON, Multi-Sheet Excel, PDF Report, Smart CSV Importer)
    // ============================================================================

    function exportDebtsCSV() {
      const rows = [["persona", "tipo", "importe_pendiente", "importe_inicial", "moneda", "concepto", "vencimiento", "saldada"]];
      const cur = S?.settings?.currency || 'EUR';
      (S.debts || []).forEach(d => {
        rows.push([
          `"${String(d.person || '').replace(/"/g, '""')}"`,
          d.type === 'owed' ? 'me_deben' : 'debo',
          Number(d.amount || 0).toFixed(2),
          Number(d.initialAmount || d.amount || 0).toFixed(2),
          cur,
          `"${String(d.note || '').replace(/"/g, '""')}"`,
          d.due || '',
          d.settled ? 'si' : 'no'
        ]);
      });
      logAuditEvent('export_csv', 'debts', `${(S.debts || []).length} filas`);
      saveLocalState(false);
      downloadBlob("claridad-deudas.csv", rows.map(r => r.join(";")).join("\n"), "text/csv");
      showToast('CSV de deudas descargado ✓');
    }

    function exportBudgetsCSV() {
      const rows = [["categoria", "limite_mensual", "arrastre_rollover", "arrastrado_actual", "moneda"]];
      const cur = S?.settings?.currency || 'EUR';
      allCats().forEach(c => {
        rows.push([
          `"${String(c.name || '').replace(/"/g, '""')}"`,
          Number(S.budgets?.[c.id] || 0).toFixed(2),
          S.rollover?.[c.id] ? 'si' : 'no',
          Number(S.carried?.[c.id] || 0).toFixed(2),
          cur
        ]);
      });
      logAuditEvent('export_csv', 'budgets', `${allCats().length} categorías`);
      saveLocalState(false);
      downloadBlob("claridad-presupuestos.csv", rows.map(r => r.join(";")).join("\n"), "text/csv");
      showToast('CSV de presupuestos descargado ✓');
    }

    /** Multi-sheet Excel (.xls SpreadsheetML XML) generated 100% offline with zero dependencies */
    function exportFullExcelWorkbook() {
      const xmlEsc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const buildSheet = (name, headers, rows) => {
        const headerRow = `<Row>${headers.map(h => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${xmlEsc(h)}</Data></Cell>`).join('')}</Row>`;
        const dataRows = rows.map(r => `<Row>${r.map(cell => {
          const isNum = typeof cell === 'number' && Number.isFinite(cell);
          return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${isNum ? cell.toFixed(2) : xmlEsc(cell)}</Data></Cell>`;
        }).join('')}</Row>`).join('');
        return `<Worksheet ss:Name="${xmlEsc(name.slice(0, 31))}"><Table>${headerRow}${dataRows}</Table></Worksheet>`;
      };

      const cur = S?.settings?.currency || 'EUR';
      const summaryRows = [
        ['Usuario / Perfil', currentLoggedUserName()],
        ['Moneda principal', cur],
        ['Fecha exportación', new Date().toLocaleDateString('es-ES')],
        ['Total gastos registrados', (S.expenses || []).length],
        ['Total ingresos registrados', (S.incomes || []).length],
        ['Total deudas P2P', (S.debts || []).length],
        ['Suma gastos mes actual', sumExp(monthExpenses(viewMk))],
        ['Suma ingresos mes actual', monthIncomeTotal(viewMk)]
      ];
      const expRows = (S.expenses || []).map(e => [
        e.date || '', catById(e.cat).name, accountById(e.account_id).name,
        methodById(e.method).name, cleanNoteText(e.note, ''), Number(e.amount || 0),
        e.currency || cur, tagsOf(e.note).join(' '), e.source || 'manual'
      ]);
      const incRows = (S.incomes || []).map(i => [
        i.date || '', incById(i.cat).name, accountById(i.account_id).name,
        i.source || '', i.note || '', Number(i.amount || 0), i.currency || cur
      ]);
      const debtRows = (S.debts || []).map(d => [
        d.person || '', d.type === 'owed' ? 'Me deben' : 'Debo',
        Number(d.amount || 0), d.note || '', d.due || '', d.settled ? 'Saldada' : 'Pendiente'
      ]);
      const accRows = (S.accounts || defaultAccountsList()).map(a => [
        a.name, a.type, Money.fromCents(a.initial_cents || 0), Money.fromCents(computeAccountBalanceCents(a.id)), a.archived ? 'Archivada' : 'Activa'
      ]);

      const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#4338CA" ss:Pattern="Solid"/></Style>
  </Styles>
  ${buildSheet('Resumen', ['Indicador', 'Valor'], summaryRows)}
  ${buildSheet('Gastos', ['Fecha', 'Categoría', 'Cuenta', 'Método', 'Concepto', 'Importe', 'Moneda', 'Tags', 'Fuente'], expRows)}
  ${buildSheet('Ingresos', ['Fecha', 'Categoría', 'Cuenta', 'Origen', 'Nota', 'Importe', 'Moneda'], incRows)}
  ${buildSheet('Deudas P2P', ['Persona', 'Tipo', 'Importe', 'Concepto', 'Vencimiento', 'Estado'], debtRows)}
  ${buildSheet('Cuentas', ['Nombre', 'Tipo', 'Saldo inicial', 'Saldo actual', 'Estado'], accRows)}
</Workbook>`;

      logAuditEvent('export_excel', 'workbook', `${expRows.length} gastos, ${incRows.length} ingresos`);
      if (S?.settings) S.settings.lastBackupAt = Date.now();
      saveLocalState(false);
      downloadBlob(`claridad-financiera-${todayStr()}.xls`, workbookXml, 'application/vnd.ms-excel');
      showToast('Libro Excel multi-hoja descargado ✓');
    }

    /** Clean Printable PDF Report (Monthly or Annual) */
    function exportPrintablePDFReport(scope = 'month') {
      const mk = viewMk || monthKey(todayStr());
      const yearPrefix = mk.slice(0, 4);
      const isAnnual = scope === 'year';
      const title = isAnnual ? `Informe Anual ${yearPrefix}` : `Informe Mensual · ${monthLabel(mk)}`;

      const exps = isAnnual
        ? (S.expenses || []).filter(e => String(e.date || '').startsWith(yearPrefix))
        : monthExpenses(mk);
      const incs = isAnnual
        ? (S.incomes || []).filter(i => String(i.date || '').startsWith(yearPrefix))
        : incomeRows(mk);
      const totalExp = sumExp(exps);
      const totalInc = incs.reduce((a, i) => a + Number(i.amount || 0), 0);
      const net = totalInc - totalExp;
      const sr = totalInc > 0 ? Math.round((net / totalInc) * 100) : 0;
      const cats = byCat(exps);

      const reportHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${esc(title)} — Claridad Financiera</title>
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;max-width:820px;margin:28px auto;padding:0 20px;line-height:1.45}
          h1{font-size:24px;margin:0 0 4px} .sub{color:#64748b;font-size:13px;margin:0 0 22px}
          .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
          .kpi{border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#f8fafc}
          .kpi .lbl{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700}
          .kpi .val{font-size:20px;font-weight:800;margin-top:4px}
          table{width:100%;border-collapse:collapse;font-size:12px;margin:14px 0 24px}
          th{text-align:left;padding:8px 10px;background:#f1f5f9;border-bottom:2px solid #cbd5e1;font-size:11px;text-transform:uppercase;color:#475569}
          td{padding:8px 10px;border-bottom:1px solid #e2e8f0}
          .r{text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
          .bar-wrap{background:#e2e8f0;height:8px;border-radius:99px;overflow:hidden;width:120px}
          .bar{height:100%;border-radius:99px}
          @media print{.no-print{display:none}}
        </style></head><body>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><h1>Claridad Financiera · ${esc(title)}</h1><p class="sub">Perfil: ${esc(currentLoggedUserName())} · Generado el ${new Date().toLocaleDateString('es-ES')}</p></div>
          <button class="no-print" onclick="window.print()" style="padding:10px 18px;border-radius:10px;border:0;background:#4338ca;color:#fff;font-weight:700;cursor:pointer">Imprimir / Guardar PDF</button>
        </div>
        <div class="grid">
          <div class="kpi"><div class="lbl">Ingresos</div><div class="val" style="color:#059669">+${esc(fmt(totalInc))}</div></div>
          <div class="kpi"><div class="lbl">Gastos</div><div class="val" style="color:#e11d48">−${esc(fmt(totalExp))}</div></div>
          <div class="kpi"><div class="lbl">Balance Neto</div><div class="val">${esc(fmtSigned(net))}</div></div>
          <div class="kpi"><div class="lbl">Tasa de Ahorro</div><div class="val">${sr}%</div></div>
        </div>
        <h2 style="font-size:16px">Desglose por categorías</h2>
        <table><thead><tr><th>Categoría</th><th>Peso</th><th>Barra</th><th class="r">Total</th></tr></thead><tbody>
          ${cats.map(d => {
            const c = catById(d.cat);
            const pct = totalExp > 0 ? Math.round((d.total / totalExp) * 100) : 0;
            return `<tr><td>${esc(c.name)}</td><td>${pct}%</td><td><div class="bar-wrap"><div class="bar" style="width:${pct}%;background:${c.c}"></div></div></td><td class="r">−${esc(fmt(d.total))}</td></tr>`;
          }).join('') || '<tr><td colspan="4">Sin gastos en este periodo</td></tr>'}
        </tbody></table>
        <h2 style="font-size:16px">Detalle de movimientos (${exps.length} gastos)</h2>
        <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Cuenta</th><th class="r">Importe</th></tr></thead><tbody>
          ${exps.slice(0, 120).map(e => `<tr><td>${esc(e.date)}</td><td>${esc(cleanNoteText(e.note, catById(e.cat).name))}</td><td>${esc(catById(e.cat).name)}</td><td>${esc(accountById(e.account_id).name)}</td><td class="r">−${esc(fmt(e.amount))}</td></tr>`).join('') || '<tr><td colspan="5">Sin movimientos</td></tr>'}
        </tbody></table>
        <p style="font-size:11px;color:#64748b;text-align:center;margin-top:28px">Generado localmente por Claridad Financiera · 100% Privado · Estimaciones orientativas basadas en tus datos.</p>
      </body></html>`;

      logAuditEvent('export_pdf', scope, title);
      saveLocalState(false);
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(reportHtml);
        w.document.close();
        setTimeout(() => { try { w.print(); } catch (e) {} }, 300);
      } else {
        downloadBlob(`claridad-informe-${scope}-${mk}.html`, reportHtml, 'text/html');
        showToast('Informe descargado (ábrelo para imprimir/guardar como PDF)');
      }
    }

    // ============================================================================
    // 1H. SMART UNIVERSAL CSV IMPORTER (Auto-Detect Bank/App + Column Map + Dedupe)
    // ============================================================================
    let csvImportState = null;

    function parseCSVLines(rawText) {
      const text = String(rawText || '').replace(/^\uFEFF/, '').trim();
      if (!text) return { sep: ';', headers: [], rows: [] };
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) return { sep: ';', headers: [], rows: [] };

      // Detect delimiter (; vs , vs \t)
      const firstLine = lines[0];
      const semiCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const sep = tabCount > semiCount && tabCount > commaCount ? '\t' : (semiCount >= commaCount ? ';' : ',');

      const splitRow = (line) => {
        const res = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
          } else if (ch === sep && !inQ) {
            res.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
        res.push(cur.trim());
        return res;
      };

      const headers = splitRow(lines[0]);
      const rows = lines.slice(1).map(splitRow).filter(r => r.some(c => c !== ''));
      return { sep, headers, rows };
    }

    function normalizeImportedDate(raw) {
      const s = String(raw || '').trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
      if (dmy) {
        let y = Number(dmy[3]);
        if (y < 100) y += 2000;
        return `${y}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
      }
      return todayStr();
    }

    function detectCSVFormatAndColumns(headers) {
      const lower = headers.map(h => String(h || '').toLowerCase());
      let formatName = 'Extracto CSV genérico';
      if (lower.some(h => h.includes('completed date')) && lower.some(h => h.includes('description'))) formatName = 'Revolut';
      else if (lower.some(h => h.includes('f. valor') || h.includes('fecha operación'))) formatName = 'Banco español (BBVA / Santander / CaixaBank)';
      else if (lower.some(h => h.includes('payee') && h.includes('amount (eur)'))) formatName = 'N26';
      else if (lower.some(h => h.includes('cost')) && lower.some(h => h.includes('currency'))) formatName = 'Splitwise';
      else if (lower.some(h => h.includes('categoría') && h.includes('importe'))) formatName = 'Fintonic / Claridad';

      const findCol = (patterns, fallback) => {
        const idx = lower.findIndex(h => patterns.some(p => h.includes(p)));
        return idx >= 0 ? idx : fallback;
      };

      return {
        formatName,
        dateCol: findCol(['fecha', 'date', 'f. valor', 'started'], 0),
        descCol: findCol(['concepto', 'descrip', 'comercio', 'merchant', 'payee', 'detalle', 'movimiento'], Math.min(1, headers.length - 1)),
        amountCol: findCol(['importe', 'amount', 'monto', 'valor', 'cost', 'total'], Math.min(2, headers.length - 1))
      };
    }

    function txDedupeFingerprint(date, amountCents, desc) {
      const normDesc = String(desc || '').toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '').slice(0, 24);
      return `${date}|${Math.abs(Math.round(amountCents))}|${normDesc}`;
    }

    function buildExistingTxFingerprints() {
      const set = new Set();
      (S?.expenses || []).forEach(e => {
        const c = typeof e.amount_cents === 'number' ? e.amount_cents : Money.toCents(e.amount);
        set.add(txDedupeFingerprint(e.date, c, cleanNoteText(e.note, '')));
      });
      (S?.incomes || []).forEach(i => {
        const c = typeof i.amount_cents === 'number' ? i.amount_cents : Money.toCents(i.amount);
        set.add(txDedupeFingerprint(i.date, c, i.source || i.note || ''));
      });
      return set;
    }

    function openCSVImporterModal(inputEl = null) {
      if (inputEl && inputEl.files && inputEl.files[0]) {
        const file = inputEl.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          const parsed = parseCSVLines(reader.result);
          if (parsed.rows.length === 0) {
            showToast('No se encontraron filas válidas en el CSV');
            return;
          }
          const det = detectCSVFormatAndColumns(parsed.headers);
          csvImportState = {
            fileName: file.name,
            ...parsed,
            ...det,
            accountId: (S.accounts?.[0]?.id) || 'acc_main',
            skipDuplicates: true
          };
          renderCSVImportPreviewModal();
        };
        reader.readAsText(file);
        return;
      }
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Importar extracto CSV</h3>
              <p class="text-xs text-on-surface-variant">Compatible con bancos (BBVA, Santander, Caixa, ING, Revolut, N26), Fintonic y Splitwise</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>
          <label class="w-full p-6 rounded-2xl border-2 border-dashed border-primary/45 bg-primary/5 hover:bg-primary/10 text-center cursor-pointer flex flex-col items-center gap-2 transition">
            <span class="text-primary">${ico('upload_file', 'text-[34px]')}</span>
            <span class="text-sm font-extrabold text-primary">Seleccionar archivo .CSV</span>
            <span class="text-[11px] text-on-surface-variant">Detectamos columnas, formato y duplicados automáticamente antes de importar</span>
            <input type="file" accept=".csv,.txt,text/csv" onchange="openCSVImporterModal(this)" class="hidden"/>
          </label>
        </div>
      `);
    }

    function computeCSVImportPreview() {
      if (!csvImportState) return { items: [], duplicateCount: 0 };
      const existing = buildExistingTxFingerprints();
      const seenInBatch = new Set();
      let duplicateCount = 0;
      const items = [];

      csvImportState.rows.forEach((row) => {
        const rawDate = row[csvImportState.dateCol] || '';
        const rawDesc = row[csvImportState.descCol] || 'Movimiento importado';
        const rawAmt = row[csvImportState.amountCol] || '0';
        const centsSigned = Money.toCents(rawAmt);
        if (centsSigned === 0) return;
        const date = normalizeImportedDate(rawDate);
        const kind = centsSigned > 0 && csvImportState.rows.some(r => Money.toCents(r[csvImportState.amountCol]) < 0) ? 'inc' : 'exp';
        const absCents = Math.abs(centsSigned);
        const fp = txDedupeFingerprint(date, absCents, rawDesc);
        const isDup = existing.has(fp) || seenInBatch.has(fp);
        seenInBatch.add(fp);
        if (isDup) duplicateCount++;
        const guessedCat = kind === 'exp' ? (applyRule(rawDesc) || guessCatFromMerchant(rawDesc) || 'otros') : 'extra';
        items.push({ date, desc: rawDesc, absCents, kind, cat: guessedCat, isDup });
      });

      return { items, duplicateCount };
    }

    function renderCSVImportPreviewModal() {
      if (!csvImportState) return;
      const { items, duplicateCount } = computeCSVImportPreview();
      const toImport = csvImportState.skipDuplicates ? items.filter(i => !i.isDup) : items;
      const colOpts = (sel) => csvImportState.headers.map((h, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(h || `Col ${i + 1}`)}</option>`).join('');

      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-2.5">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Revisar importación CSV</h3>
              <p class="text-[11px] text-on-surface-variant">Formato detectado: <strong class="text-primary">${esc(csvImportState.formatName)}</strong> · ${items.length} movimientos</p>
            </div>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Col. Fecha</label>
              <select onchange="csvImportState.dateCol=Number(this.value); renderCSVImportPreviewModal()" class="w-full px-2 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">${colOpts(csvImportState.dateCol)}</select>
            </div>
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Col. Concepto</label>
              <select onchange="csvImportState.descCol=Number(this.value); renderCSVImportPreviewModal()" class="w-full px-2 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">${colOpts(csvImportState.descCol)}</select>
            </div>
            <div>
              <label class="text-[10px] font-extrabold uppercase text-on-surface-variant block mb-1">Col. Importe</label>
              <select onchange="csvImportState.amountCol=Number(this.value); renderCSVImportPreviewModal()" class="w-full px-2 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">${colOpts(csvImportState.amountCol)}</select>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs">
            <label class="flex items-center gap-2 font-bold text-on-surface cursor-pointer">
              <input type="checkbox" ${csvImportState.skipDuplicates ? 'checked' : ''} onchange="csvImportState.skipDuplicates=this.checked; renderCSVImportPreviewModal()" class="w-4 h-4 rounded text-primary"/>
              Omitir duplicados detectados (${duplicateCount})
            </label>
            <select onchange="csvImportState.accountId=this.value" class="px-2 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-[11px] font-bold text-on-surface">
              ${(S.accounts || defaultAccountsList()).filter(a => !a.archived).map(a => `<option value="${a.id}" ${csvImportState.accountId === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}
            </select>
          </div>

          <div class="max-h-52 overflow-y-auto rounded-xl border border-outline-variant/30 divide-y divide-outline-variant/20 text-xs">
            ${items.slice(0, 12).map(it => `
              <div class="p-2.5 flex items-center justify-between gap-2 ${it.isDup ? 'opacity-45 bg-amber-500/5' : ''}">
                <div class="min-w-0">
                  <p class="font-bold text-on-surface truncate">${esc(it.desc)} ${it.isDup ? '<span class="text-[10px] text-amber-600 font-extrabold">(Duplicado)</span>' : ''}</p>
                  <p class="text-[10px] text-on-surface-variant">${esc(it.date)} • ${it.kind === 'exp' ? esc(catById(it.cat).name) : 'Ingreso'}</p>
                </div>
                <span class="font-extrabold tabular-nums flex-shrink-0 ${it.kind === 'inc' ? 'text-secondary' : 'text-on-surface'}">${it.kind === 'inc' ? '+' : '−'}${fmt(Money.fromCents(it.absCents))}</span>
              </div>
            `).join('')}
          </div>

          <button onclick="executeSmartCSVImport()" ${toImport.length === 0 ? 'disabled' : ''} class="w-full py-3 rounded-2xl bg-primary text-on-primary font-extrabold text-sm shadow-sm active-scale disabled:opacity-45">
            Importar ${toImport.length} movimiento(s) nuevo(s)
          </button>
        </div>
      `);
    }

    async function executeSmartCSVImport() {
      if (!csvImportState) return;
      const { items } = computeCSVImportPreview();
      const list = csvImportState.skipDuplicates ? items.filter(i => !i.isDup) : items;
      const baseCur = S?.settings?.currency || 'EUR';

      let addedExp = 0, addedInc = 0;
      for (const it of list) {
        if (it.kind === 'exp') {
          const obj = enrichTransactionMoney({
            id: uid(),
            amount_cents: it.absCents,
            amount: Money.fromCents(it.absCents),
            currency: baseCur,
            account_id: csvImportState.accountId || 'acc_main',
            cat: it.cat,
            method: 'tarjeta',
            note: it.desc,
            date: it.date,
            tripId: '',
            refund: false,
            source: 'import',
            ts: Date.now()
          }, 'exp');
          S.expenses.push(obj);
          addedExp++;
          if (loggedUserId) await dbUpsertPersonalExpense(obj);
        } else {
          const obj = enrichTransactionMoney({
            id: uid(),
            amount_cents: it.absCents,
            amount: Money.fromCents(it.absCents),
            currency: baseCur,
            account_id: csvImportState.accountId || 'acc_main',
            cat: 'extra',
            source: it.desc,
            note: 'Importado desde CSV',
            date: it.date,
            ts: Date.now()
          }, 'inc');
          S.incomes.push(obj);
          addedInc++;
          if (loggedUserId) await dbUpsertPersonalIncome(obj);
        }
      }

      logAuditEvent('import_csv', 'transactions', `${addedExp} gastos, ${addedInc} ingresos (${csvImportState.formatName})`);
      saveLocalState(true);
      csvImportState = null;
      closeUniversalModal();
      renderAllViews();
      showToast(`✓ Importados ${addedExp} gastos y ${addedInc} ingresos`);
    }

    // ============================================================================
    // 1I. ACCOUNTS CRUD MODALS (Efectivo, Banco, Tarjeta, Ahorro, Inversión)
    // ============================================================================
    function openNewAccountModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-outline-variant/25 pb-3">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Nueva cuenta</h3>
            <button onclick="closeUniversalModal()" class="w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center">${ico('close', 'text-[18px]')}</button>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Nombre de la cuenta</label>
            <input id="acc-new-name" type="text" placeholder="Ej. BBVA Nómina, Revolut, Hucha..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">Tipo</label>
              <select id="acc-new-type" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-on-surface">
                ${ACCOUNT_TYPES.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">Saldo inicial (${esc(currencySymbol())})</label>
              <input id="acc-new-initial" type="number" step="0.01" value="0" class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-extrabold text-on-surface"/>
            </div>
          </div>
          <button onclick="saveNewAccountModal()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-extrabold text-sm active-scale">Crear cuenta</button>
        </div>
      `);
    }

    function saveNewAccountModal() {
      const name = ($('#acc-new-name')?.value || '').trim();
      const type = $('#acc-new-type')?.value || 'banco';
      const initCents = Money.toCents($('#acc-new-initial')?.value || 0);
      if (!name) return;
      const meta = ACCOUNT_TYPES.find(t => t.id === type) || ACCOUNT_TYPES[0];
      if (!Array.isArray(S.accounts)) S.accounts = defaultAccountsList();
      S.accounts.push({
        id: 'acc_' + uid(),
        name,
        type,
        initial_cents: initCents,
        color: meta.color,
        icon: meta.icon,
        archived: false
      });
      logAuditEvent('account_created', 'accounts', name);
      saveLocalState(true);
      closeUniversalModal();
      renderAllViews();
      showToast(`Cuenta «${name}» creada ✓`);
    }

    function toggleArchiveAccount(accId) {
      const acc = (S.accounts || []).find(a => a.id === accId);
      if (!acc) return;
      const activeCount = (S.accounts || []).filter(a => !a.archived).length;
      if (!acc.archived && activeCount <= 1) {
        showToast('Debes mantener al menos 1 cuenta activa');
        return;
      }
      acc.archived = !acc.archived;
      saveLocalState(true);
      renderAllViews();
      showToast(acc.archived ? 'Cuenta archivada' : 'Cuenta reactivada ✓');
    }
