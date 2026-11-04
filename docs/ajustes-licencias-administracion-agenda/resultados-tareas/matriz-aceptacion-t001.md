# FALA-T001 — Matriz de aceptación propuesta

Cada RF pertenece a la [spec frontend](../spec.md). La columna «caso» expresa qué debe verificarse; **ningún RF de producto queda acreditado por crear esta matriz**. Las tareas se refieren a [tareas.md](../tareas.md). Estado de todos los casos: pendiente hasta guardar prueba y resultado real.

| RF | Tareas previstas | Caso de aceptación |
| --- | --- | --- |
| 01 | T004, T057 | Abre el portal del slug propio sin login privado. |
| 02 | T004, T057 | Slug o licencia no disponible impide reservar sin fuga. |
| 03 | T005, T057 | Pasos visibles siguen la selección y resultado. |
| 04 | T005, T057 | Cambiar selección invalida descendientes. |
| 05 | T006, T057 | Respuesta antigua no pisa selección vigente. |
| 06 | T006, T057 | Carga impide avance prematuro. |
| 07 | T006, T057 | Vacío correcto permite cambiar selección. |
| 08 | T006, T056 | Fallo técnico ofrece reintento sin agenda vacía. |
| 09 | T007, T057 | Horas usan zona IANA y evitan hora ambigua/inexistente. |
| 10 | T007, T057 | Ranura consultada no se anuncia como apartado/cita. |
| 11 | T013, T057 | Nombre, teléfono y notas respetan límites. |
| 12 | T013, T057 | Datos inválidos conservan captura y bloquean envío. |
| 13 | T013, T057 | Teléfono admite corrección, guiones, espacios y +52. |
| 14 | T013, T057 | Teléfono no revela reservas anteriores. |
| 15 | T010, T014 | Apartado concedido muestra vencimiento del servidor. |
| 16 | T014, T067 | Actividad/reloj local no renuevan cinco minutos. |
| 17 | T014, T067 | Vencimiento exacto bloquea reserva y conserva captura. |
| 18 | T015, T057 | Volver libera apartado propio. |
| 19 | T015, T057 | Reemplazo fallido no resucita apartado anterior. |
| 20 | T016, T057 | Otra pestaña invalida apartado; aviso viejo no altera nuevo. |
| 21 | T017, T057 | Recarga/salida liberan cuando posible y reinician. |
| 22 | T017, T057 | Contacto y notas solo viven en memoria del flujo. |
| 23 | T018–T019, T067 | Misma clave y contenido recuperan el intento propio. |
| 24 | T018–T019, T067 | Envío incierto bloquea otra reserva incompatible. |
| 25 | T011, T019 | Pendiente, folio y resumen histórico sin WhatsApp confirmado. |
| 26 | T011, T019, T068 | Repetición muestra misma cita y folio. |
| 27 | T018, T020, T064 | Respuesta perdida activa resolución propia. |
| 28 | T020, T064 | Recarga resuelve antes de nueva selección. |
| 29 | T018, T020, T023 | Fallo temporal conserva marcador e incertidumbre. |
| 30 | T023, T063–T064 | Sin CSRF por licencia bloqueada conserva marcador; recuperación completa **depende de contrato backend**. |
| 31 | T021 | Rechazo operativo no presenta cita creada. |
| 32 | T022, T065–T067 | Cupo permite corregir solo si backend lo autoriza; sucesión **depende de referencia pública backend**. |
| 33 | T018, T022, T065–T067 | Intento incierto no cambia contenido; sucesión **depende del mismo contrato**. |
| 34 | T011, T019, T064 | Recuperación muestra resumen histórico sin búsqueda por teléfono/folio. |
| 35 | T008–T012, T045 | Precio autorizado se muestra; apartado fija su referencia. |
| 36 | T008–T012, T045 | Precio oculto desaparece de todo el flujo público. |
| 37 | T010–T012, T046 | Cambio del catálogo no altera costo visible del apartado. |
| 38 | T011–T012, T046 | Resultado sin costo no usa precio vigente. |
| 39 | T026, T030 | Vigencia y bloqueo muestran estado/fechas del servidor. |
| 40 | T027, T030 | Plazo 0–30, 2 inicial y bloqueo inmediato explicado. |
| 41 | T026–T027, T030 | Suspensión existente no acepta plazo nuevo. |
| 42 | T025–T028, T030 | Renovar/reactivar muestran estado retornado sin confusión. |
| 43 | T024–T025, T028, T030 | Respuesta perdida conserva clave/cuerpo y evita duplicado. |
| 44 | T029–T030 | Correo pendiente/fallido/enviado no se confunde con entrega. |
| 45 | T031–T034 | Superadmin ve y edita cupos iniciales 5/3 con mínimo 1. |
| 46 | T032–T034 | Rechazo de cupo conserva borrador y no anuncia éxito. |
| 47 | T030–T034, T055 | Roles ajenos no ven modificación de licencia/cupos. |
| 48 | T035–T039, T043 | Cuatro bajas usan inhabilitar y no prometen DELETE. |
| 49 | T035, T040–T043 | Estados distinguidos; inhabilitados solo Administrador propio. |
| 50 | T035–T043 | Restaurar queda inactivo hasta activación separada. |
| 51 | T042–T043 | Afectaciones se muestran sin mutar citas. |
| 52 | T044–T046 | Publicación global alcanza servicios futuros. |
| 53 | T047–T048, T053 | Tiempo entre citas 0–60 múltiplo de 5 y demás reglas. |
| 54 | T047–T049, T053 | PUT íntegro fallido conserva borrador y errores. |
| 55 | T050–T051, T053 | Semana sin descanso/excepción; franjas y bloqueos siguen. |
| 56 | T042, T052–T053 | Consulta privada respeta rol y modalidad. |
| 57 | T024, T034, T040, T055 | Acciones solo para rol/negocio propio. |
| 58 | T021–T022, T028, T034, T043, T056 | Errores HTTP son comprensibles y sin datos internos. |
| 59 | T006, T049, T052, T056 | Fallo técnico conserva filtros y marca resultado obsoleto. |
| 60 | T054, T059–T062 | Conectado usa backend; demo se identifica ficticia. |
| 61 | T057–T058, T062 | Marca, paleta, temas y navegación permanecen. |
| 62 | T057–T058, T062 | Escritorio/móvil/teclado tienen foco y sin solapes. |

El cierre de resultados corresponde a T068; pruebas omitidas, fallidas o bloqueadas permanecen pendientes. La prueba aislada del runner de T003 valida infraestructura, no sustituye los casos de producto anteriores.
