    // ============================================================================
    // 7. SMART NOTIFICATIONS ENGINE (Dedupe, Cooldowns, Grouping, Quiet Hours & Push)
    // ============================================================================

    const NOTIF_CATEGORIES = [
      { id: 'security_critical', label: 'Seguridad y alertas críticas', desc: 'Cobros duplicados, posible descubierto y caducidad PSD2', defaultInApp: true, defaultPush: true,  cooldownHours: 12 },
      { id: 'debts_social',      label: 'Deudas y pagos sociales',      desc: 'Pagos pendientes de confirmar y préstamos vencidos',       defaultInApp: true, defaultPush: true,  cooldownHours: 24 },
      { id: 'bills_budgets',     label: 'Recibos y presupuesto',        desc: 'Suscripciones en ≤3 días, subidas de precio y límite 85%', defaultInApp: true, defaultPush: true,  cooldownHours: 24 },
      { id: 'warranties_refunds',label: 'Garantías, devoluc. y backup', desc: 'Garantías por vencer, devoluciones y copia local',         defaultInApp: true, defaultPush: false, cooldownHours: 72 },
      { id: 'digest_coach',      label: 'Resumen semanal (Digest)',     desc: 'Resumen tranquilo de tu semana financiera',                defaultInApp: true, defaultPush: false, cooldownHours: 168 }
    ];

    let activeNotifTab = 'new'; // 'new' | 'past' | 'prefs'

    function defaultNotifPrefs() {
      const channels = {};
      NOTIF_CATEGORIES.forEach(c => {
        channels[c.id] = { inApp: c.defaultInApp, push: c.defaultPush };
      });
      return {
        quietEnabled: true,
        quietStart: 22,
        quietEnd: 8,
        digestEnabled: true,
        channels
      };
    }

    function getNotifPrefs() {
      const base = defaultNotifPrefs();
      const saved = S?.settings?.notifPrefs;
      if (!saved || typeof saved !== 'object') return base;
      const mergedChannels = { ...base.channels };
      if (saved.channels && typeof saved.channels === 'object') {
        Object.keys(mergedChannels).forEach(k => {
          if (saved.channels[k]) {
            mergedChannels[k] = {
              inApp: saved.channels[k].inApp !== false,
              push: !!saved.channels[k].push
            };
          }
        });
      }
      return {
        quietEnabled: saved.quietEnabled !== false,
        quietStart: Number.isFinite(Number(saved.quietStart)) ? Number(saved.quietStart) : 22,
        quietEnd: Number.isFinite(Number(saved.quietEnd)) ? Number(saved.quietEnd) : 8,
        digestEnabled: saved.digestEnabled !== false,
        channels: mergedChannels
      };
    }

    function ensureNotifState() {
      if (!S) return { readKeys: [], dismissedKeys: [], lastPushByKey: {} };
      if (!S.notifState || typeof S.notifState !== 'object') {
        S.notifState = { readKeys: [], dismissedKeys: [], lastPushByKey: {} };
      }
      if (!Array.isArray(S.notifState.readKeys)) S.notifState.readKeys = [];
      if (!Array.isArray(S.notifState.dismissedKeys)) S.notifState.dismissedKeys = [];
      if (!S.notifState.lastPushByKey || typeof S.notifState.lastPushByKey !== 'object') S.notifState.lastPushByKey = {};
      return S.notifState;
    }

    /** Check whether a given Date falls inside user's Quiet Hours (e.g. 22:00 - 08:00) */
    function isWithinQuietHours(now = new Date(), prefs = null) {
      const p = prefs || getNotifPrefs();
      if (!p.quietEnabled) return false;
      const h = now.getHours();
      const start = ((p.quietStart % 24) + 24) % 24;
      const end = ((p.quietEnd % 24) + 24) % 24;
      if (start === end) return false;
      if (start > end) {
        // Crosses midnight (e.g. 22 -> 8)
        return h >= start || h < end;
      }
      return h >= start && h < end;
    }

    /**
     * Evaluate all notification rules with:
     * - Deterministic `dedupe_key`
     * - Channel preference filtering
     * - Automatic grouping when >= 3 items share a groupable category
     * - Expiration filtering (`expiresAt`)
     */
    function evaluateNotificationsEngine(now = new Date()) {
      const prefs = getNotifPrefs();
      const nState = ensureNotifState();
      const readSet = new Set(nState.readKeys);
      const dismissedSet = new Set(nState.dismissedKeys);
      const nowMs = now.getTime();
      const today = dstr(now);
      const curMk = monthKey(today);
      const candidates = [];

      const pushCandidate = (item) => {
        const chPref = prefs.channels[item.category];
        if (chPref && !chPref.inApp) return;
        if (item.expiresAt && item.expiresAt < nowMs) return;
        if (dismissedSet.has(item.dedupe_key)) return;
        candidates.push({
          ...item,
          isRead: readSet.has(item.dedupe_key),
          createdAt: item.createdAt || nowMs
        });
      };

      // 1. Admin pending cloud payments
      if (isAdmin) {
        const pendingPayments = (sbMovimientos || []).filter(m => m.tipo === 'pago' && m.estado === 'pendiente');
        pendingPayments.forEach(p => {
          const u = (sbGlobalUsers || []).find(x => Number(x.id) === Number(p.usuario_id));
          const uName = u ? u.nombre : 'Miembro';
          pushCandidate({
            dedupe_key: `cloud_pay_${p.id}`,
            category: 'debts_social',
            severity: 'high',
            icon: 'payments',
            title: `${uName} notificó un pago (+${fmt(p.monto)})`,
            body: `Pendiente de confirmar en tu grupo cloud.`,
            actionLabel: 'Confirmar',
            actionCode: `aprobarPagoSupabase(${p.id}, ${p.usuario_id}, ${p.monto})`,
            secondaryLabel: 'Rechazar',
            secondaryCode: `rechazarPagoSupabase(${p.id})`
          });
        });
      }

      // 2. Overdue P2P debts (grouped automatically if >= 3!)
      const overdueP2P = (S?.debts || []).filter(d => !d.settled && d.type === 'owed' && d.due && d.due < today);
      if (overdueP2P.length >= 3) {
        const sumOverdue = overdueP2P.reduce((a, d) => a + Number(d.amount || 0), 0);
        pushCandidate({
          dedupe_key: `overdue_group_${curMk}_${overdueP2P.length}`,
          category: 'debts_social',
          severity: 'high',
          icon: 'groups',
          groupedCount: overdueP2P.length,
          title: `${overdueP2P.length} cobros P2P con plazo vencido (${fmt(sumOverdue)})`,
          body: overdueP2P.slice(0, 3).map(d => `${d.person} (${fmt0(d.amount)})`).join(' · '),
          actionLabel: 'Ver en Social',
          actionCode: `toggleNotificationsDrawer(); switchMainView('cuentas', 'owed')`
        });
      } else {
        overdueP2P.forEach(d => {
          pushCandidate({
            dedupe_key: `overdue_p2p_${d.id}_${d.due}`,
            category: 'debts_social',
            severity: 'high',
            icon: 'schedule',
            title: `Cobro vencido: ${d.person} (${fmt(d.amount)})`,
            body: `${d.note || 'Préstamo P2P'} · Venció ${fmtDay(d.due)}`,
            actionLabel: 'Recordar',
            actionCode: `sendIndividualWhatsAppClaim('${esc(d.person)}', ${d.amount}, '${esc(d.note || '')}')`
          });
        });
      }

      // 3. Smart Financial Detectors (high + medium)
      if (typeof runSmartFinancialDetectors === 'function') {
        runSmartFinancialDetectors(now).forEach(a => {
          if (a.severity === 'high') {
            pushCandidate({
              dedupe_key: `det_${a.id}`,
              category: 'security_critical',
              severity: 'high',
              icon: a.icon || 'warning',
              title: a.title,
              body: a.body,
              actionLabel: 'Revisar',
              actionCode: `toggleNotificationsDrawer(); switchMainView('ajustes', 'bancos')`
            });
          } else if (a.type === 'price_hike' || a.type === 'bank_fees') {
            pushCandidate({
              dedupe_key: `det_${a.id}`,
              category: 'bills_budgets',
              severity: 'medium',
              icon: a.icon || 'trending_up',
              title: a.title,
              body: a.body,
              actionLabel: 'Ver detalle',
              actionCode: `toggleNotificationsDrawer(); switchMainView('ajustes', 'bancos')`
            });
          }
        });
      }

      // 4. Expiring PSD2 bank connections (<= 7 days)
      if (typeof getExpiringBankConnections === 'function') {
        getExpiringBankConnections(7, nowMs).forEach(b => {
          pushCandidate({
            dedupe_key: `bank_sca_${b.id}_${Math.max(0, b.daysLeft)}`,
            category: 'security_critical',
            severity: 'high',
            icon: 'account_balance',
            title: `Renovar acceso PSD2: ${b.bankName}`,
            body: b.daysLeft <= 0 ? 'Consentimiento de 90 días caducado.' : `Caduca en ${b.daysLeft} día(s).`,
            actionLabel: 'Renovar',
            actionCode: `toggleNotificationsDrawer(); openConnectBankModal()`
          });
        });
      }

      // 5. Upcoming recurring bills in the next 3 days (grouped if >= 3)
      const dayNow = now.getDate();
      const soonBills = (S?.recurring || []).filter(r => {
        const d = Number(r.day || 1);
        const delta = d >= dayNow ? (d - dayNow) : (d + 30 - dayNow);
        return delta >= 0 && delta <= 3 && !recPaidThisMonth(r, curMk);
      });
      if (soonBills.length >= 3) {
        const sumBills = soonBills.reduce((a, r) => a + Number(r.amount || 0), 0);
        pushCandidate({
          dedupe_key: `bills_soon_grp_${curMk}_${dayNow}`,
          category: 'bills_budgets',
          severity: 'medium',
          icon: 'autorenew',
          groupedCount: soonBills.length,
          title: `${soonBills.length} recibos próximos (${fmt(sumBills)})`,
          body: soonBills.slice(0, 3).map(r => `${r.name} día ${r.day}`).join(' · '),
          actionLabel: 'Ver fijos',
          actionCode: `toggleNotificationsDrawer(); switchMainView('ajustes', 'rec')`,
          expiresAt: nowMs + 4 * 86400000
        });
      } else {
        soonBills.forEach(r => {
          pushCandidate({
            dedupe_key: `bill_soon_${r.id}_${curMk}`,
            category: 'bills_budgets',
            severity: 'medium',
            icon: 'autorenew',
            title: `Próximo cargo: ${r.name} (${fmt(r.amount)})`,
            body: `Previsto para el día ${r.day} de este mes.`,
            actionLabel: 'Ver fijos',
            actionCode: `toggleNotificationsDrawer(); switchMainView('ajustes', 'rec')`,
            expiresAt: nowMs + 4 * 86400000
          });
        });
      }

      // 6. Monthly budget threshold (>= 85%)
      const totalBud = totalMonthlyBudget();
      const spentMonth = sumExp(monthExpenses(curMk));
      if (totalBud > 0 && spentMonth >= totalBud * 0.85) {
        const pct = Math.round((spentMonth / totalBud) * 100);
        pushCandidate({
          dedupe_key: `budget_warn_${curMk}_${pct >= 100 ? '100' : '85'}`,
          category: 'bills_budgets',
          severity: pct >= 100 ? 'high' : 'medium',
          icon: 'speed',
          title: pct >= 100 ? `Presupuesto mensual alcanzado (${pct}%)` : `Llevas el ${pct}% de tu presupuesto mensual`,
          body: `Gastado ${fmt0(spentMonth)} de ${fmt0(totalBud)}. Puedes ajustar tu ritmo desde Inicio o el Plan de Rescate.`,
          actionLabel: 'Ver límites',
          actionCode: `toggleNotificationsDrawer(); switchMainView('ajustes', 'pres')`
        });
      }

      // 7. Pending refunds
      const refunds = (S?.expenses || []).filter(e => e.refund);
      refunds.forEach(e => {
        pushCandidate({
          dedupe_key: `refund_${e.id}`,
          category: 'warranties_refunds',
          severity: 'info',
          icon: 'assignment_return',
          title: `Devolución pendiente: ${cleanNoteText(e.note, 'Compra')}`,
          body: `${fmtDay(e.date)} · ${fmt(e.amount)} por recuperar.`,
          actionLabel: '✓ Cobrado',
          actionCode: `markExpenseRefunded('${e.id}'); renderNotificationsDrawerContent()`
        });
      });

      // 8. Expiring warranties (<= 30 days)
      if (typeof getExpiringWarranties === 'function') {
        getExpiringWarranties(30, now).forEach(w => {
          pushCandidate({
            dedupe_key: `warranty_${w.id}_${w.warranty_until}`,
            category: 'warranties_refunds',
            severity: 'info',
            icon: 'shield',
            title: `Garantía próxima a vencer: ${w.store_name}`,
            body: `Vence el ${w.warranty_until} (quedan ${w.daysLeft} días) · ${fmt(Money.fromCents(w.total_cents))}`,
            actionLabel: 'Ver ticket',
            actionCode: `toggleNotificationsDrawer(); openReceiptDetailModal('${w.id}')`
          });
        });
      }

      // 9. Local backup reminder (every 30 days)
      if (typeof needsLocalBackupReminder === 'function' && needsLocalBackupReminder()) {
        pushCandidate({
          dedupe_key: `local_backup_${curMk}`,
          category: 'warranties_refunds',
          severity: 'medium',
          icon: 'download',
          title: 'Hace 30 días que no haces copia local',
          body: 'Exporta un JSON en 1 toque para tener tus datos locales siempre a salvo.',
          actionLabel: 'Exportar',
          actionCode: `exportBackupJSON(); renderNotificationsDrawerContent()`
        });
      }

      // 10. Optional Weekly Digest (calm summary)
      if (prefs.digestEnabled && (S?.expenses || []).length > 0) {
        const weekNum = Math.ceil(now.getDate() / 7);
        pushCandidate({
          dedupe_key: `digest_${curMk}_w${weekNum}`,
          category: 'digest_coach',
          severity: 'info',
          icon: 'auto_awesome',
          title: `Resumen semana ${weekNum}: ${fmt0(spentMonth)} gastados este mes`,
          body: `Margen neto actual: ${fmtSigned(monthBalance(curMk))}. Todo organizado en Stats.`,
          actionLabel: 'Ver Stats',
          actionCode: `toggleNotificationsDrawer(); switchMainView('analitica')`
        });
      }

      // Deduplicate by dedupe_key preserving highest severity
      const seen = new Map();
      const sevOrder = { high: 0, medium: 1, info: 2 };
      candidates.forEach(c => {
        if (!seen.has(c.dedupe_key)) seen.set(c.dedupe_key, c);
      });

      const all = Array.from(seen.values()).sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));
      const unread = all.filter(x => !x.isRead);
      const read = all.filter(x => x.isRead);
      return { all, unread, read };
    }

    /** Check if a notification may dispatch a local push right now (respecting Quiet Hours & cooldowns) */
    function canDispatchLocalPush(notif, now = new Date()) {
      const prefs = getNotifPrefs();
      const ch = prefs.channels[notif.category];
      if (!ch || !ch.push) return { allowed: false, reason: 'channel_push_disabled' };

      // Respect Quiet Hours (only critical security alerts may optionally break quiet hours? No, keep peaceful by default!)
      if (isWithinQuietHours(now, prefs)) {
        return { allowed: false, reason: 'quiet_hours' };
      }

      const catMeta = NOTIF_CATEGORIES.find(c => c.id === notif.category);
      const cooldownMs = ((catMeta?.cooldownHours || 24) * 3600 * 1000);
      const nState = ensureNotifState();
      const lastSent = Number(nState.lastPushByKey[notif.dedupe_key] || 0);
      if (lastSent > 0 && (now.getTime() - lastSent) < cooldownMs) {
        return { allowed: false, reason: 'cooldown' };
      }
      return { allowed: true, reason: 'ok' };
    }

    async function dispatchEligibleLocalPushes(now = new Date()) {
      const { unread } = evaluateNotificationsEngine(now);
      const nState = ensureNotifState();
      let sent = 0;

      for (const n of unread) {
        const check = canDispatchLocalPush(n, now);
        if (!check.allowed) continue;

        let delivered = false;
        if (typeof window.claridadScheduleLocalNotif === 'function') {
          try {
            window.claridadScheduleLocalNotif(n.dedupe_key, n.title, n.body, 1);
            delivered = true;
          } catch (e) {}
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(n.title, { body: n.body, tag: n.dedupe_key });
            delivered = true;
          } catch (e) {}
        }

        if (delivered) {
          nState.lastPushByKey[n.dedupe_key] = now.getTime();
          sent++;
        }
      }
      if (sent > 0) saveLocalState(false);
      return sent;
    }

    async function requestLocalPushPermission() {
      if (typeof window.claridadRequestNotifPermission === 'function') {
        const ok = await window.claridadRequestNotifPermission();
        showToast(ok ? '🔔 Notificaciones nativas iOS activadas ✓' : 'Permiso de notificaciones no concedido');
        renderSmartNotificationsDrawer();
        return ok;
      }
      if (typeof Notification === 'undefined') {
        showToast('Este navegador no soporta notificaciones locales');
        return false;
      }
      const res = await Notification.requestPermission();
      showToast(res === 'granted' ? '🔔 Notificaciones locales activadas ✓' : 'Permiso de notificaciones denegado');
      renderSmartNotificationsDrawer();
      return res === 'granted';
    }

    function markNotificationRead(dedupeKey) {
      const nState = ensureNotifState();
      if (!nState.readKeys.includes(dedupeKey)) nState.readKeys.push(dedupeKey);
      saveLocalState(false);
      updateCloudHeaderUI();
      renderSmartNotificationsDrawer();
    }

    function markAllNotificationsRead() {
      const nState = ensureNotifState();
      const { unread } = evaluateNotificationsEngine();
      unread.forEach(n => {
        if (!nState.readKeys.includes(n.dedupe_key)) nState.readKeys.push(n.dedupe_key);
      });
      saveLocalState(false);
      updateCloudHeaderUI();
      renderSmartNotificationsDrawer();
      showToast('Todas marcadas como leídas ✓');
    }

    function dismissNotificationKey(dedupeKey) {
      const nState = ensureNotifState();
      if (!nState.dismissedKeys.includes(dedupeKey)) nState.dismissedKeys.push(dedupeKey);
      saveLocalState(false);
      updateCloudHeaderUI();
      renderSmartNotificationsDrawer();
    }

    function updateNotifChannelPref(catId, field, value) {
      if (!S.settings) S.settings = {};
      const prefs = getNotifPrefs();
      if (!prefs.channels[catId]) prefs.channels[catId] = { inApp: true, push: false };
      prefs.channels[catId][field] = !!value;
      S.settings.notifPrefs = prefs;
      saveLocalState(true);
      updateCloudHeaderUI();
      renderSmartNotificationsDrawer();
    }

    function updateQuietHoursPref(patch) {
      if (!S.settings) S.settings = {};
      const prefs = getNotifPrefs();
      S.settings.notifPrefs = { ...prefs, ...patch };
      saveLocalState(true);
      renderSmartNotificationsDrawer();
    }

    /** Redesigned Smart Notification Center (Tabs: Nuevas | Anteriores | Ajustes) */
    function renderSmartNotificationsDrawer() {
      const box = $('#notifications-content');
      if (!box) return;

      const { unread, read } = evaluateNotificationsEngine();
      const prefs = getNotifPrefs();
      const quietNow = isWithinQuietHours(new Date(), prefs);

      const tabsHtml = `
        <div class="grid grid-cols-3 bg-surface-container p-1 rounded-xl gap-1 mb-2">
          <button onclick="activeNotifTab='new'; renderSmartNotificationsDrawer()" class="py-1.5 rounded-lg text-xs font-extrabold transition ${activeNotifTab === 'new' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">
            Nuevas (${unread.length})
          </button>
          <button onclick="activeNotifTab='past'; renderSmartNotificationsDrawer()" class="py-1.5 rounded-lg text-xs font-extrabold transition ${activeNotifTab === 'past' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">
            Anteriores (${read.length})
          </button>
          <button onclick="activeNotifTab='prefs'; renderSmartNotificationsDrawer()" class="py-1.5 rounded-lg text-xs font-extrabold transition ${activeNotifTab === 'prefs' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">
            Ajustes
          </button>
        </div>
      `;

      const renderCard = (n, isPast) => {
        const cls = n.severity === 'high'
          ? 'bg-tertiary/8 border-tertiary/25'
          : n.severity === 'medium'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-surface-container-low border-outline-variant/35';
        return `
          <div class="p-3.5 rounded-2xl border ${cls} flex flex-col gap-2 ${isPast ? 'opacity-75' : ''}">
            <div class="flex items-start gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-surface-container-lowest border border-outline-variant/25 text-primary flex items-center justify-center flex-shrink-0">
                ${ico(n.icon || 'notifications', 'text-[17px]')}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <p class="text-xs font-extrabold text-on-surface leading-snug">${esc(n.title)}</p>
                  ${n.groupedCount ? `<span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">${n.groupedCount}</span>` : ''}
                </div>
                <p class="text-[11px] text-on-surface-variant mt-0.5">${esc(n.body)}</p>
              </div>
              <button onclick="dismissNotificationKey('${n.dedupe_key}')" title="Descartar" class="text-outline hover:text-tertiary p-0.5">${ico('close', 'text-[14px]')}</button>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-outline-variant/15">
              ${!isPast ? `<button onclick="markNotificationRead('${n.dedupe_key}')" class="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant text-[11px] font-bold">✓ Leída</button>` : ''}
              ${n.secondaryLabel ? `<button onclick="${n.secondaryCode}" class="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant text-[11px] font-bold">${esc(n.secondaryLabel)}</button>` : ''}
              ${n.actionLabel ? `<button onclick="${n.actionCode}" class="px-3 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-extrabold">${esc(n.actionLabel)}</button>` : ''}
            </div>
          </div>`;
      };

      let bodyHtml = '';

      if (activeNotifTab === 'new') {
        if (unread.length > 0) {
          bodyHtml = `
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="text-on-surface-variant font-bold">${quietNow ? '🌙 Horas de silencio activas' : 'Avisos inteligentes agrupados'}</span>
              <button onclick="markAllNotificationsRead()" class="font-extrabold text-primary hover:underline">Marcar todas leídas</button>
            </div>
            <div class="flex flex-col gap-2.5">
              ${unread.map(n => renderCard(n, false)).join('')}
            </div>
          `;
        } else {
          bodyHtml = `
            <div class="p-8 text-center flex flex-col items-center gap-2 text-on-surface-variant">
              <span class="w-12 h-12 rounded-2xl bg-secondary/12 text-secondary flex items-center justify-center">${ico('notifications_off', 'text-[24px]')}</span>
              <p class="font-extrabold text-sm text-on-surface">Todo tranquilo por aquí 🌤</p>
              <p class="text-xs">No tienes avisos nuevos pendientes ahora mismo.</p>
            </div>`;
        }
      } else if (activeNotifTab === 'past') {
        bodyHtml = read.length > 0
          ? `<div class="flex flex-col gap-2.5">${read.map(n => renderCard(n, true)).join('')}</div>`
          : `<p class="py-10 text-center text-xs text-on-surface-variant">Aún no hay avisos anteriores leídos.</p>`;
      } else {
        // Preferences Matrix + Quiet Hours + Local Push opt-in
        const pushPerm = window.__CLARIDAD_IOS_NATIVE__
          ? 'Nativo iOS'
          : (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
        bodyHtml = `
          <div class="flex flex-col gap-3">
            <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-extrabold text-on-surface">🌙 Horas de silencio</p>
                  <p class="text-[11px] text-on-surface-variant">Sin avisos push durante tu descanso</p>
                </div>
                <input type="checkbox" ${prefs.quietEnabled ? 'checked' : ''} onchange="updateQuietHoursPref({ quietEnabled: this.checked })" class="w-4 h-4 rounded text-primary"/>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <label class="flex flex-col gap-1">
                  <span class="text-[10px] font-bold text-on-surface-variant">Desde (hora)</span>
                  <input type="number" min="0" max="23" value="${prefs.quietStart}" onchange="updateQuietHoursPref({ quietStart: parseInt(this.value,10)||22 })" class="px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 font-extrabold text-on-surface"/>
                </label>
                <label class="flex flex-col gap-1">
                  <span class="text-[10px] font-bold text-on-surface-variant">Hasta (hora)</span>
                  <input type="number" min="0" max="23" value="${prefs.quietEnd}" onchange="updateQuietHoursPref({ quietEnd: parseInt(this.value,10)||8 })" class="px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 font-extrabold text-on-surface"/>
                </label>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/35 flex flex-col gap-2">
              <p class="text-xs font-extrabold text-on-surface">Matriz de preferencias por canal</p>
              ${NOTIF_CATEGORIES.map(c => {
                const ch = prefs.channels[c.id] || { inApp: true, push: false };
                return `
                  <div class="py-2 border-t border-outline-variant/20 first:border-0 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-on-surface truncate">${esc(c.label)}</p>
                      <p class="text-[10px] text-on-surface-variant leading-tight">${esc(c.desc)}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 text-[10px] font-extrabold">
                      <label class="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" ${ch.inApp ? 'checked' : ''} onchange="updateNotifChannelPref('${c.id}','inApp',this.checked)" class="rounded text-primary"/> App
                      </label>
                      <label class="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" ${ch.push ? 'checked' : ''} onchange="updateNotifChannelPref('${c.id}','push',this.checked)" class="rounded text-secondary"/> Push
                      </label>
                    </div>
                  </div>`;
              }).join('')}
            </div>

            <button onclick="requestLocalPushPermission()" class="w-full py-2.5 px-3 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale">
              🔔 Activar notificaciones locales (${esc(String(pushPerm))})
            </button>
          </div>
        `;
      }

      box.innerHTML = tabsHtml + bodyHtml;
    }
