# Agenda: utilidad, caché y densidad

Fecha: 2026-11-12. Implementación del plan acordado con el usuario después de la auditoría de agenda. Solo frontend; backend consultado en modo de lectura. Se aplican los criterios de `redesign-existing-projects`, conservando marca Citalendar, stack vanilla, temas y colores semánticos.

## Ajuste posterior: calendario completo sin scroll vertical interno

Por petición del usuario, se retira el límite de altura de la cuadrícula: Día y Semana se dibujan con todo su alto y el desplazamiento vertical pertenece a la página. Se conserva el desplazamiento horizontal necesario para los siete días o las citas simultáneas legibles. Afecta conectado/demo, escritorio/móvil y ambos temas.

El salto desde una agrupación desplaza ahora la página hasta sus citas, conserva foco/resaltado y deja margen superior. Volver a Semana restaura también la posición vertical de la página; los refrescos conservan esa posición. El encabezado del calendario deja de ser fijo dentro de una ventana de altura limitada. Se ajustan `utility.css`, `navigation.js`, la preservación de posición en `connected/screens/agenda/view.js` y la prueba visual de utilidad. Esta prueba comprueba que el calendario no tenga desbordamiento vertical interno y que la cita de destino quede dentro del área visible, por encima de la navegación móvil.

Verificación de este ajuste: 268/268 pruebas unitarias, compilación y `diff --check` aprobados; 9/9 casos de navegador enfocados en utilidad y conservación del desplazamiento aprobados. Se revisaron capturas del calendario completo en escritorio y móvil. Una comprobación visual intermedia midió el ancho de la demo durante su animación de entrada; se trasladó la medición después del fin de esa animación y la ejecución final pasó en ambos temas y tamaños. Los resultados completos de 67 casos más abajo corresponden a la implementación previa a este ajuste puntual.

## Plan ejecutado

1. Escribir pruebas de caché, atención efectiva, hora actual y agrupación antes de implementar sus reglas.
2. Sustituir las cuatro tarjetas de Agenda por un resumen de resultados filtrados; ordenar cabecera, filtros, búsqueda y actualización manual.
3. Conectar la lectura autorizada de atención para Administración, Recepción y Profesional propio, sin modificar permisos en el frontend.
4. Resolver saturación semanal con agrupaciones que abren Día, desplazan al tramo y resaltan las citas originales; compartir presentación con la demo.
5. Comprobar regresiones, escritorio/móvil y ambos temas; registrar límites reales.

## Comportamiento implementado

- Subtítulo: «Consulta y da seguimiento a las citas de tu negocio». Se elimina la nota inferior redundante sobre la zona guardada de cada cita. Se conserva la referencia de zona cuando existe y la indicación explícita de datos ficticios de la demo.
- Agenda deja de mostrar las cuatro tarjetas grandes. Su resumen lineal cuenta citas, pendientes y citas con afectaciones **del periodo y filtros actuales**. La pantalla Resumen conserva sus tarjetas existentes.
- Botón Actualizar entre leyenda y selector de vista, con estado ocupado. Conserva fecha, filtros y desplazamiento. En móvil se presenta como icono con nombre accesible. La demo actualiza su representación local y lo anuncia; no consulta la API.
- Filtros con altura, borde, superficie y alineación comunes; buscador con lupa integrada, foco visible y acción para limpiar. En móvil, distribución compacta de filtros y cabecera, sin desbordar el documento.
- Leyenda: aumento de 1 px respecto de sus reglas previas (11 px escritorio, 12 px móvil) y texto con mayor contraste. Se conservan los cinco colores de estado.
- «Solo citas afectadas» filtra por causas recibidas. Las tarjetas conservan su estado y muestran una advertencia independiente; también se muestra en Mes y en las agrupaciones. Las causas siguen en el nombre accesible/título y el detalle conectado conserva la lista completa.

## Caché y actualización

`createAgendaCache` mantiene como máximo seis snapshots en memoria de esta pestaña, con reutilización durante 30 segundos. No persiste pacientes en localStorage ni sessionStorage.

- Solicita primero un periodo completo mediante el cliente validado de `/citas`, dentro del alcance que autoriza el servidor al rol y sesión actuales.
- Reutiliza ese periodo para sucursal, profesional, estado, búsqueda y filtro de afectaciones; un periodo mayor completo también sirve para uno menor. La proyección local entra de forma síncrona al store: no sustituye la cuadrícula por skeleton.
- La búsqueda local usa coincidencia literal por nombre, sin distinguir mayúsculas ni marcas diacríticas; `%` y `_` son texto literal. La demo aplica la misma normalización.
- Si el servidor rechaza el periodo por el límite de 1.000 citas y hay filtros de servidor, solicita la consulta acotada. Esa respuesta se guarda **solo para esa consulta exacta**, nunca como periodo completo. No se truncan resultados.
- Comparte lecturas base simultáneas y descarta la caché al cambiar/cerrar/expirar sesión. Las generaciones impiden que respuestas antiguas repueblen la caché o sustituyan la consulta vigente. Las denegaciones también eliminan snapshots, incluido el respaldo acotado.
- Alta, cambio de horario y cambio de estado conservan sus relecturas confirmadas y limpian la caché antes de recargar.
- Se mantienen los refrescos de 30 segundos con la pestaña visible y al recuperar foco. Actualizar fuerza lectura remota. Un resultado idéntico no reconstruye el calendario. Un error técnico del mismo periodo conserva su última consulta con aviso; una denegación no la conserva. Una recuperación retira el aviso aunque los datos sean iguales.

La caché no certifica ausencia de cambios externos. El backend no proporciona aquí una versión global de agenda ni ETag; siguen siendo necesarias las comprobaciones periódicas y la validación de versión antes de escribir. La normalización SQL exacta depende de la colación del despliegue: las pruebas verifican la búsqueda local descrita, no equivalencia de todas las reglas Unicode con una base real.

## Atención efectiva y hora actual

- Se utiliza el GET existente `/profesionales/:id/atencion?desde=…&hasta=…`, tras revisar la ampliación de lectura para Recepción del backend. No se abre la configuración de horarios ni se añaden acciones de edición.
- La trama «Sin atención» aparece en Día/Semana al seleccionar profesional y sucursal. Para Profesional se usa su propio ID. La respuesta contiene todas sus sedes y se selecciona la sucursal en el frontend.
- Se valida perfil, periodo, intervalos, extremos UTC y omisiones antes de dibujar. Se calcula el complemento de los intervalos efectivos dentro del eje visible. Las citas existentes se dibujan encima.
- Una respuesta fallida muestra aviso y reintento, sin sombreado supuesto. Una fecha/sucursal con `omisiones` tampoco se sombrea como cierre confirmado. La respuesta vacía válida sí representa ausencia de atención en el periodo.
- La etiqueta no distingue descanso, bloqueo o ausencia de jornada. Atención efectiva **no equivale a disponibilidad de reserva**: no descuenta citas ni apartados.
- El marcador de hora usa el reloj real, actualiza su posición cada minuto y al recuperar foco sin llamar a la API. Solo aparece en la columna correspondiente a hoy y dentro del eje horario. Con varias zonas o sin una zona conocida no se dibuja una única línea ambigua. Mes destaca la fecha, sin línea.
- La demo calcula intervalos y afectaciones con sus franjas, descansos y bloqueos ficticios. Se retiran el descanso universal de 13–14 y el marcador fijo de las 11:20; conserva la creación desde celdas horarias. Su fecha inicial sigue siendo la fecha de demostración, por lo que no se inventa una línea de «ahora» sobre una fecha pasada.

## Saturación y navegación

- La asignación permite que una cita aproveche columnas libres después de un pico, respetando la huella visual mínima y las coincidencias.
- En Semana, cuando un componente conectado de citas superpuestas requiere columnas de menos de 105 px, se reemplaza por una agrupación con rango, cantidad y afectaciones. Se conserva cada ID una sola vez. Las citas aisladas de otros tramos mantienen su tarjeta. Un encadenamiento continuo puede producir un grupo largo; no se recortan sus citas.
- El umbral depende del ancho disponible, con observación de cambios de tamaño. La cuadrícula semanal conserva desplazamiento horizontal; en Día el ancho mínimo reserva 120 px por columna simultánea para evitar nuevas barras ilegibles.
- Pulsar el grupo cambia a Día de su fecha, conserva filtros/búsqueda, desplaza la página al tramo dejando margen superior, enfoca su primera cita y resalta los IDs del grupo durante unos 2,2 segundos. Se anuncia la cantidad mediante una región accesible. No abre panel lateral ni detalle automáticamente.
- El resaltado conserva colores de estado, evita parpadeos y usa borde/halo estático cuando se solicita movimiento reducido.
- «Volver a la semana» recupera fecha, desplazamiento y foco del grupo; si cambió el grupo, devuelve el foco al selector Semana. Mes conserva sus 42 celdas y tres citas por celda con acceso al día completo.

## Archivos afectados

| Área | Archivos |
| --- | --- |
| Caché, store y contrato de atención | `src/connected/modules/agenda/{cache,store,attention}.js` |
| Integración conectada y compatibilidad de presentación | `src/connected/screens/agenda/{view,presentation}.js` |
| Presentación y navegación compartidas | `src/shared/screens/agenda/{chrome,frame,month,navigation,timeline,utility,presentation,view}.js`, `utility.css` |
| Conexión de eventos y símbolo de refresco | `src/shared/app.js`, `src/shared/icons.js` |
| Atención y causas ficticias | `src/demo/agenda-attention.js` |
| Pruebas | `tests/agenda-utility.test.js`, `tests/m4-agenda-presentation.test.js`, `tests/m4-browser/{agenda-utility.spec,agenda.spec,agenda-fixture,polish.spec}.js` |
| Documentación | Este informe, README y notas visuales previas con enlace de actualización |

## Comprobación y límites

Primero se ejecutó `tests/agenda-utility.test.js` sin los módulos nuevos y falló por módulo ausente. Después pasaron los seis casos iniciales. Se añadieron antes de sus correcciones pruebas que fallaron por expansión insuficiente de columnas, foco oculto bajo cabecera y conservación indebida de caché cuando el respaldo acotado era denegado. El desarrollo conserva esa secuencia de pruebas y corrección; no se atribuye un ciclo rojo/verde independiente a cada ajuste de CSS.

La primera ejecución de navegador dentro del entorno restringido no avanzó y se interrumpió. Las ejecuciones posteriores usan Edge/Vite locales con API interceptada, sin iniciar ni modificar backend o base de datos. Se corrigió además un extremo UTC invertido en la fixture nueva de atención. Las pruebas anteriores que exigían petición HTTP por búsqueda, tarjetas en Agenda o folio siempre visible se actualizaron al comportamiento acordado.

| Comprobación | Resultado real |
| --- | --- |
| `npm test` | 268/268 aprobadas; repetición final aprobada tras el último ajuste de texto. Incluye diez pruebas nuevas de utilidad. |
| `node node_modules/@playwright/test/cli.js test --config tests/m4-playwright.config.js` | 67/67 aprobadas en ejecución completa (2,0 min). Incluye ocho casos nuevos de caché, atención, navegación y visuales. |
| `… agenda-utility.spec.js polish.spec.js` | 14/14 aprobadas después de ajustar el encabezado diario para que siga visible en móvil con muchas columnas simultáneas. La prueba de esa posición falló antes del ajuste. |
| `… agenda-utility.spec.js --grep "revisión visual"` | 4/4 aprobadas en la revisión final; capturas de atención añadidas en los dos modos, ambos temas y tamaños. Se espera el fin de la animación de entrada de la demo para capturar su apariencia estable. |
| `npm run build` | Aprobado; repetido al final, 184 módulos transformados. |
| `git -c core.safecrlf=false diff --check` | Aprobado, sin errores de espacios. |
| Inspección visual | Capturas abiertas y revisadas de conectado/demo, 1366 y 390 px, claro/oscuro; incluye agrupación, resaltado, controles, cuadrícula y trama de atención. Las pruebas también comprueban ausencia de desbordamiento del documento. |

Una ejecución completa intermedia dio 62/65: fallaron dos casos de directorio/foco que pasaron al reejecutarse sin cambiar su implementación, y una expectativa anterior de folio siempre visible en Semana. Se actualizó esa expectativa porque en tarjetas estrechas ahora se priorizan hora/paciente y el folio permanece en el nombre accesible. La ejecución completa posterior de 67 casos pasó, además de las comprobaciones focales finales indicadas arriba. No se presentan las reejecuciones focales como otra ejecución completa.

Ejemplos de evidencia local generada en `test-results/m4/` (salida de pruebas, no recursos del producto):

- `utilidad-semana-1366-{light,dark}.png`: agrupación semanal.
- `utilidad-dia-390-{light,dark}.png`: salto al día, encabezado visible y resaltado.
- `utilidad-atencion-{1366,390}-{light,dark}.png`: atención conectada con el contrato interceptado.
- `utilidad-demo-{1366,390}-{light,dark}.png` y `utilidad-atencion-demo-…`: paridad y atención ficticia.

La evidencia HTTP de navegador es simulada. No acredita despliegue ni prueba de integración con la API real. Recepción sigue obteniendo opciones de profesionales/sucursales de las citas autorizadas ya consultadas: estos cambios GET no habilitan un catálogo nuevo para elegir profesionales sin citas. No se cambió backend, base de datos, dependencias, Nginx ni configuración de publicación.
