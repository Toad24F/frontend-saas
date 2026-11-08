# Asignación de sucursales en línea

## Qué cambió y por qué

En **Disponibilidad > Equipo > Sucursales asignadas** se muestran ahora todas las sucursales del negocio en filas, con estado y casilla de asignación. La selección se prepara en la misma pantalla y se envía una sola vez con **Guardar asignaciones**. Esto permite ver las sucursales sin asignar y revisar varios cambios antes de guardarlos; ya no hace falta abrir el diálogo de «Editar asignaciones».

La pantalla resume cuántas sucursales se asignarán y cuántas se quitarán. Al preparar un retiro, avisa que se eliminan los ajustes de servicios de esa sucursal y que los horarios o excepciones pueden impedirlo. Una sucursal inactiva ya asignada se puede retirar; una inactiva sin asignar no se puede agregar. Los borradores se conservan al cambiar de profesional dentro de la sesión, hasta guardarlos o recargar la página.

## Alcance y contrato

- **Conectado:** solo el administrador del negocio puede usar esta pestaña. Antes de guardar se consultan de nuevo las asignaciones y el catálogo; si cambiaron las asignaciones o una sucursal ya no está disponible, se muestra un error y no se envía el `PUT`. El envío mantiene el contrato actual de conjunto completo (`sucursalIds`). Un `409` por franjas o excepciones aparece junto al formulario; `403` y `404` piden actualizar la vista. No se modificó el backend.
- **Demo:** el mismo formulario opera sobre datos ficticios en memoria. Conserva la comprobación de franjas y citas activas al retirar una sucursal. Los cambios se reinician al recargar.
- **Diseño:** se usa la marca y los componentes existentes en tema claro y oscuro; la acción de guardar queda accesible debajo de la lista en móvil.

## Archivos afectados

`src/shared/screens/disponibilidad/{branch-assignments.js,style.css}`, `src/shared/{app.js,actions.js}`, `src/connected/screens/disponibilidad/{view.js,actions.js}`, `src/demo/screens/disponibilidad/view.js`, `tests/branch-assignments.test.js`.

## Comprobación y límites

`npm test` (69 pruebas), `npm run build` y `git diff --check` completados sin errores. Se comprobó la demo en escritorio y móvil, en claro y oscuro: estado inicial, cambio pendiente, aviso de retiro, conflicto visible y botón de guardado accesible sobre la navegación inferior móvil. La pestaña conectada no se pudo probar visualmente sin iniciar sesión; no se envió ninguna asignación real. La API actual no ofrece una versión del conjunto para un guardado condicional: la consulta previa reduce el riesgo de sobrescribir cambios concurrentes, pero no elimina una carrera entre esa consulta y el `PUT`.
