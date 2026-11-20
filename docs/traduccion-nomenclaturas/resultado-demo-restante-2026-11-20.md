# Traducción de las pantallas restantes de la demo

Fecha de cierre 2026-11-20.

## Alcance

Se tradujo la nomenclatura del arranque de la demo, la carga de datos y las utilidades de horario. Se actualizaron los imports, el estado y los controles de Resumen, Reportes, Configuración y Notificaciones. Los nuevos nombres de selectores se aplicaron también en los estilos compartidos de temas, móvil e impresión.

| Ubicación | Archivo anterior → actual |
| --- | --- |
| `src/demo/` | `data.js` → `demo.datos.js`, `schedule.js` → `demo.horario.js`, `entry.js` → `demo.entrada.js` |
| `src/demo/screens/resumen/` | `view.js` → `resumen.vista.js`, `style.css` → `resumen.estilos.css` |
| `src/demo/screens/reportes/` | `view.js` → `reportes.vista.js`, `state.js` → `reportes.estado.js`, `style.css` → `reportes.estilos.css` |
| `src/demo/screens/configuracion/` | `view.js` → `configuracion.vista.js`, `style.css` → `configuracion.estilos.css` |
| `src/demo/screens/notificaciones/` | `view.js` → `notificaciones.vista.js`, `style.css` → `notificaciones.estilos.css` |

Se ajustaron los consumidores en el enrutador de entrada, el índice de pantallas, la aplicación compartida, las acciones delegadas, Agenda demo, el horario de Clientes y el selector de negocio de Plataforma. La propiedad `horasRecordatorio` del archivo de ejemplo se sincronizó con Notificaciones y con el alta ficticia en Plataforma.

## Separación entre modos

- El indicador `?demo=1` y las rutas públicas y administrativas conservan su comportamiento. `demo.datos.js` sigue cargando `/data/demo.json` de forma diferida y exclusiva de la demo.
- Los nombres de las colecciones y los campos compartidos por Agenda, Disponibilidad, catálogos y reservas conservan la estructura que consumen esas pantallas. La nomenclatura de los accesos al modelo se actualizó en el conjunto 14. Los campos de los formularios y el estado de Reportes traducidos son internos de la demo.
- Configuración y Notificaciones conservan los cambios en memoria. El reporte utiliza la impresión del navegador. El modo conectado conserva su navegación según el rol y usa la API autenticada.

## Verificación

- `npm test` pasó con 297 pruebas. Los casos de horario y motor usan los nuevos imports. `npm run build` y `git diff --check` pasaron.
- Se compararon los datos que generan ambos cargadores y el contenido de las ocho hojas CSS afectadas. Coincidieron después de aplicar los cambios de nomenclatura. Se buscaron imports, funciones, acciones y selectores anteriores en `src/` y `tests/`.
- Pasaron 19 casos de Edge en las suites de pantallas demo, Disponibilidad y sesión con la API interceptada. Se verificaron el enlace de Resumen a Agenda, la validación de fechas, los filtros y la vista de impresión de Reportes, el guardado local, el cambio de negocio y el reinicio en Notificaciones. El caso conectado verificó la redirección de las cuatro rutas de demo a Agenda sin solicitar el archivo de ejemplo.
- La suite generó 16 capturas a 1366 y 390 px en claro y oscuro y comprobó el ancho del documento. Se revisaron muestras de escritorio y móvil de las cuatro pantallas. A 390 px se observa la distribución preexistente en dos columnas en varias secciones, con contenido estrecho y desplazamiento horizontal interno en tablas.
- Pasó el recorrido `node tests/portal.navegacion-navegador.mjs` con Vite y la API interceptada. Cubrió la entrada pública y el portal demo. Las comprobaciones se realizaron sin escribir en el backend ni en su base de datos.

Para repetir las pruebas de Edge con la API interceptada, ejecutar `npm run test:browser -- --config tests/m4-playwright.config.js demo.pantallas disponibilidad.operativa sesion.persistencia`. El runner guarda las capturas de las cuatro pantallas en `test-results/m4/`.
