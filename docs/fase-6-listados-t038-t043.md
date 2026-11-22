# Fase 6, T038–T043 — Listados conectados

## Qué cambió y por qué

El historial de correos y el directorio de bloqueos dejaron de interpretar las filas visibles como el conjunto completo. Los filtros, la paginación y los totales del producto conectado provienen del backend. La demo conserva su lista local.

## Flujo

1. El detalle de negocio carga la página 1 de correos con límite 25. Estado, tipo y fechas se envían juntos. Al cambiar un filtro se vuelve a la página 1; las flechas solicitan solo la página elegida. El total y los contadores son los del servidor, incluso si la página está vacía. Una petición fallida muestra error y reintento.
2. Al cargar los datos conectados se solicita la primera página de bloqueos vigentes o próximos. El administrador puede elegir anteriores o todos; motivo, tipo, sucursal, profesional y fechas se combinan en la consulta. El profesional conserva su ID en la petición y el backend vuelve a comprobar su alcance.
3. El directorio muestra la página aceptada y su total real. Edición y baja resuelven la fila de esa página. Un cambio de filtro o alcance solicita una página nueva y descarta respuestas tardías. Los errores quedan visibles y no se convierten en un vacío legítimo.
4. La agenda conectada calcula disponibilidad con rutas propias del motor; el listado visual de bloqueos no es su fuente. La demo continúa con su cálculo y sus datos locales.

## Archivos

| Archivo | Función |
| --- | --- |
| `src/connected/modules/correos/correos.historial-client.js` | Añade consulta y validación de una sola página de correos. Conserva la lectura completa usada por el resumen de Plataforma. |
| `src/connected/screens/negocio/correo.historial.js` | Dibuja filtros de fecha, filas, total y paginador del servidor. |
| `src/connected/screens/negocio/negocio.vista.js` | Carga el detalle con la primera página y usa contadores recibidos. |
| `src/connected/screens/negocio/negocio.espacio-trabajo.js` | Reinicia página al filtrar, gestiona carga, error, reintento y respuestas tardías. |
| `src/connected/modules/bloqueos/bloqueos.lista-client.js` | Forma la query paginada, valida el sobre y traduce cada fila al modelo visual. |
| `src/connected/modules/datos/datos.carga.js` | Carga primera página según rol y sincroniza las filas de la página aceptada para editar o borrar. |
| `src/shared/screens/disponibilidad/disponibilidad.directorio-bloqueos.js` | Usa paginación remota solo en conectado; mantiene filtros locales en demo. |
| `src/shared/screens/disponibilidad/disponibilidad.vista.js` | Indica al directorio si se renderiza el modo conectado. |
| `tests/correos.servidor.test.js`, `tests/bloqueos.servidor.test.js` | Prueban queries, validación de sobres, totales y separación de demo. |
| `tests/conexion.backend.test.js`, `tests/portal-cuenta.sesion.test.js` | Actualizan los dobles de API al sobre de bloqueos y protegen la carga por rol. |

## Comprobación y límites

Se escribieron primero pruebas de cliente que fallaron por falta de los módulos nuevos. `npm test`: **309/309**. `npm run build`: correcto. `git diff --check`: correcto. Las pruebas de correo comprueban combinación de filtros, página, total y errores. Las de bloqueos comprueban la ruta combinada, el rechazo de páginas parciales, el total del backend y que la demo no ofrece vigencia conectada. No se ejecutó una comprobación visual autenticada en navegador; esa revisión queda dentro de T140.

El contador agregado de correos fallidos en Plataforma sigue usando la lectura completa de compatibilidad. El directorio conectado solicita 25 filas por página; la clasificación temporal y el solapamiento se calculan en backend.
