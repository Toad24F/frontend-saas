# Resultado del paso 3 del módulo 1

**Fecha:** 10 de octubre de 2026. **Alcance:** oferta por sucursal, excepciones de horario, proyección de atención y edición de bloqueos en la versión conectada. Contrato contrastado con [actual.md](actual.md) y los controladores y servicios de `backend/src/horarios` y `backend/src/profesionales`.

## Archivos

| Tipo | Archivos | Resultado |
| --- | --- | --- |
| Agregados | `src/connected/screens/disponibilidad/view.js`, `actions.js`, `style.css`, `payload.js` | Secciones y formularios conectados de oferta, excepciones y proyección; conversión de horarios y validación de rango. |
| Modificado | `src/connected/screens/index.js` | La ruta conectada de Disponibilidad usa la vista extendida; la demo sigue usando la vista compartida. |
| Modificados | `src/shared/screens/disponibilidad/view.js`, `actions.js` | Botón de edición de bloqueos y formulario compartido para alta/edición con `PATCH` real. |
| Modificado | `src/shared/actions.js` | Acciones de la nueva vista, control de permiso para editar un bloqueo propio y limpieza de proyección tras cambios de horario o bloqueos. |
| Agregado | `tests/disponibilidad-conectada.test.js` | Pruebas de cierre explícito, conservación de IDs, minuto 1440 y rango máximo de proyección. |

No se movieron pantallas existentes ni se cambió el backend. Los archivos nuevos de interfaz quedaron dentro del módulo conectado `disponibilidad`.

## Funcionalidad

- **Oferta por sucursal:** consulta `GET /profesionales/:id/oferta`; muestra estado individual de atención, estado global de sucursal y servicio, resultado efectivo y cada motivo de exclusión. La selección general usa `GET/PUT /profesionales/:id/servicios`; la selección por sucursal usa `GET/PUT /profesionales/:id/sucursales/:sucursalId/servicios`; el interruptor individual usa `PUT /profesionales/:id/sucursales/:sucursalId/atencion`. Las asignaciones de sucursales del administrador siguen editándose desde la ficha del profesional.
- **Excepciones:** consulta `GET /profesionales/:id/excepciones`; permite agregar y editar franjas por fecha y sucursal mediante `PUT /profesionales/:id/excepciones/:fecha`. Guardar con `franjas: []` registra un cierre explícito. `DELETE /profesionales/:id/excepciones/:fecha?sucursalId=…` retira la excepción y restaura la semana habitual, sujeto a validación del backend. Se conservan los IDs de franjas al editarlas.
- **Proyección:** consulta por rango inclusivo `GET /profesionales/:id/atencion?desde=…&hasta=…`, con máximo de 366 días. Presenta intervalos, omisiones y el motivo devuelto por el servidor. Se indica que son tramos de trabajo, no espacios de cita; tampoco se aplican allí la selección de servicios ni el interruptor individual de atención. La consulta anterior se limpia al modificar horarios, excepciones o bloqueos.
- **Bloqueos:** el formulario admite edición por `PATCH /bloqueos/:id`, fechas, alcance de profesional/sucursal, tipo, motivo y horas opcionales. AN puede editar bloqueos del negocio/equipo. P solo puede editar los dirigidos a su perfil; los del equipo permanecen visibles sin botones operables. Se envían valores `null` explícitos para retirar horas o alcance y se muestra cualquier conflicto del servidor.

## Diseño y límites

Se reutilizaron las superficies, botones, tablas, modales, tipografía, colores y transiciones existentes. El CSS nuevo solo organiza los datos de disponibilidad y adapta los formularios a móvil. La demo conserva su comportamiento y navegación. No se agregaron citas ni espacios reservables: el backend todavía no ofrece esas API.

## Verificación

- `npm test`: 30 pruebas aprobadas.
- `npm run build`: compilación Vite correcta fuera del sandbox. Dentro del sandbox `realpath` devuelve `EPERM` al resolver un módulo local.
- `git diff --check` y `node --check`: sin errores.
- No se realizaron escrituras de prueba contra datos del backend; la sesión disponible era de superadministración y no permitía abrir Disponibilidad de AN/P para una prueba visual autenticada.
