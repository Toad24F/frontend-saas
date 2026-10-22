# Iconos y selección del portal público conectado — 22 de octubre de 2026

## Qué cambió y por qué

Las tarjetas de servicios y sucursales del portal conectado ahora usan los SVG compartidos de maletín y pin, en lugar de los símbolos tipográficos. El servicio usa un maletín fijo, conforme a la petición; el catálogo público no aporta el icono configurable que emplea la ficha del panel.

La tarjeta seleccionada muestra una palomita dentro de un círculo, como la demo. El hover usa un borde neutro y la selección un borde terracota con fondo suave. Se conservaron los radios nativos, la navegación por teclado, el foco visible y los estados deshabilitados. No cambió la selección ni la comunicación con el backend.

## Alcance y archivos

- `src/connected/public/selection-view.js`: iconos de servicio y sucursal e indicador visual de selección.
- `src/connected/public/style.css`: tamaño de SVG, hover, selección y contraste en temas claro y oscuro.
- Solo portal conectado, tarjetas de servicio y sucursal en escritorio y móvil. La demo mantiene su diseño y datos ficticios.

## Comprobación

- Antes del cambio: `npm test`, 153 pruebas aprobadas.
- Después del cambio: `npm test`, 153 pruebas aprobadas; `npm run build`, aprobado; `git diff --check`, aprobado.
- Se intentó una inspección visual automatizada en Edge para temas claro y oscuro y anchos de 1280 y 390 px. Playwright no pudo mantener abierto el navegador en este entorno, por lo que esa inspección quedó pendiente.

## Límites

El maletín es un icono común para todos los servicios del portal. No representa un icono individual del servicio, porque la respuesta del catálogo público no incluye ese atributo. No se modificó el backend ni su base de datos.
