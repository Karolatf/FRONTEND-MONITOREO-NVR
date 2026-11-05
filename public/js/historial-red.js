// ── Historial de eventos de Access Points y Equipos de red ───────────────────
// Misma tabla, filtros, paginación y exportación que el historial del dashboard
// de NVRs (las funciones vienen de js/app.js), pero filtrada SIEMPRE por el tipo
// de equipo de la página (CATEGORIA, definida en js/red.js). Por eso aquí no hay
// filtro de "Tipo", y la columna NVR se reemplaza por la ubicación del equipo.
// ─────────────────────────────────────────────────────────────────────────────
let rangoPicker = null;

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

async function exportarHistorial(formato) {
  const params = construirParametrosFiltro();
  params.set('formato', formato);

  const btn = document.getElementById('btn-exportar');
  if (btn.disabled) return; // ya hay una exportación en curso
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
    a.download = `historial-${CATEGORIA === 'equipo_red' ? 'equipos-red' : 'access-points'}-${fecha}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al exportar:', err);
    notyfRed.open({ type: 'error', message: t('dashboard.errorExportar') });
  } finally {
    // Se vuelve a armar el botón completo (no se copia lo que tenía antes): así
    // nunca se queda pegado en "Generando..." aunque algo lo cambie mientras tanto.
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="download" class="icon-btn"></i> <span data-i18n="dashboard.exportar">${t('dashboard.exportar')}</span>
      <i data-lucide="chevron-down" style="width:13px;height:13px;margin-left:2px"></i>`;
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
  const tipoDispositivo = CATEGORIA; // cada página muestra solo su tipo de equipo
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

// ── Historial paginado ────────────────────────────────────────────────────────
// El backend devuelve 100 eventos por página. Sin rango de fechas muestra solo
// los últimos días (ver `ventanaDias`); con rango, todo lo guardado en él.
let paginaHistorial       = 1;
let totalPaginasHistorial = 1;
let consultaHistorialId   = 0;   // para descartar respuestas viejas al escribir rápido

// Sin argumentos vuelve a la página 1 (es lo que usan los filtros: un filtro
// nuevo siempre empieza desde el principio). Para refrescar sin moverse de
// página: cargarHistorial({ pagina: paginaHistorial }).
// `alInicio`: subir el desplazamiento interno de la tabla al primer registro
// (sí al cambiar de página o de filtro; no al refrescar en segundo plano, para
// no mover a quien está leyendo).
async function cargarHistorial({ pagina = 1, alInicio = true } = {}) {
  const params = construirParametrosFiltro();
  params.set('pagina', pagina);

  const idConsulta = ++consultaHistorialId;

  try {
    const res  = await authFetch(`/api/historial?${params}`);
    const data = await res.json();

    // Si mientras tanto se hizo otra consulta (ej. se siguió escribiendo en el
    // buscador), esta respuesta ya no sirve.
    if (idConsulta !== consultaHistorialId) return;

    paginaHistorial       = data.pagina       || 1;
    totalPaginasHistorial = data.totalPaginas || 1;

    params.delete('pagina');
    params.delete('tipoDispositivo'); // es fijo en esta página: no cuenta como filtro
    const hayFiltros = [...params.keys()].length > 0;
    const countEl    = document.getElementById('count-historial');
    countEl.textContent = t(hayFiltros ? 'dashboard.resultados' : 'dashboard.eventos', { count: data.total });

    renderFilas(data.eventos || []);
    renderPaginacion(data);
    lucide.createIcons();

    if (alInicio) {
      const wrapper = document.querySelector('.historial-section .tabla-wrapper');
      if (wrapper) wrapper.scrollTop = 0;
    }
  } catch (err) {
    console.error('Error cargando historial:', err);
  }
}

// Refresca la página actual (usado al reconectar o al cambiar idioma/tema)
function refrescarHistorial() {
  cargarHistorial({ pagina: paginaHistorial, alInicio: false });
}

function irAPaginaHistorial(pagina) {
  if (pagina < 1 || pagina > totalPaginasHistorial || pagina === paginaHistorial) return;
  cargarHistorial({ pagina });
}

// Pinta los mismos controles arriba y abajo de la tabla
function renderPaginacion({ total = 0, pagina = 1, porPagina = 100, totalPaginas = 1, ventanaDias = null } = {}) {
  const fmt   = n => Number(n).toLocaleString(obtenerIdioma() === 'en' ? 'en-US' : 'es-CO');
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  const aviso = ventanaDias
    ? `<span class="paginacion-aviso"><i data-lucide="info"></i>${t('dashboard.avisoVentana', { count: ventanaDias })}</span>`
    : '';

  const boton = (destino, icono, etiqueta, deshabilitado, abajo) => `
    <button class="paginacion-btn" type="button"
      onclick="irAPaginaHistorial(${destino})"
      title="${etiqueta}" aria-label="${etiqueta}" ${deshabilitado ? 'disabled' : ''}>
      <i data-lucide="${icono}"></i>
    </button>`;

  const controles = abajo => `
    <div class="paginacion-info">
      <span class="paginacion-rango">${t('dashboard.mostrandoRango', { desde: fmt(desde), hasta: fmt(hasta), total: fmt(total) })}</span>
      ${abajo ? '' : aviso}
    </div>
    <div class="paginacion-controles">
      ${boton(1,              'chevrons-left',  t('dashboard.primeraPagina'),  pagina <= 1,            abajo)}
      ${boton(pagina - 1,     'chevron-left',   t('dashboard.paginaAnterior'), pagina <= 1,            abajo)}
      <span class="paginacion-actual">${t('dashboard.paginaDe', { pagina: fmt(pagina), total: fmt(totalPaginas) })}</span>
      ${boton(pagina + 1,     'chevron-right',  t('dashboard.paginaSiguiente'), pagina >= totalPaginas, abajo)}
      ${boton(totalPaginas,   'chevrons-right', t('dashboard.ultimaPagina'),   pagina >= totalPaginas, abajo)}
    </div>`;

  const arriba = document.getElementById('paginacion-arriba');
  const abajo  = document.getElementById('paginacion-abajo');
  if (arriba) arriba.innerHTML = controles(false);
  // Abajo solo hace falta cuando hay más de una página
  if (abajo)  abajo.innerHTML  = totalPaginas > 1 ? controles(true) : '';
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
  document.getElementById('filtro-hora').value   = '';
  if (rangoPicker) rangoPicker.clear();
  cargarHistorial();
}

// ── Filas de la tabla ─────────────────────────────────────────────────────────
function renderFilas(eventos) {
  const tbody = document.getElementById('historial-body');
  if (!eventos.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">${t('dashboard.sinResultados')}</td></tr>`;
    return;
  }
  tbody.innerHTML = eventos.map(ev => {
    const fecha   = new Date(ev.fecha).toLocaleString(obtenerIdioma() === 'en' ? 'en-US' : 'es-CO');
    const esCaida = ev.tipo === 'caida';
    return `
      <tr class="${esCaida ? 'fila-caida' : 'fila-recuperacion'}">
        <td>${fecha}</td>
        <td>${escaparTexto(ev.nombre)}</td>
        <td style="font-family:monospace;font-size:0.72rem">${escaparTexto(ev.ip)}</td>
        <td style="color:var(--text-dim)">${escaparTexto(ev.piso || '—')}</td>
        <td>${esCaida
          ? `<span class="badge badge-caida">${t('badge.caida')}</span>`
          : `<span class="badge badge-recuperacion">${t('badge.recuperado')}</span>`}</td>
      </tr>`;
  }).join('');
}

// ── Inicio ────────────────────────────────────────────────────────────────────
(function iniciarHistorial() {
  if (!tienePermiso('exportar_reportes')) document.getElementById('exportar-wrapper')?.remove();
  inicializarRangoPicker();
  generarOpcionesHora();
  cargarHistorial();
  if (typeof registrarRepintado === 'function') registrarRepintado(refrescarHistorial);
})();