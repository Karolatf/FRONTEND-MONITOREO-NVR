// ── Tema (oscuro / claro) ──────────────────────────────────────────────────────
// Se incluye en TODAS las páginas (login.html, index.html, usuarios.html,
// perfil.html) y se carga lo más arriba posible del <head>, antes de pintar
// nada: así la preferencia guardada se aplica de inmediato y no hay parpadeo
// (un instante en oscuro que salta a claro, o viceversa).
//
// La preferencia se guarda en localStorage (no en sessionStorage, a
// diferencia del token): es una preferencia de la persona en ESE equipo,
// tiene sentido que sobreviva a cerrar la pestaña o cerrar sesión.
(function aplicarTemaGuardado() {
  const TEMA_KEY = 'nvr_tema';
  const tema = localStorage.getItem(TEMA_KEY) === 'claro' ? 'claro' : 'oscuro';
  document.documentElement.setAttribute('data-tema', tema);
})();

// ── Cambiar el tema y guardarlo ────────────────────────────────────────────────
// Lo usa el control segmentado en "Mi Perfil" (js/perfil.js). Vive en este
// archivo compartido por si en el futuro se quiere ofrecer el mismo control
// desde otra página.
function establecerTema(tema) {
  const valor = tema === 'claro' ? 'claro' : 'oscuro';
  document.documentElement.setAttribute('data-tema', valor);
  localStorage.setItem('nvr_tema', valor);
}

function obtenerTema() {
  return document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'oscuro';
}