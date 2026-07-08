# 5. Barra de incidente masivo

Es la barra roja ancha que aparece **debajo del header** (no en la esquina, como los toasts) cuando hay una caída grande de la red — pensada para notarse desde lejos en una TV.

## Cuándo aparece

Cuando la suma de NVRs caídos + cámaras caídas supera un umbral. Este número está en `js/app.js`, constante `UMBRAL_INCIDENTE` (actualmente en 15).

```javascript
const UMBRAL_INCIDENTE = 15;
```

Si se quiere que aparezca con menos caídas (más sensible) o con más (menos sensible), solo hay que cambiar ese número.

## Cuándo desaparece

Sola, en cuanto la cantidad de caídas baja del umbral — no hay que cerrarla manualmente, y no tiene botón de cerrar (a propósito: refleja el estado real, no es una notificación que se pueda "ignorar").

## Dónde está el código

- **HTML**: un `<div id="incidente-banner">` vacío en `index.html`, justo después del `</header>`
- **JS**: la función `actualizarBannerIncidente()` en `app.js`, que se llama cada vez que llega un estado nuevo del backend
- **CSS**: buscar `.incidente-banner` en `styles.css`

## Un detalle técnico importante si algún día deja de funcionar

Hay una regla de CSS que es **necesaria** para que la barra se oculte correctamente:

```css
.incidente-banner[hidden] {
  display: none !important;
}
```

Sin esa regla específica, la barra se queda visible aunque el JavaScript le diga que se oculte (por un tema de cómo el navegador prioriza los estilos). Si en algún momento la barra "se queda pegada" mostrando texto viejo, lo primero a revisar es que esta regla siga existiendo en el CSS.