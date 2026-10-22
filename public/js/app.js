// ── Estado global ────────────────────────────────────────────────────────────
let estadoActual    = {};
let rangoPicker     = null;
let ultimoMonitoreo = null; // fase del motor de monitoreo (ver actualizarAvisoMonitoreo)

// ── Estados visuales de NVRs y cámaras ────────────────────────────────────────
// 'sin_verificar' = el servidor todavía no ha podido chequear ese dispositivo
// (acaba de arrancar, o el equipo no alcanza la red de cámaras). En ese caso
// `activo` llega como null: no cuenta ni como activo ni como caído.
// Colores de estado desde las variables del tema, para que el modal del NVR
// se vea bien tanto en el tema oscuro como en el claro.
const COLOR_ESTADO = { normal: 'var(--green)', degradado: 'var(--yellow)', caido: 'var(--red)', sin_verificar: '#6b7280' };
const esActivo = d => d.activo === true;
const esCaido  = d => d.activo === false;
const colorEstado = d => COLOR_ESTADO[d.estadoVisual] || (d.activo ? COLOR_ESTADO.normal : COLOR_ESTADO.caido);

// ── Inicializar Flatpickr ────────────────────────────────────────────────────
function inicializarRangoPicker() {
  rangoPicker = flatpickr('#filtro-rango', {
    mode:           'range',
    enableTime:     false,
    dateFormat:     'Y-m-d',
    altInput:       true,
    altFormat:      'd/m/Y',
    locale:         obtenerIdioma() === 'es' ? 'es' : 'default',
    firstDayOfWeek: 1,
    allowInput:     false,
    disableMobile:  true,

    // Al abrir: reposicionar si se sale por la derecha
    onOpen(selectedDates, dateStr, instance) {
      requestAnimationFrame(() => {
        const cal    = instance.calendarContainer;
        const rect   = cal.getBoundingClientRect();
        const margen = 12;

        // Si se sale por la derecha, moverlo hacia la izquierda
        if (rect.right > window.innerWidth - margen) {
          const exceso = rect.right - (window.innerWidth - margen);
          const leftActual = parseInt(cal.style.left) || 0;
          cal.style.left = (leftActual - exceso) + 'px';
        }
      });
    },

    // Al cerrar: consultar si el rango está completo (0 o 2 fechas)
    onClose(selectedDates) {
      if (selectedDates.length !== 1) cargarHistorial();
    }
  });
}

// ── Generar opciones de hora (00:00–00:59 … 23:00–23:59) ────────────────────
function generarOpcionesHora() {
  const select = document.getElementById('filtro-hora');
  const pad    = n => String(n).padStart(2, '0');
  for (let h = 0; h < 24; h++) {
    const opt       = document.createElement('option');
    opt.value       = h;
    opt.textContent = `${pad(h)}:00 – ${pad(h)}:59`;
    select.appendChild(opt);
  }
}

// ── Consultar estado de NVRs ─────────────────────────────────────────────────
async function fetchStatus() {
  try {
    const res  = await authFetch('/api/status');
    const data = await res.json();

    if (data.monitoreo) actualizarAvisoMonitoreo(data.monitoreo);

    if (data.inicializando) {
      mostrarInicializando();
      actualizarTimestamp(t('dashboard.iniciandoChequeo'));
      return;
    }

    renderEstado(data);

    if (data.eventosPendientes && data.eventosPendientes.length > 0) {
      mostrarAlertas(data.eventosPendientes);
    }

    actualizarTimestamp();
  } catch (err) {
    console.error('Error al consultar la API:', err);
    actualizarTimestamp(t('dashboard.sinConexionServidor'));
  }
}

// ── Cargar historial con filtros ──────────────────────────────────────────────
// ── Exportar el historial filtrado (Excel o PDF) ──────────────────────────────
async function exportarHistorial(formato) {
  const params = construirParametrosFiltro();
  params.set('formato', formato);

  const btn = document.getElementById('btn-exportar');
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="icon-btn login-spin"></i> ${t('dashboard.generando')}`;
  lucide.createIcons();

  try {
    const res = await authFetch(`/api/historial/exportar?${params}`);
    if (!res.ok) throw new Error('No se pudo generar el archivo.');

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `historial-nvr-${fecha}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al exportar:', err);
    notyf.error(t('dashboard.errorExportar'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
    lucide.createIcons();
    cerrarMenuExportar();
  }
}

function toggleMenuExportar() {
  document.getElementById('menu-exportar').classList.toggle('abierto');
}
function cerrarMenuExportar() {
  document.getElementById('menu-exportar').classList.remove('abierto');
}
document.addEventListener('click', e => {
  const wrapper = document.getElementById('exportar-wrapper');
  if (wrapper && !wrapper.contains(e.target)) cerrarMenuExportar();
});

// ── Construir los parámetros de filtro actuales (reutilizado por historial y exportar) ─
function construirParametrosFiltro() {
  const ip              = document.getElementById('filtro-ip').value.trim();
  const tipo            = document.getElementById('filtro-estado').value;
  const tipoDispositivo = document.getElementById('filtro-tipo').value;
  const hora            = document.getElementById('filtro-hora').value;

  const selectedDates = rangoPicker ? rangoPicker.selectedDates : [];
  const desde = selectedDates[0] ? formatearDesde(selectedDates[0]) : null;
  const hasta  = selectedDates[1] ? formatearHasta(selectedDates[1]) : null;

  const params = new URLSearchParams();
  if (ip)              params.set('ip',              ip);
  if (tipo)            params.set('tipo',            tipo);
  if (tipoDispositivo) params.set('tipoDispositivo', tipoDispositivo);
  if (desde)           params.set('desde',           desde);
  if (hasta)           params.set('hasta',           hasta);
  if (hora !== '')     params.set('hora',            hora);

  return params;
}

async function cargarHistorial() {
  const params = construirParametrosFiltro();

  try {
    const res  = await authFetch(`/api/historial?${params}`);
    const data = await res.json();

    const hayFiltros = [...params.keys()].length > 0;
    const countEl    = document.getElementById('count-historial');
    countEl.textContent = t(hayFiltros ? 'dashboard.resultados' : 'dashboard.eventos', { count: data.total });

    renderFilas(data.eventos || []);
    lucide.createIcons();
  } catch (err) {
    console.error('Error cargando historial:', err);
  }
}

// ── Formatear fechas para el backend ─────────────────────────────────────────
function formatearDesde(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} 00:00:00`;
}

function formatearHasta(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} 23:59:59`;
}

// ── Limpiar filtros ───────────────────────────────────────────────────────────
function limpiarFiltros() {
  document.getElementById('filtro-ip').value     = '';
  document.getElementById('filtro-estado').value = '';
  document.getElementById('filtro-tipo').value   = '';
  document.getElementById('filtro-hora').value   = '';
  if (rangoPicker) rangoPicker.clear();
  cargarHistorial();
}

// ── Timestamp del header ──────────────────────────────────────────────────────
function actualizarTimestamp(msg = null) {
  const el = document.getElementById('ultima-actualizacion');
  const fecha = new Date().toLocaleString(obtenerIdioma() === 'en' ? 'en-US' : 'es-CO');
  el.textContent = msg || t('dashboard.ultimaActualizacion', { fecha });
}

// ── Renderizar estado completo ────────────────────────────────────────────────
function renderEstado(data) {
  estadoActual = data;
  // Si se llegó desde la búsqueda global, ir al dispositivo después de pintar
  if (destinoPendiente) setTimeout(ejecutarDestinoPendiente, 0);
  const secciones = ['fisica', 'paciente', 'cx', 'ucis'];
  let totalActivos = 0, totalCaidos = 0, totalCamCaidas = 0, totalDisp = 0;

  secciones.forEach(sec => {
    const lista = data[sec];
    if (!lista) return;
    totalActivos   += lista.filter(esActivo).length;
    totalCaidos    += lista.filter(esCaido).length;
    totalDisp      += lista.length;
    lista.forEach(nvr => {
      if (nvr.camaras) totalCamCaidas += nvr.camaras.filter(esCaido).length;
    });
    renderGrid(sec, lista);
    const countEl = document.getElementById(`count-${sec}`);
    if (countEl) countEl.textContent = `${lista.filter(esActivo).length} / ${lista.length}`;
  });

  document.getElementById('stat-activos').textContent    = totalActivos;
  document.getElementById('stat-nvr-caidos').textContent = totalCaidos;
  document.getElementById('stat-cam-caidas').textContent = totalCamCaidas;
  document.getElementById('stat-total').textContent      = totalDisp;

  actualizarBannerIncidente(totalCaidos, totalCamCaidas);
  lucide.createIcons();
}

// ── Barra de incidente masivo ──────────────────────────────────────────────────
// A diferencia de los toasts (pensados para avisar de 1-2 caídas puntuales),
// esta barra refleja el estado ACTUAL del monitoreo: aparece mientras la
// cantidad de caídas supere el umbral, y desaparece sola cuando se normaliza.
// Pensada para verse desde lejos en la TV, sin depender de alcanzar a leer
// una notificación que ya se cerró.
const UMBRAL_INCIDENTE = 15; // Total de NVRs + cámaras caídas para considerarlo un incidente masivo

// Últimos totales calculados: se guardan para poder volver a evaluar la barra
// al instante cuando alguien cambia la preferencia "Notificaciones en pantalla"
// (ver el oyente "storage" al final), sin esperar al siguiente chequeo.
let totalesIncidente = { nvrs: 0, camaras: 0 };

function actualizarBannerIncidente(nvrCaidos, camCaidas) {
  totalesIncidente = { nvrs: nvrCaidos, camaras: camCaidas };
  const banner = document.getElementById('incidente-banner');
  if (!banner) return;

  const totalProblemas = nvrCaidos + camCaidas;

  // Preferencia "Notificaciones en pantalla" (Mi Perfil): si está apagada, la
  // barra no se muestra, igual que los recuadros de aviso. El estado real
  // (tarjetas, contadores, historial) sigue actualizándose siempre.
  if (!notificacionesActivas() || totalProblemas < UMBRAL_INCIDENTE) {
    banner.hidden = true;
    return;
  }

  banner.hidden = false;
  banner.innerHTML = `
    <span class="incidente-dot"></span>
    <i data-lucide="alert-triangle" class="incidente-icono"></i>
    <div class="incidente-texto">
      <strong>${t('dashboard.incidenteTitulo')}</strong>
      <span>${t('dashboard.incidenteDetalle', { nvrs: nvrCaidos, camaras: camCaidas })}</span>
    </div>`;
  lucide.createIcons();
}

// ── Aviso del estado del monitoreo ────────────────────────────────────────────
// Le dice al operador si lo que ve en las tarjetas es actual o no: mientras
// corre el primer chequeo, cuando el equipo de monitoreo no alcanza la red de
// dispositivos (se muestra el último estado conocido) o cuando el monitoreo
// está apagado en ese equipo. Con el monitoreo funcionando normal, no se ve.
// No depende de la preferencia "Notificaciones en pantalla": no es una alerta,
// es información sobre la validez de los datos.
function actualizarAvisoMonitoreo(monitoreo) {
  if (monitoreo) ultimoMonitoreo = monitoreo;
  const aviso = document.getElementById('monitoreo-aviso');
  if (!aviso || !ultimoMonitoreo) return;

  const { fase, ultimoChequeoCompleto } = ultimoMonitoreo;
  const fecha = ultimoChequeoCompleto
    ? new Date(ultimoChequeoCompleto).toLocaleString(obtenerIdioma() === 'en' ? 'en-US' : 'es-CO')
    : null;

  const config = {
    iniciando: {
      variante: 'info', icono: 'loader', girar: true,
      titulo:  t('dashboard.monitoreoIniciandoTitulo'),
      detalle: t('dashboard.monitoreoIniciandoDetalle')
    },
    sin_conectividad: {
      variante: 'alerta', icono: 'wifi-off',
      titulo:  t('dashboard.monitoreoSinConexionTitulo'),
      detalle: fecha
        ? t('dashboard.monitoreoSinConexionDetalle', { fecha })
        : t('dashboard.monitoreoSinConexionNunca')
    },
    desactivado: {
      variante: 'neutro', icono: 'pause-circle',
      titulo:  t('dashboard.monitoreoDesactivadoTitulo'),
      detalle: t('dashboard.monitoreoDesactivadoDetalle')
    }
  }[fase];

  if (!config) {
    aviso.hidden = true;
    return;
  }

  aviso.className = `monitoreo-aviso ${config.variante}`;
  aviso.innerHTML = `
    <i data-lucide="${config.icono}" class="monitoreo-aviso-icono${config.girar ? ' login-spin' : ''}"></i>
    <div class="monitoreo-aviso-texto">
      <strong></strong>
      <span></span>
    </div>`;
  aviso.querySelector('strong').textContent = config.titulo;
  aviso.querySelector('span').textContent   = config.detalle;
  aviso.hidden = false;
  lucide.createIcons();
}

// ── Grilla NVR ────────────────────────────────────────────────────────────────
function renderGrid(seccionId, lista) {
  const grid = document.getElementById(`grid-${seccionId}`);
  if (!grid) return;
  grid.innerHTML = lista.map(nvr => {
    const camarasCaidas = nvr.camaras ? nvr.camaras.filter(esCaido).length : 0;
    const colorDot = { normal: 'verde', degradado: 'amarillo', caido: 'rojo', sin_verificar: 'gris' }[nvr.estadoVisual] || 'verde';
    return `
    <div class="nvr-card ${nvr.estadoVisual || 'normal'}${estaResaltado(nvr.id) ? ' resaltado-busqueda' : ''}"
         data-ip="${nvr.ip}" data-seccion="${seccionId}" data-id="${nvr.id}"
         ${nvr.estadoVisual === 'sin_verificar' ? `title="${t('dashboard.sinVerificarTitle')}"` : ''}>
      <div class="dot-row">
        <div class="dot ${colorDot}"></div>
        ${nvr.inestable ? `<i data-lucide="activity" class="inestable-icono" title="${t('dashboard.inestableTitle')}"></i>` : ''}
        ${camarasCaidas > 0 ? `<span class="cam-caida-dot" title="${t('dashboard.camarasCaidasEnNVR', { n: camarasCaidas })}">${camarasCaidas}</span>` : ''}
      </div>
      ${nvr.numCaidas > 0 ? `<span class="caidas-badge">${nvr.numCaidas}x</span>` : ''}
      <div class="nvr-nombre">${nvr.nombre}</div>
      <div class="nvr-ip">${nvr.ip}</div>
    </div>
  `;
  }).join('');
  lucide.createIcons();
}

// ── Click en tarjeta → modal ──────────────────────────────────────────────────
document.addEventListener('click', e => {
  const card = e.target.closest('.nvr-card');
  if (!card) return;
  const nvr = estadoActual[card.dataset.seccion]?.find(n => n.ip === card.dataset.ip);
  if (nvr) abrirModalNVR(nvr);
});

// ── Ir a un dispositivo (búsqueda global del header) ─────────────────────────
// js/busqueda.js llama a esta función cuando se elige un resultado estando en
// el dashboard. Desde otra página, la búsqueda llega con la orden en el enlace
// (#ir-nvr-12 o #ir-camara-345-nvr-12) y se ejecuta apenas hay datos.
//   NVR    → baja hasta su tarjeta y la resalta
//   Cámara → abre el detalle de su NVR con la cámara resaltada
let destinoPendiente = null;

// El resaltado se guarda aparte porque la grilla se vuelve a pintar con cada
// chequeo (y al conectar el socket): así no se pierde si llega un repintado
// mientras dura.
const DURACION_RESALTADO_MS = 2600;
let resaltado = null; // { id, hasta }
const estaResaltado = id => resaltado && resaltado.id === id && Date.now() < resaltado.hasta;

function buscarNVRPorId(id) {
  for (const sec of ['fisica', 'paciente', 'cx', 'ucis']) {
    const nvr = (estadoActual[sec] || []).find(n => n.id === id);
    if (nvr) return { nvr, seccion: sec };
  }
  return null;
}

window.irADispositivo = function irADispositivo(destino) {
  const encontrado = buscarNVRPorId(destino.id);
  if (!encontrado) {
    // Todavía no llegan los datos del servidor: se ejecuta al recibirlos
    if (!Object.keys(estadoActual).length) { destinoPendiente = destino; return; }
    notyf.error(t('busqueda.noEnDashboard'));
    return;
  }

  const card = document.querySelector(`.nvr-card[data-id="${destino.id}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    resaltado = { id: destino.id, hasta: Date.now() + DURACION_RESALTADO_MS };
    card.classList.add('resaltado-busqueda');
    setTimeout(() => {
      if (resaltado && Date.now() < resaltado.hasta) return; // se buscó otro mientras tanto
      resaltado = null;
      document.querySelectorAll('.nvr-card.resaltado-busqueda').forEach(el => el.classList.remove('resaltado-busqueda'));
    }, DURACION_RESALTADO_MS);
  }
  if (destino.camaraId) setTimeout(() => abrirModalNVR(encontrado.nvr, destino.camaraId), card ? 350 : 0);
};

function ejecutarDestinoPendiente() {
  if (!destinoPendiente) return;
  const destino = destinoPendiente;
  destinoPendiente = null;
  window.irADispositivo(destino);
}

// Orden que viene en el enlace desde otra página
(function leerDestinoDelEnlace() {
  const coincide = /^#ir-(?:camara-(\d+)-)?nvr-(\d+)$/.exec(location.hash);
  if (!coincide) return;
  destinoPendiente = { id: Number(coincide[2]), camaraId: coincide[1] ? Number(coincide[1]) : null };
  history.replaceState(null, '', location.pathname + location.search); // que no se repita al recargar
})();

// ── Modal NVR ─────────────────────────────────────────────────────────────────
// camaraResaltada (opcional): id de una cámara a resaltar, cuando se llega
// desde la búsqueda global.
function abrirModalNVR(nvr, camaraResaltada = null) {
  const numCam = nvr.camaras ? nvr.camaras.length : 0;
  const camarasCaidas = nvr.camaras ? nvr.camaras.filter(esCaido).length : 0;
  // Solo forzamos una altura fija (con scroll interno) cuando hay muchas cámaras;
  // si hay pocas, el modal se ajusta a su contenido sin dejar espacio vacío.
  const alturaModal = numCam > 16 ? 'height:82vh' : 'max-height:82vh';

  const etiquetaCamara = { normal: t('dashboard.camaraActiva'), degradado: t('dashboard.camaraDegradada'), caido: t('dashboard.camaraCaida'), sin_verificar: t('dashboard.camaraSinVerificar') };
  const camarasHTML = numCam > 0
    ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;
        align-content:start;flex:1;min-height:0;overflow-y:auto;padding-right:4px">
        ${nvr.camaras.map(cam => `
          <div data-cam-id="${cam.id}" style="background:var(--bg);border:1px solid ${cam.id === camaraResaltada ? 'var(--amber)' : 'var(--border)'};border-radius:6px;padding:0.5rem;
            ${cam.id === camaraResaltada ? 'box-shadow:0 0 0 1px var(--amber),0 0 14px rgba(212,160,23,0.35);' : ''}
            display:flex;flex-direction:column;gap:0.3rem;align-items:center;text-align:center">
            <span style="color:var(--text);font-size:0.72rem;font-weight:600;white-space:nowrap;
              overflow:hidden;text-overflow:ellipsis;max-width:100%">${cam.nombre}</span>
            <span onclick="window.open('http://${cam.ip}','_blank')"
              style="font-family:monospace;font-size:0.66rem;cursor:pointer;
              color:var(--amber);text-decoration:underline;text-underline-offset:2px">
              ${cam.ip}
            </span>
            <span style="font-size:0.68rem;color:${colorEstado(cam)}">
              ● ${etiquetaCamara[cam.estadoVisual] || (cam.activo ? etiquetaCamara.normal : etiquetaCamara.caido)}
            </span>
          </div>`).join('')}
      </div>`
    : `<p style="color:var(--text-dim);font-size:0.78rem;margin-top:0.5rem;line-height:1.6">
         ${t('dashboard.sinCamaras')}<br>
         <small>${t('dashboard.agregalasEn')} <code style="background:var(--bg);padding:0.1rem 0.3rem;border-radius:3px">BACKEND/config/dispositivos.js</code></small>
       </p>`;

  Swal.fire({
    background: 'var(--surface)', color: 'var(--text)',
    showConfirmButton: false, showCloseButton: true, width: 640,
    padding: 0,
    didOpen: () => {
      lucide.createIcons();
      // Llegando desde la búsqueda: la cámara elegida queda a la vista
      if (camaraResaltada) {
        document.querySelector(`.swal2-html-container [data-cam-id="${camaraResaltada}"]`)
          ?.scrollIntoView({ block: 'center' });
      }
      // Evita que SweetAlert2 haga scroll de todo el contenido:
      // el scroll queda encerrado únicamente en la cuadrícula de cámaras.
      const htmlContainer = document.querySelector('.swal2-html-container');
      if (htmlContainer) {
        htmlContainer.style.overflow = 'hidden';
        htmlContainer.style.margin = '0';
        htmlContainer.style.maxHeight = '82vh';
        htmlContainer.style.display = 'flex';
      }
    },
    html: `
      <div style="text-align:left;font-family:'Segoe UI',sans-serif;display:flex;
        flex-direction:column;${alturaModal};width:100%;padding:1.25rem;box-sizing:border-box">
        <div style="flex-shrink:0">
          <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.75rem">
            <span style="width:10px;height:10px;border-radius:50%;flex-shrink:0;
              background:${colorEstado(nvr)};
              box-shadow:${nvr.estadoVisual === 'sin_verificar' ? 'none' : `0 0 6px ${colorEstado(nvr)}`}"></span>
            <strong style="color:var(--amber);font-size:1rem">${nvr.nombre}</strong>
            <span style="color:var(--text-dim);font-size:0.78rem">(${{normal:t('dashboard.modalActivo'),degradado:t('dashboard.modalDegradado'),caido:t('dashboard.modalCaido'),sin_verificar:t('dashboard.modalSinVerificar')}[nvr.estadoVisual] || (nvr.activo ? t('dashboard.modalActivo') : t('dashboard.modalCaido'))})</span>
            ${nvr.inestable ? `<span style="color:var(--yellow);font-size:0.7rem;border:1px solid var(--yellow-dim);padding:0.1rem 0.4rem;border-radius:4px">⚡ ${t('dashboard.modalInestable')}</span>` : ''}
          </div>
          <p style="color:var(--text-dim);font-size:0.78rem;margin-bottom:1rem">
            ${t('perfil.thIP')}: <code style="background:var(--bg);padding:0.1rem 0.4rem;border-radius:3px">${nvr.ip}</code>
            &nbsp;·&nbsp; ${t('dashboard.modalCaidasSesion')} <strong style="color:var(--orange)">${nvr.numCaidas || 0}</strong>
            &nbsp;·&nbsp; ${t('dashboard.modalCamarasCaidas')} <strong style="color:${camarasCaidas > 0 ? 'var(--red)' : 'var(--green)'}">${t('dashboard.modalCamarasCaidasTexto', { caidas: camarasCaidas, total: numCam })}</strong>
          </p>
          <div style="margin-bottom:1rem">
            <button onclick="window.open('http://${nvr.ip}','_blank')"
              style="width:100%;padding:0.55rem;background:var(--surface2);border:1px solid var(--border);
              color:var(--text);border-radius:6px;cursor:pointer;font-size:0.8rem;display:flex;
              align-items:center;justify-content:center;gap:6px"
              onmouseover="this.style.borderColor='var(--amber)'"
              onmouseout="this.style.borderColor='var(--border)'">
              <i data-lucide="external-link" style="width:14px;height:14px"></i>
              ${t('dashboard.abrirNVR')}
            </button>
          </div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:0.75rem;display:flex;
          flex-direction:column;flex:1;min-height:0">
          <p style="color:var(--amber);font-size:0.78rem;margin-bottom:0.5rem;font-weight:600;
            display:flex;align-items:center;gap:5px;flex-shrink:0">
            <i data-lucide="camera" style="width:14px;height:14px"></i>
            ${t('dashboard.camarasRegistradas', { n: numCam })}
          </p>
          ${camarasHTML}
        </div>
      </div>`
  });
}

// ── Notificaciones toast (caídas / recuperaciones) ────────────────────────────
// Notyf en vez de SweetAlert2 para estos avisos: aparecen apiladas en una
// esquina, no bloquean la pantalla esperando que el operador las cierre, y la
// animación de entrada es casi instantánea. El modal de detalle del NVR sigue
// usando SweetAlert2, porque ahí sí tiene sentido un diálogo que se detenga.
//
// El ícono usa Lucide (icon: false + <i data-lucide> dentro del mensaje),
// los mismos íconos que ya aparecen en las tarjetas de estadísticas arriba,
// para que se vea consistente con el resto del dashboard en vez de un emoji.
const ICONOS_TOAST = {
  nvrCaida:         'wifi-off',
  nvrRecuperado:    'wifi',
  camaraCaida:      'video-off',
  camaraRecuperada: 'video'
};

const notyf = new Notyf({
  ripple:      false,
  dismissible: true,
  position:    { x: 'right', y: 'top' },
  types: [
    { type: 'nvrCaida',         className: 'toast-nvr-caida',         background: 'var(--surface2)', duration: 7000, icon: false },
    { type: 'nvrRecuperado',    className: 'toast-nvr-recuperado',    background: 'var(--surface2)', duration: 5000, icon: false },
    { type: 'camaraCaida',      className: 'toast-camara-caida',      background: 'var(--surface2)', duration: 7000, icon: false },
    { type: 'camaraRecuperada', className: 'toast-camara-recuperada', background: 'var(--surface2)', duration: 5000, icon: false },
    { type: 'error',            className: 'toast-error',             background: 'var(--surface2)', duration: 5000, icon: false }
  ]
});

// Máximo de toasts visibles al mismo tiempo: si llegan más, se van descartando
// los más viejos para dar espacio a los nuevos, en vez de inundar la pantalla.
const MAX_TOASTS_VISIBLES = 4;
let toastsActivos = [];

function agregarToastActivo(toast) {
  while (toastsActivos.length >= MAX_TOASTS_VISIBLES) {
    notyf.dismiss(toastsActivos.shift());
  }
  toastsActivos.push(toast);
  toast.on('dismiss', () => {
    toastsActivos = toastsActivos.filter(t => t !== toast);
  });
  lucide.createIcons(); // Convierte el <i data-lucide> recién insertado en SVG
}

// ── Buffer de eventos en tiempo real ──────────────────────────────────────────
// El backend emite cada caída/recuperación como un mensaje de socket
// individual. Si se caen 60 dispositivos en el mismo chequeo, llegarían 60
// mensajes casi simultáneos. Se agrupan los que lleguen en una ventana corta
// para que, igual que al recargar la página, se muestren como un resumen.
const VENTANA_AGRUPACION_MS = 400;
let bufferEventosSocket = [];
let timerBufferEventos  = null;

function encolarEvento(evento) {
  bufferEventosSocket.push(evento);
  if (timerBufferEventos) clearTimeout(timerBufferEventos);
  timerBufferEventos = setTimeout(() => {
    mostrarAlertas(bufferEventosSocket);
    cargarHistorial();
    bufferEventosSocket = [];
  }, VENTANA_AGRUPACION_MS);
}

// ── Mostrar una tanda de eventos ───────────────────────────────────────────────
// Si son pocos, uno por uno con un pequeño efecto cascada. Si llega una ráfaga
// grande (una caída masiva de red, por ejemplo), se agrupan en un resumen para
// no saturar la pantalla con decenas de recuadros.
const LIMITE_ANTES_DE_RESUMIR = 5;

function mostrarAlertas(eventos) {
  // Preferencia "Notificaciones en pantalla" (Mi Perfil): solo apaga estos
  // toasts de alerta de caída/recuperación. No afecta el estado en vivo de
  // las tarjetas ni los toasts de confirmación de acciones del usuario.
  if (!notificacionesActivas()) return;
  if (eventos.length > LIMITE_ANTES_DE_RESUMIR) {
    mostrarResumenAlertas(eventos);
    return;
  }
  eventos.forEach((ev, i) => {
    setTimeout(() => mostrarAlertaToast(ev), i * 150);
  });
}

function mostrarAlertaToast(ev) {
  const esNVR   = ev.tipoDispositivo === 'nvr';
  const esCaida = ev.tipo === 'caida';

  const tipo = esNVR
    ? (esCaida ? 'nvrCaida'    : 'nvrRecuperado')
    : (esCaida ? 'camaraCaida' : 'camaraRecuperada');

  const titulo = esNVR
    ? (esCaida ? t('dashboard.nvrCaidoTitulo')    : t('dashboard.nvrRecuperadoTitulo'))
    : (esCaida ? t('dashboard.camaraCaidaTitulo') : t('dashboard.camaraRecuperadaTitulo'));

  const detalleNVR = (!esNVR && ev.nvrNombre) ? ` · NVR: ${ev.nvrNombre}` : '';

  const toast = notyf.open({
    type:    tipo,
    message: `
      <div class="toast-contenido">
        <i data-lucide="${ICONOS_TOAST[tipo]}" class="toast-icono"></i>
        <div class="toast-texto">
          <b title="${ev.nombre}">${titulo} — ${ev.nombre}</b>
          <small title="${ev.ip}${detalleNVR}">${ev.ip}${detalleNVR}</small>
        </div>
      </div>`
  });
  agregarToastActivo(toast);
}

// ── Resumen agrupado para ráfagas grandes de eventos ──────────────────────────
function mostrarResumenAlertas(eventos) {
  const contar = (tipo, tipoDispositivo) =>
    eventos.filter(e => e.tipo === tipo && e.tipoDispositivo === tipoDispositivo).length;

  const grupos = [
    { tipo: 'nvrCaida',         cantidad: contar('caida', 'nvr'),         texto: t('dashboard.grupoNvrCaidos') },
    { tipo: 'camaraCaida',      cantidad: contar('caida', 'camara'),      texto: t('dashboard.grupoCamarasCaidas') },
    { tipo: 'nvrRecuperado',    cantidad: contar('recuperacion', 'nvr'),  texto: t('dashboard.grupoNvrRecuperados') },
    { tipo: 'camaraRecuperada', cantidad: contar('recuperacion', 'camara'), texto: t('dashboard.grupoCamarasRecuperadas') }
  ];

  grupos.filter(g => g.cantidad > 0).forEach((g, i) => {
    setTimeout(() => {
      const toast = notyf.open({
        type:    g.tipo,
        message: `
          <div class="toast-contenido">
            <i data-lucide="${ICONOS_TOAST[g.tipo]}" class="toast-icono"></i>
            <div class="toast-texto">
              <b>${g.cantidad} ${g.texto}</b>
              <small>${t('dashboard.revisaTarjetas')}</small>
            </div>
          </div>`
      });
      agregarToastActivo(toast);
    }, i * 150);
  });
}

// ── Filas del historial ───────────────────────────────────────────────────────
function renderFilas(eventos) {
  const tbody = document.getElementById('historial-body');
  if (!eventos.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">${t('dashboard.sinResultados')}</td></tr>`;
    return;
  }
  tbody.innerHTML = eventos.map(ev => {
    const fecha   = new Date(ev.fecha).toLocaleString(obtenerIdioma() === 'en' ? 'en-US' : 'es-CO');
    const esCaida = ev.tipo === 'caida';
    return `
      <tr class="${esCaida ? 'fila-caida' : 'fila-recuperacion'}">
        <td>${fecha}</td>
        <td>${ev.nombre}</td>
        <td style="font-family:monospace;font-size:0.72rem">${ev.ip}</td>
        <td style="color:var(--text-dim)">${ev.tipo_dispositivo === 'camara' ? (ev.nvr_nombre || '—') : '—'}</td>
        <td>${ev.tipo_dispositivo === 'nvr'
          ? `<span class="badge badge-nvr">${t('badge.nvr')}</span>`
          : `<span class="badge badge-camara">${t('badge.camara')}</span>`}</td>
        <td>${esCaida
          ? `<span class="badge badge-caida">${t('badge.caida')}</span>`
          : `<span class="badge badge-recuperacion">${t('badge.recuperado')}</span>`}</td>
      </tr>`;
  }).join('');
}

// ── Carga inicial ─────────────────────────────────────────────────────────────
function mostrarInicializando() {
  ['fisica', 'paciente', 'cx', 'ucis'].forEach(sec => {
    const grid = document.getElementById(`grid-${sec}`);
    if (grid) grid.innerHTML = `<div class="init-msg">${t('dashboard.ejecutandoChequeo')}</div>`;
  });
}

// ── Arranque ──────────────────────────────────────────────────────────────────
mostrarUsuarioActual();
inicializarRangoPicker();
generarOpcionesHora();
fetchStatus();      // Primer pintado, mientras se conecta el socket
cargarHistorial();
conectarSocket();

if (typeof registrarRepintado === 'function') {
  registrarRepintado(() => {
    if (Object.keys(estadoActual).length) renderEstado(estadoActual);
    actualizarAvisoMonitoreo();
    cargarHistorial();
  });
}

// ── Preferencia "Notificaciones en pantalla" cambiada desde OTRA pestaña ──────
// Si Mi Perfil está abierto en otra pestaña (o este dashboard en otra ventana
// del mismo navegador) y ahí se enciende o apaga el interruptor, esta pantalla
// obedece al instante: al apagar, cierra los recuadros que estuvieran a la vista
// y oculta la barra; al encender, la barra vuelve si el incidente sigue en curso.
// El navegador dispara "storage" solo en las DEMÁS pestañas del mismo sitio,
// así que no hay riesgo de bucles.
window.addEventListener('storage', e => {
  if (e.key !== null && e.key !== 'nvr_notificaciones') return;
  if (!notificacionesActivas()) {
    notyf.dismissAll();
    toastsActivos = [];
  }
  actualizarBannerIncidente(totalesIncidente.nvrs, totalesIncidente.camaras);
});

// ── Mostrar el usuario logueado en el header ──────────────────────────────────
function mostrarUsuarioActual() {
  const usuario = obtenerUsuario();
  const el = document.getElementById('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
}

// ── Ocultar Exportar si el usuario no tiene el permiso ────────────────────────
// El backend ya lo rechaza (403) de todas formas — esto es solo para que la
// interfaz no muestre un botón que de todos modos va a fallar.
if (!tienePermiso('exportar_reportes')) {
  document.getElementById('exportar-wrapper')?.remove();
}

// ── Tiempo real vía Socket.IO ──────────────────────────────────────────────────
// Reemplaza el polling: el backend empuja el estado y los eventos apenas los
// detecta, así que las tarjetas y el historial se actualizan solos, sin
// esperar al siguiente sondeo ni tener que refrescar la página.
function conectarSocket() {
  const socket = io({ auth: { token: obtenerToken() } });

  socket.on('connect', () => {
    actualizarTimestamp();
    // Por si se perdió algún evento mientras estuvo desconectado (ej. se cayó
    // la red un momento): traer el estado y el historial reales de una vez,
    // en vez de confiar solo en lo próximo que llegue por socket.
    fetchStatus();
    cargarHistorial();
  });

  // Estado completo de NVRs/cámaras: llega al conectar y cada vez que cambia algo
  socket.on('estado', data => {
    renderEstado(data);
    actualizarTimestamp();
  });

  // Situación del motor de monitoreo (iniciando, activo, sin conectividad,
  // desactivado): llega al conectar y cada vez que cambia.
  socket.on('monitoreo', monitoreo => {
    actualizarAvisoMonitoreo(monitoreo);
  });

  // Una caída o recuperación puntual: se agrupan por si llegan varias casi
  // al mismo tiempo (ver encolarEvento), y se refresca el historial.
  socket.on('evento', evento => {
    encolarEvento(evento);
  });

  socket.on('disconnect', () => {
    actualizarTimestamp(t('dashboard.sinConexionReconectando'));
  });

  socket.on('connect_error', err => {
    console.error('Error de conexión en tiempo real:', err.message);
    // Si el servidor rechaza el token (sesión expirada/reiniciada), cerrar sesión
    if (err.message === 'No autenticado' || err.message.includes('inválida')) {
      cerrarSesion();
    }
  });
}