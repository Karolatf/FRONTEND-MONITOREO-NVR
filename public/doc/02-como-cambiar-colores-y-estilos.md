# 2. Cómo cambiar colores y estilos

Todo el estilo visual vive en un solo archivo: `css/styles.css`.

## Los colores están centralizados arriba del archivo

Al inicio del `styles.css` hay una sección de **variables** (números y colores reutilizados en toda la página):

```css
:root {
  --bg:        #0d0d0d;   /* Fondo general, oscuro */
  --surface:   #1a1a1a;   /* Fondo de las tarjetas */
  --amber:     #d4a017;   /* Color principal (dorado/ámbar) */
  --red:       #ef4444;   /* Color de "caído" */
  --green:     #22c55e;   /* Color de "activo/recuperado" */
  --orange:    #f97316;   /* Color de alertas de cámaras */
  --text:      #e5e7eb;   /* Color del texto principal */
  --text-dim:  #9ca3af;   /* Color del texto secundario/gris */
  --border:    #2a2a2a;   /* Color de los bordes */
  --radius:    8px;        /* Qué tan redondeadas son las esquinas */
}
```

**Para cambiar un color en toda la página, solo hay que cambiar el valor aquí una vez** — no hay que buscarlo en cada sección. Por ejemplo, si quieren que el color principal ya no sea dorado sino azul, solo se cambia `--amber: #d4a017;` por el azul deseado, y automáticamente cambia en el título, los botones, los bordes destacados, etc.

## Dónde buscar cada cosa visual

| Qué quieres cambiar | Buscar en el CSS (con Ctrl+F) |
|---|---|
| El header de arriba | `header {` |
| Las tarjetas de estadísticas (NVRs Respondiendo, etc.) | `.stats-grid` y `.stat-card` |
| Las tarjetas de cada NVR | `.nvr-card` |
| La tabla de historial | `.historial-tabla` |
| Los filtros de búsqueda | `.filtros-bar` |
| La pantalla de login | `.login-` (varias clases empiezan así) |
| Las notificaciones toast | `.notyf` y `.toast-` (ver doc 4) |
| La barra de incidente masivo | `.incidente-` (ver doc 5) |

## Cómo probar cambios sin miedo a romper algo

1. Haz el cambio en `styles.css`
2. Guarda el archivo
3. Refresca el navegador (`F5` o `Ctrl+R`) — los cambios de CSS se ven al instante, no hace falta reiniciar el servidor
4. Si algo se ve mal, deshaz el cambio (Ctrl+Z en el editor) y refresca de nuevo