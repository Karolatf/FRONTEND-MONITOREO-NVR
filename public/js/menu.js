// ── Menú lateral (hamburguesa) ────────────────────────────────────────────────
// Se incluye en index.html, usuarios.html y perfil.html. Cada una de esas
// páginas trae el mismo bloque de HTML del menú (overlay + <nav>) — este
// script solo le da comportamiento: abrir/cerrar, pintar el usuario actual,
// y mostrar/ocultar "Gestión de Usuarios" según el rol.
(function inicializarMenu() {
  const btnAbrir  = document.getElementById('btn-menu');
  const btnCerrar = document.getElementById('btn-cerrar-menu');
  const overlay   = document.getElementById('menu-overlay');
  const menu      = document.getElementById('menu-lateral');
  const btnLogout = document.getElementById('btn-menu-logout');

  if (!menu) return; // Página sin menú (ej. login)

  const usuario = obtenerUsuario();
  if (usuario) {
    const nombreEl = document.getElementById('menu-usuario-nombre');
    const rolEl    = document.getElementById('menu-usuario-rol');
    if (nombreEl) nombreEl.textContent = usuario.nombre || usuario.username;
    if (rolEl)    rolEl.textContent    = etiquetaRol(usuario.rol);

    // Gestión de Usuarios: exclusivo del súper administrador — no es un
    // permiso otorgable, se decide solo por el rol
    const linkUsuarios = document.getElementById('menu-link-usuarios');
    if (linkUsuarios && usuario.rol === 'superadmin') linkUsuarios.hidden = false;
  }

  // Resalta el link de la página en la que ya estás
  const paginaActual = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.menu-link[href]').forEach(link => {
    if (link.getAttribute('href') === paginaActual) link.classList.add('activo');
  });

  function abrir() {
    overlay.hidden = false;
    menu.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add('activo');
      menu.classList.add('activo');
    });
  }

  function cerrar() {
    overlay.classList.remove('activo');
    menu.classList.remove('activo');
    setTimeout(() => {
      overlay.hidden = true;
      menu.hidden = true;
    }, 200);
  }

  btnAbrir?.addEventListener('click', abrir);
  btnCerrar?.addEventListener('click', cerrar);
  overlay?.addEventListener('click', cerrar);
  btnLogout?.addEventListener('click', cerrarSesion);

  if (window.lucide) lucide.createIcons();
})();

function etiquetaRol(rol) {
  return {
    superadmin:    'Súper Administrador',
    analista:      'Analista',
    visualizacion: 'Visualización'
  }[rol] || rol;
}