# Resultado: baja condicionada de servicios

**Fecha:** 11 de octubre de 2026. **Alcance:** conectar la baja definitiva de servicios para el administrador del negocio, respetando la política de elegibilidad del backend.

## Cambios

| Tipo | Archivo | Resultado |
| --- | --- | --- |
| Agregados | `src/connected/screens/servicios/view.js`, `actions.js`, `style.css` | Botón Eliminar en las tarjetas conectadas de AN, confirmación y mensaje de error junto a la acción. |
| Agregado | `src/connected/modules/servicios/operations.js` | Envía `DELETE /servicios/:id` sin cuerpo y valida el ID local. |
| Modificados | `src/connected/screens/index.js`, `src/shared/screens/servicios/view.js`, `src/shared/actions.js` | Conectan la pantalla y permiten extender solo las tarjetas de AN. Demo y P conservan sus controles. |
| Agregado | `tests/servicios-conectados.test.js` | Comprueba ruta, método, ausencia de cuerpo, ID inválido y propagación del conflicto. |
| Modificado | `docs/pendientes-y-reglas-modulo-1.md` | Retira la baja de servicios de las operaciones pendientes. |

## Comportamiento

- Solo AN ve Eliminar junto al control existente de activar/desactivar. El diálogo explica el carácter definitivo de la baja y ofrece Cancelar.
- El backend determina la elegibilidad: las selecciones actuales, el uso anterior o historial posterior al alta pueden responder `409`. En ese caso el diálogo permanece abierto, muestra el motivo real y conserva el servicio.
- Un `204` exitoso cierra la confirmación y vuelve a cargar el catálogo, por lo que desaparece la tarjeta. Si falla esa recarga, se informa que la baja se guardó pero el catálogo no se pudo actualizar.
- Desactivar conserva el servicio y las preferencias, pero lo retira de la oferta efectiva. P puede seleccionar y, si es autor, editar los servicios permitidos; no recibe la acción de baja. La demo tampoco la recibe.

## Diseño y verificación

Se conservaron tarjetas, colores, tipografía, temas, botones, modales y animaciones. El CSS nuevo solo distribuye las acciones en las tarjetas conectadas y garantiza su tamaño táctil en móvil.

- `npm test`: 36 pruebas aprobadas.
- `npm run build`: compilación Vite correcta.
- `git diff --check`: sin errores.
- Navegador: revisados los botones Desactivar y Eliminar en la cuenta AN, el modal de confirmación y la ausencia de Eliminar en la demo. Se canceló la confirmación; no se eliminaron datos reales.
