// ── Modal genérico (confirmar acción / pedir contraseña) ─────────────────────
// Reemplaza SweetAlert2 para que estos diálogos se vean exactamente igual
// al resto del sistema (mismo estilo que el modal de crear/editar usuario),
// en vez de la ventana genérica blanca de SweetAlert2.
// Se inyecta una sola vez en el <body>, sin importar cuántas veces se llame.
(function inicializarModalGenerico() {
  if (document.getElementById('generico-overlay')) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
<div id="generico-overlay" class="modal-overlay" hidden>
  <div class="modal-card modal-card-generico">
    <div class="modal-header">
      <h3 id="generico-titulo"></h3>
      <button type="button" class="menu-cerrar" id="generico-cerrar-x" aria-label="Cerrar"><i data-lucide="x"></i></button>
    </div>
    <div class="generico-cuerpo">
      <p id="generico-mensaje" class="generico-mensaje"></p>
      <div id="generico-input-wrap" class="login-field" hidden>
        <label for="generico-input" id="generico-input-label"></label>
        <input type="password" id="generico-input" autocomplete="new-password">
        <div id="generico-fuerza" class="fuerza-password" hidden></div>
      </div>
      <div id="generico-confirmar-wrap" class="login-field" hidden>
        <label for="generico-input-confirmar" id="generico-confirmar-label"></label>
        <input type="password" id="generico-input-confirmar" autocomplete="new-password">
      </div>
      <div id="generico-error" class="login-error" hidden></div>
    </div>
    <div class="generico-acciones">
      <button type="button" class="btn-secundario" id="generico-cancelar"></button>
      <button type="button" class="login-submit" id="generico-confirmar"></button>
    </div>
  </div>
</div>`;
  document.body.appendChild(wrapper.firstElementChild);

  const overlay        = document.getElementById('generico-overlay');
  const input          = document.getElementById('generico-input');
  const inputConfirmar = document.getElementById('generico-input-confirmar');
  const btnOk          = document.getElementById('generico-confirmar');
  const btnCancel      = document.getElementById('generico-cancelar');
  const btnX           = document.getElementById('generico-cerrar-x');
  const errorBox       = document.getElementById('generico-error');
  const fuerza         = document.getElementById('generico-fuerza');

  // Textos fijos del modal (etiquetas, placeholders, botón Cancelar) — se
  // pintan al abrir cada vez, para que respeten el idioma actual aunque se
  // haya cambiado desde la última vez que se usó este modal.
  function pintarTextosFijos() {
    document.getElementById('generico-input-label').textContent      = t('confirm.nuevaPassword');
    document.getElementById('generico-confirmar-label').textContent  = t('confirm.confirmarPasswordLabel');
    input.placeholder          = t('confirm.passwordPlaceholder');
    inputConfirmar.placeholder = t('confirm.repetirPlaceholder');
    btnCancel.textContent      = t('confirm.cancelar');
  }

  function cerrar(valor) {
    overlay.hidden = true;
    if (_genericoResolver) { _genericoResolver(valor); _genericoResolver = null; }
  }

  btnCancel.addEventListener('click', () => cerrar(_genericoConInput ? null : false));
  btnX.addEventListener('click',      () => cerrar(_genericoConInput ? null : false));
  overlay.addEventListener('click', e => {
    if (e.target === overlay) cerrar(_genericoConInput ? null : false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) cerrar(_genericoConInput ? null : false);
  });

  input.addEventListener('input', () => {
    if (!fuerza.hidden) actualizarFuerzaPassword(input.value, fuerza);
    errorBox.hidden = true;
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inputConfirmar.focus(); }
  });

  inputConfirmar.addEventListener('input', () => { errorBox.hidden = true; });
  inputConfirmar.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); btnOk.click(); }
  });

  btnOk.addEventListener('click', () => {
    if (_genericoConInput) {
      const valor = input.value;
      const check = validarFortalezaPassword(valor);
      if (!check.ok) {
        errorBox.textContent = check.mensaje;
        errorBox.hidden = false;
        return;
      }
      if (valor !== inputConfirmar.value) {
        errorBox.textContent = t('confirm.passwordsNoCoinciden');
        errorBox.hidden = false;
        inputConfirmar.focus();
        return;
      }
      cerrar(valor);
    } else {
      cerrar(true);
    }
  });

  window._pintarTextosFijosGenerico = pintarTextosFijos;
})();

let _genericoResolver  = null;
let _genericoConInput  = false;

function _abrirGenerico({ titulo, mensaje, textoConfirmar, iconoConfirmar = null, peligro = false, conInput = false, ajustado = false }) {
  if (window._pintarTextosFijosGenerico) window._pintarTextosFijosGenerico();

  document.getElementById('generico-titulo').textContent = titulo;
  const mensajeEl = document.getElementById('generico-mensaje');
  mensajeEl.textContent = mensaje || '';
  mensajeEl.hidden = !mensaje; // Sin mensaje, no deja hueco: el bloque completo se retira

  const btnOk = document.getElementById('generico-confirmar');
  const textoBtn = textoConfirmar || t('confirm.confirmarDefault');
  btnOk.innerHTML = iconoConfirmar
    ? `<i data-lucide="${iconoConfirmar}"></i><span>${textoBtn}</span>`
    : `<span>${textoBtn}</span>`;
  btnOk.classList.toggle('btn-peligro-solido', peligro);
  btnOk.classList.toggle('generico-btn-ajustado', ajustado);

  const inputWrap      = document.getElementById('generico-input-wrap');
  const input          = document.getElementById('generico-input');
  const fuerza         = document.getElementById('generico-fuerza');
  const confirmarWrap  = document.getElementById('generico-confirmar-wrap');
  const inputConfirmar = document.getElementById('generico-input-confirmar');

  inputWrap.hidden = !conInput;
  confirmarWrap.hidden = !conInput;
  input.value = '';
  inputConfirmar.value = '';
  if (conInput) actualizarFuerzaPassword('', fuerza);
  fuerza.hidden = !conInput;

  _genericoConInput = conInput;
  document.getElementById('generico-error').hidden = true;

  document.getElementById('generico-overlay').hidden = false;
  if (window.lucide) lucide.createIcons();
  if (conInput) setTimeout(() => input.focus(), 60);

  return new Promise(resolve => { _genericoResolver = resolve; });
}

// ── API pública ────────────────────────────────────────────────────────────────
// confirmarAccion(...) → Promise<boolean>
async function confirmarAccion(opciones) {
  return await _abrirGenerico({ ...opciones, conInput: false });
}

// pedirPassword(...) → Promise<string|null> (null si se cancela)
async function pedirPassword(opciones) {
  return await _abrirGenerico({ ...opciones, conInput: true });
}

// ── Cerrar sesión con confirmación ────────────────────────────────────────────
// Reemplaza el cerrarSesion() directo de los botones de logout.
async function confirmarCerrarSesion() {
  const ok = await confirmarAccion({
    titulo: t('confirm.cerrarSesionTitulo'),
    mensaje: t('confirm.cerrarSesionMensaje'),
    textoConfirmar: t('confirm.siCerrarSesion'),
    iconoConfirmar: 'log-out'
  });
  if (ok) cerrarSesion();
}