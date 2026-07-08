# 3. Cómo se adapta a TV / PC / tablet / celular

El diseño cambia automáticamente según el tamaño de la pantalla, usando "media queries" en `styles.css` — reglas que dicen "si la pantalla mide menos de X, aplica este estilo distinto".

## Los tamaños (breakpoints) que ya están configurados

| Pantalla | Ancho | Qué cambia |
|---|---|---|
| TV / monitor grande | 1600px o más | Todo un poco más grande (letras, tarjetas), para verse bien desde lejos |
| PC / laptop | 1100px – 1600px | Diseño normal (el que se ve por defecto) |
| Tablet horizontal | hasta 1100px | Las columnas se apilan a 1 sola |
| Tablet vertical | hasta 900px | Las estadísticas pasan a 2 columnas |
| Celular | hasta 768px | Barra de filtros vertical, tarjetas más chicas, header se acomoda en 2 líneas |
| Celular chico | hasta 480px | Ajustes finales de tamaño de texto y el calendario de fechas |

## Cómo se ven en el CSS

Buscar (Ctrl+F) `@media` en `styles.css` — cada bloque así:

```css
@media (max-width: 768px) {
  /* Estilos que solo aplican en pantallas de 768px o menos */
}
```

## Si algo se ve mal en un tamaño de pantalla específico

1. Abre el navegador con `F12` (herramientas de desarrollador)
2. Haz clic en el ícono de "vista de dispositivo" (celular/tablet)
3. Prueba distintos anchos (390px celular, 768px tablet, 1920px TV) y mira cuál se ve mal
4. Busca el bloque `@media` correspondiente a ese ancho en el CSS y ajusta ahí

## Para agregar un tamaño de pantalla nuevo

Solo hay que copiar un bloque `@media (max-width: ...)` existente, cambiar el número y los estilos, y ponerlo en el orden correcto (de mayor a menor ancho, como ya están los demás).