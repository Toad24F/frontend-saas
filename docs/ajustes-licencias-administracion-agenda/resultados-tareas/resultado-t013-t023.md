# Resultado FALA-T013–T023 — contacto, apartado e intento público

Alcance: portal conectado. Se consultó el contrato del backend sin editar sus archivos ni tocar su base cotidiana. La demo no cambió. Esta evidencia acredita únicamente los criterios de T013–T023; la corrección telefónica completa y la recuperación de CSRF con licencia cerrada dependen de contratos posteriores.

## Trabajo por tarea y RF

| Tarea | RF | Comprobación y resultado |
| --- | --- | --- |
| T013 | RF-11–RF-14 | `portal-publico-apartado.test.js` T105–T106 verifica nombre de 1–150 puntos Unicode, notas hasta 2.000, teléfono de diez dígitos con `+52`/espacios/guiones, errores por campo y ausencia de búsqueda por teléfono. El código existente en `contact.js` pasó sin cambios. |
| T014 | RF-15–RF-17 | T107 verifica presupuesto desde hora del servidor, reloj monótono, vencimiento exacto y conservación del formulario. `hold-clock.js` y `booking.js` ya lo implementaban. |
| T015 | RF-18–RF-19 | T104 y T109 verifican concesión, sustitución fallida y liberación confirmada antes de volver. Los casos de navegador T120–T121 ejercitan apartados reales de la base temporal. |
| T016 | RF-20 | T108 y Playwright T120 verifican avisos entre pestañas, generación y relectura propia. |
| T017 | RF-21–RF-22 | T109, T122 y T116 comprueban `pagehide`, liberación de mejor esfuerzo, recarga sin contacto y memoria de sesión sin nombre/notas. |
| T018 | RF-23–RF-24, RF-27–RF-29, RF-33 | T110 y T116 comprueban marcador de solo `negocio`, `apartadoId`, `clave`, guardado antes del POST y bloqueo de acciones incompatibles. |
| T019 | RF-23–RF-26, RF-34 | T111, T114 y Playwright T123 confirman doble clic/repetición, mismo folio y resumen histórico pendiente. |
| T020 | RF-27–RF-29 | T112, los dos casos T123 y un nuevo caso de `ala-portal-intentos.test.js` distinguen registrado, no registrado terminal, respuesta perdida, recarga y 503 con marcador conservado. |
| T021 | RF-31, RF-58 | `booking.js` explica que oferta, horario, licencia u ocupación pueden haber cambiado cuando el resolutor confirma ausencia; conserva el contacto para elegir disponibilidad nueva. Las pruebas T111–T112 y el nuevo caso comprueban que no se fabrique resultado. |
| T022 | RF-32–RF-33, RF-58 | `http.js` reconoce solo `cupo_telefono_excedido` con HTTP 409. `submission.js` distingue el rechazo terminal, conserva el marcador, bloquea el reenvío del mismo intento y no inventa un sucesor. `booking-view.js` muestra el rechazo sin prometer una cita. Los nuevos tests contrastan cupo y 409 ordinario. |
| T023 | RF-29–RF-30 | Playwright bloquea `/sesion` después de una respuesta de escritor perdida y recarga: permanece el marcador, se muestra recuperación pendiente y no se abre otra selección. `entry.js` ya implementaba esta barrera. |

## Archivos modificados y función

- `src/connected/public/http.js`: permite el código funcional específico de cupo telefónico solo con 409. Conserva el filtro de mensajes públicos para otros estados.
- `src/connected/public/submission.js`: identifica la resolución `no_registrado` por cupo, mantiene la referencia propia y desactiva la repetición. Su comentario explica por qué no crea un intento sucesor sin el contrato pendiente.
- `src/connected/public/booking-view.js`: muestra «No se registró la reserva» y la causa de cupo, sin controles para repetir un intento terminal ni texto de incertidumbre ya resuelta.
- `src/connected/public/booking.js`: aclara la necesidad de consultar disponibilidad vigente tras un rechazo ordinario comprobado. Conserva el contacto en memoria.
- `tests/ala-portal-intentos.test.js` (nuevo): prueba la frontera HTTP de cupo, el marcador y el bloqueo del reenvío, además de ausencia terminal sin folio. Los comentarios explican cada escenario.
- `tests/browser/portal.spec.js`: añade caso de licencia bloqueada al recargar y capturas de formulario en escritorio/móvil y claro/oscuro. Actualiza tres expectativas de encabezado del primer paso para usar el título actual de la portada; sus comentarios describen el propósito.
- `docs/ajustes-licencias-administracion-agenda/tareas.md`: marca únicamente T013–T023 y enlaza esta evidencia.

## Flujo comprobado

El usuario elige servicio, sucursal, profesional y ranura. El POST de apartado devuelve ID, generación y vencimiento desde el servidor; una lectura propia confirma vigencia. El formulario guarda nombre, teléfono y notas en memoria. El reloj solo puede reducir el tiempo restante. Al volver, se confirma la liberación antes de ofrecer nuevos horarios; otra pestaña provoca relectura y deshabilita un apartado sustituido.

Antes de registrar, `sessionStorage` recibe únicamente slug, ID de apartado y clave de intento. El contenido normalizado se congela en memoria. El navegador prepara y envía con la misma clave; si falta una respuesta, muestra incertidumbre y resuelve ese intento antes de otra reserva. `registrado` muestra folio y resumen histórico pendiente; `no_registrado` ordinario limpia la referencia y vuelve a disponibilidad conservando el contacto abierto. Un 409 por cupo no equivale a registro ni a conflicto genérico: se comprueba la causa con el resolutor, se conserva la referencia y se impide repetir el intento terminal. Si la sesión pública se bloquea tras recargar, la referencia sigue guardada hasta que pueda comprobarse.

## Tests primero y verificación final

| Ejecución | Resultado real |
| --- | --- |
| `npm test` inicial | 164/164 aprobadas. Confirmó la cobertura existente antes de cambios. |
| `node --test tests/ala-portal-intentos.test.js` antes de implementación | Tras corregir el doble de prueba, 1/3 aprobadas y 2/3 fallidas: el código de cupo era `portal_error` y la resolución terminaba como incertidumbre genérica. Un caso adicional de texto terminal falló antes de ajustar la vista. |
| Playwright focalizado T023 antes de implementación | 1/1 aprobada: el marcador pendiente ya sobrevivía al 403 de sesión tras recarga. |
| `npm test` final | **167/167 aprobadas**, 0 fallidas, 0 omitidas, código 0. |
| Playwright T120–T123, T023 y revisión visual | **7/7 aprobadas**, código 0, 40.2 s, con base efímera creada y eliminada por el runner. Una primera ejecución dio 3/6 por encabezados anteriores en T121–T123; corregidas las expectativas, pasó el lote. |
| `npm run build` | Correcto: 123 módulos transformados, código 0. |
| `git diff --check` | Correcto, sin errores de espacios. |

Se inspeccionaron cuatro capturas Playwright del formulario conectado (escritorio y 390 px, claro y oscuro). Formulario, contador, resumen y acciones son legibles; la prueba confirma ausencia de desborde horizontal del documento. En 390 px la fila de pasos muestra solo parte del recorrido sin desplazar el documento: queda señalada para T057, que contempla la revisión visual integral. Las PNG se generan en `test-results/` y no forman parte de la entrega versionada.

## Límites del contrato

El caso T023 simula el 403 de licencia en la frontera HTTP, sin cambiar una licencia real. La recuperación completa sin nuevo CSRF sigue pendiente de T063–T064. La API reconoce `puedeCorregir`, pero el frontend todavía no dispone de una referencia propia segura para `intentoAnteriorId`; por eso T022 muestra el cupo y protege el intento sin ofrecer una corrección que pudiera crear una reserva incompatible. La corrección segura corresponde a T065–T067. No se modificó el backend ni se validó en navegador un cupo real de dos citas; el caso específico se probó con doble de contrato.
