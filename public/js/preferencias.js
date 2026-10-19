// ── Preferencias funcionales (Notificaciones en pantalla) ────────────────────
// Mismo patrón que js/tema.js: se guarda en localStorage (por equipo, no por
// sesión) para que cualquier página pueda leerla sin depender de que "Mi
// Perfil" esté abierto. Por defecto está ACTIVA — el modelo es "opt-out":
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
// Ojo: localStorage es POR NAVEGADOR Y POR DIRECCIÓN. Si se apaga entrando por
// http://localhost:3000, no se apaga en http://172.30.29.170:3000 ni en otro
// equipo (por ejemplo, el de la TV): ahí hay que apagarlo por separado.
function notificacionesActivas() {
  return localStorage.getItem('nvr_notificaciones') !== 'desactivadas';
}
function establecerNotificaciones(activas) {
  localStorage.setItem('nvr_notificaciones', activas ? 'activadas' : 'desactivadas');
}