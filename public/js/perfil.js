// ── Mi Perfil ──────────────────────────────────────────────────────────────────
const notyf = new Notyf({
  ripple:      false,
  dismissible: true,
  position:    { x: 'right', y: 'top' },
  duration:    4000
});

let yaTieneCorreo = false;
let catalogoPermisos = [];

function etiquetaRolBadge(rol) {
  return { superadmin: 'Súper Administrador', analista: 'Analista', visualizacion: 'Visualización' }[rol] || rol;
}

function actualizarTextoBoton() {
  document.getElementById('btn-guardar-perfil-texto').textContent =
    yaTieneCorreo ? 'Actualizar correo' : 'Guardar correo';
}

async function cargarCatalogoPermisos() {
  try {
    const res = await authFetch('/api/usuarios/permisos-disponibles');
    catalogoPermisos = await res.json();
  } catch {
    catalogoPermisos = [];
  }
}

function textoPermisos(rol, permisos) {
  if (rol === 'superadmin') return 'Todos (súper administrador)';
  if (!permisos || permisos.length === 0) return 'Ninguno — solo puede ver el dashboard';
  return permisos
    .map(clave => catalogoPermisos.find(p => p.clave === clave)?.nombre || clave)
    .join(', ');
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

    document.getElementById('info-rol').textContent      = etiquetaRolBadge(data.rol);
    document.getElementById('info-permisos').textContent = textoPermisos(data.rol, data.permisos);
    document.getElementById('info-correo').textContent   = data.email_personal || 'Sin registrar';

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

  // El correo es opcional (se puede dejar en blanco), pero si se escribe
  // algo, debe verse como un correo real — sin esto, el navegador mostraba
  // su propio mensaje nativo ("Incluye una arroba...") en vez del nuestro.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrarErrorPerfil('Escribe un correo válido, por ejemplo: nombre@dominio.com');
    return;
  }

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
    document.getElementById('info-correo').textContent = email || 'Sin registrar';
    notyf.success(yaTieneCorreo ? 'Correo actualizado.' : 'Correo guardado.');

  } catch (err) {
    console.error('Error al guardar el correo:', err);
    mostrarErrorPerfil('Sin conexión con el servidor. Intenta de nuevo.');
  } finally {
    btn.disabled = false;
    actualizarTextoBoton();
  }
});

// ── Preferencias de Interfaz — selector de tema (oscuro / claro) ────────────────
// establecerTema()/obtenerTema() viven en js/tema.js (compartido por todas
// las páginas, para que la preferencia se aplique sin importar por dónde
// entre la persona).
function pintarSegmentadoTema() {
  const activo = obtenerTema();
  document.getElementById('btn-tema-oscuro').classList.toggle('activo', activo === 'oscuro');
  document.getElementById('btn-tema-claro').classList.toggle('activo', activo === 'claro');
}

function inicializarSelectorTema() {
  pintarSegmentadoTema();
  document.querySelectorAll('#segmentado-tema .segmentado-opcion').forEach(boton => {
    boton.addEventListener('click', () => {
      establecerTema(boton.dataset.valor);
      pintarSegmentadoTema();
    });
  });
}

// ── Preferencias de Interfaz — idioma ────────────────────────────────────────
// establecerIdioma()/obtenerIdioma() viven en js/i18n.js (compartido).
function inicializarSelectorIdioma() {
  const select = document.getElementById('select-idioma');
  select.value = obtenerIdioma();
  select.addEventListener('change', () => establecerIdioma(select.value));
}

// ── Preferencias de Interfaz — interruptor de notificaciones ─────────────────
// notificacionesActivas()/establecerNotificaciones() viven en
// js/preferencias.js (compartido), para que el dashboard pueda leerlo sin
// depender de que "Mi Perfil" esté abierto.
function pintarSwitch(boton, activo) {
  boton.classList.toggle('activo', activo);
  boton.setAttribute('aria-checked', activo ? 'true' : 'false');
}

function inicializarInterruptores() {
  const btnNotificaciones = document.getElementById('switch-notificaciones');
  pintarSwitch(btnNotificaciones, notificacionesActivas());

  btnNotificaciones.addEventListener('click', () => {
    const nuevoValor = !btnNotificaciones.classList.contains('activo');
    establecerNotificaciones(nuevoValor);
    pintarSwitch(btnNotificaciones, nuevoValor);
  });
}

// ── Tarjeta inferior derecha: cambia según el rol del usuario autenticado ───────
// Súper administrador -> Historial de Inicios de Sesión (dato de todo el
// sistema, exclusivo de su rol). Cualquier otro rol (analista, visualización)
// -> Estado de Monitoreo en Vivo, con datos propios de su sesión y del
// estado actual del monitor.
function inicializarTarjetaSegunRol() {
  const usuario = obtenerUsuario();
  if (!usuario) return;

  if (usuario.rol === 'superadmin') {
    document.getElementById('perfil-historial').hidden = false;
    cargarHistorialLogin();
  } else {
    document.getElementById('perfil-vivo').hidden = false;
    cargarEstadoVivo();
    setInterval(cargarEstadoVivo, 15000);
    setInterval(pintarTiempoSesion, 60000);
  }
}

// ── Estado de Monitoreo en Vivo (rol: analista / visualización) ─────────────────
function pintarPuntoEstadoServidor(estado) {
  // estado: 'en_linea' | 'iniciando' | 'fuera_de_linea'
  const clases  = { en_linea: 'verde', iniciando: 'amarillo', fuera_de_linea: 'rojo' };
  const textos  = { en_linea: 'En Línea', iniciando: 'Iniciando...', fuera_de_linea: 'Fuera de Línea' };
  const el = document.getElementById('vivo-estado-servidor');
  el.innerHTML = `<span class="dot ${clases[estado]}"></span> ${textos[estado]}`;
}

function pintarTiempoSesion() {
  const el = document.getElementById('vivo-sesion');
  if (!el) return;
  el.textContent = calcularTiempoSesion();
}

function calcularTiempoSesion() {
  const inicio = parseInt(sessionStorage.getItem('nvr_login_ts'), 10);
  if (!inicio || Number.isNaN(inicio)) return '—';

  const totalMinutos = Math.max(0, Math.floor((Date.now() - inicio) / 60000));
  const horas   = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m`;
}

async function cargarEstadoVivo() {
  const inicioPeticion = performance.now();

  try {
    const res  = await authFetch('/api/status');
    const data = await res.json();
    const latenciaMs = Math.round(performance.now() - inicioPeticion);

    document.getElementById('vivo-latencia').textContent = `${latenciaMs} ms`;
    pintarTiempoSesion();

    if (data.inicializando) {
      pintarPuntoEstadoServidor('iniciando');
      document.getElementById('vivo-nvrs').textContent = '—';
      return;
    }

    pintarPuntoEstadoServidor('en_linea');

    // Mismo criterio que el dashboard (js/app.js): un NVR cuenta como
    // conectado cuando `activo` es true, sin importar la zona a la que
    // pertenezca.
    let nvrsActivos = 0;
    for (const lista of Object.values(data)) {
      if (Array.isArray(lista)) nvrsActivos += lista.filter(n => n.activo).length;
    }
    document.getElementById('vivo-nvrs').textContent = `${nvrsActivos} Activos`;

  } catch (err) {
    console.error('Error al consultar el estado del monitor:', err);
    pintarPuntoEstadoServidor('fuera_de_linea');
    document.getElementById('vivo-latencia').textContent = '—';
    document.getElementById('vivo-nvrs').textContent      = '—';
  }
}

// ── Historial de Inicios de Sesión (rol: superadmin) ─────────────────────────────
function formatearFechaHistorial(fechaISO) {
  const f = new Date(fechaISO);
  if (Number.isNaN(f.getTime())) return '—';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(f.getDate())}/${pad(f.getMonth() + 1)}/${f.getFullYear()} ${pad(f.getHours())}:${pad(f.getMinutes())}`;
}

async function cargarHistorialLogin() {
  const cuerpo = document.getElementById('historial-login-cuerpo');

  try {
    const res  = await authFetch('/api/auth/historial-login');
    const data = await res.json();

    if (!res.ok) {
      cuerpo.innerHTML = `<tr><td colspan="3" class="perfil-tabla-vacio">${data.error || 'No se pudo cargar el historial.'}</td></tr>`;
      return;
    }

    const historial = data.historial || [];
    if (historial.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="3" class="perfil-tabla-vacio">Todavía no hay inicios de sesión registrados.</td></tr>';
      return;
    }

    cuerpo.innerHTML = historial.map(registro => `
      <tr>
        <td>${registro.username}</td>
        <td class="perfil-tabla-ip">${registro.ip}</td>
        <td>${formatearFechaHistorial(registro.fecha)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Error al cargar el historial de inicios de sesión:', err);
    cuerpo.innerHTML = '<tr><td colspan="3" class="perfil-tabla-vacio">Sin conexión con el servidor.</td></tr>';
  }
}

// ── Arranque ───────────────────────────────────────────────────────────────────
mostrarUsuarioActual();
cargarCatalogoPermisos().then(cargarPerfil);
inicializarSelectorTema();
inicializarSelectorIdioma();
inicializarInterruptores();
inicializarTarjetaSegunRol();

function mostrarUsuarioActual() {
  const usuario = obtenerUsuario();
  const el = document.getElementById('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
}