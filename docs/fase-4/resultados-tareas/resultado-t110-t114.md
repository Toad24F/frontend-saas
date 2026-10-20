# Resultado M3-T110–M3-T114 — Envío, recuperación y resumen pendiente

Fecha: 20 de octubre de 2026.

Actualización posterior: [T115–T116](resultado-t115-t116.md) incorpora accesibilidad móvil y pruebas adicionales. Este documento conserva la evidencia y el punto de parada del lote T110–T114; el límite de sesión/CSRF descrito al final sigue vigente.

## Tareas implementadas en frontend

- [x] **M3-T110 — Persistir marcador mínimo antes del envío.** Se verifica en sessionStorage un marcador de negocio, apartado y clave antes de cualquier preparación/envío. No contiene contacto, notas, CSRF ni resultado.
- [x] **M3-T111 — Conectar envío de reserva y repetición.** Validación local, preparación y envío con clave/contenido normalizado estables, exclusión de doble clic y tratamiento explícito de fallos/conflictos sin inventar un resultado.
- [x] **M3-T112 — Resolver resultados inciertos y recargas.** Con marcador, el resolutor precede al catálogo; solo una respuesta registrada válida muestra éxito y solo no_registrado comprobado permite reiniciar. Errores, falta de credencial o marcador corrupto no equivalen a ausencia.
- [x] **M3-T113 — Evitar liberación automática durante un envío.** Salir mientras prepara/envía o sigue incierto no emite liberación competidora. Una preparación recibida después de salir no inicia un escritor tardío; lecturas/avisos antiguos no borran el resultado.
- [x] **M3-T114 — Mostrar resumen de reserva pendiente.** Folio, nombres históricos, fecha/hora/zona, costo y estado pendiente proceden del escritor/resolutor. No se agregan enlaces de gestión ni mensajes de WhatsApp.

Las marcas anteriores acreditan la **implementación del frontend y las comprobaciones descritas aquí**, con el límite de inicialización/CSRF del backend explicado al final. No acreditan una integración contra base real, habilitación de producción ni todas las verificaciones de fase. El backend y su documento fuente de tareas permanecieron de solo lectura. **El trabajo se detiene en T114: T115 y siguientes no se implementaron.**

## Qué se realizó

Se añadió un coordinador de envío separado del ciclo del apartado y un almacén de marcador mínimo. El contacto normalizado se congela en memoria para repetir exactamente el mismo contenido, mientras el marcador permite recuperar un resultado después de recargar sin volver a pedir o guardar esos datos personales.

El flujo conserva el stack, la marca, los temas y los componentes existentes. Se usa el estado semántico pendiente y se mantiene foco en los títulos al cambiar de fase. La demo conserva su reserva local y sus capacidades previas; se corrigieron el título y la descripción final para indicar pendiente, coherente con la cita que ya generaba su motor. No se aplicó una skill nueva ni se incorporaron dependencias.

## Archivos y responsabilidad

| Archivo | Qué hace el cambio |
| --- | --- |
| `src/connected/public/attempt-store.js` | Nuevo. Lee/valida/escribe/verifica el marcador de tres campos por negocio en sessionStorage. Detecta corrupción/bloqueo y solo borra el marcador que coincide con el intento esperado. No tiene fallback persistente ni almacena contacto. |
| `src/connected/public/submission.js` | Nuevo. Coordina preparación, envío, repetición y resolución. Congela contenido normalizado en memoria, conserva incertidumbre, verifica el resumen recibido y elimina el marcador únicamente al conocer el resultado aplicable. |
| `src/connected/public/booking.js` | Modificado. Integra envío/recuperación con apartado y formulario. Invalida lecturas previas al comenzar el envío, bloquea acciones incompatibles y conserva la protección de salida. Recupera antes de iniciar selección. |
| `src/connected/public/browser-session.js` | Modificado. Añade un Web Lock de mutaciones por negocio, compartido por concesiones y envíos. Un envío vivo incierto conserva el lock hasta resolver o salir, impidiendo concesiones desde otra pestaña mientras lo mantiene. |
| `src/connected/public/selection.js` | Modificado. Añade reinicio explícito de selecciones y catálogos para el caso de ausencia terminal comprobada. |
| `src/connected/public/booking-view.js` | Modificado. Habilita Reservar con vigencia válida, presenta envío/incertidumbre/reintentos y renderiza el resumen histórico pendiente sin depender de un apartado o catálogo local. Escapa todo texto recibido. |
| `src/connected/public/entry.js` | Modificado. Conecta el lock nativo, actualiza identidad/título con el negocio histórico del resultado y conserva el marcador con mensaje de recuperación pendiente si falla la inicialización. |
| `src/connected/public/style.css` | Modificado. Añade presentación del folio, lista de resumen y estado pendiente legible en claro/oscuro, manteniendo superficies y colores semánticos. |
| `src/demo/screens/reservas/booking.js` | Modificado. Cambia título/descripción final de confirmada a pendiente; no altera su motor, datos o controles de demostración. |
| `tests/portal-publico-envio.test.js` | Nuevo. Veinte pruebas Node de marcador, protocolo, repetición, incertidumbre, recarga, locks, salida, respuestas atrasadas y resumen seguro. Usa exclusivamente dobles. |
| `tests/fixtures/memory-storage.js` | Nuevo. Implementa almacenamiento efímero para las pruebas; nunca se importa desde el producto. |
| `tests/portal-publico-apartado.test.js` | Modificado. Inyecta almacenamiento de prueba y actualiza la comprobación del botón Reservar: ahora depende de vigencia en lugar de estar siempre deshabilitado. Conserva las 24 regresiones del lote anterior. |
| `tests/fixtures/portal-selection-server.mjs` | Modificado. Simula preparación, escritor idempotente, resolutor y resultados guardados en memoria. Permite perder respuestas antes de preparación o después del registro, y simular error de resolución. Todo /publico se intercepta antes del proxy, sin backend real. |
| `README.md` | Modificado. Actualiza el alcance T098–T114, marcador, envío/recarga y límite de CSRF; distingue expresamente las reglas de la demo del producto conectado. |
| `docs/fase-4/resultados-tareas/resultado-t104-t109.md` | Modificado. Enlaza este resultado como estado posterior sin reescribir la evidencia histórica del lote anterior. |
| Este documento | Nuevo. Registra tareas, flujo, archivos, pruebas y límites de integración. |

Los módulos nuevos y los bloques modificados incluyen comentarios sobre privacidad, coordinación, contrato, recuperación y protección frente a respuestas tardías.

## Flujo implementado

1. Al arrancar se comprueba el almacenamiento de sesión. Sin marcador comienza el selector normal. Con un marcador válido se entra en recuperación **antes de consultar catálogos o permitir nuevos apartados**. Si el almacenamiento no puede leerse o el marcador está corrupto, se bloquea el flujo con explicación y reintento; no se borra evidencia automáticamente.
2. Reservar exige fase de formulario, apartado activo y tiempo restante positivo. Primero se valida el contacto con las reglas del servidor; los errores locales quedan asociados a los campos y no producen preparación ni escritura.
3. Se obtiene el lock de mutaciones por negocio y se genera una clave opaca de intento, distinta de la operación de concesión. Se escribe y se relee el marcador `{ negocio: slug, apartadoId, clave }` para confirmar que puede recuperarse. Si falla, no se prepara ni se envía nada. Un marcador existente no se sobrescribe con otro intento.
4. Se conserva una copia normalizada e inmutable del contacto **solo en memoria**. Se llama `POST intentos` con `{ clave, apartadoId }`. Se verifica que la respuesta corresponda a esa clave/apartado y esté preparada o registrada. Si ya está registrada, se consulta directamente el resolutor sin repetir el escritor.
5. Para un intento preparado se llama `POST intentos/:clave/reservar` con solo `{ nombre, telefono, notas }`. No se envían costo, fin, estado, generación, negocioId o identidad de titular. La respuesta válida es la proyección de una cita pendiente guardada, no una confirmación inventada por la UI.
6. Doble clic, cambio de datos, vuelta a horarios y nuevas concesiones quedan bloqueados durante envío/incertidumbre. El lock permanece tomado si el resultado no puede comprobarse y la página sigue viva. Otra pestaña puede consultar opciones, pero no conceder un apartado mientras ese lock siga ocupado. No reemplaza los bloqueos ni la idempotencia del servidor y se libera al resolver o salir.
7. Ante error de transporte, HTTP o protocolo se conserva el marcador y se informa incertidumbre, sin afirmar éxito o ausencia. **Reintentar el mismo envío**, disponible mientras existe la copia en memoria, conserva clave y contenido normalizado. **Comprobar resultado** llama al resolutor. Los errores funcionales de datos/conflicto también requieren cerrar/comprobar el intento antes de iniciar otro.
8. En recarga no hay contacto normalizado en memoria y no se repite el escritor: se llama únicamente `POST intentos/:clave/resolver` con `{ apartadoId }`, usando cookie y CSRF. `registrado` exige un resultado completo pendiente y muestra sus datos guardados. `no_registrado` permite borrar ese marcador y reiniciar la selección. Cualquier 401/404/503, fallo de red o respuesta inválida conserva la incertidumbre.
9. Borrar o perder localmente un marcador **después de haber detectado incertidumbre** tampoco permite reiniciar: la ausencia local no demuestra ausencia terminal del servidor. Si falla la limpieza del marcador tras no_registrado, se mantiene el bloqueo y se permite volver a comprobar.
10. En un resultado registrado se muestra folio, negocio/servicio/sucursal/profesional históricos, fecha y horas en su zona, costo aceptado y estado pendiente. Se valida estado, campos esenciales, instantes UTC, intervalo, costo y zona antes de mostrar éxito. Se limpia el contacto en memoria. Si el marcador no puede borrarse, el resultado igualmente se muestra porque ya está acreditado; una recarga seguirá pudiendo resolverlo.
11. Salir durante preparación, envío, incertidumbre o resultado no libera el apartado. Si la preparación responde después de salir, no se inicia un POST de reserva tardío. Si el escritor ya estaba enviado, se deja terminar y el marcador permite resolver tras recargar. Las consultas antiguas del apartado se descartan mediante revisión; los avisos de canal no modifican esas fases ni liberan otro apartado.

El backend actual devuelve errores públicos genéricos (`codigo`, `mensaje`, `accion`), sin mapa de errores por campo. Por eso la UI ofrece detalle por campo mediante validación local y conserva el mensaje público/los datos ante rechazo HTTP; no inventa DTO ni asignaciones de errores que el servidor no devuelve. Después de comprobar no_registrado se puede elegir otro apartado y corregir/reutilizar lo escrito en esa navegación interna.

## Tests primero y resultados

Las quince pruebas iniciales se escribieron antes de los módulos nuevos. La primera ejecución fue roja con `ERR_MODULE_NOT_FOUND` para attempt-store.js, antes de ejecutar las aserciones. Después de implementar pasaron. La prueba de coordinación se añadió antes de exportar el nuevo gate y fue roja por exportación ausente; después pasó.

Un caso de endurecimiento produjo un fallo funcional real: después de detectar un marcador corrupto, quitarlo localmente devolvía el flujo a selección sin consulta terminal. La prueba esperaba incertidumbre y recibió selección. Se corrigió esa transición y la prueba pasó. Los casos adicionales cubren una lectura de apartado atrasada, preparación recibida tras salir y preparación que ya estaba registrada.

| Pruebas nuevas | Qué verifican |
| --- | --- |
| Marcador mínimo y aislamiento | Tres campos exactos, rechazo de contacto adicional y claves de almacenamiento separadas por negocio. |
| Orden y normalización | Marcador comprobado antes de ambos POST; preparación con clave/apartado y escritura con contacto normalizado únicamente. |
| Persistencia bloqueada | No se produce ningún POST de intento/reserva si no puede guardarse el marcador. |
| Validación local | Errores por campo antes de persistir o escribir. |
| Doble clic y repetición | Un solo envío en curso; reintento con idéntico contenido/clave pese a intentar editar. |
| 400/409 y conservación | Se mantiene contacto y marcador hasta que pueda determinarse el resultado. |
| Recarga registrada | El primer HTTP del flujo es el resolutor, sin catálogo ni contacto. |
| Ausencia terminal | Solo no_registrado correcto borra el marcador y reinicia el selector. |
| Errores de recuperación | 401/404/503, red y respuestas desconocidas no habilitan otra reserva. |
| Corrupción/almacenamiento | Se bloquea sin eliminar evidencia; ausencia local de un marcador corrupto no demuestra cierre del envío. |
| Limpieza fallida | Una ausencia terminal cuyo marcador no se pudo limpiar no habilita otro intento. |
| Salida durante preparación/escritura | No se emite liberación competidora y se conserva el marcador. |
| Preparación tardía y ya registrada | Salir impide comenzar un escritor posterior; una preparación registrada se recupera mediante resolución sin nuevo escritor. |
| Avisos/lecturas atrasados | No borran el resumen, restauran un apartado o liberan otra referencia tras el envío. |
| Lock entre pestañas | Un envío incierto conserva el lock y lo libera al recuperar resultado. |
| Resumen histórico seguro | Usa nombres/costo guardados, escapa HTML, indica pendiente y no añade enlaces de gestión ni WhatsApp. |
| Resultado incompleto | Estado no pendiente, zona inválida, costo ausente, hora sin UTC o intervalo incorrecto no producen éxito ni borran el marcador. |

Ejecución final nueva/directamente relacionada:

```text
node --test tests/portal-publico-envio.test.js tests/portal-publico-apartado.test.js tests/portal-publico-base.test.js tests/portal-publico-seleccion.test.js tests/backend.test.js tests/availability.test.js
tests 91
pass 91
fail 0
cancelled 0
skipped 0
todo 0
```

Desglose: **20 nuevas**, 24 de apartado/contacto, 8 de base pública, 15 de selección, 8 de cliente privado y 16 de motor de demo. Todas se ejecutan desde el frontend; no son suites del backend ni pruebas contra una base real.

`npm run build`: aprobado, Vite 7.3.6, **119 módulos transformados**, código 0. `git diff --check`: aprobado. No se ejecutó toda la suite ni un lint inexistente.

## Revisión de navegador con API ficticia

Ejecutar `node tests/fixtures/portal-selection-server.mjs` y abrir `http://127.0.0.1:5193/reservas/qa-portal`. La identidad visible indica **API simulada**. La fixture conserva apartados/intentos/resultados solo en memoria; valida contacto ficticio y conserva su hash para comparar reintentos, sin guardar cuerpos, teléfonos o notas en logs.

Controles exclusivos de revisión, inexistentes en el producto:

- `/__qa/mode?value=lost_after`: pierde respuestas del escritor después de guardar el resultado simulado, incluidas repeticiones de transporte. El resolutor sigue disponible.
- `/__qa/mode?value=lost_before`: pierde respuestas de preparación antes de crearla; permite comprobar ausencia terminal mediante resolución.
- `/__qa/mode?value=resolve_error`: el resolutor devuelve 503.
- `/__qa/mode?value=normal`: restablece el comportamiento normal. Resolver un resultado/ausencia en los modos de pérdida también lo restablece.

Se comprobó el recorrido con contacto ficticio y envío. En el primer intento de simular pérdida, el navegador pudo repetir el transporte y obtuvo el mismo resultado; la fixture se endureció para perder también esas repeticiones. Con ello se observó **Comprueba tu envío**, sin acciones para iniciar otra reserva. Al recargar, el portal recuperó **P-000000000000000001** como pendiente, con servicio/sucursal/profesional guardados, 10:00–10:30, America/Mazatlan y 450.00 MXN.

Se revisaron capturas del resumen conectado en escritorio **1366 × 768** y móvil **390 × 844**, claro y oscuro. En el área útil con scrollbar se midió scrollWidth/clientWidth **1351/1351** y **375/375**, sin desbordamiento horizontal. Se verificó la demo hasta su resultado local con título/descripcion pendientes y se revisó en ambos tamaños/temas. No se modificaron ni revisaron pantallas administrativas ajenas al lote.

Ausencia terminal, errores de resolución, bloqueos entre pestañas, salida y respuestas atrasadas se acreditan aquí con las pruebas Node controladas. La prueba manual de pérdida/recarga usa la fixture; **no acredita commit real en MariaDB, concurrencia HTTP real del backend ni las tareas Playwright T117 en adelante**.

## Límite comprobado en el contrato del backend

El resolutor usa `resolverParaLiberar` y puede recuperar una cita propia aunque la licencia ya no acepte reservas. Sin embargo, tras recargar el frontend necesita obtener CSRF con `POST publico/negocios/:slug/sesion`. Su implementación actual usa `negocios.resolver(slug)`, que exige licencia para nuevas reservas. Si la licencia deniega esa inicialización, no se puede reobtener CSRF y todavía no se puede llamar al resolutor desde esa carga.

El frontend conserva el marcador, informa recuperación pendiente y permite reintentar la conexión. **No finge ausencia ni elimina el intento**, pero tampoco puede garantizar recuperación en ese escenario únicamente con el contrato actual. No se persistió CSRF para sortearlo porque el marcador debe contener solo negocio/apartado/clave.

Propuesta de ajuste para un lote de backend autorizado: permitir reobtener CSRF de una **sesión anónima ya existente y comprobada para ese negocio**, aun cuando la licencia impida nuevas reservas, manteniendo origen/cookie/propiedad y sin crear sesiones nuevas ni abrir escrituras de reservas para negocios no habilitados. El endpoint puede conservar el mismo cuerpo y respuesta; requiere revisar la política de autorización en servidor. **Es una propuesta, no un cambio implementado.**

## Otros límites y pendientes

- Backend, variables, base de datos y Nginx permanecieron sin modificaciones. No se habilitó producción.
- El marcador está en sessionStorage: cerrar definitivamente la pestaña o perder su almacenamiento/credencial puede impedir recuperar su referencia. No se ofrecen consultas por teléfono o folio, ni gestión posterior. Tras acreditar y limpiar un resultado, otra recarga ordinaria ya no conserva ese resumen.
- No se garantizó recuperación con licencia bloqueada ni identidad perdida. Se conserva incertidumbre con explicación; el ajuste de sesión descrito arriba queda pendiente del backend.
- La conservación del lock protege pestañas vivas que participan en este protocolo. No sustituye al servidor ni es una garantía durable después de cerrar una página.
- No se inició T115, T116 ni el runner de navegador de T117. La revisión acotada de tamaños/foco pertenece a la UI modificada, sin declarar cerrada la accesibilidad integral o la fase completa.
- **Trabajo detenido después de T114.**
