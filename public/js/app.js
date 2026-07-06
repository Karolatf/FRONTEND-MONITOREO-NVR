// ── Estado global ────────────────────────────────────────────────────────────
let estadoActual = {};
let rangoPicker  = null;
const INTERVALO_POLL = 15000;

// ── Inicializar Flatpickr ────────────────────────────────────────────────────
function inicializarRangoPicker() {
  rangoPicker = flatpickr('#filtro-rango', {
    mode:           'range',
    enableTime:     false,
    dateFormat:     'Y-m-d',
    altInput:       true,
    altFormat:      'd/m/Y',
    locale:         'es',
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
    const res  = await fetch('/api/status');
    const data = await res.json();

    if (data.inicializando) {
      mostrarInicializando();
      actualizarTimestamp('Iniciando primer chequeo...');
      return;
    }

    renderEstado(data);

    if (data.eventosPendientes && data.eventosPendientes.length > 0) {
      mostrarAlertas(data.eventosPendientes);
    }

    actualizarTimestamp();
  } catch (err) {
    console.error('Error al consultar la API:', err);
    actualizarTimestamp('Sin conexion con el servidor');
  }
}

// ── Cargar historial con filtros ──────────────────────────────────────────────
async function cargarHistorial() {
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

  try {
    const res  = await fetch(`/api/historial?${params}`);
    const data = await res.json();

    const hayFiltros = ip || tipo || tipoDispositivo || desde || hasta || hora !== '';
    const countEl    = document.getElementById('count-historial');
    countEl.textContent = hayFiltros
      ? `${data.total} resultado${data.total !== 1 ? 's' : ''}`
      : `${data.total} evento${data.total !== 1 ? 's' : ''}`;

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
  el.textContent = msg || `Última actualización: ${new Date().toLocaleString('es-CO')}`;
}

// ── Renderizar estado completo ────────────────────────────────────────────────
function renderEstado(data) {
  estadoActual = data;
  const secciones = ['fisica', 'paciente', 'cx', 'ucis'];
  let totalActivos = 0, totalCaidos = 0, totalCamCaidas = 0, totalDisp = 0;

  secciones.forEach(sec => {
    const lista = data[sec];
    if (!lista) return;
    totalActivos   += lista.filter(n => n.activo).length;
    totalCaidos    += lista.filter(n => !n.activo).length;
    totalDisp      += lista.length;
    lista.forEach(nvr => {
      if (nvr.camaras) totalCamCaidas += nvr.camaras.filter(c => !c.activo).length;
    });
    renderGrid(sec, lista);
    const countEl = document.getElementById(`count-${sec}`);
    if (countEl) countEl.textContent = `${lista.filter(n => n.activo).length} / ${lista.length}`;
  });

  document.getElementById('stat-activos').textContent    = totalActivos;
  document.getElementById('stat-nvr-caidos').textContent = totalCaidos;
  document.getElementById('stat-cam-caidas').textContent = totalCamCaidas;
  document.getElementById('stat-total').textContent      = totalDisp;

  lucide.createIcons();
}

// ── Grilla NVR ────────────────────────────────────────────────────────────────
function renderGrid(seccionId, lista) {
  const grid = document.getElementById(`grid-${seccionId}`);
  if (!grid) return;
  grid.innerHTML = lista.map(nvr => {
    const camarasCaidas = nvr.camaras ? nvr.camaras.filter(c => !c.activo).length : 0;
    return `
    <div class="nvr-card ${nvr.activo ? 'activo' : 'caido'}"
         data-ip="${nvr.ip}" data-seccion="${seccionId}">
      <div class="dot-row">
        <div class="dot ${nvr.activo ? 'verde' : 'rojo'}"></div>
        ${camarasCaidas > 0 ? `<span class="cam-caida-dot" title="${camarasCaidas} cámara(s) caída(s) en este NVR">${camarasCaidas}</span>` : ''}
      </div>
      ${nvr.numCaidas > 0 ? `<span class="caidas-badge">${nvr.numCaidas}x</span>` : ''}
      <div class="nvr-nombre">${nvr.nombre}</div>
      <div class="nvr-ip">${nvr.ip}</div>
    </div>
  `;
  }).join('');
}

// ── Click en tarjeta → modal ──────────────────────────────────────────────────
document.addEventListener('click', e => {
  const card = e.target.closest('.nvr-card');
  if (!card) return;
  const nvr = estadoActual[card.dataset.seccion]?.find(n => n.ip === card.dataset.ip);
  if (nvr) abrirModalNVR(nvr);
});

// ── Modal NVR ─────────────────────────────────────────────────────────────────
function abrirModalNVR(nvr) {
  const numCam = nvr.camaras ? nvr.camaras.length : 0;
  const camarasCaidas = nvr.camaras ? nvr.camaras.filter(c => !c.activo).length : 0;
  // Solo forzamos una altura fija (con scroll interno) cuando hay muchas cámaras;
  // si hay pocas, el modal se ajusta a su contenido sin dejar espacio vacío.
  const alturaModal = numCam > 16 ? 'height:82vh' : 'max-height:82vh';

  const camarasHTML = numCam > 0
    ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;
        align-content:start;flex:1;min-height:0;overflow-y:auto;padding-right:4px">
        ${nvr.camaras.map(cam => `
          <div style="background:#111;border:1px solid #2e2e2e;border-radius:6px;padding:0.5rem;
            display:flex;flex-direction:column;gap:0.3rem;align-items:center;text-align:center">
            <span style="color:#e5e7eb;font-size:0.72rem;font-weight:600;white-space:nowrap;
              overflow:hidden;text-overflow:ellipsis;max-width:100%">${cam.nombre}</span>
            <span onclick="window.open('http://${cam.ip}','_blank')"
              style="font-family:monospace;font-size:0.66rem;cursor:pointer;
              color:#d4a017;text-decoration:underline;text-underline-offset:2px">
              ${cam.ip}
            </span>
            <span style="font-size:0.68rem;color:${cam.activo ? '#22c55e' : '#ef4444'}">
              ${cam.activo ? '● Activa' : '● Caída'}
            </span>
          </div>`).join('')}
      </div>`
    : `<p style="color:#9ca3af;font-size:0.78rem;margin-top:0.5rem;line-height:1.6">
         Sin cámaras registradas para este NVR.<br>
         <small>Agrégalas en <code style="background:#111;padding:0.1rem 0.3rem;border-radius:3px">BACKEND/config/dispositivos.js</code></small>
       </p>`;

  Swal.fire({
    background: '#1a1a1a', color: '#e5e7eb',
    showConfirmButton: false, showCloseButton: true, width: 640,
    padding: 0,
    didOpen: () => {
      lucide.createIcons();
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
              background:${nvr.activo ? '#22c55e' : '#ef4444'};
              box-shadow:0 0 6px ${nvr.activo ? '#22c55e' : '#ef4444'}"></span>
            <strong style="color:#d4a017;font-size:1rem">${nvr.nombre}</strong>
            <span style="color:#9ca3af;font-size:0.78rem">(${nvr.activo ? 'Activo' : 'Caído'})</span>
          </div>
          <p style="color:#9ca3af;font-size:0.78rem;margin-bottom:1rem">
            IP: <code style="background:#111;padding:0.1rem 0.4rem;border-radius:3px">${nvr.ip}</code>
            &nbsp;·&nbsp; Caídas esta sesión (NVR): <strong style="color:#f97316">${nvr.numCaidas || 0}</strong>
            &nbsp;·&nbsp; Cámaras caídas: <strong style="color:${camarasCaidas > 0 ? '#ef4444' : '#22c55e'}">${camarasCaidas} de ${numCam}</strong>
          </p>
          <div style="margin-bottom:1rem">
            <button onclick="window.open('http://${nvr.ip}','_blank')"
              style="width:100%;padding:0.55rem;background:#2a2a2a;border:1px solid #3d3d3d;
              color:#e5e7eb;border-radius:6px;cursor:pointer;font-size:0.8rem;display:flex;
              align-items:center;justify-content:center;gap:6px"
              onmouseover="this.style.borderColor='#d4a017'"
              onmouseout="this.style.borderColor='#3d3d3d'">
              <i data-lucide="external-link" style="width:14px;height:14px"></i>
              Abrir NVR en nueva pestaña
            </button>
          </div>
        </div>
        <div style="border-top:1px solid #2e2e2e;padding-top:0.75rem;display:flex;
          flex-direction:column;flex:1;min-height:0">
          <p style="color:#d4a017;font-size:0.78rem;margin-bottom:0.5rem;font-weight:600;
            display:flex;align-items:center;gap:5px;flex-shrink:0">
            <i data-lucide="camera" style="width:14px;height:14px"></i>
            Cámaras registradas (${numCam})
          </p>
          ${camarasHTML}
        </div>
      </div>`
  });
}

// ── Alertas SweetAlert2 ───────────────────────────────────────────────────────
async function mostrarAlertas(eventos) {
  for (const ev of eventos) {
    const esNVR   = ev.tipoDispositivo === 'nvr';
    const esCaida = ev.tipo === 'caida';
    if (esCaida) {
      await Swal.fire({
        icon: 'error',
        title: esNVR ? 'NVR Caído' : 'Cámara Caída',
        html: `<b>${ev.nombre}</b><br>
               <small style="color:#9ca3af;font-family:monospace">${ev.ip}</small>
               ${!esNVR && ev.nvrNombre ? `<br><small style="color:#9ca3af">NVR: ${ev.nvrNombre}</small>` : ''}`,
        background: '#1a1a1a', color: '#e5e7eb',
        confirmButtonColor: '#ef4444', confirmButtonText: 'Entendido',
        timer: 6000, timerProgressBar: true
      });
    } else {
      await Swal.fire({
        icon: 'success',
        title: esNVR ? 'NVR Recuperado' : 'Cámara Recuperada',
        html: `<b>${ev.nombre}</b><br>
               <small style="color:#9ca3af;font-family:monospace">${ev.ip}</small>`,
        background: '#1a1a1a', color: '#e5e7eb',
        confirmButtonColor: '#22c55e', confirmButtonText: 'OK',
        timer: 4000, timerProgressBar: true
      });
    }
  }
}

// ── Filas del historial ───────────────────────────────────────────────────────
function renderFilas(eventos) {
  const tbody = document.getElementById('historial-body');
  if (!eventos.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Sin resultados para los filtros aplicados</td></tr>';
    return;
  }
  tbody.innerHTML = eventos.map(ev => {
    const fecha   = new Date(ev.fecha).toLocaleString('es-CO');
    const esCaida = ev.tipo === 'caida';
    return `
      <tr class="${esCaida ? 'fila-caida' : 'fila-recuperacion'}">
        <td>${fecha}</td>
        <td>${ev.nombre}</td>
        <td style="font-family:monospace;font-size:0.72rem">${ev.ip}</td>
        <td style="color:#9ca3af">${ev.tipo_dispositivo === 'camara' ? (ev.nvr_nombre || '—') : '—'}</td>
        <td>${ev.tipo_dispositivo === 'nvr'
          ? '<span class="badge badge-nvr">NVR</span>'
          : '<span class="badge badge-camara">CÁMARA</span>'}</td>
        <td>${esCaida
          ? '<span class="badge badge-caida">CAÍDA</span>'
          : '<span class="badge badge-recuperacion">RECUPERADO</span>'}</td>
      </tr>`;
  }).join('');
}

// ── Carga inicial ─────────────────────────────────────────────────────────────
function mostrarInicializando() {
  ['fisica', 'paciente', 'cx', 'ucis'].forEach(sec => {
    const grid = document.getElementById(`grid-${sec}`);
    if (grid) grid.innerHTML = '<div class="init-msg">Ejecutando primer chequeo...</div>';
  });
}

// ── Arranque ──────────────────────────────────────────────────────────────────
inicializarRangoPicker();
generarOpcionesHora();
fetchStatus();
cargarHistorial();

setInterval(fetchStatus,     INTERVALO_POLL);
setInterval(cargarHistorial, 60000);