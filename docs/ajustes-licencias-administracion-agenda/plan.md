# Plan — Ajustes de licencias, administración y agenda (frontend)

**Estado:** propuesta para revisión. No acredita implementación, aprobación ni pruebas ejecutadas. Los RF citados son los **RF-01–RF-62 de [esta especificación frontend](spec.md)**, no los RF homónimos del backend.

## 1. Alcance y base comprobada

Aplicar la [constitución frontend](constitucion.md) sobre el stack y la marca actuales. `src/main.js` separa modo conectado y demo; `src/shared/` contiene vistas y reglas de presentación comunes. El backend hermano es solo de lectura. Este plan modifica únicamente el frontend y sus pruebas y documentos futuros; no diseña tablas, migraciones ni lógica de reserva del servidor.

La inspección del código actual confirma contratos que requieren adaptación: `tiempoEntreCitasMinutos` reemplaza `intervaloMinutos`; el horario semanal ya no acepta descansos ni hay rutas de excepciones; los `DELETE` de recursos se retiraron; licencias exigen `Idempotency-Key`; el precio público puede omitirse; el rechazo por cupo requiere una sucesión de intentos. Las capacidades actuales del portal no se dan por revalidadas por esta propuesta.

## 2. Módulos de trabajo y trazabilidad

| Módulo | Responsabilidad y ubicación prevista | RF cubiertos |
| --- | --- | --- |
| P1. Selección pública | Conservar entrada por slug, catálogo progresivo, invalidación de respuestas antiguas, zona IANA y estados de consulta en `src/connected/public/selection*.js` y vistas. | RF-01–RF-10 |
| P2. Contacto y apartado | Validación de contacto, reloj de servidor, liberación, coordinación de pestañas y memoria del formulario en `src/connected/public/booking*.js`, `contact.js` y `hold-clock.js`. | RF-11–RF-22 |
| P3. Intentos y recuperación | Distinguir envío, resultado incierto, registro y rechazo terminal; mantener clave y contenido, resolver antes de reiniciar y preparar corrección autorizada en `submission.js`, `attempt-store.js` y `http.js`. | RF-23–RF-34; RF-30 y RF-32 dependen de los contratos señalados en §6 |
| P4. Precio público | Interpretar campos monetarios opcionales en la frontera pública y presentar solo importes autorizados, sin precio actual como sustituto histórico, en selección, apartado y resultado. | RF-35–RF-38 |
| A1. Licencias y correos | Detalle de negocio, plazo de suspensión, vigencia, operación idempotente y estados de correo en `src/connected/screens/negocio/` y cliente privado. | RF-39–RF-44, RF-47 |
| A2. Cupos y recursos | Consultas y edición por rol, límites, inhabilitación, listas separadas de inhabilitados, restauración inactiva y afectaciones en pantallas de catálogos y personas. | RF-45–RF-51, RF-47 |
| A3. Publicación y agenda | Estado global de precios, configuración íntegra, franjas sin descanso, bloqueos y consulta privada en `src/connected/screens/disponibilidad/`, `src/shared/screens/disponibilidad/` y vista de negocio. | RF-52–RF-56 |
| T1. Fronteras y calidad | Manejo común de errores y permisos, demo coherente, accesibilidad, temas, móvil, documentación y pruebas. | RF-57–RF-62; transversal a RF-01–RF-56 |

Secuencia: fijar pruebas de contratos y dependencias; adaptar fronteras HTTP y estados; corregir P1–P4 y A1–A3 sin ampliar pantallas ajenas; actualizar la demo y vistas compartidas; verificar y registrar evidencia por RF. P3 puede avanzar en recuperación ordinaria mientras se resuelven RF-30/RF-32.

## 3. Modelo de datos del frontend

Este es un **modelo de estado y proyección**, no un modelo SQL. Los DTO del backend son autoridad; cada pantalla deriva una vista mínima y descarta respuestas de otro negocio, selección o generación. Los nombres de estado son propuestos y se ajustarán a la estructura existente al implementar.

| Estado o proyección | Campos y vida útil | RF |
| --- | --- | --- |
| `sesionPrivada` | Usuario y rol autenticados, negocio derivado de la sesión, token ya gestionado por el cliente actual; nunca usar un ID del formulario como permiso. | RF-39–RF-58 |
| `detalleNegocio` | Licencia, vigencia, `bloqueoProgramadoEn`, cupos y estados de correos recibidos; carga/error por negocio seleccionado. | RF-39–RF-47, RF-59 |
| `operacionLicenciaPendiente` | Negocio/licencia/acción, cuerpo exacto (`plazoDias` si aplica), clave opaca y estado incierto; guardar antes del POST, repetir **la misma** petición para reconciliar y retirarla solo con respuesta conocida. No contiene credenciales ni correos. | RF-40–RF-43 |
| `cupoUsuarios` | Límites y consumo de profesionales/recepcionistas recibidos, más borrador de edición local; el consumo no se calcula desde filas visibles. | RF-45–RF-47 |
| `recursoAdministrado` | `activo`, marca de inhabilitación y detalle autorizado; vistas habituales e inhabilitadas separadas. Restaurar produce estado inactivo hasta otra activación. | RF-48–RF-51 |
| `publicacionCatalogo` | `mostrarPreciosPublicos` y demás campos de publicación recibidos; borrador parcial sin afectar precios históricos. | RF-35–RF-38, RF-52 |
| `configuracionAgenda` | `modo`, `tiempoEntreCitasMinutos`, `anticipacionMinutos`, `diasFuturos`; `data`, `draft`, errores de campo y estado de guardado. PUT de conjunto completo. | RF-53–RF-54 |
| `consultaDisponibilidad` | Filtros, generación de solicitud, ranuras/omisiones, zona IANA, carga/error y bandera `stale`; consulta y validación siguen separadas de apartado. | RF-04–RF-10, RF-56, RF-59 |
| `seleccionPublica` | Slug, IDs elegidos, fecha, ranura, opciones dependientes y revisión de petición; solo memoria de la página. | RF-01–RF-10 |
| `apartadoPropio` | `apartadoId`, `generacion`, `expiraEn`, `servidorAhora`, zona y costo **solo si se publica**; memoria de la página, nunca una fuente de renovación. | RF-15–RF-21, RF-35–RF-37 |
| `contacto` | Nombre, teléfono y notas en memoria; no persistir ni usar teléfono para descubrir citas. | RF-11–RF-14, RF-22, RF-31–RF-33 |
| `marcadorIntento` | En `sessionStorage`, únicamente slug, `apartadoId` y clave opaca necesarios para resolver; un sucesor corregible necesitaría además una referencia autorizada por el backend. Nunca guardar formulario, CSRF ni resultado. | RF-23–RF-34 |
| `resultadoPublico` | Folio y resumen histórico retornados por registro/resolución; importe opcional según publicación vigente, sin fallback al catálogo. | RF-25–RF-26, RF-34–RF-38 |

En la frontera pública, `costo` puede estar presente o ausente; el backend actual proyecta `costoAceptado` interno como `costo` cuando publica el importe. La UI debe representar ausencia real sin convertirla a cero ni mostrarla mediante datos antiguos. La etiqueta al usuario no debe afirmar aceptación informada de un importe oculto. **RF-35–RF-38.**

## 4. Decisiones justificadas

| Decisión | Motivo | Alternativa descartada |
| --- | --- | --- |
| Mantener módulos ES y separación `connected`/`demo`/`shared`. | Conserva arquitectura, marca y controles existentes; limita regresiones. | Introducir framework, router o un panel nuevo para estos ajustes. |
| Adaptar DTO en la frontera de cada flujo y conservar una proyección de UI pequeña. | Permite manejar campos omitidos y respuestas históricas sin inventar datos. | Rellenar `costo`, estado o cupo con valores supuestos cuando falten. |
| Reemplazar el control de intervalo por tiempo entre citas de 0 a 60, múltiplo de cinco, y representar descanso con dos franjas. | Coincide con el contrato operativo y el cálculo del servidor. | Renombrar solo la etiqueta y seguir enviando `intervaloMinutos` o campos de descanso. |
| Separar activo, inactivo e inhabilitado en vistas y acciones. | Restaurar no activa y la baja conserva historia; evita prometer borrado. | Convertir `DELETE` en `inhabilitar` sin actualizar confirmaciones, listados ni estado. |
| Conservar una clave privada por operación de licencia y cuerpo idéntico hasta respuesta conocida. | El backend exige idempotencia y repetir una renovación con clave nueva puede duplicar el efecto. | Generar otra clave en cada clic o concluir que una respuesta perdida equivale a fracaso. |
| Resolver el intento público antes de ofrecer corrección o nueva selección. | La misma clave y contenido protegen contra doble registro; solo `puedeCorregir` autoriza sucesión. | Cambiar teléfono en un intento incierto o limpiar el marcador al primer 409. |
| Mantener precio público opcional y resumen histórico independiente del catálogo. | El negocio puede ocultar importes y un servicio puede cambiar después del apartado. | Mostrar el precio actual en un resultado antiguo o `0 MXN` cuando se omite el importe. |
| Mostrar resultados anteriores como desactualizados ante fallo técnico y permitir reintentar con filtros intactos. | Evita confundir error con ausencia real de horarios o recursos. | Vaciar la lista y presentar un estado vacío legítimo. |
| Probar contra backend real solo en bases desechables autorizadas, además de pruebas unitarias de estado. | Los permisos, cookies, CSRF, idempotencia y contratos necesitan verificación HTTP; el backend hermano permanece sin edición. | Dar por integrada una función solo con mocks o con la demo. |

## 5. Estrategia de pruebas y aceptación

Primero fijar casos que reproduzcan los fallos del contrato actual. Las pruebas de Node cubren validadores y máquinas de estado; las de navegador recorren el frontend conectado con API real y datos de prueba desechables, y revisan la demo como referencia visual. No ejecutar escrituras sobre la base cotidiana ni afirmar resultados antes de correrlos.

| Bloque de pruebas | Casos mínimos | RF |
| --- | --- | --- |
| Selección y consulta | Slug válido/inválido, licencia cerrada, opciones dependientes, respuestas fuera de orden, vacío frente a 500/503, zona IANA y hora ambigua, consulta sin garantía. | RF-01–RF-10 |
| Contacto y apartado | Límites de nombre/teléfono/notas, `+52`, privacidad, vencimiento exacto, reloj local alterado, vuelta, reemplazo fallido, dos pestañas, recarga/abandono y contacto solo en memoria. | RF-11–RF-22 |
| Envío y recuperación | Doble clic, misma clave/cuerpo, respuesta perdida, `registrado`/`no_registrado`, 503 persistente, cambio de oferta, cupo telefónico, corrección si el servidor la autoriza y resumen histórico. | RF-23–RF-34 |
| Precio público | Visible y oculto en catálogo, apartado, envío, resultado y recuperación; cambio durante apartado; resultado histórico sin costo; cero explícito distinto de ausencia. | RF-35–RF-38, RF-52 |
| Licencias y correos | Estados y tiempos del servidor, plazo 0/2/30 y errores, clave estable tras pérdida de respuesta, renovación con suspensión, estados reales de correo y permisos. | RF-39–RF-44, RF-47 |
| Cupos y recursos | 5/3 iniciales y mínimo 1, lectura por rol, 409 en alta/activación/reducción, inhabilitar/restaurar/activar, citas afectadas sin mutación. | RF-45–RF-51, RF-57–RF-59 |
| Agenda privada | PUT íntegro y error de campo, separación 0/5/60 y valores inválidos, dos franjas sin descanso, bloqueo, cinco rutas privadas y modalidad manual solo privada. | RF-53–RF-56, RF-58–RF-59 |
| Continuidad | Roles y dos negocios, HTML aparente en mensajes, carga/error/foco/teclado, escritorio/móvil y ambos temas, barra móvil, modo conectado/demo con datos distinguidos. | RF-57–RF-62 |

Por cada módulo: `git diff --check`; `npm test` para conducta; `npm run test:browser` para los recorridos afectados cuando exista entorno de prueba; `npm run build` para salida; revisión visual en escritorio/móvil, claro/oscuro y conectado/demo pertinente. Guardar en `docs/` comandos, resultados **reales**, capturas cuando ayuden y RF pendientes; un caso no ejecutado queda pendiente.

## 6. Dependencias y límites comprobados

1. **RF-30:** la spec ya señala que, tras recargar con licencia bloqueada, puede faltar el CSRF necesario para resolver. Conservar el marcador y mostrar recuperación pendiente; no prometer solución completa hasta disponer de un contrato de sesión pública que permita esa recuperación.
2. **RF-32–RF-33:** el backend exige `intentoAnteriorId` como ID decimal interno al preparar un sucesor, pero `POST /intentos` expone `id` como **clave opaca** y `POST /intentos/:id/resolver` devuelve causa y `puedeCorregir` sin el ID decimal. No hay forma comprobada de construir esa petición desde el navegador. Se requiere que el backend acepte la clave previa propia o exponga una referencia segura y autorizada; el frontend debe mantener la incertidumbre y el apartado sin fingir que la corrección ya funciona.
3. **RF-35–RF-38:** la spec usa «costo aceptado» y el backend expone `costo` neutral para no atribuir aceptación de un precio que pudo estar oculto. La implementación debe seguir el contrato de respuesta y evitar afirmaciones incompatibles; cualquier cambio de semántica se acordará antes de programar.
4. Este plan no acredita reserva manual ni integración del cupo telefónico con su escritor real (RF-63 de la spec backend), ni correo enviado por solicitar una operación. No se declaran producción habilitada ni fase cerrada.
