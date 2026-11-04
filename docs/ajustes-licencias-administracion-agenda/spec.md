# Especificación funcional del frontend — Fase 4

**Estado:** propuesta de comportamiento objetivo para revisión. Este documento no acredita implementación, aprobación, despliegue ni cierre de fase. Los RF son locales a esta especificación.

## Objetivo y referencias

Ofrecer el portal público de reservas y adaptar las pantallas administrativas a los ajustes de licencias, cupos, recursos, precios y agenda, de forma comprensible y segura para cada rol. La versión conectada expresa los resultados del backend; la demo conserva datos ficticios identificados como tales.

Prevalecen para las reglas de negocio los contratos del [portal público del backend](../../../backend/docs/fase-4-modulo-3/spec.md) y de los [ajustes ALA del backend](../../../backend/docs/ajustes-licencias-administracion-agenda/spec.md). Para las cinco rutas privadas de disponibilidad sigue vigente la [spec frontend de fase 3](../fase-3/spec.md) en lo compatible con los ajustes. La [constitución frontend ALA](../ajustes-licencias-administracion-agenda/constitucion.md) fija la continuidad de marca y permisos. Esta spec describe la experiencia del frontend y no redefine cálculos ni autoriza cambios de backend.

El portal conectado cuenta con implementación y evidencias anteriores; esta propuesta no las revalida. Las adaptaciones administrativas ALA y la recuperación pública indicada como dependencia deberán comprobarse antes de llamarse terminadas.

## Requisitos funcionales en EARS

### 1. Acceso público y selección

**Por qué:** permitir que cualquier cliente encuentre una opción real del negocio correcto sin confundir carga, ausencia de oferta y fallo técnico.

- **RF-01.** Cuando una persona abra `/reservas/:slug` de un negocio disponible, el frontend deberá mostrar el portal de ese negocio sin solicitar cuenta ni sesión administrativa.
- **RF-02.** Si el enlace es inválido, el negocio no existe o el backend impide nuevas reservas por licencia, el frontend deberá explicar que no se puede reservar desde ese enlace sin mostrar datos privados ni ofrecer acciones que no funcionarán.
- **RF-03.** Cuando el cliente avance, el frontend deberá guiarlo por servicio, sucursal, Profesional, fecha y horario, contacto y resultado, identificando la selección actual y el siguiente paso.
- **RF-04.** Cuando cambie una selección de la que dependan otras, el frontend deberá descartar las opciones posteriores hasta comprobar su validez para la nueva combinación.
- **RF-05.** Si llega una respuesta de catálogo o disponibilidad correspondiente a una selección anterior, el frontend no deberá reemplazar con ella las opciones de la selección actual.
- **RF-06.** Mientras se cargan opciones, el frontend deberá indicar que la consulta está en curso y evitar que el cliente continúe con resultados todavía no comprobados.
- **RF-07.** Si una consulta correcta no devuelve opciones u horarios, el frontend deberá mostrar un estado vacío legítimo y permitir cambiar selecciones.
- **RF-08.** Si la consulta falla o su resultado no puede conocerse, el frontend deberá mostrar un error y ofrecer reintento sin presentar una agenda vacía ni resultados parciales como válidos.
- **RF-09.** Cuando se muestren fechas y horarios, el frontend deberá expresarlos en la zona horaria indicada para la sucursal y no ofrecer como elegibles horas locales ambiguas o inexistentes.
- **RF-10.** Mientras el cliente observe horarios, el frontend deberá distinguir una opción consultada de un horario apartado o de una cita registrada; consultar disponibilidad no garantiza la reserva.

### 2. Contacto y apartado temporal

**Por qué:** dar tiempo limitado para completar los datos sin retener un horario indefinidamente ni tratar el teléfono como identidad.

- **RF-11.** Cuando se presente el formulario, el frontend deberá solicitar nombre no vacío de hasta 150 caracteres y teléfono mexicano normalizable a diez dígitos; deberá admitir notas opcionales de hasta 2.000 caracteres.
- **RF-12.** Si nombre, teléfono o notas son inválidos, el frontend deberá señalar los campos afectados, conservar lo escrito durante el flujo abierto e impedir un envío que ya sabe inválido.
- **RF-13.** Cuando el teléfono admita espacios, guiones o el prefijo opcional `+52`, el frontend deberá permitir su corrección y aceptación sin exigir verificación telefónica.
- **RF-14.** Mientras se capture un teléfono, el frontend no deberá buscar ni revelar nombres, notas o reservas anteriores asociados a ese número.
- **RF-15.** Cuando el horario siga disponible al llegar al formulario, el frontend deberá mostrar el apartado concedido y su vencimiento a los cinco minutos contados por el servidor.
- **RF-16.** Mientras el apartado esté vigente, el frontend deberá mostrar el tiempo restante como orientación y no ampliarlo por actividad, errores, reintentos, reloj local alterado o reanudación de una pestaña.
- **RF-17.** Si el apartado llega a su vencimiento exacto o deja de pertenecer a la pestaña, el frontend deberá impedir reservar con él, explicar lo ocurrido y conservar los datos escritos mientras el flujo siga abierto.
- **RF-18.** Cuando el cliente vuelva desde el formulario a la selección, el frontend deberá liberar el apartado propio y permitir elegir un horario vigente.
- **RF-19.** Cuando el mismo navegador intente apartar otro horario del negocio, el frontend deberá reflejar que el anterior se libera primero y permanece liberado aunque el nuevo horario no se conceda.
- **RF-20.** Si otra pestaña reemplaza o libera el apartado, el frontend deberá avisar que el apartado anterior ya no sirve para reservar y evitar que un aviso atrasado altere uno posterior.
- **RF-21.** Cuando el cliente recargue o abandone sin un envío pendiente de resolución, el frontend deberá solicitar la liberación del apartado propio cuando sea posible; al recargar deberá reiniciar el recorrido sin recuperar el contacto. Si el aviso de salida no llega, deberá respetarse el vencimiento original.
- **RF-22.** Mientras el cliente permanezca en el portal, el frontend deberá conservar contacto y notas solo durante ese flujo y no guardarlos como historial de reservas del navegador.

### 3. Envío, resultado y recuperación

**Por qué:** evitar citas duplicadas y comunicar con honestidad los resultados inciertos, los conflictos y el cupo telefónico.

- **RF-23.** Cuando el cliente envíe una reserva con apartado vigente, el frontend deberá identificar ese intento para que la repetición del mismo contenido recupere el mismo resultado.
- **RF-24.** Mientras el envío esté en curso o su resultado sea incierto, el frontend deberá impedir acciones que puedan iniciar otra reserva incompatible e indicar qué está comprobando.
- **RF-25.** Cuando el backend confirme el registro, el frontend deberá mostrar «Reserva registrada, pendiente de confirmación», el folio y un resumen de negocio, servicio, sucursal, Profesional, fecha y horario, sin afirmar confirmación por WhatsApp.
- **RF-26.** Si el cliente repite un envío ya registrado, el frontend deberá mostrar la misma cita y folio recibidos, sin presentar una nueva reserva ni volver a consumir un cupo.
- **RF-27.** Si se pierde la respuesta del envío, el frontend deberá tratar el resultado como incierto y comprobar ese intento propio antes de permitir otra reserva; no deberá inferir fracaso por una respuesta ausente.
- **RF-28.** Cuando se recargue con un intento incierto, el frontend deberá intentar resolverlo antes de abrir otra selección; si se confirma registrado, mostrará su resultado, y si se confirma `no_registrado`, permitirá reiniciar.
- **RF-29.** Si la resolución sigue sin poder conocerse por fallo de red o respuesta temporal, el frontend deberá conservar la referencia mínima del intento, explicar la incertidumbre y permitir reintentar sin borrar esa referencia.
- **RF-30.** Si la licencia bloquea la obtención del CSRF necesario para resolver tras recargar, el frontend deberá conservar la referencia del intento y mostrar la recuperación como pendiente; la recuperación completa en ese estado dependerá de un contrato de sesión pública del backend que aún falta ajustar.
- **RF-31.** Si un cambio de oferta, duración, horario, licencia u ocupación rechaza el registro, el frontend deberá explicar que se necesita disponibilidad vigente y conservar el contacto mientras siga abierto el flujo, sin presentar una cita creada.
- **RF-32.** Si se alcanza el cupo de dos citas futuras del mismo teléfono en la sucursal, el frontend deberá mostrar el rechazo público sin detalles de otras personas y permitir corregir el teléfono con el apartado aún vigente, sin renovar sus cinco minutos.
- **RF-33.** Mientras un intento continúe incierto, el frontend no deberá cambiar su contenido ni presentar la corrección de teléfono como si modificara ese intento.
- **RF-34.** Cuando el resultado propio se recupere, el frontend deberá usar el resumen histórico recibido, aunque el catálogo actual haya cambiado, y no ofrecer búsqueda de citas por teléfono o folio.

### 4. Precios públicos

**Por qué:** respetar la decisión de publicación del negocio y el importe aceptado al apartar, sin atribuir precios actuales a reservas anteriores.

- **RF-35.** Cuando el backend autorice mostrar precios, el frontend deberá presentar el importe público disponible y, después de conceder el apartado, el costo aceptado para esa reserva.
- **RF-36.** Si el backend oculta precios públicos, el frontend no deberá mostrar sección de costo ni importe en selección, apartado, envío, resultado o recuperación.
- **RF-37.** Si el precio del catálogo cambia durante un apartado, el frontend deberá conservar como referencia de la reserva el costo aceptado al concederlo, cuando su publicación esté permitida.
- **RF-38.** Si un resultado histórico no contiene costo aceptado, el frontend no deberá sustituirlo por el precio actual del servicio.

### 5. Administración de licencias y cupos

**Por qué:** permitir decisiones administrativas informadas sin duplicar operaciones ni prometer acceso o correos que el servidor no confirmó.

- **RF-39.** Mientras un superadmin consulte un negocio, el frontend deberá distinguir licencia vigente, suspensión pendiente, suspendida y vencida, mostrar el vencimiento y el bloqueo programado devueltos y explicar sus efectos sobre el acceso.
- **RF-40.** Cuando el superadmin solicite una suspensión, el frontend deberá permitir un plazo entero de cero a treinta días, indicar dos días como valor predeterminado y explicar que cero implica bloqueo inmediato.
- **RF-41.** Si ya existe una suspensión pendiente o efectiva, el frontend deberá impedir presentar un nuevo plazo como cambio válido y mostrar el estado original hasta recibir una transición autorizada.
- **RF-42.** Cuando el superadmin renueve, revoque una suspensión pendiente o reactive una licencia, el frontend deberá mostrar el estado y vencimiento devueltos sin afirmar que renovar levantó una suspensión.
- **RF-43.** Si una operación de licencia se repite o su respuesta se pierde, el frontend deberá conservar la misma clave idempotente para ese intento y comprobar el resultado antes de ofrecer otra operación que pueda duplicar el efecto.
- **RF-44.** Mientras se consulten avisos de licencia, el frontend deberá distinguir envío pendiente, fallido y realizado según la información disponible, sin afirmar entrega de correo por haber solicitado una transición.
- **RF-45.** Cuando el superadmin consulte o modifique cupos de profesionales y recepcionistas, el frontend deberá mostrar límites y consumo por rol, con valores iniciales de cinco y tres y mínimo permitido de uno.
- **RF-46.** Si una alta, activación o reducción de cupo es rechazada, el frontend deberá conservar los datos capturados, explicar el límite aplicable y no mostrar como creado, activado o guardado un cambio que el backend rechazó.
- **RF-47.** Mientras el actor no sea superadmin, el frontend no deberá ofrecer controles de modificación de cupos o licencias reservados a ese rol.

### 6. Recursos, precios y agenda del negocio

**Por qué:** adaptar la administración a recursos recuperables y a las reglas de agenda vigentes sin borrar historial ni confundir estados.

- **RF-48.** Cuando el Administrador retire un Profesional, Recepcionista, servicio o sucursal, el frontend deberá presentar la inhabilitación recuperable y no ofrecer el borrado definitivo retirado.
- **RF-49.** Mientras se consulten recursos, el frontend deberá distinguir activo, inactivo e inhabilitado; los inhabilitados solo deberán ser consultables por el Administrador de su propio negocio conforme al backend.
- **RF-50.** Cuando el Administrador restaure un recurso inhabilitado, el frontend deberá mostrarlo como inactivo y exigir una activación separada sujeta a cupos y conflictos vigentes.
- **RF-51.** Si una inhabilitación afecta citas futuras, el frontend deberá informar de las afectaciones disponibles sin presentarlas como canceladas, reprogramadas o modificadas automáticamente.
- **RF-52.** Cuando el Administrador configure la publicación de precios, el frontend deberá mostrar el estado global vigente y explicar que también aplica a servicios creados después.
- **RF-53.** Cuando el Administrador configure la agenda, el frontend deberá presentar modo, tiempo entre citas, anticipación y horizonte vigentes; el tiempo entre citas solo deberá admitir cero o múltiplos de cinco hasta sesenta minutos.
- **RF-54.** Si la configuración de agenda es inválida o su guardado falla, el frontend deberá conservar los valores capturados, explicar los campos afectados y no mostrar un reemplazo parcial como exitoso.
- **RF-55.** Mientras se editen horarios semanales, el frontend deberá representar los descansos mediante huecos entre franjas y conservar los bloqueos; no deberá ofrecer campos de descanso incrustado ni rutas de excepción por fecha retiradas.
- **RF-56.** Mientras se use la consulta privada de disponibilidad, el frontend deberá conservar los permisos por Administrador, Recepción y Profesional y distinguir consulta o validación de una reserva; la modalidad manual privada no deberá aparecer en el portal público.

### 7. Seguridad, errores y continuidad visual

**Por qué:** mantener aislamiento, confianza y continuidad de uso al ampliar el producto.

- **RF-57.** Mientras exista una sesión privada, el frontend deberá mostrar acciones según el rol y negocio autorizados, sin tratar IDs, roles, precios, estados o permisos enviados por el navegador como autoridad.
- **RF-58.** Si el backend responde 400, 401, 403, 404, 409, 500 o 503, el frontend deberá comunicar una acción comprensible según el caso, sin exponer SQL, trazas, secretos ni datos de otro negocio.
- **RF-59.** Si una consulta técnica falla, el frontend deberá conservar los filtros y marcar cualquier resultado anterior como desactualizado, sin convertir el fallo en un estado vacío legítimo.
- **RF-60.** Mientras se use la versión conectada, el frontend deberá mostrar solo datos comprobados del backend; mientras se use la demo, deberá identificar sus datos ficticios y conservarla como referencia visual coherente, sin atribuirle reservas reales.
- **RF-61.** Cuando se adapte una pantalla, el frontend deberá **mantener la marca Citalendar y el diseño existente**: tipografías, paleta terracota, jerarquía, espaciado, componentes, navegación y temas claro y oscuro. No deberá rediseñar por completo la página ni sustituir su dirección visual sin una solicitud expresa.
- **RF-62.** Cuando el portal o la administración se use en escritorio, móvil o mediante teclado, el frontend deberá conservar foco visible, etiquetas y mensajes comprensibles, contraste legible, controles táctiles utilizables y ausencia de desbordamientos o acciones tapadas por la navegación móvil.

## Fuera de alcance

- Cambiar backend, base de datos, migraciones, contratos HTTP o despliegue como parte de esta spec frontend; la dependencia de CSRF se documenta para un ajuste posterior autorizado.
- Registro o autenticación de clientes, verificación telefónica y búsqueda pública de citas por teléfono o folio.
- Reserva manual, calendario administrativo, cancelación, reprogramación y cambios posteriores de estado de las citas.
- Confirmación por WhatsApp, mensajes, recordatorios, PDF, pagos y caducidad automática de citas pendientes.
- Ampliar apartados, garantizar una reserva por consultar disponibilidad o prometer recuperación sin la credencial anónima necesaria.
- Crear una pantalla de auditoría sin un contrato de lectura autorizado del backend.
- Rediseñar por completo la marca, navegación o estilo Citalendar.

La integración del cupo telefónico con el **escritor manual real** (RF-63 de la spec ALA del backend) permanece diferida; el frontend no la declarará completa con una demo, un doble o el escritor público.

## Criterios de finalización

1. Cada RF-01–RF-62 dispone de caso de aceptación, resultado y evidencia del frontend conectado; el estado propuesto, implementado o dependiente de backend queda identificado sin convertir documentación histórica en aprobación nueva.
2. El recorrido público se completa en móvil y con teclado; las pruebas distinguen carga, vacío, error, conflicto, apartado, envío incierto y cita pendiente, incluyendo foco, texto con apariencia de HTML, zona horaria de la sucursal y cambios de hora.
3. Se comprueban los cinco minutos exactos del apartado, vuelta atrás, recarga, abandono, dos pestañas, reemplazo fallido y respuestas atrasadas sin renovación ni doble reserva.
4. Se comprueban nombre, teléfono, notas, cupo telefónico, corrección dentro del plazo, reintento idempotente, respuesta perdida y recuperación propia. El caso de CSRF con licencia bloqueada conserva incertidumbre y queda documentado como dependencia del backend.
5. Se verifica que ocultar precios elimina toda sección e importe público en selección, apartado, resultado y recuperación, y que un precio visible aceptado no cambia por una modificación posterior del catálogo.
6. Las pantallas administrativas verifican superadmin, Administrador, Recepción y Profesional según corresponda: licencias e idempotencia, cupos, inhabilitación y restauración, publicación de precios, agenda, horarios y errores, sin acciones retiradas.
7. La revisión visual confirma que se **conserva el diseño Citalendar**, sin rediseño general, en escritorio y móvil, temas claro y oscuro, con navegación por teclado, foco visible y sin controles tapados o desbordamientos. La demo sigue identificada como ficticia y visualmente coherente.
8. Pasan `npm test`, `npm run test:browser`, `npm run build` y la comprobación de diferencias correspondiente al frontend. Se registran resultados reales y límites; no se declara producción habilitada, fase cerrada ni integración manual acreditada por crear este documento.
