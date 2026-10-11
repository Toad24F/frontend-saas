# Resultado: consultas individuales en edición

**Fecha:** 11 de octubre de 2026. **Alcance:** consultar fichas recientes al abrir formularios de edición conectados, sin añadir pantallas de detalle.

## Archivos

| Tipo | Archivo | Resultado |
| --- | --- | --- |
| Agregado | `src/connected/modules/catalogos/detail.js` | Consulta y adapta fichas individuales de servicios, sucursales y profesionales. Para profesionales también carga asignaciones y opciones actuales. |
| Modificados | `src/shared/screens/catalogos/actions.js`, `src/shared/actions.js` | Esperan la consulta antes de abrir el formulario conectado y muestran el error si el registro ya no existe o no es accesible. La demo sigue usando sus datos locales. |
| Agregado | `tests/detalle-edicion-conectado.test.js` | Comprueba rutas, valores recientes, asignaciones y propagación de errores. |
| Modificado | `docs/pendientes-y-reglas-modulo-1.md` | Actualiza el estado de las cuatro consultas individuales auditadas. |

## Decisión por endpoint

| Endpoint | Decisión | Motivo |
| --- | --- | --- |
| `GET /servicios/:id` | Conectado al abrir Editar servicio. | Evita iniciar el formulario con nombre, precio, duración o autoría obsoletos. P conserva la restricción de edición por autor con la autoría reciente. |
| `GET /sucursales/:id` | Conectado al abrir Editar sucursal. | Actualiza dirección, teléfono, zona horaria e indicaciones antes de editar. |
| `GET /profesionales/:id` | Conectado al abrir Editar profesional como AN. | Actualiza los datos de cuenta y perfil. En el mismo flujo se consultan sus sucursales y servicios seleccionados, además de los catálogos de opciones actuales, para evitar retirar asignaciones recientes al guardar. |
| `GET /profesionales/:id/sucursales/:sucursalId/atencion` | Sin llamada directa. | La pantalla de disponibilidad ya carga `GET /profesionales/:id/oferta`, que incluye `atencionActiva` por sucursal, y vuelve a cargarla tras cambiar el interruptor. La consulta individual duplicaría el dato en este flujo. |

## Verificación

- `npm test`: 39 pruebas aprobadas.
- `npm run build`: compilación Vite correcta.
- `git diff --check`: sin errores.
- Navegador: formularios conectados de servicio, sucursal y profesional abiertos con datos y selecciones reales; se cancelaron sin guardar cambios.

Estas consultas refrescan los datos **al abrir** el formulario. No existe control de versiones del registro en la API; otro cambio concurrente después de abrirlo aún puede requerir intervención del backend al guardar.
