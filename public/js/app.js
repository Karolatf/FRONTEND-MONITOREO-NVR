// ── Estado global del frontend ───────────────────────────────────────────────
let estadoActual      = {};    // Último estado recibido de la API (NVRs y cámaras)
let historialCompleto = [];    // Copia completa del historial para aplicar filtros
const INTERVALO_POLL  = 15000; // Cada 15 segundos se consulta el estado al backend

// ── Función principal: consultar el estado al backend ────────────────────────
async function fetchStatus() {
  try {
    const res  = await fetch('/api/status'); // Consultar el endpoint de la API
    const data = await res.json();           // Parsear la respuesta JSON

    // Si el servidor todavía está ejecutando el primer chequeo
    if (data.inicializando) {
      mostrarInicializando();
      actualizarTimestamp('Iniciando primer chequeo...');
      return;
    }

    renderEstado(data); // Renderizar el estado completo en el dashboard

    // Mostrar alertas SweetAlert2 si hay eventos nuevos
    if (data.eventosPendientes && data.eventosPendientes.length > 0) {
      mostrarAlertas(data.eventosPendientes);
    }

    actualizarTimestamp(); // Actualizar el timestamp de última actualización

  } catch (err) {
    console.error('Error al consultar la API:', err);
    actualizarTimestamp('Sin conexion con el servidor');
  }
}

// ── Actualizar el timestamp del header ───────────────────────────────────────
function actualizarTimestamp(msg = null) {
  const el = document.getElementById('ultima-actualizacion');
  el.textContent = msg || `Última actualización: ${new Date().toLocaleString('es-CO')}`;
}

// ── Renderizar el estado completo del sistema ─────────────────────────────────
function renderEstado(data) {
  estadoActual = data; // Guardar estado actual para usarlo en el modal

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

  // Actualizar tarjetas de estadísticas
  document.getElementById('stat-activos').textContent    = totalActivos;
  document.getElementById('stat-nvr-caidos').textContent = totalCaidos;
  document.getElementById('stat-cam-caidas').textContent = totalCamCaidas;
  document.getElementById('stat-total').textContent      = totalDisp;

  renderHistorial(data.historial || []); // Renderizar historial con filtros
  lucide.createIcons();                  // Actualizar iconos Lucide tras modificar el DOM
}

// ── Renderizar la grilla de tarjetas NVR ─────────────────────────────────────
function renderGrid(seccionId, lista) {
  const grid = document.getElementById(`grid-${seccionId}`);
  if (!grid) return;

  grid.innerHTML = lista.map(nvr => `
    <div class="nvr-card ${nvr.activo ? 'activo' : 'caido'}"
         data-ip="${nvr.ip}"
         data-seccion="${seccionId}">
      <div class="dot ${nvr.activo ? 'verde' : 'rojo'}"></div>
      ${nvr.numCaidas > 0 ? `<span class="caidas-badge">${nvr.numCaidas}x</span>` : ''}
      <div class="nvr-nombre">${nvr.nombre}</div>
      <div class="nvr-ip">${nvr.ip}</div>
    </div>
  `).join('');
}

// ── Detectar clic en tarjeta NVR ─────────────────────────────────────────────
document.addEventListener('click', e => {
  const card = e.target.closest('.nvr-card');
  if (!card) return;
  const nvr = estadoActual[card.dataset.seccion]?.find(n => n.ip === card.dataset.ip);
  if (nvr) abrirModalNVR(nvr);
});

// ── Modal con información del NVR ────────────────────────────────────────────
function abrirModalNVR(nvr) {
  const numCam = nvr.camaras ? nvr.camaras.length : 0;

  const camarasHTML = numCam > 0
    ? `<table style="width:100%;border-collapse:collapse;font-size:0.78rem;margin-top:0.5rem">
        <thead><tr>
          <th style="text-align:left;padding:0.4rem;color:#9ca3af;border-bottom:1px solid #333;font-size:0.68rem">Cámara</th>
          <th style="text-align:left;padding:0.4rem;color:#9ca3af;border-bottom:1px solid #333;font-size:0.68rem">IP</th>
          <th style="text-align:left;padding:0.4rem;color:#9ca3af;border-bottom:1px solid #333;font-size:0.68rem">Estado</th>
        </tr></thead>
        <tbody>
          ${nvr.camaras.map(cam => `
            <tr>
              <td style="padding:0.4rem">${cam.nombre}</td>
              <td style="padding:0.4rem;font-family:monospace;font-size:0.72rem">${cam.ip}</td>
              <td style="padding:0.4rem;color:${cam.activo ? '#22c55e' : '#ef4444'}">${cam.activo ? '● Activa' : '● Caída'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
    : `<p style="color:#9ca3af;font-size:0.78rem;margin-top:0.5rem;line-height:1.6">
         Sin cámaras registradas para este NVR.<br>
         <small>Agrégalas en <code style="background:#111;padding:0.1rem 0.3rem;border-radius:3px">BACKEND/config/dispositivos.js</code></small>
       </p>`;

  Swal.fire({
    background: '#1a1a1a', color: '#e5e7eb',
    showConfirmButton: false, showCloseButton: true, width: 520,
    didOpen: () => lucide.createIcons(),
    html: `
      <div style="text-align:left;font-family:'Segoe UI',sans-serif">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.75rem">
          <span style="width:10px;height:10px;border-radius:50%;flex-shrink:0;
            background:${nvr.activo ? '#22c55e' : '#ef4444'};
            box-shadow:0 0 6px ${nvr.activo ? '#22c55e' : '#ef4444'}"></span>
          <strong style="color:#d4a017;font-size:1rem">${nvr.nombre}</strong>
          <span style="color:#9ca3af;font-size:0.78rem">(${nvr.activo ? 'Activo' : 'Caído'})</span>
        </div>
        <p style="color:#9ca3af;font-size:0.78rem;margin-bottom:1rem">
          IP: <code style="background:#111;padding:0.1rem 0.4rem;border-radius:3px">${nvr.ip}</code>
          &nbsp;·&nbsp; Caídas esta sesión: <strong style="color:#ef4444">${nvr.numCaidas || 0}</strong>
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
        <div style="border-top:1px solid #2e2e2e;padding-top:0.75rem">
          <p style="color:#d4a017;font-size:0.78rem;margin-bottom:0.25rem;font-weight:600;display:flex;align-items:center;gap:5px">
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
        html: `<b>${ev.nombre}</b><br><small style="color:#9ca3af;font-family:monospace">${ev.ip}</small>${!esNVR && ev.nvrNombre ? `<br><small style="color:#9ca3af">NVR: ${ev.nvrNombre}</small>` : ''}`,
        background: '#1a1a1a', color: '#e5e7eb',
        confirmButtonColor: '#ef4444', confirmButtonText: 'Entendido',
        timer: 6000, timerProgressBar: true
      });
    } else {
      await Swal.fire({
        icon: 'success',
        title: esNVR ? 'NVR Recuperado' : 'Cámara Recuperada',
        html: `<b>${ev.nombre}</b><br><small style="color:#9ca3af;font-family:monospace">${ev.ip}</small>`,
        background: '#1a1a1a', color: '#e5e7eb',
        confirmButtonColor: '#22c55e', confirmButtonText: 'OK',
        timer: 4000, timerProgressBar: true
      });
    }
  }
}

// ── Renderizar historial (guarda copia y aplica filtros) ──────────────────────
function renderHistorial(eventos) {
  historialCompleto = eventos; // Guardar copia completa para los filtros
  filtrarHistorial();           // Aplicar filtros actuales y renderizar
}

// ── Aplicar filtros al historial ──────────────────────────────────────────────
function filtrarHistorial() {
  const ip     = document.getElementById('filtro-ip').value.toLowerCase().trim();
  const estado = document.getElementById('filtro-estado').value;
  const tipo   = document.getElementById('filtro-tipo').value;

  // Filtrar según los valores seleccionados
  const filtrados = historialCompleto.filter(ev => {
    const coincideIP     = !ip     || ev.ip.toLowerCase().includes(ip) || ev.nombre.toLowerCase().includes(ip);
    const coincideEstado = !estado || ev.tipo === estado;
    const coincideTipo   = !tipo   || ev.tipo_dispositivo === tipo;
    return coincideIP && coincideEstado && coincideTipo;
  });

  // Actualizar el contador: "X de Y eventos" si hay filtros activos
  const countEl    = document.getElementById('count-historial');
  const hayFiltros = ip || estado || tipo;
  countEl.textContent = hayFiltros
    ? `${filtrados.length} de ${historialCompleto.length} eventos`
    : `${historialCompleto.length} evento${historialCompleto.length !== 1 ? 's' : ''}`;

  renderFilas(filtrados); // Renderizar las filas filtradas
}

// ── Limpiar todos los filtros ─────────────────────────────────────────────────
function limpiarFiltros() {
  document.getElementById('filtro-ip').value     = '';
  document.getElementById('filtro-estado').value = '';
  document.getElementById('filtro-tipo').value   = '';
  filtrarHistorial(); // Re-renderizar sin filtros
}

// ── Renderizar las filas de la tabla ─────────────────────────────────────────
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
        <td>${ev.tipo_dispositivo === 'nvr' ? '<span class="badge badge-nvr">NVR</span>' : '<span class="badge badge-camara">CÁMARA</span>'}</td>
        <td>${esCaida ? '<span class="badge badge-caida">CAÍDA</span>' : '<span class="badge badge-recuperacion">RECUPERADO</span>'}</td>
      </tr>`;
  }).join('');
}

// ── Pantalla de carga inicial ─────────────────────────────────────────────────
function mostrarInicializando() {
  ['fisica', 'paciente', 'cx', 'ucis'].forEach(sec => {
    const grid = document.getElementById(`grid-${sec}`);
    if (grid) grid.innerHTML = '<div class="init-msg">Ejecutando primer chequeo...</div>';
  });
}

// ── Arranque ──────────────────────────────────────────────────────────────────
fetchStatus();
setInterval(fetchStatus, INTERVALO_POLL);