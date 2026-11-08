# Sucursales asignadas en Disponibilidad

## Qué cambió y por qué

La versión conectada separa la identidad del profesional de su configuración de atención. El formulario **Nuevo/Editar profesional** guarda nombre, especialidad, correo y contraseña opcional al editar. La pestaña **Sucursales asignadas** de Disponibilidad permite al administrador elegir las sucursales del profesional seleccionado. Los servicios generales y por sucursal permanecen en **Oferta por sucursal**. Así, guardar el perfil no vuelve a enviar asignaciones que el administrador no modificó. La selección ahora se edita en línea; véase [Asignación de sucursales en línea](asignaciones-sucursales-en-linea.md).

El formulario en línea consulta `GET /profesionales/:id/sucursales` y `GET /sucursales` antes de guardar, y envía el conjunto completo a `PUT /profesionales/:id/sucursales`. Las sucursales inactivas ya asignadas siguen visibles; no se ofrece seleccionar una inactiva nueva. Un conflicto 409 conserva el borrador y explica que deben revisarse las franjas o excepciones antes de quitar la asignación. Los errores 403/404 piden actualizar la vista. La pestaña editable aparece solo para `admin_negocio`; el profesional conserva la gestión de servicios y atención en sus sucursales asignadas.

En el horario semanal conectado ahora se puede quitar incluso la única franja guardada de un día. El formulario deja una fila vacía para volver a añadir horario y, al guardar, no la envía. Esto permite limpiar la sucursal antes de desasignarla. La demo conserva su comportamiento anterior para sus horarios ficticios.

## Alcance

- **Conectado:** perfil de profesional, pestaña nueva y oferta; escritorio y móvil, temas claro y oscuro.
- **Demo:** pestaña equivalente con asignación ficticia en memoria. El formulario de profesionales de la demo conserva sus campos de servicios y sucursales para no alterar el alta ni sus horarios de ejemplo. La demo impide quitar una sucursal con franjas o citas activas.
- **Backend:** sin cambios. Su contrato sigue siendo la fuente de validación de conflictos y pertenencia al negocio.

## Archivos afectados

`src/connected/screens/disponibilidad/{view.js,actions.js,style.css}`, `src/demo/screens/disponibilidad/view.js`, `src/shared/screens/disponibilidad/{view.js,style.css}`, `src/shared/screens/catalogos/actions.js`, `src/shared/actions.js`, `src/connected/modules/catalogos/detail.js`, `tests/detalle-edicion-conectado.test.js` y las notas de integración actualizadas.

## Comprobación y límites

`npm test` (63 pruebas), `npm run build` y `git diff --check` terminaron sin errores. Se inspeccionó en el navegador la pestaña conectada en escritorio oscuro y claro, su diálogo en oscuro y la pestaña y el diálogo de la demo en escritorio oscuro. Se quitó una franja única sin guardar: apareció la fila vacía esperada; después se recargó para descartar el cambio. La verificación visual de móvil queda pendiente. No se envió un cambio de asignación a la API real durante esta revisión. El backend puede rechazar otros usos históricos según su contrato; el mensaje concreto del servidor se conserva para errores distintos del conflicto conocido.
