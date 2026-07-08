# 6. Cómo se conecta el Frontend con el Backend

## Al cargar la página

1. `auth-guard.js` revisa si hay un token de sesión guardado y válido
2. Si no hay, manda directo a `login.html`
3. Si hay, `app.js` pide el estado actual por `/api/status` y el historial por `/api/historial` (para el primer pintado)
4. Luego se conecta por WebSocket (Socket.IO) para recibir actualizaciones en tiempo real, sin tener que volver a preguntar

## Las 2 formas en que el frontend recibe datos

| Método | Para qué se usa | Cuándo |
|---|---|---|
| Peticiones normales (`fetch`) | Cargar el estado inicial, el historial con filtros, el login | Al abrir la página, al aplicar un filtro, al reconectar |
| WebSocket (Socket.IO) | Recibir actualizaciones en tiempo real | Todo el tiempo que la página esté abierta |

## Eventos de Socket.IO que el frontend escucha

- **`estado`**: llega el estado completo de todos los NVRs/cámaras → repinta todas las tarjetas
- **`evento`**: llega una caída o recuperación puntual → muestra el toast correspondiente y refresca el historial

## Si hay que agregar una nueva pantalla/vista que necesite datos del backend

1. Si es un dato que cambia poco (se carga una vez): usar `fetch()` normal a una URL nueva en el backend (agregar la ruta en `BACKEND/routes/api.routes.js`)
2. Si es un dato que debe verse en tiempo real: agregar un nuevo evento de Socket.IO (emitirlo desde `BACKEND/services/monitorService.js` con `getIO()?.emit('nombre-evento', datos)`, y escucharlo en el frontend con `socket.on('nombre-evento', ...)` dentro de `conectarSocket()` en `app.js`)