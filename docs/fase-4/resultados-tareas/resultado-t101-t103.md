# Resultado M3-T101–M3-T103 — Selección pública y consulta de horarios

Fecha: 20 de octubre de 2026.

Nota posterior: este documento conserva la evidencia del lote T101–T103. La fixture de revisión y el portal se ampliaron después con apartados y contacto; su estado actual y límites constan en [resultado T104–T109](resultado-t104-t109.md).

## Estado del lote

- [x] **M3-T101 — Definir estados y selecciones dependientes.** Estado aislado en memoria, invalidación de las selecciones posteriores y descarte de consultas atrasadas, incluidos sus errores.
- [x] **M3-T102 — Construir pasos de servicio, sucursal y Profesional.** Opciones compatibles consultadas mediante el catálogo público, navegación adelante/atrás, radios nativos etiquetados y foco al cambiar de paso.
- [x] **M3-T103 — Construir selector de fecha y horario.** Consulta pública por día, hora y zona de la sucursal, selección de una ranura recibida y estados diferenciados de vacío, selección inválida y fallo con reintento.

Estas marcas corresponden al trabajo en **frontend-saas**. Se consultó `backend/docs/fase-4-modulo-3/tareas.md`, pero no se modificó ese documento ni ningún otro archivo, configuración o dato del backend. **El lote termina en T103: T104 y siguientes permanecen pendientes.**

## Qué cambió

Después de verificar la sesión anónima, el portal conectado ya permite elegir servicio, sucursal, profesional, fecha y horario. Las opciones se obtienen de la API pública y la disponibilidad se presenta sin calcular candidatos en JavaScript. Elegir un horario solo marca una selección en memoria: no crea apartado ni permite enviar una cita.

Se conserva el stack HTML/CSS/JavaScript con módulos ES y Bootstrap existente, la marca, las tipografías, los logos y los tokens de claro/oscuro. Se consultó la skill `design-taste-frontend`, cuyo alcance excluye los flujos de producto de varios pasos; no se aplicaron sus patrones de landing ni se introdujeron dependencias.

La demo ya tenía el mismo orden de selección. Se conserva su recorrido completo y su motor local, y se aclara en el paso de fecha/hora que sus horarios son simulados. Las diferencias de capacidades siguen visibles: la demo puede simular completar la reserva; el portal conectado de este lote termina en selección de horario.

## Archivos y función

| Archivo | Operación y responsabilidad |
| --- | --- |
| `src/connected/public/selection.js` | Nuevo. Controlador de selección en memoria: estados, opciones compatibles, navegación, consultas, validación de respuestas y descarte por revisión/AbortController. Reserva campos separados para las fases futuras, sin implementarlas. |
| `src/connected/public/dates.js` | Nuevo. Valida fechas civiles y presenta fechas/horas mediante Intl en una zona IANA explícita. No genera disponibilidad ni convierte una hora local en una reserva. |
| `src/connected/public/selection-view.js` | Nuevo. Renderiza los cuatro pasos con HTML escapado, radios nativos, etiquetas, anuncios de estado y controles de navegación; conecta los eventos y restaura el foco. No importa módulos del panel o datos de demo. |
| `src/connected/public/entry.js` | Modificado. Monta el controlador y su vista después de comprobar la sesión anónima de T098–T100. Sustituye el aviso anterior de selección no disponible por el flujo implementado. |
| `src/connected/public/style.css` | Modificado. Añade estilos acotados de pasos, opciones, fecha, horarios y acciones, con ajustes móviles y foco visible, reutilizando los tokens existentes. |
| `src/demo/screens/reservas/booking.js` | Modificado. Aclara que los horarios de demostración son simulados; conserva su cálculo y comportamiento. |
| `tests/portal-publico-seleccion.test.js` | Nuevo. Quince pruebas Node del estado, contratos de consulta, invalidación, respuestas desordenadas, fechas, errores y salida HTML. Usa dobles y no contacta una base de datos. |
| `tests/fixtures/portal-selection-server.mjs` | Nuevo. Servidor Vite exclusivamente de revisión con API ficticia aislada. Intercepta **todas** las rutas `/publico` antes del proxy, sin contactar al backend. Permite reproducir horarios, vacío, 503 y 404. No se importa desde `src/` ni se incluye como fallback del producto. |
| `README.md` | Modificado. Actualiza el alcance T098–T103, explica las consultas y corrige el enlace al resultado anterior, ahora ubicado en `docs/fase-4/resultados-tareas`. |
| Este documento | Nuevo. Registra finalización, flujo, archivos, pruebas y límites del lote. |

Los módulos nuevos y los bloques modificados contienen comentarios sobre su responsabilidad, invalidación, foco, límites y aislamiento de la API de prueba.

## Flujo implementado

1. La entrada pública verifica la sesión conforme a T098–T100 y monta el controlador con fase `selection`. Las fases definidas son `selection`, `hold`, `form`, `sending`, `uncertain` y `result`; las cinco últimas quedan reservadas para tareas posteriores. Apartado, formulario, envío y resultado tienen campos separados inicialmente nulos.
2. **Servicio:** `GET catalogo` sin filtros devuelve los servicios activos compatibles del negocio. Se presenta nombre, duración y costo informativo. «Continuar» exige una opción presente en la respuesta vigente.
3. **Sucursal:** `GET catalogo?servicioId=…` devuelve las sucursales compatibles. Se presenta nombre, dirección y zona horaria. Cambiar de servicio elimina sucursal, profesional, fecha y horario.
4. **Profesional:** `GET catalogo?servicioId=…&sucursalId=…` devuelve los profesionales de esa combinación. Cambiar sucursal elimina profesional, fecha y horario; cambiar profesional elimina fecha y horario. Volver conserva las selecciones mientras sigan siendo válidas, pero refresca el catálogo del paso.
5. **Fecha/hora:** la fecha inicial se toma del reloj del navegador expresado en la zona IANA de la sucursal. Es solo un valor inicial: el servidor decide qué horarios siguen siendo reservables. El usuario puede elegir otra fecha con el selector nativo.
6. Cada consulta envía únicamente `servicioId`, `sucursalId`, `personalId`, `desde` y `hasta` a `GET disponibilidad`. `desde` y `hasta` son la misma fecha: una petición abarca un día, dentro del máximo inclusivo de 31 fechas. No se inventa un horizonte local ni se envía modalidad manual, negocioId o exclusiones.
7. La respuesta debe corresponder a los IDs y fecha consultados, indicar modalidad pública, una zona interpretable y una lista de intervalos válidos. Se muestran exclusivamente esas ranuras, convirtiendo sus instantes UTC a hora de sucursal mediante Intl. Un cambio de fecha elimina el horario elegido; no hay resultados parciales si una ranura es inválida.
8. Elegir una ranura conserva su inicio/fin UTC y sus etiquetas locales en memoria y muestra «Aún no está apartado». El cuarto paso no ofrece continuar a un formulario. La futura concesión/revalidación del apartado corresponde a T104.

Cada consulta recibe una revisión y una señal de cancelación. Cambiar selección, fecha, paso o reintentar invalida la revisión previa. Incluso si un transporte ignora la cancelación, una respuesta o error atrasados no pueden cambiar el estado vigente.

## Carga, errores y accesibilidad

- `loading`: anuncia la consulta y bloquea la continuación; no presenta opciones anteriores como resultado actual.
- `ready`: muestra opciones/horarios utilizables. Un ID o una ranura que no estén en la respuesta vigente no pueden seleccionarse mediante el controlador.
- `empty`: solo tras respuesta válida sin opciones/ranuras; permite volver, cambiar fecha o reintentar.
- `invalid`: fechas inválidas o respuestas funcionales 400/404/409; permite corregir la selección y reintentar. Las fechas civiles inválidas se rechazan antes de enviar HTTP.
- `error`: fallos técnicos, de red, protocolo u otros errores HTTP; muestra reintento sin convertirlos en agenda vacía ni exponer excepciones internas.

Los pasos usan `fieldset`, `legend`, radios nativos y etiquetas visibles; el paso actual usa `aria-current="step"`. Al avanzar o volver, el foco se dirige al título. Al seleccionar o consultar se conserva el control cuando sigue disponible. Los estados tienen anuncios `role="status"`, `aria-live` y región de consulta `aria-busy`. La accesibilidad integral del formulario y etapas posteriores sigue fuera del lote.

## Tests primero

Se escribieron las doce pruebas iniciales antes de los módulos de implementación. La primera ejecución fue roja con código 1 y `ERR_MODULE_NOT_FOUND` para `selection.js`, antes de ejecutar sus aserciones. Después de implementar pasaron las doce.

Se añadieron tres casos de endurecimiento. Uno detectó un fallo concreto: un error de catálogo mantenía las opciones antiguas visibles, aunque deshabilitadas (**14 aprobadas, 1 fallida**). Se corrigió la vista para no renderizarlas como resultado de una consulta fallida. La suite nueva terminó con **15 aprobadas, 0 fallos**.

| Casos nuevos | Qué verifican |
| --- | --- |
| Fases y avance | Estado de selección separado, campos futuros nulos y bloqueo sin opción válida. |
| Consultas compatibles y regreso | Filtros exactos de cada paso, selección de sucursal/profesional y navegación atrás. |
| Invalidación por servicio | Elimina sucursal, profesional, fecha, horario y opciones posteriores. |
| Catálogo atrasado | Una respuesta de un servicio anterior no sobrescribe el paso actual. |
| Fechas y rango | Fecha real, bisiestos, rechazo de fechas inválidas sin HTTP y rango de un día. |
| Ranuras y alcance | Solo admite horarios recibidos, presenta hora local y no concede apartado ni avanza a formulario. |
| Vacío/invalidación/fallo | Diferencia respuesta vacía, 404 funcional y 503 técnico; permite reintentar. |
| Error de disponibilidad atrasado | Una consulta anterior que falla no modifica una fecha posterior. |
| Respuestas inválidas | Datos incompletos, selección ajena o intervalos inválidos son errores, no agenda vacía. |
| Oferta desaparecida | Refrescar el catálogo elimina una selección que ya no está ofrecida. |
| Zonas IANA | Fecha local distinta de UTC y cambio estacional de offset en Nueva York. |
| HTML seguro y semántica | Escapa nombres con apariencia de script y conserva radios, leyendas y título enfocable. |
| Invalidación por sucursal/profesional | Preserva solo las selecciones anteriores aplicables. |
| Disponibilidad tras volver | Una respuesta tardía no reaparece en el paso de profesional. |
| Catálogo fallido tras éxito | No vuelve a mostrar opciones antiguas y mantiene el reintento con mensaje seguro. |

Ejecución final de las suites nuevas/directamente relacionadas:

```text
node --test tests/portal-publico-base.test.js tests/portal-publico-seleccion.test.js tests/backend.test.js tests/availability.test.js
tests 47
pass 47
fail 0
cancelled 0
skipped 0
todo 0
```

Desglose: **15 nuevas**, 8 de la base pública T098–T100, 8 de regresión del cliente privado y 16 del motor de demostración. Todas se ejecutaron desde el frontend; no son pruebas del backend real.

`npm run build`: aprobado, Vite 7.3.6, **112 módulos transformados**, código 0. `git diff --check`: aprobado. No se ejecutó la suite completa ni se declara un lint inexistente.

## Verificación visual reproducible

Para revisar sin modificar datos reales:

```sh
node tests/fixtures/portal-selection-server.mjs
```

Abrir `http://127.0.0.1:5193/reservas/qa-portal`. La identidad visible dice **«Consultorio de prueba · API simulada»**. La fixture solo simula sesión/catálogos/disponibilidad; las demás rutas públicas reciben 404. Puede usarse `?demo=1` para revisar la demo independiente.

Se completó Servicio → Sucursal → Profesional con **Tab, espacio y Enter**, comprobando el foco en cada título. Se eligió la fecha `2026-10-20`, se mostraron 09:00/10:00/11:00 en `America/Mazatlan` y se seleccionó 10:00 sin crear un apartado. Se verificaron el regreso a profesional y estas respuestas reproducibles:

- `2026-10-21`: respuesta válida vacía, con mensaje de ausencia de horarios.
- `2026-10-22`: 503, mensaje técnico seguro y reintento, sin ranuras falsas.
- `2026-10-23`: 404, mensaje de selección no disponible.
- Volver a `2026-10-20`: recupera la lista y permite seleccionar horario.

Se inspeccionaron capturas del portal conectado en **1366 × 768** y **390 × 844**, claro y oscuro. En móvil, el área útil con scrollbar midió **375 px y scrollWidth 375 px**, sin desbordamiento horizontal. Se recorrió también la demo hasta fecha/hora y se revisó su nueva aclaración en escritorio y móvil, ambos temas. No se revisaron pantallas administrativas ajenas a este cambio.

## Límites y pendientes

- La revisión de navegador utiliza una API simulada y las pruebas Node usan dobles. **No se afirma integración contra la API/base real ni cumplimiento de las pruebas Playwright T117 y siguientes.** La fixture jamás se importa en el producto ni se usa para ocultar errores reales.
- El servidor conserva la autoridad sobre oferta, anticipación, horizonte, intervalos públicos, compactación y tiempos ambiguos/inexistentes. El navegador solo presenta instantes recibidos; no duplica el motor.
- La fecha inicial depende del reloj del navegador; la consulta y las futuras escrituras deberán seguir respetando el reloj del servidor. El contador de apartado no forma parte de este lote.
- No hay contacto capturado, persistencia de datos del cliente, apartado, envío, recuperación, folio, confirmación ni WhatsApp conectados en esta entrega.
- Continúan los requisitos previos de sesión, mismo origen y configuración del backend. No se modificó Nginx ni se habilitó producción.
- **Trabajo detenido después de T103.**
