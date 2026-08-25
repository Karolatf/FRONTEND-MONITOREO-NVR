// ── Sistema de idioma (i18n) ──────────────────────────────────────────────────
// Implementado con i18next (https://www.i18next.com), la librería estándar de
// la industria para internacionalización — la misma familia de herramientas
// que usan sitios profesionales para poder cambiar el idioma de toda la app.
// Se carga por CDN como <script> normal (ver el <head> de cada página), igual
// que Notyf o Lucide en este proyecto — no hace falta bundler ni build.
//
// Piezas:
//  - i18next               → el motor de traducción (i18next.t(), .changeLanguage()...)
//  - i18next-browser-languagedetector → detecta y GUARDA el idioma elegido en
//    localStorage automáticamente (clave "nvr_idioma"), sin código propio de
//    persistencia.
//
// Arquitectura extensible: para agregar un idioma nuevo, solo hay que:
//   1. Agregar su código a SUPPORTED_LNGS.
//   2. Agregar su bloque de traducciones a RECURSOS.
// No hay que tocar ninguna otra parte del sistema.
//
// Cobertura actual: encabezado y menú lateral (compartidos por todas las
// páginas), login completo, y la tarjeta "Preferencias de Interfaz" de Mi
// Perfil. El contenido generado dinámicamente por JavaScript (toasts,
// diálogos de confirmación, filas de tablas) todavía se muestra en español —
// traducirlo es un siguiente paso, ya que implica tocar los textos dentro de
// cada archivo .js, no solo el HTML.

const SUPPORTED_LNGS = ['es', 'en'];

const RECURSOS = {
  es: { translation: {
    'menu.dashboard':        'Dashboard',
    'menu.usuarios':         'Gestión de Usuarios',
    'menu.perfil':           'Mi Perfil',
    'menu.cerrarSesion':     'Cerrar sesión',

    'header.perfilTitulo':   'Mi Perfil',
    'header.perfilSub':      'NVR Monitor — HIC',
    'header.dashboardTitulo':'NVR Monitor',
    'header.dashboardSub':   'Sistema de Monitoreo en Tiempo Real — HIC',
    'header.actualizar':     'Actualizar',
    'header.usuariosTitulo': 'Gestión de Usuarios',
    'header.usuariosSub':    'Súper Administrador — NVR Monitor HIC',

    'usuarios.tituloSeccion':'Usuarios del sistema',
    'usuarios.crear':        'Crear usuario',
    'usuarios.thUsuario':    'Usuario',
    'usuarios.thNombre':     'Nombre',
    'usuarios.thRol':        'Rol',
    'usuarios.thPermisos':   'Permisos',
    'usuarios.thEstado':     'Estado',
    'usuarios.thAcceso':     'Último acceso',

    'login.subtitulo':       'Acceso restringido — Infraestructura de Telecomunicaciones',
    'login.usuario':         'Usuario',
    'login.contrasena':      'Contraseña',
    'login.ingresar':        'Ingresar',
    'login.olvidaste':       '¿Olvidaste tu contraseña?',
    'login.footnote':        'Acceso exclusivo para administradores de red autorizados. Fundación Cardiovascular de Colombia — HIC.',
    'login.recuperarTitulo': 'Recuperar contraseña',
    'login.recuperarSub':    'Te enviaremos un código de 6 dígitos al correo personal que tengas registrado en "Mi Perfil". Válido por 15 minutos.',
    'login.enviarCodigo':    'Enviar código',
    'login.volverLogin':     '← Volver a iniciar sesión',
    'login.codigoTitulo':    'Ingresa el código',
    'login.codigoSub':       'Revisa tu correo y escribe el código de 6 dígitos, junto con tu nueva contraseña.',
    'login.codigo':          'Código de verificación',
    'login.nuevaContrasena': 'Nueva contraseña',
    'login.confirmarContrasena': 'Confirmar nueva contraseña',
    'login.cambiarContrasena':   'Cambiar contraseña',
    'login.noLlego':         '¿No te llegó? Solicitar de nuevo',

    'perfil.preferencias':   'Preferencias de Interfaz',
    'pref.tema':             'Modo de tema',
    'pref.idioma':           'Idioma',
    'pref.notificaciones':   'Notificaciones en pantalla'
  }},
  en: { translation: {
    'menu.dashboard':        'Dashboard',
    'menu.usuarios':         'User Management',
    'menu.perfil':           'My Profile',
    'menu.cerrarSesion':     'Log out',

    'header.perfilTitulo':   'My Profile',
    'header.perfilSub':      'NVR Monitor — HIC',
    'header.dashboardTitulo':'NVR Monitor',
    'header.dashboardSub':   'Real-Time Monitoring System — HIC',
    'header.actualizar':     'Refresh',
    'header.usuariosTitulo': 'User Management',
    'header.usuariosSub':    'Super Administrator — NVR Monitor HIC',

    'usuarios.tituloSeccion':'System users',
    'usuarios.crear':        'Create user',
    'usuarios.thUsuario':    'Username',
    'usuarios.thNombre':     'Name',
    'usuarios.thRol':        'Role',
    'usuarios.thPermisos':   'Permissions',
    'usuarios.thEstado':     'Status',
    'usuarios.thAcceso':     'Last access',

    'login.subtitulo':       'Restricted access — Telecommunications Infrastructure',
    'login.usuario':         'Username',
    'login.contrasena':      'Password',
    'login.ingresar':        'Sign in',
    'login.olvidaste':       'Forgot your password?',
    'login.footnote':        'Exclusive access for authorized network administrators. Fundación Cardiovascular de Colombia — HIC.',
    'login.recuperarTitulo': 'Recover password',
    'login.recuperarSub':    'We\'ll send a 6-digit code to the personal email registered in "My Profile". Valid for 15 minutes.',
    'login.enviarCodigo':    'Send code',
    'login.volverLogin':     '← Back to sign in',
    'login.codigoTitulo':    'Enter the code',
    'login.codigoSub':       'Check your email and enter the 6-digit code, along with your new password.',
    'login.codigo':          'Verification code',
    'login.nuevaContrasena': 'New password',
    'login.confirmarContrasena': 'Confirm new password',
    'login.cambiarContrasena':   'Change password',
    'login.noLlego':         'Didn\'t get it? Request again',

    'perfil.preferencias':   'Interface Preferences',
    'pref.tema':             'Theme mode',
    'pref.idioma':           'Language',
    'pref.notificaciones':   'On-screen notifications'
  }}
};

// ── Inicializar i18next con el plugin de detección/persistencia en navegador ──
// order/caches: solo localStorage — no detecta por idioma del navegador, para
// que el idioma por defecto de la app (español) sea siempre predecible la
// primera vez que alguien entra, sin importar el idioma del sistema operativo.
i18next
  .use(i18nextBrowserLanguageDetector)
  .init({
    fallbackLng:    'es',
    supportedLngs:  SUPPORTED_LNGS,
    resources:      RECURSOS,
    detection: {
      order:              ['localStorage'],
      caches:             ['localStorage'],
      lookupLocalStorage: 'nvr_idioma'
    }
  })
  .then(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', aplicarIdioma);
    } else {
      aplicarIdioma();
    }
  });

// Cada vez que cambia el idioma (establecerIdioma), i18next dispara este
// evento — así toda la interfaz se vuelve a pintar sola.
i18next.on('languageChanged', aplicarIdioma);

// ── Helpers usados por el resto del proyecto ──────────────────────────────────
function obtenerIdioma() {
  return (i18next.language || 'es').split('-')[0];
}
function establecerIdioma(idioma) {
  if (!SUPPORTED_LNGS.includes(idioma)) return;
  i18next.changeLanguage(idioma);
}
function t(clave) {
  return i18next.t(clave);
}

// ── Aplicar el idioma actual a todo el DOM ────────────────────────────────────
function aplicarIdioma() {
  document.documentElement.setAttribute('lang', obtenerIdioma());

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
}