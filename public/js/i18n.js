// ── Sistema de idioma (i18n) ──────────────────────────────────────────────────
// Implementado con i18next (https://www.i18next.com), la librería estándar de
// la industria para internacionalización. Se carga por CDN como <script>
// normal (ver el <head> de cada página), igual que Notyf o Lucide.
//
// Arquitectura extensible: para agregar un idioma nuevo, solo hay que agregar
// su código a SUPPORTED_LNGS y su bloque de traducciones a RECURSOS. No hay
// que tocar ninguna otra parte del sistema.
//
// Cobertura: HTML estático (data-i18n) de las 4 páginas + prácticamente todo
// el contenido que genera JavaScript (toasts, diálogos de confirmación,
// filas de tablas, el modal de detalle de NVR, mensajes de error). Las
// traducciones se acceden desde cualquier .js con la función t('clave').

const SUPPORTED_LNGS = ['es', 'en'];

const RECURSOS = {
  es: { translation: {
    // ── Menú / encabezados ──────────────────────────────────────────────
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

    // ── Roles (usado en menú, Mi Perfil y Gestión de Usuarios) ───────────
    'roles.superadmin':      'Súper Administrador',
    'roles.analista':        'Analista',
    'roles.visualizacion':   'Visualización',

    // ── Login ─────────────────────────────────────────────────────────────
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
    'login.completaCampos':      'Completa usuario y contraseña.',
    'login.ingresando':          'Ingresando...',
    'login.noSePudoIniciar':     'No se pudo iniciar sesión.',
    'login.sinConexionIntenta':  'Sin conexión con el servidor. Intenta de nuevo.',
    'login.escribeUsuario':      'Escribe tu usuario para continuar.',
    'login.enviando':            'Enviando...',
    'login.noSePudoProcesar':    'No se pudo procesar la solicitud.',
    'login.seEnvioCodigo':       'Se envió un código a tu correo registrado.',
    'login.volverASolicitar':    'Vuelve a solicitar el código desde el paso anterior.',
    'login.escribeCodigo':       'Escribe el código de verificación.',
    'login.codigo6Digitos':      'El código debe tener 6 dígitos.',
    'login.escribeNuevaPassword':'Escribe tu nueva contraseña.',
    'login.confirmaPassword':    'Confirma tu nueva contraseña.',
    'login.passwordsNoCoinciden':'Las dos contraseñas no coinciden.',
    'login.verificando':         'Verificando...',
    'login.codigoInvalido':      'Código inválido o expirado.',

    // ── Mi Perfil ─────────────────────────────────────────────────────────
    'perfil.preferencias':   'Preferencias de Interfaz',
    'pref.tema':             'Modo de tema',
    'pref.idioma':           'Idioma',
    'pref.notificaciones':   'Notificaciones en pantalla',

    'perfil.infoCuenta':          'Información de la cuenta',
    'perfil.rol':                 'Rol',
    'perfil.permisos':            'Permisos',
    'perfil.correoRegistrado':    'Correo registrado',
    'perfil.sinRegistrar':        'Sin registrar',
    'perfil.correoRecuperacion':  'Correo de recuperación',
    'perfil.correoRecuperacionDesc': 'Se usa únicamente si necesitas recuperar tu contraseña desde el login. El súper administrador no tiene acceso a este dato.',
    'perfil.correoPersonal':      'Correo personal',
    'perfil.actualizarCorreo':    'Actualizar correo',
    'perfil.guardarCorreo':       'Guardar correo',
    'perfil.guardando':           'Guardando...',
    'perfil.historialSesiones':   'Historial de Inicios de Sesión',
    'perfil.thUsuario':           'Usuario',
    'perfil.thIP':                'IP',
    'perfil.thFecha':             'Fecha y hora',
    'perfil.cargando':            'Cargando...',
    'perfil.noHayHistorial':      'Todavía no hay inicios de sesión registrados.',
    'perfil.errorHistorial':      'No se pudo cargar el historial.',
    'perfil.sinConexion':         'Sin conexión con el servidor.',
    'perfil.todosSuperAdmin':     'Todos (súper administrador)',
    'perfil.ningunPermiso':       'Ninguno — solo puede ver el dashboard',
    'perfil.errorCargarPerfil':   'No se pudo cargar tu perfil.',
    'perfil.correoValido':        'Escribe un correo válido, por ejemplo: nombre@dominio.com',
    'perfil.errorGuardarCorreo':  'No se pudo guardar el correo.',
    'perfil.correoActualizado':   'Correo actualizado.',
    'perfil.correoGuardado':      'Correo guardado.',
    'perfil.sinConexionIntenta':  'Sin conexión con el servidor. Intenta de nuevo.',
    'perfil.enLinea':             'En Línea',
    'perfil.iniciando':           'Iniciando...',
    'perfil.fueraLinea':          'Fuera de Línea',
    'perfil.activos':             'Activos',
    'perfil.estadoVivo':          'Estado de Monitoreo en Vivo',
    'perfil.estadoServidor':      'Estado Servidor',
    'perfil.latenciaRed':         'Latencia de Red',
    'perfil.tiempoSesion':        'Tiempo de Sesión',
    'perfil.nvrsConectados':      'NVRs Conectados',

    // ── Confirmaciones genéricas (confirm.js) ────────────────────────────
    'confirm.cancelar':              'Cancelar',
    'confirm.confirmarDefault':      'Confirmar',
    'confirm.nuevaPassword':         'Nueva contraseña',
    'confirm.confirmarPasswordLabel':'Confirmar contraseña',
    'confirm.passwordPlaceholder':   'Mínimo 8 caracteres',
    'confirm.repetirPlaceholder':    'Repite la contraseña',
    'confirm.passwordsNoCoinciden':  'Las contraseñas no coinciden.',
    'confirm.cerrarSesionTitulo':    '¿Cerrar sesión?',
    'confirm.cerrarSesionMensaje':   'Vas a salir del sistema y vas a necesitar volver a iniciar sesión para entrar de nuevo.',
    'confirm.siCerrarSesion':        'Sí, cerrar sesión',

    // ── Gestión de Usuarios ───────────────────────────────────────────────
    'usuarios.tituloSeccion':'Usuarios del sistema',
    'usuarios.crear':        'Crear usuario',
    'usuarios.thUsuario':    'Usuario',
    'usuarios.thNombre':     'Nombre',
    'usuarios.thRol':        'Rol',
    'usuarios.thPermisos':   'Permisos',
    'usuarios.thEstado':     'Estado',
    'usuarios.thAcceso':     'Último acceso',
    'usuarios.nunca':        'Nunca',
    'usuarios.activo':       'Activo',
    'usuarios.inactivo':     'Inactivo',
    'usuarios.cargando':          'Cargando usuarios...',
    'usuarios.errorCargar':       'No se pudo cargar la lista de usuarios.',
    'usuarios.noHayUsuarios':     'No hay usuarios registrados.',
    'usuarios.todosSuperAdmin':   'Todos (súper admin)',
    'usuarios.ningunPermiso':     'Ninguno',
    'usuarios.crearTitulo':       'Crear usuario',
    'usuarios.editarTitulo':      'Editar {{nombre}}',
    'usuarios.cambiarUsername':   'Cambiar nombre de usuario',
    'usuarios.bloquearDeNuevo':   'Bloquear de nuevo (descartar el cambio)',
    'usuarios.noHayPermisosConfigurados': 'No hay permisos configurados todavía.',
    'usuarios.ningunPermisoSel':  'Ningún permiso seleccionado',
    'usuarios.permisosSeleccionados_one':   '{{count}} permiso seleccionado',
    'usuarios.permisosSeleccionados_other': '{{count}} permisos seleccionados',
    'usuarios.editar':            'Editar',
    'usuarios.cambiarPasswordTitle': 'Cambiar contraseña',
    'usuarios.desactivar':        'Desactivar',
    'usuarios.activar':           'Activar',
    'usuarios.eliminarDefinitivamente': 'Eliminar definitivamente',
    'usuarios.contrasenaInicial': 'Contraseña inicial',
    'usuarios.notaPassword':      'La persona podrá cambiarla luego desde "olvidé mi contraseña", si registra su correo en Mi Perfil.',
    'usuarios.rolVisualizacion':  'Visualización (pantalla / TV)',
    'usuarios.cargandoPermisos':  'Cargando permisos...',
    'usuarios.nombreObligatorio': 'El nombre completo es obligatorio.',
    'usuarios.usuarioObligatorio':'El usuario es obligatorio.',
    'usuarios.usuarioVacio':      'El usuario no puede quedar vacío.',
    'usuarios.cambiarUsernameTitulo':  '¿Cambiar el nombre de usuario?',
    'usuarios.cambiarUsernameMensaje': 'Vas a cambiar el usuario de "{{anterior}}" a "{{nuevo}}". Deberá iniciar sesión con el usuario nuevo la próxima vez.',
    'usuarios.cambiarUsuarioBtn': 'Cambiar usuario',
    'usuarios.guardando':         'Guardando...',
    'usuarios.guardar':           'Guardar',
    'usuarios.errorGuardarUsuario': 'No se pudo guardar el usuario.',
    'usuarios.actualizado':       'Usuario actualizado.',
    'usuarios.creado':            'Usuario creado correctamente.',
    'usuarios.sinConexionIntenta':'Sin conexión con el servidor. Intenta de nuevo.',
    'usuarios.nuevaPasswordPara': 'Nueva contraseña para {{username}}',
    'usuarios.cambiar':           'Cambiar',
    'usuarios.confirmarCambioPassTitulo':  '¿Confirmar cambio de contraseña?',
    'usuarios.confirmarCambioPassMensaje': 'Vas a cambiar la contraseña de {{username}}. Deberá usar la nueva contraseña la próxima vez que inicie sesión.',
    'usuarios.cambiarContrasena': 'Cambiar contraseña',
    'usuarios.errorCambiarPassword': 'No se pudo cambiar la contraseña.',
    'usuarios.passwordActualizada':  '{{username}} actualizó su contraseña.',
    'usuarios.sinConexion':       'Sin conexión con el servidor.',
    'usuarios.desactivarTitulo':  '¿Desactivar a {{username}}?',
    'usuarios.activarTitulo':     '¿Activar a {{username}}?',
    'usuarios.desactivarMensaje': 'No podrá iniciar sesión hasta que lo actives de nuevo. No se borra su historial ni sus datos.',
    'usuarios.activarMensaje':    'Podrá volver a iniciar sesión normalmente, con los mismos permisos que tenía.',
    'usuarios.siDesactivar':      'Sí, desactivar',
    'usuarios.siActivar':         'Sí, activar',
    'usuarios.errorEstado':       'No se pudo actualizar el estado.',
    'usuarios.fueDesactivado':    '{{username}} fue desactivado.',
    'usuarios.fueActivado':       '{{username}} fue activado.',
    'usuarios.eliminarTitulo':    '¿Eliminar a {{username}} permanentemente?',
    'usuarios.eliminarMensaje':   'Esta acción no se puede deshacer — se borra la cuenta por completo. Si solo está de vacaciones o con licencia, usa "Desactivar" en su lugar.',
    'usuarios.eliminar':          'Eliminar',
    'usuarios.errorEliminar':     'No se pudo eliminar el usuario.',
    'usuarios.fueEliminado':      '{{username}} fue eliminado permanentemente.',

    // ── Dashboard ─────────────────────────────────────────────────────────
    'dashboard.nvrsRespondiendo':  'NVRs Respondiendo',
    'dashboard.nvrsCaidos':        'NVRs Caídos',
    'dashboard.camarasCaidas':     'Cámaras Caídas',
    'dashboard.dispositivosRegistrados': 'Dispositivos Registrados',
    'dashboard.seguridadFisica':   'Seguridad Física',
    'dashboard.seguridadPaciente': 'Seguridad Paciente',
    'dashboard.historialEventos':  'Historial de Eventos',
    'dashboard.buscarPlaceholder': 'Buscar por IP o nombre...',
    'dashboard.fechas':            'Fechas',
    'dashboard.seleccionarRango':  'Seleccionar rango...',
    'dashboard.hora':              'Hora',
    'dashboard.todas':             'Todas',
    'dashboard.estado':            'Estado',
    'dashboard.todos':             'Todos',
    'dashboard.caida':             'Caída',
    'dashboard.recuperado':        'Recuperado',
    'dashboard.tipo':              'Tipo',
    'dashboard.nvr':               'NVR',
    'dashboard.camara':            'Cámara',
    'dashboard.limpiar':           'Limpiar',
    'dashboard.exportar':          'Exportar',
    'dashboard.generando':         'Generando...',
    'dashboard.thFechaHora':       'Fecha / Hora',
    'dashboard.thDispositivo':     'Dispositivo',
    'dashboard.thIP':              'IP',
    'dashboard.thNVR':             'NVR',
    'dashboard.thTipo':            'Tipo',
    'dashboard.thEstado':          'Estado',
    'dashboard.cargandoHistorial': 'Cargando historial...',
    'dashboard.sinResultados':     'Sin resultados para los filtros aplicados',
    'dashboard.ejecutandoChequeo': 'Ejecutando primer chequeo...',
    'dashboard.iniciandoChequeo':  'Iniciando primer chequeo...',
    'dashboard.sinConexionServidor': 'Sin conexion con el servidor',
    'dashboard.ultimaActualizacion': 'Última actualización: {{fecha}}',
    'dashboard.sinConexionReconectando': 'Sin conexión con el servidor — reconectando...',
    'dashboard.resultados_one':    '{{count}} resultado',
    'dashboard.resultados_other':  '{{count}} resultados',
    'dashboard.eventos_one':       '{{count}} evento',
    'dashboard.eventos_other':     '{{count}} eventos',
    'dashboard.incidenteTitulo':   'Incidente de red en curso',
    'dashboard.incidenteDetalle':  '{{nvrs}} NVR(s) y {{camaras}} cámara(s) caídas — revisa las tarjetas abajo',
    'dashboard.inestableTitle':    'Inestable: varios cambios de estado seguidos',
    'dashboard.camarasCaidasEnNVR':'{{n}} cámara(s) caída(s) en este NVR',
    'dashboard.errorExportar':     'No se pudo generar el archivo de exportación.',

    'dashboard.modalActivo':       'Activo',
    'dashboard.modalDegradado':    'Degradado',
    'dashboard.modalCaido':        'Caído',
    'dashboard.modalInestable':    'Inestable',
    'dashboard.modalCaidasSesion': 'Caídas esta sesión (NVR):',
    'dashboard.modalCamarasCaidas':'Cámaras caídas:',
    'dashboard.modalCamarasCaidasTexto': '{{caidas}} de {{total}}',
    'dashboard.abrirNVR':          'Abrir NVR en nueva pestaña',
    'dashboard.camarasRegistradas':'Cámaras registradas ({{n}})',
    'dashboard.sinCamaras':        'Sin cámaras registradas para este NVR.',
    'dashboard.agregalasEn':       'Agrégalas en',
    'dashboard.camaraActiva':      'Activa',
    'dashboard.camaraDegradada':   'Degradada',
    'dashboard.camaraCaida':       'Caída',

    'dashboard.nvrCaidoTitulo':        'NVR Caído',
    'dashboard.nvrRecuperadoTitulo':   'NVR Recuperado',
    'dashboard.camaraCaidaTitulo':     'Cámara Caída',
    'dashboard.camaraRecuperadaTitulo':'Cámara Recuperada',
    'dashboard.revisaTarjetas':        'Revisa las tarjetas y el historial',
    'dashboard.grupoNvrCaidos':        'NVR(s) caídos',
    'dashboard.grupoCamarasCaidas':    'cámara(s) caídas',
    'dashboard.grupoNvrRecuperados':   'NVR(s) recuperados',
    'dashboard.grupoCamarasRecuperadas':'cámara(s) recuperadas',

    'badge.nvr':       'NVR',
    'badge.camara':    'CÁMARA',
    'badge.caida':     'CAÍDA',
    'badge.recuperado':'RECUPERADO',

    'password.min8':      'Mínimo 8 caracteres',
    'password.mayuscula': 'Una letra mayúscula',
    'password.minuscula': 'Una letra minúscula',
    'password.numero':    'Un número',
    'password.especial':  'Un carácter especial (!@#$...)',
    'password.muyDebil':  'Muy débil',
    'password.debil':     'Débil',
    'password.regular':   'Regular',
    'password.buena':     'Buena',
    'password.fuerte':    'Fuerte',
    'password.falta':     'Falta: {{lista}}.',
    'password.escribePassword': 'Escribe una contraseña para ver su fortaleza.',
    'password.segura':    'Contraseña segura.'
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

    'roles.superadmin':      'Super Administrator',
    'roles.analista':        'Analyst',
    'roles.visualizacion':   'Viewer',

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
    'login.completaCampos':      'Fill in your username and password.',
    'login.ingresando':          'Signing in...',
    'login.noSePudoIniciar':     'Could not sign in.',
    'login.sinConexionIntenta':  'No connection to the server. Try again.',
    'login.escribeUsuario':      'Enter your username to continue.',
    'login.enviando':            'Sending...',
    'login.noSePudoProcesar':    'Could not process the request.',
    'login.seEnvioCodigo':       'A code was sent to your registered email.',
    'login.volverASolicitar':    'Go back and request the code again from the previous step.',
    'login.escribeCodigo':       'Enter the verification code.',
    'login.codigo6Digitos':      'The code must be 6 digits.',
    'login.escribeNuevaPassword':'Enter your new password.',
    'login.confirmaPassword':    'Confirm your new password.',
    'login.passwordsNoCoinciden':'The two passwords do not match.',
    'login.verificando':         'Verifying...',
    'login.codigoInvalido':      'Invalid or expired code.',

    'perfil.preferencias':   'Interface Preferences',
    'pref.tema':             'Theme mode',
    'pref.idioma':           'Language',
    'pref.notificaciones':   'On-screen notifications',

    'perfil.infoCuenta':          'Account information',
    'perfil.rol':                 'Role',
    'perfil.permisos':            'Permissions',
    'perfil.correoRegistrado':    'Registered email',
    'perfil.sinRegistrar':        'Not registered',
    'perfil.correoRecuperacion':  'Recovery email',
    'perfil.correoRecuperacionDesc': "Used only if you need to recover your password from the login screen. The super administrator doesn't have access to this data.",
    'perfil.correoPersonal':      'Personal email',
    'perfil.actualizarCorreo':    'Update email',
    'perfil.guardarCorreo':       'Save email',
    'perfil.guardando':           'Saving...',
    'perfil.historialSesiones':   'Login History',
    'perfil.thUsuario':           'User',
    'perfil.thIP':                'IP',
    'perfil.thFecha':             'Date & time',
    'perfil.cargando':            'Loading...',
    'perfil.noHayHistorial':      'No logins recorded yet.',
    'perfil.errorHistorial':      'Could not load the history.',
    'perfil.sinConexion':         'No connection to the server.',
    'perfil.todosSuperAdmin':     'All (super administrator)',
    'perfil.ningunPermiso':       'None — can only view the dashboard',
    'perfil.errorCargarPerfil':   'Could not load your profile.',
    'perfil.correoValido':        'Enter a valid email, e.g.: name@domain.com',
    'perfil.errorGuardarCorreo':  'Could not save the email.',
    'perfil.correoActualizado':   'Email updated.',
    'perfil.correoGuardado':      'Email saved.',
    'perfil.sinConexionIntenta':  'No connection to the server. Try again.',
    'perfil.enLinea':             'Online',
    'perfil.iniciando':           'Starting...',
    'perfil.fueraLinea':          'Offline',
    'perfil.activos':             'Active',
    'perfil.estadoVivo':          'Live Monitoring Status',
    'perfil.estadoServidor':      'Server Status',
    'perfil.latenciaRed':         'Network Latency',
    'perfil.tiempoSesion':        'Session Time',
    'perfil.nvrsConectados':      'Connected NVRs',

    'confirm.cancelar':              'Cancel',
    'confirm.confirmarDefault':      'Confirm',
    'confirm.nuevaPassword':         'New password',
    'confirm.confirmarPasswordLabel':'Confirm password',
    'confirm.passwordPlaceholder':   'Minimum 8 characters',
    'confirm.repetirPlaceholder':    'Repeat the password',
    'confirm.passwordsNoCoinciden':  'The passwords do not match.',
    'confirm.cerrarSesionTitulo':    'Log out?',
    'confirm.cerrarSesionMensaje':   'You will be logged out and will need to sign in again to continue.',
    'confirm.siCerrarSesion':        'Yes, log out',

    'usuarios.tituloSeccion':'System users',
    'usuarios.crear':        'Create user',
    'usuarios.thUsuario':    'Username',
    'usuarios.thNombre':     'Name',
    'usuarios.thRol':        'Role',
    'usuarios.thPermisos':   'Permissions',
    'usuarios.thEstado':     'Status',
    'usuarios.thAcceso':     'Last access',
    'usuarios.nunca':        'Never',
    'usuarios.activo':       'Active',
    'usuarios.inactivo':     'Inactive',
    'usuarios.cargando':          'Loading users...',
    'usuarios.errorCargar':       'Could not load the user list.',
    'usuarios.noHayUsuarios':     'No users registered.',
    'usuarios.todosSuperAdmin':   'All (super admin)',
    'usuarios.ningunPermiso':     'None',
    'usuarios.crearTitulo':       'Create user',
    'usuarios.editarTitulo':      'Edit {{nombre}}',
    'usuarios.cambiarUsername':   'Change username',
    'usuarios.bloquearDeNuevo':   'Lock again (discard the change)',
    'usuarios.noHayPermisosConfigurados': 'No permissions configured yet.',
    'usuarios.ningunPermisoSel':  'No permission selected',
    'usuarios.permisosSeleccionados_one':   '{{count}} permission selected',
    'usuarios.permisosSeleccionados_other': '{{count}} permissions selected',
    'usuarios.editar':            'Edit',
    'usuarios.cambiarPasswordTitle': 'Change password',
    'usuarios.desactivar':        'Deactivate',
    'usuarios.activar':           'Activate',
    'usuarios.eliminarDefinitivamente': 'Delete permanently',
    'usuarios.contrasenaInicial': 'Initial password',
    'usuarios.notaPassword':      'They\'ll be able to change it later from "forgot my password", if they register their email in My Profile.',
    'usuarios.rolVisualizacion':  'Viewer (screen / TV)',
    'usuarios.cargandoPermisos':  'Loading permissions...',
    'usuarios.nombreObligatorio': 'Full name is required.',
    'usuarios.usuarioObligatorio':'Username is required.',
    'usuarios.usuarioVacio':      'Username cannot be empty.',
    'usuarios.cambiarUsernameTitulo':  'Change the username?',
    'usuarios.cambiarUsernameMensaje': 'You are about to change the username from "{{anterior}}" to "{{nuevo}}". They will need to sign in with the new username next time.',
    'usuarios.cambiarUsuarioBtn': 'Change username',
    'usuarios.guardando':         'Saving...',
    'usuarios.guardar':           'Save',
    'usuarios.errorGuardarUsuario': 'Could not save the user.',
    'usuarios.actualizado':       'User updated.',
    'usuarios.creado':            'User created successfully.',
    'usuarios.sinConexionIntenta':'No connection to the server. Try again.',
    'usuarios.nuevaPasswordPara': 'New password for {{username}}',
    'usuarios.cambiar':           'Change',
    'usuarios.confirmarCambioPassTitulo':  'Confirm password change?',
    'usuarios.confirmarCambioPassMensaje': "You are about to change {{username}}'s password. They will need to use the new password the next time they sign in.",
    'usuarios.cambiarContrasena': 'Change password',
    'usuarios.errorCambiarPassword': 'Could not change the password.',
    'usuarios.passwordActualizada':  "{{username}}'s password was updated.",
    'usuarios.sinConexion':       'No connection to the server.',
    'usuarios.desactivarTitulo':  'Deactivate {{username}}?',
    'usuarios.activarTitulo':     'Activate {{username}}?',
    'usuarios.desactivarMensaje': 'They will not be able to sign in until you activate them again. Their history and data are not deleted.',
    'usuarios.activarMensaje':    'They will be able to sign in normally again, with the same permissions as before.',
    'usuarios.siDesactivar':      'Yes, deactivate',
    'usuarios.siActivar':         'Yes, activate',
    'usuarios.errorEstado':       'Could not update the status.',
    'usuarios.fueDesactivado':    '{{username}} was deactivated.',
    'usuarios.fueActivado':       '{{username}} was activated.',
    'usuarios.eliminarTitulo':    'Delete {{username}} permanently?',
    'usuarios.eliminarMensaje':   'This action cannot be undone — the account will be completely deleted. If they are just on vacation or leave, use "Deactivate" instead.',
    'usuarios.eliminar':          'Delete',
    'usuarios.errorEliminar':     'Could not delete the user.',
    'usuarios.fueEliminado':      '{{username}} was permanently deleted.',

    'dashboard.nvrsRespondiendo':  'NVRs Responding',
    'dashboard.nvrsCaidos':        'NVRs Down',
    'dashboard.camarasCaidas':     'Cameras Down',
    'dashboard.dispositivosRegistrados': 'Registered Devices',
    'dashboard.seguridadFisica':   'Physical Security',
    'dashboard.seguridadPaciente': 'Patient Security',
    'dashboard.historialEventos':  'Event History',
    'dashboard.buscarPlaceholder': 'Search by IP or name...',
    'dashboard.fechas':            'Dates',
    'dashboard.seleccionarRango':  'Select range...',
    'dashboard.hora':              'Time',
    'dashboard.todas':             'All',
    'dashboard.estado':            'Status',
    'dashboard.todos':             'All',
    'dashboard.caida':             'Down',
    'dashboard.recuperado':        'Recovered',
    'dashboard.tipo':              'Type',
    'dashboard.nvr':               'NVR',
    'dashboard.camara':            'Camera',
    'dashboard.limpiar':           'Clear',
    'dashboard.exportar':          'Export',
    'dashboard.generando':         'Generating...',
    'dashboard.thFechaHora':       'Date / Time',
    'dashboard.thDispositivo':     'Device',
    'dashboard.thIP':              'IP',
    'dashboard.thNVR':             'NVR',
    'dashboard.thTipo':            'Type',
    'dashboard.thEstado':          'Status',
    'dashboard.cargandoHistorial': 'Loading history...',
    'dashboard.sinResultados':     'No results for the applied filters',
    'dashboard.ejecutandoChequeo': 'Running first check...',
    'dashboard.iniciandoChequeo':  'Starting first check...',
    'dashboard.sinConexionServidor': 'No connection to the server',
    'dashboard.ultimaActualizacion': 'Last updated: {{fecha}}',
    'dashboard.sinConexionReconectando': 'No connection to the server — reconnecting...',
    'dashboard.resultados_one':    '{{count}} result',
    'dashboard.resultados_other':  '{{count}} results',
    'dashboard.eventos_one':       '{{count}} event',
    'dashboard.eventos_other':     '{{count}} events',
    'dashboard.incidenteTitulo':   'Network incident in progress',
    'dashboard.incidenteDetalle':  '{{nvrs}} NVR(s) and {{camaras}} camera(s) down — check the cards below',
    'dashboard.inestableTitle':    'Unstable: several consecutive state changes',
    'dashboard.camarasCaidasEnNVR':'{{n}} camera(s) down on this NVR',
    'dashboard.errorExportar':     'Could not generate the export file.',

    'dashboard.modalActivo':       'Active',
    'dashboard.modalDegradado':    'Degraded',
    'dashboard.modalCaido':        'Down',
    'dashboard.modalInestable':    'Unstable',
    'dashboard.modalCaidasSesion': 'Drops this session (NVR):',
    'dashboard.modalCamarasCaidas':'Cameras down:',
    'dashboard.modalCamarasCaidasTexto': '{{caidas}} of {{total}}',
    'dashboard.abrirNVR':          'Open NVR in new tab',
    'dashboard.camarasRegistradas':'Registered cameras ({{n}})',
    'dashboard.sinCamaras':        'No cameras registered for this NVR.',
    'dashboard.agregalasEn':       'Add them in',
    'dashboard.camaraActiva':      'Active',
    'dashboard.camaraDegradada':   'Degraded',
    'dashboard.camaraCaida':       'Down',

    'dashboard.nvrCaidoTitulo':        'NVR Down',
    'dashboard.nvrRecuperadoTitulo':   'NVR Recovered',
    'dashboard.camaraCaidaTitulo':     'Camera Down',
    'dashboard.camaraRecuperadaTitulo':'Camera Recovered',
    'dashboard.revisaTarjetas':        'Check the cards and the history',
    'dashboard.grupoNvrCaidos':        'NVR(s) down',
    'dashboard.grupoCamarasCaidas':    'camera(s) down',
    'dashboard.grupoNvrRecuperados':   'NVR(s) recovered',
    'dashboard.grupoCamarasRecuperadas':'camera(s) recovered',

    'badge.nvr':       'NVR',
    'badge.camara':    'CAMERA',
    'badge.caida':     'DOWN',
    'badge.recuperado':'RECOVERED',

    'password.min8':      'Minimum 8 characters',
    'password.mayuscula': 'One uppercase letter',
    'password.minuscula': 'One lowercase letter',
    'password.numero':    'One number',
    'password.especial':  'One special character (!@#$...)',
    'password.muyDebil':  'Very weak',
    'password.debil':     'Weak',
    'password.regular':   'Fair',
    'password.buena':     'Good',
    'password.fuerte':    'Strong',
    'password.falta':     'Missing: {{lista}}.',
    'password.escribePassword': 'Type a password to see its strength.',
    'password.segura':    'Strong password.'
  }}
};

// ── Inicializar i18next con el plugin de detección/persistencia en navegador ──
i18next
  .use(i18nextBrowserLanguageDetector)
  .init({
    fallbackLng:    'es',
    supportedLngs:  SUPPORTED_LNGS,
    resources:      RECURSOS,
    // i18next escapa por defecto caracteres como / < > " ' dentro de los
    // valores interpolados (ej. {{fecha}}), pensado para cuando el texto
    // se inserta con innerHTML. Acá TODO se pinta con textContent (nunca
    // innerHTML con datos interpolados), así que ese escape no protege nada
    // y solo ensuciaba fechas como "28/8/2026" mostrando "28&#x2F;8&#x2F;2026".
    interpolation: { escapeValue: false },
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
function t(clave, opciones) {
  return i18next.t(clave, opciones);
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

  // Flatpickr (selector de rango de fechas del dashboard): cambia su propio
  // idioma (nombres de mes/día) sin recargar la página. flatpickr.l10ns.es
  // lo trae el script es.js que ya carga index.html; si el idioma activo no
  // es español, usa el inglés por defecto de la librería.
  if (window.flatpickr && typeof rangoPicker !== 'undefined' && rangoPicker) {
    const locale = obtenerIdioma() === 'es' ? flatpickr.l10ns.es : flatpickr.l10ns.default;
    rangoPicker.set('locale', locale);
  }

  // Vuelve a pintar cualquier contenido ya generado por JavaScript (tablas,
  // tarjetas de NVR, badges de rol...) para que no se quede en el idioma
  // anterior hasta el siguiente refresco de datos. Cada página registra su
  // propia función con registrarRepintado(fn) — puede haber varias.
  _callbacksRepintado.forEach(fn => fn());
}

const _callbacksRepintado = [];
function registrarRepintado(fn) {
  _callbacksRepintado.push(fn);
}

// Los elementos [data-i18n] tienen que existir en el DOM antes de traducirlos
document.addEventListener('DOMContentLoaded', () => aplicarIdioma());