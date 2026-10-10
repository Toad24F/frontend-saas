# Resultado: navegación por rol y formularios del módulo 1

**Fecha:** 10 de octubre de 2026. **Alcance:** primer paso del [orden sugerido](pantallas-pendientes-modulo-1.md): corregir navegación conectada, especialidad, descripción, creación/edición de servicios por profesional y atención por sucursal. El contrato consultado fue el [estado actual del backend](actual.md) y sus controladores.

## Archivos movidos, agregados y modificados

No se movieron archivos en esta etapa. Se conservó la separación previa entre demo, versión conectada y pantallas compartidas.

| Tipo | Archivo(s) | Resultado |
| --- | --- | --- |
| Agregado | `src/connected/screens/cuenta/view.js` | Vista mínima “Mi cuenta” para todos los roles. Da a recepcionista un destino conectado válido mientras se implementan sus operaciones futuras. |
| Modificados | `src/connected/modules/permisos/pages.js`, `src/connected/backend.js`, `src/connected/screens/index.js`, `src/shared/app.js` | Mapa de páginas y destino inicial por rol; navegación lateral y móvil acorde con ese mapa; rutas conectadas no disponibles redirigen al inicio permitido. Se retiran del menú conectado las entradas de demo (agenda, clientes, reportes, notificaciones, portal). El perfil lleva a “Mi cuenta”. |
| Modificados | `src/shared/mobile.css` | La barra móvil conserva sus clases, colores y efectos; el número de columnas se ajusta a las pestañas visibles de cada rol. |
| Modificados | `src/connected/modules/datos/load.js`, `src/connected/modules/catalogos/payload.js` | Se cargan la descripción y autoría reales de servicios y la especialidad real del profesional para el administrador. Para el profesional, las sucursales y su estado individual proceden de `/profesionales/:id/oferta`, incluso si no tienen horario semanal. El payload de servicios incluye descripción. |
| Modificados | `src/shared/screens/catalogos/actions.js`, `src/shared/screens/servicios/view.js` | El administrador puede capturar/editar especialidad y descripción con datos reales. El profesional puede crear servicios y editar solo los de su autoría; su botón de selección ya no se presenta como cambio de estado global. |
| Modificados | `src/shared/actions.js`, `src/shared/screens/sucursales/view.js` | El profesional activa o pausa su atención con `PUT /profesionales/:id/sucursales/:sucursalId/atencion`, sin reescribir el horario. La tarjeta distingue atención individual de sucursal global inactiva. |
| Modificado | `src/shared/screens/plataforma/actions.js` | El enlace a la demo desde “Mi cuenta” abre una pantalla existente de la demo. |
| Modificado | `tests/backend.test.js` | Se actualizó el contrato esperado del payload de servicios y se verificaron páginas por rol, sucursales del profesional, descripción y autoría. |

## Navegación conectada resultante

| Rol | Secciones visibles | Destino inicial |
| --- | --- | --- |
| Superadministrador | Negocios, Mi cuenta | Negocios |
| Administrador del negocio | Profesionales, Servicios, Sucursales, Disponibilidad, Mi cuenta | Profesionales |
| Profesional | Servicios, Sucursales, Disponibilidad, Mi cuenta | Servicios |
| Recepcionista | Mi cuenta | Mi cuenta |

La demo conserva su navegación y su presentación. En la versión conectada se reutilizaron la estructura visual, los componentes, íconos, tarjetas, modales, clases de animación, tema claro/oscuro y estilos existentes. Solo se ajustó la distribución de columnas de la barra móvil para los roles con menos accesos.

## Comportamiento y límites

- `especialidad` se envía al crear o editar un profesional. El profesional no puede editar su propia especialidad porque el backend reserva esa ruta al administrador.
- La descripción de servicios se muestra y se envía como texto. El profesional únicamente ve el control de edición en servicios cuyo `creadorPersonalId` coincide con su perfil; el servidor mantiene la validación de autoría.
- El control de sucursal del profesional cambia `atencionActiva`. La sucursal desactivada globalmente se informa y no ofrece ese control. Los horarios semanales permanecen separados.
- “Mi cuenta” muestra los datos de acceso y opciones de sesión. Cambio de contraseña y vigencia de licencia siguen previstos para el siguiente paso.
- Recepcionista continúa sin agenda operativa porque el backend aún no expone API de citas ni clientes para ese rol.

## Verificación

- `npm test`: 26 pruebas aprobadas.
- `npm run build`: compilación Vite correcta al ejecutarla fuera del sandbox; dentro del sandbox `realpath` sobre `src/shared/app.js` devolvía `EPERM`.
- `node --check` de los archivos JS principales y `git diff --check`: sin errores.
