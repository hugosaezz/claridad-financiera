    // ============================================================================
    // 10. VIEW 3: DEUDAS & GRUPOS (Dedicated Separate Workspace: Me deben, Debo, Grupos)
    // ============================================================================
    function renderCuentasView() {
      const el = $('#view-cuentas');
      if (!el) return;

      const userName = currentLoggedUserName();
      const p2p = computeP2PMetrics();
      const currGroup = sbGrupos.find(g => String(g.id) === String(currentGroupId));
      const groupName = currGroup ? currGroup.nombre : "General";
      const isFantasy = groupName.toLowerCase().includes('fantasy');
      const isDeudas = groupName.toLowerCase().includes('deuda');
      const isGeneral = Number(currentGroupId) === 1 || Number(currentGroupId) === Number(window.generalGroupId);
      const canManageGroup = isAdmin || (currGroup && Number(currGroup.admin_id) === Number(loggedUserId));

      // Pending notifications alert banner for Admin if any
      const pendingPayments = sbMovimientos.filter(m => m.tipo === 'pago' && m.estado === 'pendiente');
      const pendingBannerHtml = (isAdmin && pendingPayments.length > 0) ? `
        <div class="bento-card p-4 rounded-2xl border-l-4 border-l-amber-500 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined">notifications_active</span>
            </span>
            <div>
              <h4 class="font-label-lg text-sm font-bold text-on-surface">Tienes ${pendingPayments.length} pago${pendingPayments.length === 1 ? '' : 's'} pendiente${pendingPayments.length === 1 ? '' : 's'} de confirmar en ${esc(groupName)}</h4>
              <p class="font-body-sm text-xs text-on-surface-variant">Confirma la recepción del Bizum o efectivo para descontar la deuda</p>
            </div>
          </div>
          <button onclick="toggleNotificationsDrawer()" class="px-3.5 py-2 rounded-xl bg-amber-500 text-white font-label-md text-xs font-bold hover:bg-amber-600 transition self-start sm:self-auto active-scale">
            Revisar pagos
          </button>
        </div>
      ` : '';

      // Top Executive Debt KPI Bento Grid (Stitch Design — Separated into Deudas)
      const debtKpiHeaderHtml = `
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- KPI 1: TOTAL ME DEBEN -->
          <div onclick="activeP2PTab='owed'; renderCuentasView()" class="col-span-1 bento-card p-4 rounded-2xl flex flex-col justify-between cursor-pointer active-scale ${activeP2PTab === 'owed' ? 'ring-2 ring-secondary' : ''}">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-[10px] tracking-wider text-on-surface-variant font-extrabold uppercase">TOTAL ME DEBEN</span>
              <span class="w-7 h-7 rounded-full bg-secondary-fixed/60 text-secondary flex items-center justify-center">
                <span class="material-symbols-outlined text-[16px]">arrow_downward</span>
              </span>
            </div>
            <div>
              <p class="font-display-currency-mobile text-[25px] sm:text-[28px] leading-8 font-extrabold text-secondary tracking-tight tabular-nums">+${fmt(p2p.totalMeDeben)}</p>
              <span class="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-secondary px-2 py-0.5 rounded-full bg-secondary/10">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                ${p2p.countMeDeben} cobro${p2p.countMeDeben === 1 ? '' : 's'} (${p2p.cloudOwedCount} grupo • ${p2p.localOwedCount} P2P)
              </span>
            </div>
          </div>

          <!-- KPI 2: TOTAL QUE DEBO -->
          <div onclick="activeP2PTab='owe'; renderCuentasView()" class="col-span-1 bento-card p-4 rounded-2xl flex flex-col justify-between cursor-pointer active-scale ${activeP2PTab === 'owe' ? 'ring-2 ring-tertiary' : ''}">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-[10px] tracking-wider text-on-surface-variant font-extrabold uppercase">TOTAL QUE DEBO</span>
              <span class="w-7 h-7 rounded-full bg-tertiary-fixed/60 text-tertiary flex items-center justify-center">
                <span class="material-symbols-outlined text-[16px]">arrow_upward</span>
              </span>
            </div>
            <div>
              <p class="font-display-currency-mobile text-[25px] sm:text-[28px] leading-8 font-extrabold text-tertiary tracking-tight tabular-nums">−${fmt(p2p.totalQueDebo)}</p>
              <span class="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-tertiary px-2 py-0.5 rounded-full bg-tertiary/10">
                <span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                ${p2p.countQueDebo} pago${p2p.countQueDebo === 1 ? '' : 's'} (${p2p.cloudOweCount} grupo • ${p2p.localOweCount} P2P)
              </span>
            </div>
          </div>

          <!-- KPI 3: BALANCE NETO P2P (2 cols) -->
          <div class="col-span-2 hero-indigo text-on-primary p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-3 relative overflow-hidden">
            <div class="flex items-start justify-between gap-2 relative z-10">
              <div class="flex flex-col">
                <span class="font-label-sm text-[10px] text-on-primary-container font-bold tracking-wider uppercase">BALANCE NETO DE DEUDAS (${esc(userName.toUpperCase())})</span>
                <div class="flex items-baseline gap-2 mt-0.5">
                  <span class="font-display-currency-mobile text-[30px] leading-9 font-extrabold text-white tabular-nums">${fmtSigned(p2p.balanceNeto)}</span>
                  <span class="font-body-sm text-xs text-on-primary-container">${p2p.balanceNeto >= 0 ? 'a tu favor' : 'por saldar'}</span>
                </div>
              </div>
              <div class="bg-white/15 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-right">
                <span class="font-label-sm text-xs text-white font-extrabold flex items-center justify-end gap-1">
                  <span class="material-symbols-outlined text-[16px]">${p2p.balanceNeto >= 0 ? 'verified' : 'schedule'}</span>
                  ${p2p.balanceNeto >= 0 ? 'Saneado' : 'Pendiente'}
                </span>
                <p class="font-body-sm text-[11px] text-on-primary-container">${p2p.balanceNeto >= 0 ? 'Cobros cubren deudas' : 'Tienes pagos por saldar'}</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15 relative z-10">
              <button onclick="openP2PDebtModal('owed')" class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-label-md text-xs font-bold transition flex items-center gap-1 active-scale">
                <span class="material-symbols-outlined text-[15px]">arrow_downward</span>
                + Me deben
              </button>
              <button onclick="openP2PDebtModal('owe')" class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-label-md text-xs font-bold transition flex items-center gap-1 active-scale">
                <span class="material-symbols-outlined text-[15px]">arrow_upward</span>
                + Debo
              </button>
              <button onclick="openSplitBillModal()" class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-label-md text-xs font-bold transition flex items-center gap-1 active-scale">
                <span class="material-symbols-outlined text-[15px]">call_split</span>
                Dividir ticket
              </button>
            </div>
          </div>
        </section>
      `;

      // Sub-view content according to activeP2PTab
      let tabContentHtml = '';

      if (activeP2PTab === 'owed') {
        // TAB 1: ME DEBEN (Both personal P2P loans AND group members who owe this user in groups they administer)
        const cloudOwedCards = p2p.cloudOwedItems.map(item => `
          <div class="bento-card p-3.5 rounded-2xl flex flex-col gap-3">
            <div class="flex items-start justify-between gap-2">
              <div onclick="openCloudUserDetailsModal(${item.usuario_id}, '${esc(item.usuario_nombre)}')" class="flex items-center gap-3 cursor-pointer min-w-0">
                <div class="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                  ${initials(item.usuario_nombre)}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <h4 class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(item.usuario_nombre)}</h4>
                    <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">☁️ Grupo ${esc(item.grupo_nombre)}</span>
                  </div>
                  <p class="font-body-sm text-xs text-on-surface-variant truncate">Deuda pendiente en grupo compartido</p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="font-headline-sm text-[17px] font-extrabold text-secondary tabular-nums">+${fmt(item.deuda)}</span>
                <div class="mt-0.5">
                  <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Te debe</span>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
              <button onclick="sendIndividualWhatsAppClaim('${esc(item.usuario_nombre)}', ${item.deuda}, 'Grupo ${esc(item.grupo_nombre)}')" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-tertiary/10 text-tertiary font-label-md text-xs font-bold hover:bg-tertiary/20 transition active-scale">
                <span class="material-symbols-outlined text-[15px]">send</span>
                Reclamar por Bizum
              </button>
              <button onclick="changeSupabaseGroup('${item.grupo_id}'); openCloudPaymentModal(${item.usuario_id}, '${esc(item.usuario_nombre)}', ${item.deuda})" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-secondary/10 text-secondary font-label-md text-xs font-bold hover:bg-secondary/20 transition active-scale">
                <span class="material-symbols-outlined text-[15px]">check_circle</span>
                Marcar cobrado
              </button>
            </div>
          </div>
        `).join('');

        const localOwedCards = p2p.localOwed.map(d => renderPersonalDebtCard(d)).join('');
        const settledOwed = (S.debts || []).filter(d => d.settled && d.type === 'owed');

        tabContentHtml = `
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Lo que me deben (${p2p.countMeDeben})</h3>
              <p class="font-body-sm text-xs text-on-surface-variant">Préstamos directos P2P y saldos a tu favor en grupos que administras</p>
            </div>
            <button onclick="openP2PDebtModal('owed')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-on-secondary font-label-md text-xs font-bold shadow-xs hover:opacity-95 transition active-scale">
              <span class="material-symbols-outlined text-[16px]">add_circle</span>
              + Nuevo «Me deben»
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${localOwedCards}
            ${cloudOwedCards}
            ${(p2p.countMeDeben === 0) ? `
              <div class="col-span-2 bento-card p-8 rounded-2xl text-center flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-4xl text-secondary">task_alt</span>
                <p class="font-label-lg text-base font-bold text-on-surface">Nadie te debe dinero ahora mismo</p>
                <p class="font-body-sm text-xs text-on-surface-variant">Cuando prestes dinero o adelantes un pago a un amigo, regístralo aquí con «+ Nuevo Me deben».</p>
              </div>
            ` : ''}
          </div>

          ${settledOwed.length > 0 ? renderSettledDebtsListHtml(settledOwed, 'Cobros saldados recientemente') : ''}
        `;
      } else if (activeP2PTab === 'owe') {
        // TAB 2: DEBO (Both what this logged-in user owes in Supabase groups AND their personal P2P 'Debo' items)
        const cloudOweCards = p2p.cloudOweItems.map(item => `
          <div class="bento-card p-3.5 rounded-2xl flex flex-col gap-3 border-l-4 border-l-tertiary">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                  <span class="material-symbols-outlined text-[20px]">groups</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <h4 class="font-label-lg text-sm font-bold text-on-surface truncate">Grupo ${esc(item.grupo_nombre)}</h4>
                    <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">☁️ Supabase</span>
                  </div>
                  <p class="font-body-sm text-xs text-on-surface-variant truncate">Pendiente de pagar a <strong>${esc(item.acreedor_nombre)}</strong></p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="font-headline-sm text-[17px] font-extrabold text-tertiary tabular-nums">−${fmt(item.deuda)}</span>
                <div class="mt-0.5">
                  <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">Por pagar</span>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
              <button onclick="activeP2PTab='cloud'; changeSupabaseGroup('${item.grupo_id}')" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition active-scale">
                <span class="material-symbols-outlined text-[15px]">visibility</span>
                Ver grupo
              </button>
              <button onclick="changeSupabaseGroup('${item.grupo_id}'); openCloudPaymentModal(${item.usuario_id}, '${esc(item.usuario_nombre)}', ${item.deuda})" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition active-scale">
                <span class="material-symbols-outlined text-[15px]">check_circle</span>
                Notificar pago
              </button>
            </div>
          </div>
        `).join('');

        const localOweCards = p2p.localOwe.map(d => renderPersonalDebtCard(d)).join('');
        const settledOwe = (S.debts || []).filter(d => d.settled && d.type === 'owe');

        tabContentHtml = `
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Lo que debo pagar (${p2p.countQueDebo})</h3>
              <p class="font-body-sm text-xs text-on-surface-variant">Tus deudas pendientes en grupos de Supabase y cuentas personales P2P</p>
            </div>
            <button onclick="openP2PDebtModal('owe')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-tertiary text-on-tertiary font-label-md text-xs font-bold shadow-xs hover:opacity-95 transition active-scale">
              <span class="material-symbols-outlined text-[16px]">add_circle</span>
              + Nuevo «Debo»
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${cloudOweCards}
            ${localOweCards}
            ${(p2p.countQueDebo === 0) ? `
              <div class="col-span-2 bento-card p-8 rounded-2xl text-center flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-4xl text-secondary">verified</span>
                <p class="font-label-lg text-base font-bold text-on-surface">¡No debes nada a nadie!</p>
                <p class="font-body-sm text-xs text-on-surface-variant">Estás al día tanto en los grupos compartidos como en tus cuentas personales.</p>
              </div>
            ` : ''}
          </div>

          ${settledOwe.length > 0 ? renderSettledDebtsListHtml(settledOwe, 'Deudas saldadas recientemente') : ''}
        `;
      } else if (activeP2PTab === 'cloud') {
        // TAB 3: GRUPOS CLOUD SUPABASE
        const groupPillsHtml = sbGrupos.map(g => {
          const active = String(g.id) === String(currentGroupId);
          const icon = g.nombre.toLowerCase().includes('fantasy') ? 'sports_soccer' : g.nombre.toLowerCase().includes('deuda') ? 'local_fire_department' : 'music_note';
          return `
            <button onclick="changeSupabaseGroup('${g.id}')" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-label-md text-xs font-bold transition-all active-scale flex-shrink-0 ${active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'}">
              <span class="material-symbols-outlined text-[16px]">${icon}</span>
              ${esc(g.nombre)}
            </button>`;
        }).join('');

        let bannerHtml = '';
        if (isFantasy) {
          bannerHtml = `
            <div class="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-2xl">sports_soccer</span>
                </span>
                <div>
                  <span class="text-[11px] uppercase font-extrabold tracking-wider text-orange-100">Liga Fantasy • Castigo Jornada</span>
                  <h3 class="font-headline-sm text-lg font-extrabold">El último de la jornada paga 5,00 € al bote</h3>
                </div>
              </div>
              ${canManageGroup ? `
                <button onclick="openGlobalChargeModal()" class="px-3.5 py-2 rounded-xl bg-white text-orange-700 font-label-md text-xs font-extrabold hover:bg-orange-50 transition self-start sm:self-auto active-scale">
                  + Aplicar cargo
                </button>` : ''}
            </div>`;
        } else if (isDeudas) {
          bannerHtml = `
            <div class="bg-gradient-to-r from-rose-600 to-red-700 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-2xl">warning</span>
                </span>
                <div>
                  <span class="text-[11px] uppercase font-extrabold tracking-wider text-rose-100">Zona de Morosos • Cuentas Hugo</span>
                  <h3 class="font-headline-sm text-lg font-extrabold">El que avisa no es traidor, ¡saldad cuentas!</h3>
                </div>
              </div>
              ${canManageGroup ? `
                <button onclick="sendGroupWhatsAppReminder()" class="px-3.5 py-2 rounded-xl bg-white text-rose-700 font-label-md text-xs font-extrabold hover:bg-rose-50 transition self-start sm:self-auto active-scale">
                  Reclamar al grupo
                </button>` : ''}
            </div>`;
        } else {
          bannerHtml = `
            <div class="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-2xl">autorenew</span>
                </span>
                <div>
                  <span class="text-[11px] uppercase font-extrabold tracking-wider text-emerald-100">Grupo Compartido • ${esc(groupName)}</span>
                  <h3 class="font-headline-sm text-lg font-extrabold">${isGeneral ? 'Cobro automático Spotify día 30 de cada mes (21,00 €)' : 'Gestión de pagos y deudas compartidas en tiempo real'}</h3>
                </div>
              </div>
              ${canManageGroup ? `
                <button onclick="openGlobalChargeModal()" class="px-3.5 py-2 rounded-xl bg-white text-emerald-800 font-label-md text-xs font-extrabold hover:bg-emerald-50 transition self-start sm:self-auto active-scale">
                  + Repartir Gasto
                </button>` : ''}
            </div>`;
        }

        const sortedMembers = [...sbUsuariosGrupo].sort((a, b) => parseFloat(b.deuda || 0) - parseFloat(a.deuda || 0));
        const totalDeudaGrupo = sortedMembers.reduce((a, u) => a + parseFloat(u.deuda || 0), 0);

        const timelineHtml = sbMovimientos.slice(0, 20).map(mov => {
          const u = sbGlobalUsers.find(x => Number(x.id) === Number(mov.usuario_id));
          const uName = u ? u.nombre : 'Miembro';
          const isCargo = mov.tipo === 'cargo';
          const isPend = mov.estado === 'pendiente';
          const dt = mov.created_at ? fmtDay(mov.created_at.slice(0, 10)) : '';
          return `
            <div class="p-3.5 flex items-center justify-between gap-3 hover:bg-surface-container-low/50 transition">
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCargo ? 'bg-tertiary/10 text-tertiary' : isPend ? 'bg-amber-500/15 text-amber-600' : 'bg-secondary/10 text-secondary'}">
                  <span class="material-symbols-outlined text-[18px]">${isCargo ? 'receipt' : isPend ? 'schedule' : 'paid'}</span>
                </span>
                <div class="min-w-0">
                  <p class="font-label-lg text-sm font-bold text-on-surface truncate">
                    ${isCargo ? esc(mov.concepto || 'Cargo') : `Pago de ${esc(uName)}`}
                    ${isPend ? `<span class="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold">Pendiente</span>` : ''}
                  </p>
                  <p class="font-body-sm text-xs text-on-surface-variant">${dt} • ${esc(uName)} • ${esc(mov.categoria || 'General')}</p>
                </div>
              </div>
              <span class="font-headline-sm text-sm font-extrabold tabular-nums flex-shrink-0 ${isCargo ? 'text-tertiary' : 'text-secondary'}">
                ${isCargo ? '+' : '−'}${fmt(mov.monto)}
              </span>
            </div>`;
        }).join('') || `<div class="p-6 text-center text-on-surface-variant text-sm">Sin movimientos en el historial de este grupo.</div>`;

        tabContentHtml = `
          <div class="flex items-center justify-between gap-2 overflow-x-auto custom-scroll pb-1">
            <div class="flex items-center gap-2">
              ${groupPillsHtml}
              <button onclick="openNewGroupModal()" class="flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-container-low text-primary font-label-md text-xs font-bold hover:bg-surface-container transition flex-shrink-0">
                <span class="material-symbols-outlined text-[16px]">add</span>
                Crear Grupo Cloud
              </button>
            </div>
          </div>

          ${bannerHtml}

          <div class="bento-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="font-label-sm text-[10px] uppercase font-extrabold text-on-surface-variant">DEUDA TOTAL EN ${esc(groupName.toUpperCase())}</span>
              <div class="flex items-baseline gap-2">
                <h3 class="font-display-currency-mobile text-2xl font-extrabold text-on-surface tabular-nums">${fmt(totalDeudaGrupo)}</h3>
                <span class="text-xs text-on-surface-variant font-medium">• ${sortedMembers.length} miembros</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              ${canManageGroup ? `
                <button onclick="openGlobalChargeModal()" class="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs hover:bg-primary-container transition active-scale">
                  <span class="material-symbols-outlined text-[16px]">calculate</span>
                  Repartir Gasto
                </button>
                <button onclick="openAddCloudMemberModal()" class="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs font-bold hover:bg-surface-container transition active-scale">
                  <span class="material-symbols-outlined text-[16px]">person_add</span>
                  + Miembro
                </button>
                <button onclick="sendGroupWhatsAppReminder()" class="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary/10 text-secondary font-label-md text-xs font-bold hover:bg-secondary/20 transition active-scale">
                  <span class="material-symbols-outlined text-[16px]">chat</span>
                  WhatsApp
                </button>
                <button onclick="resetAllCloudGroupDebts()" class="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-label-md text-xs font-bold hover:bg-amber-500/25 transition active-scale">
                  <span class="material-symbols-outlined text-[16px]">done_all</span>
                  Liquidar
                </button>
                ${(!isGeneral || isAdmin) ? `
                  <button onclick="deleteCurrentCloudGroup()" class="p-2 rounded-xl bg-tertiary/10 text-tertiary hover:bg-tertiary/20 transition active-scale" title="Eliminar grupo">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>` : ''}
              ` : ''}
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div class="lg:col-span-7 flex flex-col gap-2.5">
              <div class="flex items-center justify-between px-1">
                <h3 class="font-headline-sm text-sm font-extrabold text-on-surface">Estado de Miembros (${sortedMembers.length})</h3>
                <span class="text-xs text-on-surface-variant">Ordenado por deuda pendiente</span>
              </div>
              ${sortedMembers.map((u, idx) => renderCloudMemberCard(u, idx)).join('') || `
                <div class="bento-card p-8 rounded-2xl text-center text-on-surface-variant text-sm">No hay miembros en este grupo todavía.</div>
              `}
            </div>

            <div class="lg:col-span-5 bento-card rounded-2xl overflow-hidden">
              <div class="px-4 py-3 border-b border-outline-variant/25 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary text-[18px]">history</span>
                  <h3 class="font-label-lg text-sm font-bold text-on-surface">Historial Cloud (${esc(groupName)})</h3>
                </div>
                ${canManageGroup ? `<button onclick="hardResetCloudHistory()" class="text-[11px] text-tertiary font-bold hover:underline">Reset Historial</button>` : ''}
              </div>
              <div class="divide-y divide-outline-variant/20 max-h-[540px] overflow-y-auto">
                ${timelineHtml}
              </div>
            </div>
          </div>
        `;
      } else {
        // TAB 4: REPARTO TRICOUNT
        const localGroupsHtml = (S.groups || []).map(g => {
          const bal = computeLocalGroupBalances(g);
          const plan = computeMinimumSettlementPlan(bal);
          const tot = (g.items || []).reduce((a, i) => a + Number(i.amount || 0), 0);
          return `
            <div class="bento-card p-4 rounded-2xl flex flex-col gap-3">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-headline-sm text-base font-extrabold text-on-surface">${esc(g.name)}</h4>
                  <p class="font-body-sm text-xs text-on-surface-variant">${g.members.length} participantes • ${(g.items || []).length} tickets • Total ${fmt(tot)}</p>
                </div>
                <button onclick="openLocalGroupDetailModal('${g.id}')" class="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-label-md text-xs font-bold hover:bg-primary/20 transition">
                  Gestionar tickets
                </button>
              </div>
              <div class="bg-surface-container-low p-3 rounded-xl flex flex-col gap-1.5">
                <span class="font-label-sm text-[10px] uppercase font-extrabold text-on-surface-variant">Liquidación óptima (mínimo de Bizums)</span>
                ${plan.length > 0 ? plan.map(p => `
                  <div class="flex items-center justify-between text-xs py-1 border-b border-outline-variant/20 last:border-0">
                    <span class="font-semibold text-on-surface">${esc(p.from)} <span class="text-primary font-extrabold">→ paga a →</span> ${esc(p.to)}</span>
                    <strong class="font-extrabold text-secondary tabular-nums">${fmt(p.amount)}</strong>
                  </div>
                `).join('') : `<span class="text-xs text-secondary font-bold">✓ Todas las cuentas cuadradas</span>`}
              </div>
            </div>
          `;
        }).join('');

        tabContentHtml = `
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Divisor de Tickets &amp; Botes Multi-Pagador</h3>
              <p class="font-body-sm text-xs text-on-surface-variant">Calcula quién debe a quién con el mínimo número de transferencias</p>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="openSplitBillModal()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs font-bold hover:bg-surface-container transition active-scale">
                <span class="material-symbols-outlined text-[16px]">call_split</span>
                Dividir 1 ticket
              </button>
              <button onclick="openNewLocalGroupModal()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs hover:bg-primary-container transition active-scale">
                <span class="material-symbols-outlined text-[16px]">group_add</span>
                + Nuevo Bote/Viaje
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${localGroupsHtml || `<div class="col-span-2 bento-card p-8 rounded-2xl text-center text-xs text-on-surface-variant">No has creado botes Tricount todavía.</div>`}
          </div>
        `;
      }

      el.innerHTML = `
        ${pendingBannerHtml}
        ${debtKpiHeaderHtml}

        <!-- 4-Way Segmented Control in Deudas -->
        <div class="grid grid-cols-2 sm:grid-cols-4 bg-surface-container p-1 rounded-2xl gap-1">
          <button onclick="activeP2PTab='owed'; renderCuentasView()" class="py-2.5 px-3 rounded-xl font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${activeP2PTab === 'owed' ? 'font-extrabold bg-surface-container-lowest text-secondary shadow-xs' : 'font-semibold text-on-surface-variant hover:text-on-surface'}">
            <span class="material-symbols-outlined text-[16px]">arrow_downward</span>
            Me deben (${p2p.countMeDeben})
          </button>
          <button onclick="activeP2PTab='owe'; renderCuentasView()" class="py-2.5 px-3 rounded-xl font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${activeP2PTab === 'owe' ? 'font-extrabold bg-surface-container-lowest text-tertiary shadow-xs' : 'font-semibold text-on-surface-variant hover:text-on-surface'}">
            <span class="material-symbols-outlined text-[16px]">arrow_upward</span>
            Debo (${p2p.countQueDebo})
          </button>
          <button onclick="activeP2PTab='cloud'; renderCuentasView()" class="py-2.5 px-3 rounded-xl font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${activeP2PTab === 'cloud' ? 'font-extrabold bg-surface-container-lowest text-primary shadow-xs' : 'font-semibold text-on-surface-variant hover:text-on-surface'}">
            <span class="material-symbols-outlined text-[16px]">cloud_done</span>
            Grupos Cloud (${sbGrupos.length})
          </button>
          <button onclick="activeP2PTab='split'; renderCuentasView()" class="py-2.5 px-3 rounded-xl font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${activeP2PTab === 'split' ? 'font-extrabold bg-surface-container-lowest text-primary shadow-xs' : 'font-semibold text-on-surface-variant hover:text-on-surface'}">
            <span class="material-symbols-outlined text-[16px]">call_split</span>
            Reparto Tricount (${(S.groups || []).length})
          </button>
        </div>

        ${tabContentHtml}
      `;
    }

    function renderSettledDebtsListHtml(settledList, title) {
      return `
        <div class="bento-card rounded-2xl overflow-hidden mt-2">
          <div class="px-4 py-3 border-b border-outline-variant/25 flex justify-between items-center">
            <span class="font-label-lg text-xs font-bold text-on-surface-variant uppercase">${esc(title)} (${settledList.length})</span>
          </div>
          <div class="divide-y divide-outline-variant/20">
            ${settledList.map(d => `
              <div class="p-3.5 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center">
                    <span class="material-symbols-outlined text-[16px]">check</span>
                  </span>
                  <div>
                    <p class="font-label-lg text-sm font-bold text-on-surface">${esc(d.person)}</p>
                    <p class="font-body-sm text-xs text-on-surface-variant">${esc(d.note || 'Cuenta saldada')}</p>
                  </div>
                </div>
                <button onclick="deleteP2PDebt('${d.id}')" class="p-1.5 text-outline hover:text-error">
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    function computeLocalGroupBalances(g) {
      const bal = {};
      (g.members || []).forEach(m => bal[m] = 0);
      (g.items || []).forEach(it => {
        const who = (it.for || []).filter(m => g.members.includes(m));
        if (!who.length) return;
        const share = it.amount / who.length;
        bal[it.payer] = (bal[it.payer] || 0) + it.amount;
        who.forEach(m => bal[m] = (bal[m] || 0) - share);
      });
      return bal;
    }

    function computeMinimumSettlementPlan(bal) {
      const cred = Object.entries(bal).filter(([_, v]) => v > 0.005).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v);
      const debt = Object.entries(bal).filter(([_, v]) => v < -0.005).map(([n, v]) => ({ n, v: -v })).sort((a, b) => b.v - a.v);
      const out = [];
      let i = 0, j = 0, guard = 0;
      while (i < cred.length && j < debt.length && guard < 50) {
        guard++;
        const a = Math.min(cred[i].v, debt[j].v);
        out.push({ from: debt[j].n, to: cred[i].n, amount: Math.round(a * 100) / 100 });
        cred[i].v -= a;
        debt[j].v -= a;
        if (cred[i].v < 0.005) i++;
        if (debt[j].v < 0.005) j++;
      }
      return out;
    }

    // ============================================================================
    // 11. VIEW 2: MOVIMIENTOS DEL MES (Personal Expenses & Incomes Ledger)
    // ============================================================================
    function renderGastosView() {
      const el = $('#view-gastos');
      if (!el) return;

      const exps = monthExpenses(viewMk).map(e => ({ ...e, _k: "exp" }));
      const incs = incomeRows(viewMk).map(i => ({ ...i, _k: "inc" }));
      let all = [...exps, ...incs].sort((a, b) => b.date.localeCompare(a.date));

      if (movFilter.type === "exp") all = all.filter(x => x._k === "exp");
      if (movFilter.type === "inc") all = all.filter(x => x._k === "inc");
      if (movFilter.type === "refund") all = all.filter(x => x._k === "exp" && x.refund);
      if (movFilter.cat) all = all.filter(x => x._k === "exp" && x.cat === movFilter.cat);
      if (movFilter.tag) all = all.filter(x => x._k === "exp" && tagsOf(x.note).includes(movFilter.tag));
      if (movFilter.method) all = all.filter(x => x._k === "exp" && x.method === movFilter.method);
      if (movFilter.q) {
        const q = movFilter.q.toLowerCase();
        all = all.filter(x => ((x.note || "") + " " + (x.source || "") + " " + catById(x.cat).name).toLowerCase().includes(q));
      }

      const tExp = sumExp(all.filter(x => x._k === "exp"));
      const tInc = all.filter(x => x._k === "inc").reduce((a, x) => a + Number(x.amount || 0), 0);

      const tagSet = new Set();
      (S.expenses || []).forEach(e => tagsOf(e.note).forEach(t => tagSet.add(t)));
      const allTagsList = [...tagSet].sort();

      const rowsHtml = all.map(x => {
        if (x._k === "exp") return renderExpenseRow(x);
        const ic = incById(x.cat);
        return `
          <div ${x.auto ? `onclick="switchMainView('ajustes','ingresos')"` : `onclick="openTxModal('inc', '${x.id}')"`} class="p-3.5 flex items-center justify-between hover:bg-surface-container-low/60 transition cursor-pointer gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-[20px]">${ic.icon}</span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(x.source || ic.name)}</p>
                  ${x.auto ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Automática</span>` : ''}
                </div>
                <p class="font-body-sm text-xs text-on-surface-variant">${fmtDay(x.date)} • ${esc(ic.name)}</p>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="font-headline-sm text-[15px] font-extrabold text-secondary tabular-nums">+${fmt(x.amount)}</span>
              <p class="font-label-sm text-[10px] text-secondary uppercase">Ingreso</p>
            </div>
          </div>`;
      }).join('') || `
        <div class="p-10 text-center text-on-surface-variant text-sm">
          No hay movimientos que coincidan con este filtro.
        </div>`;

      el.innerHTML = `
        <div class="grid grid-cols-3 gap-2.5">
          <button onclick="openTxModal('exp')" class="bento-card p-3.5 rounded-2xl flex items-center gap-3 hover:bg-surface-container-low transition active-scale text-left">
            <span class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined">add_shopping_cart</span>
            </span>
            <div>
              <p class="font-label-lg text-xs font-extrabold text-on-surface">+ Nuevo Gasto</p>
              <p class="text-[11px] text-on-surface-variant hidden sm:block">Manual o #etiqueta</p>
            </div>
          </button>

          <button onclick="openTxModal('inc')" class="bento-card p-3.5 rounded-2xl flex items-center gap-3 hover:bg-surface-container-low transition active-scale text-left">
            <span class="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined">payments</span>
            </span>
            <div>
              <p class="font-label-lg text-xs font-extrabold text-on-surface">+ Nuevo Ingreso</p>
              <p class="text-[11px] text-on-surface-variant hidden sm:block">Extra, Bizum, venta</p>
            </div>
          </button>

          <button onclick="openTxModal('exp', null, true)" class="bento-card p-3.5 rounded-2xl flex items-center gap-3 hover:bg-surface-container-low transition active-scale text-left">
            <span class="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined">mic</span>
            </span>
            <div>
              <p class="font-label-lg text-xs font-extrabold text-on-surface">Dictar por Voz</p>
              <p class="text-[11px] text-on-surface-variant hidden sm:block">«14 euros de menú»</p>
            </div>
          </button>
        </div>

        <div class="bento-card p-4 rounded-2xl flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-headline-sm text-base font-extrabold text-on-surface capitalize">Movimientos • ${monthLabel(viewMk)}</h2>
            <div class="flex items-center gap-3 text-xs font-extrabold tabular-nums">
              <span class="text-secondary">Ingresos: +${fmt(tInc)}</span>
              <span class="text-tertiary">Gastos: −${fmt(tExp)}</span>
              <span class="px-2 py-0.5 rounded-lg ${tInc - tExp >= 0 ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'}">Neto: ${fmtSigned(tInc - tExp)}</span>
            </div>
          </div>

          <div class="relative">
            <span class="material-symbols-outlined absolute left-3.5 top-2.5 text-outline text-[20px]">search</span>
            <input id="mov-search-input" type="text" value="${esc(movFilter.q)}" oninput="updateMovSearch(this.value)" placeholder="Buscar comercio, concepto o #etiqueta (Mercadona, Spotify, Tagliatella...)" class="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none"/>
          </div>

          <div class="flex items-center gap-2 overflow-x-auto custom-scroll pb-1">
            <button onclick="movFilter.type='all'; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${movFilter.type === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Todos</button>
            <button onclick="movFilter.type='exp'; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${movFilter.type === 'exp' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Solo Gastos</button>
            <button onclick="movFilter.type='inc'; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${movFilter.type === 'inc' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Solo Ingresos</button>
            <button onclick="movFilter.type='refund'; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${movFilter.type === 'refund' ? 'bg-amber-500 text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Devoluciones</button>

            <select onchange="movFilter.cat=this.value; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant/40 text-on-surface flex-shrink-0">
              <option value="">Todas las categorías</option>
              ${allCats().map(c => `<option value="${c.id}" ${movFilter.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>

            <select onchange="movFilter.method=this.value; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant/40 text-on-surface flex-shrink-0">
              <option value="">Método de pago</option>
              ${PAY_METHODS.map(m => `<option value="${m.id}" ${movFilter.method === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
            </select>

            ${allTagsList.length > 0 ? `
              <select onchange="movFilter.tag=this.value; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant/40 text-on-surface flex-shrink-0">
                <option value="">#etiquetas</option>
                ${allTagsList.map(t => `<option value="${esc(t)}" ${movFilter.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
              </select>
            ` : ''}
          </div>
        </div>

        <div class="bento-card rounded-2xl overflow-hidden divide-y divide-outline-variant/20">
          ${rowsHtml}
        </div>
      `;
    }

    function updateMovSearch(val) {
      movFilter.q = val;
      renderGastosView();
      const inp = $('#mov-search-input');
      if (inp) {
        inp.focus();
        try { inp.setSelectionRange(val.length, val.length); } catch (e) {}
      }
    }

    // ============================================================================
    // 12. VIEW 4: ANALÍTICA, SIMULADOR & ASESOR FINANCIERO
    // ============================================================================
    function renderAnaliticaView() {
      const el = $('#view-analitica');
      if (!el) return;

      const mk = viewMk;
      const [Y, M] = mk.split('-').map(Number);
      const exps = monthExpenses(mk);
      const totalExp = sumExp(exps);
      const totalInc = monthIncomeTotal(mk);
      const safe = safeToSpend(mk);
      const scoreObj = finScore(mk);
      const fc = forecast(mk);

      const months6 = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(Y, M - 1 - i, 1);
        months6.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
      }
      const labels6 = months6.map(m => new Date(+m.slice(0, 4), +m.slice(5) - 1, 1).toLocaleString("es-ES", { month: "short" }));
      const expVals6 = months6.map(m => sumExp(monthExpenses(m)));
      const incVals6 = months6.map(m => monthIncomeTotal(m));

      const needSum = sumExp(exps.filter(e => NEEDS.includes(e.cat)));
      const wantSum = sumExp(exps.filter(e => WANTS.includes(e.cat)));
      const pNeed = totalInc > 0 ? (needSum / totalInc) * 100 : 0;
      const pWant = totalInc > 0 ? (wantSum / totalInc) * 100 : 0;
      const pSave = totalInc > 0 ? Math.max(0, ((totalInc - totalExp) / totalInc) * 100) : 0;

      const firstDay = new Date(Y, M - 1, 1);
      const startDow = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(Y, M, 0).getDate();
      const byDay = {};
      exps.forEach(e => { const d = +e.date.slice(8, 10); byDay[d] = (byDay[d] || 0) + e.amount; });
      const upDays = {};
      upcomingRecurring(mk).forEach(r => { if (r.day) upDays[r.day] = (upDays[r.day] || 0) + r.amount; });

      let calCellsHtml = ["L", "M", "X", "J", "V", "S", "D"].map(w => `<div class="text-[11px] font-extrabold text-outline py-1">${w}</div>`).join("");
      for (let i = 0; i < startDow; i++) calCellsHtml += `<div></div>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const hasExp = byDay[d] > 0;
        const hasUp = upDays[d] > 0;
        const styleCls = hasExp
          ? "bg-primary/15 text-primary font-extrabold border border-primary/30"
          : hasUp
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30"
            : "bg-surface-container-low text-on-surface-variant";
        const tip = hasExp ? `Gastado: ${fmt(byDay[d])}` : hasUp ? `Cargo fijo previsto: ${fmt(upDays[d])}` : `Día ${d}`;
        calCellsHtml += `<div class="py-2 rounded-xl text-xs ${styleCls}" title="${esc(tip)}">${d}</div>`;
      }

      const merchMap = {};
      exps.forEach(e => {
        const k = cleanNoteText(e.note);
        if (k) merchMap[k] = (merchMap[k] || 0) + e.amount;
      });
      const topMerchHtml = Object.entries(merchMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amt], idx) => `
        <div class="flex items-center justify-between py-2.5 border-b border-outline-variant/20 last:border-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-6 h-6 rounded-lg bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center flex-shrink-0">${idx + 1}</span>
            <span class="font-label-lg text-sm font-semibold text-on-surface truncate">${esc(name)}</span>
          </div>
          <span class="font-headline-sm text-sm font-extrabold text-on-surface tabular-nums">−${fmt(amt)}</span>
        </div>
      `).join('') || `<p class="text-xs text-on-surface-variant py-4 text-center">Sin comercios registrados este mes.</p>`;

      el.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bento-card p-5 rounded-2xl flex items-center gap-4">
            <div class="flex-shrink-0">
              ${renderScoreRingSVG(scoreObj.score)}
            </div>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Score de Salud Financiera</h3>
              </div>
              <p class="font-body-sm text-xs text-on-surface-variant">${esc(scoreObj.tips[0] || "Excelente gestión mensual y control de presupuesto.")}</p>
              ${scoreObj.tips[1] ? `<p class="font-body-sm text-[11px] text-primary font-semibold">💡 ${esc(scoreObj.tips[1])}</p>` : ''}
            </div>
          </div>

          <div class="bento-card p-5 rounded-2xl flex flex-col justify-between gap-3">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-primary text-[18px]">psychology_alt</span>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">¿Me lo puedo permitir hoy?</h3>
              </div>
              <p class="font-body-sm text-xs text-on-surface-variant">Simula un capricho frente a tu margen disponible (${fmt(safe)})</p>
            </div>
            <div class="flex items-center gap-2">
              <input id="sim-input-price" type="number" step="0.01" placeholder="Importe del capricho (€)" class="flex-1 px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface outline-none focus:border-primary"/>
              <button onclick="runAffordabilitySimulator()" class="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition active-scale">
                Calcular
              </button>
            </div>
            <div id="sim-output-box" class="text-xs font-semibold"></div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Flujo de Caja (Últimos 6 meses)</h3>
              <span class="text-xs font-extrabold ${incVals6.reduce((a, b) => a + b, 0) - expVals6.reduce((a, b) => a + b, 0) >= 0 ? 'text-secondary' : 'text-tertiary'}">
                ${fmtSigned(incVals6.reduce((a, b) => a + b, 0) - expVals6.reduce((a, b) => a + b, 0))}
              </span>
            </div>
            ${renderDualBarsSVG(labels6, incVals6, expVals6)}
          </div>

          <div class="bento-card p-5 rounded-2xl flex flex-col justify-between gap-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Previsión Fin de Mes</h3>
                <p class="text-xs text-on-surface-variant">Ritmo medio: ${fmt(fc.avg)}/día</p>
              </div>
              <span class="font-headline-sm text-lg font-extrabold tabular-nums ${fc.end >= 0 ? 'text-secondary' : 'text-tertiary'}">${fmtSigned(fc.end)}</span>
            </div>
            ${renderSparklineSVG(fc.vals, fc.end >= 0 ? "#006c4a" : "#e11d48")}
            <p class="text-[11px] text-on-surface-variant">Proyección diaria descontando tu ritmo de gasto y tus próximas suscripciones fijas.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bento-card p-5 rounded-2xl flex flex-col gap-3.5">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Regla 50 / 30 / 20</h3>
            ${renderRule503020Row("Necesidades (Vivienda, Comida, Transp.)", pNeed, 50, "#0ea5e9")}
            ${renderRule503020Row("Caprichos y Ocio (Restaur., Compras, Susc.)", pWant, 30, "#8b5cf6")}
            ${renderRule503020Row("Ahorro Neto Mensual", pSave, 20, "#006c4a", true)}
          </div>

          <div class="bento-card p-5 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface capitalize">Calendario • ${monthLabel(mk)}</h3>
              <div class="flex items-center gap-3 text-[11px] font-bold">
                <span class="flex items-center gap-1 text-primary"><span class="w-2.5 h-2.5 rounded-xs bg-primary/30"></span>Gastado</span>
                <span class="flex items-center gap-1 text-amber-600"><span class="w-2.5 h-2.5 rounded-xs bg-amber-500/30"></span>Fijo previsto</span>
              </div>
            </div>
            <div class="grid grid-cols-7 gap-1.5 text-center">
              ${calCellsHtml}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div class="md:col-span-7 bento-card p-5 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">tips_and_updates</span>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Asesor Financiero Inteligente</h3>
            </div>
            <div class="flex flex-col gap-2">
              ${generateSmartAdvisorTipsHtml()}
            </div>
          </div>

          <div class="md:col-span-5 bento-card p-5 rounded-2xl flex flex-col gap-2">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Dónde gastas más</h3>
            ${topMerchHtml}
          </div>
        </div>
      `;
    }

    function runAffordabilitySimulator() {
      const price = parseAmount($('#sim-input-price')?.value);
      const out = $('#sim-output-box');
      if (!out || !(price > 0)) return;
      const safe = safeToSpend(viewMk);
      const rest = safe - price;
      out.innerHTML = rest >= 0
        ? `<div class="p-3 rounded-xl bg-secondary/10 text-secondary flex items-center gap-2">
             <span class="material-symbols-outlined text-[18px]">check_circle</span>
             <span>¡Sí puedes! Te quedarían <strong>${fmt(rest)}</strong> de margen seguro este mes.</span>
           </div>`
        : `<div class="p-3 rounded-xl bg-tertiary/10 text-tertiary flex items-center gap-2">
             <span class="material-symbols-outlined text-[18px]">warning</span>
             <span>Mejor esperar: superarías tu margen seguro por <strong>${fmt(-rest)}</strong>.</span>
           </div>`;
    }

    function renderScoreRingSVG(score) {
      const R = 34, C = 2 * Math.PI * R;
      const col = score >= 70 ? "#006c4a" : score >= 45 ? "#d97706" : "#e11d48";
      return `
        <svg width="88" height="88" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r="${R}" fill="none" stroke="currentColor" class="text-surface-container-high" stroke-width="9"/>
          <circle cx="46" cy="46" r="${R}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(score / 100 * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 46 46)"/>
          <text x="46" y="52" text-anchor="middle" font-size="21" font-weight="800" fill="currentColor" class="text-on-surface">${score}</text>
        </svg>`;
    }

    function renderDualBarsSVG(labels, vInc, vExp) {
      const max = Math.max(...vInc, ...vExp, 1), W = 320, H = 135, bw = W / labels.length, w = (bw - 14) / 2;
      let s = "";
      labels.forEach((lb, i) => {
        const h1 = Math.max(4, (vInc[i] / max) * (H - 28));
        const h2 = Math.max(4, (vExp[i] / max) * (H - 28));
        const x = i * bw + 7;
        s += `<rect x="${x.toFixed(1)}" y="${(H - 18 - h1).toFixed(1)}" width="${w.toFixed(1)}" height="${h1.toFixed(1)}" rx="3" fill="#006c4a"/>
              <rect x="${(x + w + 2).toFixed(1)}" y="${(H - 18 - h2).toFixed(1)}" width="${w.toFixed(1)}" height="${h2.toFixed(1)}" rx="3" fill="#e11d48"/>
              <text x="${(x + bw / 2 - 6).toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" class="text-outline">${lb}</text>`;
      });
      return `
        <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${s}</svg>
        <div class="flex justify-between text-xs font-bold text-on-surface-variant pt-1">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-xs bg-secondary"></span>Ingresos</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-xs bg-tertiary"></span>Gastos</span>
        </div>`;
    }

    function renderSparklineSVG(values, color) {
      const W = 280, H = 70, max = Math.max(...values, 1), min = Math.min(...values, 0);
      const rng = (max - min) || 1, n = values.length;
      const pts = values.map((v, i) => `${(i / (n - 1 || 1) * W).toFixed(1)},${(H - 8 - ((v - min) / rng) * (H - 16)).toFixed(1)}`).join(" ");
      return `
        <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="h-16">
          <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
          <polygon points="0,${H} ${pts} ${W},${H}" fill="${color}" opacity="0.14"/>
        </svg>`;
    }

    function renderRule503020Row(label, pct, target, color, isSavings = false) {
      const good = isSavings ? pct >= target : pct <= target;
      return `
        <div class="flex flex-col gap-1">
          <div class="flex justify-between text-xs font-bold">
            <span class="text-on-surface">${esc(label)}</span>
            <span class="tabular-nums">${pct.toFixed(0)}% <span class="text-outline font-normal">/ ideal ${target}%</span></span>
          </div>
          <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div class="h-full rounded-full" style="width:${Math.min(100, pct)}%;background:${color}"></div>
          </div>
          <span class="text-[11px] font-semibold ${good ? 'text-secondary' : 'text-amber-600'}">
            ${good ? '✓ En objetivo' : isSavings ? `Te faltan ${(target - pct).toFixed(0)} pts para el 20%` : `Superas el objetivo por ${(pct - target).toFixed(0)} pts`}
          </span>
        </div>`;
    }

    function generateSmartAdvisorTipsHtml() {
      const mk = viewMk;
      const list = monthExpenses(mk), total = sumExp(list), inc = monthIncomeTotal(mk);
      const tips = [];
      const p2p = computeP2PMetrics();

      if (p2p.totalMeDeben > 0) {
        tips.push({
          type: "good",
          icon: "payments",
          text: `En el apartado <strong>Deudas</strong> te deben un total de <strong>${fmt(p2p.totalMeDeben)}</strong>. Reclamarlo por Bizum es tu liquidez más rápida.`
        });
      }

      (S.recurring || []).forEach(r => {
        const cands = list.filter(e => String(e.note || "").toLowerCase().includes(r.name.toLowerCase()) && Math.abs(e.amount - r.amount) > 0.01);
        if (cands.length) {
          tips.push({
            type: "warn",
            icon: "trending_up",
            text: `<strong>${esc(r.name)}</strong> ha cambiado de importe: tenías ${fmt(r.amount)} y este mes aparece por ${fmt(cands[0].amount)}.`
          });
        }
      });

      Object.entries(S.budgets || {}).forEach(([c, b]) => {
        const spent = sumExp(list.filter(e => e.cat === c));
        const eb = effBudget(c);
        if (b > 0 && spent > eb) {
          tips.push({
            type: "warn",
            icon: "warning",
            text: `Has superado el presupuesto de <strong>${esc(catById(c).name)}</strong> (${fmt0(spent)} de ${fmt0(eb)}).`
          });
        }
      });

      const refunds = (S.expenses || []).filter(e => e.refund);
      if (refunds.length > 0) {
        tips.push({
          type: "info",
          icon: "assignment_return",
          text: `Tienes <strong>${fmt(sumExp(refunds))}</strong> en ${refunds.length} compra(s) pendiente(s) de devolución.`
        });
      }

      const recTotal = (S.recurring || []).reduce((a, r) => a + Number(r.amount || 0), 0);
      if (recTotal > 0) {
        tips.push({
          type: "info",
          icon: "autorenew",
          text: `Tus suscripciones fijas suman <strong>${fmt(recTotal)}/mes</strong> (${fmt0(recTotal * 12)} al año).`
        });
      }

      if (inc > 0 && (inc - total) / inc >= 0.2) {
        tips.push({
          type: "good",
          icon: "verified",
          text: `Tu tasa de ahorro este mes es del <strong>${Math.round(((inc - total) / inc) * 100)}%</strong> (${fmt(inc - total)} ahorrados).`
        });
      }

      if (tips.length === 0) {
        tips.push({
          type: "good",
          icon: "check_circle",
          text: `Todo tu control mensual está en orden y sin alertas.`
        });
      }

      return tips.map(t => `
        <div class="p-3 rounded-xl border flex items-start gap-2.5 text-xs ${t.type === 'warn' ? 'bg-amber-500/10 border-amber-500/25 text-on-surface' : t.type === 'good' ? 'bg-secondary/10 border-secondary/25 text-on-surface' : 'bg-surface-container-low border-outline-variant/40 text-on-surface'}">
          <span class="material-symbols-outlined text-[18px] ${t.type === 'warn' ? 'text-amber-600' : t.type === 'good' ? 'text-secondary' : 'text-primary'}">${t.icon}</span>
          <div class="leading-relaxed">${t.text}</div>
        </div>
      `).join('');
    }
