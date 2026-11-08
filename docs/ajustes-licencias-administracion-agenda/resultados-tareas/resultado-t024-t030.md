# Resultado FALA-T024–T030 — licencias de superadministración

Alcance: detalle de negocio conectado para superadmin. Se consultaron controladores y DTO del backend, sin modificarlo ni usar su base cotidiana. La demo no recibió cambios porque su pantalla de plataforma usa datos ficticios y un flujo separado. Los criterios de este lote cubren RF-39–RF-44, RF-47 y RF-58 en el alcance de licencias; los cupos de usuarios siguen en T031–T034.

## Cambios y función de cada archivo

| Archivo | Qué hace y por qué |
| --- | --- |
| `src/connected/modules/auth/session.js` | Acepta cabeceras opcionales por llamada. Las llamadas normales conservan su configuración; solo la operación de licencia pasa `Idempotency-Key`. El comentario junto al bloque explica esta frontera. |
| `src/connected/screens/negocio/license-operations.js` (nuevo) | Valida plazo 0–30 y guarda en `sessionStorage` acción, negocio, licencia, cuerpo exacto y clave antes del POST. Reintenta la misma operación con la misma clave, lee vigencia al conocer la respuesta y bloquea una segunda transición mientras haya un intento sin reconciliar. Sus comentarios explican la persistencia y la repetición segura. |
| `src/connected/screens/negocio/license-presentation.js` (nuevo) | Renderiza estados de vigencia y correo desde respuestas reales. Presenta vencimiento, bloqueo programado, acceso y tiempo restante sin asumir 48 horas. Oculta suspensión nueva si ya está pendiente/efectiva y explica que renovar no reactiva. Los comentarios separan transición de entrega de correo. |
| `src/connected/screens/negocio/view.js` | Usa la presentación de licencia y correo; muestra «Comprobar operación» si queda un intento pendiente. Conserva el estado vacío ilustrado de correos. |
| `src/connected/screens/negocio/actions.js` | Conecta los botones al módulo idempotente. El formulario de suspensión inicia en dos días, acepta 0–30 y explica el bloqueo inmediato. Tras respuesta conocida refresca datos; ante fallo conserva el diálogo y el intento. Restringe las acciones a superadmin. |
| `src/shared/actions.js` | Enruta «Comprobar operación» solo en la vista conectada de negocio y con rol superadmin. |
| `tests/ala-licencias.test.js` (nuevo) | Verifica cabecera acotada, guardado previo, misma clave/cuerpo, bloqueo de renovación incompatible, plazos y representación de licencia/correo. Cada bloque tiene comentario de intención. |
| `tests/browser/global-setup.js` | Siembra cuentas ficticias superadmin y administrador en la base efímera, con contraseña bcrypt de prueba. No crea cuentas en la base cotidiana. |
| `tests/browser/licenses.spec.js` (nuevo) | Recorre la pantalla conectada con backend y base temporales: plazos 0/2/30, suspensión, renovación, respuesta perdida, correo por estado y permisos; genera capturas para revisión visual. Los comentarios explican el aislamiento y la repetición. |
| `docs/ajustes-licencias-administracion-agenda/tareas.md` | Marca T024–T030 y enlaza esta evidencia. |

## Flujo de la operación

El superadmin abre el negocio y la UI consulta `/negocios/:id`, `/licencias/:id/vigencia` y `/negocios/:id/envios`. Los estados, las fechas y el acceso se toman de esas respuestas. Al elegir suspensión, el formulario ofrece dos días de inicio; cero significa bloqueo inmediato y el servidor decide la fecha efectiva. No se ofrece otro plazo si la licencia ya está en suspensión pendiente o efectiva.

Antes del primer POST, el navegador guarda en `sessionStorage` un marcador con acción, negocio/licencia, cuerpo y clave idempotente. Envía `Idempotency-Key` únicamente a `/licencias/:id/suspender`, `reactivar` o `renovar`. Si se pierde la respuesta, el detalle muestra una operación pendiente y bloquea otra transición, incluida una segunda renovación. «Comprobar operación» repite exactamente el mismo POST; el backend devuelve la vista asociada a la clave. Después se lee `/licencias/:id/vigencia`, se retira el marcador y se refresca el panel. La entrega de correo se consulta por separado: una transición guardada puede dejar un aviso pendiente o fallido.

## Tests primero y resultados

| Comprobación | Resultado real |
| --- | --- |
| `node --test tests/ala-licencias.test.js` antes de crear los módulos | Falló por módulo ausente; la prueba de presentación se añadió antes de crear ese módulo y volvió a fallar por ausencia. Tras implementar, los seis casos pasaron. |
| Primera ejecución Playwright de licencias | Falló 3/3 por selector ambiguo de contraseña del test. Tras corregirlo, 2/3 pasaron; el restante navegaba al siguiente negocio antes de que acabara el POST. Se esperó el cierre del diálogo. |
| Playwright final `PORTAL_TEST_BACKEND_READ_ONLY=1 npm run test:browser -- --grep 'FALA-T030\|FALA-T029'` | **4/4 aprobadas**, código 0, 22.0 s. El caso visual también pasó aislado después de estabilizar capturas. La base y usuarios temporales se eliminan al finalizar. |
| `npm test` | **173/173 aprobadas**, 0 fallidas, 0 omitidas, código 0. |
| `npm run build` | Correcto: 125 módulos transformados, código 0. |
| `git diff --check` | Correcto, sin errores de espacios. |

Se revisaron capturas del detalle en escritorio y 390 px, claro y oscuro, además del diálogo de suspensión. Las primeras capturas recogieron una transición visual y un aviso temporal; el caso se estabilizó antes de repetirlo. En las capturas finales el contenido es legible, no hay desborde horizontal y el botón del diálogo móvil está por encima de la navegación inferior (también comprobado por `elementFromPoint`). Las PNG quedan en `test-results/`, fuera de la documentación versionada.

## Límites

La prueba de respuesta perdida aborta la respuesta **después** de que el backend temporal procese la renovación; comprueba que el reintento conserva una sola anualidad. Los tres estados de correo se proyectan mediante respuestas HTTP controladas para probar la UI; no prueban entrega por un proveedor externo. Un marcador corrupto bloquea nuevas operaciones y requiere revisión, para no iniciar una renovación con identidad desconocida. No se ejecutó el lote completo de navegador del proyecto ni se probaron cupos de usuarios en este tramo.
