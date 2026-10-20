// ── Gráficas e Informes ───────────────────────────────────────────────────────
// Indicadores mensuales de disponibilidad y caídas, con Chart.js:
//   1. Disponibilidad por zona           (barras horizontales)
//   2. Comparativo con el mes anterior   (barras horizontales agrupadas)
//   3. Caídas por día                    (barras apiladas NVR / cámaras)
//   4. Inactividad acumulada por zona    (líneas)
//   5. Ranking de dispositivos y disponibilidad por NVR (tablas)
// Habla con /api/informes (ver backend: routes/informes.routes.js).
// Ver la página exige "ver_graficas"; el botón de descargar el PDF aparece
// solo si además se tiene "exportar_reportes".

// Protección extra en el cliente: sin el permiso, de vuelta al dashboard. La
// protección real está en el backend (responde 403).
(function protegerPagina() {
  if (!tienePermiso('ver_graficas')) window.location.replace('index.html');
})();

const notyf = new Notyf({
  ripple:      false,
  dismissible: true,
  position:    { x: 'right', y: 'top' },
  duration:    4000
});

const API = '/api/informes';
const $   = id => document.getElementById(id);
const puedeDescargar = tienePermiso('exportar_reportes');

let informe  = null;  // última respuesta del servidor
let meses    = [];    // meses disponibles ('AAAA-MM')
const graficas = {};  // instancias de Chart.js, para destruirlas antes de repintar

// ═════════════════════════════════════════════════════════════════════════════
//  Formatos (siguen el idioma elegido en Mi Perfil)
// ═════════════════════════════════════════════════════════════════════════════
const locale = () => obtenerIdioma() === 'en' ? 'en-US' : 'es-CO';

function fmtPct(valor, decimales = 2) {
  if (valor === null || valor === undefined) return '—';
  return `${valor.toLocaleString(locale(), { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} %`;
}
const fmtNum = valor => (valor === null || valor === undefined) ? '—' : Number(valor).toLocaleString(locale());

function fmtHoras(horas) {
  if (horas === null || horas === undefined) return '—';
  const totalMin = Math.round(horas * 60);
  if (totalMin < 60) return t('graficas.minutos', { m: totalMin });
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? t('graficas.horasMinutos', { h: fmtNum(h), m }) : t('graficas.horas', { h: fmtNum(h) });
}

function nombreMes(mes) {
  const [anio, num] = mes.split('-').map(Number);
  const texto = new Date(anio, num - 1, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function escaparHTML(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ═════════════════════════════════════════════════════════════════════════════
//  Colores (salen de las variables del tema, así funcionan en oscuro y claro)
// ═════════════════════════════════════════════════════════════════════════════
function colores() {
  const css = getComputedStyle(document.documentElement);
  const v = nombre => css.getPropertyValue(nombre).trim();
  return {
    texto: v('--text'), textoTenue: v('--text-dim'), borde: v('--border'), superficie: v('--surface2'),
    amber: v('--amber'), blue: v('--blue'), purple: v('--purple'), orange: v('--orange'),
    green: v('--green'), red: v('--red')
  };
}

// Un color por zona (mismo orden en todas las gráficas)
function colorZona(clave, i, c) {
  const porZona = { fisica: c.amber, paciente: c.blue, cx: c.purple, ucis: c.orange };
  return porZona[clave] || [c.amber, c.blue, c.purple, c.orange, c.green][i % 5];
}

// Transparencia sobre un color hex (#rrggbb) — para el mes anterior del comparativo
function conAlfa(hex, alfa) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

// Mínimo del eje de disponibilidad: casi todo vive por encima del 99,9 %, así
// que un eje de 0 a 100 dejaría todas las barras "llenas" y no se notaría nada.
// Mismo criterio que el informe PDF (backend: informePdfService.js).
const RANGOS_EJE = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
function minimoDisponibilidad(valores) {
  const validos = valores.filter(v => v !== null && v !== undefined);
  if (!validos.length) return 99;
  const distancia = (100 - Math.min(...validos)) * 2.5;
  const rango = RANGOS_EJE.find(r => r >= distancia) ?? 100;
  return Math.max(0, 100 - rango);
}
const decimalesEje = min => (100 - min) >= 5 ? 0 : (100 - min) >= 0.5 ? 1 : 2;

// ═════════════════════════════════════════════════════════════════════════════
//  Datos
// ═════════════════════════════════════════════════════════════════════════════
async function pedir(ruta) {
  try {
    const res  = await authFetch(API + ruta);
    const json = await res.json().catch(() => null);
    if (res.status === 403) { window.location.replace('index.html'); return { ok: false }; }
    return { ok: res.ok, json, error: res.ok ? null : (json?.error || t('graficas.errorGenerico')) };
  } catch {
    return { ok: false, json: null, error: t('graficas.sinConexion') };
  }
}

async function cargarMeses() {
  const r = await pedir('/meses');
  if (!r.ok) { mostrarError(r.error); return false; }
  meses = r.json.meses;
  pintarSelectorMes(r.json.actual);
  return true;
}

function pintarSelectorMes(seleccionado) {
  const select = $('selector-mes');
  const actual = seleccionado || select.value;
  select.innerHTML = meses.map(m => `<option value="${m}">${escaparHTML(nombreMes(m))}</option>`).join('');
  if (meses.includes(actual)) select.value = actual;
}

// Si se cambia de mes varias veces seguidas, solo cuenta la última respuesta:
// una respuesta vieja que llegue tarde no debe pintar encima del mes elegido.
let consultaActual = 0;

async function cargarInforme(mes) {
  const consulta = ++consultaActual;
  $('graficas-cargando').hidden = false;
  $('graficas-error').hidden    = true;
  $('btn-descargar-pdf').disabled = true;

  const r = await pedir(`?mes=${encodeURIComponent(mes)}`);
  if (consulta !== consultaActual) return;
  $('graficas-cargando').hidden = true;
  if (!r.ok) { mostrarError(r.error); return; }

  informe = r.json;
  $('graficas-contenido').hidden = false;
  $('btn-descargar-pdf').disabled = false;
  pintarTodo();
}

function mostrarError(mensaje) {
  $('graficas-cargando').hidden = true;
  const e = $('graficas-error');
  e.textContent = mensaje;
  e.hidden = false;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Pintado
// ═════════════════════════════════════════════════════════════════════════════
function pintarTodo() {
  if (!informe) return;
  pintarPeriodo();
  pintarKpis();
  pintarGraficas();
  pintarRanking();
  pintarNvrs();
  if (window.lucide) lucide.createIcons();
}

function pintarPeriodo() {
  const fin = new Date(informe.periodo.fin);
  $('graficas-periodo').textContent = informe.periodo.enCurso
    ? t('graficas.periodoEnCurso', { fecha: fin.toLocaleString(locale()) })
    : t('graficas.periodoCerrado', { mes: nombreMes(informe.mes) });
}

function pintarKpis() {
  const k = informe.kpis;
  $('kpi-disponibilidad').textContent = fmtPct(k.disponibilidad);
  $('kpi-caidas').textContent         = fmtNum(k.caidas);
  $('kpi-inactividad').textContent    = fmtHoras(k.horasInactividad);
  $('kpi-afectados').textContent      = t('graficas.afectadosDe', { n: fmtNum(k.dispositivosAfectados), total: fmtNum(k.totalDispositivos) });
}

function opcionesBase(c) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { labels: { color: c.textoTenue, boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
      tooltip: { backgroundColor: c.superficie, titleColor: c.texto, bodyColor: c.texto, borderColor: c.borde, borderWidth: 1 }
    }
  };
}

function ejes(c, extraX = {}, extraY = {}) {
  const base = { ticks: { color: c.textoTenue, font: { size: 10 } }, grid: { color: c.borde }, border: { color: c.borde } };
  return { x: { ...base, ...extraX, ticks: { ...base.ticks, ...(extraX.ticks || {}) } },
           y: { ...base, ...extraY, ticks: { ...base.ticks, ...(extraY.ticks || {}) } } };
}

function crearGrafica(id, config) {
  graficas[id]?.destroy();
  graficas[id] = new Chart($(id), config);
}

function pintarGraficas() {
  const c = colores();
  Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
  Chart.defaults.color = c.textoTenue;

  const etiquetasZona = informe.zonas.map(z => z.nombre);
  const pctTooltip = ctx => `${ctx.dataset.label}: ${fmtPct(ctx.parsed.x)}`;

  // ── 1. Disponibilidad por zona ──
  const minZonas = minimoDisponibilidad(informe.zonas.map(z => z.disponibilidad));
  $('sub-zonas').textContent = t('graficas.zonasSub', { min: fmtPct(minZonas, decimalesEje(minZonas)) });
  $('grafica-zonas').setAttribute('aria-label', t('graficas.zonasTitulo'));
  crearGrafica('grafica-zonas', {
    type: 'bar',
    data: {
      labels: etiquetasZona,
      datasets: [{
        label: t('graficas.disponibilidad'),
        data: informe.zonas.map(z => z.disponibilidad),
        backgroundColor: informe.zonas.map((z, i) => colorZona(z.clave, i, c)),
        borderRadius: 4, maxBarThickness: 26
      }]
    },
    options: {
      ...opcionesBase(c),
      indexAxis: 'y',
      plugins: { ...opcionesBase(c).plugins, legend: { display: false }, tooltip: { ...opcionesBase(c).plugins.tooltip, callbacks: { label: pctTooltip } } },
      scales: ejes(c,
        { min: minZonas, max: 100, ticks: { callback: v => fmtPct(v, decimalesEje(minZonas)) } },
        { grid: { display: false } })
    }
  });

  // ── 2. Comparativo con el mes anterior ──
  const comp = informe.comparativo;
  const minComp = minimoDisponibilidad(comp.zonas.flatMap(z => [z.disponibilidadActual, z.disponibilidadAnterior]));
  $('sub-comparativo').textContent = comp.hayDatos
    ? t('graficas.compSub', { actual: nombreMes(informe.mes), anterior: nombreMes(comp.mesAnterior), min: fmtPct(minComp, decimalesEje(minComp)) })
    : t('graficas.compSinDatos', { anterior: nombreMes(comp.mesAnterior) });
  $('grafica-comparativo').setAttribute('aria-label', t('graficas.compTitulo'));
  crearGrafica('grafica-comparativo', {
    type: 'bar',
    data: {
      labels: etiquetasZona,
      datasets: [
        { label: nombreMes(comp.mesAnterior), data: comp.zonas.map(z => z.disponibilidadAnterior), backgroundColor: conAlfa(c.textoTenue, 0.45), borderRadius: 4, maxBarThickness: 18 },
        { label: nombreMes(informe.mes),      data: comp.zonas.map(z => z.disponibilidadActual),   backgroundColor: c.amber,                    borderRadius: 4, maxBarThickness: 18 }
      ]
    },
    options: {
      ...opcionesBase(c),
      indexAxis: 'y',
      plugins: {
        ...opcionesBase(c).plugins,
        tooltip: {
          ...opcionesBase(c).plugins.tooltip,
          callbacks: {
            label: ctx => {
              const zona = comp.zonas[ctx.dataIndex];
              const caidas = ctx.datasetIndex === 0 ? zona.caidasAnterior : zona.caidasActual;
              if (ctx.parsed.x === null || ctx.parsed.x === undefined) return `${ctx.dataset.label}: ${t('graficas.sinDatos')}`;
              return `${ctx.dataset.label}: ${fmtPct(ctx.parsed.x)} · ${t('graficas.caidasN', { n: fmtNum(caidas) })}`;
            }
          }
        }
      },
      scales: ejes(c,
        { min: minComp, max: 100, ticks: { callback: v => fmtPct(v, decimalesEje(minComp)) } },
        { grid: { display: false } })
    }
  });

  // ── 3. Caídas por día ──
  const dias = informe.caidasPorDia.map(d => String(Number(d.dia.slice(8))));
  $('grafica-dias').setAttribute('aria-label', t('graficas.diaTitulo'));
  crearGrafica('grafica-dias', {
    type: 'bar',
    data: {
      labels: dias,
      datasets: [
        { label: t('graficas.nvrs'),    data: informe.caidasPorDia.map(d => d.nvr),    backgroundColor: c.red,    borderRadius: 2, maxBarThickness: 22 },
        { label: t('graficas.camaras'), data: informe.caidasPorDia.map(d => d.camara), backgroundColor: c.purple, borderRadius: 2, maxBarThickness: 22 }
      ]
    },
    options: {
      ...opcionesBase(c),
      plugins: {
        ...opcionesBase(c).plugins,
        tooltip: { ...opcionesBase(c).plugins.tooltip, callbacks: { title: items => t('graficas.diaN', { d: items[0].label }) } }
      },
      scales: ejes(c,
        { stacked: true, grid: { display: false } },
        { stacked: true, beginAtZero: true, ticks: { precision: 0 } })
    }
  });

  // ── 4. Inactividad acumulada ──
  const diasAcum = informe.inactividadAcumulada.dias.map(d => String(Number(d.slice(8))));
  $('grafica-acumulada').setAttribute('aria-label', t('graficas.acumTitulo'));
  crearGrafica('grafica-acumulada', {
    type: 'line',
    data: {
      labels: diasAcum,
      datasets: informe.inactividadAcumulada.series.map((s, i) => ({
        label: s.nombre, data: s.valores,
        borderColor: colorZona(s.clave, i, c), backgroundColor: colorZona(s.clave, i, c),
        borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.25
      }))
    },
    options: {
      ...opcionesBase(c),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...opcionesBase(c).plugins,
        tooltip: {
          ...opcionesBase(c).plugins.tooltip,
          callbacks: {
            title: items => t('graficas.diaN', { d: items[0].label }),
            label: ctx => `${ctx.dataset.label}: ${fmtHoras(ctx.parsed.y)}`
          }
        }
      },
      scales: ejes(c,
        { grid: { display: false } },
        { beginAtZero: true, ticks: { callback: v => t('graficas.horasEje', { h: fmtNum(v) }) } })
    }
  });
}

const badgeTipo = tipo => tipo === 'nvr'
  ? `<span class="badge badge-nvr">${t('badge.nvr')}</span>`
  : `<span class="badge badge-camara">${t('badge.camara')}</span>`;

function claseDisponibilidad(valor) {
  if (valor === null || valor === undefined) return '';
  return valor >= 99 ? 'disp-buena' : valor >= 95 ? 'disp-media' : 'disp-baja';
}

function pintarRanking() {
  const tbody = $('tabla-ranking');
  if (!informe.ranking.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">${t('graficas.rankingVacio')}</td></tr>`;
    return;
  }
  tbody.innerHTML = informe.ranking.map((r, i) => `
    <tr>
      <td class="graficas-posicion">${i + 1}</td>
      <td><strong>${escaparHTML(r.nombre)}</strong></td>
      <td>${badgeTipo(r.tipo)}</td>
      <td class="mono">${escaparHTML(r.ip)}</td>
      <td class="tenue">${escaparHTML(r.nvrNombre || '—')}</td>
      <td>${escaparHTML(r.zonaNombre)}</td>
      <td class="num"><span class="graficas-caidas">${fmtNum(r.caidas)}</span></td>
      <td class="num">${fmtHoras(r.horasInactividad)}</td>
    </tr>`).join('');
}

function pintarNvrs() {
  const ordenados = [...informe.nvrs].sort((a, b) =>
    (a.disponibilidadNvr ?? 101) - (b.disponibilidadNvr ?? 101) || a.nombre.localeCompare(b.nombre));
  const tbody = $('tabla-nvrs');
  if (!ordenados.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">${t('graficas.nvrsVacio')}</td></tr>`;
    return;
  }
  tbody.innerHTML = ordenados.map(n => `
    <tr>
      <td><strong>${escaparHTML(n.nombre)}</strong></td>
      <td class="mono">${escaparHTML(n.ip)}</td>
      <td>${escaparHTML(n.zonaNombre)}</td>
      <td class="num ${claseDisponibilidad(n.disponibilidadNvr)}">${fmtPct(n.disponibilidadNvr)}</td>
      <td class="num ${claseDisponibilidad(n.disponibilidadCamaras)}">${n.camaras ? fmtPct(n.disponibilidadCamaras) : `<span class="tenue">${t('graficas.sinCamaras')}</span>`}</td>
      <td class="num">${fmtNum(n.caidasNvr)} / ${fmtNum(n.caidasCamaras)}</td>
      <td class="num">${fmtHoras(n.horasInactividad)}</td>
    </tr>`).join('');
}

// ═════════════════════════════════════════════════════════════════════════════
//  Descargar el informe en PDF
// ═════════════════════════════════════════════════════════════════════════════
async function descargarPdf() {
  if (!informe) return;
  const btn = $('btn-descargar-pdf');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="login-spin"></i> <span>${escaparHTML(t('graficas.generando'))}</span>`;
  if (window.lucide) lucide.createIcons();

  try {
    const res = await authFetch(`${API}/pdf?mes=${encodeURIComponent(informe.mes)}`);
    if (!res.ok) throw new Error('PDF');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `informe-mensual-nvr-${informe.mes}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    notyf.error(t('graficas.errorPdf'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
    if (window.lucide) lucide.createIcons();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Arranque
// ═════════════════════════════════════════════════════════════════════════════
(function mostrarUsuarioActual() {
  const usuario = obtenerUsuario();
  const el = $('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
})();

if (puedeDescargar) {
  $('btn-descargar-pdf').hidden = false;
  $('btn-descargar-pdf').addEventListener('click', descargarPdf);
}

$('selector-mes').addEventListener('change', e => cargarInforme(e.target.value));

(async function iniciar() {
  if (window.lucide) lucide.createIcons();
  if (await cargarMeses()) await cargarInforme($('selector-mes').value);
})();

// Al cambiar el idioma: nombres de meses, formatos y textos de las gráficas
if (typeof registrarRepintado === 'function') {
  registrarRepintado(() => {
    if (!meses.length) return;
    pintarSelectorMes();
    pintarTodo();
  });
}

// Si el tema se cambia desde Mi Perfil en otra pestaña, se aplica aquí también
// y las gráficas se vuelven a pintar con los colores del tema nuevo.
window.addEventListener('storage', e => {
  if (e.key !== 'nvr_tema') return;
  document.documentElement.setAttribute('data-tema', e.newValue === 'claro' ? 'claro' : 'oscuro');
  pintarTodo();
});