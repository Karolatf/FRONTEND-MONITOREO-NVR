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

// ── Cambiar entre las 3 vistas (login / solicitar código / restablecer) ──────
function mostrarVista(nombre) {
  document.getElementById('vista-login').hidden       = nombre !== 'login';
  document.getElementById('vista-solicitar').hidden    = nombre !== 'solicitar';
  document.getElementById('vista-restablecer').hidden  = nombre !== 'restablecer';
}

// ═══════════════════════════════════════════════════════════════════════════
// Vista 1: Login normal
// ═══════════════════════════════════════════════════════════════════════════
const form        = document.getElementById('form-login');
const btnLogin     = document.getElementById('btn-login');
const errorBox     = document.getElementById('login-error');
const inputUser    = document.getElementById('username');
const inputPass    = document.getElementById('password');
const btnVer       = document.getElementById('btn-ver-password');

btnVer.addEventListener('click', () => {
  const esPassword = inputPass.type === 'password';
  inputPass.type = esPassword ? 'text' : 'password';
  btnVer.innerHTML = esPassword
    ? '<i data-lucide="eye-off" style="width:16px;height:16px"></i>'
    : '<i data-lucide="eye" style="width:16px;height:16px"></i>';
  lucide.createIcons();
});

function mostrarError(mensaje) {
  errorBox.textContent = mensaje;
  errorBox.hidden = false;
}
function ocultarError() {
  errorBox.hidden = true;
}

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

// ═══════════════════════════════════════════════════════════════════════════
// Vista 2: Solicitar código de recuperación
// ═══════════════════════════════════════════════════════════════════════════
let usernameEnRecuperacion = '';

document.getElementById('form-solicitar').addEventListener('submit', async e => {
  e.preventDefault();
  const errorBox = document.getElementById('solicitar-error');
  errorBox.hidden = true;

  const username = document.getElementById('username-recuperar').value.trim();
  if (!username) return;

  const btn = document.getElementById('btn-solicitar');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader" class="icon-btn login-spin"></i> Enviando...';
  lucide.createIcons();

  try {
    const res  = await fetch('/api/auth/recuperar/solicitar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username })
    });
    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || 'No se pudo procesar la solicitud.';
      errorBox.hidden = false;
      return;
    }

    // Respuesta siempre genérica (exista o no la cuenta / tenga o no correo)
    usernameEnRecuperacion = username;
    const infoBox = document.getElementById('restablecer-info');
    infoBox.textContent = data.mensaje || 'Si el usuario existe y tiene un correo registrado, se envió un código.';
    infoBox.hidden = false;
    mostrarVista('restablecer');

  } catch (err) {
    console.error('Error al solicitar recuperación:', err);
    errorBox.textContent = 'Sin conexión con el servidor. Intenta de nuevo.';
    errorBox.hidden = false;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" class="icon-btn"></i> Enviar código';
    lucide.createIcons();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Vista 3: Ingresar código y nueva contraseña
// ═══════════════════════════════════════════════════════════════════════════
const btnVerNueva = document.getElementById('btn-ver-nueva-password');
btnVerNueva.addEventListener('click', () => {
  const input = document.getElementById('nueva-password');
  const esPassword = input.type === 'password';
  input.type = esPassword ? 'text' : 'password';
  btnVerNueva.innerHTML = esPassword
    ? '<i data-lucide="eye-off" style="width:16px;height:16px"></i>'
    : '<i data-lucide="eye" style="width:16px;height:16px"></i>';
  lucide.createIcons();
});

document.getElementById('form-restablecer').addEventListener('submit', async e => {
  e.preventDefault();
  const errorBox = document.getElementById('restablecer-error');
  errorBox.hidden = true;

  const codigo        = document.getElementById('codigo').value.trim();
  const nuevaPassword  = document.getElementById('nueva-password').value;

  if (!usernameEnRecuperacion) {
    errorBox.textContent = 'Vuelve a solicitar el código desde el paso anterior.';
    errorBox.hidden = false;
    return;
  }
  if (nuevaPassword.length < 8) {
    errorBox.textContent = 'La contraseña debe tener al menos 8 caracteres.';
    errorBox.hidden = false;
    return;
  }

  const btn = document.getElementById('btn-restablecer');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader" class="icon-btn login-spin"></i> Verificando...';
  lucide.createIcons();

  try {
    const res  = await fetch('/api/auth/recuperar/restablecer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: usernameEnRecuperacion, codigo, nuevaPassword })
    });
    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || 'Código inválido o expirado.';
      errorBox.hidden = false;
      return;
    }

    // Contraseña cambiada: volver al login con el usuario ya escrito
    mostrarVista('login');
    document.getElementById('username').value = usernameEnRecuperacion;
    document.getElementById('password').focus();
    mostrarError(''); // limpia cualquier error viejo
    ocultarError();

  } catch (err) {
    console.error('Error al restablecer contraseña:', err);
    errorBox.textContent = 'Sin conexión con el servidor. Intenta de nuevo.';
    errorBox.hidden = false;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check" class="icon-btn"></i> Cambiar contraseña';
    lucide.createIcons();
  }
});

lucide.createIcons();