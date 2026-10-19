// ── Panel de Configuración ───────────────────────────────────────────────────
// Dos tarjetas, cada una con su permiso (el súper admin ve ambas):
//   Horario laboral         → gestionar_horario_laboral
//   Alertas y estabilidad   → gestionar_umbrales_alerta
// Habla con /api/configuracion (ver backend: routes/configuracion.routes.js).
// Los cambios aplican en el siguiente chequeo del monitor, sin reiniciar nada.

// Protección extra en el cliente: sin ninguno de los dos permisos, de vuelta al
// dashboard. La protección real está en el backend (responde 403).
(function protegerPagina() {
  if (!tienePermiso('gestionar_horario_laboral') && !tienePermiso('gestionar_umbrales_alerta')) {
    window.location.replace('index.html');
  }
})();

const notyf = new Notyf({
  ripple:      false,
  dismissible: true,
  position:    { x: 'right', y: 'top' },
  duration:    4000
});

const API = '/api/configuracion';
const $   = id => document.getElementById(id);

let datos    = null;                       // última respuesta del servidor
let guardado = { horario: null, alertas: null }; // lo que hay guardado (para saber si hay cambios)

// ═════════════════════════════════════════════════════════════════════════════
//  Utilidades
// ═════════════════════════════════════════════════════════════════════════════
async function llamar(metodo, ruta, cuerpo) {
  try {
    const res = await authFetch(API + ruta, {
      method:  metodo,
      headers: { 'Content-Type': 'application/json' },
      body:    cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
    });
    const json = await res.json().catch(() => null);
    if (res.status === 403 && metodo === 'GET') window.location.replace('index.html');
    return { ok: res.ok, status: res.status, json, error: res.ok ? null : (json?.error || t('configuracion.errorGenerico')) };
  } catch {
    return { ok: false, status: 0, json: null, error: t('configuracion.sinConexion') };
  }
}

function mostrarError(id, mensaje) { const e = $(id); e.textContent = mensaje; e.hidden = false; }
function ocultarError(id)          { $(id).hidden = true; }
function mostrarAviso(id, mensaje) { const e = $(id); e.textContent = mensaje; e.hidden = false; }
function ocultarAviso(id)          { $(id).hidden = true; }

const iguales = (a, b) => Object.keys(a).every(k => JSON.stringify(a[k]) === JSON.stringify(b?.[k]));

// ═════════════════════════════════════════════════════════════════════════════
//  Horario laboral
// ═════════════════════════════════════════════════════════════════════════════
const chips = () => [...document.querySelectorAll('#chips-dias .chip-dia')];

function leerHorario() {
  return {
    diasLaborales: chips().filter(c => c.getAttribute('aria-pressed') === 'true').map(c => Number(c.dataset.dia)).sort((a, b) => a - b),
    horaInicio:    $('hora-inicio').value,
    horaFin:       $('hora-fin').value
  };
}

function pintarHorario(h) {
  chips().forEach(c => c.setAttribute('aria-pressed', h.diasLaborales.includes(Number(c.dataset.dia)) ? 'true' : 'false'));
  $('hora-inicio').value = h.horaInicio;
  $('hora-fin').value    = h.horaFin;
}

function actualizarBotonHorario() {
  $('horario-guardar').disabled = iguales(leerHorario(), guardado.horario);
}

chips().forEach(chip => chip.addEventListener('click', () => {
  chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  ocultarError('horario-error'); ocultarAviso('horario-aviso');
  actualizarBotonHorario();
}));
['hora-inicio', 'hora-fin'].forEach(id => $(id).addEventListener('input', () => {
  ocultarError('horario-error'); ocultarAviso('horario-aviso');
  actualizarBotonHorario();
}));

$('horario-restaurar').addEventListener('click', () => {
  pintarHorario(datos.predeterminados.horario);
  ocultarError('horario-error');
  mostrarAviso('horario-aviso', t('configuracion.restauradoAviso'));
  actualizarBotonHorario();
});

$('form-horario').addEventListener('submit', async e => {
  e.preventDefault();
  ocultarError('horario-error'); ocultarAviso('horario-aviso');

  const h = leerHorario();
  if (h.diasLaborales.length === 0) return mostrarError('horario-error', t('configuracion.errDias'));
  if (!h.horaInicio)                return mostrarError('horario-error', t('configuracion.errHoraInicio'));
  if (!h.horaFin)                   return mostrarError('horario-error', t('configuracion.errHoraFin'));
  if (h.horaInicio >= h.horaFin)    return mostrarError('horario-error', t('configuracion.errOrden'));

  $('horario-guardar').disabled = true;
  const r = await llamar('PUT', '/horario', h);
  if (!r.ok) { actualizarBotonHorario(); return mostrarError('horario-error', r.error); }

  datos.horario = r.json.horario;
  datos.ahora   = r.json.ahora;
  aplicarHorario();
  pintarAhora();
  notyf.success(t('configuracion.horarioGuardado'));
});

function aplicarHorario() {
  const { actualizadoEn, actualizadoPor, ...valores } = datos.horario;
  guardado.horario = valores;
  pintarHorario(valores);
  pintarPie('horario-pie', datos.horario);
  actualizarBotonHorario();
}

// ═════════════════════════════════════════════════════════════════════════════
//  Alertas y estabilidad
// ═════════════════════════════════════════════════════════════════════════════
const CAMPOS_ALERTAS = [
  { campo: 'minutosSostenidoNoLaboral', id: 'alerta-sostenido', nombre: 'configuracion.campoSostenido' },
  { campo: 'ventanaInestableMinutos',   id: 'alerta-ventana',   nombre: 'configuracion.campoVentana' },
  { campo: 'cambiosInestableUmbral',    id: 'alerta-cambios',   nombre: 'configuracion.campoCambios' }
];

function leerAlertas() {
  const valores = {};
  for (const { campo, id } of CAMPOS_ALERTAS) {
    const texto = $(id).value.trim();
    valores[campo] = texto === '' ? null : Number(texto);
  }
  return valores;
}

function pintarAlertas(a) {
  for (const { campo, id } of CAMPOS_ALERTAS) $(id).value = a[campo];
}

function actualizarBotonAlertas() {
  $('alertas-guardar').disabled = iguales(leerAlertas(), guardado.alertas);
}

CAMPOS_ALERTAS.forEach(({ id }) => $(id).addEventListener('input', () => {
  ocultarError('alertas-error'); ocultarAviso('alertas-aviso');
  actualizarBotonAlertas();
}));

$('alertas-restaurar').addEventListener('click', () => {
  pintarAlertas(datos.predeterminados.alertas);
  ocultarError('alertas-error');
  mostrarAviso('alertas-aviso', t('configuracion.restauradoAviso'));
  actualizarBotonAlertas();
});

$('form-alertas').addEventListener('submit', async e => {
  e.preventDefault();
  ocultarError('alertas-error'); ocultarAviso('alertas-aviso');

  const a = leerAlertas();
  for (const { campo, nombre } of CAMPOS_ALERTAS) {
    const { min, max } = datos.limites[campo];
    if (!Number.isInteger(a[campo]) || a[campo] < min || a[campo] > max) {
      $(CAMPOS_ALERTAS.find(c => c.campo === campo).id).focus();
      return mostrarError('alertas-error', t('configuracion.errNumero', { campo: t(nombre), min, max }));
    }
  }

  $('alertas-guardar').disabled = true;
  const r = await llamar('PUT', '/alertas', a);
  if (!r.ok) { actualizarBotonAlertas(); return mostrarError('alertas-error', r.error); }

  datos.alertas = r.json.alertas;
  datos.ahora   = r.json.ahora;
  aplicarAlertas();
  notyf.success(t('configuracion.alertasGuardadas'));
});

function aplicarAlertas() {
  const { actualizadoEn, actualizadoPor, ...valores } = datos.alertas;
  guardado.alertas = valores;
  pintarAlertas(valores);
  pintarPie('alertas-pie', datos.alertas);
  actualizarBotonAlertas();
  // Los rangos permitidos, a la vista en cada campo
  for (const { campo, id } of CAMPOS_ALERTAS) {
    const { min, max } = datos.limites[campo];
    $(id).min = min; $(id).max = max;
    $(id).title = t('configuracion.rango', { min, max });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Textos que dependen de los datos (se vuelven a escribir al cambiar de idioma)
// ═════════════════════════════════════════════════════════════════════════════
function pintarAhora() {
  const caja = $('config-ahora');
  if (!datos?.horario) { caja.textContent = ''; return; }
  caja.classList.toggle('laboral', datos.ahora.esLaboral);
  caja.textContent = t(datos.ahora.esLaboral ? 'configuracion.ahoraLaboral' : 'configuracion.ahoraNoLaboral', { hora: datos.ahora.hora });
}

function pintarPie(id, grupo) {
  const pie = $(id);
  if (grupo.actualizadoPor && grupo.actualizadoEn) {
    const fecha = new Date(grupo.actualizadoEn).toLocaleString(obtenerIdioma() === 'en' ? 'en-US' : 'es-CO');
    pie.textContent = t('configuracion.pieModificado', { fecha, usuario: grupo.actualizadoPor });
  } else {
    pie.textContent = t('configuracion.pieOriginal');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Arranque
// ═════════════════════════════════════════════════════════════════════════════
async function cargar() {
  const r = await llamar('GET', '');
  $('config-cargando').hidden = true;
  if (!r.ok) return mostrarError('config-error', r.error || t('configuracion.errorCargar'));

  datos = r.json;
  if (datos.horario) { $('card-horario').hidden = false; aplicarHorario(); }
  if (datos.alertas) { $('card-alertas').hidden = false; aplicarAlertas(); }
  $('config-nota').hidden = false;
  pintarAhora();
  if (window.lucide) lucide.createIcons();
}

(function mostrarUsuarioActual() {
  const usuario = obtenerUsuario();
  const el = $('usuario-actual');
  if (usuario && el) el.textContent = usuario.nombre || usuario.username;
})();

cargar();

// Al cambiar el idioma, los textos que arman los datos se escriben de nuevo
if (typeof registrarRepintado === 'function') {
  registrarRepintado(() => {
    if (!datos) return;
    pintarAhora();
    if (datos.horario) pintarPie('horario-pie', datos.horario);
    if (datos.alertas) { pintarPie('alertas-pie', datos.alertas); aplicarAlertasSoloTitulos(); }
  });
}

function aplicarAlertasSoloTitulos() {
  for (const { campo, id } of CAMPOS_ALERTAS) {
    const { min, max } = datos.limites[campo];
    $(id).title = t('configuracion.rango', { min, max });
  }
}