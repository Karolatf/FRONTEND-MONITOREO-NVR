// ── Gestión de Usuarios (exclusivo del súper administrador) ──────────────────

// Protección extra en el cliente: si alguien sin ser superadmin llega a esta
// URL a mano, se le manda de vuelta al dashboard. La protección real está en
// el backend (cualquier petición a /api/usuarios sin ser superadmin recibe
// 403) — esto es solo para que ni siquiera vea la pantalla parpadear.
(function protegerPagina() {
  const usuario = obtenerUsuario();
  if (!usuario || usuario.rol !== 'superadmin') {
    window.location.replace('index.html');
  }
})();

const notyf = new Notyf({
  ripple:      false,
  dismissible: true,
  position:    { x: 'right', y: 'top' },
  duration:    4000
});

let permisosDisponibles = [];
let usuariosCache       = [];

// ── Cargar catálogo de permisos y la lista de usuarios al entrar ─────────────
async function cargarPermisosDisponibles() {
  try {
    const res = await authFetch('/api/usuarios/permisos-disponibles');
    permisosDisponibles = await res.json();
  } catch (err) {
    console.error('Error al cargar permisos:', err);
    permisosDisponibles = [];
  }
}

async function cargarUsuarios() {
  const tbody = document.getElementById('usuarios-body');
  try {
    const res = await authFetch('/api/usuarios');
    usuariosCache = await res.json();
    pintarUsuarios();
  } catch (err) {
    console.error('Error al cargar usuarios:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">${t('usuarios.errorCargar')}</td></tr>`;
  }
}

function pintarUsuarios() {
  const tbody = document.getElementById('usuarios-body');

  if (usuariosCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">${t('usuarios.noHayUsuarios')}</td></tr>`;
    return;
  }

  tbody.innerHTML = usuariosCache.map(u => `
    <tr>
      <td style="font-family:monospace">${escaparHTML(u.username)}</td>
      <td>${escaparHTML(u.nombre)}</td>
      <td><span class="badge-rol ${u.rol}">${etiquetaRol(u.rol)}</span></td>
      <td>${pintarPermisosMini(u)}</td>
      <td><span class="badge-estado ${u.activo ? 'activo' : 'inactivo'}">${u.activo ? t('usuarios.activo') : t('usuarios.inactivo')}</span></td>
      <td style="font-size:0.72rem;color:var(--text-dim)">${formatearFecha(u.ultimo_login)}</td>
      <td>
        ${u.rol === 'superadmin' ? '' : `
          <div class="acciones-fila">
            <button class="btn-icono" title="${t('usuarios.editar')}" onclick="abrirModalEditar(${u.id})">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icono" title="${t('usuarios.cambiarPasswordTitle')}" onclick="cambiarPassword(${u.id}, '${escaparHTML(u.username)}')">
              <i data-lucide="key-round"></i>
            </button>
            <button class="btn-icono" title="${u.activo ? t('usuarios.desactivar') : t('usuarios.activar')}" onclick="toggleEstadoUsuario(${u.id}, '${escaparHTML(u.username)}', ${u.activo ? 'true' : 'false'})">
              <i data-lucide="${u.activo ? 'user-x' : 'user-check'}"></i>
            </button>
            <button class="btn-icono peligro" title="${t('usuarios.eliminarDefinitivamente')}" onclick="eliminarUsuarioDefinitivo(${u.id}, '${escaparHTML(u.username)}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `}
      </td>
    </tr>
  `).join('');

  lucide.createIcons();
}

function pintarPermisosMini(u) {
  if (u.rol === 'superadmin') return `<span class="permisos-mini">${t('usuarios.todosSuperAdmin')}</span>`;
  if (!u.permisos || u.permisos.length === 0) return `<span class="permisos-mini sin-permisos">${t('usuarios.ningunPermiso')}</span>`;
  const nombres = u.permisos.map(clave => {
    const p = permisosDisponibles.find(p => p.clave === clave);
    return p ? p.nombre : clave;
  });
  return `<span class="permisos-mini">${nombres.map(escaparHTML).join(', ')}</span>`;
}

function formatearFecha(fecha) {
  if (!fecha) return t('usuarios.nunca');
  return new Date(fecha).toLocaleString(obtenerIdioma() === 'en' ? 'en-US' : 'es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

// ── Modal: crear usuario ──────────────────────────────────────────────────────
function abrirModalCrear() {
  document.getElementById('modal-titulo').textContent = t('usuarios.crearTitulo');
  document.getElementById('usuario-id').value       = '';
  document.getElementById('input-username').value   = '';
  document.getElementById('input-username').disabled = false;
  document.getElementById('input-username').dataset.original = '';
  document.getElementById('btn-desbloquear-username').style.display = 'none';
  document.getElementById('input-nombre').value      = '';
  document.getElementById('input-rol').value         = 'analista';
  document.getElementById('grupo-password').hidden   = false;
  document.getElementById('input-password').required = true;
  document.getElementById('input-password').value    = '';
  actualizarFuerzaPassword('', document.getElementById('fuerza-crear'));
  ocultarErrorModal();
  pintarChecksPermisos([]);
  abrirModal();
}

// ── Modal: editar usuario existente ───────────────────────────────────────────
function abrirModalEditar(id) {
  const u = usuariosCache.find(u => u.id === id);
  if (!u) return;

  document.getElementById('modal-titulo').textContent = t('usuarios.editarTitulo', { nombre: u.nombre });
  document.getElementById('usuario-id').value        = u.id;

  const inputUsername = document.getElementById('input-username');
  inputUsername.value            = u.username;
  inputUsername.disabled         = true; // Bloqueado por defecto — hay que desbloquearlo a propósito
  inputUsername.dataset.original = u.username;

  const btnDesbloquear = document.getElementById('btn-desbloquear-username');
  btnDesbloquear.style.display = '';
  btnDesbloquear.innerHTML     = '<i data-lucide="lock"></i>';
  btnDesbloquear.title         = t('usuarios.cambiarUsername');

  document.getElementById('input-nombre').value       = u.nombre;
  document.getElementById('input-rol').value          = u.rol;
  document.getElementById('grupo-password').hidden    = true; // La contraseña se cambia aparte
  document.getElementById('input-password').required  = false;
  ocultarErrorModal();
  pintarChecksPermisos(u.permisos || []);
  abrirModal();
}

// ── Desbloquear/bloquear el campo de usuario (solo en modo edición) ──────────
// Bloqueado por defecto a propósito: si se escribe mal, la persona queda sin
// poder iniciar sesión. Hay que desbloquearlo explícitamente para tocarlo.
function toggleDesbloquearUsername() {
  const input = document.getElementById('input-username');
  const btn   = document.getElementById('btn-desbloquear-username');

  const estabaBloqueado = input.disabled;
  input.disabled = !estabaBloqueado;

  if (estabaBloqueado) {
    input.focus();
    btn.innerHTML = '<i data-lucide="lock-open"></i>';
    btn.title     = t('usuarios.bloquearDeNuevo');
  } else {
    // Se vuelve a bloquear: se descarta cualquier cambio a medio escribir
    input.value   = input.dataset.original || input.value;
    btn.innerHTML = '<i data-lucide="lock"></i>';
    btn.title     = t('usuarios.cambiarUsername');
  }

  if (window.lucide) lucide.createIcons();
}

// Actualiza el indicador de fortaleza mientras se escribe la contraseña inicial
document.getElementById('input-password').addEventListener('input', e => {
  actualizarFuerzaPassword(e.target.value, document.getElementById('fuerza-crear'));
});

function pintarChecksPermisos(permisosActuales) {
  const panel = document.getElementById('permisos-panel');

  if (permisosDisponibles.length === 0) {
    panel.innerHTML = `<p class="form-nota" style="margin:0">${t('usuarios.noHayPermisosConfigurados')}</p>`;
    actualizarResumenPermisos();
    return;
  }

  panel.innerHTML = permisosDisponibles.map(p => `
    <div class="permiso-item">
      <input type="checkbox" id="permiso-${p.clave}" value="${p.clave}"
        ${permisosActuales.includes(p.clave) ? 'checked' : ''}
        onchange="actualizarResumenPermisos()">
      <label for="permiso-${p.clave}">
        <div class="permiso-nombre">${escaparHTML(p.nombre)}</div>
        <div class="permiso-desc">${escaparHTML(p.descripcion)}</div>
      </label>
    </div>
  `).join('');

  actualizarResumenPermisos();
}

function actualizarResumenPermisos() {
  const seleccionados = leerPermisosSeleccionados();
  const resumen = document.getElementById('permisos-resumen');

  if (seleccionados.length === 0) {
    resumen.textContent = t('usuarios.ningunPermisoSel');
    resumen.classList.remove('con-seleccion');
  } else if (seleccionados.length === 1) {
    const p = permisosDisponibles.find(p => p.clave === seleccionados[0]);
    resumen.textContent = p ? p.nombre : seleccionados[0];
    resumen.classList.add('con-seleccion');
  } else {
    resumen.textContent = t('usuarios.permisosSeleccionados', { count: seleccionados.length });
    resumen.classList.add('con-seleccion');
  }
}

function togglePermisosDropdown() {
  const panel   = document.getElementById('permisos-panel');
  const trigger = document.getElementById('permisos-trigger');
  panel.hidden  = !panel.hidden;
  trigger.classList.toggle('abierto', !panel.hidden);
}

// Cerrar el desplegable de permisos al hacer clic afuera de él
document.addEventListener('click', e => {
  const dropdown = document.getElementById('permisos-dropdown');
  const panel    = document.getElementById('permisos-panel');
  if (!panel || panel.hidden) return;
  if (!dropdown.contains(e.target)) {
    panel.hidden = true;
    document.getElementById('permisos-trigger').classList.remove('abierto');
  }
});

function leerPermisosSeleccionados() {
  return permisosDisponibles
    .map(p => p.clave)
    .filter(clave => document.getElementById(`permiso-${clave}`)?.checked);
}

function abrirModal() {
  document.getElementById('permisos-panel').hidden = true;
  document.getElementById('permisos-trigger').classList.remove('abierto');
  document.getElementById('modal-overlay').hidden = false;
  lucide.createIcons();
}
function cerrarModal() {
  document.getElementById('modal-overlay').hidden = true;
}

// Cerrar también haciendo clic afuera de la tarjeta (en el fondo oscuro)
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target.id === 'modal-overlay') cerrarModal();
});

// Cerrar también con la tecla Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('modal-overlay').hidden) {
    cerrarModal();
  }
});

function mostrarErrorModal(mensaje) {
  const el = document.getElementById('usuario-form-error');
  el.textContent = mensaje;
  el.hidden = false;
}
function ocultarErrorModal() {
  document.getElementById('usuario-form-error').hidden = true;
}

// ── Envío del formulario (crear o editar, según si hay ID) ────────────────────
document.getElementById('form-usuario').addEventListener('submit', async e => {
  e.preventDefault();
  ocultarErrorModal();

  const id     = document.getElementById('usuario-id').value;
  const btn    = document.getElementById('btn-guardar-usuario');

  const nombre = document.getElementById('input-nombre').value.trim();
  if (!nombre) {
    mostrarErrorModal(t('usuarios.nombreObligatorio'));
    document.getElementById('input-nombre').focus();
    return;
  }

  const cuerpo = {
    nombre,
    rol:      document.getElementById('input-rol').value,
    permisos: leerPermisosSeleccionados()
  };

  if (!id) {
    const username = document.getElementById('input-username').value.trim();
    if (!username) {
      mostrarErrorModal(t('usuarios.usuarioObligatorio'));
      document.getElementById('input-username').focus();
      return;
    }

    const password = document.getElementById('input-password').value;
    const check = validarFortalezaPassword(password);
    if (!check.ok) {
      mostrarErrorModal(check.mensaje);
      return;
    }
    cuerpo.username = username;
    cuerpo.password = password;
  } else {
    // Edición: el username solo se manda si el ing. lo desbloqueó Y de verdad lo cambió.
    const inputUsername    = document.getElementById('input-username');
    const usernameOriginal  = inputUsername.dataset.original || '';
    const usernameNuevo     = inputUsername.value.trim().toLowerCase();

    if (!inputUsername.disabled && usernameNuevo !== usernameOriginal) {
      if (!usernameNuevo) {
        mostrarErrorModal(t('usuarios.usuarioVacio'));
        return;
      }
      const confirmado = await confirmarAccion({
        titulo: t('usuarios.cambiarUsernameTitulo'),
        mensaje: t('usuarios.cambiarUsernameMensaje', { anterior: usernameOriginal, nuevo: usernameNuevo }),
        textoConfirmar: t('usuarios.cambiarUsuarioBtn'),
        iconoConfirmar: 'lock-open',
        peligro: true
      });
      if (!confirmado) return;
      cuerpo.username = usernameNuevo;
    }
  }

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="icon-btn login-spin"></i> ${t('usuarios.guardando')}`;
  lucide.createIcons();

  try {
    const res = await authFetch(id ? `/api/usuarios/${id}` : '/api/usuarios', {
      method:  id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(cuerpo)
    });
    const data = await res.json();

    if (!res.ok) {
      mostrarErrorModal(data.error || t('usuarios.errorGuardarUsuario'));
      return;
    }

    notyf.success(id ? t('usuarios.actualizado') : t('usuarios.creado'));
    cerrarModal();
    cargarUsuarios();

  } catch (err) {
    console.error('Error al guardar usuario:', err);
    mostrarErrorModal(t('usuarios.sinConexionIntenta'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check" class="icon-btn"></i> ${t('usuarios.guardar')}`;
    lucide.createIcons();
  }
});

// ── Cambiar contraseña (acción aparte) ────────────────────────────────────────
async function cambiarPassword(id, username) {
  const password = await pedirPassword({
    titulo: t('usuarios.nuevaPasswordPara', { username }),
    textoConfirmar: t('usuarios.cambiar'),
    iconoConfirmar: 'key-round'
  });

  if (!password) return;

  const confirmado = await confirmarAccion({
    titulo: t('usuarios.confirmarCambioPassTitulo'),
    mensaje: t('usuarios.confirmarCambioPassMensaje', { username }),
    textoConfirmar: t('usuarios.cambiarContrasena'),
    iconoConfirmar: 'key-round',
    peligro: true,
    ajustado: true
  });
  if (!confirmado) return;

  try {
    const res  = await authFetch(`/api/usuarios/${id}/password`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password })
    });
    const data = await res.json();

    if (!res.ok) {
      notyf.error(data.error || t('usuarios.errorCambiarPassword'));
      return;
    }
    notyf.success(t('usuarios.passwordActualizada', { username }));

  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    notyf.error(t('usuarios.sinConexion'));
  }
}

// ── Activar / desactivar (reversible — no borra nada) ─────────────────────────
async function toggleEstadoUsuario(id, username, activoActual) {
  const ok = await confirmarAccion({
    titulo: activoActual ? t('usuarios.desactivarTitulo', { username }) : t('usuarios.activarTitulo', { username }),
    mensaje: activoActual ? t('usuarios.desactivarMensaje') : t('usuarios.activarMensaje'),
    textoConfirmar: activoActual ? t('usuarios.siDesactivar') : t('usuarios.siActivar'),
    iconoConfirmar: 'check',
    peligro: activoActual
  });

  if (!ok) return;

  try {
    const res  = await authFetch(`/api/usuarios/${id}/estado`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ activo: !activoActual })
    });
    const data = await res.json();

    if (!res.ok) {
      notyf.error(data.error || t('usuarios.errorEstado'));
      return;
    }
    notyf.success(activoActual ? t('usuarios.fueDesactivado', { username }) : t('usuarios.fueActivado', { username }));
    cargarUsuarios();

  } catch (err) {
    console.error('Error al cambiar el estado:', err);
    notyf.error(t('usuarios.sinConexion'));
  }
}

// ── Eliminar definitivamente (irreversible — borra el registro completo) ─────
// Distinto de desactivar: esto es para cuando alguien ya no trabaja en el
// hospital. Si solo está de vacaciones o con licencia, usa "Desactivar".
async function eliminarUsuarioDefinitivo(id, username) {
  const ok = await confirmarAccion({
    titulo: t('usuarios.eliminarTitulo', { username }),
    mensaje: t('usuarios.eliminarMensaje'),
    textoConfirmar: t('usuarios.eliminar'),
    iconoConfirmar: 'trash-2',
    peligro: true
  });

  if (!ok) return;

  try {
    const res  = await authFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      notyf.error(data.error || t('usuarios.errorEliminar'));
      return;
    }
    notyf.success(t('usuarios.fueEliminado', { username }));
    cargarUsuarios();

  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    notyf.error(t('usuarios.sinConexion'));
  }
}

// ── Arranque ───────────────────────────────────────────────────────────────────
mostrarUsuarioActual();
cargarPermisosDisponibles().then(cargarUsuarios);

if (typeof registrarRepintado === 'function') {
  registrarRepintado(() => pintarUsuarios());
}

function mostrarUsuarioActual() {
  const usuario = obtenerUsuario();
  const el = document.getElementById('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
}