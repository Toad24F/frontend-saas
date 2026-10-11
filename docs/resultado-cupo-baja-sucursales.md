# Resultado: cupo y baja de sucursales

**Fecha:** 11 de octubre de 2026. **Alcance:** mostrar el cupo propio y ofrecer la baja condicionada de sucursales al administrador del negocio.

## Cambios

| Tipo | Archivo | Resultado |
| --- | --- | --- |
| Agregados | `src/connected/screens/sucursales/view.js`, `actions.js`, `style.css` | Resumen del cupo en la vista conectada, botón Eliminar por sucursal y confirmación con error junto a la acción. |
| Agregados | `src/connected/modules/sucursales/quota.js`, `operations.js` | Conserva la última vista de cupo cargada y envía `DELETE /sucursales/:id` sin cuerpo. |
| Modificados | `src/connected/modules/datos/load.js`, `src/connected/screens/index.js`, `src/shared/screens/sucursales/view.js`, `src/shared/actions.js` | Carga `GET /sucursales/cupo`, conecta la pantalla AN y permite extender las tarjetas compartidas sin agregar controles a la demo ni al profesional. |
| Modificados | `tests/backend.test.js` y `tests/sucursales-conectadas.test.js` | Comprueban lectura del cupo, ruta y método de baja, IDs inválidos y propagación del conflicto. |
| Modificado | `docs/pendientes-y-reglas-modulo-1.md` | Retira estas dos operaciones de la lista pendiente. |

## Comportamiento

- AN ve límite de sucursales activas, cuántas están activas y cuántos lugares hay disponibles. Los valores provienen de `GET /sucursales/cupo`, sin calcularse desde el listado.
- Después de crear, desactivar, reactivar o eliminar, la recarga habitual de datos actualiza tanto tarjetas como cupo. La validación final del límite y de horarios sigue en el backend; un `409` de alta o reactivación se muestra al usuario.
- Eliminar exige confirmación. Un `204` retira la tarjeta y vuelve a cargar el cupo. Un `409` u otro error deja el modal abierto y muestra el mensaje recibido, sin ocultar la sucursal. Desactivar sigue siendo la opción para conservar el registro y liberar cupo.
- El profesional solo ve sus sucursales asignadas y su interruptor individual de atención. La demo no muestra cupo ni baja.

## Diseño y verificación

Se conservan tarjetas, botones, colores, tipografía, temas, modales y animaciones existentes. El CSS nuevo solo organiza el resumen y adapta el botón de baja para uso táctil.

- `npm test`: 34 pruebas aprobadas.
- `npm run build`: compilación Vite correcta.
- `git diff --check`: sin errores.
- Navegador: verificados el cupo real y el botón Eliminar en la cuenta AN, el modal de confirmación y la ausencia de cupo y baja en la demo. Se canceló la confirmación; no se eliminaron datos reales.
