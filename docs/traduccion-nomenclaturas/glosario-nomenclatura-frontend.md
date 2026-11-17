# Glosario definitivo de nomenclatura del frontend

Fecha de cierre: 2026-11-17  
Alcance: etapa 0 del plan de traducción; no implica renombrados de código

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
| `hold` | `apartado` | Retención temporal de un horario en el portal público. |
| `license` | `licencia` | Licencia de acceso del negocio. |
| `business` / `tenant` | `negocio` | Unidad de aislamiento. En la demo, `tenant` también se traduce como `negocio`; nunca como “inquilino”. |
| `receptionist` | `recepcionista` | Cuenta de recepción. |
| `block` | `bloqueo` | Periodo sin atención. |
| `catalog` | `catalogo` | Conjunto de recursos ofrecidos. En identificadores no se usan tildes. |
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

