# Glosario definitivo de nomenclatura del frontend

Fecha de cierre: 2026-11-17  
Alcance: reglas de la etapa 0 y términos incorporados durante las migraciones.

## Regla general

Los nombres creados por Citalendar para el frontend se escriben en español. Los archivos usan `dominio.responsabilidad.extensión`, por ejemplo `clientes.vista.js`. Se conservan en inglés los términos técnicos acordados y cualquier nombre impuesto por un contrato, una API de plataforma o una dependencia.

Un nombre solo puede traducirse cuando se haya comprobado que es interno. Si atraviesa HTTP, almacenamiento persistente, URL, eventos entre pestañas o selectores consumidos fuera del archivo, debe conservarse o migrarse de manera coordinada y compatible.

## Entidades del dominio

| Concepto anterior o posible | Nombre canónico | Uso y límite |
| --- | --- | --- |
| `appointment` | `cita` | Una cita del negocio. Los estados recibidos de la API no cambian. |
| `customer` | `cliente` | Persona atendida. No usar `cliente` para un cliente HTTP. |
| `branch` | `sucursal` | Sede del negocio. |
| `professional` / `person` cuando representa personal | `profesional` | Cuenta o perfil profesional. No traducir un `person` genérico sin verificar su significado. |
| `service` cuando representa la oferta comercial | `servicio` | Servicio reservable. No cambiar APIs nativas que contengan `service`. |
| `schedule` | `horario` | Horario semanal o configuración horaria. |
| `availability` | `disponibilidad` | Resultado o reglas de disponibilidad. |
| `booking` / `reservation` | `reserva` | Flujo de reserva confirmado o en preparación. |
| `public portal` | `portal publico` | Entrada pública de reservas y opciones compartidas. |
| `attempt` | `intento` | Envío recuperable con un marcador temporal. |
| `submission` | `envio` | Preparación, registro y resolución de un intento. |
| `hold` | `apartado` | Retención temporal de un horario en el portal público. |
| `quota` | `cupo` | Límite, consumo y disponibilidad confirmados por el servidor. |
| `validity` | `vigencia` | Estado y tiempo de acceso de la licencia. |
| `price publication` | `publicacion de precios` | Visibilidad de precios en el catálogo público. |
| `license` | `licencia` | Licencia de acceso del negocio. |
| `business` / `tenant` | `negocio` | Unidad de aislamiento. En la demo, `tenant` también se traduce como `negocio`; nunca como “inquilino”. |
| `receptionist` | `recepcionista` | Cuenta de recepción. |
| `block` | `bloqueo` | Periodo sin atención. |
| `catalog` | `catalogo` | Conjunto de recursos ofrecidos. En identificadores no se usan tildes. |
| `authentication` / `session` | `autenticacion` / `sesion` | Acceso conectado y estado del acceso. Las rutas HTTP de autenticación y las claves persistidas quedan protegidas. |
| `account` | `cuenta` | Cuenta del usuario actual. |
| `user` | `usuario` | Identidad autenticada. |
| `role` | `rol` | Rol contractual; sus valores literales quedan protegidos. |
| `workspace` | `espacioTrabajo` | Estado o área de trabajo de una pantalla; no sustituye a `negocio`. |
| `resource` | `recurso` | Nombre genérico para sucursal, servicio, profesional o recepcionista. |

### Singular, plural y composición

- Variables con un elemento usan singular: `cita`, `clienteSeleccionado`, `sucursalId`.
- Colecciones usan plural: `citas`, `clientes`, `sucursales`.
- Los identificadores contractuales, por ejemplo `sucursalId` y `personalId`, permanecen exactamente como los define el backend.
- Los identificadores internos nuevos usan español y `camelCase`; las constantes usan `MAYUSCULAS_CON_GUION_BAJO`.
- Los nombres de archivo se escriben en minúsculas, sin tildes, y separan palabras con guion: `agenda.editor-estado.js`.

## Acciones canónicas

| Acción o verbo anterior | Nombre canónico | Cuándo usarlo |
| --- | --- | --- |
| `create` | `crear` | Construir o registrar un elemento nuevo. |
| `read` / `fetch` remoto | `consultar` | Obtener información mediante API o consulta de dominio. |
| `get` | `obtener` | Recuperación puntual, normalmente síncrona o desde estado ya disponible. |
| `list` | `listar` | Devolver o preparar una colección. |
| `load` | `cargar` | Inicializar o incorporar datos en una pantalla o estado. |
| `update` | `actualizar` | Modificar datos existentes. |
| `save` | `guardar` | Persistir una preferencia, borrador o formulario. |
| `delete` / `remove` | `eliminar` | Retirar definitivamente un elemento interno. Si el dominio distingue baja, inhabilitación o desvinculación, usar ese verbo preciso. |
| `select` | `seleccionar` | Elegir un elemento o alternativa. |
| `open` | `abrir` | Abrir panel, diálogo o recurso. |
| `close` | `cerrar` | Cerrar panel, diálogo o sesión según el contexto. |
| `validate` | `validar` | Comprobar reglas y devolver o lanzar el resultado correspondiente. |
| `apply` | `aplicar` | Aplicar filtros, reglas o cambios ya definidos. |
| `reset` | `restablecer` | Volver al estado inicial. |
| `toggle` | `alternar` | Cambiar entre dos estados. |
| `format` | `formatear` | Preparar texto o valores para presentación. |
| `build` | `construir` | Componer una estructura interna. |
| `copy` | `copiar` | Copiar datos o texto. |
| `change` | `cambiar` | Ejecutar una transición explícita. |

La traducción se decide por responsabilidad, no por sustitución literal. Por ejemplo, `loadAppointments()` será `cargarCitas()` si llena el estado de pantalla, pero `consultarCitas()` si solo realiza la petición.

## Excepciones técnicas en inglés

| Término protegido | Motivo | Composición permitida |
| --- | --- | --- |
| `client` | Adaptador o cliente de una API; evita confundirlo con la entidad `cliente`. | `agendaClient`, `crearAgendaClient`, `agenda.client.js` |
| `store` | Contenedor técnico de estado o persistencia con esa responsabilidad explícita. | `agendaStore`, `crearAgendaStore`, `agenda.store.js` |
| `payload` | Cuerpo técnico preparado para una petición o mutación. | `payloadCita`, `crearPayloadCita`, `agenda.payload.js` |
| `render` | Generación o actualización de presentación visual. | `renderAgenda`, `renderTarjetaCita` |
| `handler` | Referencia genérica a una función controladora de eventos. | `handler`, `handlerCambio` |
| `handle` | Prefijo de una función que atiende un evento. | `handleClicAgenda`, `handleEnvioFormulario` |

Estas excepciones no autorizan conservar en inglés los conceptos que las acompañan: `renderAppointment` debe convertirse en `renderCita`, no quedarse completamente en inglés.

También permanecen en inglés las palabras reservadas de JavaScript, nombres de las APIs web, métodos HTTP, atributos HTML/ARIA, clases de Bootstrap, nombres de paquetes y comandos de herramientas.

## Siglas técnicas

Las siglas se conservan en mayúsculas cuando aparecen como texto o nombre independiente: **API**, **HTTP**, **URL**, **ID**, **UTC** y **DOM**.

En identificadores `camelCase` se conserva la convención ya usada por la plataforma y los contratos:

- Sufijo `Id`: `sucursalId`, `negocioId`.
- Inicio de identificador: `apiAgenda`, `urlPortal`, `utcInicio`, `elementoDom`.
- Constantes: `URL_API`, `MAXIMO_INTENTOS`.

No se renombra una propiedad contractual solo para ajustar la capitalización.

## Inventario protegido

### Contratos HTTP

La fuente de autoridad es el código del backend de solo lectura: controladores, DTO, entidades y tipos dentro de `../backend/src/`. La documentación de apoyo está en `../backend/docs/` y `docs/`, pero ante una diferencia prevalece el código vigente.

Quedan protegidos:

- Métodos HTTP, rutas, parámetros de ruta y consulta.
- Nombres de campos de solicitud y respuesta.
- Encabezados, cookies, códigos de error y acciones públicas.
- Roles, permisos, estados, orígenes y enumeraciones.
- Formatos de fecha, zona horaria, folio, versión e idempotencia.

Espacios de rutas privadas consumidos actualmente por el frontend:

- `/auth`
- `/negocios`
- `/licencias`
- `/profesionales`
- `/recepcionistas`
- `/sucursales`
- `/servicios`
- `/bloqueos`
- `/disponibilidad`
- `/citas`
- `/clientes`

El portal público conserva la base `/publico/negocios/:slug` y las rutas `sesion`, `catalogo`, `disponibilidad`, `apartados`, `apartados/:id`, `apartados/:id/liberar`, `intentos`, `intentos/:clave/reservar` e `intentos/:clave/resolver`.

Ejemplos de propiedades protegidas ya consumidas: `negocioId`, `sucursalId`, `personalId`, `servicioId`, `clienteId`, `inicioUtc`, `finUtc`, `fechaLocal`, `horaInicio`, `estado`, `version`, `pagina`, `limite`, `busqueda`, `modalidad`, `mostrarPreciosPublicos`, `emailRecepcionista` y `nuevaPassword`.

### Rutas del frontend

No se traducen durante el cambio de nomenclatura:

- `/admin/:pagina` y `/admin/negocio/:id`.
- `/reservas/:slug`.
- El parámetro `?demo=1`.
- Los valores de página que ya forman parte de navegación e historial, entre ellos `agenda`, `clientes`, `profesionales`, `recepcionistas`, `sucursales`, `servicios`, `disponibilidad`, `cuenta`, `negocio`, `plataforma`, `configuracion` y `notificaciones`.

Cambiar una URL requiere una tarea independiente con compatibilidad, redirección o migración explícita.

### Roles y valores de estado

Los siguientes valores son literales contractuales y no se traducen ni se corrigen estilísticamente:

- Roles: `superadmin`, `admin_negocio`, `recepcionista`, `profesional`.
- Citas: `pendiente`, `confirmada`, `completada`, `cancelada`, `no_asistio`.
- Licencias: `pendiente`, `vigente`, `suspension_pendiente`, `suspendida`, `vencida`.
- Intentos: `preparado`, `registrado`, `no_registrado`.
- Apartados: `vigente`, `liberado`, `sustituido`, `vencido`.
- Operaciones de apartado: `preparada`, `concedida`, `rechazada`, `sustituida`.
- Altas: `pendiente`, `activada`.
- Correos: `pendiente`, `tomado`, `enviado`, `fallido`, `descartado`.
- Orígenes consumidos: `manual`, `portal_publico`.

Esta lista es un inventario de protección, no una autorización para que el frontend invente o acepte valores adicionales.

### Almacenamiento y coordinación del navegador

Estas claves y canales quedan protegidos hasta que exista una migración específica:

- `cita-theme`.
- `cita-session` en `localStorage` y compatibilidad con `sessionStorage`.
- `citalendar-catalog-view`.
- Claves heredadas `citalendar-professionals-view`, `citalendar-receptionists-view`, `citalendar-services-view` y `citalendar-branches-view`.
- `cita-agenda-view:demo` y `cita-agenda-view:connected`.
- `citalendar:manual:v1:<negocioId>:<actorId>`.
- `citalendar:public:attempt:<slug>`.
- `citalendar:license:pending:<actorId>`.
- Canales `citalendar:portal:<slug>`.
- Bloqueos del navegador `citalendar:portal:mutacion:<slug>` y `citalendar:portal:sesion:<slug>`.

También quedan protegidos los valores persistidos que acompañan esas claves, como `light`, `dark`, `list`, `cards`, `day`, `week`, `month`, `demo` y `connected`.

### Selectores y nombres externos

No se traducen:

- Elementos y atributos estándar HTML: `button`, `dialog`, `class`, `id`, `name`, `type`, `hidden`, `tabindex`.
- Atributos ARIA y roles: `aria-label`, `aria-expanded`, `aria-selected`, `aria-pressed`, `role`, `alert`, `dialog`, `tab`, `tabpanel`.
- Clases de Bootstrap: por ejemplo `btn`, `btn-primary`, `btn-light`, `form-control`, `d-flex`, `mt-*`.
- Propiedades, eventos y métodos del DOM: `dataset`, `querySelector`, `addEventListener`, `click`, `submit`, `popstate`, `storage`.
- Selectores pertenecientes a librerías o herramientas de prueba externas.

Las clases CSS, los `id`, los atributos `data-*` y sus valores creados por Citalendar sí están dentro del alcance de traducción, pero forman una interfaz interna coordinada. Solo se cambian junto con todos sus consumidores en HTML generado, JavaScript, CSS y pruebas; nunca mediante una sustitución aislada.

### Variables de entorno y herramientas

Se conservan `VITE_API_URL`, `VITE_APP_NAME`, `VITE_DEMO_TODAY`, los scripts de `package.json` y los nombres de Vite, Bootstrap, Playwright y demás dependencias.

## Criterio para nombres nuevos

Antes de agregar un nombre:

1. Determinar si pertenece al dominio, a una acción propia, a una excepción técnica o a un contrato externo.
2. Usar el término canónico de este documento.
3. Si no existe, añadirlo al glosario antes de crear variantes distintas en varios módulos.
4. Si el nombre cruza una frontera protegida, conservarlo y documentar su origen.

Este glosario se aplica al código nuevo desde su fecha de cierre. La migración del código existente debe seguir las unidades y verificaciones de `docs/traduccion-nomenclaturas/plan-traduccion-nomenclatura-frontend.md`.

## Equivalencias de Clientes

| Nombre anterior | Nombre adoptado |
| --- | --- |
| `clientes/view.js`, `clientes/actions.js`, `clientes/panels.js`, `clientes/style.css` | `clientes.vista.js`, `clientes.acciones.js`, `clientes.paneles.js`, `clientes.estilos.css` |
| `clientes/client.js`, `createCustomerClient`, `customerPayload` | `clientes.client.js`, `crearClientesClient`, `crearPayloadCliente` |
| `list`, `detail`, `history`, `create`, `update` del cliente HTTP | `listar`, `consultar`, `consultarHistorial`, `crear`, `corregir` |
| `clients` como nombre de la vista | `clientes` |
| `openCustomer`, `openCustomerEditor`, `openDemoCustomer`, `newClient` | `abrirFichaCliente`, `abrirEditorCliente`, `abrirFichaClienteDemo`, `nuevoCliente` |
| `customer-schedule.js`, `correctDemoCustomer`, `moveDemoAppointment` | `clientes.horario.js`, `corregirClienteDemo`, `moverCitaDemo` |
| `clientSnapshot` en las citas de demo | `contactoHistorico` |
| `data-directory-open`, `data-client`, `new-client` | `data-directorio-abrir`, `data-ficha-demo-abrir`, `nuevo-cliente` |

## Equivalencias de Catálogos compartidos

| Nombre anterior | Nombre adoptado |
| --- | --- |
| `catalog-view.js`, `catalog-header.js`, `catalog-pagination.js`, `catalogos/actions.js` | `catalogos.vista.js`, `catalogos.encabezado.js`, `catalogos.paginacion.js`, `catalogos.acciones.js` |
| `local-pagination.js`, `localPage`, `paginationHtml` | `paginacion.local.js`, `paginarLocalmente`, `renderPaginacionLocal` |
| `catalogos/detail.js`, `catalogos/capacity.js`, `catalogos/payload.js` | `catalogos.detalle.js`, `catalogos.cupo.js`, `catalogos.payload.js` |
| `catalog`, `save`, `catalogPayload` | `abrirEditorCatalogo`, `guardarRegistroCatalogo`, `crearPayloadCatalogo` |
| `search`, `status`, `branch`, `service` de los filtros de catálogo | `busqueda`, `estado`, `sucursal`, `servicio` |
| `all`, `active`, `inactive` de los filtros de catálogo | `todos`, `activo`, `inactivo` |
| `list`, `cards` en la interfaz de catálogo | `lista`, `tarjetas`. En el almacenamiento se conservan `list` y `cards`. |
| `data-desktop-view`, `data-catalog-pagination`, `data-catalog-page`, `data-page-kind` | `data-vista-escritorio`, `data-paginacion-catalogo`, `data-pagina-catalogo`, `data-tipo-catalogo` |
| Sufijos `-results` y `-reset` de catálogos | `-resultados` y `-limpiar` |

## Equivalencias de Disponibilidad

| Nombre anterior | Nombre adoptado |
| --- | --- |
| `view.js`, `actions.js`, `errors.js`, `style.css` de Disponibilidad | `disponibilidad.vista.js`, `disponibilidad.acciones.js`, `disponibilidad.errores.js`, `disponibilidad.estilos.css` |
| `schedule-rows.js`, `groups.js`, `offering.js`, `branch-assignments.js` | `disponibilidad.horario-franjas.js`, `disponibilidad.grupos.js`, `disponibilidad.oferta.js`, `disponibilidad.asignaciones-sucursales.js` |
| `block-directory.js`, `block-filters.js` | `disponibilidad.directorio-bloqueos.js`, `disponibilidad.filtros-bloqueos.js` |
| `operational.js`, `operational-contract.js`, `operational.css` | `disponibilidad.operativa.js`, `disponibilidad.contrato-operativo.js`, `disponibilidad.operativa.css` |
| `configuration.js`, `payload.js`, `schedulePayload` | `disponibilidad.configuracion.js`, `disponibilidad.payload.js`, `crearPayloadHorario` |
| `demo/availability.js`, `slots`, `holdSlot`, `createAppointment` de demo | `demo/disponibilidad.motor.js`, `buscarHorariosDemo`, `apartarHorarioDemo`, `crearCitaDemo` |
| `data-availability-tab`, `data-availability-action`, `data-schedule-row`, `data-block-filter` | `data-disponibilidad-pestana`, `data-disponibilidad-accion`, `data-horario-franja`, `data-filtro-bloqueos` |

## Equivalencias de Agenda

| Nombre anterior | Nombre adoptado |
| --- | --- |
| `agendaView`, `agendaFrame`, `agendaToolbar`, `agendaPanel` | `vistaAgenda`, `estructuraAgenda`, `barraAgenda`, `panelAgenda` |
| `calendarPeriod`, `renderTimeline`, `renderMonth`, `eventLayout` | `periodoCalendario`, `renderLineaTiempo`, `renderMes`, `distribuirEventos` |
| `readAgendaView`, `saveAgendaView`, `resolveAgendaBranches` | `leerVistaAgenda`, `guardarVistaAgenda`, `resolverSucursalesAgenda` |
| `createAgendaClient`, `createAgendaStore`, `createAgendaCache` | `crearAgendaClient`, `crearAgendaStore`, `crearCacheAgenda` |
| `list`, `detail`, `history`, `clients` del cliente de Agenda | `listar`, `consultarDetalle`, `consultarHistorial`, `listarClientes` |
| `manualSelection`, `stateChange`, `scheduleChange`, `privateError` | `seleccionManual`, `crearPayloadCambioEstado`, `crearPayloadCambioHorario`, `errorSeguro` |
| `data-m4-view`, `data-view`, `data-m4-appointment`, `data-appointment` | `data-agenda-vista`, `data-agenda-vista-demo`, `data-agenda-cita`, `data-cita` |
| `agenda-layout-change`, `m4-agenda-updated`, `m4-record-obsolete` | `agenda-cambio-distribucion`, `agenda-actualizada`, `registro-desactualizado` |

El [resultado de Agenda](resultado-agenda-2026-11-18.md) registra la correspondencia de archivos y los contratos compartidos.

## Equivalencias de Plataforma, permisos y recursos inhabilitados

| Nombre anterior | Nombre adoptado |
| --- | --- |
| `platform`, `switchTenant`, `newTenant` | `plataforma`, `cambiarEspacioTrabajo`, `registrarNegocio` |
| `directoryState`, `directoryHtml`, `directoryResults`, `bindDirectory` | `estadoDirectorio`, `renderDirectorio`, `renderResultadosDirectorio`, `vincularDirectorio` |
| `directoryPage`, `matchesFollowUp`, `remainingLabel` | `paginarDirectorio`, `coincideSeguimiento`, `textoTiempoRestante` |
| `query`, `license`, `followUp`, `page` del directorio | `busqueda`, `estadoLicencia`, `seguimiento`, `pagina` |
| `pending`, `expiring`, `blocked`, `failed` de seguimiento | `por-activar`, `por-vencer`, `acceso-bloqueado`, `correos-fallidos` |
| `pagesForRole`, `defaultPage`, `availablePage` | `paginasPorRol`, `paginaInicial`, `paginaPermitida` |
| `canConsultRetired`, `readRetiredList`, `readRetiredDetail`, `restoreRetired`, `disableReceptionist` | `puedeConsultarInhabilitados`, `listarInhabilitados`, `consultarDetalleInhabilitado`, `restaurarInhabilitado`, `inhabilitarRecepcionista` |
| `retiredSection`, `handleRetiredClick`, `readResourceEffects`, `effectReasons` | `renderAccesoInhabilitados`, `handleClicInhabilitados`, `consultarCitasAfectadas`, `motivosAfectacion` |
| Prefijos CSS y `data-*` de estas vistas | `platform-` → `plataforma-`, `retired-` → `inhabilitados-` |

El [resultado de Plataforma, permisos y recursos inhabilitados](resultado-plataforma-permisos-recursos-2026-11-20.md) registra las rutas de archivo y las interfaces conservadas.

## Equivalencias de las pantallas restantes de la demo

| Nombre anterior | Nombre adoptado |
| --- | --- |
| `loadData`, `validateSchedules`, `appointmentCovered` | `cargarDatosDemo`, `validarFranjasDemo`, `citaCubiertaPorHorarioDemo` |
| `overview`, `reports`, `settings`, `notifications` | `renderResumenDemo`, `renderReportesDemo`, `renderConfiguracionDemo`, `renderNotificacionesDemo` |
| `reportData`, `reportState` | `filtrarCitasReporte`, `estadoReportes` |
| `from`, `to`, `branch`, `all` en los filtros de Reportes | `desde`, `hasta`, `sucursal`, `todas` |
| `filter-reports`, `export-report` | `filtrar-reportes`, `imprimir-reporte` |
| `business-form`, `notification-form` | `formulario-negocio-demo`, `formulario-notificaciones-demo` |
| `confirmations`, `reminders`, `reminder` del negocio ficticio | `confirmacionesActivas`, `recordatoriosActivos`, `horasRecordatorio` |

Las rutas de archivo, los cambios de selectores y sus comprobaciones se registran en el [resultado de la demo](resultado-demo-restante-2026-11-20.md).

## Equivalencias del núcleo compartido

| Nombre anterior | Nombre adoptado |
| --- | --- |
| `boot`, `resolveEntry`, `start`, `renderView` | `iniciarEntrada`, `resolverEntrada`, `iniciarAplicacion`, `renderPantalla` |
| `state`, `navigate`, `renderShell`, `handleClick` | `estadoAplicacion`, `navegar`, `renderEstructuraAplicacion`, `handleClicAplicacion` |
| `tenantId`, `page`, `calendarView`, `date` del estado volátil | `negocioId`, `pagina`, `vistaCalendario`, `fecha` |
| `branch`, `professional`, `status`, `search`, `agendaHistory`, `businessId` del estado volátil | `sucursal`, `profesional`, `estadoCita`, `busqueda`, `historialAgenda`, `detalleNegocioId` |
| `db`, `replaceData`, `list`, `resource`, `tenantById`, `appointmentInfo` | `datosAplicacion`, `reemplazarDatos`, `listarRegistros`, `obtenerRecurso`, `obtenerNegocio`, `ampliarDatosCita` |
| `TODAY`, `date`, `iso`, `addDays`, `time`, `minutes` | `HOY`, `crearFecha`, `fechaIso`, `sumarDias`, `minutosAHora`, `horaAMinutos` |
| `escape`, `modal`, `toast`, `pageHead`, `empty`, `badge`, `button`, `icon` | `escaparHtml`, `abrirDialogo`, `mostrarAviso`, `renderEncabezadoPagina`, `renderEstadoVacio`, `renderEtiquetaEstado`, `renderBoton`, `renderIcono` |
| `field`, `select`, `basicForm`, `errorSlot`, `formError` | `renderCampo`, `renderSelector`, `abrirFormulario`, `espacioErrorFormulario`, `mostrarErrorFormulario` |
| `calendarColumns`, `resourceStatus` | `columnasCalendario`, `estadoRecurso` |
| `accountPortalUrl`, `renderAccountPortal`, `copyAccountPortal`, `bindAccountPortal` | `urlPortalCuenta`, `renderPortalCuenta`, `copiarEnlacePortalCuenta`, `vincularPortalCuenta` |
| `isDemo`, `pending`, `modeUrl`, `loadBackendData`, `user` de la fachada | `esDemo`, `mensajePendiente`, `urlSegunModo`, `cargarDatosBackend`, `usuarioActual` |

