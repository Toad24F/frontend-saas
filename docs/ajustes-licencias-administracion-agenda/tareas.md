# Tareas — Ajustes de licencias, administración y agenda (frontend)

Estado: desglose propuesto del [plan](plan.md) y la [spec](spec.md). Los RF son **locales a la spec frontend**. T001–T003 tienen [evidencia preparatoria](resultados-tareas/resultado-t001-t003.md) y T004–T012 tienen [resultados del portal](resultados-tareas/resultado-t004-t012.md) y T013–T023 tienen [evidencia de contacto, apartado e intento](resultados-tareas/resultado-t013-t023.md) y T024–T030 tienen [resultados de licencias](resultados-tareas/resultado-t024-t030.md); las tareas posteriores siguen pendientes.

Cada tarea se estima en **15 o 25 minutos, incluida su comprobación focalizada**. Las dependencias citadas son obligatorias y aparecen antes de la tarea; las áreas independientes pueden avanzar sin esperar a los contratos externos. Si una tarea requiere 30 minutos o más, dividirla antes de ejecutarla y conservar su casilla pendiente hasta terminar sus subtareas. «Hecho cuando» exige evidencia real en `docs/ajustes-licencias-administracion-agenda/resultados-tareas/` (revisión, archivos, comando o revisión y resultado). No editar `../backend` ni usar su base cotidiana para pruebas.

## 1. Preparación y contratos

- [x] **FALA-T001 — Matriz de trazabilidad** · 15 min · Depende de: ninguna · RF-01–RF-62.
  Hecho cuando: Existe una tabla RF → tarea → caso de aceptación, con RF-30 y RF-32–RF-33 señalados como dependientes de contrato.
- [x] **FALA-T002 — Inventario HTTP y roles vigentes** · 25 min · Depende de: T001 · RF-01–RF-02, RF-23–RF-24, RF-39–RF-58.
  Hecho cuando: El inventario coteja controladores/DTO actuales con llamadas frontend, respuestas y permisos sin suponer rutas nuevas.
- [x] **FALA-T003 — Preparar pruebas aisladas** · 25 min · Depende de: T002 · RF-57–RF-60.
  Hecho cuando: Un caso focalizado de navegador usa solo la base desechable del runner existente y registra cómo se limpia.

## 2. Portal: selección y precios

- [x] **FALA-T004 — Probar acceso por slug y licencia** · 25 min · Depende de: T003 · RF-01–RF-02.
  Hecho cuando: Casos conectados distinguen negocio disponible, slug inválido y rechazo de licencia sin revelar datos privados.
- [x] **FALA-T005 — Conservar pasos y selecciones dependientes** · 25 min · Depende de: T004 · RF-03–RF-04.
  Hecho cuando: Cambiar servicio o sucursal invalida las opciones posteriores y el paso visible coincide con la selección actual.
- [x] **FALA-T006 — Aislar respuestas atrasadas y estados de consulta** · 25 min · Depende de: T005 · RF-05–RF-08, RF-59.
  Hecho cuando: Una respuesta anterior no sobrescribe la nueva y carga, vacío legítimo y fallo técnico producen estados distintos con reintento.
- [x] **FALA-T007 — Verificar zona y naturaleza de ranuras** · 25 min · Depende de: T006 · RF-09–RF-10.
  Hecho cuando: Horarios se muestran en zona IANA de sucursal y ninguno se anuncia como apartado o reserva antes de concederlo.
- [x] **FALA-T008 — Aceptar catálogo con precio omitido** · 15 min · Depende de: T006 · RF-35–RF-36.
  Hecho cuando: Un servicio válido sin `costo` pasa la frontera de catálogo y no se convierte en cero ni en error de protocolo.
- [x] **FALA-T009 — Presentar precio opcional en selección** · 15 min · Depende de: T008 · RF-35–RF-36.
  Hecho cuando: Selección muestra un importe explícito autorizado y omite por completo el importe ausente.
- [x] **FALA-T010 — Leer apartado con costo público opcional** · 25 min · Depende de: T008 · RF-15, RF-35–RF-37.
  Hecho cuando: La concesión válida acepta `costo` presente u omitido y conserva el precio del apartado visible sin consultar el catálogo de nuevo.
- [x] **FALA-T011 — Leer resultado histórico con costo opcional** · 25 min · Depende de: T010 · RF-25–RF-26, RF-34–RF-38.
  Hecho cuando: Registro y resolución aceptan `costo` presente u omitido y el resumen no toma un precio actual como sustituto.
- [x] **FALA-T012 — Probar visibilidad y cambios de precio** · 25 min · Depende de: T009–T011 · RF-35–RF-38.
  Hecho cuando: Casos cubren visible, oculto, cero explícito, cambio durante apartado y recuperación sin filtración de importes.

## 3. Portal: contacto, apartado e intento

- [x] **FALA-T013 — Validar contacto sin identificar al cliente por teléfono** · 25 min · Depende de: T003 · RF-11–RF-14.
  Hecho cuando: Límites de nombre/notas, diez dígitos y `+52` se prueban; ningún campo dispara búsqueda de reservas previas.
- [x] **FALA-T014 — Comprobar reloj y vencimiento exacto** · 25 min · Depende de: T010, T013 · RF-15–RF-17.
  Hecho cuando: Antes de cinco minutos permite continuar y en el límite exacto bloquea reservar sin perder el contacto abierto.
- [x] **FALA-T015 — Liberar al volver y reemplazar apartado** · 25 min · Depende de: T014 · RF-18–RF-19.
  Hecho cuando: La vuelta confirma liberación propia y un reemplazo fallido no presenta el apartado anterior como vigente.
- [x] **FALA-T016 — Coordinar dos pestañas** · 25 min · Depende de: T015 · RF-20.
  Hecho cuando: Una pestaña detecta cambio/liberación y un aviso de generación vieja no altera el apartado nuevo.
- [x] **FALA-T017 — Verificar recarga, salida y memoria** · 25 min · Depende de: T015 · RF-21–RF-22.
  Hecho cuando: Salida intenta liberar, recarga ordinaria reinicia y contacto/notas no aparecen en almacenamiento ni historial del navegador.
- [x] **FALA-T018 — Conservar marcador mínimo antes del envío** · 25 min · Depende de: T014 · RF-23–RF-24, RF-27–RF-29, RF-33.
  Hecho cuando: `sessionStorage` guarda solo slug, apartado y clave; una referencia incierta impide otra reserva incompatible.
- [x] **FALA-T019 — Repetir mismo envío y mostrar cita pendiente** · 25 min · Depende de: T011, T018 · RF-23–RF-26, RF-34.
  Hecho cuando: Doble clic o repetición recupera mismo folio y el resultado usa el resumen histórico y texto de pendiente.
- [x] **FALA-T020 — Resolver respuesta perdida y recarga** · 25 min · Depende de: T018–T019 · RF-27–RF-29.
  Hecho cuando: `registrado` muestra resultado, `no_registrado` ordinario permite reiniciar y 503 conserva marcador para reintento.
- [x] **FALA-T021 — Manejar rechazo operativo sin cita ficticia** · 25 min · Depende de: T020 · RF-31, RF-58.
  Hecho cuando: Rechazos por oferta, horario, licencia u ocupación explican nueva consulta y no muestran folio ni cita creada.
- [x] **FALA-T022 — Reconocer cupo telefónico sin perder incertidumbre** · 25 min · Depende de: T020 · RF-32–RF-33, RF-58.
  Hecho cuando: El código `cupo_telefono_excedido` se distingue del 409 genérico y el intento no se borra ni cambia mientras siga incierto.
- [x] **FALA-T023 — Conservar marcador con licencia bloqueada** · 15 min · Depende de: T020 · RF-29–RF-30.
  Hecho cuando: Un fallo de CSRF tras recargar conserva la referencia y muestra recuperación pendiente, sin afirmar fracaso ni éxito.

## 4. Superadministración: licencias y cupos

- [x] **FALA-T024 — Permitir cabecera idempotente privada** · 15 min · Depende de: T002 · RF-43, RF-57.
  Hecho cuando: El cliente envía `Idempotency-Key` solo a operaciones de licencia previstas sin cambiar el resto de llamadas.
- [x] **FALA-T025 — Guardar intento privado antes del POST** · 25 min · Depende de: T024 · RF-42–RF-43.
  Hecho cuando: Acción, negocio/licencia, cuerpo exacto y clave permanecen iguales ante respuesta perdida y repetición.
- [x] **FALA-T026 — Mostrar vigencia y suspensión real** · 25 min · Depende de: T002 · RF-39, RF-41–RF-42.
  Hecho cuando: Vigente, pendiente, suspendida y vencida muestran fechas/efectos recibidos y renovar no se presenta como reactivación.
- [x] **FALA-T027 — Editar plazo de suspensión** · 25 min · Depende de: T025–T026 · RF-40–RF-41.
  Hecho cuando: El formulario admite 0–30 enteros, inicia en 2, explica bloqueo inmediato y no ofrece otro plazo si ya hay suspensión.
- [x] **FALA-T028 — Reconciliar operaciones inciertas** · 25 min · Depende de: T025, T027 · RF-42–RF-43, RF-58.
  Hecho cuando: Reintentar usa misma clave/cuerpo, bloquea una segunda renovación incompatible y refresca vigencia tras respuesta conocida.
- [x] **FALA-T029 — Distinguir estados de correo** · 15 min · Depende de: T026 · RF-44.
  Hecho cuando: Pendiente, fallido y enviado se muestran según respuesta y una transición no se anuncia como correo entregado.
- [x] **FALA-T030 — Probar licencias e idempotencia en navegador** · 25 min · Depende de: T027–T029 · RF-39–RF-44, RF-47.
  Hecho cuando: Casos verifican plazo 0/2/30, suspensión, renovación, respuesta perdida, correo y ausencia de acciones en roles ajenos.
- [ ] **FALA-T031 — Leer cupos de ambos roles** · 25 min · Depende de: T002 · RF-45, RF-47.
  Hecho cuando: Superadmin ve límites y consumo retornados por `/negocios/:id/cupo-usuarios` sin calcularlos de catálogos locales.
- [ ] **FALA-T032 — Editar límites con errores conservados** · 25 min · Depende de: T031 · RF-45–RF-47.
  Hecho cuando: El formulario exige mínimo 1, envía ambos límites contratados y conserva borrador ante 400/409.
- [ ] **FALA-T033 — Informar cupo en altas y activaciones** · 25 min · Depende de: T031 · RF-45–RF-46.
  Hecho cuando: Formularios de Profesional/Recepción explican el cupo vigente y un rechazo no aparece como alta o activación realizada.
- [ ] **FALA-T034 — Probar límites por rol y permisos** · 25 min · Depende de: T032–T033 · RF-45–RF-47, RF-57–RF-58.
  Hecho cuando: Casos cubren 5/3, reducción rechazada, activación sin cupo y ausencia de edición para no superadmin.

## 5. Negocio: recursos, publicación y agenda

- [ ] **FALA-T035 — Definir presentación de tres estados** · 15 min · Depende de: T002 · RF-48–RF-50.
  Hecho cuando: Vistas comparten etiquetas distintas para activo, inactivo e inhabilitado y restaurar no se interpreta como activar.
- [ ] **FALA-T036 — Sustituir baja de profesionales** · 25 min · Depende de: T035 · RF-48–RF-50.
  Hecho cuando: La acción autorizada llama `inhabilitar`, explica recuperación y no llama `DELETE /profesionales/:id`.
- [ ] **FALA-T037 — Sustituir baja de recepcionistas** · 25 min · Depende de: T035 · RF-48–RF-50.
  Hecho cuando: La vista ofrece inhabilitar y conserva desactivar/reactivar como acciones distintas cuando el servidor lo permita.
- [ ] **FALA-T038 — Sustituir baja de servicios** · 25 min · Depende de: T035 · RF-48–RF-50.
  Hecho cuando: La acción llama `inhabilitar` y ya no promete eliminación definitiva del servicio.
- [ ] **FALA-T039 — Sustituir baja de sucursales** · 25 min · Depende de: T035 · RF-48–RF-50.
  Hecho cuando: La acción llama `inhabilitar` y ya no promete eliminación definitiva ni liberación de cupo por borrar.
- [ ] **FALA-T040 — Consultar inhabilitados autorizados** · 25 min · Depende de: T036–T039 · RF-49, RF-57.
  Hecho cuando: Solo Administrador propio accede a listas/detalles `inhabilitados` y no se mezclan con listados operativos.
- [ ] **FALA-T041 — Restaurar como inactivo** · 25 min · Depende de: T040 · RF-49–RF-50.
  Hecho cuando: Restaurar cada tipo vuelve al listado habitual inactivo y exige activación separada para operar.
- [ ] **FALA-T042 — Mostrar afectaciones sin mutar citas** · 25 min · Depende de: T041 · RF-51, RF-56.
  Hecho cuando: La UI consulta causas disponibles y explica que las citas no fueron canceladas ni reprogramadas automáticamente.
- [ ] **FALA-T043 — Probar retiro y recuperación** · 25 min · Depende de: T040–T042 · RF-48–RF-51, RF-57–RF-58.
  Hecho cuando: Pruebas cubren los cuatro recursos, permisos, restauración inactiva y rechazo de activación con cupo lleno.
- [ ] **FALA-T044 — Leer publicación global de precios** · 15 min · Depende de: T002 · RF-52, RF-57.
  Hecho cuando: Administrador ve `mostrarPreciosPublicos` desde la ruta autorizada y un error de lectura no se reemplaza por valor supuesto.
- [ ] **FALA-T045 — Guardar publicación y explicar alcance** · 25 min · Depende de: T044 · RF-35–RF-36, RF-52.
  Hecho cuando: El control guarda el booleano confirmado y explica que afecta también servicios creados después.
- [ ] **FALA-T046 — Probar publicación con portal real** · 25 min · Depende de: T012, T045 · RF-35–RF-38, RF-52.
  Hecho cuando: Alternar el estado cambia respuestas y presentación futuras sin alterar el resumen histórico interno.
- [ ] **FALA-T047 — Adaptar lectura de configuración** · 15 min · Depende de: T002 · RF-53–RF-54.
  Hecho cuando: Se lee y muestra `tiempoEntreCitasMinutos`, incluido 0, sin usar `intervaloMinutos` como dato vigente.
- [ ] **FALA-T048 — Adaptar formulario de agenda** · 25 min · Depende de: T047 · RF-53–RF-54.
  Hecho cuando: El PUT contiene exactamente modo, tiempo entre citas, anticipación y horizonte; valores fuera de 0–60/múltiplos de 5 se señalan.
- [ ] **FALA-T049 — Conservar borrador ante fallo de agenda** · 15 min · Depende de: T048 · RF-54, RF-58–RF-59.
  Hecho cuando: 400/503 conserva captura y error; la UI solo anuncia guardado cuando el reemplazo completo responde correctamente.
- [ ] **FALA-T050 — Retirar descanso del payload semanal** · 25 min · Depende de: T002 · RF-55.
  Hecho cuando: `PUT /profesionales/:id/horario` no envía campos de descanso y dos franjas representan una pausa.
- [ ] **FALA-T051 — Retirar campos y rutas de excepción** · 25 min · Depende de: T050 · RF-55.
  Hecho cuando: La vista conectada no ofrece descanso incrustado ni consulta/edita/elimina excepciones por fecha; bloqueos siguen disponibles.
- [ ] **FALA-T052 — Conservar consulta privada por rol** · 25 min · Depende de: T047, T051 · RF-56, RF-58–RF-59.
  Hecho cuando: Administrador, Recepción y Profesional solo ven consultas permitidas y la modalidad manual no aparece en portal público.
- [ ] **FALA-T053 — Probar agenda y semana contra API** · 25 min · Depende de: T049–T052 · RF-53–RF-56.
  Hecho cuando: Casos cubren 0/5/60, valores inválidos, franjas separadas, bloqueos y ausencia de rutas retiradas.

## 6. Demo, seguridad y cierre verificable

- [ ] **FALA-T054 — Actualizar demo de agenda y recursos** · 25 min · Depende de: T043, T053 · RF-48–RF-55, RF-60.
  Hecho cuando: La demo refleja controles y estados nuevos con etiqueta ficticia, sin llamar al backend ni afirmar reservas reales.
- [ ] **FALA-T055 — Revisar permisos y aislamiento de negocio** · 25 min · Depende de: T030, T034, T043, T053 · RF-47, RF-49, RF-57.
  Hecho cuando: Matriz de cuatro roles y dos negocios no muestra acciones prohibidas ni usa IDs del navegador como autoridad.
- [ ] **FALA-T056 — Revisar errores y consultas obsoletas** · 25 min · Depende de: T021, T049, T052 · RF-08, RF-58–RF-59.
  Hecho cuando: 400/401/403/404/409/500/503 producen acciones comprensibles, sin detalles internos ni vacío falso, y conservan filtros cuando procede.
- [ ] **FALA-T057 — Verificar portal visual y teclado** · 25 min · Depende de: T012, T017, T022 · RF-01–RF-38, RF-61–RF-62.
  Hecho cuando: Se registran revisión de escritorio/móvil, claro/oscuro, foco, etiquetas, contraste y barra móvil sin controles tapados.
- [ ] **FALA-T058 — Verificar administración visual y teclado** · 25 min · Depende de: T054–T056 · RF-39–RF-62.
  Hecho cuando: Las pantallas afectadas conservan Citalendar y pasan revisión en escritorio/móvil, ambos temas y teclado sin desbordamientos.
- [ ] **FALA-T059 — Ejecutar pruebas Node y registrar resultado** · 25 min · Depende de: T053, T056 · RF-01–RF-62.
  Hecho cuando: `npm test` termina con resultado y casos fallidos/omitidos registrados, sin marcar RF fallidos como acreditados.
- [ ] **FALA-T060 — Ejecutar navegador público por lote** · 25 min · Depende de: T057 · RF-01–RF-38, RF-58–RF-62.
  Hecho cuando: El lote público de `npm run test:browser` usa base temporal y conserva salida real y escenarios no ejecutados.
- [ ] **FALA-T061 — Ejecutar navegador administrativo por lote** · 25 min · Depende de: T058 · RF-39–RF-62.
  Hecho cuando: El lote administrativo conectado usa base temporal y registra roles, respuestas y estado final sin pruebas omitidas presentadas como éxito.
- [ ] **FALA-T062 — Compilar y comprobar diferencias** · 15 min · Depende de: T059–T061 · RF-60–RF-62.
  Hecho cuando: `npm run build` y `git diff --check` terminan y sus códigos de salida quedan registrados.
## 7. Contratos externos diferidos

Estas tareas no bloquean los módulos independientes. Permanecen abiertas hasta disponer del contrato indicado; no autorizan editar el backend desde este repositorio.

- [ ] **FALA-T063 — Precisar recuperación con licencia bloqueada** · 15 min · Depende de: T023 y revisión del contrato de sesión pública del backend · RF-30.
  Hecho cuando: Existe una respuesta HTTP comprobada que permite obtener el CSRF propio tras recarga con licencia bloqueada, o queda documentado que RF-30 sigue dependiente.
- [ ] **FALA-T064 — Integrar recuperación tras cierre** · 25 min · Depende de: T063 con contrato disponible · RF-27–RF-30, RF-34.
  Hecho cuando: Un caso real de recarga con licencia bloqueada recupera solo resultado propio o conserva incertidumbre conforme al contrato.
- [ ] **FALA-T065 — Precisar referencia del intento anterior** · 15 min · Depende de: T022 y revisión del contrato público del backend · RF-32–RF-33.
  Hecho cuando: Una prueba HTTP demuestra cómo el navegador obtiene o envía una referencia propia válida para `intentoAnteriorId`, o el bloqueo queda documentado.
- [ ] **FALA-T066 — Corregir teléfono con sucesor autorizado** · 25 min · Depende de: T065 con contrato disponible · RF-16–RF-17, RF-23–RF-24, RF-32–RF-33.
  Hecho cuando: Solo `puedeCorregir` vigente permite nuevo intento y teléfono, sin renovar apartado ni modificar el intento anterior.
- [ ] **FALA-T067 — Probar corrección y concurrencia de intentos** · 25 min · Depende de: T066 · RF-23–RF-24, RF-26–RF-29, RF-32–RF-33.
  Hecho cuando: Pruebas reales cubren rechazo, sucesor, vencimiento, respuesta perdida y dos pestañas con un único resultado válido.

## 8. Matriz final

- [ ] **FALA-T068 — Cerrar matriz de evidencia** · 25 min · Depende de: T062, T063 y T065; T064 y T066–T067 solo si existe el contrato externo · RF-01–RF-62.
  Hecho cuando: Cada RF enlaza prueba, resultado y límite; RF bloqueados, no ejecutados o fallidos siguen pendientes y no se declara fase cerrada.
