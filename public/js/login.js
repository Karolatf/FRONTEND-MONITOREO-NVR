// ── Login: envía credenciales y guarda el token JWT ──────────────────────────

// Si ya hay una sesión válida, no mostrar el login: ir directo al dashboard
(function redirigirSiYaHaySesion() {
  const token = sessionStorage.getItem('nvr_token');
  if (token && !tokenExpirado(token)) {
    window.location.replace('index.html');
  }
})();

// ── Decodificar el payload del JWT (sin verificar firma, solo para leer "exp") ─
function tokenExpirado(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || (Date.now() / 1000) >= payload.exp;
  } catch {
    return true; // Token corrupto o ilegible: tratarlo como expirado
  }
}

const form        = document.getElementById('form-login');
const btnLogin    = document.getElementById('btn-login');
const errorBox    = document.getElementById('login-error');
const inputUser   = document.getElementById('username');
const inputPass   = document.getElementById('password');
const btnVer      = document.getElementById('btn-ver-password');

// ── Mostrar / ocultar contraseña ───────────────────────────────────────────────
btnVer.addEventListener('click', () => {
  const esPassword = inputPass.type === 'password';
  inputPass.type = esPassword ? 'text' : 'password';
  btnVer.innerHTML = esPassword
    ? '<i data-lucide="eye-off" style="width:16px;height:16px"></i>'
    : '<i data-lucide="eye" style="width:16px;height:16px"></i>';
  lucide.createIcons();
});

// ── Mostrar mensaje de error ────────────────────────────────────────────────────
function mostrarError(mensaje) {
  errorBox.textContent = mensaje;
  errorBox.hidden = false;
}

function ocultarError() {
  errorBox.hidden = true;
}

// ── Envío del formulario ────────────────────────────────────────────────────────
form.addEventListener('submit', async e => {
  e.preventDefault();
  ocultarError();

  const username = inputUser.value.trim();
  const password = inputPass.value;

  if (!username || !password) {
    mostrarError('Completa usuario y contraseña.');
    return;
  }

  btnLogin.disabled = true;
  btnLogin.innerHTML = '<i data-lucide="loader" class="icon-btn login-spin"></i> Ingresando...';
  lucide.createIcons();

  try {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      mostrarError(data.error || 'No se pudo iniciar sesión.');
      return;
    }

    sessionStorage.setItem('nvr_token',   data.token);
    sessionStorage.setItem('nvr_usuario', JSON.stringify(data.usuario));
    window.location.replace('index.html');

  } catch (err) {
    console.error('Error de login:', err);
    mostrarError('Sin conexión con el servidor. Intenta de nuevo.');
  } finally {
    btnLogin.disabled = false;
    btnLogin.innerHTML = '<i data-lucide="log-in" class="icon-btn"></i> Ingresar';
    lucide.createIcons();
  }
});

lucide.createIcons();