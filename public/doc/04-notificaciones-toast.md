# 4. Notificaciones toast (los recuadros de la esquina)

Cuando un NVR o cámara se cae/recupera, aparece un recuadro pequeño en la esquina superior derecha. Se usa la librería **Notyf**.

## Apagarlos desde Mi Perfil

En Mi Perfil → Preferencias de Interfaz, el interruptor **Notificaciones en pantalla** apaga estos recuadros de caída y recuperación **y también la barra de incidente masivo** (doc 5). No apaga los avisos de confirmación de lo que haces tú (por ejemplo "Usuario creado"), ni las tarjetas, ni el historial, ni Telegram.

Es una preferencia **por navegador y por dirección**: si se apaga entrando por `localhost:3000`, no se apaga en `172.30.29.170:3000` ni en otro equipo (por ejemplo, el de la TV). Si el dashboard ya está abierto en otra pestaña, obedece al instante.

## Reglas de cuándo aparecen

- **Pocos eventos** (5 o menos al mismo tiempo): uno por uno, con nombre, IP y NVR (si es cámara)
- **Muchos eventos de golpe** (más de 5): se agrupan en resúmenes, tipo "40 NVR(s) caídos", en vez de inundar la pantalla con decenas de recuadros

Este umbral (5) está en `js/app.js`, en la constante `LIMITE_ANTES_DE_RESUMIR`.

## Máximo de recuadros visibles a la vez

Nunca se muestran más de 4 al mismo tiempo — si llega un quinto, se descarta el más viejo para hacerle espacio. Esto está en `js/app.js`, constante `MAX_TOASTS_VISIBLES`.

## Colores por tipo de evento

| Tipo | Color de la franja izquierda |
|---|---|
| NVR caído | Rojo |
| NVR recuperado | Verde |
| Cámara caída | Naranja |
| Cámara recuperada | Verde |

Estos colores están en `css/styles.css`, buscar `.toast-nvr-caida`, `.toast-camara-caida`, etc.

## Duración en pantalla

- Caídas: 7 segundos
- Recuperaciones: 5 segundos

Se pueden ajustar en `js/app.js`, dentro de la configuración de `notyf` (propiedad `duration` de cada tipo).

## Tamaño

Todos los recuadros miden exactamente lo mismo (280px de ancho), sin importar qué tan largo sea el nombre del dispositivo — si el texto no cabe, se corta con "..." en vez de agrandar la caja.