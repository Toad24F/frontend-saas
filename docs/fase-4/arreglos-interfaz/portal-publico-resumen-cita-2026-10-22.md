# Resumen de la cita en el portal público — 22 de octubre de 2026

## Qué cambió y por qué

La tarjeta del portal conectado se acerca a la composición de la demo: encabezado con calendario y texto “Resumen de tu cita”, iconos de servicio, sucursal, profesional y horario, degradado radial exterior y una hoja SVG decorativa dentro de la tarjeta. El modo claro usa el degradado de la demo; el oscuro usa grafito y terracota. La hoja no se anuncia a tecnologías de asistencia.

El resumen sigue mostrando selecciones reales o invitaciones a elegir cuando faltan datos. No presenta la frase “Un espacio reservado para ti” antes de que exista una reserva. El precio sigue viniendo del servicio, del costo aceptado por el apartado o del resultado histórico, según la fase. Si una recuperación no conserva la duración del servicio, muestra “Costo aceptado” sin inventar minutos.

Se añadió “Pago directamente en sucursal.” cuando ya se conoce un costo, conforme a la instrucción del usuario. Es texto de producto: el contrato público del backend entrega el costo, pero no un método de pago. El aviso del portal conectado sobre confirmación y disponibilidad permanece; no se copia el texto de prototipo de la demo.

## Alcance y archivos

- `src/connected/public/booking-view.js`: estructura, iconos y mensaje de pago del resumen.
- `src/connected/public/style.css`: degradados, hoja, disposición y temas.
- `tests/portal-publico-resumen.test.js`: estado sin costo, servicio elegido y recuperación sin duración.
- Solo portal público conectado; no cambia el flujo de selección, apartado, envío, recuperación ni la demo. Aplica en escritorio y móvil, temas claro y oscuro.

## Comprobación y límites

- Antes del cambio: `npm test`, 155 pruebas aprobadas.
- Después del cambio: `npm test`, 157 pruebas aprobadas; `npm run build` y `git diff --check`, aprobados.
- La revisión visual en navegador sigue pendiente: Edge no pudo mantenerse abierto con Playwright y Vite recibió `EACCES` al intentar abrir el servidor local en este entorno. No se afirma equivalencia visual comprobada en escritorio o móvil.
- El backend no confirma ni configura el método de pago mostrado.
