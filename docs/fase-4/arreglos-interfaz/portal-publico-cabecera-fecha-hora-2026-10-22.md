# Cabecera del portal público — 22 de octubre de 2026

## Qué cambió y por qué

La cabecera conectada sustituye el lema por la fecha y hora locales del navegador del visitante, con el icono de calendario del panel. El reloj se actualiza mientras la página sigue abierta y al regresar a la pestaña. No usa la fecha ficticia de la demo ni presupone una zona horaria del negocio.

El control de tema conserva la preferencia existente, los logos por tema y el mismo comportamiento de cambio. Ahora presenta los iconos compartidos de luna y sol, los nombres accesibles, el estado pulsado y la animación de giro de la demo. El movimiento se desactiva cuando el sistema pide reducir animaciones.

La cabecera usa tres columnas para centrar la fecha y hora en escritorio. En móvil coloca el reloj centrado en una segunda fila para mantener legibles el logo y el botón sin superposiciones.

## Alcance y archivos

- `src/connected/public/entry.js`: contenido y actualización de la cabecera; iconos y atributos del botón.
- `src/connected/public/dates.js`: formato de fecha y hora en la zona local del navegador.
- `src/connected/public/style.css`: composición adaptable y animación del botón.
- `tests/portal-publico-cabecera.test.js`: cambio de día según la zona y uso de la zona local por defecto.
- Solo portal público conectado, temas claro y oscuro, escritorio y móvil. La demo conserva sus datos ficticios y su cabecera.

## Comprobación y límites

- Antes del cambio: `npm test`, 153 pruebas aprobadas.
- Después del cambio: `npm test`, 154 pruebas aprobadas; `npm run build` y `git diff --check`, aprobados.
- La inspección visual no se completó: Edge no pudo mantenerse abierto mediante Playwright y Vite recibió `EACCES` al intentar escuchar en `127.0.0.1:5173`. Queda pendiente revisar la cabecera en navegador para ambos temas y tamaños.
- La fecha y hora presentadas corresponden al navegador del visitante; pueden diferir de la zona horaria de la sucursal. Los horarios de reserva siguen usando la zona devuelta para la sucursal por el backend.
