// ── Gestionar Dispositivos (NVRs, cámaras y Access Points) ───────────────────
// Pantalla de administración: agregar, editar, pausar y eliminar dispositivos
// sin tocar código ni reiniciar el servidor. Habla con /api/dispositivos
// (ver backend: routes/dispositivos.routes.js), que exige el permiso
// "gestionar_dispositivos".

// Protección extra en el cliente: si alguien sin el permiso llega a esta URL
// a mano, se le manda de vuelta al dashboard. La protección real está en el
// backend (cualquier petición a /api/dispositivos sin el permiso recibe 403).
(function protegerPagina() {
  if (!tienePermiso('gestionar_dispositivos')) window.location.replace('index.html');
})();

const notyf = new Notyf({
  ripple:      false,
  dismissible: true,
  position:    { x: 'right', y: 'top' },
  duration:    4000
});

const API = '/api/dispositivos';

// La tabla de cámaras puede tener más de mil filas: se dibujan las primeras
// y se avisa cómo ver el resto (búsqueda o filtro por NVR) para que la
// pantalla siga ágil.
const MAX_FILAS_VISIBLES = 300;
const MAX_CAMARAS_POR_LOTE = 200;

// Misma regla que valida el backend: 4 números de 0 a 255, sin ceros a la izquierda.
const REGEX_IP = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

let arbol    = { zonas: [], pisos: [] };
let pestana  = 'camaras';
let cargado  = false;

const $ = id => document.getElementById(id);

// ═════════════════════════════════════════════════════════════════════════════
//  Utilidades
// ═════════════════════════════════════════════════════════════════════════════
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function debounce(fn, ms) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), ms);
  };
}

function iconos() {
  if (window.lucide) lucide.createIcons();
}

// Los nombres de zona vienen de la base de datos (en español); para las dos
// que tienen traducción se usa el diccionario de idiomas.
function nombreZona(zona) {
  const clave = { fisica: 'dispositivos.zonaFisica', paciente: 'dispositivos.zonaPaciente' }[zona.clave];
  return clave ? t(clave) : zona.nombre;
}

// Llamada a la API: nunca lanza error, siempre devuelve { ok, status, datos, error }
async function llamar(metodo, ruta, cuerpo) {
  try {
    const res = await authFetch(API + ruta, {
      method:  metodo,
      headers: { 'Content-Type': 'application/json' },
      body:    cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
    });
    const datos = await res.json().catch(() => null);
    if (res.status === 403) window.location.replace('index.html'); // perdió el permiso
    return {
      ok: res.ok, status: res.status, datos,
      error: res.ok ? null : (datos?.error || t('dispositivos.errorGenerico'))
    };
  } catch {
    return { ok: false, status: 0, datos: null, error: t('dispositivos.sinConexion') };
  }
}

// Bloquea el botón mientras se guarda, para que un doble clic no envíe dos veces
async function conBotonOcupado(idBoton, accion) {
  const boton = $(idBoton);
  boton.disabled = true;
  try { return await accion(); }
  finally { boton.disabled = false; }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Datos: del árbol (zonas → NVRs → cámaras, pisos → APs) a listas planas
// ═════════════════════════════════════════════════════════════════════════════
function listarNvrs() {
  const lista = [];
  for (const zona of arbol.zonas) {
    for (const nvr of zona.nvrs) lista.push({ ...nvr, zona, totalCamaras: nvr.camaras.length });
  }
  return lista;
}

function listarCamaras() {
  const lista = [];
  for (const zona of arbol.zonas) {
    for (const nvr of zona.nvrs) {
      for (const cam of nvr.camaras) lista.push({ ...cam, nvr, zona });
    }
  }
  return lista;
}

function listarAps() {
  const lista = [];
  for (const piso of arbol.pisos) {
    for (const ap of piso.accessPoints) lista.push({ ...ap, piso });
  }
  return lista;
}

const buscarNvr = id => listarNvrs().find(n => n.id === id);
const buscarCamara = id => listarCamaras().find(c => c.id === id);
const buscarAp = id => listarAps().find(a => a.id === id);

function coincideTexto(item, texto) {
  if (!texto) return true;
  const q = texto.toLowerCase();
  return item.nombre.toLowerCase().includes(q) || item.ip.includes(q);
}
function coincideEstado(item, estado) {
  if (estado === 'activo') return item.activo;
  if (estado === 'pausa')  return !item.activo;
  return true;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Dibujo de las tablas
// ═════════════════════════════════════════════════════════════════════════════
function badgeEstado(activo) {
  return activo
    ? `<span class="badge-estado activo">${t('dispositivos.estadoActivo')}</span>`
    : `<span class="badge-estado pausado">${t('dispositivos.estadoPausa')}</span>`;
}

function botonesAccion(activo) {
  return `
    <div class="acciones-fila">
      <button type="button" class="btn-icono" data-accion="editar" title="${t('dispositivos.editar')}">
        <i data-lucide="pencil"></i>
      </button>
      <button type="button" class="btn-icono" data-accion="pausar" title="${activo ? t('dispositivos.pausar') : t('dispositivos.reanudar')}">
        <i data-lucide="${activo ? 'pause' : 'play'}"></i>
      </button>
      <button type="button" class="btn-icono peligro" data-accion="eliminar" title="${t('dispositivos.eliminar')}">
        <i data-lucide="trash-2"></i>
      </button>
    </div>`;
}

function mensajeVacio(columnas, texto) {
  return `<tr><td colspan="${columnas}" class="empty-msg">${texto}</td></tr>`;
}

function pintarCamaras() {
  const f = { texto: $('filtro-camaras-texto').value.trim(), nvr: $('filtro-camaras-nvr').value, estado: $('filtro-camaras-estado').value };
  const todas = listarCamaras();
  const lista = todas.filter(c =>
    coincideTexto(c, f.texto) && (!f.nvr || String(c.nvr.id) === f.nvr) && coincideEstado(c, f.estado)
  );

  const cuerpo = $('cuerpo-camaras');
  if (todas.length === 0)  { cuerpo.innerHTML = mensajeVacio(6, t('dispositivos.sinCamaras'));     return iconos(); }
  if (lista.length === 0)  { cuerpo.innerHTML = mensajeVacio(6, t('dispositivos.sinResultados')); return iconos(); }

  const visibles = lista.slice(0, MAX_FILAS_VISIBLES);
  cuerpo.innerHTML = visibles.map(c => `
    <tr class="${c.activo ? '' : 'fila-pausa'}" data-id="${c.id}">
      <td>${escaparHTML(c.nombre)}</td>
      <td class="ip-mono">${escaparHTML(c.ip)}</td>
      <td class="celda-nvr">${escaparHTML(c.nvr.nombre)}<small>${escaparHTML(c.nvr.ip)}</small></td>
      <td>${escaparHTML(nombreZona(c.zona))}</td>
      <td>${badgeEstado(c.activo)}</td>
      <td>${botonesAccion(c.activo)}</td>
    </tr>`).join('') +
    (lista.length > visibles.length
      ? mensajeVacio(6, t('dispositivos.limiteVista', { mostradas: visibles.length, total: lista.length }))
      : '');
  iconos();
}

function pintarNvrs() {
  const f = { texto: $('filtro-nvrs-texto').value.trim(), zona: $('filtro-nvrs-zona').value, estado: $('filtro-nvrs-estado').value };
  const todos = listarNvrs();
  const lista = todos.filter(n =>
    coincideTexto(n, f.texto) && (!f.zona || String(n.zona.id) === f.zona) && coincideEstado(n, f.estado)
  );

  const cuerpo = $('cuerpo-nvrs');
  if (todos.length === 0) { cuerpo.innerHTML = mensajeVacio(6, t('dispositivos.sinNvrs'));       return iconos(); }
  if (lista.length === 0) { cuerpo.innerHTML = mensajeVacio(6, t('dispositivos.sinResultados')); return iconos(); }

  cuerpo.innerHTML = lista.map(n => `
    <tr class="${n.activo ? '' : 'fila-pausa'}" data-id="${n.id}">
      <td>${escaparHTML(n.nombre)}</td>
      <td class="ip-mono">${escaparHTML(n.ip)}</td>
      <td>${escaparHTML(nombreZona(n.zona))}</td>
      <td>${n.totalCamaras}</td>
      <td>${badgeEstado(n.activo)}</td>
      <td>${botonesAccion(n.activo)}</td>
    </tr>`).join('');
  iconos();
}

function pintarAps() {
  const f = { texto: $('filtro-aps-texto').value.trim(), piso: $('filtro-aps-piso').value, estado: $('filtro-aps-estado').value };
  const todos = listarAps();
  const lista = todos.filter(a =>
    coincideTexto(a, f.texto) && (!f.piso || String(a.piso.id) === f.piso) && coincideEstado(a, f.estado)
  );

  const cuerpo = $('cuerpo-aps');
  if (todos.length === 0) { cuerpo.innerHTML = mensajeVacio(5, t('dispositivos.sinAps'));        return iconos(); }
  if (lista.length === 0) { cuerpo.innerHTML = mensajeVacio(5, t('dispositivos.sinResultados')); return iconos(); }

  cuerpo.innerHTML = lista.map(a => `
    <tr class="${a.activo ? '' : 'fila-pausa'}" data-id="${a.id}">
      <td>${escaparHTML(a.nombre)}</td>
      <td class="ip-mono">${escaparHTML(a.ip)}</td>
      <td>${escaparHTML(a.piso.nombre)}</td>
      <td>${badgeEstado(a.activo)}</td>
      <td>${botonesAccion(a.activo)}</td>
    </tr>`).join('');
  iconos();
}

function mostrarErrorEnTablas(mensaje) {
  $('cuerpo-camaras').innerHTML = mensajeVacio(6, escaparHTML(mensaje));
  $('cuerpo-nvrs').innerHTML    = mensajeVacio(6, escaparHTML(mensaje));
  $('cuerpo-aps').innerHTML     = mensajeVacio(5, escaparHTML(mensaje));
}

function pintarContadores() {
  $('contador-camaras').textContent = listarCamaras().length;
  $('contador-nvrs').textContent    = listarNvrs().length;
  $('contador-aps').textContent     = listarAps().length;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Selectores (filtros y formularios)
// ═════════════════════════════════════════════════════════════════════════════
// Rellena un <select> conservando lo que estaba elegido, si todavía existe.
function llenarSelect(select, opcionesHTML) {
  const anterior = select.value;
  select.innerHTML = opcionesHTML;
  if ([...select.options].some(o => o.value === anterior)) select.value = anterior;
}

const opcionVacia = texto => `<option value="">${escaparHTML(texto)}</option>`;

// NVRs agrupados por zona (<optgroup>), con la IP para distinguir NVRs de igual nombre
function opcionesNvrs(textoVacio) {
  const grupos = arbol.zonas
    .filter(z => z.nvrs.length)
    .map(z => `<optgroup label="${escaparHTML(nombreZona(z))}">` +
      z.nvrs.map(n => `<option value="${n.id}">${escaparHTML(n.nombre)} (${escaparHTML(n.ip)})</option>`).join('') +
      `</optgroup>`)
    .join('');
  return opcionVacia(textoVacio) + grupos;
}

const opcionesZonas = textoVacio =>
  opcionVacia(textoVacio) + arbol.zonas.map(z => `<option value="${z.id}">${escaparHTML(nombreZona(z))}</option>`).join('');

const opcionesPisos = textoVacio =>
  opcionVacia(textoVacio) + arbol.pisos.map(p => `<option value="${p.id}">${escaparHTML(p.nombre)}</option>`).join('');

function poblarSelectores() {
  llenarSelect($('filtro-camaras-nvr'),  opcionesNvrs(t('dispositivos.todosNvrs')));
  llenarSelect($('filtro-nvrs-zona'),    opcionesZonas(t('dispositivos.todasZonas')));
  llenarSelect($('filtro-aps-piso'),     opcionesPisos(t('dispositivos.todosPisos')));
}

function repintarTodo() {
  pintarContadores();
  poblarSelectores();
  pintarCamaras();
  pintarNvrs();
  pintarAps();
}

// ═════════════════════════════════════════════════════════════════════════════
//  Carga
// ═════════════════════════════════════════════════════════════════════════════
async function cargarArbol() {
  const r = await llamar('GET', '');
  if (!r.ok) {
    mostrarErrorEnTablas(r.error || t('dispositivos.errorCargar'));
    return false;
  }
  arbol = r.datos;
  cargado = true;
  repintarTodo();
  return true;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Pestañas, filtros y botones del encabezado
// ═════════════════════════════════════════════════════════════════════════════
function seleccionarPestana(nombre) {
  pestana = nombre;
  document.querySelectorAll('.tab').forEach(tab => {
    const activa = tab.dataset.pestana === nombre;
    tab.classList.toggle('activo', activa);
    tab.setAttribute('aria-selected', activa ? 'true' : 'false');
  });
  for (const p of ['camaras', 'nvrs', 'aps']) {
    $(`seccion-${p}`).hidden  = p !== nombre;
    $(`acciones-${p}`).hidden = p !== nombre;
  }
}

document.querySelectorAll('.tab').forEach(tab =>
  tab.addEventListener('click', () => seleccionarPestana(tab.dataset.pestana))
);

const pintarCamarasConRetraso = debounce(pintarCamaras, 150);
const pintarNvrsConRetraso    = debounce(pintarNvrs, 150);
const pintarApsConRetraso     = debounce(pintarAps, 150);

$('filtro-camaras-texto').addEventListener('input',  pintarCamarasConRetraso);
$('filtro-camaras-nvr').addEventListener('change',   pintarCamaras);
$('filtro-camaras-estado').addEventListener('change', pintarCamaras);
$('filtro-nvrs-texto').addEventListener('input',     pintarNvrsConRetraso);
$('filtro-nvrs-zona').addEventListener('change',     pintarNvrs);
$('filtro-nvrs-estado').addEventListener('change',   pintarNvrs);
$('filtro-aps-texto').addEventListener('input',      pintarApsConRetraso);
$('filtro-aps-piso').addEventListener('change',      pintarAps);
$('filtro-aps-estado').addEventListener('change',    pintarAps);

document.querySelectorAll('[data-limpiar]').forEach(boton => boton.addEventListener('click', () => {
  const p = boton.dataset.limpiar;
  $(`filtro-${p}-texto`).value = '';
  $(`filtro-${p}-estado`).value = '';
  const segundo = { camaras: 'filtro-camaras-nvr', nvrs: 'filtro-nvrs-zona', aps: 'filtro-aps-piso' }[p];
  $(segundo).value = '';
  ({ camaras: pintarCamaras, nvrs: pintarNvrs, aps: pintarAps })[p]();
}));

$('btn-nueva-camara').addEventListener('click', () => abrirModalCamara());
$('btn-lote').addEventListener('click', abrirModalLote);
$('btn-nuevo-nvr').addEventListener('click', () => abrirModalNvr());
$('btn-nuevo-ap').addEventListener('click', () => abrirModalAp());
$('btn-pisos').addEventListener('click', abrirModalPisos);

// ═════════════════════════════════════════════════════════════════════════════
//  Modales: abrir, cerrar y avisos de error
// ═════════════════════════════════════════════════════════════════════════════
function abrirModal(id, focoId) {
  $(id).hidden = false;
  iconos();
  if (focoId) setTimeout(() => $(focoId)?.focus(), 50);
}
function cerrarModal(id) { $(id).hidden = true; }

document.querySelectorAll('[data-modal]').forEach(overlay => {
  // Clic en el fondo oscuro cierra el modal
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModal(overlay.id); });
  overlay.querySelector('[data-cerrar-modal]')?.addEventListener('click', () => cerrarModal(overlay.id));
});

// Escape cierra el modal abierto, salvo que encima haya un diálogo de confirmación
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('generico-overlay') && !$('generico-overlay').hidden) return;
  document.querySelectorAll('[data-modal]').forEach(m => { if (!m.hidden) cerrarModal(m.id); });
});

function mostrarError(idCaja, mensaje, idCampo) {
  const caja = $(idCaja);
  caja.textContent = mensaje;
  caja.hidden = false;
  if (idCampo) $(idCampo)?.focus();
}
function ocultarError(idCaja) { $(idCaja).hidden = true; }

// Interruptor "Monitoreo activo"
function fijarSwitch(id, activo) {
  const boton = $(id);
  boton.classList.toggle('activo', activo);
  boton.setAttribute('aria-checked', activo ? 'true' : 'false');
}
const switchActivo = id => $(id).classList.contains('activo');
document.querySelectorAll('[data-switch]').forEach(boton =>
  boton.addEventListener('click', () => fijarSwitch(boton.id, !boton.classList.contains('activo')))
);

// ═════════════════════════════════════════════════════════════════════════════
//  NVRs
// ═════════════════════════════════════════════════════════════════════════════
function abrirModalNvr(nvr = null) {
  ocultarError('nvr-error');
  llenarSelect($('nvr-zona'), opcionesZonas(t('dispositivos.seleccionaZona')));
  $('nvr-id').value     = nvr ? nvr.id : '';
  $('nvr-nombre').value = nvr ? nvr.nombre : '';
  $('nvr-ip').value     = nvr ? nvr.ip : '';
  $('nvr-zona').value   = nvr ? String(nvr.zona.id) : '';
  fijarSwitch('nvr-activo', nvr ? nvr.activo : true);
  $('nvr-modal-titulo').textContent = nvr ? t('dispositivos.editarNvr') : t('dispositivos.crearNvr');
  abrirModal('modal-nvr', 'nvr-nombre');
}

$('form-nvr').addEventListener('submit', async e => {
  e.preventDefault();
  ocultarError('nvr-error');

  const id     = $('nvr-id').value;
  const zonaId = Number($('nvr-zona').value);
  const nombre = $('nvr-nombre').value.trim();
  const ip     = $('nvr-ip').value.trim();

  if (!zonaId) return mostrarError('nvr-error', t('dispositivos.errZona'), 'nvr-zona');
  if (!nombre) return mostrarError('nvr-error', t('dispositivos.errNombre'), 'nvr-nombre');
  if (!REGEX_IP.test(ip)) return mostrarError('nvr-error', t('dispositivos.errIp'), 'nvr-ip');

  const cuerpo = { zona_id: zonaId, nombre, ip, activo: switchActivo('nvr-activo') };
  const r = await conBotonOcupado('nvr-guardar', () =>
    id ? llamar('PUT', `/nvrs/${id}`, cuerpo) : llamar('POST', '/nvrs', cuerpo));

  if (!r.ok) return mostrarError('nvr-error', r.error);
  cerrarModal('modal-nvr');
  notyf.success(t(id ? 'dispositivos.nvrActualizado' : 'dispositivos.nvrCreado', { nombre }));
  await cargarArbol();
});

async function accionNvr(accion, nvr) {
  if (accion === 'editar') return abrirModalNvr(nvr);

  if (accion === 'pausar') {
    if (nvr.activo) {
      const ok = await confirmarAccion({
        titulo:         t('dispositivos.confPausarNvrTitulo', { nombre: nvr.nombre }),
        mensaje:        nvr.totalCamaras > 0
          ? t('dispositivos.confPausarNvrMensaje', { count: nvr.totalCamaras })
          : t('dispositivos.confPausarNvrSinCamaras'),
        textoConfirmar: t('dispositivos.pausar'),
        iconoConfirmar: 'pause'
      });
      if (!ok) return;
    }
    return cambiarActivo(`/nvrs/${nvr.id}`, nvr.nombre, !nvr.activo);
  }

  if (accion === 'eliminar') {
    const ok = await confirmarAccion({
      titulo:  t('dispositivos.confEliminarNvrTitulo', { nombre: nvr.nombre }),
      mensaje: nvr.totalCamaras > 0
        ? t('dispositivos.confEliminarNvrMensaje', { count: nvr.totalCamaras })
        : t('dispositivos.confEliminarNvrSinCamaras'),
      textoConfirmar: t('dispositivos.eliminar'),
      iconoConfirmar: 'trash-2',
      peligro:        true
    });
    if (!ok) return;
    const r = await llamar('DELETE', `/nvrs/${nvr.id}`);
    if (!r.ok) return notyf.error(r.error);
    const n = r.datos?.camarasEliminadas ?? 0;
    notyf.success(n > 0
      ? t('dispositivos.nvrEliminado', { nombre: nvr.nombre, count: n })
      : t('dispositivos.nvrEliminadoSinCamaras', { nombre: nvr.nombre }));
    await cargarArbol();
  }
}

// Pausar / reanudar (sirve para NVRs, cámaras y Access Points)
async function cambiarActivo(ruta, nombre, activo) {
  const r = await llamar('PUT', ruta, { activo });
  if (!r.ok) return notyf.error(r.error);
  notyf.success(t(activo ? 'dispositivos.reanudado' : 'dispositivos.pausado', { nombre }));
  await cargarArbol();
}

// ═════════════════════════════════════════════════════════════════════════════
//  Cámaras
// ═════════════════════════════════════════════════════════════════════════════
function abrirModalCamara(camara = null) {
  ocultarError('camara-error');
  llenarSelect($('camara-nvr'), opcionesNvrs(t('dispositivos.seleccionaNvr')));
  $('camara-id').value     = camara ? camara.id : '';
  $('camara-nombre').value = camara ? camara.nombre : '';
  $('camara-ip').value     = camara ? camara.ip : '';
  // Al agregar, se preselecciona el NVR que esté filtrado (ahorra un paso)
  $('camara-nvr').value    = camara ? String(camara.nvr.id) : $('filtro-camaras-nvr').value;
  fijarSwitch('camara-activo', camara ? camara.activo : true);
  $('camara-modal-titulo').textContent = camara ? t('dispositivos.editarCamara') : t('dispositivos.crearCamara');
  abrirModal('modal-camara', camara ? 'camara-nombre' : ($('camara-nvr').value ? 'camara-nombre' : 'camara-nvr'));
}

$('form-camara').addEventListener('submit', async e => {
  e.preventDefault();
  ocultarError('camara-error');

  const id     = $('camara-id').value;
  const nvrId  = Number($('camara-nvr').value);
  const nombre = $('camara-nombre').value.trim();
  const ip     = $('camara-ip').value.trim();

  if (!nvrId)  return mostrarError('camara-error', t('dispositivos.errNvr'), 'camara-nvr');
  if (!nombre) return mostrarError('camara-error', t('dispositivos.errNombre'), 'camara-nombre');
  if (!REGEX_IP.test(ip)) return mostrarError('camara-error', t('dispositivos.errIp'), 'camara-ip');

  const cuerpo = { nvr_id: nvrId, nombre, ip, activo: switchActivo('camara-activo') };
  const r = await conBotonOcupado('camara-guardar', () =>
    id ? llamar('PUT', `/camaras/${id}`, cuerpo) : llamar('POST', '/camaras', cuerpo));

  if (!r.ok) return mostrarError('camara-error', r.error);
  cerrarModal('modal-camara');
  notyf.success(t(id ? 'dispositivos.camaraActualizada' : 'dispositivos.camaraCreada', { nombre }));
  await cargarArbol();
});

async function accionCamara(accion, camara) {
  if (accion === 'editar') return abrirModalCamara(camara);
  if (accion === 'pausar') return cambiarActivo(`/camaras/${camara.id}`, camara.nombre, !camara.activo);
  if (accion === 'eliminar') {
    const ok = await confirmarAccion({
      titulo:         t('dispositivos.confEliminarCamaraTitulo', { nombre: camara.nombre }),
      mensaje:        t('dispositivos.confEliminarMensaje'),
      textoConfirmar: t('dispositivos.eliminar'),
      iconoConfirmar: 'trash-2',
      peligro:        true
    });
    if (!ok) return;
    const r = await llamar('DELETE', `/camaras/${camara.id}`);
    if (!r.ok) return notyf.error(r.error);
    notyf.success(t('dispositivos.camaraEliminada', { nombre: camara.nombre }));
    await cargarArbol();
  }
}

// ── Carga por lote ────────────────────────────────────────────────────────────
// Cada línea: "nombre, IP" (también acepta tabulador o espacio, para pegar
// desde Excel). La IP va siempre al final, así el nombre puede tener espacios.
function parsearLote(texto) {
  const camaras = [], errores = [], vistas = new Set();
  texto.split(/\r?\n/).forEach((linea, i) => {
    const limpia = linea.trim();
    if (!limpia) return;
    const m = limpia.match(/^(.*?)[\s,;]+(\d{1,3}(?:\.\d{1,3}){3})$/);
    const nombre = m ? m[1].replace(/[\s,;]+$/, '').trim() : '';
    const ip     = m ? m[2] : '';
    if (!m || !nombre || !REGEX_IP.test(ip)) {
      errores.push(t('dispositivos.loteLineaMala', { linea: i + 1 }));
      return;
    }
    if (vistas.has(ip)) {
      errores.push(t('dispositivos.loteRepetida', { linea: i + 1, ip }));
      return;
    }
    vistas.add(ip);
    camaras.push({ nombre, ip });
  });
  return { camaras, errores };
}

function actualizarContadorLote() {
  const contador = $('lote-contador');
  const { camaras, errores } = parsearLote($('lote-texto').value);
  contador.className = 'lote-contador';
  if (errores.length) {
    contador.textContent = errores[0] + (errores.length > 1 ? ` (+${errores.length - 1})` : '');
    contador.classList.add('error');
  } else if (camaras.length) {
    contador.textContent = t('dispositivos.loteContador', { count: camaras.length });
    contador.classList.add('ok');
  } else {
    contador.textContent = '';
  }
}
// Al corregir el texto, el aviso rojo de un envío anterior ya no corresponde: se retira
$('lote-texto').addEventListener('input', () => { ocultarError('lote-error'); actualizarContadorLote(); });

function abrirModalLote() {
  ocultarError('lote-error');
  llenarSelect($('lote-nvr'), opcionesNvrs(t('dispositivos.seleccionaNvr')));
  $('lote-nvr').value   = $('filtro-camaras-nvr').value;
  $('lote-texto').value = '';
  actualizarContadorLote();
  abrirModal('modal-lote', $('lote-nvr').value ? 'lote-texto' : 'lote-nvr');
}

$('form-lote').addEventListener('submit', async e => {
  e.preventDefault();
  ocultarError('lote-error');

  const nvrId = Number($('lote-nvr').value);
  const { camaras, errores } = parsearLote($('lote-texto').value);

  if (!nvrId) return mostrarError('lote-error', t('dispositivos.errNvr'), 'lote-nvr');
  if (errores.length) {
    $('lote-contador').textContent = ''; // el recuadro rojo ya dice lo mismo: no se repite
    return mostrarError('lote-error', errores.slice(0, 5).join('\n') + (errores.length > 5 ? `\n… (+${errores.length - 5})` : ''));
  }
  if (camaras.length === 0) return mostrarError('lote-error', t('dispositivos.loteSinLineas'), 'lote-texto');
  if (camaras.length > MAX_CAMARAS_POR_LOTE) return mostrarError('lote-error', t('dispositivos.loteMax', { max: MAX_CAMARAS_POR_LOTE }));

  const r = await conBotonOcupado('lote-guardar', () => llamar('POST', '/camaras/lote', { nvr_id: nvrId, camaras }));
  if (!r.ok) return mostrarError('lote-error', r.error);

  cerrarModal('modal-lote');
  notyf.success(t('dispositivos.camarasCargadas', { count: r.datos?.creadas ?? camaras.length }));
  await cargarArbol();
});

// ═════════════════════════════════════════════════════════════════════════════
//  Access Points
// ═════════════════════════════════════════════════════════════════════════════
function abrirModalAp(ap = null) {
  ocultarError('ap-error');
  llenarSelect($('ap-piso'), opcionesPisos(t('dispositivos.seleccionaPiso')));
  $('ap-id').value     = ap ? ap.id : '';
  $('ap-nombre').value = ap ? ap.nombre : '';
  $('ap-ip').value     = ap ? ap.ip : '';
  $('ap-piso').value   = ap ? String(ap.piso.id) : $('filtro-aps-piso').value;
  fijarSwitch('ap-activo', ap ? ap.activo : true);
  $('ap-modal-titulo').textContent = ap ? t('dispositivos.editarAp') : t('dispositivos.crearAp');
  abrirModal('modal-ap', 'ap-nombre');
  // Sin pisos no se puede registrar un Access Point: se avisa de entrada
  if (arbol.pisos.length === 0) mostrarError('ap-error', t('dispositivos.errSinPisos'));
}

$('form-ap').addEventListener('submit', async e => {
  e.preventDefault();
  ocultarError('ap-error');

  const id     = $('ap-id').value;
  const pisoId = Number($('ap-piso').value);
  const nombre = $('ap-nombre').value.trim();
  const ip     = $('ap-ip').value.trim();

  if (!pisoId) return mostrarError('ap-error', arbol.pisos.length ? t('dispositivos.errPiso') : t('dispositivos.errSinPisos'), 'ap-piso');
  if (!nombre) return mostrarError('ap-error', t('dispositivos.errNombre'), 'ap-nombre');
  if (!REGEX_IP.test(ip)) return mostrarError('ap-error', t('dispositivos.errIp'), 'ap-ip');

  const cuerpo = { piso_id: pisoId, nombre, ip, activo: switchActivo('ap-activo') };
  const r = await conBotonOcupado('ap-guardar', () =>
    id ? llamar('PUT', `/access-points/${id}`, cuerpo) : llamar('POST', '/access-points', cuerpo));

  if (!r.ok) return mostrarError('ap-error', r.error);
  cerrarModal('modal-ap');
  notyf.success(t(id ? 'dispositivos.apActualizado' : 'dispositivos.apCreado', { nombre }));
  await cargarArbol();
});

async function accionAp(accion, ap) {
  if (accion === 'editar') return abrirModalAp(ap);
  if (accion === 'pausar') return cambiarActivo(`/access-points/${ap.id}`, ap.nombre, !ap.activo);
  if (accion === 'eliminar') {
    const ok = await confirmarAccion({
      titulo:         t('dispositivos.confEliminarApTitulo', { nombre: ap.nombre }),
      mensaje:        t('dispositivos.confEliminarMensaje'),
      textoConfirmar: t('dispositivos.eliminar'),
      iconoConfirmar: 'trash-2',
      peligro:        true
    });
    if (!ok) return;
    const r = await llamar('DELETE', `/access-points/${ap.id}`);
    if (!r.ok) return notyf.error(r.error);
    notyf.success(t('dispositivos.apEliminado', { nombre: ap.nombre }));
    await cargarArbol();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Pisos
// ═════════════════════════════════════════════════════════════════════════════
function pintarPisos() {
  const contenedor = $('pisos-lista');
  if (arbol.pisos.length === 0) {
    contenedor.innerHTML = `<p class="empty-msg">${t('dispositivos.pisoSinPisos')}</p>`;
    return;
  }
  contenedor.innerHTML = arbol.pisos.map(p => `
    <div class="piso-fila" data-id="${p.id}">
      <input type="text" class="campo-texto piso-nombre" value="${escaparHTML(p.nombre)}" maxlength="40" autocomplete="off" aria-label="${t('dispositivos.labelNombre')}">
      <span class="piso-aps">${t('dispositivos.pisoAps', { count: p.accessPoints.length })}</span>
      <button type="button" class="btn-icono" data-accion="guardar-piso" title="${t('dispositivos.pisoGuardar')}"><i data-lucide="check"></i></button>
      <button type="button" class="btn-icono peligro" data-accion="eliminar-piso" title="${t('dispositivos.eliminar')}"><i data-lucide="trash-2"></i></button>
    </div>`).join('');
  iconos();
}

function abrirModalPisos() {
  ocultarError('pisos-error');
  $('piso-nuevo').value = '';
  pintarPisos();
  abrirModal('modal-pisos', 'piso-nuevo');
}

async function agregarPiso() {
  ocultarError('pisos-error');
  const nombre = $('piso-nuevo').value.trim();
  if (!nombre) return mostrarError('pisos-error', t('dispositivos.errPisoNombre'), 'piso-nuevo');

  const r = await conBotonOcupado('btn-piso-agregar', () => llamar('POST', '/pisos', { nombre }));
  if (!r.ok) return mostrarError('pisos-error', r.error, 'piso-nuevo');
  $('piso-nuevo').value = '';
  notyf.success(t('dispositivos.pisoCreado', { nombre }));
  await cargarArbol();
  pintarPisos();
  $('piso-nuevo').focus();
}
$('btn-piso-agregar').addEventListener('click', agregarPiso);
$('piso-nuevo').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregarPiso(); } });

async function guardarPiso(fila) {
  ocultarError('pisos-error');
  const id     = Number(fila.dataset.id);
  const campo  = fila.querySelector('.piso-nombre');
  const nombre = campo.value.trim();
  if (!nombre) return mostrarError('pisos-error', t('dispositivos.errPisoNombre'), campo.id || undefined);

  const r = await llamar('PUT', `/pisos/${id}`, { nombre });
  if (!r.ok) return mostrarError('pisos-error', r.error);
  notyf.success(t('dispositivos.pisoActualizado', { nombre }));
  await cargarArbol();
  pintarPisos();
}

async function eliminarPiso(fila) {
  ocultarError('pisos-error');
  const id   = Number(fila.dataset.id);
  const piso = arbol.pisos.find(p => p.id === id);
  if (!piso) return;
  const ok = await confirmarAccion({
    titulo:         t('dispositivos.confEliminarPisoTitulo', { nombre: piso.nombre }),
    mensaje:        t('dispositivos.confEliminarPisoMensaje'),
    textoConfirmar: t('dispositivos.eliminar'),
    iconoConfirmar: 'trash-2',
    peligro:        true
  });
  if (!ok) return;
  const r = await llamar('DELETE', `/pisos/${id}`);
  if (!r.ok) return mostrarError('pisos-error', r.error); // p. ej. "tiene Access Points"
  notyf.success(t('dispositivos.pisoEliminado', { nombre: piso.nombre }));
  await cargarArbol();
  pintarPisos();
}

$('pisos-lista').addEventListener('click', e => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;
  const fila = boton.closest('.piso-fila');
  if (boton.dataset.accion === 'guardar-piso')   guardarPiso(fila);
  if (boton.dataset.accion === 'eliminar-piso')  eliminarPiso(fila);
});
$('pisos-lista').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('piso-nombre')) {
    e.preventDefault();
    guardarPiso(e.target.closest('.piso-fila'));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  Clics en los botones de cada fila (un solo oyente por tabla)
// ═════════════════════════════════════════════════════════════════════════════
function oyenteDeTabla(buscar, ejecutar) {
  return e => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton) return;
    const id   = Number(boton.closest('tr')?.dataset.id);
    const item = buscar(id);
    if (item) ejecutar(boton.dataset.accion, item);
  };
}
$('cuerpo-camaras').addEventListener('click', oyenteDeTabla(buscarCamara, accionCamara));
$('cuerpo-nvrs').addEventListener('click',    oyenteDeTabla(buscarNvr,    accionNvr));
$('cuerpo-aps').addEventListener('click',     oyenteDeTabla(buscarAp,     accionAp));

// ═════════════════════════════════════════════════════════════════════════════
//  Arranque
// ═════════════════════════════════════════════════════════════════════════════
function mostrarUsuarioActual() {
  const usuario = obtenerUsuario();
  const el = $('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
}

mostrarUsuarioActual();
cargarArbol();

// Al cambiar el idioma, se vuelve a dibujar lo que ya estaba en pantalla
if (typeof registrarRepintado === 'function') {
  registrarRepintado(() => {
    if (!cargado) return;
    repintarTodo();
    if (!$('modal-pisos').hidden) pintarPisos();
  });
}