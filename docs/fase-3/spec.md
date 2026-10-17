# Especificación frontend — Fase 3, Módulo 2

## Propósito

Integrar las cinco rutas privadas del motor de disponibilidad en una experiencia clara para Administrador, Recepción y Profesional, sin presentar consultas o validaciones como reservas confirmadas.

## Requisitos funcionales en EARS

- **RF-01.** Mientras exista una sesión autorizada, el sistema deberá mostrar las funciones de disponibilidad correspondientes al rol, para evitar acciones que el usuario no puede realizar.
- **RF-02.** Mientras el usuario sea Administrador, el sistema deberá permitir consultar y reemplazar la configuración completa de agenda, porque ese rol es el único autorizado.
- **RF-03.** Mientras el usuario sea Recepción, el sistema deberá mostrar consulta, validación y citas afectadas, sin controles de configuración o gestión de horarios.
- **RF-04.** Mientras el usuario sea Profesional, el sistema deberá limitar las consultas a su propio perfil, para preservar permisos y aislamiento.
- **RF-05.** Cuando se abra la configuración, el sistema deberá mostrar modo, intervalo, anticipación y horizonte efectivos devueltos por el backend.
- **RF-06.** Cuando el Administrador guarde la configuración, el sistema deberá exigir los cuatro valores completos y aceptar únicamente los valores admitidos por el contrato.
- **RF-07.** Si la configuración es inválida, el sistema deberá identificar los campos afectados y conservar los valores capturados para facilitar su corrección.
- **RF-08.** Cuando se consulte disponibilidad, el sistema deberá solicitar profesional, sucursal, servicio, rango de fechas y modalidad, porque esos datos determinan el cálculo.
- **RF-09.** Cuando se use modalidad pública, el sistema deberá explicar que se aplican modo, intervalo, anticipación y horizonte comercial.
- **RF-10.** Cuando se use modalidad manual, el sistema deberá explicar que se omiten solamente las cuatro restricciones comerciales y se conservan horarios, oferta, duración, bloqueos, ocupaciones y rechazo del pasado.
- **RF-11.** Si un rango está invertido, contiene fechas inválidas o supera 31 fechas inclusivas, el sistema deberá impedir la consulta y explicar el límite.
- **RF-12.** Cuando la consulta sea correcta, el sistema deberá mostrar la zona horaria, momento del cálculo, reglas aplicadas, ranuras con inicio y fin, y omisiones devueltas.
- **RF-13.** Cuando se muestren fechas u horas, el sistema deberá presentarlas en la zona horaria de la sucursal, para evitar interpretar directamente los valores UTC.
- **RF-14.** Si no existen ranuras en modalidad pública, el sistema deberá indicar que no hay horarios dentro del horizonte y ofrecer el cambio explícito a modalidad manual.
- **RF-15.** Si se agota el horizonte público, el sistema no deberá consultar automáticamente fechas posteriores, porque alteraría la configuración del negocio.
- **RF-16.** El sistema deberá distinguir visual y verbalmente la proyección de atención de la disponibilidad reservable, porque representan cálculos diferentes.
- **RF-17.** Cuando el usuario seleccione o capture una fecha y hora, el sistema deberá ofrecer una acción explícita “Validar horario”.
- **RF-18.** Cuando termine una validación puntual, el sistema deberá mostrar si el inicio es válido, su intervalo, zona, modalidad y motivos, sin afirmar que existe reserva o apartado.
- **RF-19.** Cuando se consulte “Citas afectadas”, el sistema deberá solicitar rango y permitir filtros opcionales de profesional y sucursal según el rol.
- **RF-20.** Cuando existan citas afectadas, el sistema deberá mostrar únicamente identificación operativa, intervalo, zona y causas vigentes, sin datos del cliente ni acciones de cancelación o reprogramación.
- **RF-21.** Si no existen citas afectadas, el sistema deberá mostrar un estado vacío legítimo y no tratarlo como error.
- **RF-22.** Mientras una petición esté pendiente, el sistema deberá identificar la sección en carga y evitar envíos duplicados.
- **RF-23.** Si el backend responde 400, el sistema deberá mostrar el error junto al campo o acción correspondiente para permitir su corrección.
- **RF-24.** Si el backend responde 401, el sistema deberá finalizar el acceso local y solicitar autenticación nuevamente.
- **RF-25.** Si el backend responde 403 o 404, el sistema deberá informar que la operación o recurso no está disponible sin revelar pertenencia a otro negocio.
- **RF-26.** Si una consulta responde 500 o 503, el sistema deberá conservar filtros y resultados anteriores marcados como desactualizados, impedir tratarlos como vigentes y ofrecer reintento.
- **RF-27.** Si ocurre un fallo técnico, el sistema no deberá representarlo como una agenda vacía, porque ocultaría una indisponibilidad del servicio.
- **RF-28.** Mientras se use la versión conectada, el sistema deberá mostrar exclusivamente datos del backend; mientras se use la demo, deberá usar datos ficticios claramente identificados.
- **RF-29.** Cuando las nuevas secciones aparezcan en escritorio o móvil, tema claro u oscuro, deberán conservar jerarquía, contraste, foco visible, navegación por teclado y acciones táctiles accesibles.

## Interfaces comprendidas

- `GET /disponibilidad/configuracion`
- `PUT /disponibilidad/configuracion`
- `GET /disponibilidad`
- `POST /disponibilidad/validar`
- `GET /disponibilidad/citas-afectadas`

No se requiere modificar el contrato del backend.

## Fuera de alcance

- Consulta anónima y portal público de reservas.
- Creación, confirmación, modificación, reprogramación o cancelación de citas.
- Creación, renovación, consumo o liberación de apartados.
- Gestión de clientes o exposición de sus datos.
- WhatsApp, notificaciones de citas, reportes PDF y pagos.
- Cambios en backend, base de datos, migraciones, Nginx o despliegue.
- Garantizar una ranura por haberla consultado o validado.

## Criterios de finalización

- Los RF-01–RF-29 cuentan con pruebas de comportamiento o integración proporcionales a su riesgo.
- Se verifican los tres roles, ambas modalidades, los dos modos de agenda, rangos límite, estados vacíos y respuestas 400/401/403/404/500/503.
- La validación puntual nunca crea ni aparenta crear una cita.
- La versión conectada y la demo representan la misma estructura visual sin mezclar sus fuentes de datos.
- Se comprueban escritorio y móvil en temas claro y oscuro, navegación por teclado, foco y ausencia de desbordamiento.
- `npm test`, `npm run build` y `git diff --check` finalizan correctamente.
- La documentación registra resultados reales y cualquier dependencia pendiente del backend.

## Supuestos acordados

- La especificación abarca las cinco rutas privadas.
- El estado vacío público permite cambiar explícitamente a modalidad manual.
- La validación puntual se presenta como acción explícita.
- Citas afectadas dispone de una sección consultable independiente.
- Los resultados conservados después de 500/503 serán informativos y no se considerarán vigentes hasta una consulta exitosa.
