# 1. Estructura de archivos del Frontend

```
FRONTEND/public/
├── index.html          ← La página principal (el dashboard)
├── login.html          ← La pantalla de inicio de sesión
├── css/
│   └── styles.css      ← TODO el estilo visual (colores, tamaños, responsive)
├── js/
│   ├── app.js           ← Toda la lógica del dashboard (tarjetas, tiempo real, toasts)
│   ├── auth-guard.js    ← Protege el acceso, maneja la sesión e inactividad
│   └── login.js         ← Lógica de la pantalla de login
└── docs/                ← Esta carpeta
```

## Cómo se sirve al navegador

No hay que "correr" el frontend por separado. El backend (`server.js`), al arrancar, sirve estos archivos automáticamente. Solo hay que entrar a `http://localhost:3000` (o la IP del servidor) desde cualquier navegador.

## Qué hace cada `.js`

- **`auth-guard.js`**: se carga primero, antes que nada. Revisa si hay una sesión válida; si no, manda directo al login. También maneja el cierre automático por inactividad (15 min) y el refresco de sesión.
- **`login.js`**: solo se usa en `login.html`. Manda el usuario/contraseña al backend y guarda el token si es correcto.
- **`app.js`**: el archivo más grande. Maneja: dibujar las tarjetas de NVRs/cámaras, conectar el WebSocket, mostrar las notificaciones toast, la barra de incidente, los filtros del historial, el modal de detalle de cada NVR.

## Librerías externas (cargadas por CDN, no hay que instalar nada)

| Librería | Para qué |
|---|---|
| Socket.IO client | Conexión en tiempo real con el backend |
| SweetAlert2 | El modal de detalle al hacer clic en un NVR |
| Notyf | Las notificaciones toast (caída/recuperación) |
| Flatpickr | El selector de rango de fechas en el historial |
| Lucide | Los íconos (wifi, cámara, etc.) |