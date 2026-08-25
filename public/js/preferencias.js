// ── Preferencias funcionales (Notificaciones en pantalla) ────────────────────
// Mismo patrón que js/tema.js: se guarda en localStorage (por equipo, no por
// sesión) para que cualquier página pueda leerla sin depender de que "Mi
// Perfil" esté abierto. Por defecto está ACTIVA — el modelo es "opt-out":
// quien no ha tocado nada sigue viendo las alertas exactamente como antes de
// que existiera este ajuste.
//
// Controla únicamente los toasts emergentes de NVR/cámara caído-recuperado
// (ver mostrarAlertas() en js/app.js). NO oculta los toasts de confirmación
// de acciones (ej. "Usuario creado") — esos son respuesta directa a algo que
// la persona acaba de hacer, no una alerta del sistema. Tampoco afecta el
// estado en vivo de las tarjetas de NVR/cámaras: esa cuadrícula es
// información de seguridad y siempre se mantiene actualizada, sin ninguna
// preferencia que la pueda apagar.
function notificacionesActivas() {
  return localStorage.getItem('nvr_notificaciones') !== 'desactivadas';
}
function establecerNotificaciones(activas) {
  localStorage.setItem('nvr_notificaciones', activas ? 'activadas' : 'desactivadas');
}