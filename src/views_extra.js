    // ============================================================================
    // 10. VIEW 3: SOCIAL (UNIFIED DEBTS + GROUPS: Balance | Grupos | Historial)
    // ============================================================================
    function renderCuentasView() {
      const el = $('#view-cuentas');
      if (!el) return;

      if (!['balance', 'grupos', 'historial'].includes(activeP2PTab)) {
        activeP2PTab = 'balance';
      }

      const userName = currentLoggedUserName();
      const p2p = computeP2PMetrics();
      const currGroup = sbGrupos.find(g => String(g.id) === String(currentGroupId));
      const groupName = currGroup ? currGroup.nombre : "General";
      const isFantasy = groupName.toLowerCase().includes('fantasy');
      const isDeudas = groupName.toLowerCase().includes('deuda');
      const isGeneral = Number(currentGroupId) === 1 || Number(currentGroupId) === Number(window.generalGroupId);
      const canManageGroup = !!loggedUserId && (isAdmin || (currGroup && Number(currGroup.admin_id) === Number(loggedUserId)));

      // Pending notifications alert banner for Admin if any
      const pendingPayments = sbMovimientos.filter(m => m.tipo === 'pago' && m.estado === 'pendiente');
      const pendingBannerHtml = (isAdmin && pendingPayments.length > 0) ? `
        <div class="bento-card p-4 rounded-2xl border-l-4 border-l-amber-500 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
              ${ico('notifications_active', 'text-[20px]')}
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

      // Executive Debt KPI Header
      const debtKpiHeaderHtml = `
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button onclick="haptic('selection'); activeP2PTab='balance'; activeBalanceFilter='owed'; renderCuentasView(); syncRouteHash();" class="col-span-1 bento-card p-4 rounded-3xl flex flex-col justify-between text-left active-scale ${activeP2PTab === 'balance' && activeBalanceFilter === 'owed' ? 'ring-2 ring-secondary' : ''}">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-[10px] tracking-wider text-on-surface-variant font-extrabold uppercase">ME DEBEN</span>
              <span class="w-8 h-8 rounded-xl bg-secondary/12 text-secondary flex items-center justify-center">
                ${ico('arrow_downward', 'text-[17px]')}
              </span>
            </div>
            <div>
              <p class="font-display-currency-mobile text-[22px] sm:text-[26px] leading-8 font-extrabold text-secondary tracking-tight tabular-nums privacy-val">+${fmt(p2p.totalMeDeben)}</p>
              <span class="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-secondary px-2 py-0.5 rounded-full bg-secondary/10">
                ${p2p.countMeDeben} cobro${p2p.countMeDeben === 1 ? '' : 's'}
              </span>
            </div>
          </button>

          <button onclick="haptic('selection'); activeP2PTab='balance'; activeBalanceFilter='owe'; renderCuentasView(); syncRouteHash();" class="col-span-1 bento-card p-4 rounded-3xl flex flex-col justify-between text-left active-scale ${activeP2PTab === 'balance' && activeBalanceFilter === 'owe' ? 'ring-2 ring-tertiary' : ''}">
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-[10px] tracking-wider text-on-surface-variant font-extrabold uppercase">DEBO</span>
              <span class="w-8 h-8 rounded-xl bg-tertiary/12 text-tertiary flex items-center justify-center">
                ${ico('arrow_upward', 'text-[17px]')}
              </span>
            </div>
            <div>
              <p class="font-display-currency-mobile text-[22px] sm:text-[26px] leading-8 font-extrabold text-tertiary tracking-tight tabular-nums privacy-val">−${fmt(p2p.totalQueDebo)}</p>
              <span class="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-tertiary px-2 py-0.5 rounded-full bg-tertiary/10">
                ${p2p.countQueDebo} pago${p2p.countQueDebo === 1 ? '' : 's'}
              </span>
            </div>
          </button>

          <div class="col-span-2 ${p2p.balanceNeto >= 0 ? 'hero-emerald' : 'hero-indigo'} text-white p-5 rounded-3xl flex flex-col justify-between gap-3.5 relative overflow-hidden">
            <div class="flex items-start justify-between gap-2 relative z-10">
              <div class="flex flex-col">
                <span class="font-label-sm text-[10px] text-white/80 font-extrabold tracking-widest uppercase">BALANCE SOCIAL NETO</span>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="font-display-currency-mobile text-[30px] sm:text-[32px] leading-9 font-extrabold text-white tabular-nums privacy-val">${fmtSigned(p2p.balanceNeto)}</span>
                  <span class="font-body-sm text-xs text-white/80">${p2p.balanceNeto >= 0 ? 'a tu favor' : 'por saldar'}</span>
                </div>
              </div>
              <div class="bg-white/15 backdrop-blur-xs px-3 py-1.5 rounded-2xl border border-white/20 text-right">
                <span class="font-label-sm text-xs text-white font-extrabold flex items-center justify-end gap-1">
                  ${ico(p2p.balanceNeto >= 0 ? 'verified' : 'schedule', 'text-[14px]')}
                  ${p2p.balanceNeto >= 0 ? 'Saneado' : 'Pendiente'}
                </span>
                <p class="font-body-sm text-[10px] text-white/85">${p2p.balanceNeto >= 0 ? 'Cobros cubren deudas' : 'Pagos por saldar'}</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-2.5 border-t border-white/15 relative z-10">
              <button onclick="haptic('light'); openP2PDebtModal('owed')" class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-label-md text-xs font-bold transition flex items-center gap-1 active-scale">
                ${ico('arrow_downward', 'text-[14px]')}
                Me deben
              </button>
              <button onclick="haptic('light'); openP2PDebtModal('owe')" class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-label-md text-xs font-bold transition flex items-center gap-1 active-scale">
                ${ico('arrow_upward', 'text-[14px]')}
                Debo
              </button>
              <button onclick="haptic('light'); openSmartSplitModal()" class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-label-md text-xs font-bold transition flex items-center gap-1 active-scale">
                ${ico('call_split', 'text-[14px]')}
                Dividir ticket
              </button>
            </div>
          </div>
        </section>
      `;

      const settledAll = (S.debts || []).filter(d => d.settled);
      const totalGroupsCount = (loggedUserId ? sbGrupos.length : 0) + (S.groups || []).length;

      let tabContentHtml = '';

      if (activeP2PTab === 'balance') {
        // SUB-TAB 1: BALANCE (Unified Me deben + Debo with quick filter pills)
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
                    <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">☁️ ${esc(item.grupo_nombre)}</span>
                  </div>
                  <p class="font-body-sm text-xs text-on-surface-variant truncate">Deuda pendiente en grupo compartido</p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="font-headline-sm text-[17px] font-extrabold text-secondary tabular-nums privacy-val">+${fmt(item.deuda)}</span>
                <div class="mt-0.5"><span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Te debe</span></div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
              <button onclick="openBizumClaimModal('${esc(item.usuario_nombre)}', ${item.deuda}, 'Grupo ${esc(item.grupo_nombre)}')" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-tertiary/10 text-tertiary font-label-md text-xs font-bold hover:bg-tertiary/20 transition active-scale">
                ${ico('send', 'text-[14px]')} Reclamar Bizum
              </button>
              <button onclick="changeSupabaseGroup('${item.grupo_id}'); openCloudPaymentModal(${item.usuario_id}, '${esc(item.usuario_nombre)}', ${item.deuda})" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-secondary/10 text-secondary font-label-md text-xs font-bold hover:bg-secondary/20 transition active-scale">
                ${ico('check_circle', 'text-[15px]')} Marcar cobrado
              </button>
            </div>
          </div>
        `).join('');

        const cloudOweCards = p2p.cloudOweItems.map(item => `
          <div class="bento-card p-3.5 rounded-2xl flex flex-col gap-3 border-l-4 border-l-tertiary">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                  ${ico('groups', 'text-[19px]')}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <h4 class="font-label-lg text-sm font-bold text-on-surface truncate">Grupo ${esc(item.grupo_nombre)}</h4>
                    <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">☁️ Grupo</span>
                  </div>
                  <p class="font-body-sm text-xs text-on-surface-variant truncate">Pendiente de pagar a <strong>${esc(item.acreedor_nombre)}</strong></p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="font-headline-sm text-[17px] font-extrabold text-tertiary tabular-nums privacy-val">−${fmt(item.deuda)}</span>
                <div class="mt-0.5"><span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">Por pagar</span></div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
              <button onclick="activeP2PTab='grupos'; changeSupabaseGroup('${item.grupo_id}'); syncRouteHash();" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition active-scale">
                ${ico('visibility', 'text-[15px]')} Ver grupo
              </button>
              <button onclick="changeSupabaseGroup('${item.grupo_id}'); openCloudPaymentModal(${item.usuario_id}, '${esc(item.usuario_nombre)}', ${item.deuda})" class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition active-scale">
                ${ico('check_circle', 'text-[15px]')} Notificar pago
              </button>
            </div>
          </div>
        `).join('');

        const localOwedCards = p2p.localOwed.map(d => renderPersonalDebtCard(d)).join('');
        const localOweCards = p2p.localOwe.map(d => renderPersonalDebtCard(d)).join('');

        const showOwed = activeBalanceFilter === 'all' || activeBalanceFilter === 'owed';
        const showOwe = activeBalanceFilter === 'all' || activeBalanceFilter === 'owe';
        const visibleCount = (showOwed ? p2p.countMeDeben : 0) + (showOwe ? p2p.countQueDebo : 0);

        tabContentHtml = `
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <button onclick="haptic('selection'); activeBalanceFilter='all'; renderCuentasView()" class="px-3 py-1.5 rounded-full text-xs font-extrabold transition ${activeBalanceFilter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Todo (${p2p.countMeDeben + p2p.countQueDebo})</button>
              <button onclick="haptic('selection'); activeBalanceFilter='owed'; renderCuentasView()" class="px-3 py-1.5 rounded-full text-xs font-extrabold transition ${activeBalanceFilter === 'owed' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Me deben (${p2p.countMeDeben})</button>
              <button onclick="haptic('selection'); activeBalanceFilter='owe'; renderCuentasView()" class="px-3 py-1.5 rounded-full text-xs font-extrabold transition ${activeBalanceFilter === 'owe' ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Debo (${p2p.countQueDebo})</button>
            </div>
            <button onclick="openP2PDebtModal(activeBalanceFilter === 'owe' ? 'owe' : 'owed')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-extrabold shadow-xs hover:bg-primary-container transition active-scale">
              ${ico('add_circle', 'text-[15px]')} Nueva deuda P2P
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${showOwed ? localOwedCards + cloudOwedCards : ''}
            ${showOwe ? cloudOweCards + localOweCards : ''}
            ${visibleCount === 0 ? `
              <div class="col-span-2 bento-card p-8 rounded-3xl text-center flex flex-col items-center gap-2.5">
                <span class="w-12 h-12 rounded-2xl bg-secondary/12 text-secondary flex items-center justify-center">${ico('task_alt', 'text-[26px]')}</span>
                <p class="font-label-lg text-base font-extrabold text-on-surface">Todas tus cuentas están en paz</p>
                <p class="font-body-sm text-xs text-on-surface-variant max-w-xs">Cuando adelantes una cena o alguien te preste dinero, añádelo aquí o divide un ticket al instante.</p>
                <div class="flex items-center gap-2 pt-1">
                  <button onclick="openP2PDebtModal('owed')" class="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-extrabold active-scale">+ Me deben</button>
                  <button onclick="openSplitBillModal()" class="px-3.5 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-extrabold active-scale">Dividir ticket</button>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      } else if (activeP2PTab === 'grupos') {
        // SUB-TAB 2: GRUPOS (Cloud Groups + Local Tricount Groups unified)
        const groupPillsHtml = sbGrupos.map(g => {
          const active = String(g.id) === String(currentGroupId);
          const iconName = g.nombre.toLowerCase().includes('fantasy') ? 'sports_soccer' : g.nombre.toLowerCase().includes('deuda') ? 'local_fire_department' : 'music_note';
          return `
            <button onclick="changeSupabaseGroup('${g.id}')" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-label-md text-xs font-bold transition-all active-scale flex-shrink-0 ${active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'}">
              ${ico(iconName, 'text-[15px]')}
              ${esc(g.nombre)}
            </button>`;
        }).join('');

        let cloudSectionHtml = '';
        if (loggedUserId) {
          let bannerHtml = '';
          if (isFantasy) {
            bannerHtml = `
              <div class="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">${ico('sports_soccer', 'text-[22px]')}</span>
                  <div>
                    <span class="text-[11px] uppercase font-extrabold tracking-wider text-orange-100">Liga Fantasy • Castigo Jornada</span>
                    <h3 class="font-headline-sm text-lg font-extrabold">El último de la jornada paga 5,00 € al bote</h3>
                  </div>
                </div>
                ${canManageGroup ? `<button onclick="openGlobalChargeModal()" class="px-3.5 py-2 rounded-xl bg-white text-orange-700 font-label-md text-xs font-extrabold hover:bg-orange-50 transition self-start sm:self-auto active-scale">+ Aplicar cargo</button>` : ''}
              </div>`;
          } else if (isDeudas) {
            bannerHtml = `
              <div class="bg-gradient-to-r from-rose-600 to-red-700 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">${ico('warning', 'text-[22px]')}</span>
                  <div>
                    <span class="text-[11px] uppercase font-extrabold tracking-wider text-rose-100">Cuentas Pendientes</span>
                    <h3 class="font-headline-sm text-lg font-extrabold">Seguimiento rápido de deudas del grupo</h3>
                  </div>
                </div>
                ${canManageGroup ? `<button onclick="sendGroupWhatsAppReminder()" class="px-3.5 py-2 rounded-xl bg-white text-rose-700 font-label-md text-xs font-extrabold hover:bg-rose-50 transition self-start sm:self-auto active-scale">Recordar al grupo</button>` : ''}
              </div>`;
          } else {
            bannerHtml = `
              <div class="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">${ico('autorenew', 'text-[22px]')}</span>
                  <div>
                    <span class="text-[11px] uppercase font-extrabold tracking-wider text-emerald-100">Grupo Sincronizado • ${esc(groupName)}</span>
                    <h3 class="font-headline-sm text-lg font-extrabold">${isGeneral ? 'Cobro automático Spotify día 30 de cada mes (21,00 €)' : 'Gestión de pagos y deudas compartidas en tiempo real'}</h3>
                  </div>
                </div>
                ${canManageGroup ? `<button onclick="openGlobalChargeModal()" class="px-3.5 py-2 rounded-xl bg-white text-emerald-800 font-label-md text-xs font-extrabold hover:bg-emerald-50 transition self-start sm:self-auto active-scale">+ Repartir Gasto</button>` : ''}
              </div>`;
          }

          const sortedMembers = [...sbUsuariosGrupo].sort((a, b) => parseFloat(b.deuda || 0) - parseFloat(a.deuda || 0));
          const totalDeudaGrupo = sortedMembers.reduce((a, u) => a + parseFloat(u.deuda || 0), 0);

          cloudSectionHtml = `
            <div class="flex flex-col gap-3.5">
              <div class="flex items-center justify-between gap-2 overflow-x-auto custom-scroll pb-1">
                <div class="flex items-center gap-2">
                  ${groupPillsHtml}
                  <button onclick="openNewGroupModal()" class="flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-container-low text-primary font-label-md text-xs font-bold hover:bg-surface-container transition flex-shrink-0">
                    ${ico('add', 'text-[15px]')} Nuevo Grupo Cloud
                  </button>
                </div>
              </div>

              ${bannerHtml}

              <div class="bento-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span class="font-label-sm text-[10px] uppercase font-extrabold text-on-surface-variant">PENDIENTE EN ${esc(groupName.toUpperCase())}</span>
                  <div class="flex items-baseline gap-2">
                    <h3 class="font-display-currency-mobile text-2xl font-extrabold text-on-surface tabular-nums privacy-val">${fmt(totalDeudaGrupo)}</h3>
                    <span class="text-xs text-on-surface-variant font-medium">• ${sortedMembers.length} miembros</span>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  ${canManageGroup ? `
                    <button onclick="openGlobalChargeModal()" class="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs hover:bg-primary-container transition active-scale">${ico('calculate', 'text-[15px]')} Repartir</button>
                    <button onclick="openAddCloudMemberModal()" class="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs font-bold hover:bg-surface-container transition active-scale">${ico('person_add', 'text-[15px]')} Miembro</button>
                    <button onclick="sendGroupWhatsAppReminder()" class="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary/10 text-secondary font-label-md text-xs font-bold hover:bg-secondary/20 transition active-scale">${ico('chat', 'text-[15px]')} WhatsApp</button>
                    <button onclick="resetAllCloudGroupDebts()" class="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-label-md text-xs font-bold hover:bg-amber-500/25 transition active-scale">${ico('done_all', 'text-[15px]')} Liquidar</button>
                    ${(!isGeneral || isAdmin) ? `<button onclick="deleteCurrentCloudGroup()" class="p-2 rounded-xl bg-tertiary/10 text-tertiary hover:bg-tertiary/20 transition active-scale" title="Eliminar grupo">${ico('delete', 'text-[15px]')}</button>` : ''}
                  ` : ''}
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${sortedMembers.map((u, idx) => renderCloudMemberCard(u, idx)).join('') || `
                  <div class="col-span-2 bento-card p-6 rounded-2xl text-center text-on-surface-variant text-sm">No hay miembros en este grupo todavía.</div>
                `}
              </div>
            </div>
          `;
        } else {
          // Strict Read-Only Public Balances View for external visitors / unauthenticated mode
          const publicMembers = [...sbUsuariosGrupo].sort((a, b) => parseFloat(b.deuda || 0) - parseFloat(a.deuda || 0));
          const publicTotal = publicMembers.reduce((a, u) => a + parseFloat(u.deuda || 0), 0);
          cloudSectionHtml = `
            <div class="flex flex-col gap-3">
              <div class="bento-card p-4 rounded-2xl border-l-4 border-l-primary bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">${ico('visibility', 'text-[20px]')}</span>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="font-label-lg text-sm font-extrabold text-on-surface">Saldos pendientes · ${esc(groupName)}</h4>
                      <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Solo consulta</span>
                    </div>
                    <p class="font-body-sm text-xs text-on-surface-variant mt-0.5">Vista de consulta para ver los saldos pendientes. Inicia sesión para gestionar cargos o confirmar pagos.</p>
                  </div>
                </div>
                <button onclick="openProfileOrLogin()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-extrabold hover:bg-primary-container transition self-start sm:self-auto active-scale flex-shrink-0">
                  Iniciar sesión
                </button>
              </div>
              ${publicMembers.length > 0 ? `
                <div class="bento-card p-3.5 rounded-2xl flex items-center justify-between">
                  <span class="text-xs font-extrabold uppercase text-on-surface-variant">Total pendiente en ${esc(groupName)}</span>
                  <span class="font-headline-sm text-lg font-extrabold text-on-surface tabular-nums privacy-val">${fmt(publicTotal)}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  ${publicMembers.map((u, idx) => renderCloudMemberCard(u, idx)).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }

        const localGroupsHtml = (S.groups || []).map(g => {
          const balCents = computeGroupBalancesCents(g);
          const rawPlan = computeRawGroupDebtsCents(g);
          const plan = computeSimplifiedSettlementsCents(balCents);
          const savedTx = Math.max(0, rawPlan.length - plan.length);
          const preset = GROUP_PRESETS.find(p => p.id === g.type) || GROUP_PRESETS[4];
          const totCents = (g.items || []).reduce((a, i) => a + (typeof i.amount_base_cents === 'number' ? i.amount_base_cents : Money.toCents(i.amount || 0)), 0);
          return `
            <div class="bento-card p-4 rounded-2xl flex flex-col gap-3 ${g.archived ? 'opacity-60' : ''}">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span>${preset.emoji}</span>
                    <h4 class="font-headline-sm text-base font-extrabold text-on-surface">${esc(g.name)}</h4>
                    ${g.archived ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Archivado</span>` : ''}
                    ${savedTx > 0 ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">✨ De ${rawPlan.length} a ${plan.length} pagos</span>` : ''}
                  </div>
                  <p class="font-body-sm text-xs text-on-surface-variant">${g.members.length} personas • ${(g.items || []).length} gastos • Total ${fmt(Money.fromCents(totCents))}</p>
                </div>
                <button onclick="openEnhancedGroupDetailModal('${g.id}')" class="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-label-md text-xs font-bold hover:bg-primary/20 transition flex-shrink-0">
                  Abrir
                </button>
              </div>
              <div class="bg-surface-container-low p-3 rounded-xl flex flex-col gap-1.5">
                <span class="font-label-sm text-[10px] uppercase font-extrabold text-on-surface-variant">Liquidación óptima simplificada</span>
                ${plan.length > 0 ? plan.map(p => `
                  <div class="flex items-center justify-between text-xs py-1 border-b border-outline-variant/20 last:border-0">
                    <span class="font-semibold text-on-surface">${esc(p.from)} <span class="text-primary font-extrabold">→</span> ${esc(p.to)}</span>
                    <strong class="font-extrabold text-secondary tabular-nums privacy-val">${fmt(Money.fromCents(p.amount_cents))}</strong>
                  </div>
                `).join('') : `<span class="text-xs text-secondary font-bold">✓ Todas las cuentas cuadradas</span>`}
              </div>
            </div>
          `;
        }).join('');

        tabContentHtml = `
          ${cloudSectionHtml}

          <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Viajes, pisos y botes (reparto inteligente)</h3>
              <p class="font-body-sm text-xs text-on-surface-variant">5 modos de reparto · Multidivisa · Simplificación matemática exacta</p>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="openSmartSplitModal()" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs font-bold hover:bg-surface-container transition active-scale">
                ${ico('call_split', 'text-[15px]')} Dividir ticket
              </button>
              <button onclick="openEnhancedNewGroupModal()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-xs hover:bg-primary-container transition active-scale">
                ${ico('group_add', 'text-[15px]')} + Nuevo Grupo
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${localGroupsHtml || `
              <div class="col-span-2 bento-card p-6 rounded-2xl text-center text-xs text-on-surface-variant">
                Crea un grupo para un viaje, piso compartido o cena y reparte gastos sin obligar a nadie a registrarse.
              </div>
            `}
          </div>
        `;
      } else {
        // SUB-TAB 3: HISTORIAL (Settled P2P debts + Cloud group activity timeline)
        const cloudTimelineHtml = (loggedUserId && sbMovimientos.length > 0) ? `
          <div class="bento-card rounded-2xl overflow-hidden">
            <div class="px-4 py-3 border-b border-outline-variant/25 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                ${ico('history', 'text-primary text-[17px]')}
                <h3 class="font-label-lg text-sm font-extrabold text-on-surface">Movimientos en Grupo ${esc(groupName)}</h3>
              </div>
              ${canManageGroup ? `<button onclick="hardResetCloudHistory()" class="text-[11px] text-tertiary font-bold hover:underline">Limpiar historial</button>` : ''}
            </div>
            <div class="divide-y divide-outline-variant/20 max-h-[420px] overflow-y-auto">
              ${sbMovimientos.slice(0, 25).map(mov => {
                const u = sbGlobalUsers.find(x => Number(x.id) === Number(mov.usuario_id));
                const uName = u ? u.nombre : 'Miembro';
                const isCargo = mov.tipo === 'cargo';
                const isPend = mov.estado === 'pendiente';
                const dt = mov.created_at ? fmtDay(mov.created_at.slice(0, 10)) : '';
                return `
                  <div class="p-3.5 flex items-center justify-between gap-3 hover:bg-surface-container-low/50 transition">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCargo ? 'bg-tertiary/10 text-tertiary' : isPend ? 'bg-amber-500/15 text-amber-600' : 'bg-secondary/10 text-secondary'}">
                        ${ico(isCargo ? 'receipt' : isPend ? 'schedule' : 'paid', 'text-[17px]')}
                      </span>
                      <div class="min-w-0">
                        <p class="font-label-lg text-sm font-bold text-on-surface truncate">
                          ${isCargo ? esc(mov.concepto || 'Cargo') : `Pago de ${esc(uName)}`}
                          ${isPend ? `<span class="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold">Pendiente</span>` : ''}
                        </p>
                        <p class="font-body-sm text-xs text-on-surface-variant">${dt} • ${esc(uName)}</p>
                      </div>
                    </div>
                    <span class="font-headline-sm text-sm font-extrabold tabular-nums privacy-val flex-shrink-0 ${isCargo ? 'text-tertiary' : 'text-secondary'}">
                      ${isCargo ? '+' : '−'}${fmt(mov.monto)}
                    </span>
                  </div>`;
              }).join('')}
            </div>
          </div>
        ` : '';

        tabContentHtml = `
          ${settledAll.length > 0 ? renderSettledDebtsListHtml(settledAll, 'Liquidaciones P2P saldadas') : ''}
          ${cloudTimelineHtml}
          ${settledAll.length === 0 && !(loggedUserId && sbMovimientos.length > 0) ? `
            <div class="bento-card p-8 rounded-3xl text-center flex flex-col items-center gap-2">
              <span class="w-12 h-12 rounded-2xl bg-surface-container-low text-outline flex items-center justify-center">${ico('history', 'text-[24px]')}</span>
              <p class="font-label-lg text-sm font-extrabold text-on-surface">Sin liquidaciones todavía</p>
              <p class="text-xs text-on-surface-variant max-w-xs">Aquí aparecerán todas las deudas saldadas y pagos confirmados con tus amigos.</p>
            </div>
          ` : ''}
        `;
      }

      el.innerHTML = `
        ${pendingBannerHtml}
        ${debtKpiHeaderHtml}

        <!-- 3-Tab Social Segmented Control: Balance | Grupos | Historial -->
        <div class="grid grid-cols-3 bg-surface-container p-1 rounded-2xl gap-1">
          <button onclick="haptic('selection'); activeP2PTab='balance'; renderCuentasView(); syncRouteHash();" class="py-2.5 px-2.5 rounded-xl font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${activeP2PTab === 'balance' ? 'font-extrabold bg-surface-container-lowest text-primary shadow-xs' : 'font-semibold text-on-surface-variant hover:text-on-surface'}">
            ${ico('swap_horiz', 'text-[15px]')}
            Balance
          </button>
          <button onclick="haptic('selection'); activeP2PTab='grupos'; renderCuentasView(); syncRouteHash();" class="py-2.5 px-2.5 rounded-xl font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${activeP2PTab === 'grupos' ? 'font-extrabold bg-surface-container-lowest text-primary shadow-xs' : 'font-semibold text-on-surface-variant hover:text-on-surface'}">
            ${ico('groups', 'text-[15px]')}
            Grupos (${totalGroupsCount})
          </button>
          <button onclick="haptic('selection'); activeP2PTab='historial'; renderCuentasView(); syncRouteHash();" class="py-2.5 px-2.5 rounded-xl font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${activeP2PTab === 'historial' ? 'font-extrabold bg-surface-container-lowest text-primary shadow-xs' : 'font-semibold text-on-surface-variant hover:text-on-surface'}">
            ${ico('history', 'text-[15px]')}
            Historial
          </button>
        </div>

        ${tabContentHtml}
      `;
    }

    function renderSettledDebtsListHtml(settledList, title) {
      return `
        <div class="bento-card rounded-2xl overflow-hidden">
          <div class="px-4 py-3 border-b border-outline-variant/25 flex justify-between items-center">
            <span class="font-label-lg text-xs font-bold text-on-surface-variant uppercase">${esc(title)} (${settledList.length})</span>
          </div>
          <div class="divide-y divide-outline-variant/20">
            ${settledList.map(d => `
              <div class="p-3.5 flex items-center justify-between gap-2">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                    ${ico('check', 'text-[15px]')}
                  </span>
                  <div class="min-w-0">
                    <p class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(d.person)}</p>
                    <p class="font-body-sm text-xs text-on-surface-variant truncate">${esc(d.note || 'Cuenta saldada')} • ${d.type === 'owed' ? 'Te pagó' : 'Pagaste'}</p>
                  </div>
                </div>
                <button onclick="deleteP2PDebt('${d.id}')" aria-label="Eliminar registro" class="p-1.5 text-outline hover:text-error">
                  ${ico('delete', 'text-[17px]')}
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

      const userName = currentLoggedUserName();
      const exps = monthExpenses(viewMk).map(e => ({ ...e, _k: "exp" }));
      const incs = incomeRows(viewMk).map(i => ({ ...i, _k: "inc" }));
      let all = [...exps, ...incs].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.ts || 0) - (a.ts || 0));

      if (movFilter.type === "exp") all = all.filter(x => x._k === "exp");
      if (movFilter.type === "inc") all = all.filter(x => x._k === "inc");
      if (movFilter.type === "refund") all = all.filter(x => x._k === "exp" && x.refund);
      if (movFilter.cat) all = all.filter(x => x._k === "exp" && x.cat === movFilter.cat);
      if (movFilter.tag) all = all.filter(x => x._k === "exp" && tagsOf(x.note).includes(movFilter.tag));
      if (movFilter.method) all = all.filter(x => x._k === "exp" && x.method === movFilter.method);
      if (movFilter.account) all = all.filter(x => (x.account_id || 'acc_main') === movFilter.account);
      if (movFilter.minAmt) {
        const minC = Money.toCents(movFilter.minAmt);
        all = all.filter(x => (typeof x.amount_base_cents === 'number' ? x.amount_base_cents : Money.toCents(x.amount)) >= minC);
      }
      if (movFilter.maxAmt) {
        const maxC = Money.toCents(movFilter.maxAmt);
        all = all.filter(x => (typeof x.amount_base_cents === 'number' ? x.amount_base_cents : Money.toCents(x.amount)) <= maxC);
      }
      if (movFilter.dateFrom) all = all.filter(x => (x.date || '') >= movFilter.dateFrom);
      if (movFilter.dateTo) all = all.filter(x => (x.date || '') <= movFilter.dateTo);
      if (movFilter.q) {
        const q = movFilter.q.toLowerCase();
        all = all.filter(x => ((x.note || "") + " " + (x.source || "") + " " + catById(x.cat).name).toLowerCase().includes(q));
      }

      const tExp = sumExp(all.filter(x => x._k === "exp"));
      const tInc = all.filter(x => x._k === "inc").reduce((a, x) => a + Number(x.amount || 0), 0);

      const tagSet = new Set();
      (S.expenses || []).forEach(e => tagsOf(e.note).forEach(t => tagSet.add(t)));
      const allTagsList = [...tagSet].sort();
      const savedViews = S.savedViews || [];
      const hasActiveFilter = !!(movFilter.q || movFilter.type !== 'all' || movFilter.cat || movFilter.tag || movFilter.method || movFilter.account || movFilter.minAmt || movFilter.maxAmt || movFilter.dateFrom || movFilter.dateTo);

      const virt = typeof sliceVirtualizedMovements === 'function'
        ? sliceVirtualizedMovements(all)
        : { visible: all, total: all.length, remaining: 0 };

      const rowsHtml = virt.visible.length > 0
        ? renderDateGroupedTransactionsHtml(virt.visible) + (virt.remaining > 0 ? `
          <div class="p-3.5 bg-surface-container-low border-t border-outline-variant/25 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span class="text-on-surface-variant font-bold">Mostrando ${virt.visible.length} de ${virt.total} movimientos</span>
            <div class="flex items-center gap-2">
              <button onclick="loadMoreVirtualizedMovements()" class="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-extrabold active-scale">Cargar ${Math.min(80, virt.remaining)} más</button>
              <button onclick="movVisibleLimit=${virt.total}; renderGastosView()" class="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface font-bold">Ver todos</button>
            </div>
          </div>
        ` : '')
        : `
          <div class="p-10 text-center text-on-surface-variant text-sm flex flex-col items-center gap-2">
            <span class="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline">${ico('search_off', 'text-[24px]')}</span>
            <p class="font-bold text-on-surface">No hay movimientos que coincidan con este filtro</p>
            <p class="text-xs">Prueba a limpiar los filtros o registra un nuevo gasto.</p>
          </div>`;

      const inboxCount = (S?.pendingInbox || []).length;
      const inboxBannerHtml = inboxCount > 0 ? `
        <div class="bento-card p-3.5 rounded-2xl border-l-4 border-l-primary bg-primary/5 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs">
            <p class="font-extrabold text-on-surface">📥 ${inboxCount} movimiento(s) bancario(s) por clasificar</p>
            <p class="text-[11px] text-on-surface-variant">Clasifícalos en 1 toque para que entren al libro y aprendan regla automática.</p>
          </div>
          <button onclick="openPendingInboxModal()" class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale">Clasificar ahora</button>
        </div>
      ` : '';

      el.innerHTML = `
        ${inboxBannerHtml}
        <div class="flex flex-wrap items-center justify-between gap-2">
          <button onclick="haptic('selection'); switchMainView('inicio')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 text-xs font-extrabold text-on-surface hover:bg-surface-container transition active-scale">
            ${ico('arrow_back', 'text-[16px] text-primary')}
            Volver a Inicio
          </button>
          <div class="flex items-center gap-2">
            ${hasActiveFilter ? `<button onclick="movFilter={q:'',type:'all',cat:'',tag:'',method:'',account:'',minAmt:'',maxAmt:'',dateFrom:'',dateTo:''}; renderGastosView()" class="text-xs font-bold text-tertiary hover:underline">Limpiar</button>` : ''}
            <button onclick="saveCurrentMovFilterView()" class="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-extrabold hover:bg-primary/18 transition active-scale">⭐ Guardar vista</button>
          </div>
        </div>

        ${savedViews.length > 0 ? `
          <div class="flex items-center gap-2 overflow-x-auto custom-scroll pb-0.5">
            ${savedViews.map(v => `
              <div class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/40 text-xs font-bold text-on-surface flex-shrink-0">
                <button onclick="applySavedMovFilterView('${v.id}')" class="hover:text-primary">⭐ ${esc(v.name)}</button>
                <button onclick="deleteSavedMovFilterView('${v.id}')" class="text-outline hover:text-tertiary ml-1" aria-label="Eliminar vista">×</button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="bento-card p-4 rounded-2xl flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-headline-sm text-base font-extrabold text-on-surface capitalize">Movimientos • ${monthLabel(viewMk)}</h2>
            <div class="flex items-center gap-3 text-xs font-extrabold tabular-nums privacy-val">
              <span class="text-secondary">Ingresos: +${fmt(tInc)}</span>
              <span class="text-tertiary">Gastos: −${fmt(tExp)}</span>
              <span class="px-2 py-0.5 rounded-lg ${tInc - tExp >= 0 ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'}">Neto: ${fmtSigned(tInc - tExp)}</span>
            </div>
          </div>

          <div class="relative">
            <span class="absolute left-3.5 top-2.5 text-outline pointer-events-none">${ico('search', 'text-[18px]')}</span>
            <input id="mov-search-input" type="text" value="${esc(movFilter.q)}" oninput="updateMovSearch(this.value)" placeholder="Buscar comercio, concepto o #etiqueta..." class="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none"/>
          </div>

          <div class="flex items-center gap-2 overflow-x-auto custom-scroll pb-1">
            <button onclick="movFilter.type='all'; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${movFilter.type === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Todos (${exps.length + incs.length})</button>
            <button onclick="movFilter.type='exp'; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${movFilter.type === 'exp' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Gastos (${exps.length})</button>
            <button onclick="movFilter.type='inc'; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${movFilter.type === 'inc' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Ingresos (${incs.length})</button>
            <button onclick="movFilter.type='refund'; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${movFilter.type === 'refund' ? 'bg-amber-500 text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}">Devoluciones</button>

            <select onchange="movFilter.account=this.value; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant/40 text-on-surface flex-shrink-0">
              <option value="">Todas las cuentas</option>
              ${(S.accounts || defaultAccountsList()).map(a => `<option value="${a.id}" ${movFilter.account === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}
            </select>

            <select onchange="movFilter.cat=this.value; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant/40 text-on-surface flex-shrink-0">
              <option value="">Categorías</option>
              ${allCats().map(c => `<option value="${c.id}" ${movFilter.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>

            <select onchange="movFilter.method=this.value; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant/40 text-on-surface flex-shrink-0">
              <option value="">Método</option>
              ${PAY_METHODS.map(m => `<option value="${m.id}" ${movFilter.method === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
            </select>

            ${allTagsList.length > 0 ? `
              <select onchange="movFilter.tag=this.value; renderGastosView()" class="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-low border border-outline-variant/40 text-on-surface flex-shrink-0">
                <option value="">#etiquetas</option>
                ${allTagsList.map(t => `<option value="${esc(t)}" ${movFilter.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
              </select>
            ` : ''}
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <input type="number" step="1" placeholder="Mín (${esc(currencySymbol())})" value="${esc(movFilter.minAmt)}" onchange="movFilter.minAmt=this.value; renderGastosView()" class="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 font-bold text-on-surface"/>
            <input type="number" step="1" placeholder="Máx (${esc(currencySymbol())})" value="${esc(movFilter.maxAmt)}" onchange="movFilter.maxAmt=this.value; renderGastosView()" class="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 font-bold text-on-surface"/>
            <input type="date" value="${esc(movFilter.dateFrom)}" onchange="movFilter.dateFrom=this.value; renderGastosView()" aria-label="Desde fecha" class="px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 font-bold text-on-surface"/>
            <input type="date" value="${esc(movFilter.dateTo)}" onchange="movFilter.dateTo=this.value; renderGastosView()" aria-label="Hasta fecha" class="px-2.5 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 font-bold text-on-surface"/>
          </div>
        </div>

        <div class="bento-card rounded-2xl overflow-hidden">
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

    function updateStatsUniversalSearch(val) {
      statsUniversalQuery = val;
      renderAnaliticaView();
      const inp = $('#stats-universal-search');
      if (inp) {
        inp.focus();
        try { inp.setSelectionRange(val.length, val.length); } catch (e) {}
      }
    }

    /** Daily cumulative spending line vs previous month dashed ghost line */
    function renderGhostCumulativeSVG(mk) {
      const [Y, M] = mk.split('-').map(Number);
      const dim = new Date(Y, M, 0).getDate();
      const pMk = prevMonthKey(mk);
      const [pY, pM] = pMk.split('-').map(Number);
      const pDim = new Date(pY, pM, 0).getDate();
      const isCur = mk === monthKey(todayStr());
      const curLimitDay = isCur ? Math.min(dim, new Date().getDate()) : dim;

      const curDaily = new Array(dim).fill(0);
      monthExpenses(mk).forEach(e => {
        const d = Math.max(1, Math.min(dim, parseInt(String(e.date || '').slice(8, 10), 10) || 1));
        curDaily[d - 1] += (typeof e.amount_base_cents === 'number' ? e.amount_base_cents : Money.toCents(e.amount)) / 100;
      });
      const prevDaily = new Array(pDim).fill(0);
      monthExpenses(pMk).forEach(e => {
        const d = Math.max(1, Math.min(pDim, parseInt(String(e.date || '').slice(8, 10), 10) || 1));
        prevDaily[d - 1] += (typeof e.amount_base_cents === 'number' ? e.amount_base_cents : Money.toCents(e.amount)) / 100;
      });

      const curCum = [], prevCum = [];
      let acc = 0;
      for (let i = 0; i < curLimitDay; i++) { acc += curDaily[i]; curCum.push(acc); }
      acc = 0;
      for (let i = 0; i < pDim; i++) { acc += prevDaily[i]; prevCum.push(acc); }

      const maxVal = Math.max(...curCum, ...prevCum, 10);
      const W = 320, H = 110;
      const toPts = (arr, totalDays) => arr.map((v, i) => {
        const x = 6 + (i / Math.max(1, totalDays - 1)) * (W - 12);
        const y = H - 12 - (v / maxVal) * (H - 22);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');

      return `
        <svg viewBox="0 0 ${W} ${H}" class="w-full h-28" aria-label="Gasto acumulado diario comparado con el mes anterior">
          <line x1="6" y1="${H - 12}" x2="${W - 6}" y2="${H - 12}" stroke="currentColor" class="text-outline-variant/40" stroke-width="1"/>
          ${prevCum.length > 1 ? `<polyline fill="none" stroke="currentColor" class="text-outline" stroke-width="1.8" stroke-dasharray="4 3" points="${toPts(prevCum, pDim)}"/>` : ''}
          ${curCum.length > 1 ? `<polyline fill="none" stroke="#4f46e5" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" points="${toPts(curCum, dim)}"/>` : ''}
        </svg>`;
    }

    /** 12-Month Stacked Income vs Expense + Savings Rate % Trend */
    function renderAnnual12MonthsSVG(mk) {
      const [Y, M] = mk.split('-').map(Number);
      const mks = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(Y, M - 1 - i, 1);
        mks.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
      }
      const incs = mks.map(m => monthIncomeTotal(m));
      const exps = mks.map(m => sumExp(monthExpenses(m)));
      const rates = mks.map((m, i) => incs[i] > 0 ? Math.max(-50, Math.min(100, Math.round(((incs[i] - exps[i]) / incs[i]) * 100))) : 0);
      const labels = mks.map(m => new Date(+m.slice(0, 4), +m.slice(5) - 1, 1).toLocaleString('es-ES', { month: 'narrow' }).toUpperCase());

      const maxV = Math.max(...incs, ...exps, 1);
      const W = 360, H = 138, slot = W / 12, bw = Math.max(6, (slot - 8) / 2);
      let bars = '';
      const ratePts = [];
      labels.forEach((lb, i) => {
        const hI = Math.max(2, (incs[i] / maxV) * (H - 36));
        const hE = Math.max(2, (exps[i] / maxV) * (H - 36));
        const x = i * slot + 4;
        bars += `<rect x="${x.toFixed(1)}" y="${(H - 22 - hI).toFixed(1)}" width="${bw.toFixed(1)}" height="${hI.toFixed(1)}" rx="2" fill="#059669" fill-opacity="0.85"/>`;
        bars += `<rect x="${(x + bw + 1.5).toFixed(1)}" y="${(H - 22 - hE).toFixed(1)}" width="${bw.toFixed(1)}" height="${hE.toFixed(1)}" rx="2" fill="#e11d48" fill-opacity="0.85"/>`;
        bars += `<text x="${(x + bw).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" class="text-on-surface-variant">${lb}</text>`;
        const ry = (H - 26) - ((rates[i] + 50) / 150) * (H - 42);
        ratePts.push(`${(x + bw).toFixed(1)},${ry.toFixed(1)}`);
      });

      const avgRate = Math.round(rates.reduce((a, b) => a + b, 0) / 12);
      return {
        avgRate,
        svg: `
          <svg viewBox="0 0 ${W} ${H}" class="w-full h-36" aria-label="Evolución anual de ingresos, gastos y tasa de ahorro">
            ${bars}
            <polyline fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${ratePts.join(' ')}"/>
          </svg>`
      };
    }

    // ============================================================================
    // 12. VIEW 4: STATS (PREDICTIVE + RETROSPECTIVE ANALYTICS + UNIVERSAL SEARCH)
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
      const proj = computeEndOfMonthProjection(mk);
      const catProjs = computeCategoryProjections(mk).slice(0, 6);
      const horizon = computeExtendedHorizon();
      const annual = renderAnnual12MonthsSVG(mk);

      // 3-Way Semantic Comparisons: vs Prev Month, vs 6-Month Avg, vs Same Month Last Year
      const prevMk = prevMonthKey(mk);
      const prevExp = sumExp(monthExpenses(prevMk));
      const lastYearMk = `${Y - 1}-${String(M).padStart(2, '0')}`;
      const lastYearExp = sumExp(monthExpenses(lastYearMk));
      let sum6Exp = 0, cnt6 = 0;
      for (let i = 1; i <= 6; i++) {
        const v = sumExp(monthExpenses(shiftMonthKeyStr(mk, -i)));
        if (v > 0) { sum6Exp += v; cnt6++; }
      }
      const avg6Exp = cnt6 > 0 ? sum6Exp / cnt6 : 0;
      const deltaPct = (cur, ref) => ref > 0 ? Math.round(((cur - ref) / ref) * 100) : null;
      const cmpPrev = deltaPct(totalExp, prevExp);
      const cmpAvg6 = deltaPct(totalExp, avg6Exp);
      const cmpYoY = deltaPct(totalExp, lastYearExp);

      const renderCmpChip = (label, pct, refVal) => {
        if (pct === null) return `<div class="p-3 rounded-2xl bg-surface-container-low text-center"><p class="text-[10px] font-bold uppercase text-on-surface-variant">${label}</p><p class="text-xs font-extrabold text-outline mt-1">Sin histórico</p></div>`;
        const isBetter = pct <= 0;
        return `
          <div class="p-3 rounded-2xl bg-surface-container-low text-center">
            <p class="text-[10px] font-bold uppercase text-on-surface-variant">${label}</p>
            <p class="text-sm font-extrabold mt-0.5 ${isBetter ? 'text-secondary' : 'text-amber-600'}">${isBetter ? '↓' : '↑'} ${Math.abs(pct)}%</p>
            <p class="text-[10px] text-outline tabular-nums privacy-val">Ref: ${fmt0(refVal)}</p>
          </div>`;
      };

      const needSum = sumExp(exps.filter(e => NEEDS.includes(e.cat)));
      const wantSum = sumExp(exps.filter(e => WANTS.includes(e.cat)));
      const pNeed = totalInc > 0 ? (needSum / totalInc) * 100 : 0;
      const pWant = totalInc > 0 ? (wantSum / totalInc) * 100 : 0;
      const pSave = totalInc > 0 ? Math.max(0, ((totalInc - totalExp) / totalInc) * 100) : 0;

      // Interactive Calendar Heatmap with Intensity Shading + Weekday Peak Detection
      const firstDay = new Date(Y, M - 1, 1);
      const startDow = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(Y, M, 0).getDate();
      const byDay = {};
      const dowSum = [0, 0, 0, 0, 0, 0, 0];
      exps.forEach(e => {
        const d = +String(e.date || '').slice(8, 10);
        byDay[d] = (byDay[d] || 0) + Number(e.amount || 0);
        const dt = new Date((e.date || todayStr()) + 'T12:00:00');
        if (!isNaN(dt)) dowSum[dt.getDay()] += Number(e.amount || 0);
      });
      const maxDayExp = Math.max(...Object.values(byDay), 1);
      const upDays = {};
      upcomingRecurring(mk).forEach(r => { if (r.day) upDays[r.day] = (upDays[r.day] || 0) + r.amount; });

      const dowNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
      const peakDowVal = Math.max(...dowSum);
      const peakDowIdx = peakDowVal > 0 ? dowSum.indexOf(peakDowVal) : -1;

      let calCellsHtml = ["L", "M", "X", "J", "V", "S", "D"].map(w => `<div class="text-[11px] font-extrabold text-outline py-1">${w}</div>`).join("");
      for (let i = 0; i < startDow; i++) calCellsHtml += `<div></div>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${mk}-${String(d).padStart(2, '0')}`;
        const val = byDay[d] || 0;
        const hasUp = upDays[d] > 0;
        const intensity = val > 0 ? Math.min(1, val / maxDayExp) : 0;
        const bgStyle = val > 0
          ? `background:rgba(79,70,229,${(0.14 + intensity * 0.66).toFixed(2)});color:${intensity > 0.55 ? '#ffffff' : 'var(--primary)'};`
          : '';
        const styleCls = val > 0
          ? "font-extrabold border border-primary/30"
          : hasUp
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30"
            : "bg-surface-container-low text-on-surface-variant";
        const tip = val > 0 ? `${ds}: ${fmt(val)}` : hasUp ? `Fijo previsto: ${fmt(upDays[d])}` : ds;
        calCellsHtml += `<button type="button" onclick="haptic('selection'); openHeatmapDayModal('${ds}')" style="${bgStyle}" class="py-2 rounded-xl text-xs transition active-scale ${styleCls}" title="${esc(tip)}">${d}</button>`;
      }

      // Enriched Top Merchants (total, visit frequency, average ticket)
      const merchMap = {};
      exps.forEach(e => {
        const k = cleanNoteText(e.note);
        if (!k) return;
        if (!merchMap[k]) merchMap[k] = { cents: 0, count: 0 };
        merchMap[k].cents += (typeof e.amount_base_cents === 'number' ? e.amount_base_cents : Money.toCents(e.amount));
        merchMap[k].count += 1;
      });
      const topMerchHtml = Object.entries(merchMap).sort((a, b) => b[1].cents - a[1].cents).slice(0, 6).map(([name, info], idx) => {
        const avgCents = Math.round(info.cents / info.count);
        return `
          <div class="flex items-center justify-between py-2.5 border-b border-outline-variant/20 last:border-0 gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-6 h-6 rounded-lg bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center flex-shrink-0">${idx + 1}</span>
              <div class="min-w-0">
                <p class="font-label-lg text-sm font-bold text-on-surface truncate">${esc(name)}</p>
                <p class="text-[11px] text-on-surface-variant">${info.count} visita${info.count === 1 ? '' : 's'} · ticket medio <span class="privacy-val">${fmt0(Money.fromCents(avgCents))}</span></p>
              </div>
            </div>
            <span class="font-headline-sm text-sm font-extrabold text-on-surface tabular-nums privacy-val flex-shrink-0">−${fmt(Money.fromCents(info.cents))}</span>
          </div>`;
      }).join('') || `<p class="text-xs text-on-surface-variant py-4 text-center">Sin comercios registrados este mes.</p>`;

      // Universal Search Results Block (when statsUniversalQuery is non-empty)
      let searchResultsHtml = '';
      if (statsUniversalQuery.trim().length > 0) {
        const res = runUniversalSearch(statsUniversalQuery);
        const totalMatchCents = sumExpCents(res.transactions);
        searchResultsHtml = `
          <div class="bento-card p-4 rounded-2xl border-l-4 border-l-primary flex flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs font-extrabold text-on-surface">
                Resultados: ${res.transactions.length} gasto(s) (<span class="text-primary privacy-val">${fmt(Money.fromCents(totalMatchCents))}</span>) · ${res.debts.length} deuda(s) · ${res.groups.length} grupo(s)
              </p>
              <button onclick="updateStatsUniversalSearch('')" class="text-xs font-bold text-tertiary hover:underline">Cerrar búsqueda</button>
            </div>
            ${res.transactions.length > 0 ? `
              <div class="rounded-xl border border-outline-variant/30 overflow-hidden max-h-60 overflow-y-auto">
                ${renderDateGroupedTransactionsHtml(res.transactions.slice(0, 10).map(e => ({ ...e, _k: 'exp' })))}
              </div>
            ` : ''}
            ${res.debts.length > 0 ? `
              <div class="flex flex-wrap gap-2">
                ${res.debts.map(d => `<button onclick="switchMainView('cuentas','balance')" class="px-3 py-1.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface">🤝 ${esc(d.person)}: ${fmt(d.amount)}</button>`).join('')}
              </div>
            ` : ''}
            ${res.transactions.length === 0 && res.debts.length === 0 && res.groups.length === 0 ? `<p class="text-xs text-on-surface-variant">Sin coincidencias para «${esc(statsUniversalQuery)}».</p>` : ''}
          </div>`;
      }

      el.innerHTML = `
        <!-- UNIVERSAL NATURAL LANGUAGE SEARCH + QUICK COPILOT ACTIONS -->
        <div class="bento-card p-4 rounded-3xl flex flex-col gap-3">
          <div class="relative">
            <span class="absolute left-3.5 top-2.5 text-primary pointer-events-none">${ico('search', 'text-[18px]')}</span>
            <input id="stats-universal-search" type="text" value="${esc(statsUniversalQuery)}" oninput="updateStatsUniversalSearch(this.value)" placeholder="Búsqueda inteligente: «gastos >50€ en restaurantes noviembre», «mercadona»..." class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/45 text-xs sm:text-sm font-semibold text-on-surface focus:border-primary outline-none"/>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto custom-scroll pb-0.5">
            <button onclick="haptic('selection'); openCoachChatModal()" class="px-3.5 py-2 rounded-xl hero-indigo text-white text-xs font-extrabold flex items-center gap-1.5 flex-shrink-0 active-scale">${ico('chat', 'text-[14px]')} Chat con Coach</button>
            <button onclick="haptic('selection'); openWhatIfSimulatorModal('${mk}')" class="px-3.5 py-2 rounded-xl bg-primary/12 text-primary text-xs font-extrabold flex items-center gap-1.5 flex-shrink-0 active-scale">${ico('tune', 'text-[14px]')} Simulador What-If</button>
            <button onclick="haptic('selection'); openProjectionExplainModal('${mk}')" class="px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-xs font-bold flex items-center gap-1.5 flex-shrink-0 active-scale">${ico('info', 'text-[14px]')} ¿Cómo se calcula?</button>
            <button onclick="haptic('selection'); exportPrintablePDFReport('month')" class="px-3.5 py-2 rounded-xl bg-secondary/12 text-secondary text-xs font-extrabold flex items-center gap-1.5 flex-shrink-0 active-scale">${ico('download', 'text-[14px]')} Informe PDF</button>
          </div>
        </div>

        ${searchResultsHtml}

        <!-- ROW 1: SCORE + SEMANTIC COMPARISONS + AFFORDABILITY -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bento-card p-5 rounded-3xl flex flex-col gap-3.5">
            <div class="flex items-center gap-4">
              <div class="flex-shrink-0">${renderScoreRingSVG(scoreObj.score)}</div>
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  ${ico('auto_awesome', 'text-primary text-[18px]')}
                  <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Salud Financiera</h3>
                </div>
                <p class="font-body-sm text-xs text-on-surface-variant">${esc(scoreObj.tips[0] || "Excelente gestión mensual y control de presupuesto.")}</p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              ${renderCmpChip('Vs mes ant.', cmpPrev, prevExp)}
              ${renderCmpChip('Vs media 6m', cmpAvg6, avg6Exp)}
              ${renderCmpChip('Vs año ant.', cmpYoY, lastYearExp)}
            </div>
          </div>

          <div class="bento-card p-5 rounded-3xl flex flex-col justify-between gap-3">
            <div>
              <div class="flex items-center gap-1.5">
                ${ico('psychology_alt', 'text-primary text-[18px]')}
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">¿Me lo puedo permitir hoy?</h3>
              </div>
              <p class="font-body-sm text-xs text-on-surface-variant">Comprueba una compra frente a tu margen disponible (<span class="privacy-val">${fmt(Money.fromCents(proj.availableForVariableCents))}</span>)</p>
            </div>
            <div class="flex items-center gap-2">
              <input id="sim-input-price" type="number" step="0.01" placeholder="Importe (${esc(currencySymbol())})" class="flex-1 px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface outline-none focus:border-primary"/>
              <button onclick="runAffordabilitySimulator()" class="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition active-scale">Calcular</button>
            </div>
            <div id="sim-output-box" class="text-xs font-semibold"></div>
          </div>
        </div>

        <!-- ROW 2: EXPLAINABLE PROJECTION RANGE + GHOST LINE CUMULATIVE -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bento-card p-5 rounded-3xl flex flex-col justify-between gap-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Proyección Fin de Mes</h3>
                <p class="text-xs text-on-surface-variant">Estacionalidad ×${proj.seasonMult.toFixed(2)} · Ritmo <span class="privacy-val">${fmt0(Money.fromCents(proj.dailyPaceCents))}/día</span></p>
              </div>
              <button onclick="openProjectionExplainModal('${mk}')" class="text-[11px] font-extrabold text-primary hover:underline">¿Cómo?</button>
            </div>
            <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-2">
              <div>
                <p class="text-[10px] font-extrabold uppercase text-on-surface-variant">Rango estimado (P25–P75)</p>
                <p class="text-base font-extrabold tabular-nums privacy-val mt-0.5 ${proj.projectedEndMidCents >= 0 ? 'text-secondary' : 'text-tertiary'}">
                  Entre ${fmtSigned(Money.fromCents(proj.projectedEndLowCents))} y ${fmtSigned(Money.fromCents(proj.projectedEndHighCents))}
                </p>
              </div>
              <button onclick="openWhatIfSimulatorModal('${mk}')" class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-extrabold active-scale flex-shrink-0">What-If</button>
            </div>
            <div class="flex flex-col gap-1.5">
              ${catProjs.slice(0, 4).map(cp => `
                <div class="flex items-center justify-between text-xs py-1 border-b border-outline-variant/15 last:border-0">
                  <span class="font-bold text-on-surface truncate">${esc(cp.cat.name)}</span>
                  <span class="text-on-surface-variant tabular-nums privacy-val">Llevas ${fmt0(Money.fromCents(cp.spentCents))} → <strong class="text-on-surface">~${fmt0(Money.fromCents(cp.estEndCents))}</strong>${cp.avgCents > 0 ? ` <span class="text-[10px]">(media ${fmt0(Money.fromCents(cp.avgCents))})</span>` : ''}</span>
                </div>
              `).join('') || `<p class="text-xs text-on-surface-variant">Añade gastos para ver la previsión por categoría.</p>`}
            </div>
          </div>

          <div class="bento-card p-5 rounded-3xl flex flex-col justify-between gap-2">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Gasto Acumulado vs Mes Anterior</h3>
                <p class="text-xs text-on-surface-variant">Línea sólida: este mes · Punteada: mes pasado</p>
              </div>
              <span class="text-xs font-extrabold text-primary tabular-nums privacy-val">${fmt0(totalExp)}</span>
            </div>
            ${renderGhostCumulativeSVG(mk)}
            <div class="flex items-center justify-between text-[11px] text-on-surface-variant pt-1">
              <span>Día 1</span>
              <span>Día 15</span>
              <span>Día ${daysInMonth}</span>
            </div>
          </div>
        </div>

        <!-- ROW 3: 12-MONTH ANNUAL EVOLUTION + EXTENDED 3/6M HORIZON -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bento-card p-5 rounded-3xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Evolución 12 Meses</h3>
                <p class="text-xs text-on-surface-variant">Ingresos (verde) · Gastos (rojo) · Tasa ahorro (índigo)</p>
              </div>
              <span class="text-xs font-extrabold px-2.5 py-1 rounded-full bg-primary/10 text-primary">Ahorro medio ${annual.avgRate}%</span>
            </div>
            ${annual.svg}
          </div>

          <div class="bento-card p-5 rounded-3xl flex flex-col justify-between gap-3">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Horizonte a 3 y 6 Meses</h3>
              <p class="text-xs text-on-surface-variant">Proyección de ahorro acumulado y llegada a tus metas</p>
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <div class="p-3 rounded-2xl bg-surface-container-low">
                <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">En 3 meses</span>
                <p class="text-lg font-extrabold tabular-nums privacy-val mt-0.5 ${horizon.horizon3Cents >= 0 ? 'text-secondary' : 'text-tertiary'}">${fmtSigned(Money.fromCents(horizon.horizon3Cents))}</p>
              </div>
              <div class="p-3 rounded-2xl bg-surface-container-low">
                <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">En 6 meses</span>
                <p class="text-lg font-extrabold tabular-nums privacy-val mt-0.5 ${horizon.horizon6Cents >= 0 ? 'text-secondary' : 'text-tertiary'}">${fmtSigned(Money.fromCents(horizon.horizon6Cents))}</p>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              ${horizon.goalProjections.slice(0, 2).map(gp => `
                <div class="p-2.5 rounded-xl bg-surface-container-low text-xs">
                  <p class="font-extrabold text-on-surface">🎯 ${esc(gp.name)}: <span class="text-primary">${esc(gp.etaLabel)}</span></p>
                  <p class="text-[11px] text-on-surface-variant">Con +30 €/mes extra llegas en <strong>${esc(gp.boostedEtaLabel)}</strong></p>
                </div>
              `).join('') || `<button onclick="switchMainView('ajustes','obj')" class="text-xs font-bold text-primary hover:underline text-left">+ Crea una meta de ahorro para proyectar su fecha de llegada →</button>`}
            </div>
          </div>
        </div>

        <!-- ROW 4: INTERACTIVE HEATMAP + 50/30/20 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bento-card p-5 rounded-3xl flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface capitalize">Heatmap · ${monthLabel(mk)}</h3>
                <p class="text-[11px] text-on-surface-variant">${peakDowIdx >= 0 ? `Tus picos de gasto son los <strong>${dowNames[peakDowIdx]}</strong> · Toca un día` : 'Toca cualquier día para ver sus movimientos'}</p>
              </div>
            </div>
            <div class="grid grid-cols-7 gap-1.5 text-center">
              ${calCellsHtml}
            </div>
          </div>

          <div class="bento-card p-5 rounded-3xl flex flex-col justify-between gap-3.5">
            <div class="flex flex-col gap-3">
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Regla 50 / 30 / 20</h3>
              ${renderRule503020Row("Necesidades (Vivienda, Comida, Transp.)", pNeed, 50, "#0ea5e9")}
              ${renderRule503020Row("Caprichos y Ocio (Restaur., Compras, Susc.)", pWant, 30, "#8b5cf6")}
              ${renderRule503020Row("Ahorro Neto Mensual", pSave, 20, "#006c4a", true)}
            </div>
            <p class="text-[10px] text-outline">Estimaciones orientativas basadas en tus datos personales, no asesoramiento financiero regulado.</p>
          </div>
        </div>

        <!-- ROW 5: SMART ADVISOR + ENRICHED TOP MERCHANTS -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div class="md:col-span-6 bento-card p-5 rounded-3xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                ${ico('tips_and_updates', 'text-primary text-[19px]')}
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Insights del Coach</h3>
              </div>
              <button onclick="openCoachChatModal()" class="text-xs font-extrabold text-primary hover:underline">Abrir chat →</button>
            </div>
            <div class="flex flex-col gap-2">
              ${generateSmartAdvisorTipsHtml()}
            </div>
          </div>

          <div class="md:col-span-6 bento-card p-5 rounded-3xl flex flex-col gap-2">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Top Comercios (Total, Visitas y Ticket Medio)</h3>
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
             ${ico('check_circle', 'text-[18px]')}
             <span>¡Sí puedes! Te quedarían <strong>${fmt(rest)}</strong> de margen seguro este mes.</span>
           </div>`
        : `<div class="p-3 rounded-xl bg-tertiary/10 text-tertiary flex items-center gap-2">
             ${ico('warning', 'text-[18px]')}
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
          ${ico(t.icon, `text-[18px] mt-0.5 ${t.type === 'warn' ? 'text-amber-600' : t.type === 'good' ? 'text-secondary' : 'text-primary'}`)}
          <div class="leading-relaxed">${t.text}</div>
        </div>
      `).join('');
    }
