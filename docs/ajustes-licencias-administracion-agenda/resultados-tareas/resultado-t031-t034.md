# Resultado FALA-T031–T034

Se implementaron los cupos de profesionales y recepción en el frontend conectado. El superadmin ve límite, consumo y disponibilidad de ambos roles, y puede modificar los dos límites juntos. El administrador ve el cupo vigente de su propio negocio antes de crear o reactivar cuentas. La demo conserva su flujo ficticio y no presenta esos cupos como conectados. Se consultó el contrato del backend sin cambiar sus archivos ni la base habitual.

## Flujo y RF

1. **T031 · RF-45, RF-47:** el detalle del negocio llama `GET /negocios/:id/cupo-usuarios`. La sección «Cupos de usuarios» pinta los contadores recibidos; no cuenta las filas del catálogo.
2. **T032 · RF-45–RF-47:** «Cambiar cupos de usuarios» abre un borrador con mínimo 1. Al guardar envía ambos campos a `PATCH /negocios/:id/limites-usuarios`. Solo la respuesta satisfactoria invalida el detalle y muestra confirmación. Ante 400/409, el diálogo queda abierto con los valores capturados y el error del servidor.
3. **T033 · RF-45–RF-46:** el administrador consulta `GET /profesionales/cupo` o `GET /recepcionistas/cupo`, rutas que derivan el negocio de su sesión. Las altas y reactivaciones muestran activos, límite y disponibles. Si falla la lectura, el texto reconoce que se desconoce el cupo y que el servidor lo validará. Un POST rechazado mantiene el alta o la confirmación abierta y no muestra éxito.
4. **T034 · RF-45–RF-47, RF-57–RF-58:** pruebas con dos negocios y cuentas ficticias verifican 5/3 iniciales, reducción 409, edición persistida, alta y reactivación sin cupo y ausencia del control de edición para el administrador.

## Archivos afectados

| Archivo | Función |
| --- | --- |
| `src/connected/screens/negocio/user-quota.js` | Nuevo contrato de lectura y edición, validación de enteros y presentación de cupos propios y globales. |
| `src/connected/screens/negocio/view.js` | Carga los dos cupos con el detalle y muestra la sección exclusiva del superadmin. |
| `src/connected/screens/negocio/actions.js` | Abre el formulario de ambos límites y conserva el borrador ante rechazo. |
| `src/shared/screens/catalogos/actions.js` | Informa el cupo profesional al crear en modo conectado. La demo no consulta la API. |
| `src/connected/screens/profesionales/actions.js` | Informa cupo antes de reactivar profesional y mantiene el rechazo en el diálogo. |
| `src/connected/screens/recepcionistas/actions.js` | Informa cupo al crear y reactivar recepción; conserva el rechazo. |
| `src/shared/actions.js` | Espera las lecturas asíncronas antes de abrir las confirmaciones. |
| `tests/ala-cupos-usuarios.test.js` | Nuevos casos de contrato, cuerpo PATCH, validación y propagación de 409. |
| `tests/browser/global-setup.js` | Añade cuentas ficticias activas e inactivas únicamente a la base efímera de Playwright. |
| `tests/browser/user-quotas.spec.js` | Nuevos recorridos reales de los dos roles, persistencia, rechazos, permisos y capturas visuales. |
| `tareas.md` | Marca T031–T034 como concluidas. |

## Pruebas y alcance

Se escribieron primero los casos unitarios: fallaron por faltar `user-quota.js` y luego pasaron al implementar las rutas. `npm test`: **177 aprobadas, 0 fallidas**. El navegador del lote: **4 aprobadas, 0 fallidas** con backend compilado y base temporal que el runner destruye. Las pruebas comprueban el 409 con borrador intacto, la cuenta que no se crea o reactiva, y el cambio de límites persistido. `npm run build` y `git diff --check`: correctos.

Se capturaron y revisaron escritorio y móvil de 390 px en ambos temas, más el diálogo móvil oscuro. No se observó desborde horizontal ni controles tapados. Una corrida de los 22 casos de navegador pasó 15 casos, falló en dos casos históricos de carrera del portal (`T121` y `T123`) y quedó sin salida en `T124`; se interrumpió. Los dos fallos pasaron al repetirse aisladamente (**2/2**). Por ello no se afirma que la suite completa de navegador haya quedado verde. La suite unitaria completa y los casos de este lote sí quedaron verdes.
