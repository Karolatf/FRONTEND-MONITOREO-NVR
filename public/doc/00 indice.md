# Documentación del Frontend — NVR Monitor HIC

Esta carpeta explica cómo está armada la parte visual (lo que se ve en pantalla) y cómo modificarla.

## Índice

1. [Estructura de archivos](01-estructura-de-archivos.md)
2. [Cómo cambiar colores y estilos](02-como-cambiar-colores-y-estilos.md)
3. [Cómo se adapta a TV/PC/tablet/celular](03-responsive-pantallas.md)
4. [Notificaciones toast](04-notificaciones-toast.md)
5. [Barra de incidente masivo](05-barra-incidente-masivo.md)
6. [Cómo se conecta con el backend](06-conexion-con-backend.md)

**Nota importante:** casi nunca hay que tocar el HTML/CSS/JS para agregar un NVR o cámara nueva — eso se hace solo en `BACKEND/config/dispositivos.js` (ver la documentación del backend, doc 3). El frontend dibuja automáticamente lo que el backend le manda.