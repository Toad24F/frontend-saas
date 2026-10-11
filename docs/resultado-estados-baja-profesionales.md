# Resultado: estados y baja de profesionales

**Fecha:** 11 de octubre de 2026. **Alcance:** cerrar las tres operaciones pendientes de estado y baja de profesionales para el administrador del negocio. Contrato contrastado con [actual.md](actual.md) y `backend/src/profesionales/profesionales.controller.ts`.

## Archivos agregados y modificados

| Tipo | Archivo | Resultado |
| --- | --- | --- |
| Agregados | `src/connected/screens/profesionales/view.js`, `actions.js`, `style.css` | Tarjetas conectadas con botones Desactivar, Reactivar y Eliminar; modales de confirmación y errores junto a la acción. |
| Agregado | `src/connected/modules/profesionales/operations.js` | Envía `POST /profesionales/:id/desactivar`, `POST /profesionales/:id/reactivar` con cuerpo `{}` y `DELETE /profesionales/:id` sin cuerpo. |
| Modificados | `src/connected/screens/index.js`, `src/shared/screens/profesionales/view.js`, `src/shared/actions.js` | La versión conectada utiliza la extensión de la tarjeta compartida y despacha acciones solo para AN. La demo conserva sus tarjetas sin estos controles. |
| Agregado | `tests/profesionales-conectados.test.js` | Comprueba rutas, métodos, cuerpos, IDs inválidos y propagación del conflicto de baja. |
| Modificado | `docs/pendientes-y-reglas-modulo-1.md` | Retira estas tres operaciones de la lista pendiente. |

## Comportamiento

- AN ve el estado de cada profesional y la acción correspondiente: Desactivar si está activo o Reactivar si está inactivo. Ambas muestran una confirmación antes de enviar la solicitud. Desactivar revoca sesiones; reactivar no recupera las sesiones anteriores.
- Eliminar siempre exige confirmación. El backend determina si el perfil y la cuenta son elegibles; si responde 409 por vínculos o historial, el modal conserva el profesional y muestra el motivo recibido. Un 204 exitoso retira la tarjeta tras actualizar los datos.
- Los botones muestran progreso mientras la petición está en curso. Después de un cambio confirmado se recarga el listado; si esa recarga falla, se informa que la operación sí fue guardada.
- P y los demás roles no reciben estas acciones. La autorización definitiva sigue en el backend y el negocio se determina mediante la sesión.

## Diseño y verificación

Se conservaron las tarjetas, colores, tipografía, temas, botones, modales y animaciones existentes. El CSS nuevo solo distribuye las acciones y garantiza tamaño táctil en móvil. La demo no incorpora estos botones.

- `npm test`: 32 pruebas aprobadas.
- `npm run build`: compilación Vite correcta.
- `git diff --check` y `node --check`: sin errores.
- Navegador: revisados listado conectado de AN, confirmaciones de desactivación y eliminación, controles en un viewport de 375 px y ausencia de controles nuevos en la demo. No se confirmaron mutaciones contra las cuentas reales.
