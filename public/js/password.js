// ── Validación de fortaleza de contraseña (frontend) ──────────────────────────
// Refleja las mismas reglas que valida el backend (utils/validarPassword.js
// en BACKEND) — aquí es solo para dar feedback visual mientras se escribe;
// la validación que realmente cuenta es la del servidor.
//
// Las reglas y etiquetas se arman con una función (no una constante fija) para
// que siempre usen la traducción del idioma ACTUAL — si se llamaran una sola
// vez al cargar la página, se quedarían congeladas en el idioma de ese momento
// aunque la persona cambie el idioma después.
function reglasPassword() {
  return [
    { texto: t('password.min8'),      test: v => v.length >= 8 },
    { texto: t('password.mayuscula'), test: v => /[A-Z]/.test(v) },
    { texto: t('password.minuscula'), test: v => /[a-z]/.test(v) },
    { texto: t('password.numero'),    test: v => /[0-9]/.test(v) },
    { texto: t('password.especial'),  test: v => /[^A-Za-z0-9]/.test(v) }
  ];
}

// Escala de color de las etiquetas, de más débil a más fuerte (no lleva texto,
// no necesita traducción)
const COLORES_FUERZA = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
function etiquetasFuerza() {
  return [t('password.muyDebil'), t('password.debil'), t('password.regular'), t('password.buena'), t('password.fuerte')];
}

// ── ¿La contraseña cumple todas las reglas? ───────────────────────────────────
function validarFortalezaPassword(valor) {
  const reglas     = reglasPassword();
  const faltantes  = reglas.filter(r => !r.test(valor || ''));
  return {
    ok: faltantes.length === 0,
    mensaje: faltantes.length > 0
      ? t('password.falta', { lista: faltantes.map(r => r.texto.toLowerCase()).join(', ') })
      : ''
  };
}

// ── Pinta la barra de progreso cromática dentro de "contenedor" ──────────────
function actualizarFuerzaPassword(valor, contenedor) {
  if (!contenedor) return;
  contenedor.hidden = false;

  const reglas      = reglasPassword();
  const etiquetas   = etiquetasFuerza();
  const texto       = valor || '';
  const cumplidas   = reglas.filter(r => r.test(texto));
  const nCumplidas  = cumplidas.length;
  const total       = reglas.length;

  const color    = nCumplidas > 0 ? COLORES_FUERZA[nCumplidas - 1] : null;
  const etiqueta = nCumplidas > 0 ? etiquetas[nCumplidas - 1]      : '';

  const segmentos = Array.from({ length: total }, (_, i) =>
    `<span class="fuerza-segmento" style="${i < nCumplidas ? `background:${color}` : ''}"></span>`
  ).join('');

  const faltantes = reglas.filter(r => !r.test(texto)).map(r => r.texto);
  const detalle = texto.length === 0
    ? t('password.escribePassword')
    : faltantes.length > 0
      ? t('password.falta', { lista: faltantes.join(', ').toLowerCase() })
      : t('password.segura');

  contenedor.innerHTML = `
    <div class="fuerza-barra">${segmentos}</div>
    ${etiqueta ? `<div class="fuerza-etiqueta" style="color:${color}">${etiqueta}</div>` : ''}
    <div class="fuerza-detalle">${detalle}</div>
  `;
}