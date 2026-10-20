// ── Búsqueda global (header de todas las páginas) ────────────────────────────
// Busca a la vez en NVRs, cámaras y Access Points por nombre o IP, usando
// /api/busqueda (ver backend: services/busquedaService.js).
//
// Se incluye en todas las páginas con sesión, después de menu.js. Este script
// crea la barra dentro del <header> (entre el título y el usuario), así cada
// página solo necesita cargar busqueda.js y busqueda.css.
//
// Al elegir un resultado:
//   NVR     → el dashboard baja hasta su tarjeta y la resalta
//   Cámara  → el dashboard abre el detalle de su NVR con la cámara resaltada
//   En pausa o Access Point → no aparece en el dashboard: se explica en la
//             misma lista, sin navegar
// Desde otra página se va al dashboard con la orden en el enlace
// (index.html#ir-nvr-12 / #ir-camara-345); app.js la ejecuta al cargar.
//
// Teclado: "/" o Ctrl/Cmd + K enfocan la barra · flechas para moverse ·
// Enter para elegir · Esc para cerrar.
(function iniciarBusquedaGlobal() {
  const header = document.querySelector('header');
  const izquierda = header?.querySelector('.header-left');
  if (!header || !izquierda || typeof authFetch !== 'function') return;

  const ESPERA_MS = 220; // pausa al escribir antes de consultar
  const MINIMO    = 2;
  const esMac     = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // ── Estructura ──────────────────────────────────────────────────────────────
  const caja = document.createElement('div');
  caja.className = 'busqueda-global';
  caja.innerHTML = `
    <button type="button" class="busqueda-abrir" aria-label="">
      <i data-lucide="search"></i>
    </button>
    <div class="busqueda-campo">
      <i data-lucide="search" class="busqueda-icono"></i>
      <input type="search" class="busqueda-input" autocomplete="off" spellcheck="false"
             role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="busqueda-lista">
      <kbd class="busqueda-atajo"></kbd>
      <button type="button" class="busqueda-limpiar" hidden aria-label=""><i data-lucide="x"></i></button>
    </div>
    <div class="busqueda-panel" hidden>
      <ul class="busqueda-lista" id="busqueda-lista" role="listbox"></ul>
      <div class="busqueda-mensaje" hidden></div>
      <div class="busqueda-pie"></div>
    </div>`;
  izquierda.insertAdjacentElement('afterend', caja);

  const input    = caja.querySelector('.busqueda-input');
  const panel    = caja.querySelector('.busqueda-panel');
  const lista    = caja.querySelector('.busqueda-lista');
  const mensaje  = caja.querySelector('.busqueda-mensaje');
  const pie      = caja.querySelector('.busqueda-pie');
  const atajo    = caja.querySelector('.busqueda-atajo');
  const limpiar  = caja.querySelector('.busqueda-limpiar');
  const abrirBtn = caja.querySelector('.busqueda-abrir');

  let resultados  = [];
  let activo      = -1;
  let temporizador = null;
  let consulta    = 0;      // para descartar respuestas viejas que lleguen tarde
  let controlador = null;   // para cancelar la petición anterior

  // ── Textos (se repintan al cambiar el idioma) ───────────────────────────────
  function pintarTextos() {
    input.placeholder = t('busqueda.placeholder');
    input.setAttribute('aria-label', t('busqueda.placeholder'));
    atajo.textContent = esMac ? '⌘K' : 'Ctrl K';
    atajo.title = t('busqueda.atajo');
    limpiar.setAttribute('aria-label', t('busqueda.limpiar'));
    abrirBtn.setAttribute('aria-label', t('busqueda.placeholder'));
    pie.innerHTML = `
      <span><kbd>↑</kbd><kbd>↓</kbd> ${escapar(t('busqueda.pieMover'))}</span>
      <span><kbd>Enter</kbd> ${escapar(t('busqueda.pieAbrir'))}</span>
      <span><kbd>Esc</kbd> ${escapar(t('busqueda.pieCerrar'))}</span>`;
    if (resultados.length) pintarResultados(input.value.trim());
  }

  // ── Utilidades ──────────────────────────────────────────────────────────────
  function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Resalta lo que se escribió dentro del nombre o la IP (sin distinguir mayúsculas)
  function resaltar(texto, buscado) {
    const original = String(texto ?? '');
    const pos = original.toLowerCase().indexOf(buscado.toLowerCase());
    if (!buscado || pos < 0) return escapar(original);
    return escapar(original.slice(0, pos)) +
      `<mark>${escapar(original.slice(pos, pos + buscado.length))}</mark>` +
      escapar(original.slice(pos + buscado.length));
  }

  const ICONO  = { nvr: 'server', camara: 'cctv', access_point: 'wifi' };
  const ESTADO = {
    normal:         { clase: 'ok',      clave: 'busqueda.estadoEnLinea' },
    degradado:      { clase: 'aviso',   clave: 'busqueda.estadoDegradado' },
    caido:          { clase: 'caido',   clave: 'busqueda.estadoCaido' },
    sin_verificar:  { clase: 'neutro',  clave: 'busqueda.estadoSinVerificar' },
    en_pausa:       { clase: 'pausa',   clave: 'busqueda.estadoEnPausa' },
    no_monitoreado: { clase: 'neutro',  clave: 'busqueda.estadoNoMonitoreado' }
  };

  function contexto(r) {
    if (r.tipo === 'nvr')    return `${t('busqueda.tipoNvr')} · ${r.zonaNombre}`;
    if (r.tipo === 'camara') return `${t('busqueda.tipoCamara')} · ${r.nvrNombre} · ${r.zonaNombre}`;
    return `${t('busqueda.tipoAp')} · ${r.piso}`;
  }

  // ── Panel ───────────────────────────────────────────────────────────────────
  function abrirPanel()  { panel.hidden = false; input.setAttribute('aria-expanded', 'true'); }
  function cerrarPanel() {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activo = -1;
  }

  function mostrarMensaje(texto, tipo = '') {
    lista.innerHTML = '';
    resultados = [];
    mensaje.className = `busqueda-mensaje ${tipo}`;
    mensaje.textContent = texto;
    mensaje.hidden = false;
    pie.hidden = true;
    abrirPanel();
  }

  function pintarResultados(buscado) {
    mensaje.hidden = true;
    pie.hidden = false;
    lista.innerHTML = resultados.map((r, i) => {
      const e = ESTADO[r.estado] || ESTADO.sin_verificar;
      return `
        <li class="busqueda-item${i === activo ? ' activo' : ''}" id="busqueda-op-${i}" role="option"
            aria-selected="${i === activo}" data-indice="${i}">
          <span class="busqueda-item-icono tipo-${r.tipo}"><i data-lucide="${ICONO[r.tipo]}"></i></span>
          <span class="busqueda-item-texto">
            <span class="busqueda-item-linea">
              <span class="busqueda-item-nombre">${resaltar(r.nombre, buscado)}</span>
              <span class="busqueda-item-ip">${resaltar(r.ip, buscado)}</span>
            </span>
            <span class="busqueda-item-contexto">${escapar(contexto(r))}</span>
          </span>
          <span class="busqueda-estado ${e.clase}">${escapar(t(e.clave))}</span>
        </li>`;
    }).join('');
    abrirPanel();
    if (window.lucide) lucide.createIcons();
  }

  function marcarActivo(indice) {
    if (!resultados.length) return;
    activo = (indice + resultados.length) % resultados.length;
    lista.querySelectorAll('.busqueda-item').forEach((el, i) => {
      el.classList.toggle('activo', i === activo);
      el.setAttribute('aria-selected', String(i === activo));
    });
    const el = lista.querySelector(`#busqueda-op-${activo}`);
    input.setAttribute('aria-activedescendant', `busqueda-op-${activo}`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  // ── Consulta ────────────────────────────────────────────────────────────────
  async function buscar(texto) {
    const numero = ++consulta;
    controlador?.abort();
    controlador = new AbortController();
    try {
      const res = await authFetch(`/api/busqueda?q=${encodeURIComponent(texto)}`, { signal: controlador.signal });
      const json = await res.json().catch(() => null);
      if (numero !== consulta) return;
      if (!res.ok) return mostrarMensaje(json?.error || t('busqueda.error'), 'error');
      resultados = json.resultados;
      activo = resultados.length ? 0 : -1;
      if (!resultados.length) return mostrarMensaje(t('busqueda.sinResultados', { q: texto }));
      pintarResultados(texto);
      if (json.total > resultados.length) {
        mensaje.className = 'busqueda-mensaje nota';
        mensaje.textContent = t('busqueda.hayMas', { n: json.total - resultados.length });
        mensaje.hidden = false;
      }
    } catch (err) {
      if (err.name === 'AbortError' || numero !== consulta) return;
      mostrarMensaje(t('busqueda.sinConexion'), 'error');
    }
  }

  input.addEventListener('input', () => {
    const texto = input.value.trim();
    limpiar.hidden = input.value.length === 0;
    clearTimeout(temporizador);
    if (texto.length < MINIMO) {
      consulta++;
      controlador?.abort();
      resultados = [];
      if (texto.length === 0) cerrarPanel(); else mostrarMensaje(t('busqueda.minimo', { n: MINIMO }));
      return;
    }
    // Mientras llega la respuesta: si ya hay resultados se dejan a la vista;
    // si no, se avisa que está buscando (nunca un mensaje viejo).
    if (!resultados.length) mostrarMensaje(t('busqueda.buscando'));
    temporizador = setTimeout(() => buscar(texto), ESPERA_MS);
  });

  // ── Elegir un resultado ─────────────────────────────────────────────────────
  function elegir(indice) {
    const r = resultados[indice];
    if (!r) return;

    if (r.estado === 'en_pausa') {
      const extra = tienePermiso('gestionar_dispositivos') ? ` ${t('busqueda.pausaGestionar')}` : '';
      return mostrarMensajeDebajo(t('busqueda.pausaNoDashboard', { nombre: r.nombre }) + extra);
    }
    if (r.tipo === 'access_point') {
      return mostrarMensajeDebajo(t('busqueda.apNoDashboard'));
    }

    const destino = { tipo: r.tipo, id: r.tipo === 'nvr' ? r.id : r.nvrId, camaraId: r.tipo === 'camara' ? r.id : null };
    cerrarPanel();
    input.blur();
    caja.classList.remove('expandida');

    // En el dashboard se ejecuta directo; desde otra página se va al dashboard
    if (typeof window.irADispositivo === 'function') {
      window.irADispositivo(destino);
    } else {
      location.href = destino.camaraId
        ? `index.html#ir-camara-${destino.camaraId}-nvr-${destino.id}`
        : `index.html#ir-nvr-${destino.id}`;
    }
  }

  // Aviso dentro de la lista (sin perder los resultados)
  function mostrarMensajeDebajo(texto) {
    mensaje.className = 'busqueda-mensaje nota';
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  lista.addEventListener('mousedown', e => e.preventDefault()); // que el input no pierda el foco
  lista.addEventListener('click', e => {
    const item = e.target.closest('.busqueda-item');
    if (item) elegir(Number(item.dataset.indice));
  });
  lista.addEventListener('mousemove', e => {
    const item = e.target.closest('.busqueda-item');
    if (item && Number(item.dataset.indice) !== activo) marcarActivo(Number(item.dataset.indice));
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown')      { e.preventDefault(); if (!panel.hidden) marcarActivo(activo + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); if (!panel.hidden) marcarActivo(activo - 1); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (activo >= 0) elegir(activo); }
    else if (e.key === 'Escape') {
      e.preventDefault();
      if (!panel.hidden) cerrarPanel();
      else { input.blur(); caja.classList.remove('expandida'); }
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= MINIMO && (resultados.length || !mensaje.hidden)) abrirPanel();
  });

  limpiar.addEventListener('click', () => {
    input.value = '';
    limpiar.hidden = true;
    resultados = [];
    consulta++;
    cerrarPanel();
    input.focus();
  });

  // Pantallas angostas: la barra se reduce a un botón que la despliega
  abrirBtn.addEventListener('click', () => {
    caja.classList.add('expandida');
    input.focus();
  });

  document.addEventListener('mousedown', e => {
    if (caja.contains(e.target)) return;
    cerrarPanel();
    if (!input.value) caja.classList.remove('expandida');
  });

  // Atajos globales: "/" (fuera de otros campos) y Ctrl/Cmd + K
  document.addEventListener('keydown', e => {
    const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    const atajoK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
    if (atajoK || (e.key === '/' && !escribiendo)) {
      e.preventDefault();
      caja.classList.add('expandida');
      input.focus();
      input.select();
    }
  });

  pintarTextos();
  if (typeof registrarRepintado === 'function') registrarRepintado(pintarTextos);
  if (window.lucide) lucide.createIcons();
})();