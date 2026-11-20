# Cierre de la traducción del frontend

Fecha 2026-11-20.

## Documentación vigente

- El [README](../../README.md) describe la estructura actual y los comandos para unitarias, Playwright con API simulada e integración con MariaDB.
- El [mapa definitivo](mapa-renombres-frontend.md) identifica 260 rutas de origen y sus destinos vigentes. Abarca desde la revisión `3a5e633`, que introdujo el plan, hasta `d778a0d`, que cerró las pruebas y sus datos de ejemplo. Los nombres anteriores se conservan como referencia en las tablas de equivalencias.
- El [glosario](glosario-nomenclatura-frontend.md#excepciones-técnicas-en-inglés) explica los términos técnicos, las raíces de arquitectura, las claves persistidas y las interfaces externas que conservaron su nombre.

## Compatibilidad revisada

- El panel conectado y la demo llegan a `iniciarAplicacion` en `src/shared/aplicacion.nucleo.js`. Comparten los componentes de Agenda, los catálogos, la navegación y los estilos. El enrutador distingue la demo explícita con `?demo=1`, el panel conectado y la entrada pública `/reservas/:slug`.
- La comparación del código antes y después encontró los mismos 73 literales de rutas de aplicación y API, los mismos métodos HTTP y las mismas tres variables `VITE_*`. Las claves de almacenamiento y canales del navegador conservaron su nombre. La notificación de sesión expirada es un evento de ventana propio del frontend y se tradujo coordinadamente a `cita-sesion-expirada`. Las pruebas de sesión, agenda, catálogos, licencias y portal ejercitan campos, permisos y respuestas del contrato vigente.
- Las 33 hojas CSS conservaron el orden y los valores de las declaraciones después de aplicar las equivalencias de propiedades, animaciones y atributos renombrados. Los colores de los ejemplos de demo cambiaron de nombre de forma coordinada con la paleta.
- Se compararon Agenda y Servicios en modo conectado con la misma API simulada y en demo. Las 16 capturas fueron idénticas píxel a píxel a 1366 y 390 px, con tema claro y oscuro, al fijar el reloj y usar las mismas fuentes de respaldo en ambas revisiones. La primera pasada tuvo diferencias de carga de fuentes externas y hasta dos píxeles en el borde del calendario. La pasada controlada eliminó esas diferencias.

## Pruebas del cierre

- `npm test` aprobó 297 pruebas. `npm run build` generó `dist/` correctamente.
- Playwright aprobó 145 casos con API simulada, sin reintentos. Comando `npm run test:browser -- --config tests/m4-navegador.config.js --workers 2 --retries 1`.
- Playwright aprobó los 33 casos con la API real y MariaDB efímera, incluido el vencimiento real de un apartado. Comando `npm run test:browser -- --output test-results/cierre17-integracion` con `PORTAL_TEST_BACKEND_READ_ONLY=1`. Se verificó por consulta de metadatos que solo desapareció el esquema creado en esta corrida.
- Se comprobó que los 260 destinos del mapa existen y que las referencias directas a código y pruebas en la documentación vigente resuelven.
- `git diff --check` pasó. Los cambios de la sección 17 se limitaron a documentación.
