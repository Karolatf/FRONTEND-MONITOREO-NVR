// ── Validación de fortaleza de contraseña (frontend) ──────────────────────────
// Refleja las mismas reglas que valida el backend (utils/validarPassword.js
// en BACKEND) — aquí es solo para dar feedback visual mientras se escribe;
// la validación que realmente cuenta es la del servidor.
const REGLAS_PASSWORD = [
  { texto: 'Mínimo 8 caracteres',            test: v => v.length >= 8 },
  { texto: 'Una letra mayúscula',            test: v => /[A-Z]/.test(v) },
  { texto: 'Una letra minúscula',            test: v => /[a-z]/.test(v) },
  { texto: 'Un número',                      test: v => /[0-9]/.test(v) },
  { texto: 'Un carácter especial (!@#$...)', test: v => /[^A-Za-z0-9]/.test(v) }
];

// Escala de color de las etiquetas, de más débil a más fuerte
const COLORES_FUERZA   = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
const ETIQUETAS_FUERZA = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte'];

// ── ¿La contraseña cumple todas las reglas? ───────────────────────────────────
function validarFortalezaPassword(valor) {
  const faltantes = REGLAS_PASSWORD.filter(r => !r.test(valor || ''));
  return {
    ok: faltantes.length === 0,
    mensaje: faltantes.length > 0
      ? `Falta: ${faltantes.map(r => r.texto.toLowerCase()).join(', ')}.`
      : ''
  };
}

// ── Pinta la barra de progreso cromática dentro de "contenedor" ──────────────
function actualizarFuerzaPassword(valor, contenedor) {
  if (!contenedor) return;
  contenedor.hidden = false;

  const texto      = valor || '';
  const cumplidas   = REGLAS_PASSWORD.filter(r => r.test(texto));
  const nCumplidas  = cumplidas.length;
  const total       = REGLAS_PASSWORD.length;

  const color    = nCumplidas > 0 ? COLORES_FUERZA[nCumplidas - 1]   : null;
  const etiqueta = nCumplidas > 0 ? ETIQUETAS_FUERZA[nCumplidas - 1] : '';

  const segmentos = Array.from({ length: total }, (_, i) =>
    `<span class="fuerza-segmento" style="${i < nCumplidas ? `background:${color}` : ''}"></span>`
  ).join('');

  const faltantes = REGLAS_PASSWORD.filter(r => !r.test(texto)).map(r => r.texto);
  const detalle = texto.length === 0
    ? 'Escribe una contraseña para ver su fortaleza.'
    : faltantes.length > 0
      ? `Falta: ${faltantes.join(', ').toLowerCase()}`
      : 'Contraseña segura.';

  contenedor.innerHTML = `
    <div class="fuerza-barra">${segmentos}</div>
    ${etiqueta ? `<div class="fuerza-etiqueta" style="color:${color}">${etiqueta}</div>` : ''}
    <div class="fuerza-detalle">${detalle}</div>
  `;
}