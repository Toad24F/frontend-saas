# Resultado FALA-T041–T043

Alcance: administración conectada de profesionales, recepción, servicios y sucursales. El backend se consultó como solo lectura; los recorridos usan una base efímera que el runner elimina. La demo conserva datos ficticios y no presenta restauración conectada.

## Flujo y requisitos

1. **T041 · RF-49–RF-50:** desde «Inhabilitados», el Administrador confirma `POST /{tipo}/:id/restaurar` con cuerpo vacío. La respuesta debe indicar `activo: false` e `inhabilitadoEn: null`; entonces se refresca el catálogo operativo. Restaurar no activa la cuenta ni la oferta. La acción de activar permanece separada y vuelve a comprobar cupos/conflictos en el backend.
2. **T042 · RF-51, RF-56:** Profesional, servicio y sucursal ofrecen «Revisar citas afectadas». La UI consulta `GET /disponibilidad/citas-afectadas` durante 31 fechas desde hoy. Usa filtros autorizados de profesional/sucursal y, para servicio, solo muestra causas que el servidor asoció a su ID. Recepción no tiene una causa de oferta propia y no se le atribuyen citas. La pantalla indica que consultar no cancela ni reprograma citas; si no hay causas, lo limita al rango consultado.
3. **T043 · RF-48–RF-51, RF-57–RF-58:** pruebas reales cubren retirar y restaurar los cuatro tipos, estado inactivo, un 409 al intentar reactivar profesional sin cupo, consulta de causa real y rechazo de acceso al detalle de otro negocio.

## Archivos afectados

| Archivo | Qué hace |
| --- | --- |
| `src/connected/modules/recursos/retired.js` | Añade `restoreRetired`: valida tipo, ID, ruta POST y respuesta inactiva antes de anunciar éxito. |
| `src/connected/modules/recursos/affected.js` | Nuevo lector de causas del backend; arma filtros admitidos y conserva únicamente referencias del recurso consultado. |
| `src/connected/screens/recursos/retired-view.js` | Agrega confirmación de restauración, consulta de afectaciones, estados de carga/error/vacío y actualización del catálogo tras éxito. |
| `src/connected/screens/recursos/retired-view.css` | Acomoda nombre, acciones y causas en escritorio/móvil sin tapar botones con la navegación móvil. |
| `src/shared/actions.js` | Despacha los botones nuevos de restauración y afectaciones únicamente en modo conectado. |
| `src/shared/screens/disponibilidad/operational-contract.js` | Da nombres legibles a las causas de inhabilitación devueltas por el backend. |
| `tests/ala-inhabilitados.test.js` | Añade pruebas de los cuatro contratos de restauración, respuesta inactiva y consulta de causas de solo lectura. |
| `tests/browser/global-setup.js` | Siembra un profesional adicional y una cita futura ficticia en el negocio 2 de la base temporal. |
| `tests/browser/retired-resources.spec.js` | Comprueba retiro, restauración, cupo, aislamiento entre negocios y que consultar causas no cambia la cita; captura los temas/tamaños. |
| `tareas.md` | Marca T041–T043 como terminadas. |

## Pruebas y resultado

Primero se añadieron las pruebas unitarias: fallaron al no existir el lector de afectaciones. Tras implementar, `npm test` pasó **182/182**. El navegador del lote pasó **5/5**: los cuatro recursos regresaron inactivos a sus listas, la activación sin cupo recibió 409, otro administrador recibió 403/404 al consultar un detalle ajeno y la cita futura conservó ID, estado e inicio/fin después del retiro. La consulta mostró «Servicio inhabilitado» sin enviar escritores de citas. `npm run build` y `git diff --check` pasaron.

Se revisaron capturas de escritorio y móvil en ambos temas; el botón de restaurar es alcanzable sobre la barra móvil. La suite de navegador completa no se ejecutó en este lote; en el lote anterior la corrida amplia tuvo fallos históricos de carrera del portal y límite de intentos de login. No se presenta como verde una comprobación no realizada.
