# Resultado M3-T117–M3-T124 — pruebas de navegador del portal

## Alcance y flujo de prueba

Se añadió un runner Playwright para el **portal conectado**. Antes de abrir el navegador, compila el backend, crea una base MariaDB nueva con nombre aleatorio `citas_persistencia_<32 hex>`, aplica sus migraciones y siembra dos negocios ficticios con licencia, servicio, sucursal, profesional y horarios. Después inicia backend y Vite en puertos locales libres, con el origen público y el proxy apuntando exclusivamente a esos procesos. Al terminar, cierra ambos procesos y elimina la base creada. El runner valida el nombre de la base antes de conectarse y nunca apunta a `DB_NAME` para las escrituras de la prueba.

El recorrido de cada caso es **página pública → API real de NestJS → MariaDB temporal**. Playwright comprueba la interfaz, mientras las consultas SQL de lectura comprueban el efecto persistido. Las fechas de los casos son futuras y distintas para evitar interferencia entre ellos. El navegador utilizado aquí fue Microsoft Edge en modo sin interfaz, mediante Playwright Chromium.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `package.json` y `package-lock.json` | Incorporan Playwright como dependencia de desarrollo y el comando `npm run test:browser`. No se añade una dependencia al producto compilado. |
| `playwright.config.js` | Configura Chromium/Edge, un trabajador, trazas de fallos y la preparación global. |
| `tests/browser/global-setup.js` | Compila el backend, crea/migra/siembra la base temporal, inicia los servidores y limpia procesos y base al finalizar, incluso ante un error de preparación. |
| `tests/browser/support.js` | Proporciona la URL pública local y lecturas SQL limitadas a la base temporal con nombre validado. |
| `tests/browser/portal.spec.js` | Recorre en navegador T117–T124 y confirma citas, apartados y aislamiento con consultas a la base temporal. Los comentarios identifican la intención de los bloques menos evidentes. |
| `.gitignore` | Excluye `test-results/`, que contiene trazas y capturas automáticas de fallos. |
| `docs/fase-4/resultados-tareas/resultado-t117-t124.md` | Registra el flujo, archivos, pruebas, resultados y límites de este lote. |
| `README.md` | Explica el comando de navegador y sus requisitos locales. |
| `../backend/docs/fase-4-modulo-3/tareas.md` | Marca T117–T124 como hechas y enlaza esta evidencia; T125 permanece pendiente. |

No se cambió el código del portal, el backend de producto ni la demo. Por eso no hay nuevas diferencias visuales entre temas o tamaños; T118 usa una ventana móvil de 390 × 844 y los demás casos usan la ventana de escritorio predeterminada.

## Casos cubiertos

| Tarea | Comprobación |
| --- | --- |
| T117 | Abre `/reservas/portal-qa-1`, carga la oferta de la API real y termina limpiando los recursos temporales. |
| T118 | En móvil selecciona oferta, corrige errores de contacto y reserva. El folio visible corresponde a **una** cita `pendiente` de origen público en MariaDB; no hay desbordamiento horizontal. |
| T119 | Recorre selección y envío con foco/teclado, comprueba el foco al pasar al formulario e introduce una nota con apariencia de HTML. La nota queda como texto literal en la base y no crea elementos ni ejecuta código en la página. |
| T120 | Dos pestañas de un contexto comparten la identidad pública: el apartado nuevo sustituye al anterior, la primera pestaña avisa y bloquea reservar. Un reemplazo posterior que pierde ante otro navegador libera el apartado previo. |
| T121 | Contextos de navegador independientes no leen el apartado ni el resultado ajenos. Una selección de horario desactualizada no obtiene una segunda ocupación incompatible; la base conserva una sola. |
| T122 | Recargar borra el contacto del formulario y libera el apartado al salir. Si el navegador no conserva la cookie de sesión, el portal explica por qué no puede continuar. |
| T123 | Si se pierde la respuesta después del commit, al recargar aparece el **mismo** folio persistido. Si se corta antes de llegar al escritor, la resolución termina sin crear cita. |
| T124 | Cambiar el reloj visible del navegador y dejar la pestaña en segundo plano no prolonga el apartado. Se espera su vencimiento real de cinco minutos, se vuelve al portal y se comprueba el aviso de vencimiento y el botón Reservar deshabilitado. |

## Pruebas y resultados

Se escribió primero el caso T117: la primera ejecución falló porque aún no existía `global-setup.js`. Después de montar el runner, T117 pasó. Se escribieron los casos restantes antes de ajustar las fixtures y los selectores. La primera corrida de nueve casos detectó selectores ambiguos de la región viva, una lectura extranjera antes de terminar la inicialización, un caso de cookies que seguía aceptando la cookie y un vencimiento simulado que cambiaba la fecha persistida del apartado. Se corrigieron las pruebas: ahora esperan la sesión, retiran realmente la cookie y T124 espera el vencimiento original en MariaDB.

Resultados finales de los casos nuevos, sobre bases temporales distintas:

| Comando | Resultado |
| --- | --- |
| `npm run test:browser -- --grep-invert T124` | **8/8 aprobadas** (T117–T123, 27.6 s). |
| `npm run test:browser -- --grep T124` | **1/1 aprobada** (vencimiento real, 5.2 min). |
| `npm run test:browser -- --grep T117` | **1/1 aprobada** tras pasar a secretos efímeros generados por ejecución. |
| `npm test` | **152/152 aprobadas** en la suite Node del frontend. |
| `npm run build` | Aprobado; Vite transformó 122 módulos. |
| `git diff --check` | Sin errores de espacios o parches. |

El proceso de T124 se ejecutó por separado porque espera los cinco minutos completos del apartado. Ambos comandos Playwright crearon y eliminaron una base distinta. No se enviaron reservas a la base cotidiana ni se almacenaron secretos en las pruebas o la documentación.

## Límites

### Reejecución del 21 de octubre de 2026

Se revisó el lote ya implementado, sin modificar el código del portal ni las pruebas. Las marcas **M3-T117–M3-T124** ya constan como hechas en el documento fuente de tareas. El archivo `tests/browser/global-setup.js` compila el backend y necesita conectar con MariaDB antes de crear la base temporal; por eso la prueba de navegador no puede comenzar si ese servicio no está disponible.

| Comprobación | Resultado de esta reejecución |
| --- | --- |
| `npm test` | **152/152 aprobadas**, 0 fallidas. Cubre la lógica Node del frontend, incluidos los flujos relacionados del portal. |
| `npm run test:browser` | **No inició casos**: la preparación falló en `global-setup.js:75` al conectar con MariaDB (`AggregateError`). La comprobación TCP a `localhost:3306` devolvió `False`. No se creó base temporal en esta ejecución. |
| `npm run build` | Aprobado; Vite transformó **122 módulos**. |
| `git diff --check` | Aprobado antes de esta nota. |

El flujo de prueba sigue siendo portal → API → base temporal. La falta de MariaDB impide verificarlo de nuevo en este entorno; los resultados 8/8 y 1/1 de Playwright indicados arriba corresponden a la ejecución anterior, no a esta reejecución. No se alteró el backend ni su base cotidiana. El único archivo modificado ahora es esta nota, para distinguir los resultados históricos de los actuales.

La suspensión de T124 se representa con una pestaña de fondo de Edge; no equivale al modo de suspensión física de todos los dispositivos móviles. Las cookies de T122 se bloquean interceptando la cabecera `Set-Cookie` en el contexto de prueba. Los recorridos T120–T121 observan conflictos de escritura reales en la API y la base temporal, pero no sustituyen todas las pruebas de carga. T125 y el cierre de seguridad posterior siguen pendientes.
