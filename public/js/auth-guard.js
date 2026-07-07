// ── Guarda de sesión del dashboard ────────────────────────────────────────────
// Debe cargarse ANTES que cualquier otro script, para redirigir de inmediato
// si no hay una sesión válida (evita que se llegue a ver el dashboard vacío).
//
// El token se guarda en sessionStorage (no localStorage): sessionStorage se
// borra automáticamente cuando se cierra la pestaña o la ventana, así que
// cerrar el navegador ya obliga a iniciar sesión de nuevo la próxima vez.
// Además, el servidor genera una clave de firma nueva cada vez que arranca,
// así que reiniciar el proceso (o Git Bash) invalida todas las sesiones.
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
let timerInactividad = null;

function reiniciarTimerInactividad() {
  if (timerInactividad) clearTimeout(timerInactividad);
  timerInactividad = setTimeout(cerrarSesion, INACTIVIDAD_LIMITE_MS);
}

['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evento => {
  document.addEventListener(evento, reiniciarTimerInactividad, { passive: true });
});
reiniciarTimerInactividad();

// ── Sesión deslizante: renovar el token mientras hay actividad ───────────────
// Si el operador sigue usando el dashboard, el token se renueva antes de
// expirar para que no lo boten en plena jornada. Si deja de haber actividad,
// el timer de inactividad de arriba ya lo saca a los 15 minutos de todos modos.
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