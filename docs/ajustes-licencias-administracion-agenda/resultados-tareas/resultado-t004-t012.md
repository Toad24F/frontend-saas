# Resultado FALA-T004–T012 — portal público y visibilidad del precio

Alcance: portal conectado. No se editó `../backend` ni se usó su base cotidiana. La demo y los estilos compartidos no cambiaron. Estas tareas cubren RF-01–RF-10, RF-15, RF-25–RF-26, RF-34–RF-38 y RF-59 en los criterios concretos de `tareas.md`; no acreditan el resto de la spec.

## Qué se realizó y función de cada archivo

| Tarea y RF | Archivo o comprobación | Función y motivo |
| --- | --- | --- |
| T004 · RF-01–RF-02 | `tests/browser/portal.spec.js` | Agrega casos de slug inexistente y respuesta HTTP 403 de licencia; comprueba que no se abra la selección ni aparezca una acción para apartar. El negocio disponible se prueba también en T117. |
| T005 · RF-03–RF-04 | `tests/portal-publico-seleccion.test.js` (existente) | Los casos T101–T102 verifican pasos, dependencias y limpieza de sucursal, profesional, fecha y ranura al cambiar selecciones. No hizo falta modificar producto. |
| T006 · RF-05–RF-08, RF-59 | `tests/portal-publico-seleccion.test.js` (existente) | T116 y T101–T103 cubren respuestas atrasadas, carga, vacío, fallo y reintento; la suite confirmó el comportamiento vigente. |
| T007 · RF-09–RF-10 | `tests/portal-publico-seleccion.test.js` (existente) | T103 comprueba hora en zona IANA de sucursal y texto de ranura disponible sin prometer apartado. |
| T008 · RF-35–RF-36 | `src/connected/public/selection.js` | La frontera del catálogo acepta `costo` omitido; conserva duración obligatoria y rechaza un precio presente vacío, nulo o malformado. |
| T009 · RF-35–RF-36 | `src/connected/public/selection-view.js` | Muestra la duración siempre y añade importe únicamente si la API lo entregó. El cero explícito sigue visible. |
| T010 · RF-15, RF-35–RF-37 | `src/connected/public/booking.js` | Lee el `costo` público opcional de la concesión y de la consulta propia. Si la segunda respuesta omite el costo, retira el anterior de la vista. |
| T011 · RF-25–RF-26, RF-34–RF-38 | `src/connected/public/submission.js`, `src/connected/public/booking-view.js` | Valida el resultado histórico con `costo` opcional y presenta el precio de la fase actual; jamás sustituye un costo omitido con el del catálogo. |
| T012 · RF-35–RF-38 | `tests/ala-portal-precios.test.js`, `tests/browser/portal.spec.js` | Prueban visible, oculto, cero explícito, precio anterior retirado y resultado sin filtración. El navegador reserva realmente contra la base temporal con proyección HTTP de precio oculto. |
| Soporte de contratos | `tests/portal-publico-apartado.test.js`, `tests/portal-publico-accesibilidad.test.js`, `tests/portal-publico-envio.test.js`, `tests/portal-publico-resumen.test.js`, `tests/fixtures/portal-selection-server.mjs` | Actualizan dobles y expectativas del antiguo `costoAceptado` al campo público real `costo`, sin alterar el flujo que ejercitan. |
| Verificación de portada | `tests/browser/portal.spec.js` (T117) | Ajusta dos encabezados esperados a los títulos actuales de la portada y del paso de servicio; conserva la comprobación de oferta real. |

Los comentarios junto a los bloques nuevos explican la omisión del precio, la precedencia de cada respuesta y el aislamiento de los casos de navegador. Los archivos de prueba existentes solo cambiaron sus datos de contrato; sus escenarios siguen siendo los mismos.

## Flujo del precio y del apartado

1. El portal abre la sesión del negocio por slug. Si el slug no existe o la sesión responde 403, presenta el error y no habilita selección. Servicio, sucursal y profesional se eligen en orden; un cambio invalida los pasos posteriores. La consulta de disponibilidad devuelve ranuras en UTC, que se presentan en la zona de la sucursal sin llamarlas reservas.
2. El catálogo puede publicar `costo` como cadena decimal o omitirlo. La selección muestra duración y, solo cuando está presente, precio. Omitirlo significa ocultar el importe; `0.00` significa precio cero visible.
3. Al apartar, la concesión es la fuente del costo durante el formulario. La lectura propia puede cambiar la visibilidad y retirar el importe mostrado. La vista no vuelve al precio del catálogo aunque este exista.
4. Tras registrar, el resultado aporta nombres, horario y costo histórico de la cita, sujeto a la proyección pública actual. El resumen usa exclusivamente esa respuesta; si omite `costo`, desaparecen importe, etiqueta y nota de pago. El estado de la cita continúa como pendiente.

## Tests primero y resultados reales

| Prueba o comprobación | Resultado |
| --- | --- |
| `node --test tests/ala-portal-precios.test.js` antes de producto | 0/4 aprobadas: evidenció rechazo del catálogo oculto, lectura obligatoria de `costoAceptado` y uso de precio anterior. Se añadió después un caso de precio vacío/nulo; falló 1/4 antes de ajustar la validación. |
| Playwright focalizado T004/T012 antes del cambio de producto | T004 pasó y T012 falló al recibir catálogo sin precio. |
| `npm test` final | **164/164 aprobadas**, 0 fallidas, 0 omitidas, código 0; incluye los cuatro casos nuevos y las pruebas existentes T101–T103/T116. |
| `PORTAL_TEST_BACKEND_READ_ONLY=1 npm run test:browser -- --grep 'FALA-T004\|FALA-T012\|T117:\|T118:\|T119:'` (PowerShell; expresión regular con barras verticales) | **5/5 aprobadas**, código 0, 19.3 s. Incluye portal conectado, reserva móvil, teclado, slug y precio oculto. La base de datos de prueba se crea y elimina por el runner. |
| `npm run build` | Correcto: 123 módulos transformados, código 0. |
| `git diff --check` | Correcto, sin errores de espacios. |

La primera ejecución conjunta de navegador tuvo 4/5 aprobadas porque T117 buscaba dos encabezados que la portada ya no usa; al actualizar sus expectativas, la misma selección de cinco casos pasó. Las pruebas de navegador cubren escritorio con tema inicial y un flujo móvil. No se hizo inspección visual manual de ambos temas ni de la demo, que no recibió cambios.

## Límites

El 403 de licencia de T004 se simula en la frontera HTTP; el caso no cambia una licencia real. T012 retira `costo` de respuestas reales durante la prueba; no configura la publicación del negocio. Esa configuración corresponde a T046. Las pruebas no certifican operaciones administrativas ni tareas T013 en adelante.
