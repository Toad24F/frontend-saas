# Resultado FALA-T035–T040

Alcance: frontend conectado del Administrador de negocio. Los cuatro recursos se retiran con `POST /:id/inhabilitar`, sin invocar el `DELETE` retirado. Desactivar/reactivar siguen separados. La demo conserva sus catálogos ficticios y no ofrece la consulta conectada. El backend se leyó para confirmar rutas, roles y respuestas; no se modificó.

## Flujo y requisitos

1. **T035 · RF-48–RF-50:** la presentación usa tres estados: activo, inactivo e inhabilitado. La marca `inhabilitadoEn` tiene prioridad. Restaurar quitará la marca, pero seguirá inactivo hasta una activación independiente.
2. **T036–T039 · RF-48–RF-50:** en Profesional, Recepción, servicio y sucursal, «Inhabilitar» abre una confirmación que explica el retiro recuperable. Solo tras un POST correcto se actualiza el catálogo y se anuncia éxito. Recepción conserva sus acciones separadas de desactivar y reactivar. La sucursal relee el cupo del servidor; no se promete liberación por borrar.
3. **T040 · RF-49, RF-57:** el Administrador puede abrir una sección «Inhabilitados» independiente en cada pantalla. La lista se obtiene con `GET /{tipo}/inhabilitados`; cada detalle con `GET /{tipo}/inhabilitados/:id`. El negocio se deriva de la sesión en el backend. La sección no se monta para otros roles ni en demo. Los inhabilitados no se mezclan con los listados operativos.

## Archivos y función

| Archivo | Qué hace |
| --- | --- |
| `src/shared/resource-status.js` y vistas compartidas de profesionales, servicios y sucursales | Definen y aplican las etiquetas de los tres estados; mantienen los textos de selección/atención propios del profesional. |
| `src/shared/screens/profesionales/style.css` | Da un color semántico distinto al estado inhabilitado en ambos temas. |
| `src/connected/modules/recursos/retired.js` | Valida tipos e IDs y centraliza lectura de listas/detalles y el POST de Recepción. |
| `src/connected/modules/{profesionales,servicios,sucursales}/operations.js` | Sustituyen `DELETE` por los POST de inhabilitación; el estado operativo sigue en rutas separadas. |
| `src/connected/screens/recursos/retired-view.js` y `.css` | Presentan la sección separada, estados de carga, vacío, error y detalle autorizado, con diseño adaptable. |
| `src/connected/screens/{profesionales,recepcionistas,servicios,sucursales}/view.js` | Ofrecen «Inhabilitar» y la consulta separada donde corresponde. |
| `src/connected/screens/{profesionales,recepcionistas,servicios,sucursales}/actions.js` | Confirman el retiro, conservan errores en el diálogo y anuncian éxito solo tras respuesta correcta. |
| `src/shared/actions.js` y `src/shared/app.js` | Despachan las nuevas acciones y cierran correctamente los menús; la demo conserva su ruta. |
| `tests/ala-inhabilitados.test.js` y tests conectados existentes de tres recursos | Prueban tres estados, rol, rutas, cuerpo de POST, IDs inválidos y errores sin ocultar. |
| `tests/browser/retired-resources.spec.js` y `tests/browser/global-setup.js` | Prueban los cuatro retiros y detalles reales en el negocio 2 de la base efímera, la demo y capturas visuales. |
| `tareas.md` | Marca T035–T040 como terminadas. |

## Pruebas

Se escribieron primero los tests: fallaron por faltar `resource-status.js` y por las llamadas `DELETE` existentes. Tras implementar: `npm test` **180/180**, navegador del lote **3/3**, `npm run build` y `git diff --check` correctos. El navegador comprobó los cuatro POST `/inhabilitar`, ninguna petición DELETE, salida de cada lista operativa, aparición en la lista separada y lectura de detalle. Se revisaron capturas de escritorio y móvil en claro/oscuro y el diálogo móvil; sin desbordamiento horizontal.

Una corrida amplia de navegador con `T124` excluida obtuvo **21/25**: fallaron los casos históricos de carrera `T121`/`T123` y dos casos posteriores de cupos al alcanzar el límite de cinco intentos de login por IP del backend de pruebas. El lote T035–T040 sí pasó en esa corrida. Se eliminó un login adicional de estas pruebas y se verificó el permiso mediante un test unitario; no se repitió la corrida amplia después de ese ajuste. No se afirma que la suite completa de navegador esté verde.

**Pendiente según el plan:** T041 implementará restaurar como inactivo; T042 mostrará afectaciones de citas sin mutarlas. Este lote solo ofrece consulta del recurso inhabilitado, no esos comandos ni sus efectos.
