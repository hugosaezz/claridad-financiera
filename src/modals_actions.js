    // ============================================================================
    // 14. MODALS, SHEETS, MULTI-USER AUTH, SUPABASE CRUD & WHATSAPP ACTIONS
    // ============================================================================
    function openUniversalModal(html) {
      const modal = $('#universal-modal');
      const box = $('#universal-modal-box');
      if (!modal || !box) return;
      box.innerHTML = html;
      modal.classList.remove('hidden');
    }

    function closeUniversalModal() {
      const modal = $('#universal-modal');
      if (modal) modal.classList.add('hidden');
      stopVoiceRecognition();
    }

    function openQuickActionSheet() {
      $('#quick-action-sheet')?.classList.remove('hidden');
    }
    function closeQuickActionSheet() {
      $('#quick-action-sheet')?.classList.add('hidden');
    }

    function showToast(msg) {
      let t = $('#claridad-toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'claridad-toast';
        t.className = 'fixed left-1/2 -translate-x-1/2 bottom-20 z-50 bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-2xl font-label-md text-xs font-bold shadow-2xl border border-white/10 transition-all duration-200 opacity-0 pointer-events-none';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.remove('opacity-0');
      t.classList.add('opacity-100');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => {
        t.classList.remove('opacity-100');
        t.classList.add('opacity-0');
      }, 2800);
    }

    function toggleTheme() {
      const html = document.documentElement;
      const isDark = html.classList.toggle('dark');
      html.classList.toggle('light', !isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      if (S && S.settings) {
        S.settings.dark = isDark;
        saveLocalState();
      }
      const ic = $('#theme-icon');
      if (ic) ic.textContent = isDark ? 'light_mode' : 'dark_mode';
    }

    function initTheme() {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved ? saved === 'dark' : (S?.settings?.dark || prefersDark);
      const html = document.documentElement;
      html.classList.toggle('dark', isDark);
      html.classList.toggle('light', !isDark);
      const ic = $('#theme-icon');
      if (ic) ic.textContent = isDark ? 'light_mode' : 'dark_mode';
    }

    // Notifications Drawer
    function toggleNotificationsDrawer() {
      const dr = $('#notifications-drawer');
      if (!dr) return;
      const isHidden = dr.classList.toggle('hidden');
      if (!isHidden) renderNotificationsDrawerContent();
    }

    function renderNotificationsDrawerContent() {
      const box = $('#notifications-content');
      if (!box) return;

      const pendingPayments = sbMovimientos.filter(m => m.tipo === 'pago' && m.estado === 'pendiente');
      const overdueP2P = (S.debts || []).filter(d => !d.settled && d.type === 'owed' && d.due && d.due < todayStr());
      const refunds = (S.expenses || []).filter(e => e.refund);

      let html = '';

      if (isAdmin && pendingPayments.length > 0) {
        html += `<div class="text-[11px] font-extrabold uppercase text-amber-600 tracking-wider">Pagos pendientes de confirmar (Supabase)</div>`;
        pendingPayments.forEach(p => {
          const u = sbGlobalUsers.find(x => Number(x.id) === Number(p.usuario_id));
          const uName = u ? u.nombre : 'Miembro';
          html += `
            <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-label-lg text-sm font-bold text-on-surface">${esc(uName)} notificó un pago</p>
                  <p class="text-xs text-on-surface-variant">${p.created_at ? fmtDay(p.created_at.slice(0, 10)) : 'Hoy'}</p>
                </div>
                <span class="font-headline-sm text-base font-extrabold text-secondary">+${fmt(p.monto)}</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button onclick="rechazarPagoSupabase(${p.id})" class="py-1.5 rounded-xl bg-surface-container text-on-surface-variant font-bold text-xs hover:bg-tertiary/15 hover:text-tertiary transition">Rechazar</button>
                <button onclick="aprobarPagoSupabase(${p.id}, ${p.usuario_id}, ${p.monto})" class="py-1.5 rounded-xl bg-secondary text-white font-bold text-xs hover:opacity-90 transition">Confirmar cobro</button>
              </div>
            </div>`;
        });
      }

      if (overdueP2P.length > 0) {
        html += `<div class="text-[11px] font-extrabold uppercase text-tertiary tracking-wider mt-2">Préstamos P2P con plazo vencido</div>`;
        overdueP2P.forEach(d => {
          html += `
            <div class="p-3.5 rounded-2xl bg-tertiary/10 border border-tertiary/25 flex items-center justify-between gap-2">
              <div>
                <p class="font-label-lg text-sm font-bold text-on-surface">${esc(d.person)} (${fmt(d.amount)})</p>
                <p class="text-xs text-on-surface-variant">${esc(d.note)} • Venció ${fmtDay(d.due)}</p>
              </div>
              <button onclick="sendIndividualWhatsAppClaim('${esc(d.person)}', ${d.amount}, '${esc(d.note)}')" class="px-3 py-1.5 rounded-xl bg-tertiary text-white text-xs font-bold">Reclamar</button>
            </div>`;
        });
      }

      if (refunds.length > 0) {
        html += `<div class="text-[11px] font-extrabold uppercase text-primary tracking-wider mt-2">Devoluciones por cobrar</div>`;
        refunds.forEach(e => {
          html += `
            <div class="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-2">
              <div>
                <p class="font-label-lg text-sm font-bold text-on-surface">${esc(cleanNoteText(e.note, 'Compra'))}</p>
                <p class="text-xs text-on-surface-variant">${fmtDay(e.date)} • ${fmt(e.amount)}</p>
              </div>
              <button onclick="markExpenseRefunded('${e.id}'); renderNotificationsDrawerContent()" class="px-3 py-1.5 rounded-xl bg-secondary/15 text-secondary text-xs font-bold">✓ Cobrado</button>
            </div>`;
        });
      }

      if (!html) {
        html = `
          <div class="p-8 text-center flex flex-col items-center gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl text-secondary">notifications_off</span>
            <p class="font-bold text-sm text-on-surface">Todo al día</p>
            <p class="text-xs">No hay pagos pendientes de aprobación ni alertas urgentes.</p>
          </div>`;
      }

      box.innerHTML = html;
    }

    // ============================================================================
    // 15. MULTI-USER LOGIN, SELF-REGISTRATION & ACCOUNT SWITCHING (Supabase)
    // ============================================================================
    function openProfileOrLogin(defaultRegisterTab = false) {
      const myUser = sbGlobalUsers.find(u => Number(u.id) === Number(loggedUserId));
      const userOptions = sbGlobalUsers.map(u => {
        const isH = u.nombre.toLowerCase() === 'hugo';
        return `<option value="${u.id}" ${Number(u.id) === Number(loggedUserId) ? 'selected' : ''}>${isH ? '👑 ' : '👤 '}${esc(u.nombre)}${isH ? ' (Super Admin)' : ''}</option>`;
      }).join('');

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div class="flex items-center gap-2.5">
              <span class="w-10 h-10 rounded-full bg-primary text-on-primary font-extrabold flex items-center justify-center">${isAdmin ? '👑' : initials(myUser?.nombre || 'U')}</span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${myUser ? `Cuenta activa: ${esc(myUser.nombre)}` : 'Acceso Multi-Usuario'}</h3>
                <p class="text-xs text-on-surface-variant">Cada usuario tiene su propio registro de Control Mensual y Deudas</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>

          <!-- Tabs: Iniciar Sesión vs Crear Cuenta Nueva -->
          <div class="grid grid-cols-2 bg-surface-container p-1 rounded-xl gap-1">
            <button type="button" id="auth-tab-login" onclick="switchAuthModalTab('login')" class="py-2 rounded-lg text-xs font-extrabold transition ${!defaultRegisterTab ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">
              Entrar con mi usuario
            </button>
            <button type="button" id="auth-tab-register" onclick="switchAuthModalTab('register')" class="py-2 rounded-lg text-xs font-extrabold transition ${defaultRegisterTab ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">
              + Crear cuenta nueva
            </button>
          </div>

          <!-- Login Existing User Box -->
          <div id="auth-box-login" class="${defaultRegisterTab ? 'hidden' : 'flex'} p-4 rounded-2xl bg-surface-container-low flex-col gap-3">
            <label class="text-xs font-extrabold uppercase text-on-surface-variant">Selecciona tu usuario (${sbGlobalUsers.length} registrados)</label>
            <select id="modal-login-user" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm font-bold text-on-surface">
              ${userOptions}
            </select>
            <div>
              <label class="text-[11px] font-bold text-on-surface-variant block mb-1">Tu contraseña / PIN</label>
              <input id="modal-login-pin" type="password" placeholder="PIN (por defecto 0000 o hugo123)" onkeypress="if(event.key==='Enter') performSupabaseLogin()" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            </div>
            <button onclick="performSupabaseLogin()" class="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold hover:bg-primary-container transition active-scale">
              Entrar a mi Registro Personal
            </button>
          </div>

          <!-- Register New User Box -->
          <div id="auth-box-register" class="${defaultRegisterTab ? 'flex' : 'hidden'} p-4 rounded-2xl bg-surface-container-low flex-col gap-3">
            <label class="text-xs font-extrabold uppercase text-secondary">Crear nuevo usuario en Supabase</label>
            <div>
              <label class="text-[11px] font-bold text-on-surface-variant block mb-1">Tu nombre o alias</label>
              <input id="modal-reg-name" type="text" placeholder="Ej. Martín, Elena, Marcos..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="text-[11px] font-bold text-on-surface-variant block mb-1">Elige tu PIN / Clave</label>
                <input id="modal-reg-pin" type="password" placeholder="Ej. 1234" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm font-bold text-on-surface"/>
              </div>
              <div>
                <label class="text-[11px] font-bold text-on-surface-variant block mb-1">Nómina mensual (€ opc.)</label>
                <input id="modal-reg-salary" type="number" step="50" placeholder="Ej. 1600" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm font-bold text-on-surface"/>
              </div>
            </div>
            <label class="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
              <input id="modal-reg-join-general" type="checkbox" checked class="w-4 h-4 rounded text-primary"/>
              Unirme también al grupo General en Supabase
            </label>
            <button onclick="registerNewSupabaseAccount()" class="w-full py-2.5 rounded-xl bg-secondary text-on-secondary font-label-lg text-sm font-bold hover:opacity-95 transition active-scale">
              Crear mi Cuenta y Entrar
            </button>
          </div>

          ${loggedUserId ? `
            <div class="p-3.5 rounded-2xl border border-outline-variant/30 flex flex-col gap-2">
              <label class="text-[11px] font-extrabold uppercase text-on-surface-variant">Cambiar PIN de ${esc(myUser?.nombre || 'mi cuenta')}</label>
              <div class="flex gap-2">
                <input id="modal-new-pin" type="password" placeholder="Nuevo PIN" class="flex-1 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"/>
                <button onclick="updateMySupabasePin()" class="px-3.5 py-1.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-primary hover:text-on-primary transition">Actualizar PIN</button>
              </div>
            </div>
          ` : ''}
        </div>
      `);
    }

    function switchAuthModalTab(tab) {
      const isReg = tab === 'register';
      $('#auth-box-login')?.classList.toggle('hidden', isReg);
      $('#auth-box-login')?.classList.toggle('flex', !isReg);
      $('#auth-box-register')?.classList.toggle('hidden', !isReg);
      $('#auth-box-register')?.classList.toggle('flex', isReg);
      const bLog = $('#auth-tab-login');
      const bReg = $('#auth-tab-register');
      if (bLog && bReg) {
        bLog.className = `py-2 rounded-lg text-xs font-extrabold transition ${!isReg ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}`;
        bReg.className = `py-2 rounded-lg text-xs font-extrabold transition ${isReg ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}`;
      }
    }

    async function performSupabaseLogin() {
      const userId = $('#modal-login-user')?.value;
      const pin = ($('#modal-login-pin')?.value || '').trim();
      if (!userId) return;

      const user = sbGlobalUsers.find(u => String(u.id) === String(userId));
      if (!user) return;
      const isHugo = user.nombre.toLowerCase().trim() === 'hugo';
      const userPass = (user.password || '0000').trim();
      const valid = (pin === userPass) || (isHugo && (pin === 'hugo123' || pin === '0000' || pin === ''));

      if (!valid) {
        alert(`PIN incorrecto para ${user.nombre}. (Por defecto los miembros tienen 0000)`);
        return;
      }

      await switchToUserSession(Number(user.id), isHugo);
      closeUniversalModal();
    }

    async function quickSwitchToUser(uidNum) {
      if (!isAdmin) return;
      const user = sbGlobalUsers.find(u => Number(u.id) === Number(uidNum));
      if (!user) return;
      const isHugo = user.nombre.toLowerCase().trim() === 'hugo';
      await switchToUserSession(Number(user.id), isHugo);
    }

    async function switchToUserSession(uidNum, adminFlag) {
      // Save current user's state before switching
      if (loggedUserId && S) {
        saveLocalState(true);
      }
      loggedUserId = Number(uidNum);
      isAdmin = !!adminFlag;
      localStorage.setItem('logged_user_id', String(loggedUserId));
      localStorage.setItem('is_admin', isAdmin ? 'true' : 'false');

      // Load the new user's isolated state from localStorage + Supabase Cloud
      loadLocalStateForCurrentUser();
      await cargarDatosSupabase(true);
    }

    async function registerNewSupabaseAccount() {
      const name = ($('#modal-reg-name')?.value || '').trim();
      const pin = ($('#modal-reg-pin')?.value || '').trim() || '0000';
      const salary = parseAmount($('#modal-reg-salary')?.value);
      const joinGen = !!$('#modal-reg-join-general')?.checked;

      if (!name) {
        alert("Escribe tu nombre para crear la cuenta.");
        return;
      }
      if (!supabaseClient) return;

      // Check if name already exists
      const existing = sbGlobalUsers.find(u => u.nombre.toLowerCase() === name.toLowerCase());
      if (existing) {
        alert(`El usuario «${existing.nombre}» ya existe. Selecciona la pestaña «Entrar con mi usuario».`);
        switchAuthModalTab('login');
        return;
      }

      closeUniversalModal();
      const { data: created, error } = await supabaseClient
        .from('usuarios')
        .insert([{ nombre: name, deuda: 0, password: pin }])
        .select();

      if (error || !created || created.length === 0) {
        alert("Error creando usuario en Supabase: " + (error?.message || "Desconocido"));
        return;
      }

      const newUser = created[0];
      const genGroupId = window.generalGroupId || 1;
      if (joinGen && genGroupId) {
        await supabaseClient.from('grupo_usuarios').insert([{
          grupo_id: genGroupId,
          usuario_id: newUser.id,
          deuda: 0
        }]);
      }

      // Initialize personal profile for this new user
      loggedUserId = Number(newUser.id);
      isAdmin = name.toLowerCase() === 'hugo';
      localStorage.setItem('logged_user_id', String(loggedUserId));
      localStorage.setItem('is_admin', isAdmin ? 'true' : 'false');

      S = blankState(salary);
      saveLocalState(true);
      showToast(`¡Cuenta de ${name} creada en Supabase! 🎉`);
      await cargarDatosSupabase(false);
    }

    async function updateMySupabasePin() {
      const newPin = ($('#modal-new-pin')?.value || '').trim();
      if (!newPin || !loggedUserId || !supabaseClient) return;
      await supabaseClient.from('usuarios').update({ password: newPin }).eq('id', loggedUserId);
      closeUniversalModal();
      showToast("PIN actualizado en Supabase ✓");
      await cargarDatosSupabase();
    }

    async function editSupabaseUserAdmin(userId) {
      if (!isAdmin || !supabaseClient) return;
      const u = sbGlobalUsers.find(x => Number(x.id) === Number(userId));
      if (!u) return;
      const newName = prompt(`Nombre del usuario #${u.id}:`, u.nombre);
      if (newName === null) return;
      const newPin = prompt(`PIN de acceso para ${newName}:`, u.password || '0000');
      if (newPin === null) return;
      await supabaseClient.from('usuarios').update({ nombre: newName.trim(), password: newPin.trim() }).eq('id', u.id);
      showToast("Usuario actualizado ✓");
      await cargarDatosSupabase();
    }

    function copySupabaseMigrationSQL() {
      const sql = `-- Nuevas columnas para registro personal por usuario en Supabase
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS datos_personales JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS telefono_bizum TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS presupuesto_mensual NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nomina_mensual NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS acreedor_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;`;
      navigator.clipboard?.writeText(sql);
      showToast("SQL copiado al portapapeles ✓");
    }

    function seedDemoForCurrentUser() {
      seedInitialData();
      saveLocalState(true);
      renderAllViews();
      showToast("Datos de ejemplo cargados en tu cuenta ✓");
    }

    // Group Creation & Deletion
    function openNewGroupModal() {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Crear Nuevo Grupo en Supabase Cloud</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Nombre del grupo</label>
            <input id="new-cloud-group-name" type="text" placeholder="Ej. Viaje Mallorca, Piso, Cena Navidad..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <button onclick="createSupabaseGroup()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold hover:bg-primary-container transition active-scale">
            Crear Grupo
          </button>
        </div>
      `);
    }

    async function createSupabaseGroup() {
      const name = ($('#new-cloud-group-name')?.value || '').trim();
      if (!name || !supabaseClient) return;
      closeUniversalModal();
      const { data } = await supabaseClient.from('grupos').insert([{ nombre: name, admin_id: loggedUserId || 2 }]).select();
      if (data && data.length > 0) {
        currentGroupId = data[0].id;
        localStorage.setItem('last_group_id', currentGroupId);
        // Automatically add the creator as a member of their new group
        if (loggedUserId) {
          await supabaseClient.from('grupo_usuarios').insert([{ grupo_id: currentGroupId, usuario_id: loggedUserId, deuda: 0 }]);
        }
      }
      showToast(`Grupo «${name}» creado ✓`);
      await cargarDatosSupabase();
    }

    async function deleteCurrentCloudGroup() {
      if (!currentGroupId || !supabaseClient) return;
      const g = sbGrupos.find(x => String(x.id) === String(currentGroupId));
      if (!g) return;
      if ((Number(g.id) === 1 || Number(g.id) === Number(window.generalGroupId)) && !isAdmin) {
        alert("El grupo General solo puede ser eliminado por Hugo (Super Admin).");
        return;
      }
      if (!confirm(`¿Seguro que quieres eliminar el grupo «${g.nombre}» y todos sus movimientos en Supabase?`)) return;
      await supabaseClient.from('movimientos').delete().eq('grupo_id', currentGroupId);
      await supabaseClient.from('grupo_usuarios').delete().eq('grupo_id', currentGroupId);
      await supabaseClient.from('grupos').delete().eq('id', currentGroupId);
      currentGroupId = null;
      localStorage.removeItem('last_group_id');
      showToast("Grupo eliminado ✓");
      await cargarDatosSupabase();
    }

    // Add Member to Supabase Group
    function openAddCloudMemberModal() {
      const existingNames = sbGlobalUsers.map(u => `<option value="${esc(u.nombre)}"></option>`).join('');
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Añadir Miembro al Grupo Cloud</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Nombre del amigo (elige existente o crea nuevo)</label>
            <input id="cloud-member-name" list="global-users-datalist" type="text" placeholder="Ej. Ivan, Ximo, Cosials, Lucia..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
            <datalist id="global-users-datalist">${existingNames}</datalist>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">PIN (si es un usuario nuevo)</label>
            <input id="cloud-member-pin" type="password" placeholder="Por defecto: 0000" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm text-on-surface"/>
          </div>
          <button onclick="createSupabaseGroupMember()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold hover:bg-primary-container transition active-scale">
            Vincular al Grupo
          </button>
        </div>
      `);
    }

    async function createSupabaseGroupMember() {
      const name = ($('#cloud-member-name')?.value || '').trim();
      const pin = ($('#cloud-member-pin')?.value || '').trim() || '0000';
      if (!name || !supabaseClient || !currentGroupId) return;
      closeUniversalModal();

      let userId = null;
      const existing = sbGlobalUsers.find(u => u.nombre.toLowerCase() === name.toLowerCase());
      if (existing) {
        userId = existing.id;
      } else {
        const { data: newUser } = await supabaseClient.from('usuarios').insert([{ nombre: name, deuda: 0, password: pin }]).select();
        if (newUser && newUser.length > 0) userId = newUser[0].id;
      }

      if (userId) {
        const already = sbAllGroupRelations.some(r => String(r.grupo_id) === String(currentGroupId) && Number(r.usuario_id) === Number(userId));
        if (!already) {
          await supabaseClient.from('grupo_usuarios').insert([{ grupo_id: currentGroupId, usuario_id: userId, deuda: 0 }]);
        }
      }
      showToast(`${name} añadido al grupo ✓`);
      await cargarDatosSupabase();
    }

    // Global / Selective / Exact-Per-Person Group Charge Split Modal
    let globalSplitMode = "equal"; // 'equal' | 'exact'

    function openGlobalChargeModal(mode = "equal") {
      globalSplitMode = mode;
      const currGroup = sbGrupos.find(g => String(g.id) === String(currentGroupId));
      const gName = currGroup ? currGroup.nombre : "Grupo";

      const membersRowsHtml = sbUsuariosGrupo.map(u => {
        if (globalSplitMode === "exact") {
          return `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 gap-2">
              <div class="min-w-0">
                <p class="text-xs font-extrabold text-on-surface truncate">${esc(u.nombre)}</p>
                <p class="text-[10px] text-on-surface-variant">Deuda actual: ${fmt(u.deuda)}</p>
              </div>
              <div class="relative w-28 flex-shrink-0">
                <input type="number" step="0.01" data-exact-member="${u.id}" placeholder="0.00" oninput="recalcGlobalModalSplit()" class="w-full pr-6 pl-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-right text-xs font-extrabold text-on-surface"/>
                <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-outline">€</span>
              </div>
            </div>`;
        }
        return `
          <label class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 cursor-pointer">
            <div class="flex items-center gap-2.5">
              <input type="checkbox" data-split-member="${u.id}" checked onchange="recalcGlobalModalSplit()" class="w-4 h-4 rounded text-primary focus:ring-primary"/>
              <span class="text-xs font-bold text-on-surface">${esc(u.nombre)}</span>
            </div>
            <span class="text-[11px] text-on-surface-variant tabular-nums">Deuda: ${fmt(u.deuda)}</span>
          </label>`;
      }).join('');

      openUniversalModal(`
        <div class="flex flex-col gap-3.5">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div>
              <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Repartir Gasto en ${esc(gName)}</h3>
              <p class="text-xs text-on-surface-variant">Partes iguales o importe personalizado por amigo</p>
            </div>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>

          <!-- Mode Switcher: Equal vs Exact -->
          <div class="grid grid-cols-2 bg-surface-container p-1 rounded-xl gap-1">
            <button type="button" onclick="openGlobalChargeModal('equal')" class="py-2 rounded-lg text-xs font-extrabold transition ${globalSplitMode === 'equal' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">
              ⚖️ A partes iguales
            </button>
            <button type="button" onclick="openGlobalChargeModal('exact')" class="py-2 rounded-lg text-xs font-extrabold transition ${globalSplitMode === 'exact' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'}">
              🎯 Importes exactos
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${globalSplitMode === 'equal' ? `
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Importe TOTAL a dividir (€)</label>
                <input id="global-split-amount" type="number" step="0.01" placeholder="21.00" oninput="recalcGlobalModalSplit()" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-lg font-extrabold text-on-surface"/>
              </div>
            ` : `
              <div class="p-3 rounded-xl bg-primary/10 flex flex-col justify-center">
                <span class="text-[10px] font-extrabold uppercase text-primary">Suma total del reparto</span>
                <span id="global-exact-sum" class="font-headline-sm text-lg font-extrabold text-primary tabular-nums">0,00 €</span>
              </div>
            `}
            <div>
              <label class="text-xs font-bold text-on-surface-variant block mb-1">Categoría</label>
              <select id="global-split-cat" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface">
                <option value="Suscripción">🎵 Suscripción (Spotify...)</option>
                <option value="Individual">🍔 Comida / Cena / Viaje</option>
                <option value="Fantasy">⚽ Castigo Fantasy</option>
                <option value="Varios">✨ Varios</option>
                <option value="General">📦 General</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Concepto / Motivo</label>
            <input id="global-split-concept" type="text" placeholder="Ej. Spotify Mensual, Cena Viernes, Jornada Fantasy..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-bold text-on-surface-variant">${globalSplitMode === 'equal' ? 'Marca quiénes participan' : 'Escribe cuánto paga cada uno'}</label>
              <span id="global-split-preview" class="text-xs font-extrabold text-primary">0,00 € por persona</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              ${membersRowsHtml}
            </div>
          </div>

          <button onclick="submitGlobalCloudCharge()" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold hover:bg-primary-container transition active-scale">
            Aplicar Cargos en Supabase
          </button>
        </div>
      `);
      recalcGlobalModalSplit();
    }

    function recalcGlobalModalSplit() {
      const preview = $('#global-split-preview');
      if (globalSplitMode === 'exact') {
        const inputs = [...$$('[data-exact-member]')];
        let sum = 0;
        let activeCount = 0;
        inputs.forEach(inp => {
          const val = parseAmount(inp.value);
          if (val > 0) {
            sum += val;
            activeCount++;
          }
        });
        const sumEl = $('#global-exact-sum');
        if (sumEl) sumEl.textContent = fmt(sum);
        if (preview) preview.textContent = `${activeCount} miembro(s) con cargo • Total ${fmt(sum)}`;
        return;
      }

      const total = parseAmount($('#global-split-amount')?.value);
      const checked = $$('[data-split-member]:checked');
      const count = checked.length;
      if (preview) {
        preview.textContent = count > 0 ? `${count} seleccionados → ${fmt(total / count)} c/u` : 'Selecciona al menos 1 miembro';
      }
    }

    async function submitGlobalCloudCharge() {
      if (!supabaseClient) return;
      const concept = ($('#global-split-concept')?.value || '').trim() || 'Cargo Compartido';
      const categoria = $('#global-split-cat')?.value || 'General';
      const nuevosMovs = [];

      if (globalSplitMode === 'exact') {
        const inputs = [...$$('[data-exact-member]')];
        const items = inputs.map(inp => ({
          uidNum: Number(inp.dataset.exactMember),
          amt: Math.round(parseAmount(inp.value) * 100) / 100
        })).filter(x => x.amt > 0);

        if (items.length === 0) return;
        closeUniversalModal();

        for (const it of items) {
          const u = sbUsuariosGrupo.find(x => Number(x.id) === it.uidNum);
          if (!u) continue;
          const nuevaDeuda = parseFloat(u.deuda || 0) + it.amt;
          if (u.relacion_id) {
            await supabaseClient.from('grupo_usuarios').update({ deuda: nuevaDeuda }).eq('id', u.relacion_id);
          } else {
            await supabaseClient.from('usuarios').update({ deuda: nuevaDeuda }).eq('id', u.id);
          }
          nuevosMovs.push({
            usuario_id: u.id,
            tipo: 'cargo',
            monto: it.amt,
            concepto: concept,
            estado: 'completado',
            categoria: categoria,
            grupo_id: currentGroupId
          });
        }
        await supabaseClient.from('movimientos').insert(nuevosMovs);
        showToast(`Cargos exactos aplicados a ${items.length} miembro(s) ✓`);
        await cargarDatosSupabase();
        return;
      }

      const total = parseAmount($('#global-split-amount')?.value);
      const checkedIds = [...$$('[data-split-member]:checked')].map(el => Number(el.dataset.splitMember));
      if (!(total > 0) || checkedIds.length === 0) return;
      closeUniversalModal();

      const porCabeza = Math.round((total / checkedIds.length) * 100) / 100;
      for (const uidNum of checkedIds) {
        const u = sbUsuariosGrupo.find(x => Number(x.id) === uidNum);
        if (!u) continue;
        const nuevaDeuda = parseFloat(u.deuda || 0) + porCabeza;
        if (u.relacion_id) {
          await supabaseClient.from('grupo_usuarios').update({ deuda: nuevaDeuda }).eq('id', u.relacion_id);
        } else {
          await supabaseClient.from('usuarios').update({ deuda: nuevaDeuda }).eq('id', u.id);
        }
        nuevosMovs.push({
          usuario_id: u.id,
          tipo: 'cargo',
          monto: porCabeza,
          concepto: concept,
          estado: 'completado',
          categoria: categoria,
          grupo_id: currentGroupId
        });
      }

      await supabaseClient.from('movimientos').insert(nuevosMovs);
      showToast(`Cargo repartido (${fmt(porCabeza)} c/u) ✓`);
      await cargarDatosSupabase();
    }

    // Individual Charge in Supabase Group
    function openIndivChargeModal(userId, userName) {
      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Añadir Cargo a ${esc(userName)}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Importe a sumar (€)</label>
            <input id="indiv-cloud-amount" type="number" step="0.01" placeholder="5.00" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-2xl font-extrabold text-on-surface text-center"/>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Concepto</label>
            <input id="indiv-cloud-concept" type="text" placeholder="Ej. Castigo Fantasy, Cena, Bizum..." class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface"/>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant block mb-1">Categoría</label>
            <select id="indiv-cloud-cat" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-bold text-on-surface">
              <option value="Individual">🍔 Individual (Cena, Viaje...)</option>
              <option value="Fantasy">⚽ Fantasy</option>
              <option value="Suscripción">🎵 Suscripción</option>
              <option value="Varios">✨ Varios</option>
              <option value="General">📦 General</option>
            </select>
          </div>
          <button onclick="submitIndivCloudCharge(${userId})" class="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold hover:bg-primary-container transition active-scale">
            Guardar Cargo
          </button>
        </div>
      `);
    }

    async function submitIndivCloudCharge(userId) {
      const amount = parseAmount($('#indiv-cloud-amount')?.value);
      const concept = ($('#indiv-cloud-concept')?.value || '').trim() || 'Cargo Individual';
      const categoria = $('#indiv-cloud-cat')?.value || 'Individual';
      if (!(amount > 0) || !supabaseClient) return;
      closeUniversalModal();

      const u = sbUsuariosGrupo.find(x => Number(x.id) === Number(userId));
      if (!u) return;
      const nuevaDeuda = parseFloat(u.deuda || 0) + amount;
      if (u.relacion_id) {
        await supabaseClient.from('grupo_usuarios').update({ deuda: nuevaDeuda }).eq('id', u.relacion_id);
      } else {
        await supabaseClient.from('usuarios').update({ deuda: nuevaDeuda }).eq('id', u.id);
      }
      await supabaseClient.from('movimientos').insert([{
        usuario_id: u.id,
        tipo: 'cargo',
        monto: amount,
        concepto: concept,
        estado: 'completado',
        categoria: categoria,
        grupo_id: currentGroupId
      }]);
      showToast(`Cargo de ${fmt(amount)} añadido a ${u.nombre} ✓`);
      await cargarDatosSupabase();
    }

    // Cloud Payment Modal (with optional reflection in Control Mensual)
    function openCloudPaymentModal(userId, userName, currentDeuda) {
      const currGroup = sbGrupos.find(g => String(g.id) === String(currentGroupId));
      const gName = currGroup ? currGroup.nombre : "Grupo";
      const canApproveDirectly = isAdmin || (currGroup && Number(currGroup.admin_id) === Number(loggedUserId));
      const isMyOwnDebt = Number(userId) === Number(loggedUserId);

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">${canApproveDirectly && !isMyOwnDebt ? `Confirmar Cobro de ${esc(userName)}` : `Notificar mi Pago (${esc(userName)})`}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>
          ${!canApproveDirectly ? `
            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-on-surface">
              Tu pago quedará en estado <strong>Pendiente</strong> hasta que el administrador del grupo confirme que ha recibido el Bizum/efectivo.
            </div>
          ` : ''}
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="text-xs font-bold text-on-surface-variant">Importe pagado (€)</label>
              <button onclick="$('#cloud-pay-amount').value='${Number(currentDeuda || 0).toFixed(2)}'" class="text-xs font-bold text-primary hover:underline">Saldar total (${fmt(currentDeuda)})</button>
            </div>
            <input id="cloud-pay-amount" type="number" step="0.01" value="${Number(currentDeuda || 0).toFixed(2)}" class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-2xl font-extrabold text-secondary text-center"/>
          </div>
          <label class="flex items-center gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-bold text-on-surface cursor-pointer">
            <input id="cloud-pay-reflect-mensual" type="checkbox" class="w-4 h-4 rounded text-primary"/>
            <span>${isMyOwnDebt ? `Apuntar también como Gasto (−) en mi Control Mensual` : `Apuntar también como Ingreso (+) en mi Control Mensual`}</span>
          </label>
          <button onclick="submitCloudPayment(${userId}, '${esc(userName)}', '${esc(gName)}')" class="w-full py-3 rounded-xl bg-secondary text-on-secondary font-label-lg text-sm font-bold hover:opacity-95 transition active-scale">
            ${canApproveDirectly ? 'Confirmar Pago Recibido' : 'Avisar de mi Pago'}
          </button>
        </div>
      `);
    }

    async function submitCloudPayment(userId, userName = "Miembro", gName = "Grupo") {
      const amount = parseAmount($('#cloud-pay-amount')?.value);
      const reflectInMensual = !!$('#cloud-pay-reflect-mensual')?.checked;
      if (!(amount > 0) || !supabaseClient) return;
      closeUniversalModal();

      const currGroup = sbGrupos.find(g => String(g.id) === String(currentGroupId));
      const canApproveDirectly = isAdmin || (currGroup && Number(currGroup.admin_id) === Number(loggedUserId));
      const estado = canApproveDirectly ? 'completado' : 'pendiente';
      const isMyOwnDebt = Number(userId) === Number(loggedUserId);

      await supabaseClient.from('movimientos').insert([{
        usuario_id: userId,
        tipo: 'pago',
        monto: amount,
        concepto: 'Pago',
        estado: estado,
        grupo_id: currentGroupId
      }]);

      if (canApproveDirectly) {
        const rel = sbAllGroupRelations.find(r => String(r.grupo_id) === String(currentGroupId) && Number(r.usuario_id) === Number(userId));
        if (rel) {
          const nuevaDeuda = Math.max(0, parseFloat(rel.deuda || 0) - amount);
          await supabaseClient.from('grupo_usuarios').update({ deuda: nuevaDeuda }).eq('id', rel.id);
          if (nuevaDeuda === 0 && typeof confetti === 'function') {
            confetti({ particleCount: 130, spread: 70, origin: { y: 0.6 } });
          }
        }
      }

      if (reflectInMensual && S) {
        if (isMyOwnDebt) {
          S.expenses.push({
            id: uid(),
            amount: Math.round(amount * 100) / 100,
            cat: 'otros',
            method: 'bizum',
            note: `Pago grupo ${gName} #deuda`,
            date: todayStr(),
            tripId: '',
            refund: false,
            ts: Date.now()
          });
        } else {
          S.incomes.push({
            id: uid(),
            amount: Math.round(amount * 100) / 100,
            cat: 'bizum',
            source: `Cobro de ${userName} (${gName})`,
            note: 'Deuda grupo saldada',
            date: todayStr()
          });
        }
        saveLocalState(true);
      }

      showToast(canApproveDirectly ? "Pago confirmado ✓" : "Pago enviado a revisión ✓");
      await cargarDatosSupabase();
    }

    async function aprobarPagoSupabase(movId, userId, monto) {
      if (!supabaseClient) return;
      await supabaseClient.from('movimientos').update({ estado: 'completado' }).eq('id', movId);
      const u = sbUsuariosGrupo.find(x => Number(x.id) === Number(userId));
      if (u) {
        const nuevaDeuda = Math.max(0, parseFloat(u.deuda || 0) - parseFloat(monto));
        if (u.relacion_id) {
          await supabaseClient.from('grupo_usuarios').update({ deuda: nuevaDeuda }).eq('id', u.relacion_id);
        } else {
          await supabaseClient.from('usuarios').update({ deuda: nuevaDeuda }).eq('id', userId);
        }
        if (nuevaDeuda === 0 && typeof confetti === 'function') {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
      }
      showToast("Pago aprobado ✓");
      await cargarDatosSupabase();
      renderNotificationsDrawerContent();
    }

    async function rechazarPagoSupabase(movId) {
      if (!supabaseClient || !confirm("¿Rechazar y eliminar esta notificación de pago?")) return;
      await supabaseClient.from('movimientos').delete().eq('id', movId);
      showToast("Notificación rechazada");
      await cargarDatosSupabase();
      renderNotificationsDrawerContent();
    }

    async function undoLastCloudAction(userId, userName) {
      if (!supabaseClient) return;
      const lastMov = sbMovimientos.find(m => Number(m.usuario_id) === Number(userId));
      if (!lastMov) {
        alert(`No hay movimientos en este grupo para ${userName}.`);
        return;
      }
      if (!confirm(`¿Deshacer el último movimiento de ${userName}?\n\nSe revertirá: ${lastMov.tipo.toUpperCase()} de ${fmt(lastMov.monto)} (${lastMov.concepto || 'Sin concepto'})`)) return;

      const u = sbUsuariosGrupo.find(x => Number(x.id) === Number(userId));
      if (u) {
        let nuevaDeuda = parseFloat(u.deuda || 0);
        if (lastMov.tipo === 'cargo') nuevaDeuda = Math.max(0, nuevaDeuda - parseFloat(lastMov.monto));
        else if (lastMov.tipo === 'pago') nuevaDeuda = nuevaDeuda + parseFloat(lastMov.monto);

        if (u.relacion_id) {
          await supabaseClient.from('grupo_usuarios').update({ deuda: nuevaDeuda }).eq('id', u.relacion_id);
        } else {
          await supabaseClient.from('usuarios').update({ deuda: nuevaDeuda }).eq('id', u.id);
        }
      }
      await supabaseClient.from('movimientos').delete().eq('id', lastMov.id);
      showToast("Último movimiento revertido ✓");
      await cargarDatosSupabase();
    }

    async function resetAllCloudGroupDebts() {
      if (!supabaseClient) return;
      if (!confirm("⚠️ ¿Poner la deuda de TODOS los miembros de este grupo a 0,00 €?")) return;
      for (const u of sbUsuariosGrupo) {
        if (parseFloat(u.deuda) > 0) {
          await supabaseClient.from('movimientos').insert([{
            usuario_id: u.id,
            tipo: 'pago',
            monto: parseFloat(u.deuda),
            concepto: 'Liquidación Total (Admin)',
            estado: 'completado',
            grupo_id: currentGroupId
          }]);
          if (u.relacion_id) {
            await supabaseClient.from('grupo_usuarios').update({ deuda: 0 }).eq('id', u.relacion_id);
          } else {
            await supabaseClient.from('usuarios').update({ deuda: 0 }).eq('id', u.id);
          }
        }
      }
      await supabaseClient.from('movimientos').update({ estado: 'completado' }).eq('tipo', 'pago').eq('estado', 'pendiente').eq('grupo_id', currentGroupId);
      showToast("Todas las deudas liquidadas ✓");
      await cargarDatosSupabase();
    }

    async function hardResetCloudHistory() {
      if (!supabaseClient) return;
      const res = prompt('Escribe "BORRAR" para vaciar el historial de este grupo y poner sus deudas a 0€:');
      if (res !== 'BORRAR') return;
      await supabaseClient.from('movimientos').delete().eq('grupo_id', currentGroupId);
      for (const u of sbUsuariosGrupo) {
        if (u.relacion_id) await supabaseClient.from('grupo_usuarios').update({ deuda: 0 }).eq('id', u.relacion_id);
      }
      showToast("Historial del grupo reseteado ✓");
      await cargarDatosSupabase();
    }

    function openCloudUserDetailsModal(userId, userName) {
      const userRels = sbAllGroupRelations.filter(r => Number(r.usuario_id) === Number(userId));
      let totalGlobal = 0;
      const rowsHtml = userRels.map(rel => {
        const g = sbAllGrupos.find(x => Number(x.id) === Number(rel.grupo_id));
        const d = parseFloat(rel.deuda || 0);
        totalGlobal += d;
        return `
          <div class="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[18px]">groups</span>
              <span class="font-bold text-sm text-on-surface">${esc(g ? g.nombre : 'Grupo #' + rel.grupo_id)}</span>
            </div>
            <span class="font-extrabold text-sm tabular-nums ${d > 0 ? 'text-tertiary' : 'text-secondary'}">${fmt(d)}</span>
          </div>`;
      }).join('');

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Posición en Grupos: ${esc(userName)}</h3>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="p-4 rounded-2xl bg-surface-container text-center">
            <span class="text-xs font-bold uppercase text-on-surface-variant">Deuda Total Acumulada en Todos los Grupos</span>
            <p class="font-display-currency-mobile text-3xl font-extrabold mt-1 tabular-nums ${totalGlobal > 0 ? 'text-tertiary' : 'text-secondary'}">${fmt(totalGlobal)}</p>
          </div>
          <div class="flex flex-col gap-2">
            ${rowsHtml || `<p class="text-xs text-center text-on-surface-variant">Sin grupos asignados.</p>`}
          </div>
          <div class="flex items-center justify-between pt-2">
            ${isAdmin ? `
              <button onclick="closeUniversalModal(); removeMemberFromCurrentGroup(${userId}, '${esc(userName)}')" class="text-xs font-bold text-tertiary hover:underline">
                Quitar del grupo actual
              </button>` : '<span></span>'}
            ${totalGlobal > 0 ? `
              <button onclick="sendIndividualWhatsAppClaim('${esc(userName)}', ${totalGlobal}, 'Cuentas acumuladas')" class="px-4 py-2 rounded-xl bg-secondary text-white text-xs font-bold">
                Reclamar total por WhatsApp
              </button>` : ''}
          </div>
        </div>
      `);
    }

    async function removeMemberFromCurrentGroup(userId, userName) {
      if (!isAdmin || !supabaseClient || !currentGroupId) return;
      if (!confirm(`¿Quitar a ${userName} del grupo actual?`)) return;
      await supabaseClient.from('grupo_usuarios').delete().eq('usuario_id', userId).eq('grupo_id', currentGroupId);
      showToast(`${userName} eliminado del grupo`);
      await cargarDatosSupabase();
    }

    function sendGroupWhatsAppReminder() {
      const deudores = sbUsuariosGrupo.filter(u => parseFloat(u.deuda) > 0);
      if (deudores.length === 0) {
        showToast("¡Nadie debe dinero en este grupo!");
        return;
      }
      const currGroup = sbGrupos.find(g => String(g.id) === String(currentGroupId));
      const gName = currGroup ? currGroup.nombre : "Cuentas Hugo";
      const totalDeuda = deudores.reduce((acc, u) => acc + parseFloat(u.deuda), 0);
      let msg = `👋 ¡Hola a todos! Resumen de *${gName}*:\n\nHay un total de *${fmt(totalDeuda)}* pendientes:\n`;
      deudores.forEach(u => {
        msg += `• *${u.nombre}*: ${fmt(u.deuda)}\n`;
      });
      msg += `\nPor favor, enviad Bizum y marcad «He pagado» en la app. ¡Gracias! 💸`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    }

    function sendIndividualWhatsAppClaim(personName, amount, concept = "") {
      const motivo = concept ? ` por *${concept}*` : '';
      const msg = `¡Hola ${personName}! 👋 Te recuerdo que tienes pendiente *${fmt(amount)}*${motivo}. Cuando puedas mándame un Bizum y lo dejamos saldado. ¡Gracias! 💸`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    }

    function openBizumClaimModal(personName, amount, concept = "Cuentas pendientes") {
      const cleanAmt = Number(amount || 0).toFixed(2).replace('.', ',');
      const bizumConcept = `${concept} (${personName})`.slice(0, 35);
      const fullText = `¡Hola ${personName}! 👋 Tienes pendiente ${fmt(amount)} por «${concept}». Concepto Bizum: ${bizumConcept}`;

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div class="flex items-center gap-2.5">
              <span class="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                <span class="material-symbols-outlined">send_to_mobile</span>
              </span>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">Reclamar por Bizum a ${esc(personName)}</h3>
                <p class="text-xs text-on-surface-variant">Copia rápida de importe y concepto o envío por WhatsApp</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div class="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-2">
              <div>
                <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Importe exacto</span>
                <p class="font-headline-md text-xl font-extrabold text-secondary tabular-nums">${fmt(amount)}</p>
              </div>
              <button onclick="navigator.clipboard?.writeText('${cleanAmt}'); showToast('Importe ${cleanAmt} copiado ✓')" class="py-1.5 px-2.5 rounded-xl bg-secondary/15 text-secondary text-xs font-extrabold hover:bg-secondary/25 transition">
                Copiar importe
              </button>
            </div>

            <div class="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-2">
              <div>
                <span class="text-[10px] font-extrabold uppercase text-on-surface-variant">Concepto Bizum</span>
                <p class="font-label-lg text-xs font-bold text-on-surface truncate">${esc(bizumConcept)}</p>
              </div>
              <button onclick="navigator.clipboard?.writeText('${esc(bizumConcept)}'); showToast('Concepto Bizum copiado ✓')" class="py-1.5 px-2.5 rounded-xl bg-primary/15 text-primary text-xs font-extrabold hover:bg-primary/25 transition">
                Copiar concepto
              </button>
            </div>
          </div>

          <button onclick="navigator.clipboard?.writeText('${esc(fullText)}'); showToast('Mensaje completo copiado ✓')" class="w-full py-2.5 px-4 rounded-xl bg-surface-container text-on-surface font-label-md text-xs font-bold hover:bg-surface-container-high transition flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[17px]">content_copy</span>
            Copiar recordatorio completo al portapapeles
          </button>

          <button onclick="closeUniversalModal(); sendIndividualWhatsAppClaim('${esc(personName)}', ${amount}, '${esc(concept)}')" class="w-full py-3 rounded-xl bg-secondary text-on-secondary font-label-lg text-sm font-bold hover:opacity-95 transition flex items-center justify-center gap-2 active-scale">
            <span class="material-symbols-outlined text-[19px]">chat</span>
            Enviar recordatorio por WhatsApp
          </button>
        </div>
      `);
    }

    function openIOSDownloadModal() {
      const uidNum = loggedUserId || 2;
      const userName = currentLoggedUserName();
      const ipaDirectUrl = "https://hugosaezz.github.io/claridad-financiera/ClaridadFinanciera.ipa";
      const ipaReleaseUrl = "https://github.com/hugosaezz/claridad-financiera/releases/latest/download/ClaridadFinanciera.ipa";
      const nativeShortcutUrl = `claridad://pay?add=IMPORTE&desc=COMERCIO&user=${uidNum}`;
      const webShortcutUrl = `https://hugosaezz.github.io/claridad-financiera/?add=IMPORTE&desc=COMERCIO&user=${uidNum}`;

      openUniversalModal(`
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/25">
            <div class="flex items-center gap-3">
              <img src="assets/logo.svg" alt="Logo" class="w-11 h-11 rounded-2xl shadow-sm"/>
              <div>
                <h3 class="font-headline-sm text-base font-extrabold text-on-surface">iPhone (.IPA) &amp; Atajo Apple Pay</h3>
                <p class="text-xs text-on-surface-variant">Claridad Financiera v2.0 • Cuenta de ${esc(userName)} (#${uidNum})</p>
              </div>
            </div>
            <button onclick="closeUniversalModal()" class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"><span class="material-symbols-outlined">close</span></button>
          </div>

          <!-- 1. Native .IPA Download -->
          <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase text-primary">1. Descargar Aplicación .IPA para iPhone</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">iOS 15.0+ ARM64</span>
            </div>
            <p class="text-xs text-on-surface-variant leading-relaxed">
              Instala el archivo <code>ClaridadFinanciera.ipa</code> en tu iPhone con <strong>AltStore</strong>, <strong>SideStore</strong>, <strong>Sideloadly</strong> o <strong>TrollStore</strong>. Incluye el esquema nativo <code>claridad://</code> para el atajo de Apple Pay.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a href="ClaridadFinanciera.ipa" download="ClaridadFinanciera.ipa" class="py-2.5 px-3 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition active-scale">
                <span class="material-symbols-outlined text-[17px]">download</span>
                Descargar .IPA directo
              </a>
              <a href="${ipaReleaseUrl}" target="_blank" rel="noopener" class="py-2.5 px-3 rounded-xl bg-surface-container text-on-surface font-label-md text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition active-scale">
                <span class="material-symbols-outlined text-[17px]">inventory_2</span>
                GitHub Release (.IPA)
              </a>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-1">
              <a href="altstore://install?url=${encodeURIComponent(ipaDirectUrl)}" class="py-2 px-3 rounded-xl border border-outline-variant/50 text-on-surface font-label-md text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-surface-container transition">
                <span class="material-symbols-outlined text-[15px] text-primary">open_in_new</span>
                Abrir en AltStore
              </a>
              <a href="sidestore://install?url=${encodeURIComponent(ipaDirectUrl)}" class="py-2 px-3 rounded-xl border border-outline-variant/50 text-on-surface font-label-md text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-surface-container transition">
                <span class="material-symbols-outlined text-[15px] text-secondary">open_in_new</span>
                Abrir en SideStore
              </a>
            </div>
          </div>

          <!-- 2. Apple Pay iPhone Shortcut Setup (Works on both .IPA and Web) -->
          <div class="p-4 rounded-2xl bg-secondary/5 border border-secondary/25 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase text-secondary flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">contactless</span>
                2. Atajo Automático de Apple Pay (App .IPA y Web)
              </span>
              <button onclick="simulateApplePayShortcutPayment()" class="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-secondary text-on-secondary hover:opacity-90 transition">
                ⚡ Probar ahora
              </button>
            </div>
            <p class="text-xs text-on-surface-variant leading-relaxed">
              En tu iPhone abre la app <strong>Atajos → Automatización → + → Transacción (Al pagar con Apple Pay)</strong>, añade la acción <strong>«Abrir URLs»</strong> y pega cualquiera de estas dos URLs (sustituyendo <code>IMPORTE</code> y <code>COMERCIO</code> por las variables de la transacción):
            </p>

            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
                <div class="min-w-0">
                  <span class="text-[10px] font-extrabold text-primary uppercase block">Para abrir la App Nativa (.IPA)</span>
                  <code class="text-[11px] font-mono text-on-surface truncate block">${esc(nativeShortcutUrl)}</code>
                </div>
                <button onclick="navigator.clipboard?.writeText('${nativeShortcutUrl}'); showToast('URL de App .IPA copiada ✓')" class="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold flex-shrink-0">Copiar</button>
              </div>

              <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
                <div class="min-w-0">
                  <span class="text-[10px] font-extrabold text-secondary uppercase block">Para abrir la Web / PWA</span>
                  <code class="text-[11px] font-mono text-on-surface truncate block">${esc(webShortcutUrl)}</code>
                </div>
                <button onclick="navigator.clipboard?.writeText('${webShortcutUrl}'); showToast('URL Web copiada ✓')" class="px-2.5 py-1 rounded-lg bg-secondary/15 text-secondary text-[11px] font-bold flex-shrink-0">Copiar</button>
              </div>
            </div>
            <p class="text-[11px] text-on-surface-variant">
              Ambos métodos categorizan el comercio automáticamente y sincronizan el gasto en tu cuenta de <strong>Supabase Cloud (#${uidNum})</strong> para que aparezca tanto en la web como en la app <code>.ipa</code>.
            </p>
          </div>
        </div>
      `);
    }
