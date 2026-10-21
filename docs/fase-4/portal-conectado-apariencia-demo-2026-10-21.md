# Portal conectado con apariencia de la demo

Fecha: 21 de octubre de 2026.

## Qué cambió y por qué

El portal público conectado ahora presenta la secuencia de seis pasos, las tarjetas de elección, la jerarquía de títulos y el resumen de la visita con una composición cercana a la demo. La fecha incluye una tira de siete días para consultar; cada pulsación hace la consulta real del día al servidor y no señala disponibilidad antes de recibirla. El formulario, el apartado, el envío, la recuperación y el folio mantienen su lógica anterior.

Se consumen los campos opcionales añadidos a la proyección pública del backend: categoría del negocio, descripción del servicio, especialidad del profesional y teléfono e indicaciones de sucursal cuando el negocio permite publicar contacto. Los valores ausentes simplemente no se muestran. El texto de disponibilidad por profesional y el aviso sobre modo de agenda no se copiaron de la demo porque la respuesta pública no los proporciona como afirmaciones presentables.

## Alcance y archivos

El cambio visual afecta solo a `/reservas/:slug` conectado. La demo y las pantallas administrativas no se modificaron. Usa la paleta y los logos existentes en tema claro y oscuro. En escritorio hay superficie principal y resumen lateral; en móvil los pasos se desplazan horizontalmente y el resumen pasa debajo del formulario.

- `src/connected/public/entry.js`: cabecera, identidad del negocio y pie.
- `src/connected/public/selection.js`: conserva la identidad pública recibida del catálogo.
- `src/connected/public/selection-view.js`: tarjetas, campos opcionales y tira de fechas; conserva radios nativos, etiquetas, foco y estados de consulta.
- `src/connected/public/booking-view.js`: seis pasos y resumen común para selección, apartado, formulario, envío incierto y resultado.
- `src/connected/public/style.css`: composición adaptable y estilos de ambos temas.
- `tests/portal-publico-seleccion.test.js`: comprueba la presentación y el escape de datos públicos opcionales.

El backend hermano se consultó en modo de lectura; sus cambios existentes no se editaron. La proyección de `catalogo` todavía depende de que la migración y la configuración de publicación del backend se apliquen en el entorno donde se despliegue.

## Verificación y límites

- `git diff --check`: sin errores.
- `npm test`: 153 pruebas aprobadas, 0 fallidas.
- `npm run build`: compilación correcta.
- La fixture local anunció Vite en `127.0.0.1:5193`, pero el navegador integrado terminó en `ERR_CONNECTION_TIMED_OUT` y la terminal rechazó el acceso al socket local por permisos. Por ello **no se completó la inspección visual** de escritorio/móvil ni de los temas en esta sesión. Tampoco se probó contra una base real ni se ejecutaron pruebas del backend, en cumplimiento de su restricción de solo lectura.

Pendiente de inspección visual: comprobar `/reservas/qa-portal` en escritorio y móvil, temas claro y oscuro, y recorrer los estados de selección, vacío, error, apartado, envío incierto y resultado. La fixture disponible en `tests/fixtures/portal-selection-server.mjs` permite esa revisión sin tocar la base real.
