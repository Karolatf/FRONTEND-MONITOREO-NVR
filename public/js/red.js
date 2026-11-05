// ── Páginas "Access Points" y "Equipos de red / Proveedores" ──────────────────
// Las dos páginas usan este mismo archivo: cada una indica en <body
// data-categoria="..."> qué equipos muestra ('access_point' o 'equipo_red').
// El servidor revisa estos equipos con ping en su propio ciclo y manda el
// estado por WebSocket ('estadoRed'); aquí solo se pinta, agrupado por piso o
// ubicación, con el mismo estilo que el dashboard de NVRs.
// Las ve cualquier usuario con sesión (no requiere permisos).

const CATEGORIA = document.body.dataset.categoria;
let estadoRed = null;
let monitoreoRed = null;
let verificandoRed = false;
let verificacionPedidaAqui = false; // para avisar "listo" solo a quien oprimió Actualizar
let temporizadorRed = null;

// Avisos en pantalla: mismo estilo que los del dashboard de NVRs (rojo para
// caídas, verde para recuperaciones), con el texto propio de cada sección.
const notyfRed = new Notyf({
  ripple: false, dismissible: true, position: { x: 'right', y: 'top' },
  types: [
    { type: 'caida',        className: 'toast-nvr-caida',      background: 'var(--surface2)', duration: 7000, icon: false },
    { type: 'recuperacion', className: 'toast-nvr-recuperado', background: 'var(--surface2)', duration: 5000, icon: false },
    { type: 'error',        className: 'toast-error',          background: 'var(--surface2)', duration: 5000, icon: false }
  ]
});
const LIMITE_TOASTS = 4;   // más eventos que esto a la vez: un solo aviso resumido
let bufferEventos = [];
let temporizadorEventos = null;

function escaparTexto(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function fechaLocal(fecha = new Date()) {
  return new Date(fecha).toLocaleString(obtenerIdioma() === 'en' ? 'en-US' : 'es-CO');
}

// ── Pintar ────────────────────────────────────────────────────────────────────
function equiposDeEstaPagina(pisos) {
  return pisos
    .map(p => ({ ...p, equipos: p.equipos.filter(e => e.categoria === CATEGORIA) }))
    .filter(p => p.equipos.length > 0);
}

function tarjeta(eq) {
  const color = { normal: 'verde', degradado: 'amarillo', caido: 'rojo', sin_verificar: 'gris' }[eq.estadoVisual] || 'gris';
  const titulo = eq.estadoVisual === 'sin_verificar' ? ` title="${escaparTexto(t('red.sinVerificarTitle'))}"` : '';
  return `
    <div class="nvr-card ${eq.estadoVisual || 'normal'}"${titulo}>
      <div class="dot-row">
        <div class="dot ${color}"></div>
        ${eq.inestable ? `<i data-lucide="activity" class="inestable-icono" title="${escaparTexto(t('dashboard.inestableTitle'))}"></i>` : ''}
      </div>
      ${eq.numCaidas > 0 ? `<span class="caidas-badge">${eq.numCaidas}x</span>` : ''}
      <div class="nvr-nombre">${escaparTexto(eq.nombre)}</div>
      <a class="nvr-ip red-ip-link" href="http://${escaparTexto(eq.ip)}" target="_blank" rel="noopener"
         title="${escaparTexto(t('red.abrirEquipo'))}">${escaparTexto(eq.ip)}</a>
      ${eq.proveedor ? `<div class="red-proveedor">${escaparTexto(eq.proveedor)}</div>` : ''}
    </div>`;
}

function pintar() {
  const cont = document.getElementById('red-secciones');
  if (!estadoRed) return;
  const pisos = equiposDeEstaPagina(estadoRed.pisos || []);
  const todos = pisos.flatMap(p => p.equipos);

  const caidos      = todos.filter(e => e.estadoVisual === 'caido').length;
  const respondiendo = todos.filter(e => e.estadoVisual === 'normal' || e.estadoVisual === 'degradado').length;
  document.getElementById('stat-red-activos').textContent = respondiendo;
  document.getElementById('stat-red-caidos').textContent  = caidos;
  document.getElementById('stat-red-total').textContent   = todos.length;
  document.getElementById('stat-red-pisos').textContent   = pisos.length;
  actualizarBanner(todos.filter(e => e.estadoVisual === 'caido'));

  if (todos.length === 0) {
    cont.innerHTML = `
      <section class="nvr-section red-vacio">
        <p>${escaparTexto(t('red.sinEquipos'))}</p>
      </section>`;
    lucide.createIcons();
    return;
  }

  cont.innerHTML = pisos.map(p => {
    const ok = p.equipos.filter(e => e.estadoVisual === 'normal' || e.estadoVisual === 'degradado').length;
    return `
      <section class="nvr-section">
        <div class="section-header">
          <h2><i data-lucide="map-pin" class="icon-section"></i> <span>${escaparTexto(p.nombre)}</span></h2>
          <span class="section-count">${ok} / ${p.equipos.length}</span>
        </div>
        <div class="nvr-grid">${p.equipos.map(tarjeta).join('')}</div>
      </section>`;
  }).join('');
  lucide.createIcons();
}

function pintarAviso() {
  const aviso = document.getElementById('monitoreo-aviso');
  const fase = monitoreoRed?.fase;
  const textos = {
    desactivado:      ['red.desactivadoTitulo', 'red.desactivadoDetalle'],
    sin_conectividad: ['red.sinConectividadTitulo', 'red.sinConectividadDetalle']
  }[fase];
  if (!textos) { aviso.hidden = true; return; }
  aviso.innerHTML = `
    <i data-lucide="${fase === 'desactivado' ? 'pause-circle' : 'wifi-off'}" class="monitoreo-aviso-icono"></i>
    <div class="monitoreo-aviso-texto"><strong></strong><span></span></div>`;
  aviso.querySelector('strong').textContent = t(textos[0]);
  aviso.querySelector('span').textContent   = t(textos[1]);
  aviso.hidden = false;
  lucide.createIcons();
}

function actualizarFecha(msg = null) {
  const el = document.getElementById('ultima-actualizacion');
  const fecha = estadoRed?.ultimoChequeo ? fechaLocal(estadoRed.ultimoChequeo) : null;
  el.textContent = msg || (fecha ? t('red.ultimoChequeo', { fecha }) : t('red.esperandoChequeo'));
}

// ── Barra de incidente ────────────────────────────────────────────────────────
// Igual que la del dashboard de NVRs, pero aquí aparece con UN equipo caído:
// estas secciones tienen pocos equipos y cada uno importa. Respeta el
// interruptor "Notificaciones en pantalla" de Mi Perfil.
function actualizarBanner(caidos) {
  const banner = document.getElementById('incidente-banner');
  if (!banner) return;
  if (!notificacionesActivas() || caidos.length === 0) { banner.hidden = true; return; }
  const nombres = caidos.slice(0, 3).map(e => e.nombre).join(', ') + (caidos.length > 3 ? '…' : '');
  banner.hidden = false;
  banner.innerHTML = `
    <span class="incidente-dot"></span>
    <i data-lucide="alert-triangle" class="incidente-icono"></i>
    <div class="incidente-texto">
      <strong></strong>
      <span></span>
    </div>`;
  banner.querySelector('strong').textContent = t(CATEGORIA === 'equipo_red' ? 'red.incidenteTituloEr' : 'red.incidenteTituloAp', { count: caidos.length });
  banner.querySelector('span').textContent   = t('red.incidenteDetalle', { nombres });
  lucide.createIcons();
}

// ── Avisos en pantalla (caídas y recuperaciones) ──────────────────────────────
function procesarEventos() {
  const eventos = bufferEventos;
  bufferEventos = [];
  if (typeof refrescarHistorial === 'function' && paginaHistorial === 1) cargarHistorial({ alInicio: false });
  if (!notificacionesActivas() || eventos.length === 0) return;

  if (eventos.length > LIMITE_TOASTS) {
    const caidas = eventos.filter(e => e.tipo === 'caida').length;
    const recup  = eventos.length - caidas;
    if (caidas) toast('caida', t('red.resumenCaidas', { count: caidas }), '');
    if (recup)  toast('recuperacion', t('red.resumenRecuperados', { count: recup }), '');
    return;
  }
  eventos.forEach((ev, i) => setTimeout(() => {
    const esEr = CATEGORIA === 'equipo_red';
    const clave = ev.tipo === 'caida'
      ? (esEr ? 'red.toastCaidaEr' : 'red.toastCaidaAp')
      : (esEr ? 'red.toastRecuperadoEr' : 'red.toastRecuperadoAp');
    toast(ev.tipo, `${t(clave)} — ${ev.nombre}`, `${ev.ip}${ev.piso ? ' · ' + ev.piso : ''}`);
  }, i * 150));
}

function toast(tipo, titulo, detalle) {
  notyfRed.open({
    type: tipo,
    message: `
      <div class="toast-contenido">
        <i data-lucide="${tipo === 'caida' ? 'wifi-off' : 'wifi'}" class="toast-icono"></i>
        <div class="toast-texto">
          <b>${escaparTexto(titulo)}</b>
          ${detalle ? `<small>${escaparTexto(detalle)}</small>` : ''}
        </div>
      </div>`
  });
  lucide.createIcons();
}

// Si se enciende o apaga "Notificaciones en pantalla" en otra pestaña
window.addEventListener('storage', e => {
  if (e.key !== null && e.key !== 'nvr_notificaciones') return;
  if (!notificacionesActivas()) notyfRed.dismissAll();
  pintar();
});

// ── Datos ─────────────────────────────────────────────────────────────────────
async function cargarRed() {
  try {
    const res  = await authFetch('/api/red');
    const data = await res.json();
    estadoRed = data;
    monitoreoRed = data.monitoreo;
    pintar(); pintarAviso(); actualizarFecha();
  } catch (err) {
    console.error('Error cargando equipos de red:', err);
  }
}

// ── Botón Actualizar: ping inmediato ──────────────────────────────────────────
function botonVerificando(activo) {
  verificandoRed = activo;
  const btn = document.getElementById('btn-actualizar');
  const texto = btn.querySelector('[data-i18n]');
  btn.classList.toggle('verificando', activo);
  btn.disabled = activo;
  const clave = activo ? 'header.verificando' : 'header.actualizar';
  texto.setAttribute('data-i18n', clave);
  texto.textContent = t(clave);
  clearTimeout(temporizadorRed);
  if (activo) temporizadorRed = setTimeout(() => botonVerificando(false), 20000);
}

async function verificarRed() {
  try {
    const res  = await authFetch('/api/red/verificar', { method: 'POST' });
    const data = await res.json();
    if (data.estado === 'desactivado') return notyfRed.open({ type: 'error', message: t('dashboard.verificacionDesactivada') });
    verificacionPedidaAqui = true;
    botonVerificando(true);
  } catch {
    notyfRed.open({ type: 'error', message: t('dashboard.errorVerificar') });
  }
}

// ── Tiempo real ───────────────────────────────────────────────────────────────
function conectar() {
  const socket = io({ auth: { token: obtenerToken() } });
  socket.on('connect', cargarRed);
  socket.on('estadoRed', data => {
    estadoRed = data;
    pintar(); actualizarFecha();
    if (verificandoRed) {
      botonVerificando(false);
      // Igual que en el dashboard de NVRs: aviso de confirmación a quien la
      // pidió, respetando "Notificaciones en pantalla" de Mi Perfil
      if (verificacionPedidaAqui && notificacionesActivas()) {
        notyfRed.open({ type: 'recuperacion', message: `
          <div class="toast-contenido">
            <i data-lucide="check-circle" class="toast-icono"></i>
            <div class="toast-texto"><b>${escaparTexto(t('dashboard.verificacionCompleta'))}</b></div>
          </div>` });
        lucide.createIcons();
      }
      verificacionPedidaAqui = false;
    }
  });
  socket.on('monitoreo', m => { monitoreoRed = m; pintarAviso(); });
  socket.on('eventoRed', ev => {
    if (ev.categoria !== CATEGORIA) return;
    // Se juntan los que llegan casi al mismo tiempo (un mismo ciclo)
    bufferEventos.push(ev);
    clearTimeout(temporizadorEventos);
    temporizadorEventos = setTimeout(procesarEventos, 400);
  });
  socket.on('disconnect', () => actualizarFecha(t('dashboard.sinConexionReconectando')));
  socket.on('connect_error', err => {
    if (err.message === 'No autenticado' || err.message.includes('inválida')) cerrarSesion();
  });
}

// ── Inicio ────────────────────────────────────────────────────────────────────
(function iniciar() {
  const usuario = obtenerUsuario();
  const el = document.getElementById('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
  cargarRed();
  conectar();
  if (typeof registrarRepintado === 'function') registrarRepintado(() => { pintar(); pintarAviso(); actualizarFecha(); });
})();