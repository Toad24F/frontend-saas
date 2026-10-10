# Estado actual del backend y rutas HTTP

Documentación del código presente al **9 de octubre de 2026**. Describe lo que registran los controladores importados por `AppModule`, no todo lo previsto en las especificaciones. Las reglas de producto están en [`AGENTS.md`](../AGENTS.md); los antecedentes de autenticación están en [`spec-auth.md`](fase-1-auth/spec/spec-auth.md) y [`plan-auth.md`](fase-1-auth/plan-auth.md). Para el módulo 1, véanse el [antecedente](fase-2-modulo-1/spec-modulo-1.md) y el [fix vigente](Fix-modulo-1/spec-fix.md); la [evidencia del fix](Fix-modulo-1/tareas.md) se distingue de las pruebas históricas.

## Convenciones generales

- Base local: `http://localhost:3000` salvo que `PORT` indique otro puerto. No hay prefijo global `/api` ni versionado de rutas en `main.ts`.
- Los cuerpos usan JSON. La validación global transforma los parámetros declarados por los DTO, elimina propiedades no declaradas y **rechaza** campos extra. Las rutas que piden cuerpo vacío aceptan `{}`.
- Las rutas privadas reciben `Authorization: Bearer <accessToken>`. El servidor revalida sesión, estado de cuenta, negocio y licencia en cada petición. El cierre de sesión tiene una estrategia propia que sigue permitiendo revocar la sesión cuando la licencia bloquea el acceso.
- Roles: `superadmin`, `admin_negocio`, `recepcionista` y `profesional`. En las tablas, **SA**, **AN**, **R** y **P** representan esos roles. `:id` siempre es un entero positivo dentro del rango de `INT UNSIGNED`, salvo `envioId`, que es una cadena decimal `BIGINT UNSIGNED` en el cuerpo.
- `POST` devuelve **201** si no se indica otro estado; `GET` y `PATCH` devuelven **200**. Las operaciones marcadas **204** no devuelven cuerpo. Las fechas de respuesta se serializan como ISO 8601. Los errores de validación, autenticación, permisos, recurso inexistente y conflicto suelen usar **400**, **401**, **403**, **404** y **409**, respectivamente; las rutas con límite por IP pueden devolver **429**.
- Los listados de sucursales, servicios, recepcionistas y profesionales incluyen registros inactivos. El `negocioId` de las rutas de operación cotidiana se obtiene de la cuenta autenticada; un ID ajeno no da acceso al registro.

## Ruta raíz

| Método y ruta | Acceso | Entrada | Resultado |
| --- | --- | --- | --- |
| `GET /` | Público | — | **200**, texto `Hello World!`; ejemplo de Nest, sin consulta a la base de datos. |

## Autenticación y credenciales

`POST /auth/login`, `/auth/activar-administrador` y `/auth/recuperar-contrasena` comparten un límite persistido de **5 intentos por IP en 60 segundos**, con bloqueo de 60 segundos al excederlo.

| Método y ruta | Acceso | Cuerpo | Resultado y efecto |
| --- | --- | --- | --- |
| `POST /auth/login` | Público | `email`, `password` | **200**: `message`, `accessToken` y `usuario` (`id`, `nombre`, `email`, `rol`, `negocioId`). Crea una sesión persistida si la cuenta y el acceso están vigentes. |
| `POST /auth/logout` | Bearer de cualquier rol | — | **204**. Revoca únicamente la sesión del token presentado; sigue disponible con licencia suspendida o vencida. |
| `GET /auth/profile` | Bearer de cualquier rol | — | **200**: `mensaje` y `user` con los datos actuales del usuario autenticado (`sub`, `email`, `nombre`, `rol`, `negocioId`, `sesionId`). |
| `POST /auth/activar-administrador` | Público, con código | `codigo`, `correo`, `nombre`, `password` | **200**: cuenta activada (`id`, `negocioId`, `nombre`, `email`, `rol`, `activo`, `activadoEn`). Obtiene el negocio del código, valida su destinatario, consume el código una sola vez, crea la cuenta completa de administrador y habilita el primer año de licencia en una transacción. |
| `POST /auth/recuperar-contrasena` | Público, con código | `codigo`, `password` (nueva clave) | **204**. Consume un código de recuperación de administrador, cambia el hash y revoca todas sus sesiones. No activa cuentas ni licencias. |
| `POST /auth/cambiar-contrasena` | Bearer de cualquier rol | `passwordActual`, `nuevaPassword` | **204**. Cambia la clave de la propia cuenta y revoca todas sus sesiones, incluida la actual. |
| `POST /auth/administradores/:id/autorizar-recuperacion` | SA | `{}` | **201**: `negocioId`, `administradorId`, `envioId`, `estadoEnvio`, `expiraEn`. Emite un código de recuperación para un administrador activado y lo deja en la bandeja de correo; invalida emisiones anteriores. |

Al establecer una contraseña, la política del servicio exige al menos **12 caracteres** y como máximo **72 bytes UTF-8**. La activación requiere el correo al que se emitió el código; el cliente no envía el ID del negocio. La recuperación pública identifica al destinatario mediante el propio código; no recibe correo ni negocio en el cuerpo.

## Negocios y entrega de códigos

Todas las rutas de esta sección requieren **SA**. `GET /negocios` y `GET /negocios/:id` devuelven una vista del negocio con `id`, `nombre`, `identificadorPublico`, `emailContacto`, `telefonoContacto`, `activadoEn`, `creadoEn`, `licencia` (`id`, `habilitadaEn`, `venceEn`, `suspendidaEn`) y `administrador` (`id`, `email`, `activo`, `activadoEn`); las dos relaciones pueden ser `null`. Esa vista no incluye todos los campos persistidos, como RFC o cupo.

| Método y ruta | Cuerpo | Resultado y efecto |
| --- | --- | --- |
| `POST /negocios` | `nombre`, `identificadorPublico`, `emailAdministrador`, `rfc`; opcional `limiteSucursales` | **201**: `negocioId`, `altaAdministradorId`, `licenciaId`, `envioId`, `estadoEnvio`, `expiraEn`. Crea negocio, licencia pendiente, invitación y envío pendiente. No crea una cuenta sin contraseña. El límite inicial es **1** si se omite. |
| `GET /negocios` | — | **200**: arreglo de vistas de negocio, ordenado por ID. |
| `GET /negocios/:id` | — | **200**: vista de un negocio; **404** si no existe. |
| `POST /negocios/:id/reemitir-codigo` | `{}` | **201**: `negocioId`, `altaAdministradorId`, `envioId`, `estadoEnvio`, `expiraEn`. Sustituye el código de una invitación pendiente y encola otro correo; no funciona tras la activación. |
| `PATCH /negocios/:id/correo-administrador` | `correo` | **200**: mismos metadatos de invitación y envío. Corrige el destinatario de una invitación pendiente y, si cambia el correo, invalida el código anterior y encola uno nuevo. Repetir el mismo correo devuelve el estado existente. |
| `GET /negocios/:id/cupo-sucursales` | — | **200**: cupo de un negocio indicado por ID. |
| `PATCH /negocios/:id/limite-sucursales` | `limiteSucursales` | **200**: cupo actualizado. Rechaza un límite menor al número de sucursales activas. |
| `GET /negocios/:id/envios` | — | **200**: arreglo de estados de envío de ese negocio, sin códigos ni contenido del correo. |
| `POST /negocios/:id/reintentar-envio` | `envioId` como cadena decimal | **200**: vista del envío. Vuelve a dejar pendiente un envío fallido o recuperable si su código y destinatario siguen vigentes; no hace una entrega SMTP en la propia petición. |

La vista de cupo contiene `negocioId`, `limiteSucursalesActivas`, `sucursalesActivas` y `disponibles`. Cada vista de envío contiene `id`, `tipo`, `estado`, `intentos`, `proximoIntentoEn`, `confirmadoEn` y `ultimoError`. Crear, reemitir, corregir y autorizar recuperación **encolan** mensajes; el ejecutor periódico concilia, detecta avisos y procesa la bandeja al arrancar y cada minuto fuera de pruebas. La respuesta `estadoEnvio` no confirma entrega.

## Licencias

Las rutas con `:id` usan el **ID de licencia**, no el ID de negocio. Las tres transiciones requieren **SA** y cuerpo `{}`. La vista de vigencia incluye `estado` (`pendiente`, `vigente`, `suspension_pendiente`, `suspendida` o `vencida`), `condicionAcceso`, `suspensionPendiente`, `ahora`, `venceEn`, `bloqueoProgramadoEn`, `tiempoCongelado` y `tiempoRestante` (`dias`, `horas`, `minutos`, o `null`). Durante la suspensión efectiva, `venceEn` se devuelve `null` y el tiempo restante queda congelado.

| Método y ruta | Acceso | Resultado y efecto |
| --- | --- | --- |
| `POST /licencias/:id/suspender` | SA | **200**, vista de vigencia. Programa la suspensión manual y su bloqueo 48 horas después; durante la gracia sigue rigiendo también el vencimiento natural. |
| `POST /licencias/:id/reactivar` | SA | **200**, vista de vigencia. Reanuda la licencia y ajusta el vencimiento con el tiempo conservado; no activa por sí sola el negocio ni cuentas. |
| `POST /licencias/:id/renovar` | SA | **200**, vista de vigencia. Añade un año calendario; renovar no levanta una suspensión. |
| `GET /licencias/mi-vigencia` | AN, R, P | **200**, vista de la licencia del negocio de la sesión; no acepta un ID de negocio enviado por el cliente. |
| `GET /licencias/:id/vigencia` | SA | **200**, vista de cualquier licencia, incluso la de un negocio bloqueado. |

El guard de las rutas privadas comprueba la vigencia también para sesiones ya abiertas. En el instante exacto de bloqueo programado o vencimiento se niega el acceso. La vista expresa días, horas y minutos restantes; los avisos de vencimiento se detectan y envían en segundo plano, sin ruta separada para solicitarlos.

## Recepcionistas

Todas estas rutas requieren **AN**. Los registros se buscan dentro del negocio del actor. La vista pública de recepcionista contiene `id`, `negocioId`, `nombre`, `email`, `rol`, `activo`, `activadoEn`.

| Método y ruta | Cuerpo | Resultado y efecto |
| --- | --- | --- |
| `POST /recepcionistas` | `nombre`, `emailRecepcionista`, `password` | **201**, vista de la cuenta creada y activa, con rol `recepcionista`. |
| `GET /recepcionistas` | — | **200**, arreglo de recepcionistas del negocio. |
| `GET /recepcionistas/:id` | — | **200**, vista de una recepcionista propia. |
| `POST /recepcionistas/:id/desactivar` | `{}` | **204**. Desactiva la cuenta y revoca sus sesiones. |
| `POST /recepcionistas/:id/reactivar` | `{}` | **204**. Reactiva la cuenta; no restaura sesiones revocadas. |
| `POST /recepcionistas/:id/restablecer-contrasena` | `nuevaPassword` | **204**. El administrador cambia la clave de esa recepcionista y revoca sus sesiones. |

## Sucursales

Todas estas rutas requieren **AN**. La vista de sucursal contiene `id`, `negocioId`, `nombre`, `direccion`, `telefono`, `zonaHoraria`, `urlGoogleMaps`, `notasLlegada`, `activo`, `creadoEn`. El alta cuenta solo sucursales activas y serializa la comprobación del límite configurado por el superadmin, incluso ante solicitudes simultáneas.

| Método y ruta | Cuerpo | Resultado y efecto |
| --- | --- | --- |
| `POST /sucursales` | `nombre`, `direccion`, `telefono`, `zonaHoraria`; opcionales `urlGoogleMaps`, `notasLlegada` | **201**, vista de la sucursal creada y activa. **409** si se agotó el cupo. |
| `GET /sucursales` | — | **200**, arreglo de sucursales del negocio. |
| `GET /sucursales/cupo` | — | **200**, vista de cupo del negocio propio. |
| `GET /sucursales/:id` | — | **200**, vista de una sucursal propia. |
| `PATCH /sucursales/:id` | Uno o más campos editables del alta | **200**, vista actualizada. `null` solo permite limpiar `urlGoogleMaps` y `notasLlegada`. |
| `POST /sucursales/:id/desactivar` | `{}` | **204**. Marca la sucursal como inactiva y libera cupo; conserva el registro. |
| `POST /sucursales/:id/reactivar` | `{}` | **204**. Revalida cupo y horarios antes de recuperar el estado global. |
| `DELETE /sucursales/:id` | — | **204** si no existe uso o historial que impida la baja; de lo contrario **409**. |

`zonaHoraria` debe ser una zona IANA válida. El teléfono acepta entre 7 y 20 caracteres con al menos 7 dígitos. `urlGoogleMaps` debe ser un enlace HTTPS de Google Maps o de su acortador oficial.

## Servicios

El administrador (**AN**) controla el estado global. AN y el Profesional (**P**) pueden crear y consultar el catálogo; P solo edita servicios de los que es autor. La vista incluye `id`, `negocioId`, `nombre`, `costo`, `duracionMinutos`, `descripcion`, `creadorPersonalId`, `activo`, `creadoEn`. `costo` se devuelve como decimal en cadena; acepta valor JSON numérico o cadena decimal no negativa, con hasta dos decimales.

| Método y ruta | Acceso | Cuerpo | Resultado y efecto |
| --- | --- | --- | --- |
| `POST /servicios` | AN, P | `nombre`, `costo`, `duracionMinutos`, `descripcion?` | **201**, servicio activo. Si lo crea P, fija su autoría y lo selecciona solo para ese perfil en sus sucursales asignadas. |
| `GET /servicios` | AN, P | — | **200**, catálogo del negocio. |
| `GET /servicios/:id` | AN, P | — | **200**, servicio del negocio. |
| `PATCH /servicios/:id` | AN, P autor | Uno o más de `nombre`, `costo`, `duracionMinutos`, `descripcion` | **200**, datos globales actualizados; la autoría no cambia. |
| `POST /servicios/:id/desactivar` | AN | `{}` | **204**. Retira el servicio de la oferta efectiva sin borrar preferencias. |
| `POST /servicios/:id/reactivar` | AN | `{}` | **204**. Vuelve a marcarlo globalmente activo. |
| `DELETE /servicios/:id` | AN | — | **204** si no existe uso o historial que impida la baja; de lo contrario **409**. |

`duracionMinutos` debe ser entero positivo. No existe un límite de cantidad de servicios en estas rutas.

## Profesionales y sus asignaciones

El `:id` de estas rutas identifica el perfil profesional (`personal.id`); en la implementación actual coincide con `usuarioId`. El administrador usa su propio negocio; P solo accede a su perfil en las rutas que lo admiten. La vista de perfil contiene `id`, `negocioId`, `usuarioId`, `nombre`, `correo`, `especialidad`, `activo`.

| Método y ruta | Acceso | Cuerpo | Resultado y efecto |
| --- | --- | --- | --- |
| `POST /profesionales` | AN | `nombre`, `correo`, `password`, `especialidad` | **201**, cuenta completa activa y perfil asociado. |
| `GET /profesionales` | AN | — | **200**, arreglo de perfiles del negocio. |
| `GET /profesionales/:id` | AN | — | **200**, vista de perfil propio del negocio. |
| `PATCH /profesionales/:id` | AN | Uno o más de `nombre`, `correo`, `password`, `especialidad` | **200**, vista actualizada. Un perfil heredado sin especialidad debe completarla en su siguiente edición; cambiar correo o contraseña revoca sesiones. |
| `POST /profesionales/:id/desactivar` | AN | `{}` | **204**. Desactiva la cuenta y revoca sesiones. |
| `POST /profesionales/:id/reactivar` | AN | `{}` | **204**. Reactiva la cuenta sin restaurar sesiones. |
| `DELETE /profesionales/:id` | AN | — | **204** si no existe uso o historial que impida la baja; de lo contrario **409**. |
| `GET /profesionales/:id/sucursales` | AN | — | **200**, arreglo de IDs de sucursal asignados. |
| `PUT /profesionales/:id/sucursales` | AN | `sucursalIds`: arreglo de IDs únicos | **200**, IDs ordenados. `[]` retira asignaciones permitidas; una sucursal nueva recibe los servicios generales activos. No retira una asignación con horario o excepción. |
| `GET /profesionales/:id/servicios` | AN, P propio | — | **200**, opciones del catálogo con `descripcion`, `creadorPersonalId`, `activo` global y `seleccionado` individual. Incluye selecciones históricas inactivas. |
| `PUT /profesionales/:id/servicios` | AN, P propio | `servicioIds`: IDs únicos, admite `[]` | **200**, opciones actualizadas. Desmarcar conserva combinaciones; volver a marcar recupera ajustes. No añade un servicio globalmente inactivo nunca seleccionado. |
| `GET /profesionales/:id/sucursales/:sucursalId/atencion` | AN, P propio | — | **200**: `sucursalId`, `activo` individual. |
| `PUT /profesionales/:id/sucursales/:sucursalId/atencion` | AN, P propio | `activo` booleano JSON | **200**: `sucursalId`, `activo`. Al reactivar valida horarios y excepciones; no altera sucursal global ni cupo. |
| `GET /profesionales/:id/sucursales/:sucursalId/servicios` | AN, P propio | — | **200**: `sucursalId`, `servicioIds` activos en esa sucursal y seleccionados en general. |
| `PUT /profesionales/:id/sucursales/:sucursalId/servicios` | AN, P propio | `servicioIds`: IDs únicos, admite `[]` | **200**, misma vista. Solo permite servicios seleccionados en general y del negocio; conserva ajustes de otras sucursales. |
| `GET /profesionales/:id/oferta` | AN, P propio | — | **200**, estados fuente y oferta derivada por sucursal, con motivos de exclusión. |

`GET /profesionales/:id/oferta` devuelve `personalId`, `cuentaActiva` y `sucursales` ordenadas. Cada sucursal incluye `id`, `nombre`, `sucursalActiva`, `atencionActiva` y `servicios` del catálogo del negocio. Cada servicio contiene `id`, `nombre`, `servicioActivo`, `seleccionGeneralActiva`, `seleccionSucursalActiva`, `ofrecido` y `motivosExclusion`. Los motivos posibles son `cuenta_inactiva`, `sucursal_inactiva`, `servicio_inactivo`, `servicio_no_seleccionado`, `atencion_inactiva` y `servicio_no_ofrecido_en_sucursal`; pueden aparecer varios. `ofrecido` es verdadero solo si todos los estados están activos. La consulta no persiste ese resultado.

Las asignaciones administrativas indican en qué sucursales puede atender el Profesional. El horario semanal guarda día y franja dentro de esas asignaciones; el interruptor individual de atención no elimina horarios ni selecciones. Los IDs ajenos dan **404**, el perfil de otro Profesional o un rol insuficiente **403**, un cuerpo inválido **400** y un estado u horario incompatible **409**.

## Horarios y excepciones

Todas las rutas de esta sección admiten **AN** del negocio o **P** sobre su propio perfil. `:id` identifica el perfil profesional, no una sucursal ni un usuario arbitrario. `:fecha`, `desde` y `hasta` son fechas civiles `AAAA-MM-DD`; el servicio comprueba que existan en el calendario. Los minutos se cuentan desde las 00:00 de la zona horaria de cada sucursal: el inicio admite 0–1439 y el fin 1–1440.

| Método y ruta | Entrada | Resultado y efecto |
| --- | --- | --- |
| `GET /profesionales/:id/horario` | — | **200**, arreglo completo de franjas semanales, incluidas las inactivas, ordenado por `diaSemana`, `orden` e `id`. |
| `PUT /profesionales/:id/horario` | `franjas`: arreglo completo de franjas semanales; acepta `[]` | **200**, arreglo guardado. Reemplaza la semana completa; cada `id` enviado debe pertenecer al horario actual del perfil y los omitidos se retiran. Valida asignación a sucursal y empalmes antes de guardar. |
| `GET /profesionales/:id/excepciones` | — | **200**, arreglo de excepciones por fecha y sucursal, incluidas las de cierre sin franjas. |
| `PUT /profesionales/:id/excepciones/:fecha` | `sucursalId`, `franjas`: arreglo completo; acepta `[]` | **200**, excepción de esa fecha y sucursal. Reemplaza sus franjas; `[]` registra un cierre explícito. Los `id` de franjas enviados deben pertenecer a esa excepción. |
| `DELETE /profesionales/:id/excepciones/:fecha?sucursalId=...` | `sucursalId` en la consulta, entero positivo | **204**. Retira la excepción de esa sucursal y fecha, restaurando la semana habitual si no genera empalmes. |
| `GET /profesionales/:id/atencion?desde=...&hasta=...` | Ambas fechas en la consulta, intervalo inclusivo de hasta 366 días | **200**: `desde`, `hasta`, `personalId`, `intervalos` y `omisiones`. Proyecta tramos de horario después de excepciones, descansos y bloqueos, en sucursales globalmente activas. |

Una franja semanal acepta `id?`, `diaSemana` (0 domingo–6 sábado), `orden` (entero no negativo), `sucursalId?`, `inicioMinutos?`, `finMinutos?`, `descansoInicioMinutos?`, `descansoFinMinutos?` y `activo` (booleano). Los campos opcionales de sucursal y minutos admiten `null` en borradores inactivos; al activar son obligatorios sucursal, inicio y fin. El descanso, si se usa, exige ambos extremos dentro de la franja. La respuesta contiene esos campos y el `id` asignado.

Una franja de excepción acepta `id?`, `orden`, `inicioMinutos`, `finMinutos`, `descansoInicioMinutos?` y `descansoFinMinutos?`. La vista de excepción devuelve `id`, `sucursalId`, `fechaLocal` y `franjas` con sus IDs. Una sucursal debe estar asignada al profesional. Las franjas se validan contra los horarios de las otras sucursales usando sus zonas horarias, también ante solicitudes simultáneas.

Cada `intervalo` de la consulta de atención contiene `fecha`, `sucursalId`, `inicioMinutos`, `finMinutos`, `inicioUtc` y `finUtc`. Cada `omision` contiene `fecha`, `sucursalId` y `motivo` cuando una hora local de jornada o descanso resulta inválida. Esta proyección no aplica la selección de servicios ni el interruptor individual de atención por sucursal; tampoco ofrece espacios de cita.

## Bloqueos temporales

Las cuatro rutas requieren **AN** o **P**. AN gestiona bloqueos del negocio, incluso los de equipo (`personalId: null`); P solo crea, edita y elimina bloqueos dirigidos a su propio perfil, en sus sucursales asignadas o en todas ellas (`sucursalId: null`). Al editar se autorizan tanto el alcance anterior como el nuevo. Los IDs de otro negocio no dan acceso.

| Método y ruta | Entrada | Resultado y efecto |
| --- | --- | --- |
| `GET /bloqueos` | Filtros opcionales `personalId` y `sucursalId` en la consulta, enteros positivos | **200**, arreglo de bloqueos aplicables, ordenado por `id`. AN ve los del negocio; P ve los propios y los de equipo aplicables a sus sucursales. Un filtro también conserva los bloqueos cuyo alcance correspondiente sea `null`. |
| `POST /bloqueos` | `personalId`, `sucursalId`, `tipo`, `motivo`, `fechaInicio`, `fechaFin`, `inicioMinutos`, `finMinutos` | **201**, bloqueo creado. Los cuatro campos de alcance y hora deben estar presentes, aunque su valor sea `null`. |
| `PATCH /bloqueos/:id` | Uno o más campos del alta | **200**, bloqueo actualizado. Los campos omitidos conservan su valor; `null` cambia explícitamente el alcance o quita ambas horas. |
| `DELETE /bloqueos/:id` | — | **204**. Elimina solo el bloqueo indicado. |

`tipo` acepta `vacaciones`, `dia_festivo` o `emergencia`; `motivo` es texto no vacío de hasta 500 caracteres. `fechaInicio` y `fechaFin` son fechas civiles inclusivas `AAAA-MM-DD`, con inicio no posterior al fin. Si `inicioMinutos` y `finMinutos` son `null`, se bloquean los días completos; si se indican, ambos son enteros y forman un intervalo continuo, que puede abarcar varios días. `personalId: null` significa equipo y `sucursalId: null` todas las sucursales del alcance. La respuesta incluye además `id`, `negocioId`, `creadorUsuarioId` y `creadoEn`.

## Alcance todavía pendiente

La oferta consultada explica preferencias y estados administrativos; **no calcula espacios disponibles** ni confirma citas. No hay controlador HTTP del portal público de reservas por negocio, motor de disponibilidad, creación de reservas, WhatsApp o reportes PDF. El procesador de correo y los avisos de licencia sí tienen ejecución periódica, sin convertir la consulta de oferta en una API pública de disponibilidad.
