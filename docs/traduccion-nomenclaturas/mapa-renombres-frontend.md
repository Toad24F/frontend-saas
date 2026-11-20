# Mapa definitivo de renombres del frontend

Intervalo revisado desde el plan inicial en `3a5e633` hasta el cierre de pruebas en `d778a0d`. Cada fila lleva al destino vigente. Los nombres de la primera columna son referencias históricas.

El [glosario](glosario-nomenclatura-frontend.md) reúne equivalencias y excepciones de identificadores. El [resultado de CSS global](resultado-css-global-2026-11-20.md#correspondencia-de-nombres) conserva el detalle de selectores, variables y animaciones. Las notas de cada apartado del [plan](plan-traduccion-nomenclatura-frontend.md) documentan los nombres de dominio traducidos dentro de los archivos.

## Portal público conectado

| Ruta anterior | Ruta vigente |
| --- | --- |
| `src/connected/public/accessibility.js` | [`src/connected/portal-publico/portal.accesibilidad.js`](../../src/connected/portal-publico/portal.accesibilidad.js) |
| `src/connected/public/attempt-store.js` | [`src/connected/portal-publico/intento.store.js`](../../src/connected/portal-publico/intento.store.js) |
| `src/connected/public/booking-lifecycle.js` | [`src/connected/portal-publico/reserva.ciclo-vida.js`](../../src/connected/portal-publico/reserva.ciclo-vida.js) |
| `src/connected/public/booking-view.js` | [`src/connected/portal-publico/reserva.vista.js`](../../src/connected/portal-publico/reserva.vista.js) |
| `src/connected/public/booking.js` | [`src/connected/portal-publico/reserva.flujo.js`](../../src/connected/portal-publico/reserva.flujo.js) |
| `src/connected/public/browser-session.js` | [`src/connected/portal-publico/portal.sesion-navegador.js`](../../src/connected/portal-publico/portal.sesion-navegador.js) |
| `src/connected/public/business-identity.js` | [`src/connected/portal-publico/negocio.identidad.js`](../../src/connected/portal-publico/negocio.identidad.js) |
| `src/connected/public/contact.js` | [`src/connected/portal-publico/reserva.contacto.js`](../../src/connected/portal-publico/reserva.contacto.js) |
| `src/connected/public/dates.js` | [`src/connected/portal-publico/portal.fechas.js`](../../src/connected/portal-publico/portal.fechas.js) |
| `src/connected/public/entry.js` | [`src/connected/portal-publico/portal.entrada.js`](../../src/connected/portal-publico/portal.entrada.js) |
| `src/connected/public/hold-clock.js` | [`src/connected/portal-publico/apartado.reloj.js`](../../src/connected/portal-publico/apartado.reloj.js) |
| `src/connected/public/http.js` | [`src/connected/portal-publico/portal.http.js`](../../src/connected/portal-publico/portal.http.js) |
| `src/connected/public/selection-view.js` | [`src/connected/portal-publico/seleccion.vista.js`](../../src/connected/portal-publico/seleccion.vista.js) |
| `src/connected/public/selection.js` | [`src/connected/portal-publico/seleccion.flujo.js`](../../src/connected/portal-publico/seleccion.flujo.js) |
| `src/connected/public/style.css` | [`src/connected/portal-publico/portal.estilos.css`](../../src/connected/portal-publico/portal.estilos.css) |
| `src/connected/public/submission.js` | [`src/connected/portal-publico/reserva.envio.js`](../../src/connected/portal-publico/reserva.envio.js) |

## Módulos conectados

| Ruta anterior | Ruta vigente |
| --- | --- |
| `src/connected/modules/agenda/attention.js` | [`src/connected/modules/agenda/agenda.atencion.js`](../../src/connected/modules/agenda/agenda.atencion.js) |
| `src/connected/modules/agenda/cache.js` | [`src/connected/modules/agenda/agenda.cache.js`](../../src/connected/modules/agenda/agenda.cache.js) |
| `src/connected/modules/agenda/calendar.js` | [`src/connected/modules/agenda/agenda.calendario.js`](../../src/connected/modules/agenda/agenda.calendario.js) |
| `src/connected/modules/agenda/client.js` | [`src/connected/modules/agenda/agenda.client.js`](../../src/connected/modules/agenda/agenda.client.js) |
| `src/connected/modules/agenda/errors.js` | [`src/connected/modules/agenda/agenda.errores.js`](../../src/connected/modules/agenda/agenda.errores.js) |
| `src/connected/modules/agenda/live-refresh.js` | [`src/connected/modules/agenda/agenda.refresco-vivo.js`](../../src/connected/modules/agenda/agenda.refresco-vivo.js) |
| `src/connected/modules/agenda/manual-contract.js` | [`src/connected/modules/agenda/agenda.contrato-manual.js`](../../src/connected/modules/agenda/agenda.contrato-manual.js) |
| `src/connected/modules/agenda/manual-operation.js` | [`src/connected/modules/agenda/agenda.operacion-manual.js`](../../src/connected/modules/agenda/agenda.operacion-manual.js) |
| `src/connected/modules/agenda/schedule-change.js` | [`src/connected/modules/agenda/agenda.cambio-horario.js`](../../src/connected/modules/agenda/agenda.cambio-horario.js) |
| `src/connected/modules/agenda/store.js` | [`src/connected/modules/agenda/agenda.store.js`](../../src/connected/modules/agenda/agenda.store.js) |
| `src/connected/modules/agenda/versioned-mutation.js` | [`src/connected/modules/agenda/agenda.mutacion-versionada.js`](../../src/connected/modules/agenda/agenda.mutacion-versionada.js) |
| `src/connected/modules/auth/password-policy.js` | [`src/connected/modules/autenticacion/contrasena.politica.js`](../../src/connected/modules/autenticacion/contrasena.politica.js) |
| `src/connected/modules/auth/session.js` | [`src/connected/modules/autenticacion/sesion.estado.js`](../../src/connected/modules/autenticacion/sesion.estado.js) |
| `src/connected/modules/catalogos/capacity.js` | [`src/connected/modules/catalogos/catalogos.cupo.js`](../../src/connected/modules/catalogos/catalogos.cupo.js) |
| `src/connected/modules/catalogos/detail.js` | [`src/connected/modules/catalogos/catalogos.detalle.js`](../../src/connected/modules/catalogos/catalogos.detalle.js) |
| `src/connected/modules/catalogos/payload.js` | [`src/connected/modules/catalogos/catalogos.payload.js`](../../src/connected/modules/catalogos/catalogos.payload.js) |
| `src/connected/modules/clientes/client.js` | [`src/connected/modules/clientes/clientes.client.js`](../../src/connected/modules/clientes/clientes.client.js) |
| `src/connected/modules/datos/load.js` | [`src/connected/modules/datos/datos.carga.js`](../../src/connected/modules/datos/datos.carga.js) |
| `src/connected/modules/disponibilidad/configuration.js` | [`src/connected/modules/disponibilidad/disponibilidad.configuracion.js`](../../src/connected/modules/disponibilidad/disponibilidad.configuracion.js) |
| `src/connected/modules/disponibilidad/payload.js` | [`src/connected/modules/disponibilidad/disponibilidad.payload.js`](../../src/connected/modules/disponibilidad/disponibilidad.payload.js) |
| `src/connected/modules/permisos/pages.js` | [`src/connected/modules/permisos/permisos.paginas.js`](../../src/connected/modules/permisos/permisos.paginas.js) |
| `src/connected/modules/permisos/roles.js` | [`src/connected/modules/permisos/permisos.roles.js`](../../src/connected/modules/permisos/permisos.roles.js) |
| `src/connected/modules/profesionales/operations.js` | [`src/connected/modules/profesionales/profesionales.operaciones.js`](../../src/connected/modules/profesionales/profesionales.operaciones.js) |
| `src/connected/modules/publicacion/precios.js` | [`src/connected/modules/publicacion/publicacion.precios.js`](../../src/connected/modules/publicacion/publicacion.precios.js) |
| `src/connected/modules/recursos/affected.js` | [`src/connected/modules/recursos/recursos.afectaciones.js`](../../src/connected/modules/recursos/recursos.afectaciones.js) |
| `src/connected/modules/recursos/retired.js` | [`src/connected/modules/recursos/recursos.inhabilitados.js`](../../src/connected/modules/recursos/recursos.inhabilitados.js) |
| `src/connected/modules/servicios/operations.js` | [`src/connected/modules/servicios/servicios.operaciones.js`](../../src/connected/modules/servicios/servicios.operaciones.js) |
| `src/connected/modules/sucursales/operations.js` | [`src/connected/modules/sucursales/sucursales.operaciones.js`](../../src/connected/modules/sucursales/sucursales.operaciones.js) |
| `src/connected/modules/sucursales/quota.js` | [`src/connected/modules/sucursales/sucursales.cupo.js`](../../src/connected/modules/sucursales/sucursales.cupo.js) |

## Pantallas conectadas

| Ruta anterior | Ruta vigente |
| --- | --- |
| `src/connected/screens/agenda/live.js` | [`src/connected/screens/agenda/agenda.actualizacion-viva.js`](../../src/connected/screens/agenda/agenda.actualizacion-viva.js) |
| `src/connected/screens/agenda/manual-view.js` | [`src/connected/screens/agenda/agenda.vista-manual.js`](../../src/connected/screens/agenda/agenda.vista-manual.js) |
| `src/connected/screens/agenda/presentation.js` | [`src/connected/screens/agenda/agenda.presentacion.js`](../../src/connected/screens/agenda/agenda.presentacion.js) |
| `src/connected/screens/agenda/quick-state.js` | [`src/connected/screens/agenda/agenda.estado-rapido.js`](../../src/connected/screens/agenda/agenda.estado-rapido.js) |
| `src/connected/screens/agenda/schedule-editor.js` | [`src/connected/screens/agenda/agenda.editor-horario.js`](../../src/connected/screens/agenda/agenda.editor-horario.js) |
| `src/connected/screens/agenda/state-editor.js` | [`src/connected/screens/agenda/agenda.editor-estado.js`](../../src/connected/screens/agenda/agenda.editor-estado.js) |
| `src/connected/screens/agenda/style.css` | [`src/connected/screens/agenda/agenda.estilos.css`](../../src/connected/screens/agenda/agenda.estilos.css) |
| `src/connected/screens/agenda/view.js` | [`src/connected/screens/agenda/agenda.vista.js`](../../src/connected/screens/agenda/agenda.vista.js) |
| `src/connected/screens/auth/dialogs.js` | [`src/connected/screens/autenticacion/autenticacion.vista.js`](../../src/connected/screens/autenticacion/autenticacion.vista.js) |
| `src/connected/screens/auth/style.css` | [`src/connected/screens/autenticacion/autenticacion.estilos.css`](../../src/connected/screens/autenticacion/autenticacion.estilos.css) |
| `src/connected/screens/clientes/panels.js` | [`src/connected/screens/clientes/clientes.paneles.js`](../../src/connected/screens/clientes/clientes.paneles.js) |
| `src/connected/screens/clientes/view.js` | [`src/connected/screens/clientes/clientes.vista.js`](../../src/connected/screens/clientes/clientes.vista.js) |
| `src/connected/screens/cuenta/actions.js` | [`src/connected/screens/cuenta/cuenta.acciones.js`](../../src/connected/screens/cuenta/cuenta.acciones.js) |
| `src/connected/screens/cuenta/license-progress.js` | [`src/connected/screens/cuenta/licencia.progreso.js`](../../src/connected/screens/cuenta/licencia.progreso.js) |
| `src/connected/screens/cuenta/price-publication.js` | [`src/connected/screens/cuenta/cuenta.publicacion-precios.js`](../../src/connected/screens/cuenta/cuenta.publicacion-precios.js) |
| `src/connected/screens/cuenta/style.css` | [`src/connected/screens/cuenta/cuenta.estilos.css`](../../src/connected/screens/cuenta/cuenta.estilos.css) |
| `src/connected/screens/cuenta/view.js` | [`src/connected/screens/cuenta/cuenta.vista.js`](../../src/connected/screens/cuenta/cuenta.vista.js) |
| `src/connected/screens/disponibilidad/actions.js` | [`src/connected/screens/disponibilidad/disponibilidad.acciones.js`](../../src/connected/screens/disponibilidad/disponibilidad.acciones.js) |
| `src/connected/screens/disponibilidad/payload.js` | [`src/connected/screens/disponibilidad/disponibilidad.payload.js`](../../src/connected/screens/disponibilidad/disponibilidad.payload.js) |
| `src/connected/screens/disponibilidad/style.css` | [`src/connected/screens/disponibilidad/disponibilidad.estilos.css`](../../src/connected/screens/disponibilidad/disponibilidad.estilos.css) |
| `src/connected/screens/disponibilidad/view.js` | [`src/connected/screens/disponibilidad/disponibilidad.vista.js`](../../src/connected/screens/disponibilidad/disponibilidad.vista.js) |
| `src/connected/screens/index.js` | [`src/connected/screens/pantallas.conectadas.js`](../../src/connected/screens/pantallas.conectadas.js) |
| `src/connected/screens/negocio/actions.js` | [`src/connected/screens/negocio/negocio.acciones.js`](../../src/connected/screens/negocio/negocio.acciones.js) |
| `src/connected/screens/negocio/license-operations.js` | [`src/connected/screens/negocio/licencia.operaciones.js`](../../src/connected/screens/negocio/licencia.operaciones.js) |
| `src/connected/screens/negocio/license-presentation.js` | [`src/connected/screens/negocio/licencia.presentacion.js`](../../src/connected/screens/negocio/licencia.presentacion.js) |
| `src/connected/screens/negocio/mail-history.js` | [`src/connected/screens/negocio/correo.historial.js`](../../src/connected/screens/negocio/correo.historial.js) |
| `src/connected/screens/negocio/quota-meter.js` | [`src/connected/screens/negocio/cupo.medidor.js`](../../src/connected/screens/negocio/cupo.medidor.js) |
| `src/connected/screens/negocio/style.css` | [`src/connected/screens/negocio/negocio.estilos.css`](../../src/connected/screens/negocio/negocio.estilos.css) |
| `src/connected/screens/negocio/user-quota.js` | [`src/connected/screens/negocio/usuarios.cupo.js`](../../src/connected/screens/negocio/usuarios.cupo.js) |
| `src/connected/screens/negocio/view.js` | [`src/connected/screens/negocio/negocio.vista.js`](../../src/connected/screens/negocio/negocio.vista.js) |
| `src/connected/screens/negocio/workspace.js` | [`src/connected/screens/negocio/negocio.espacio-trabajo.js`](../../src/connected/screens/negocio/negocio.espacio-trabajo.js) |
| `src/connected/screens/profesionales/actions.js` | [`src/connected/screens/profesionales/profesionales.acciones.js`](../../src/connected/screens/profesionales/profesionales.acciones.js) |
| `src/connected/screens/profesionales/style.css` | [`src/connected/screens/profesionales/profesionales.estilos.css`](../../src/connected/screens/profesionales/profesionales.estilos.css) |
| `src/connected/screens/profesionales/view.js` | [`src/connected/screens/profesionales/profesionales.vista.js`](../../src/connected/screens/profesionales/profesionales.vista.js) |
| `src/connected/screens/recepcionistas/actions.js` | [`src/connected/screens/recepcionistas/recepcionistas.acciones.js`](../../src/connected/screens/recepcionistas/recepcionistas.acciones.js) |
| `src/connected/screens/recepcionistas/errors.js` | [`src/connected/screens/recepcionistas/recepcionistas.errores.js`](../../src/connected/screens/recepcionistas/recepcionistas.errores.js) |
| `src/connected/screens/recepcionistas/style.css` | [`src/connected/screens/recepcionistas/recepcionistas.estilos.css`](../../src/connected/screens/recepcionistas/recepcionistas.estilos.css) |
| `src/connected/screens/recepcionistas/view.js` | [`src/connected/screens/recepcionistas/recepcionistas.vista.js`](../../src/connected/screens/recepcionistas/recepcionistas.vista.js) |
| `src/connected/screens/recursos/retired-view.css` | [`src/connected/screens/recursos/inhabilitados.estilos.css`](../../src/connected/screens/recursos/inhabilitados.estilos.css) |
| `src/connected/screens/recursos/retired-view.js` | [`src/connected/screens/recursos/inhabilitados.vista.js`](../../src/connected/screens/recursos/inhabilitados.vista.js) |
| `src/connected/screens/servicios/actions.js` | [`src/connected/screens/servicios/servicios.acciones.js`](../../src/connected/screens/servicios/servicios.acciones.js) |
| `src/connected/screens/servicios/view.js` | [`src/connected/screens/servicios/servicios.vista.js`](../../src/connected/screens/servicios/servicios.vista.js) |
| `src/connected/screens/sucursales/actions.js` | [`src/connected/screens/sucursales/sucursales.acciones.js`](../../src/connected/screens/sucursales/sucursales.acciones.js) |
| `src/connected/screens/sucursales/view.js` | [`src/connected/screens/sucursales/sucursales.vista.js`](../../src/connected/screens/sucursales/sucursales.vista.js) |

## Demostración

| Ruta anterior | Ruta vigente |
| --- | --- |
| `src/demo/agenda-attention.js` | [`src/demo/agenda.atencion.js`](../../src/demo/agenda.atencion.js) |
| `src/demo/agenda-quick-state.js` | [`src/demo/agenda.estado-rapido.js`](../../src/demo/agenda.estado-rapido.js) |
| `src/demo/availability.js` | [`src/demo/disponibilidad.motor.js`](../../src/demo/disponibilidad.motor.js) |
| `src/demo/customer-schedule.js` | [`src/demo/clientes.horario.js`](../../src/demo/clientes.horario.js) |
| `src/demo/data.js` | [`src/demo/demo.datos.js`](../../src/demo/demo.datos.js) |
| `src/demo/entry.js` | [`src/demo/demo.entrada.js`](../../src/demo/demo.entrada.js) |
| `src/demo/schedule.js` | [`src/demo/demo.horario.js`](../../src/demo/demo.horario.js) |
| `src/demo/screens/clientes/actions.js` | [`src/demo/screens/clientes/clientes.acciones.js`](../../src/demo/screens/clientes/clientes.acciones.js) |
| `src/demo/screens/clientes/style.css` | [`src/demo/screens/clientes/clientes.estilos.css`](../../src/demo/screens/clientes/clientes.estilos.css) |
| `src/demo/screens/clientes/view.js` | [`src/demo/screens/clientes/clientes.vista.js`](../../src/demo/screens/clientes/clientes.vista.js) |
| `src/demo/screens/configuracion/style.css` | [`src/demo/screens/configuracion/configuracion.estilos.css`](../../src/demo/screens/configuracion/configuracion.estilos.css) |
| `src/demo/screens/configuracion/view.js` | [`src/demo/screens/configuracion/configuracion.vista.js`](../../src/demo/screens/configuracion/configuracion.vista.js) |
| `src/demo/screens/disponibilidad/view.js` | [`src/demo/screens/disponibilidad/disponibilidad.vista.js`](../../src/demo/screens/disponibilidad/disponibilidad.vista.js) |
| `src/demo/screens/index.js` | [`src/demo/screens/pantallas.demo.js`](../../src/demo/screens/pantallas.demo.js) |
| `src/demo/screens/notificaciones/style.css` | [`src/demo/screens/notificaciones/notificaciones.estilos.css`](../../src/demo/screens/notificaciones/notificaciones.estilos.css) |
| `src/demo/screens/notificaciones/view.js` | [`src/demo/screens/notificaciones/notificaciones.vista.js`](../../src/demo/screens/notificaciones/notificaciones.vista.js) |
| `src/demo/screens/reportes/state.js` | [`src/demo/screens/reportes/reportes.estado.js`](../../src/demo/screens/reportes/reportes.estado.js) |
| `src/demo/screens/reportes/style.css` | [`src/demo/screens/reportes/reportes.estilos.css`](../../src/demo/screens/reportes/reportes.estilos.css) |
| `src/demo/screens/reportes/view.js` | [`src/demo/screens/reportes/reportes.vista.js`](../../src/demo/screens/reportes/reportes.vista.js) |
| `src/demo/screens/reservas/booking.js` | [`src/demo/screens/reservas/reserva.vista.js`](../../src/demo/screens/reservas/reserva.vista.js) |
| `src/demo/screens/reservas/style.css` | [`src/demo/screens/reservas/reserva.estilos.css`](../../src/demo/screens/reservas/reserva.estilos.css) |
| `src/demo/screens/resumen/style.css` | [`src/demo/screens/resumen/resumen.estilos.css`](../../src/demo/screens/resumen/resumen.estilos.css) |
| `src/demo/screens/resumen/view.js` | [`src/demo/screens/resumen/resumen.vista.js`](../../src/demo/screens/resumen/resumen.vista.js) |

## Pantallas compartidas

| Ruta anterior | Ruta vigente |
| --- | --- |
| `src/shared/screens/agenda/actions.js` | [`src/shared/screens/agenda/agenda.acciones.js`](../../src/shared/screens/agenda/agenda.acciones.js) |
| `src/shared/screens/agenda/calendar.css` | [`src/shared/screens/agenda/agenda.calendario.css`](../../src/shared/screens/agenda/agenda.calendario.css) |
| `src/shared/screens/agenda/chrome.js` | [`src/shared/screens/agenda/agenda.controles.js`](../../src/shared/screens/agenda/agenda.controles.js) |
| `src/shared/screens/agenda/filters.js` | [`src/shared/screens/agenda/agenda.filtros.js`](../../src/shared/screens/agenda/agenda.filtros.js) |
| `src/shared/screens/agenda/frame.js` | [`src/shared/screens/agenda/agenda.estructura.js`](../../src/shared/screens/agenda/agenda.estructura.js) |
| `src/shared/screens/agenda/month.js` | [`src/shared/screens/agenda/agenda.mes.js`](../../src/shared/screens/agenda/agenda.mes.js) |
| `src/shared/screens/agenda/navigation.js` | [`src/shared/screens/agenda/agenda.navegacion.js`](../../src/shared/screens/agenda/agenda.navegacion.js) |
| `src/shared/screens/agenda/panels.js` | [`src/shared/screens/agenda/agenda.paneles.js`](../../src/shared/screens/agenda/agenda.paneles.js) |
| `src/shared/screens/agenda/polish.css` | [`src/shared/screens/agenda/agenda.refinamientos.css`](../../src/shared/screens/agenda/agenda.refinamientos.css) |
| `src/shared/screens/agenda/presentation.js` | [`src/shared/screens/agenda/agenda.presentacion.js`](../../src/shared/screens/agenda/agenda.presentacion.js) |
| `src/shared/screens/agenda/state-menu.css` | [`src/shared/screens/agenda/agenda.menu-estado.css`](../../src/shared/screens/agenda/agenda.menu-estado.css) |
| `src/shared/screens/agenda/state-menu.js` | [`src/shared/screens/agenda/agenda.menu-estado.js`](../../src/shared/screens/agenda/agenda.menu-estado.js) |
| `src/shared/screens/agenda/style.css` | [`src/shared/screens/agenda/agenda.estilos.css`](../../src/shared/screens/agenda/agenda.estilos.css) |
| `src/shared/screens/agenda/table.js` | [`src/shared/screens/agenda/agenda.tabla.js`](../../src/shared/screens/agenda/agenda.tabla.js) |
| `src/shared/screens/agenda/timeline.js` | [`src/shared/screens/agenda/agenda.linea-tiempo.js`](../../src/shared/screens/agenda/agenda.linea-tiempo.js) |
| `src/shared/screens/agenda/utility.css` | [`src/shared/screens/agenda/agenda.utilidades.css`](../../src/shared/screens/agenda/agenda.utilidades.css) |
| `src/shared/screens/agenda/utility.js` | [`src/shared/screens/agenda/agenda.utilidades.js`](../../src/shared/screens/agenda/agenda.utilidades.js) |
| `src/shared/screens/agenda/view-preference.js` | [`src/shared/screens/agenda/agenda.preferencia-vista.js`](../../src/shared/screens/agenda/agenda.preferencia-vista.js) |
| `src/shared/screens/agenda/view.js` | [`src/shared/screens/agenda/agenda.vista.js`](../../src/shared/screens/agenda/agenda.vista.js) |
| `src/shared/screens/catalog-header.js` | [`src/shared/screens/catalogos/catalogos.encabezado.js`](../../src/shared/screens/catalogos/catalogos.encabezado.js) |
| `src/shared/screens/catalog-pagination.js` | [`src/shared/screens/catalogos/catalogos.paginacion.js`](../../src/shared/screens/catalogos/catalogos.paginacion.js) |
| `src/shared/screens/catalog-view.js` | [`src/shared/screens/catalogos/catalogos.vista.js`](../../src/shared/screens/catalogos/catalogos.vista.js) |
| `src/shared/screens/catalogos/actions.js` | [`src/shared/screens/catalogos/catalogos.acciones.js`](../../src/shared/screens/catalogos/catalogos.acciones.js) |
| `src/shared/screens/clientes/style.css` | [`src/shared/screens/clientes/clientes.estilos.css`](../../src/shared/screens/clientes/clientes.estilos.css) |
| `src/shared/screens/disponibilidad/actions.js` | [`src/shared/screens/disponibilidad/disponibilidad.acciones.js`](../../src/shared/screens/disponibilidad/disponibilidad.acciones.js) |
| `src/shared/screens/disponibilidad/block-directory.js` | [`src/shared/screens/disponibilidad/disponibilidad.directorio-bloqueos.js`](../../src/shared/screens/disponibilidad/disponibilidad.directorio-bloqueos.js) |
| `src/shared/screens/disponibilidad/block-filters.js` | [`src/shared/screens/disponibilidad/disponibilidad.filtros-bloqueos.js`](../../src/shared/screens/disponibilidad/disponibilidad.filtros-bloqueos.js) |
| `src/shared/screens/disponibilidad/branch-assignments.js` | [`src/shared/screens/disponibilidad/disponibilidad.asignaciones-sucursales.js`](../../src/shared/screens/disponibilidad/disponibilidad.asignaciones-sucursales.js) |
| `src/shared/screens/disponibilidad/errors.js` | [`src/shared/screens/disponibilidad/disponibilidad.errores.js`](../../src/shared/screens/disponibilidad/disponibilidad.errores.js) |
| `src/shared/screens/disponibilidad/groups.js` | [`src/shared/screens/disponibilidad/disponibilidad.grupos.js`](../../src/shared/screens/disponibilidad/disponibilidad.grupos.js) |
| `src/shared/screens/disponibilidad/offering.js` | [`src/shared/screens/disponibilidad/disponibilidad.oferta.js`](../../src/shared/screens/disponibilidad/disponibilidad.oferta.js) |
| `src/shared/screens/disponibilidad/operational-contract.js` | [`src/shared/screens/disponibilidad/disponibilidad.contrato-operativo.js`](../../src/shared/screens/disponibilidad/disponibilidad.contrato-operativo.js) |
| `src/shared/screens/disponibilidad/operational.css` | [`src/shared/screens/disponibilidad/disponibilidad.operativa.css`](../../src/shared/screens/disponibilidad/disponibilidad.operativa.css) |
| `src/shared/screens/disponibilidad/operational.js` | [`src/shared/screens/disponibilidad/disponibilidad.operativa.js`](../../src/shared/screens/disponibilidad/disponibilidad.operativa.js) |
| `src/shared/screens/disponibilidad/schedule-rows.js` | [`src/shared/screens/disponibilidad/disponibilidad.horario-franjas.js`](../../src/shared/screens/disponibilidad/disponibilidad.horario-franjas.js) |
| `src/shared/screens/disponibilidad/style.css` | [`src/shared/screens/disponibilidad/disponibilidad.estilos.css`](../../src/shared/screens/disponibilidad/disponibilidad.estilos.css) |
| `src/shared/screens/disponibilidad/view.js` | [`src/shared/screens/disponibilidad/disponibilidad.vista.js`](../../src/shared/screens/disponibilidad/disponibilidad.vista.js) |
| `src/shared/screens/local-pagination.js` | [`src/shared/screens/paginacion.local.js`](../../src/shared/screens/paginacion.local.js) |
| `src/shared/screens/plataforma/actions.js` | [`src/shared/screens/plataforma/plataforma.acciones.js`](../../src/shared/screens/plataforma/plataforma.acciones.js) |
| `src/shared/screens/plataforma/directory-model.js` | [`src/shared/screens/plataforma/plataforma.modelo-directorio.js`](../../src/shared/screens/plataforma/plataforma.modelo-directorio.js) |
| `src/shared/screens/plataforma/directory.js` | [`src/shared/screens/plataforma/plataforma.directorio.js`](../../src/shared/screens/plataforma/plataforma.directorio.js) |
| `src/shared/screens/plataforma/style.css` | [`src/shared/screens/plataforma/plataforma.estilos.css`](../../src/shared/screens/plataforma/plataforma.estilos.css) |
| `src/shared/screens/plataforma/view.js` | [`src/shared/screens/plataforma/plataforma.vista.js`](../../src/shared/screens/plataforma/plataforma.vista.js) |
| `src/shared/screens/profesionales/errors.js` | [`src/shared/screens/profesionales/profesionales.errores.js`](../../src/shared/screens/profesionales/profesionales.errores.js) |
| `src/shared/screens/profesionales/style.css` | [`src/shared/screens/profesionales/profesionales.estilos.css`](../../src/shared/screens/profesionales/profesionales.estilos.css) |
| `src/shared/screens/profesionales/view.js` | [`src/shared/screens/profesionales/profesionales.vista.js`](../../src/shared/screens/profesionales/profesionales.vista.js) |
| `src/shared/screens/servicios/errors.js` | [`src/shared/screens/servicios/servicios.errores.js`](../../src/shared/screens/servicios/servicios.errores.js) |
| `src/shared/screens/servicios/style.css` | [`src/shared/screens/servicios/servicios.estilos.css`](../../src/shared/screens/servicios/servicios.estilos.css) |
| `src/shared/screens/servicios/view.js` | [`src/shared/screens/servicios/servicios.vista.js`](../../src/shared/screens/servicios/servicios.vista.js) |
| `src/shared/screens/sucursales/errors.js` | [`src/shared/screens/sucursales/sucursales.errores.js`](../../src/shared/screens/sucursales/sucursales.errores.js) |
| `src/shared/screens/sucursales/style.css` | [`src/shared/screens/sucursales/sucursales.estilos.css`](../../src/shared/screens/sucursales/sucursales.estilos.css) |
| `src/shared/screens/sucursales/timezones.js` | [`src/shared/screens/sucursales/sucursales.zonas-horarias.js`](../../src/shared/screens/sucursales/sucursales.zonas-horarias.js) |
| `src/shared/screens/sucursales/view.js` | [`src/shared/screens/sucursales/sucursales.vista.js`](../../src/shared/screens/sucursales/sucursales.vista.js) |

## Núcleo y estilos compartidos

| Ruta anterior | Ruta vigente |
| --- | --- |
| `src/shared/account-portal.css` | [`src/shared/cuenta.portal.css`](../../src/shared/cuenta.portal.css) |
| `src/shared/account-portal.js` | [`src/shared/cuenta.portal.js`](../../src/shared/cuenta.portal.js) |
| `src/shared/actions.js` | [`src/shared/aplicacion.acciones.js`](../../src/shared/aplicacion.acciones.js) |
| `src/shared/app.js` | [`src/shared/aplicacion.nucleo.js`](../../src/shared/aplicacion.nucleo.js) |
| `src/shared/calendar-layout.js` | [`src/shared/calendario.distribucion.js`](../../src/shared/calendario.distribucion.js) |
| `src/shared/data.js` | [`src/shared/aplicacion.datos.js`](../../src/shared/aplicacion.datos.js) |
| `src/shared/forms.js` | [`src/shared/formularios.componentes.js`](../../src/shared/formularios.componentes.js) |
| `src/shared/icons.js` | [`src/shared/iconos.catalogo.js`](../../src/shared/iconos.catalogo.js) |
| `src/shared/mobile.css` | [`src/shared/movil.estilos.css`](../../src/shared/movil.estilos.css) |
| `src/shared/motion.css` | [`src/shared/movimiento.estilos.css`](../../src/shared/movimiento.estilos.css) |
| `src/shared/public/options.css` | [`src/shared/portal-publico/portal.opciones.css`](../../src/shared/portal-publico/portal.opciones.css) |
| `src/shared/public/options.js` | [`src/shared/portal-publico/portal.opciones.js`](../../src/shared/portal-publico/portal.opciones.js) |
| `src/shared/resource-status.js` | [`src/shared/recursos.estado.js`](../../src/shared/recursos.estado.js) |
| `src/shared/styles.css` | [`src/shared/global.estilos.css`](../../src/shared/global.estilos.css) |
| `src/shared/theme.css` | [`src/shared/tema.estilos.css`](../../src/shared/tema.estilos.css) |
| `src/shared/ui.js` | [`src/shared/interfaz.componentes.js`](../../src/shared/interfaz.componentes.js) |

## Entradas y conexión

| Ruta anterior | Ruta vigente |
| --- | --- |
| `src/connected/entry.js` | [`src/connected/conectado.entrada.js`](../../src/connected/conectado.entrada.js) |
| `src/connected/mode.js` | [`src/connected/conexion.modo.js`](../../src/connected/conexion.modo.js) |
| `src/entry-router.js` | [`src/entrada.enrutador.js`](../../src/entrada.enrutador.js) |
| `src/main.js` | [`src/aplicacion.entrada.js`](../../src/aplicacion.entrada.js) |

## Pruebas, configuraciones y datos de prueba

| Ruta anterior | Ruta vigente |
| --- | --- |
| `tests/account-license-progress.test.js` | [`tests/licencia.progreso.test.js`](../../tests/licencia.progreso.test.js) |
| `tests/account-portal-session.test.js` | [`tests/portal-cuenta.sesion.test.js`](../../tests/portal-cuenta.sesion.test.js) |
| `tests/account-portal.test.js` | [`tests/cuenta.portal.test.js`](../../tests/cuenta.portal.test.js) |
| `tests/admin-review.test.js` | [`tests/administracion.revision.test.js`](../../tests/administracion.revision.test.js) |
| `tests/agenda-attention-columns.test.js` | [`tests/agenda.atencion-columnas.test.js`](../../tests/agenda.atencion-columnas.test.js) |
| `tests/agenda-filters.test.js` | [`tests/agenda.filtros.test.js`](../../tests/agenda.filtros.test.js) |
| `tests/agenda-layout-rules.test.js` | [`tests/agenda.distribucion.test.js`](../../tests/agenda.distribucion.test.js) |
| `tests/agenda-polish.test.js` | [`tests/agenda.refinamientos.test.js`](../../tests/agenda.refinamientos.test.js) |
| `tests/agenda-utility.test.js` | [`tests/agenda.utilidades.test.js`](../../tests/agenda.utilidades.test.js) |
| `tests/agenda-view-preference.test.js` | [`tests/agenda.preferencia-vista.test.js`](../../tests/agenda.preferencia-vista.test.js) |
| `tests/agenda-week-attention.test.js` | [`tests/agenda.atencion-semana.test.js`](../../tests/agenda.atencion-semana.test.js) |
| `tests/ala-agenda-semana.test.js` | [`tests/agenda.configuracion-semana.test.js`](../../tests/agenda.configuracion-semana.test.js) |
| `tests/ala-cupos-usuarios.test.js` | [`tests/ala-usuarios.cupo.test.js`](../../tests/ala-usuarios.cupo.test.js) |
| `tests/ala-inhabilitados.test.js` | [`tests/recursos.inhabilitados.test.js`](../../tests/recursos.inhabilitados.test.js) |
| `tests/ala-licencias.test.js` | [`tests/ala-licencia.operaciones.test.js`](../../tests/ala-licencia.operaciones.test.js) |
| `tests/ala-portal-intentos.test.js` | [`tests/ala-portal.intentos.test.js`](../../tests/ala-portal.intentos.test.js) |
| `tests/ala-portal-precios.test.js` | [`tests/ala-portal.precios.test.js`](../../tests/ala-portal.precios.test.js) |
| `tests/ala-publicacion-agenda.test.js` | [`tests/ala-publicacion.precios-agenda.test.js`](../../tests/ala-publicacion.precios-agenda.test.js) |
| `tests/availability.test.js` | [`tests/disponibilidad.motor-demo.test.js`](../../tests/disponibilidad.motor-demo.test.js) |
| `tests/backend.test.js` | [`tests/conexion.backend.test.js`](../../tests/conexion.backend.test.js) |
| `tests/branch-assignments.test.js` | [`tests/disponibilidad.asignaciones.test.js`](../../tests/disponibilidad.asignaciones.test.js) |
| `tests/browser-admin-review.mjs` | [`tests/administracion.revision-navegador.mjs`](../../tests/administracion.revision-navegador.mjs) |
| `tests/browser-business-detail.mjs` | [`tests/negocio.detalle-navegador.mjs`](../../tests/negocio.detalle-navegador.mjs) |
| `tests/browser-local-pagination.mjs` | [`tests/paginacion.local-navegador.mjs`](../../tests/paginacion.local-navegador.mjs) |
| `tests/browser-platform.mjs` | [`tests/plataforma.directorio-navegador.mjs`](../../tests/plataforma.directorio-navegador.mjs) |
| `tests/browser-portal-navigation.mjs` | [`tests/portal.navegacion-navegador.mjs`](../../tests/portal.navegacion-navegador.mjs) |
| `tests/browser/agenda-configuracion.spec.js` | [`tests/navegador/agenda-configuracion.spec.js`](../../tests/navegador/agenda-configuracion.spec.js) |
| `tests/browser/agenda-semana-roles.spec.js` | [`tests/navegador/agenda-semana-roles.spec.js`](../../tests/navegador/agenda-semana-roles.spec.js) |
| `tests/browser/global-setup.js` | [`tests/navegador/integracion.preparacion.js`](../../tests/navegador/integracion.preparacion.js) |
| `tests/browser/licenses.spec.js` | [`tests/navegador/licencia.operaciones.spec.js`](../../tests/navegador/licencia.operaciones.spec.js) |
| `tests/browser/portal.spec.js` | [`tests/navegador/portal.reservas.spec.js`](../../tests/navegador/portal.reservas.spec.js) |
| `tests/browser/retired-resources.spec.js` | [`tests/navegador/recursos.inhabilitados.spec.js`](../../tests/navegador/recursos.inhabilitados.spec.js) |
| `tests/browser/support.js` | [`tests/navegador/integracion.utilidades.js`](../../tests/navegador/integracion.utilidades.js) |
| `tests/browser/user-quotas.spec.js` | [`tests/navegador/usuarios.cupo.spec.js`](../../tests/navegador/usuarios.cupo.spec.js) |
| `tests/business-detail.test.js` | [`tests/negocio.detalle.test.js`](../../tests/negocio.detalle.test.js) |
| `tests/calendar.test.js` | [`tests/calendario.distribucion.test.js`](../../tests/calendario.distribucion.test.js) |
| `tests/fixtures/account-portal.html` | [`tests/datos-prueba/cuenta.portal.html`](../../tests/datos-prueba/cuenta.portal.html) |
| `tests/fixtures/memory-storage.js` | [`tests/datos-prueba/memoria.almacenamiento.js`](../../tests/datos-prueba/memoria.almacenamiento.js) |
| `tests/fixtures/portal-selection-server.mjs` | [`tests/datos-prueba/portal.servidor-simulado.mjs`](../../tests/datos-prueba/portal.servidor-simulado.mjs) |
| `tests/local-pagination.test.js` | [`tests/paginacion.local.test.js`](../../tests/paginacion.local.test.js) |
| `tests/m4-agenda-presentation.test.js` | [`tests/agenda.presentacion-conectada.test.js`](../../tests/agenda.presentacion-conectada.test.js) |
| `tests/m4-agenda.test.js` | [`tests/agenda.consulta-conectada.test.js`](../../tests/agenda.consulta-conectada.test.js) |
| `tests/m4-browser/agenda-attention-columns.spec.js` | [`tests/m4-navegador/agenda.atencion-columnas.spec.js`](../../tests/m4-navegador/agenda.atencion-columnas.spec.js) |
| `tests/m4-browser/agenda-compact.spec.js` | [`tests/m4-navegador/agenda.escala-compacta.spec.js`](../../tests/m4-navegador/agenda.escala-compacta.spec.js) |
| `tests/m4-browser/agenda-entry-context.spec.js` | [`tests/m4-navegador/agenda.contexto-entrada.spec.js`](../../tests/m4-navegador/agenda.contexto-entrada.spec.js) |
| `tests/m4-browser/agenda-fixture.js` | [`tests/m4-navegador/agenda.respuestas-simuladas.js`](../../tests/m4-navegador/agenda.respuestas-simuladas.js) |
| `tests/m4-browser/agenda-layout.spec.js` | [`tests/m4-navegador/agenda.distribucion.spec.js`](../../tests/m4-navegador/agenda.distribucion.spec.js) |
| `tests/m4-browser/agenda-scale-refresh.spec.js` | [`tests/m4-navegador/agenda.escala-refresco.spec.js`](../../tests/m4-navegador/agenda.escala-refresco.spec.js) |
| `tests/m4-browser/agenda-sticky-header.spec.js` | [`tests/m4-navegador/agenda.encabezado-fijo.spec.js`](../../tests/m4-navegador/agenda.encabezado-fijo.spec.js) |
| `tests/m4-browser/agenda-three-columns.spec.js` | [`tests/m4-navegador/agenda.columnas.spec.js`](../../tests/m4-navegador/agenda.columnas.spec.js) |
| `tests/m4-browser/agenda-utility.spec.js` | [`tests/m4-navegador/agenda.utilidades.spec.js`](../../tests/m4-navegador/agenda.utilidades.spec.js) |
| `tests/m4-browser/agenda-view-preference.spec.js` | [`tests/m4-navegador/agenda.preferencia-vista.spec.js`](../../tests/m4-navegador/agenda.preferencia-vista.spec.js) |
| `tests/m4-browser/agenda-week-attention.spec.js` | [`tests/m4-navegador/agenda.atencion-semana.spec.js`](../../tests/m4-navegador/agenda.atencion-semana.spec.js) |
| `tests/m4-browser/agenda.spec.js` | [`tests/m4-navegador/agenda.consulta-conectada.spec.js`](../../tests/m4-navegador/agenda.consulta-conectada.spec.js) |
| `tests/m4-browser/clientes-horario.spec.js` | [`tests/m4-navegador/clientes-horario.spec.js`](../../tests/m4-navegador/clientes-horario.spec.js) |
| `tests/m4-browser/live-errors.spec.js` | [`tests/m4-navegador/agenda.refresco-errores.spec.js`](../../tests/m4-navegador/agenda.refresco-errores.spec.js) |
| `tests/m4-browser/manual.spec.js` | [`tests/m4-navegador/agenda.alta-manual.spec.js`](../../tests/m4-navegador/agenda.alta-manual.spec.js) |
| `tests/m4-browser/polish.spec.js` | [`tests/m4-navegador/agenda.refinamientos.spec.js`](../../tests/m4-navegador/agenda.refinamientos.spec.js) |
| `tests/m4-browser/session-persistence.spec.js` | [`tests/m4-navegador/sesion.persistencia.spec.js`](../../tests/m4-navegador/sesion.persistencia.spec.js) |
| `tests/m4-browser/state-menu.spec.js` | [`tests/m4-navegador/agenda.menu-estado.spec.js`](../../tests/m4-navegador/agenda.menu-estado.spec.js) |
| `tests/m4-live-errors.test.js` | [`tests/agenda.refresco-errores.test.js`](../../tests/agenda.refresco-errores.test.js) |
| `tests/m4-manual.test.js` | [`tests/agenda.alta-manual.test.js`](../../tests/agenda.alta-manual.test.js) |
| `tests/m4-playwright.config.js` | [`tests/m4-navegador.config.js`](../../tests/m4-navegador.config.js) |
| `tests/platform-directory.test.js` | [`tests/plataforma.directorio.test.js`](../../tests/plataforma.directorio.test.js) |
| `tests/portal-publico-accesibilidad.test.js` | [`tests/portal-publico.accesibilidad.test.js`](../../tests/portal-publico.accesibilidad.test.js) |
| `tests/portal-publico-apartado.test.js` | [`tests/portal-publico.apartado.test.js`](../../tests/portal-publico.apartado.test.js) |
| `tests/portal-publico-base.test.js` | [`tests/portal-publico.base.test.js`](../../tests/portal-publico.base.test.js) |
| `tests/portal-publico-cabecera.test.js` | [`tests/portal-publico.cabecera.test.js`](../../tests/portal-publico.cabecera.test.js) |
| `tests/portal-publico-envio.test.js` | [`tests/portal-publico.envio.test.js`](../../tests/portal-publico.envio.test.js) |
| `tests/portal-publico-identidad.test.js` | [`tests/portal-publico.identidad.test.js`](../../tests/portal-publico.identidad.test.js) |
| `tests/portal-publico-navegacion.test.js` | [`tests/portal-publico.navegacion.test.js`](../../tests/portal-publico.navegacion.test.js) |
| `tests/portal-publico-resumen.test.js` | [`tests/portal-publico.resumen.test.js`](../../tests/portal-publico.resumen.test.js) |
| `tests/portal-publico-seleccion.test.js` | [`tests/portal-publico.seleccion.test.js`](../../tests/portal-publico.seleccion.test.js) |
| `tests/schedule.test.js` | [`tests/horario-franja-inactiva.test.js`](../../tests/horario-franja-inactiva.test.js) |
| `tests/session-persistence.test.js` | [`tests/sesion.persistencia.test.js`](../../tests/sesion.persistencia.test.js) |
