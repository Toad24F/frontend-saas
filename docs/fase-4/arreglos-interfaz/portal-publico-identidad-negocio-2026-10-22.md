# Identidad del negocio en el portal público — 22 de octubre de 2026

## Qué cambió y por qué

El encabezado principal del portal conectado muestra el nombre real del negocio en lugar de “Tu próxima cita”. Se eliminó la segunda aparición del nombre bajo el título. La categoría pública opcional permanece debajo cuando el catálogo la entrega.

El distintivo calcula hasta dos iniciales del nombre público, porque el backend no devuelve iniciales configuradas. El título y las iniciales se actualizan tanto al iniciar la sesión pública como al recuperar un resultado histórico. Los nombres recibidos se insertan como texto, sin interpretar HTML.

“Reservas en línea” mantiene su posición a la derecha en escritorio y ahora usa una etiqueta rectangular de esquinas suaves, como la demo. En móvil permanece oculta, igual que en la demo, para dejar espacio a nombres largos.

## Alcance y archivos

- `src/connected/public/entry.js`: título, distintivo y actualización de identidad.
- `src/connected/public/business-identity.js`: cálculo de iniciales a partir del nombre.
- `src/connected/public/style.css`: distintivo circular y etiqueta rectangular en claro y oscuro.
- `tests/portal-publico-identidad.test.js`: casos de nombres compuestos, acentos y un solo término.
- Solo portal público conectado; no cambian la demo, las rutas ni el contrato del backend.

## Comprobación y límites

- Antes del cambio: `npm test`, 154 pruebas aprobadas.
- Después del cambio: `npm test`, 155 pruebas aprobadas; `npm run build` y `git diff --check`, aprobados.
- No se completó la revisión visual en navegador: Edge no inició mediante Playwright y Vite recibió `EACCES` al abrir el servidor local en este entorno. Queda pendiente revisar ambos temas y anchos de escritorio y móvil.
- Las iniciales se derivan del primer y último término del nombre; no son una marca gráfica configurada por el negocio.
