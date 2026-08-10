// ── Mi Perfil ──────────────────────────────────────────────────────────────────
const notyf = new Notyf({
  ripple:      false,
  dismissible: true,
  position:    { x: 'right', y: 'top' },
  duration:    4000
});

let yaTieneCorreo = false;

function etiquetaRolBadge(rol) {
  return { superadmin: 'Súper Administrador', analista: 'Analista', visualizacion: 'Visualización' }[rol] || rol;
}

function actualizarTextoBoton() {
  document.getElementById('btn-guardar-perfil-texto').textContent =
    yaTieneCorreo ? 'Actualizar correo' : 'Guardar correo';
}

async function cargarPerfil() {
  try {
    const res  = await authFetch('/api/perfil');
    const data = await res.json();

    document.getElementById('perfil-nombre').textContent   = data.nombre || '—';
    document.getElementById('perfil-username').textContent = data.username || '—';
    document.getElementById('input-email').value           = data.email_personal || '';

    yaTieneCorreo = !!data.email_personal;
    actualizarTextoBoton();

    const badge = document.getElementById('perfil-rol-badge');
    badge.textContent = etiquetaRolBadge(data.rol);
    badge.classList.add(data.rol);

  } catch (err) {
    console.error('Error al cargar el perfil:', err);
    notyf.error('No se pudo cargar tu perfil.');
  }
}

function mostrarErrorPerfil(mensaje) {
  const el = document.getElementById('perfil-error');
  el.textContent = mensaje;
  el.hidden = false;
}

document.getElementById('form-perfil').addEventListener('submit', async e => {
  e.preventDefault();
  document.getElementById('perfil-error').hidden = true;

  const email = document.getElementById('input-email').value.trim();
  const btn   = document.getElementById('btn-guardar-perfil');

  btn.disabled = true;
  document.getElementById('btn-guardar-perfil-texto').textContent = 'Guardando...';

  try {
    const res  = await authFetch('/api/perfil/email', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok) {
      mostrarErrorPerfil(data.error || 'No se pudo guardar el correo.');
      return;
    }

    // Actualiza el estado en el momento, sin recargar la página
    yaTieneCorreo = !!email;
    notyf.success(yaTieneCorreo ? 'Correo actualizado.' : 'Correo guardado.');

  } catch (err) {
    console.error('Error al guardar el correo:', err);
    mostrarErrorPerfil('Sin conexión con el servidor. Intenta de nuevo.');
  } finally {
    btn.disabled = false;
    actualizarTextoBoton();
  }
});

// ── Arranque ───────────────────────────────────────────────────────────────────
mostrarUsuarioActual();
cargarPerfil();

function mostrarUsuarioActual() {
  const usuario = obtenerUsuario();
  const el = document.getElementById('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
}