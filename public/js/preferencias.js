// ── Preferencias funcionales (Notificaciones en pantalla) ────────────────────
// Mismo patrón que js/tema.js: la copia local vive en localStorage para que
// cualquier página pueda leerla sin depender de que "Mi Perfil" esté abierto. Por defecto está ACTIVA — el modelo es "opt-out":
// quien no ha tocado nada sigue viendo las alertas exactamente como antes de
// que existiera este ajuste.
//
// Controla DOS cosas del dashboard (ver js/app.js): los recuadros emergentes
// de NVR/cámara caído-recuperado (mostrarAlertas) y la barra de "Incidente de
// red en curso" (actualizarBannerIncidente). NO oculta los toasts de
// confirmación de acciones (ej. "Usuario creado") — esos son respuesta directa
// a algo que la persona acaba de hacer, no una alerta del sistema. Tampoco
// afecta el estado en vivo de las tarjetas, los contadores, el historial ni
// los avisos de Telegram: esa información de seguridad siempre se mantiene
// actualizada, sin ninguna preferencia que la pueda apagar.
//
// La preferencia se guarda en la CUENTA de cada usuario (ver js/auth-guard.js):
// sigue a la persona en cualquier equipo. localStorage es solo la copia local
// que lee el dashboard; se actualiza al iniciar sesión y al cargar cada página.
function notificacionesActivas() {
  return localStorage.getItem('nvr_notificaciones') !== 'desactivadas';
}
function establecerNotificaciones(activas) {
  localStorage.setItem('nvr_notificaciones', activas ? 'activadas' : 'desactivadas');
}