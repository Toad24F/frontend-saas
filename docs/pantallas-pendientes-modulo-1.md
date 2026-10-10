# Pantallas pendientes para completar el módulo 1

**Revisión:** 10 de octubre de 2026. **Estado:** propuesta de frontend; no describe pantallas ya implementadas ni autoriza ampliar el backend.

## Base de la revisión

Se contrastaron el [estado actual del backend](../../backend/docs/actual.md) con los controladores registrados en el backend y las [pantallas conectadas](../src/connected/screens/index.js), su [carga de datos](../src/connected/modules/datos/load.js) y sus [permisos de navegación](../src/connected/modules/permisos/pages.js). Para la oferta de servicios prevalece el [contrato implementado del fix](../../backend/docs/Fix-modulo-1/contrato-implementado.md) sobre documentos históricos incompatibles. La [cobertura del prototipo](requerimientos.md) describe la demo, no confirma una API disponible.

El módulo 1 que hoy expone HTTP comprende autenticación, negocios y licencias, personal, sucursales, servicios, oferta por sucursal, horarios, excepciones y bloqueos. La interfaz conectada solo muestra una parte de ello. Las pantallas de agenda, clientes, reservas, reportes y notificaciones de la demo no tienen todavía datos operativos equivalentes en el backend.

## Qué puede hacer cada rol hoy

| Rol | Capacidades verificadas en la API | Límite para la interfaz |
| --- | --- | --- |
| **Superadministrador** (`superadmin`) | Crear y consultar negocios; gestionar invitación del administrador y envíos de correo; consultar y modificar cupo de sucursales; consultar vigencia, suspender, reactivar y renovar licencias; autorizar recuperación de contraseña del administrador. También puede consultar su perfil y cambiar su propia contraseña. | No tiene API de métricas globales de citas, ingresos, personal o uso. Su panel puede resumir negocios, estados de licencia, cupos y envíos con los endpoints existentes. |
| **Administrador del negocio** (`admin_negocio`) | Gestionar recepcionistas, sucursales y profesionales; gestionar estado global de servicios; crear y editar servicios; asignar sucursales y seleccionar servicios de cada profesional; configurar atención y servicios por sucursal; consultar oferta efectiva; gestionar horarios, excepciones y bloqueos; consultar vigencia de su licencia y cambiar su contraseña. | No puede editar datos generales del negocio o su licencia, ni consultar citas, clientes, ingresos o reportes reales. |
| **Profesional** (`profesional`) | Consultar catálogo; crear servicios y editar los que creó; seleccionar sus servicios generales y por sucursal; activar o desactivar su atención por sucursal asignada; consultar su oferta; gestionar su horario, excepciones y bloqueos propios; consultar vigencia y cambiar contraseña. | No puede editar perfiles de otros profesionales ni su especialidad por API. Puede ver bloqueos de equipo aplicables, pero solo modifica los propios. No tiene agenda de citas. |
| **Recepcionista** (`recepcionista`) | Iniciar y cerrar sesión, consultar perfil y vigencia de licencia, cambiar su propia contraseña. | Todavía no tiene rutas para agenda, reservas, clientes, sucursales ni catálogos. El administrador sí puede crear, listar, desactivar, reactivar y restablecer la contraseña de sus cuentas. |

## Pantallas nuevas propuestas

**Prioridad 1: cierre funcional del módulo 1 con API disponible.**

| Pantalla | Rol | Contenido y conexión posible |
| --- | --- | --- |
| **Inicio / dashboard de superadministrador** | SA | Totales y estados de negocios, licencias próximas a vencer o suspendidas, invitaciones pendientes y envíos fallidos. Componer con `GET /negocios`, `GET /licencias/:id/vigencia` y, al abrir un negocio, `GET /negocios/:id/envios`. Los indicadores son operativos; no incluir cifras de citas o ingresos. |
| **Detalle de negocio** | SA | Datos visibles del negocio, administrador, licencia, cupo y envíos. Acciones para reemitir código, corregir correo de invitación pendiente, cambiar límite de sucursales, reintentar envío, autorizar recuperación de contraseña, suspender, reactivar y renovar licencia. Usar el **ID de licencia** para `/licencias/:id/*`. Mostrar que suspender programa bloqueo a 48 horas y que renovar no quita una suspensión. |
| **Activación de administrador y recuperación con código** | Público con código | Formularios reales para `POST /auth/activar-administrador` y `POST /auth/recuperar-contrasena`. La activación pide código, correo, nombre y contraseña; la recuperación pide código y nueva contraseña. El frontend hoy presenta flujos simulados. |
| **Recepcionistas** | AN | Listado, alta, detalle, desactivar/reactivar y restablecer contraseña mediante `/recepcionistas`. No ofrecer edición de nombre/correo: no existe esa ruta. |
| **Mi cuenta y licencia** | Todos los roles; vigencia para AN, P y R | Consultar `GET /auth/profile`, cambiar contraseña y cerrar sesión; AN/P/R consultan `GET /licencias/mi-vigencia`. Tras cambiar contraseña, la sesión actual queda revocada. SA no usa `mi-vigencia`. |
| **Inicio limitado de recepcionista** | R | Mostrar identidad, estado de licencia y accesos a mi cuenta/cerrar sesión. Ocultar agenda, clientes y demás enlaces de demo hasta que exista autorización y API correspondiente. |

**Prioridad 2: completar configuraciones de disponibilidad y oferta.**

| Pantalla | Rol | Contenido y conexión posible |
| --- | --- | --- |
| **Oferta del profesional por sucursal** | AN y P propio | Mostrar estado de cuenta, sucursal, atención, servicio global, selección general y selección local, con motivos de exclusión de `GET /profesionales/:id/oferta`. Permitir selección general y por sucursal, y el interruptor individual de atención. AN asigna sucursales; P solo opera las ya asignadas. |
| **Excepciones por fecha** | AN y P propio | Crear, sustituir y quitar excepciones de una sucursal/fecha con `GET/PUT/DELETE /profesionales/:id/excepciones`. Una excepción con `franjas: []` es cierre explícito; eliminarla restaura el horario habitual cuando sea válido. |
| **Vista de atención proyectada** | AN y P propio | Mostrar intervalos y omisiones de `GET /profesionales/:id/atencion?desde=...&hasta=...`, con filtro de fechas. Rotularla como **proyección de horario**, no como espacios de cita: no aplica selección de servicios ni interruptor individual de atención. |

## Cambios necesarios en pantallas conectadas que ya existen

| Vista | Ajuste propuesto | Motivo / API |
| --- | --- | --- |
| **Negocios / plataforma SA** | Conservar el listado y alta; llevar las operaciones y su estado detallado a “Detalle de negocio”. Separar visualmente negocio, licencia, invitación, cupo y bandeja de correo. | La vista actual cubre solo alta/lista y algunas transiciones. `GET /negocios/:id` no incluye RFC ni cupo; este último requiere `GET /negocios/:id/cupo-sucursales`. Encolar un correo no significa entrega confirmada. |
| **Profesionales AN** | Pedir y mostrar `especialidad` al crear y editar; usar el dato real del perfil. Ofrecer asignación de sucursales y acceso a la oferta efectiva por profesional. Mantener acciones de desactivar, reactivar y eliminar sujetas a respuesta del servidor. | `POST /profesionales` requiere especialidad; `PATCH /profesionales/:id` la admite. El frontend conectado aún usa un marcador para ese campo. |
| **Servicios AN** | Mostrar y editar `descripcion`, autoría y estado global; permitir baja cuando el servidor la acepte. | La API devuelve descripción y `creadorPersonalId`; la interfaz actual omite el envío de descripción. |
| **Servicios P** | Permitir crear servicios y editar solo los que tienen `creadorPersonalId` propio. Mantener aparte la selección de servicios que ofrece; no mostrar controles de estado global. | `POST /servicios` admite P; `PATCH /servicios/:id` admite P autor. La vista conectada actual no expone alta/edición para P. |
| **Sucursales AN** | Mostrar cupo activo/disponible, detalle completo y eliminación condicionada. Mostrar error de cupo o conflicto del backend al crear/reactivar/eliminar. | `GET /sucursales/cupo`, `GET /sucursales/:id`, `DELETE /sucursales/:id`. |
| **Sucursales / disponibilidad P** | Sustituir nombres sintéticos de sucursal por datos permitidos o por los nombres de `GET /profesionales/:id/oferta`; usar `PUT /profesionales/:id/sucursales/:sucursalId/atencion` para activar/desactivar atención. | Hoy se deducen sucursales desde horarios y el interruptor modifica `PUT /horario`, que representa otra operación. P no tiene `GET /sucursales`. |
| **Disponibilidad AN/P** | Completar edición de bloqueos (`PATCH`), excepciones y proyección de atención. Distinguir bloqueos propios/de equipo y no ofrecer edición de equipo a P. | Los endpoints están implementados; la interfaz actual cubre principalmente horario semanal y alta/baja de bloqueos. |
| **Navegación conectada** | Mostrar únicamente pantallas autorizadas según rol y reservar las secciones sin API para la demo. | La navegación compartida todavía expone enlaces genéricos que terminan en vista pendiente; R no tiene ninguna pantalla conectada habilitada. |

## Dependencias que aún faltan en el backend

Estas pantallas se pueden diseñar, pero **no se pueden conectar con datos reales** usando el módulo 1 actual:

1. **Agenda operativa, citas, clientes y reserva pública:** faltan API de disponibilidad/espacios, creación y gestión de reservas, consulta de agenda y portal público por negocio. Esto afecta sobre todo a R, pero también a AN y P.
2. **Paneles con actividad de citas, ingresos, ocupación o reportes:** no hay endpoints de métricas ni reportes PDF. El dashboard SA de prioridad 1 debe limitarse a negocios, licencias, cupos y envíos.
3. **WhatsApp y notificaciones de citas:** no hay API correspondiente. Los correos existentes son de invitación, recuperación y licencia.
4. **Edición de datos del negocio por AN, edición de datos de recepcionista y edición de especialidad por P:** no existen rutas para esas operaciones. No mostrar formularios que prometan guardarlas.
5. **Lectura de nombres de sucursales para P fuera de la oferta:** P no puede listar `/sucursales`; la vista `GET /profesionales/:id/oferta` sí incluye nombres de las sucursales asignadas para su propia oferta.

## Orden sugerido

1. Corregir navegación por rol y formularios que ya no coinciden con el contrato: especialidad, descripción, alta/edición de servicios por P e interruptor de atención por sucursal.
2. Implementar las pantallas de SA (dashboard y detalle), activación/recuperación real, recepcionistas y mi cuenta/licencia.
3. Completar oferta por sucursal, excepciones, proyección de atención y edición de bloqueos.
4. Cuando el backend incorpore citas y permisos operativos de R, conectar agenda, clientes y reserva pública. Después abordar métricas, reportes y WhatsApp con sus contratos reales.
