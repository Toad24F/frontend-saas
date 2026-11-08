# Resultado M3-T115–M3-T116 — Accesibilidad móvil y regresiones de estado

Fecha: 20 de octubre de 2026.

## Tareas hechas

- [x] **M3-T115 — Ajustar navegación móvil y accesibilidad del flujo.** Foco restaurado y visible, etiquetas/errores asociados, avisos en una región estable, controles cómodos y resumen adaptable sin desbordamiento horizontal en los anchos comprobados.
- [x] **M3-T116 — Probar estado y respuestas desordenadas del portal.** Pruebas Node de invalidación de dependencias, descarte de éxitos y errores antiguos, conservación de contacto en memoria y bloqueo de otra reserva mientras existe incertidumbre.

Las marcas acreditan el frontend y las verificaciones indicadas aquí. El documento fuente del backend no se modifica porque esa carpeta es de solo lectura. **Trabajo detenido después de T116; T117 no se inicia.**

## Qué se realizó y por qué

Los mensajes visibles se recreaban junto con cada pantalla, lo que puede impedir que una tecnología de asistencia detecte su actualización. Ahora existe una sola región `role=status`, `aria-live=polite`, `aria-atomic=true`, creada al montar el selector y conservada durante todos los renders. Los avisos se escriben mediante `textContent` después de actualizar el contenido. Se anuncian carga, cantidad de opciones/horarios, selección de horario, vacío, errores, validación, incertidumbre y resultado pendiente, sin leer contacto ni el contador cada segundo.

El foco ya se llevaba al título al cambiar de paso. Se amplió la restauración a las acciones del formulario y recuperación, conservando también cursor y selección de texto. Durante la revisión real a 320 px apareció un fallo: **Revisar datos** conservaba el foco, pero quedaba por debajo del viewport al insertarse el mensaje de validación. Se añadió desplazamiento explícito al control enfocado, sin animación y con margen para mostrar su contorno completo. Los errores locales siguen llevando al primer campo inválido.

Los cambios visuales son acotados: textos largos pueden encogerse dentro de las opciones, controles de escritura de 16 px, foco terracota explícito, botones móviles que se distribuyen en filas y resumen de una columna en móvil. Se preservan marca, logos, paleta clara/oscura, cuatro pasos del selector y capacidades existentes. La demo refleja el tamaño de escritura y el foco visible; conserva su motor ficticio, validación nativa, navegación y textos de demostración. No se aplicaron skills ni se añadieron dependencias.

## Archivos afectados en este lote

| Archivo | Responsabilidad del cambio |
| --- | --- |
| `src/connected/public/accessibility.js` | Nuevo. Compone anuncios de estado sin valores de contacto, evita repetir texto idéntico y restaura foco/cursor con desplazamiento visible. Incluye comentarios del propósito y límites. |
| `src/connected/public/selection-view.js` | Modificado. Separa contenido reemplazable y región viva persistente; mantiene eventos delegados, restaura todas las acciones públicas y marca la fecha inválida con `aria-invalid`. Las ayudas siguen asociadas por ID. |
| `src/connected/public/booking-view.js` | Modificado. Quita regiones vivas transitorias duplicadas, identifica el botón Revisar datos y utiliza el helper de foco para errores de revisión/envío. El reloj sigue actualizándose sin recrear campos ni anunciar cada tick. |
| `src/connected/public/style.css` | Modificado. Permite texto flexible, mantiene foco visible, añade margen de desplazamiento, escritura de 16 px, acciones adaptables, resumen móvil de una columna y espacio de zona segura. |
| `src/demo/screens/reservas/style.css` | Modificado. Refleja el foco visible y escritura móvil de 16 px sin conectar la demo al backend ni modificar su motor. |
| `tests/portal-publico-accesibilidad.test.js` | Nuevo. Cuatro pruebas de anuncios, deduplicación/texto seguro, etiquetas/ayudas/errores y orden de restauración del foco/cursor/desplazamiento. |
| `tests/portal-publico-seleccion.test.js` | Modificado. Dos regresiones parametrizadas: éxito/error tardíos tras cambiar fecha y limpieza de dependencias al cambiar servicio/sucursal/profesional. También comprueba que modificar un snapshot no altera el controlador. |
| `tests/portal-publico-envio.test.js` | Modificado. Dos regresiones: incertidumbre bloquea todas las acciones de nueva reserva hasta ausencia terminal, y el contacto sobrevive al vencimiento/navegación interna sin persistirse, limpiándose al salir. |
| `README.md` | Modificado. Enlaza alcance y evidencia T115–T116, distinguiendo el runner pendiente T117. |
| `resultado-t110-t114.md` | Modificado. Añade referencia al lote posterior sin reescribir la evidencia histórica ni sus límites. |
| `evidencias/t115-resultado-movil.png` | Nuevo. Captura del resumen pendiente a 390 × 844, tema oscuro, con API simulada visible y datos ficticios. |
| Este documento | Nuevo. Registra marcas, explicación, flujo, pruebas, resultados y límites. |

Los bloques nuevos/modificados incluyen comentarios sobre accesibilidad, foco, anuncios, tamaños móviles y finalidad de los dobles de prueba. No se modificaron los contratos ni los controladores de estado del producto para T116: las pruebas confirman sus protecciones existentes.

## Flujo comprobado

1. La sesión pública y el marcador mantienen su protocolo existente. Una recuperación pendiente sigue precediendo al catálogo; no se cambia su autorización ni almacenamiento.
2. Al montar la selección se crean el contenedor visible y la región viva vacía. Cada actualización reemplaza únicamente el primero. Los eventos siguen delegados en el host.
3. Servicio → sucursal → profesional → fecha/hora conserva radios nativos, fieldsets/legends y etiquetas. Cambiar una dependencia invalida sus selecciones posteriores; consultas antiguas se descartan incluso si el transporte ignora la cancelación.
4. Cambiar de paso/fase lleva el foco al título; refrescar mantiene fecha/radio/acción cuando sigue disponible. Tras restaurar cursor se desplaza el control al área visible. El margen de 12 px evita recortar su contorno.
5. Se actualiza el anuncio breve con texto seguro. Los mensajes idénticos no vuelven a escribirse; el contador conserva `aria-live=off`. Los errores están disponibles tanto en el anuncio como en la ayuda del campo, sin convertir cada mensaje visible en otra región viva.
6. Revisar datos mantiene el botón enfocado si todo es válido; si hay errores lleva al primer campo inválido. La escritura mantiene su actualización sin render y el contador no interrumpe el cursor.
7. Un envío incierto muestra únicamente comprobación/repetición del mismo intento. La prueba intenta cambiar selección, avanzar, volver, solicitar otro apartado y enviar de nuevo: no genera llamadas nuevas. Un error del resolutor conserva el bloqueo; solo `no_registrado` válido elimina el marcador y reinicia selección, conservando el contacto en esta navegación interna.
8. Vencimiento y vuelta a horarios conservan el contacto en memoria. No aparece en el marcador; salir limpia los campos. La recuperación registrada muestra el resultado histórico pendiente y limpia contacto como antes.

## Tests primero

Se escribió `portal-publico-accesibilidad.test.js` antes del módulo nuevo. La primera ejecución falló con `ERR_MODULE_NOT_FOUND` de `accessibility.js`; tras implementar pasaron sus tres pruebas iniciales. Las cuatro regresiones T116 se escribieron y ejecutaron antes de cambiar el producto: se corrigieron dos dobles de disponibilidad que inicialmente devolvían fecha/forma incorrecta y producían «Horario no disponible»; una vez fieles al contrato pasaron sin cambiar los controladores.

La revisión móvil encontró el foco fuera de pantalla. Antes de implementar el helper se añadió su prueba: falló por exportación `focusPublicControl` ausente. Después de implementarlo pasó. La comprobación DOM posterior mostró el botón entre **682,2 y 726,2 px** en un viewport de **740 px** de alto, con contorno visible.

| Prueba nueva | Qué comprueba |
| --- | --- |
| Restauración visible | Orden foco → cursor → desplazamiento inmediato; objetivo inexistente permitido. |
| Anuncios por estado | Carga/vacío/error/invalidación, cantidad de opciones/horarios, errores de formulario, incertidumbre y resultado pendiente; no incluye nombre/teléfono del contacto. |
| Región estable | El actualizador conserva su nodo, evita escrituras idénticas y usa texto, sin interpretar HTML. La permanencia se comprobó además en la implementación y el árbol accesible del navegador. |
| Etiquetas y ayudas | Fecha con label y `aria-invalid`; contacto con labels y referencias de ayuda/error; reloj silencioso e identidad de la acción de revisión. |
| Respuestas desordenadas | Éxito y fallo de una consulta vieja no pisan selección, ranuras ni estado de la fecha más reciente, aunque el doble ignore AbortSignal. |
| Dependencias/snapshots | Cambios de servicio, sucursal y profesional limpian fecha/ranuras/selecciones posteriores; snapshots no permiten mutar el estado interno. |
| Incertidumbre | Acciones incompatibles no hacen HTTP ni crean otro apartado; marcador tiene solo tres campos; error no reinicia, ausencia terminal sí. |
| Contacto en memoria | Vencimiento/vuelta/navegación conservan contacto, sin marcador de contacto; salida lo limpia. |

La suite relacionada incluye también los casos previos de catálogos desordenados, preparación tardía, pérdida de respuesta, recarga, contacto tras sustitución, locks y salida.

## Resultado final de comprobaciones

```text
node --test tests/portal-publico-accesibilidad.test.js tests/portal-publico-envio.test.js tests/portal-publico-apartado.test.js tests/portal-publico-base.test.js tests/portal-publico-seleccion.test.js tests/backend.test.js tests/availability.test.js

tests 99
pass 99
fail 0
cancelled 0
skipped 0
todo 0
```

**8 pruebas nuevas**: cuatro de accesibilidad y cuatro de estado; 91 regresiones relacionadas anteriores. Son pruebas Node del frontend con dobles/almacenamiento en memoria, sin API ni base real.

`npm run build`: aprobado, Vite 7.3.6, **120 módulos transformados**, salida 0. `git diff --check`: aprobado. No se declara ejecutada toda la suite del repositorio.

## Revisión real de navegador

Se utilizó `node tests/fixtures/portal-selection-server.mjs` y el portal `/reservas/qa-portal`, cuya identidad visible dice API simulada. La fixture intercepta `/publico` antes del proxy y mantiene datos ficticios en memoria. No se contactó ni modificó el backend.

- Selector completo a **320 × 740**, incluido vacío del 21/10 y error del 22/10; fecha mantiene foco. Servicio seleccionado con Tab/Espacio y avance con Tab/Enter; foco en el título del siguiente paso. Radios/labels presentes en el árbol accesible.
- Formulario: revisión inválida lleva al nombre; revisión válida mantiene su botón. Se inspeccionaron formulario y acciones en claro/oscuro, móvil y escritorio. El arreglo de desplazamiento se verificó después de implementarlo, con margen del contorno completo.
- Pérdida del escritor simulada con `lost_after`: se observó **Comprueba tu envío**, con aviso accesible y sin acción de nueva reserva; ambos temas a 320 px. **Comprobar resultado** recuperó el resultado pendiente y enfocó su título.
- Resumen a **320 × 740**, **390 × 844** y **1366 × 768**, con revisión en claro/oscuro a 390 y 1366. `scrollWidth/clientWidth`: **305/305**, **375/375** y **1351/1351** respectivamente (según presencia de scrollbar). No se observó desbordamiento horizontal.
- Demo hasta formulario ficticio; capturas claro/oscuro en móvil y escritorio. A 390 px: **375/375**, escritura calculada **16 px** y contorno visible al llegar por Tab al motivo de consulta. No se modificó la reserva local ni se declaró su formulario como API real.

Evidencia guardada: [resumen móvil oscuro](evidencias/t115-resultado-movil.png). El servidor y las pestañas temporales de revisión se cerraron al terminar.

## Límites y punto de parada

- Se verificaron DOM, árbol accesible, teclado y capturas en el navegador de revisión; **no se ejecutó un lector de pantalla real**, auditoría WCAG completa, teclado virtual móvil físico ni runner Playwright persistente. La región cumple el patrón de anuncio persistente; su lectura exacta depende de navegador/tecnología de asistencia.
- El móvil representa viewport de navegador, no un dispositivo físico. No se declara probado el zoom de iOS ni todas las combinaciones de texto ampliado.
- La demo conserva sus diferencias de negocio y capacidades ficticias. Estos ajustes no equivalen a una auditoría de accesibilidad de toda la demo o del panel.
- Sigue vigente el [límite de inicialización/CSRF con licencia bloqueada](resultado-t110-t114.md): el frontend conserva incertidumbre, pero el backend actual puede impedir reobtener CSRF tras recarga. No se altera ni se finge resuelto.
- Backend, datos, contratos, Nginx y configuración de despliegue sin cambios. No se crearon reservas reales ni se habilitó producción.
- **T115 y T116 hechas en frontend. Parada en T116; T117 y siguientes pendientes.**
