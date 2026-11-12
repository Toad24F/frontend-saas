# Agenda: carga, leyenda, citas distinguibles y paneles laterales

Fecha: 2026-11-11. Revisión base: `8ccf300`, más los cambios locales de este ajuste. El árbol estaba limpio al comenzar. Alcance solicitado: cinco mejoras de la agenda existente, en conectado y demo. No se implementan tareas de T097 en adelante ni se modifica el backend.

## Qué cambió y por qué

1. **Skeleton de carga:** las métricas y la cuadrícula mantienen su estructura mientras llega la consulta de citas. Día/semana usan columnas horarias neutras; mes conserva las 42 fechas. Los placeholders no contienen pacientes, estados ni botones de cita ficticios. Error y vacío siguen siendo estados separados; ante un fallo las métricas muestran **Sin datos**, sin continuar la animación ni inventar ceros.
2. **Leyenda superior:** los cinco colores con sus nombres se sitúan entre Hoy y Día/Semana/Mes. En pantallas intermedias ocupan otra fila; en móvil quedan antes del selector. Se conservan los colores semánticos y la leyenda no se convierte en un filtro nuevo.
3. **Métricas compactas:** se eliminan las frases auxiliares, conservando etiqueta, icono y cifra. El grupo identifica de forma accesible el día resumido. No se alteran los cálculos existentes de cada modo.
4. **Citas distinguibles:** borde definido, esquinas, referencia visible de los últimos cinco caracteres del folio (o ID si no existe folio), y folio completo en título/nombre accesible. Las citas consecutivas tienen cuatro píxeles de separación. El reparto por columnas también considera la altura mínima de 44 px, evitando que las citas breves se tapen. Hora y paciente tienen prioridad; servicio/Profesional se ocultan primero en tarjetas cortas. La referencia abreviada es una ayuda visual; el detalle conserva el identificador completo.
5. **Paneles laterales:** detalle, alta manual y confirmación de cancelación de la demo reutilizan la carcasa lateral de los otros formularios. Abren desde la derecha y ocupan toda la pantalla en móvil. Se mantiene el dialog nativo para foco, Escape y capa superior, con cabecera/acciones fijas y cuerpo desplazable. La creación y el detalle conectados conservan sus contratos, permisos, errores e historial.

Se aplicó `redesign-existing-projects` para una auditoría y evolución acotada, conservando marca, tipografías, paleta y navegación. No se utilizó `ui-ux-pro-max` ni se introdujeron bibliotecas.

## Archivos y función

| Archivo | Qué hace |
| --- | --- |
| `src/shared/screens/agenda/presentation.js` (nuevo) | Centraliza métricas compactas, leyenda, skeleton, referencia de cita y geometría visual. Separa datos no disponibles de carga y calcula columnas con la huella visual mínima sin modificar horarios del dominio. |
| `src/shared/screens/agenda/panels.js` (nuevo) | Reutiliza `modal` con las clases laterales existentes y añade un almacén de borradores solo en memoria, limpiado al expirar sesión. No sustituye el protocolo durable de citas manuales. |
| `src/shared/screens/agenda/polish.css` (nuevo) | Estilos de carga, toolbar adaptable, referencias, separación de citas y paneles. Usa los tokens actuales, animación de opacidad y entrada lateral con alternativa sin movimiento. |
| `src/shared/screens/agenda/view.js` | Aplica a la demo las métricas, leyenda y geometría compartidas, además de la referencia visible en día/semana/mes. Conserva los datos ficticios y sus controles propios. |
| `src/shared/screens/agenda/actions.js` | Convierte los diálogos propios de agenda demo en paneles y conserva el borrador manual en memoria al cerrar sin guardar. Un alta correcta elimina ese borrador. |
| `src/connected/screens/agenda/presentation.js` | Adapta resúmenes autorizados al render compartido; añade referencias y separación. Conserva fechas, zona histórica, continuaciones y causas vigentes en sus títulos/detalle. |
| `src/connected/screens/agenda/view.js` | Sustituye el párrafo de carga por skeleton, mueve la leyenda, distingue métricas fallidas y abre detalle en panel. Pasa el alcance de sesión al borrador de estado. |
| `src/connected/screens/agenda/manual-view.js` | Abre el alta en panel y conserva datos sin enviar al cerrar. Restaura contacto, notas y ficha elegida, pero exige volver a consultar disponibilidad. Un marcador durable pendiente tiene prioridad sobre el borrador en memoria. |
| `src/connected/screens/agenda/state-editor.js` | Conserva estado/motivo sin guardar al cerrar; un borrador con versión distinta o conflicto pendiente exige actualizar detalle. El guardado y la actualización explícita limpian el borrador correspondiente. |
| `tests/agenda-polish.test.js` (nuevo) | Cuatro tests Node para métricas/carga/error, leyenda y estructura de skeleton, escape de referencias y ausencia de superposición geométrica. |
| `tests/m4-browser/agenda-fixture.js` (nuevo) | Extrae la fixture HTTP anterior para reutilizarla en la suite visual nueva, sin cambiar el backend simulado ni registrar nuevos tests por importación. |
| `tests/m4-browser/agenda.spec.js` | Usa la fixture extraída y comprueba que los errores terminan el estado de carga de métricas. Conserva sus recorridos y comparación demo/conectado. |
| `tests/m4-browser/polish.spec.js` (nuevo) | Seis casos de navegador: cuatro tamaños/temas con consulta retenida, citas densas y panel; borradores al cerrar; demo y preferencia de movimiento reducido. |
| `tests/m4-agenda-presentation.test.js` | Actualiza la posición visual y skeleton esperados; cuenta botones mensuales sin confundirlos con el nuevo texto interior. Conserva las pruebas de periodo completo y citas nocturnas. |
| `README.md`, `docs/Fase-5-modulo-4/tareas.md` e informes enlazados | Enlazan el estado visual vigente sin alterar el cierre funcional de T088–T096. |

## Flujo de carga y calendario

1. Al consultar Agenda, el mismo cliente autenticado y el mismo control de generaciones solicitan el periodo/filtros. Mientras está pendiente se dibujan placeholders accesibles y neutros; no se reutiliza una cita antigua como si perteneciera al nuevo periodo.
2. La consulta exitosa sustituye el skeleton por las citas reales; una respuesta legítima vacía conserva la cuadrícula y su aviso. Un fallo retira la carga, muestra el error y deja las métricas sin cifras supuestas. El skeleton cubre la consulta de agenda, no el login ni la carga inicial de catálogos previa a montar el panel.
3. Los resúmenes siguen siendo del día seleccionado. Se eliminan únicamente las frases decorativas, sin recalcular ni inventar estados. En demo se mantienen sus datos locales; conectado conserva el resultado autorizado de API.
4. Cada cita usa las mismas horas y duración guardadas. La geometría añade margen visual y considera el tamaño mínimo al asignar columnas. Esto puede colocar citas muy breves consecutivas en columnas alternas para que no se cubran; no representa una nueva reserva ni cambia su ocupación real.
5. La etiqueta abreviada ayuda a distinguir tarjetas del mismo estado/paciente. El folio íntegro permanece disponible al enfocar/pasar el puntero y en el panel. El mes sigue mostrando hasta tres citas por celda y acceso a las restantes desde «más».

## Flujo de paneles y borradores

1. Se abre el mismo dialog nativo con las clases `form-drawer` y `agenda-drawer`: lateral de hasta 760 px en escritorio y ancho/alto de pantalla en móvil. La barra inferior queda debajo de la capa del panel; las acciones del formulario quedan fuera del área desplazable.
2. Cerrar por X o Escape devuelve el foco al control de origen. El alta mantiene la protección que impide cerrar mientras su envío está en curso. No se cambia preparación/registro/resolución ni el aislamiento por negocio/actor.
3. Si se cierra un alta sin enviar, conserva sus campos y selección de ficha **solo en memoria**, separados por actor, negocio y sesión. Al reabrir restaura el borrador, pero deshabilita horarios hasta realizar otra consulta. El borrador de demo también se conserva en memoria y se elimina tras confirmar.
4. Un envío ya pendiente sigue usando el marcador de sessionStorage de T095 con su clave y selección originales. Tiene prioridad sobre los borradores sin enviar y se resuelve por el flujo existente; la migración visual no permite iniciar otra cita para eludirlo.
5. El cambio de estado conserva su motivo y selección al cerrar, junto con la versión observada. Si al reabrir difiere la versión o había un conflicto, Guardar permanece bloqueado hasta **Actualizar detalle**; no adopta silenciosamente una versión más reciente. La expiración de sesión limpia los borradores en memoria.

Límite: los borradores sin enviar sobreviven al cierre/reapertura del panel dentro de esta página, no a una recarga. Los envíos manuales pendientes conservan la recuperación tras recarga ya existente. No se implementa autoguardado de contacto/notas en otro almacenamiento ni sincronización entre dispositivos.

## Pruebas y correcciones observadas

- Antes de añadir el módulo compartido se escribieron cuatro tests Node. El primer rojo fue `ERR_MODULE_NOT_FOUND` de `src/shared/screens/agenda/presentation.js`: un archivo fallido al cargar, sin atribuir ejecución a sus casos internos. Tras implementar, los cuatro casos aprobaron.
- La primera regresión Node completa obtuvo **241/242**: el contador anterior de mes coincidía también con la clase nueva `month-event-label`. Se acotó a la clase del botón, manteniendo la comprobación de tres citas y 42 fechas.
- La primera suite visual nueva obtuvo **4/6**. En móvil ya estaba seleccionada la vista Día y pulsarla no volvía a consultar; el test esperaba la fixture densa sin haber cambiado el periodo. Se corrigió el recorrido del test pasando por Semana y luego Día, conservando la caché existente.
- La revisión añadió primero una comprobación de error sin skeleton: **3/4** tests Node, con fallo por métricas que continuaban indicando carga. Se separó la disponibilidad de cifras del flag de carga y se pasó `model.busy` explícitamente. La suite vuelve a comprobar carga/error/vacío por separado.
- La inspección de capturas se realiza tras la animación de entrada de pantalla existente, para no medir un fotograma de fundido. Las pruebas nuevas observan rectángulos de ocho citas consecutivas de 15 minutos y verifican que ninguna pareja se superponga; la prueba Node cubre también ocho citas de cinco minutos y separación de cuatro píxeles entre citas de 30 minutos.

Se prueban 1366 y 390 px, claro/oscuro, demo/conectado, Escape/retorno de foco, anclaje derecho, acceso a Guardar en móvil y conservación de borradores. También se mantiene la regresión de alta manual, respuesta perdida, recarga, resolución y conflicto de versión de T093–T096. Las peticiones de navegador están interceptadas: no se acreditan autorización o transacciones reales de Nest/MariaDB.

## Resultados

| Comando | Resultado |
| --- | --- |
| `npm test` | **242/242 aprobados**, sin fallos ni omitidos; 1,096 s. |
| `npx playwright test --config tests/m4-playwright.config.js` | **26/26 aprobados**, sin fallos; 1,5 min. Incluye toda la regresión anterior y seis casos nuevos de presentación/paneles. |
| `npm run build` | Aprobado; 163 módulos, 1,01 s. |
| `git -c core.safecrlf=false diff --check` | Sin errores de espacios; archivos nuevos y enlaces locales comprobados adicionalmente. |

Capturas regenerables en `test-results/m4/skeleton-*.png`, `dense-*.png`, `panel-*.png`, además de la regresión anterior. Son salida local ignorada por Git. No se modifica el backend, Nginx, rutas HTTP, permisos, contratos o datos reales; no se crea commit.

Comprobación final adicional tras reforzar el fondo opaco de los paneles de demo: `npx playwright test --config tests/m4-playwright.config.js --grep 'demo conserva las mismas'` → **1/1 aprobado**, 4,1 s, incluido movimiento reducido. Revisión de ocho archivos nuevos/documentales y enlaces locales: **0 problemas**.
