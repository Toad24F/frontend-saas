# M5-T124 · Retirada del folio en el frontend

## Flujo visible

La reserva conectada recibe el resumen de alta o de resolución con nombres, horario, zona y costo visible. `reserva.envio.js` valida esos campos y conserva solo esa proyección en memoria. `reserva.vista.js` muestra el estado Pendiente y el resumen, mientras `portal.accesibilidad.js` anuncia la misma condición sin pedir guardar un código. La recuperación sigue usando la clave opaca del intento y el apartado propios, nunca un dato visible.

En Agenda, el alta manual reconoce la cita por ID y versión, y los cambios de estado u horario comprueban esos mismos campos. El detalle, el historial del cliente y las tarjetas compartidas presentan los datos de la cita sin folio. La demo ya no genera códigos ficticios ni ofrece copiarlos. Sus avisos, mensajes de agenda y resumen mantienen la distinción explícita de simulación.

## Archivos modificados

| Grupo | Función |
| --- | --- |
| `src/connected/portal-publico/reserva.envio.js`, `reserva.vista.js`, `portal.accesibilidad.js`, `portal.estilos.css` | Valida el resumen sin folio, lo presenta y anuncia su estado; elimina el estilo sin uso. |
| `src/connected/screens/agenda/agenda.vista-manual.js`, `agenda.vista.js`, `agenda.editor-estado.js`, `agenda.estado-rapido.js`, `agenda.editor-horario.js`, `src/connected/modules/agenda/agenda.contrato-manual.js` | Quita el código del alta, detalle y comparaciones de mutaciones; usa ID y versión. |
| `src/connected/screens/clientes/clientes.paneles.js` | Muestra fecha y zona del historial sin código. |
| `src/demo/demo.datos.js`, `disponibilidad.motor.js`, `screens/reservas/reserva.vista.js`, `screens/clientes/clientes.acciones.js`, `screens/notificaciones/notificaciones.vista.js` | Deja de generar y presentar códigos ficticios en citas, confirmación, ficha y mensajes. |
| `src/shared/screens/agenda/agenda.acciones.js`, `agenda.tabla.js`, `agenda.vista.js`, `agenda.presentacion.js` | Retira la referencia visible de las tarjetas, tabla y demo. |
| `src/shared/global.estilos.css`, `src/demo/screens/reservas/reserva.estilos.css`, `src/shared/screens/agenda/agenda.refinamientos.css`, `agenda.utilidades.css` | Elimina reglas CSS de elementos retirados. |
| `tests/m5-retirada-folio.test.js` y pruebas Node actualizadas | Comprueban un resumen público sin folio, la cita demo sin código y el flujo de recuperación por datos de cita. |
| `tests/navegador/integracion.preparacion.js`, `integracion.utilidades.js`, `portal.reservas.spec.js`, `automatizaciones.configuracion.spec.js`, `recursos.inhabilitados.spec.js` | Preparan la base efímera sin columna folio y consultan las citas por ID o relación de cliente. Los secretos del servidor son efímeros. |

En las pruebas Node, `tests/agenda.alta-manual.test.js` cubre el alta por ID; `agenda.refinamientos.test.js` comprueba tarjetas y detalle; `ala-portal.intentos.test.js` y `ala-portal.precios.test.js` revisan la recuperación y los importes; `automatizaciones.portal.test.js` verifica los datos de mensajes; `disponibilidad.motor-demo.test.js` comprueba la cita demo; `m4-clientes-horario.test.js` revisa el cambio de horario; `portal-publico.envio.test.js` y `portal-publico.resumen.test.js` validan el resumen recibido y visible. En Playwright simulado, `tests/m4-navegador/agenda.alta-manual.spec.js`, `agenda.menu-estado.spec.js`, `agenda.refresco-errores.spec.js`, `agenda.respuestas-simuladas.js` y `agenda.utilidades.spec.js` preparan respuestas y verifican alta, estado y refresco por ID; `clientes-horario.spec.js` comprueba el editor de horario. Los archivos de navegador conectado de la tabla preparan una instalación real y localizan citas por su vínculo, sin un identificador de presentación.

## Verificación

La prueba nueva se escribió y ejecutó antes del cambio; falló con `Resultado no válido.` porque el validador todavía exigía folio. Tras modificar el código pasó 1/1. `npm test` pasó 320/320 y `npm run build` pasó. La búsqueda en `src/connected`, `src/shared` y `src/demo` no encontró referencias a `folio`.

Playwright del portal conectado pasó **15/15** con base efímera; cubrió alta, recuperación tras respuesta perdida, móvil, teclado y el vencimiento real de cinco minutos. En la suite con API simulada pasaron **6/6** casos dirigidos de alta manual y recuperación, y **10/10** de reportes, impresión y PDF. El caso dirigido de cambio de horario de cliente pasó **1/1**. Los escenarios simulados del Profesional quedaron fuera del conjunto dirigido: su fixture no muestra la cita al abrir Agenda y falla antes de verificar el folio. Ese fallo y las suites generales se detallan en la [evidencia del backend](../../../SaaS-backend/docs/fase-6-modulo-5/resultados-tareas/m5-t124-t129.md).
