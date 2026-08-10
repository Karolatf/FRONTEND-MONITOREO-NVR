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
    tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No se pudo cargar la lista de usuarios.</td></tr>';
  }
}

function pintarUsuarios() {
  const tbody = document.getElementById('usuarios-body');

  if (usuariosCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No hay usuarios registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = usuariosCache.map(u => `
    <tr>
      <td style="font-family:monospace">${escaparHTML(u.username)}</td>
      <td>${escaparHTML(u.nombre)}</td>
      <td><span class="badge-rol ${u.rol}">${etiquetaRol(u.rol)}</span></td>
      <td>${pintarPermisosMini(u)}</td>
      <td><span class="badge-estado ${u.activo ? 'activo' : 'inactivo'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td style="font-size:0.72rem;color:var(--text-dim)">${formatearFecha(u.ultimo_login)}</td>
      <td>
        ${u.rol === 'superadmin' ? '' : `
          <div class="acciones-fila">
            <button class="btn-icono" title="Editar" onclick="abrirModalEditar(${u.id})">
              <i data-lucide="pencil"></i>
            </button>
            <button class="btn-icono" title="Cambiar contraseña" onclick="cambiarPassword(${u.id}, '${escaparHTML(u.username)}')">
              <i data-lucide="key-round"></i>
            </button>
            <button class="btn-icono peligro" title="Desactivar" onclick="desactivarUsuario(${u.id}, '${escaparHTML(u.username)}')">
              <i data-lucide="user-x"></i>
            </button>
          </div>
        `}
      </td>
    </tr>
  `).join('');

  lucide.createIcons();
}

function pintarPermisosMini(u) {
  if (u.rol === 'superadmin') return '<span class="permisos-mini">Todos (súper admin)</span>';
  if (!u.permisos || u.permisos.length === 0) return '<span class="permisos-mini sin-permisos">Ninguno</span>';
  const nombres = u.permisos.map(clave => {
    const p = permisosDisponibles.find(p => p.clave === clave);
    return p ? p.nombre : clave;
  });
  return `<span class="permisos-mini">${nombres.map(escaparHTML).join(', ')}</span>`;
}

function formatearFecha(fecha) {
  if (!fecha) return 'Nunca';
  return new Date(fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

// ── Modal: crear usuario ──────────────────────────────────────────────────────
function abrirModalCrear() {
  document.getElementById('modal-titulo').textContent = 'Crear usuario';
  document.getElementById('usuario-id').value       = '';
  document.getElementById('input-username').value   = '';
  document.getElementById('input-username').disabled = false;
  document.getElementById('input-nombre').value      = '';
  document.getElementById('input-rol').value         = 'analista';
  document.getElementById('grupo-password').hidden   = false;
  document.getElementById('input-password').required = true;
  document.getElementById('input-password').value    = '';
  document.getElementById('grupo-activo').hidden      = true;
  ocultarErrorModal();
  pintarChecksPermisos([]);
  abrirModal();
}

// ── Modal: editar usuario existente ───────────────────────────────────────────
function abrirModalEditar(id) {
  const u = usuariosCache.find(u => u.id === id);
  if (!u) return;

  document.getElementById('modal-titulo').textContent = `Editar ${u.nombre}`;
  document.getElementById('usuario-id').value        = u.id;
  document.getElementById('input-username').value    = u.username;
  document.getElementById('input-username').disabled = true; // El username no se cambia una vez creado
  document.getElementById('input-nombre').value       = u.nombre;
  document.getElementById('input-rol').value          = u.rol;
  document.getElementById('grupo-password').hidden    = true; // La contraseña se cambia aparte
  document.getElementById('input-password').required  = false;
  document.getElementById('grupo-activo').hidden       = false;
  document.getElementById('input-activo').checked      = !!u.activo;
  ocultarErrorModal();
  pintarChecksPermisos(u.permisos || []);
  abrirModal();
}

function pintarChecksPermisos(permisosActuales) {
  const panel = document.getElementById('permisos-panel');

  if (permisosDisponibles.length === 0) {
    panel.innerHTML = '<p class="form-nota" style="margin:0">No hay permisos configurados todavía.</p>';
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
    resumen.textContent = 'Ningún permiso seleccionado';
    resumen.classList.remove('con-seleccion');
  } else if (seleccionados.length === 1) {
    const p = permisosDisponibles.find(p => p.clave === seleccionados[0]);
    resumen.textContent = p ? p.nombre : seleccionados[0];
    resumen.classList.add('con-seleccion');
  } else {
    resumen.textContent = `${seleccionados.length} permisos seleccionados`;
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
  const cuerpo = {
    nombre:   document.getElementById('input-nombre').value.trim(),
    rol:      document.getElementById('input-rol').value,
    permisos: leerPermisosSeleccionados()
  };

  if (!id) {
    cuerpo.username = document.getElementById('input-username').value.trim();
    cuerpo.password = document.getElementById('input-password').value;
  } else {
    cuerpo.activo = document.getElementById('input-activo').checked;
  }

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader" class="icon-btn login-spin"></i> Guardando...';
  lucide.createIcons();

  try {
    const res = await authFetch(id ? `/api/usuarios/${id}` : '/api/usuarios', {
      method:  id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(cuerpo)
    });
    const data = await res.json();

    if (!res.ok) {
      mostrarErrorModal(data.error || 'No se pudo guardar el usuario.');
      return;
    }

    notyf.success(id ? 'Usuario actualizado.' : 'Usuario creado correctamente.');
    cerrarModal();
    cargarUsuarios();

  } catch (err) {
    console.error('Error al guardar usuario:', err);
    mostrarErrorModal('Sin conexión con el servidor. Intenta de nuevo.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" class="icon-btn"></i> Guardar';
    lucide.createIcons();
  }
});

// ── Cambiar contraseña (acción aparte, con SweetAlert2) ───────────────────────
async function cambiarPassword(id, username) {
  const { value: password } = await Swal.fire({
    title: `Nueva contraseña para ${username}`,
    input: 'password',
    inputLabel: 'Mínimo 8 caracteres',
    inputPlaceholder: '••••••••',
    background: '#1a1a1a',
    color: '#e5e7eb',
    confirmButtonColor: '#d4a017',
    confirmButtonText: 'Cambiar contraseña',
    cancelButtonText: 'Cancelar',
    showCancelButton: true,
    inputValidator: valor => {
      if (!valor || valor.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    }
  });

  if (!password) return;

  try {
    const res  = await authFetch(`/api/usuarios/${id}/password`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password })
    });
    const data = await res.json();

    if (!res.ok) {
      notyf.error(data.error || 'No se pudo cambiar la contraseña.');
      return;
    }
    notyf.success(`Contraseña de ${username} actualizada.`);

  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    notyf.error('Sin conexión con el servidor.');
  }
}

// ── Desactivar usuario (borrado suave, con confirmación) ──────────────────────
async function desactivarUsuario(id, username) {
  const confirmacion = await Swal.fire({
    title: `¿Desactivar a ${username}?`,
    text:  'No podrá iniciar sesión hasta que lo actives de nuevo. No se borra su historial.',
    icon:  'warning',
    background: '#1a1a1a',
    color: '#e5e7eb',
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Sí, desactivar',
    cancelButtonText: 'Cancelar',
    showCancelButton: true
  });

  if (!confirmacion.isConfirmed) return;

  try {
    const res  = await authFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      notyf.error(data.error || 'No se pudo desactivar el usuario.');
      return;
    }
    notyf.success(`${username} fue desactivado.`);
    cargarUsuarios();

  } catch (err) {
    console.error('Error al desactivar usuario:', err);
    notyf.error('Sin conexión con el servidor.');
  }
}

// ── Arranque ───────────────────────────────────────────────────────────────────
mostrarUsuarioActual();
cargarPermisosDisponibles().then(cargarUsuarios);

function mostrarUsuarioActual() {
  const usuario = obtenerUsuario();
  const el = document.getElementById('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
}