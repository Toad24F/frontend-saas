# Corrección de agenda conectada para conservar la demo

Fecha: 2026-11-11. Alcance: corrección visual de M4-T088–T092 antes del commit. Revisión base `f3f943a` más el trabajo local del bloque. No se crean nuevas capacidades de escritura ni se toca el backend.

Evolución visual posterior autorizada: [carga, leyenda, métricas, citas y paneles](agenda-carga-estados-paneles-2026-11-11.md). Conserva la cuadrícula de esta corrección y aplica las mejoras nuevas a ambos modos; sustituye las frases de métricas y la posición anterior de la leyenda.

## Motivo y criterio de diseño

La primera implementación conectada utilizó tarjetas por fecha y omitió las métricas de la demo. Esa diferencia no era necesaria para conectarla al backend y contradecía la referencia visual solicitada. Se elimina ese diseño alternativo y se conserva el calendario conocido.

Se leyó `.agents/skills/design-taste-frontend/SKILL.md`, indicada por el usuario. Lectura del encargo: **preservar un panel existente para personal de negocios, con el lenguaje visual de Citalendar y la demo como referencia directa**. Variación 3, movimiento 2 y densidad 6: valores descriptivos del panel existente, sin añadir efectos nuevos. La propia skill excluye paneles administrativos densos de sus propuestas de landing; se aplica su protocolo de auditoría y preservación, sin introducir otro sistema visual, dependencias, fuentes ni stack. No se utiliza `ui-ux-pro-max` para esta corrección.

Auditoría previa:

- Marca: logos existentes, tipografía, acento terracota, superficies neutras en claro y grafito en oscuro.
- Arquitectura: mismas páginas y permisos de T088, barra inferior móvil, rutas y detalle autorizado de T092.
- Referencia a conservar: cuatro métricas superiores, filtros compactos con iconos, selector Día/Semana/Mes, cuadrícula por horas, tarjetas de estado, leyenda y mes de seis semanas.
- Diferencia a retirar: tarjetas extensas apiladas por fecha y formulario alto con botón de aplicar visible.
- Datos que no deben copiarse: descanso fijo 13:00–14:00, indicador de hora fijo, zona GMT−6 y controles de creación que todavía no tienen conexión.

## Archivos y función

| Archivo | Cambio y propósito |
| --- | --- |
| `src/connected/screens/agenda/presentation.js` | Nuevo módulo puro para métricas, títulos, cuadrícula por horas y mes. Reutiliza las clases CSS, iconos, colores y reparto de columnas de la demo. Divide citas nocturnas por fecha y amplía el eje horario para no perder citas tempranas o tardías. |
| `src/connected/screens/agenda/view.js` | Sustituye las tarjetas por el calendario horario, recupera métricas y filtros compactos, importa los estilos de agenda compartidos y mantiene el cliente HTTP, control de respuestas obsoletas, detalle e historial. Añade búsqueda con debounce y filtros al cambiar; Enter aplica de inmediato. |
| `src/connected/screens/agenda/style.css` | Retira el sistema visual alternativo. Conserva únicamente estilos necesarios para errores, vacío, foco y detalle/historial; la presentación principal procede de los estilos de demo. |
| `tests/m4-agenda-presentation.test.js` | Cuatro tests Node nuevos escritos antes de producción: estructura/posición/escape, continuación nocturna y eje, mes con «más» y métricas reales o pendientes de consulta. |
| `tests/m4-browser/agenda.spec.js` | Adapta las acciones de filtros a Enter/cambio de selector, comprueba la cuadrícula horaria y añade una comparación directa de estilos/geometría con la demo usando su mismo conjunto de datos y fecha. |
| `docs/Fase-5-modulo-4/tareas.md` | Enlaza la corrección manteniendo el punto de parada en T092. |
| `docs/Fase-5-modulo-4/resultados-tareas/m4-t088-t092.md` | Actualiza los archivos y el flujo vigentes, identifica los resultados iniciales como históricos y remite a este informe. |
| `README.md` | Aclara que la agenda real conserva la presentación de la demo. |

Los bloques nuevos incluyen comentarios sobre preservación visual, fechas civiles, snapshots, continuaciones nocturnas, filtros, ausencia de datos ficticios y pruebas de paridad. La demo y sus archivos no se modifican.

## Flujo visual y funcional

1. El cliente sigue consultando un periodo completo de 1, 7 o 42 fechas y aplica los permisos de sesión. No cambia el contrato del backend ni se añaden consultas de catálogos no autorizadas.
2. Las cuatro métricas usan las citas recibidas cuya fecha inicial coincide con el día seleccionado. Mientras no existe una lectura válida se muestra «… / Pendiente de consulta», evitando presentar ceros ficticios. Reflejan los filtros actuales.
3. Día y semana posicionan las citas por su hora local guardada: 96 px por hora, como en demo. Las coincidencias se distribuyen por columnas. La altura visual mínima también participa en el reparto para reducir superposiciones entre citas cortas.
4. El eje empieza con 09:00–18:00 y se amplía si hay citas fuera. Las citas que cruzan medianoche tienen segmentos en cada fecha visible; no se convierten a la zona del ordenador. La consulta conserva la selección por fecha de inicio del backend: no se añaden citas que comenzaron antes del periodo consultado.
5. El mes conserva seis semanas, hasta tres resúmenes por celda y un botón «+N citas más» que abre el día completo. No se descartan citas del resultado del servidor; solo cambia la densidad de la vista mensual.
6. Los selectores consultan al cambiar. La búsqueda consulta 300 ms después de la última entrada o al presionar Enter. Se mantienen generaciones de solicitudes, borrador y foco; una respuesta lenta no reemplaza el filtro vigente.
7. Vacío, carga y error siguen separados. Un vacío mantiene el calendario para conservar la referencia temporal. El detalle y las páginas de historial mantienen su contrato, estados y superficie opaca.

## Diferencias necesarias frente a la demo

El diseño del calendario es el mismo; contenido y acciones responden al contrato real:

- No hay descanso fijo, marcador de hora ficticio ni un GMT−6 común. La zona real aparece en la leyenda cuando es única y en los títulos accesibles/detalle de cada cita; con varias se indica «Zona local de cada cita».
- No se muestra «Nueva cita», ya que la conexión del alta empieza en T093. El enlace al portal solo aparece cuando existe el identificador real del negocio.
- La navegación conserva el rol real y la demo conserva su navegación de ejemplo.
- Los errores, la carga y los datos pueden producir contenidos distintos; eso no cambia el sistema visual.

## Pruebas y evidencia

Se escribió primero `tests/m4-agenda-presentation.test.js` y se ejecutó: rojo por `ERR_MODULE_NOT_FOUND` de `presentation.js`, sin ejecución de los cuatro casos internos. Después de implementar el módulo, **4/4** aprobados. Cubren clases de cuadrícula de demo y posición a las 10:00, escape de HTML, ausencia de acciones ficticias, dos segmentos nocturnos, eje 00:00–24:00, mes de 42 fechas con acceso a las restantes y métricas sin números supuestos.

La regresión de ocho casos M4 pasó después de adaptar las acciones de búsqueda. La prueba adicional de paridad obtuvo primero **1/1 aprobado**, 13,5 s: carga los datos de la demo en una API interceptada, fija la misma fecha en el navegador de pruebas y compara ambos modos a 1366 y 390 px, claro y oscuro. Comprueba familia/tamaño/peso tipográfico, padding, radios, colores y columnas de cabecera, métricas, panel, toolbar, filtros, selector de vista, cabecera horaria y tarjeta confirmada. También compara los cuatro números de métricas y el número de citas visibles. Se amplió para comparar además el mes, sus 42 fechas, las tarjetas mensuales y la apertura del día desde «más»; la prueba de flujo comprueba también la búsqueda automática sin Enter. No es una afirmación de igualdad píxel a píxel de toda la pantalla: navegación, acciones y anotaciones tienen las diferencias de contrato descritas arriba.

Se inspeccionaron capturas comparativas de demo/conectado en escritorio y móvil, ambos temas. Las capturas regenerables quedan en `test-results/m4/paridad-*.png`, ignoradas por Git. Ninguna fixture se incorpora a producción ni se consulta la base real.

## Resultados vigentes

| Comando | Resultado |
| --- | --- |
| `npm test` | **228/228 aprobados**, 0 fallos, 0 omitidos; 1,229 s. |
| `npx playwright test --config tests/m4-playwright.config.js` | **9/9 aprobados**, 0 fallos; 45,2 s. Incluye la comparación directa con demo y la búsqueda automática. |
| `npm run build` | Aprobado, 156 módulos, 1,28 s. |
| `git -c core.safecrlf=false diff --check` | Sin errores de espacios. Archivos nuevos y enlaces locales del seguimiento/informes comprobados adicionalmente: 0 problemas. |

No se ejecuta el setup general de navegador con MariaDB ni se acredita integración real de T104. No se modifican contratos, tablas, rutas de backend o Nginx. T093 y posteriores siguen pendientes. No se crea commit en este ajuste: queda preparado para revisión previa al commit.
