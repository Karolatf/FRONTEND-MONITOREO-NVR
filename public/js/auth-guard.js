// ── Guarda de sesión del dashboard ────────────────────────────────────────────
// Debe cargarse ANTES que cualquier otro script, para redirigir de inmediato
// si no hay una sesión válida (evita que se llegue a ver el dashboard vacío).
//
// El token se guarda en sessionStorage (no localStorage): sessionStorage se
// borra automáticamente cuando se cierra la pestaña o la ventana, así que
// cerrar el navegador ya obliga a iniciar sesión de nuevo la próxima vez.
// Además, el servidor genera una clave de firma nueva cada vez que arranca,
// así que reiniciar el proceso (o Git Bash) invalida todas las sesiones.
//
// ── Política de inactividad por rol ───────────────────────────────────────────
// El cierre automático por inactividad (15 min sin mouse/teclado) tiene
// sentido para "superadmin" y "analista": protege un puesto de trabajo del
// que alguien se aleja. Pero para el rol "visualizacion" — la cuenta
// pensada para quedar abierta en el TV de la sala de monitoreo — ese mismo
// timeout es un bug: nadie va a estar tocando el mouse para que la pantalla
// de monitoreo no se cierre sola. Por eso esa cuenta NO tiene timer de
// inactividad: la sesión se mantiene mientras el navegador siga abierto,
// renovándose sola en segundo plano (ver REFRESH_INTERVALO_MS más abajo).
// ─────────────────────────────────────────────────────────────────────────────

const INACTIVIDAD_LIMITE_MS = 15 * 60 * 1000; // 15 minutos sin actividad → fuera
const REFRESH_INTERVALO_MS  = 5  * 60 * 1000; // Renovar el token cada 5 minutos

function tokenExpirado(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || (Date.now() / 1000) >= payload.exp;
  } catch {
    return true;
  }
}

function obtenerToken() {
  return sessionStorage.getItem('nvr_token');
}

function obtenerUsuario() {
  try {
    return JSON.parse(sessionStorage.getItem('nvr_usuario')) || null;
  } catch {
    return null;
  }
}

function esRolVisualizacion() {
  return obtenerUsuario()?.rol === 'visualizacion';
}

// ── ¿El usuario logueado tiene este permiso? ──────────────────────────────────
// El súper administrador siempre tiene acceso a todo, sin importar lo que
// diga el arreglo de permisos. Se usa para mostrar/ocultar botones y
// secciones según el rol — la protección real sigue estando en el backend,
// esto es solo para que la interfaz no muestre cosas que de todas formas
// el servidor va a rechazar.
function tienePermiso(clave) {
  const usuario = obtenerUsuario();
  if (!usuario) return false;
  if (usuario.rol === 'superadmin') return true;
  return Array.isArray(usuario.permisos) && usuario.permisos.includes(clave);
}

function guardarSesion(token, usuario) {
  sessionStorage.setItem('nvr_token', token);
  if (usuario) sessionStorage.setItem('nvr_usuario', JSON.stringify(usuario));
}

function cerrarSesion() {
  sessionStorage.removeItem('nvr_token');
  sessionStorage.removeItem('nvr_usuario');
  window.location.replace('login.html');
}

// ── Verificación inmediata al cargar el dashboard ─────────────────────────────
(function protegerPagina() {
  const token = obtenerToken();
  if (!token || tokenExpirado(token)) {
    cerrarSesion();
  }
})();

// ── fetch() con el header Authorization ya incluido ───────────────────────────
// Si el backend responde 401 (token inválido, expirado, o el servidor se
// reinició con una clave nueva), cierra la sesión y manda de vuelta al login.
async function authFetch(url, opciones = {}) {
  const token = obtenerToken();
  const headers = { ...(opciones.headers || {}), Authorization: `Bearer ${token}` };
  const res = await fetch(url, { ...opciones, headers });

  if (res.status === 401) {
    cerrarSesion();
    throw new Error('Sesión expirada');
  }
  return res;
}

// ── Cierre automático por inactividad (15 minutos) ────────────────────────────
// Cualquier interacción del operador reinicia el contador. Si pasan 15 minutos
// sin mouse, teclado, clics ni scroll, se cierra la sesión automáticamente,
// sin importar si el token JWT seguía siendo técnicamente válido.
//
// EXCEPCIÓN: el rol "visualizacion" (la cuenta del TV) nunca activa este
// timer — ver la nota al inicio del archivo.
let timerInactividad = null;

function reiniciarTimerInactividad() {
  if (esRolVisualizacion()) return; // El TV nunca se autodesloguea por inactividad
  if (timerInactividad) clearTimeout(timerInactividad);
  timerInactividad = setTimeout(cerrarSesion, INACTIVIDAD_LIMITE_MS);
}

if (!esRolVisualizacion()) {
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evento => {
    document.addEventListener(evento, reiniciarTimerInactividad, { passive: true });
  });
  reiniciarTimerInactividad();
}

// ── Sesión deslizante: renovar el token mientras la pestaña siga abierta ─────
// Corre siempre, sin importar el rol ni la actividad física: es lo que
// mantiene viva la sesión del TV indefinidamente (mientras el navegador
// siga abierto), y lo que evita que a un analista activo lo boten en plena
// jornada aunque el timer de inactividad de arriba sea independiente de esto.
setInterval(async () => {
  const token = obtenerToken();
  if (!token || tokenExpirado(token)) return; // protegerPagina/authFetch ya se encargan

  try {
    const res = await fetch('/api/auth/refresh', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      guardarSesion(data.token);
    }
  } catch {
    // Sin conexión momentánea: no pasa nada, se reintenta en el próximo ciclo
  }
}, REFRESH_INTERVALO_MS);