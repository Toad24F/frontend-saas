# Administración: navegación, catálogos y disponibilidad

Fecha: 5 de noviembre de 2026. Entrega implementada en el frontend. Skill aplicada: `redesign-existing-projects`, adaptada a la identidad y arquitectura de Citalendar.

## Alcance

Administrador conectado: Profesionales, Recepcionistas, Servicios, Sucursales y Disponibilidad (Equipo y Reglas del negocio). Cambios compartidos se reflejan en la demo donde existe una vista equivalente. Se conservan permisos, validaciones, mensajes de API, rutas de escritura, selector lista/tarjetas de escritorio y tarjetas móviles. El backend se consultó exclusivamente en lectura; no se modificaron sus archivos ni su base de datos.

Este es un documento nuevo para la entrega del administrador. La documentación de superadministración no se reescribió.

## Cambios realizados

### Navegación y cuenta

- Menú del administrador: Servicios → Sucursales → Usuarios (Profesionales y Recepcionistas) → Disponibilidad.
- Usuarios es desplegable, se abre al entrar en una de sus pantallas y conserva el acceso en el cajón móvil. No se crean rutas ni permisos nuevos. Mi cuenta y la navegación inferior existente permanecen accesibles.
- La demo agrupa su acceso a Profesionales bajo Usuarios; no se inventa una pantalla demo de Recepcionistas. Los roles Profesional y Recepcionista mantienen su navegación permitida.
- Mi cuenta y Cerrar sesión usan la misma altura mínima, padding, radio y forma de hover/foco. Se retira la excepción de estilo del botón de cierre de sesión.

### Catálogos

- Los cuatro catálogos incluyen Limpiar filtros en la barra de herramientas. Sin búsqueda efectiva ni filtros seleccionados, el botón está atenuado y deshabilitado de forma nativa. Se habilita al buscar o filtrar. Limpiar restablece los filtros y el foco en la búsqueda, conservando la selección lista/tarjetas.
- Los cupos de profesionales y recepcionistas se consultan por `/profesionales/cupo` y `/recepcionistas/cupo`; el de sucursales utiliza `/sucursales/cupo`. Se muestran junto al título/descripción y pasan debajo en móvil. Son consumos globales de cuentas/sucursales activas, no el número de resultados filtrados. Sucursales utiliza exactamente el mismo componente `capacityHtml` de usuarios: etiqueta «Sucursales activas», cifras, barra de 7px y disponibilidad con la misma tipografía y separación.
- Las nuevas lecturas de cupo de usuarios validan enteros, consumos y disponibilidad. Si fallan, el catálogo sigue disponible y el encabezado indica «cupo no disponible», sin calcular ni inventar un límite. Las altas/reactivaciones conservan su lectura y validación de servidor originales. No se añade cupo a Servicios.
- Recepcionistas mantiene Desactivar/Reactivar visible y agrupa Restablecer contraseña e Inhabilitar en el menú de tres puntos compartido con el patrón de Profesionales, incluido su cierre y posicionamiento móvil.

### Acciones de precaución y formularios laterales

- Pausar atención y Desactivar usan ámbar: fondo claro/texto oscuro en tema claro y fondo profundo/texto luminoso en oscuro. Se aplica también a las acciones equivalentes de los catálogos; Activar/Reactivar conserva su tratamiento normal.
- Inhabilitar usa texto rojo en los cuatro menús y rojo de acción en las confirmaciones. El hover mantiene el color semántico con un fondo tenue y el foco es visible. No se añade ninguna línea separadora al menú, conforme a la corrección del usuario.
- Las confirmaciones existentes siguen centradas y conservan el efecto de cada operación: desactivar no equivale a inhabilitar. Recepcionistas destaca también el nombre de la cuenta en su confirmación.
- Crear y editar profesionales, servicios y sucursales, y crear recepcionistas, usan panel lateral derecho en escritorio y pantalla completa en móvil. Agregar y editar bloqueos usa el mismo patrón. Restablecer contraseña y los formularios de superadministración no cambian de presentación.
- El formulario tiene desplazamiento propio, con título y pie de Cancelar/Guardar siempre visibles. Una regla móvil previa de hoja inferior se sobreescribe únicamente para estos paneles, de modo que ocupen toda la altura.
- Al intentar salir con cambios mediante Cancelar, la X, Escape o el fondo exterior, aparece una confirmación dentro del mismo pie: Seguir editando / Descartar cambios. Se conserva lo escrito al seguir editando o ante errores de validación/API. No se apilan diálogos ni se guarda el borrador en almacenamiento del navegador. Durante un envío en curso se impide cerrar desde esos controles para evitar perder el resultado de la operación.
- La presentación se habilita con la opción explícita `drawer` de `basicForm`; los demás diálogos conservan su comportamiento. `modal` reinicia su manejador de Escape para no heredar la protección del formulario anterior.

### Inhabilitados

- Se elimina la sección inferior permanente en Profesionales, Recepcionistas, Servicios y Sucursales. El encabezado ofrece Inhabilitados junto al botón de alta.
- Abre un diálogo lateral en escritorio y a ancho completo en móvil. Al ser un diálogo nativo, conserva foco modal, Escape y prioridad sobre la navegación inferior.
- La lista se consulta al abrir, con carga, búsqueda por nombre/correo, vacío, error y Reintentar. No se mezcla con el catálogo operativo ni se sustituye por datos demo ante un fallo.
- Detalle y confirmación de restauración reutilizan el mismo diálogo, con Volver a inhabilitados y conservación de búsqueda; no se apilan modales. Se conserva la consulta de citas afectadas para los recursos que la admiten.
- Restaurar usa el contrato existente y exige que la respuesta confirme `activo=false` e `inhabilitadoEn=null`. Después actualiza el catálogo e informa que activar es otro paso. No se cancela ni reprograma ninguna cita.
- La respuesta de lista se descarta si cambió la página, actor, petición o se cerró el panel; el detalle no reabre un panel que el usuario haya cerrado. El foco de cierre vuelve al botón de apertura.
- La demo no presenta este panel: no implementa el ciclo conectado de inhabilitación/restauración.

### Disponibilidad del equipo

- Sucursales asignadas: las asignaciones con franjas persistidas conocidas se muestran marcadas y deshabilitadas, con motivo visible y `aria-describedby`. Se incluyen también las franjas inactivas, porque el contrato del servidor impide retirarlas igualmente.
- El valor de una casilla bloqueada se conserva mediante un campo oculto al enviar el formulario: guardar otras asignaciones nunca omite accidentalmente una sucursal requerida. Si un borrador previo intentaba retirarla, se restablece la asignación conocida como requerida.
- Límite explícito: la vista conectada carga horarios, pero no todas las excepciones históricas y no dispone de un campo de API «puede retirarse». Los conflictos no conocidos se siguen validando en el PUT; el formulario conserva su manejo de 409. No se presenta una casilla habilitada como garantía de ausencia de conflictos. Para anticiparlos todos sería necesaria una lectura autorizada de causas de retirada por sucursal; ese contrato no se implementó ni se inventó.
- En demo se bloquean además las asignaciones con citas activas de la simulación, de acuerdo con la validación demo existente.
- Oferta por sucursal: se sustituyen las tarjetas anidadas por selector de sucursal, resumen de sucursal/atención y cantidad de servicios ofrecidos. La tabla separa Servicio, Estado y Motivo. Las causas se traducen desde los códigos de la API; no se deduce que exista un horario disponible.
- Se conservan Selección general de servicios, Editar servicios de esta sucursal y Pausar/Activar atención. La selección de sucursal se conserva al cambiar entre pestañas y actualizar el profesional correspondiente.
- La demo muestra una oferta ilustrativa derivada de sus selecciones generales, explícitamente de consulta y sin fingir edición por sucursal.
- La ayuda de Horario semanal se mueve al pie junto a Guardar horario: «Para incluir una pausa o cambiar de sucursal, divide el día en franjas. Ejemplo: Norte de 9:00 a 13:00 y Sur de 14:00 a 18:00. Las franjas pueden ser consecutivas, pero no superponerse». Se elimina el texto anterior de huecos. En móvil, la explicación aparece encima del botón.

### Reglas del negocio: textos acordados

- **Ventana libre:** ofrece todos los horarios disponibles para que el cliente elija el que más le convenga; favorece su flexibilidad.
- **Agenda compacta conectada:** ofrece el primer horario disponible de cada día donde cabe el servicio completo; favorece citas consecutivas y ayuda a reducir tiempos sin citas. No promete eliminar huecos causados por cancelaciones, pausas, bloqueos u otras restricciones.
- **Redondeo:** nota común debajo de los modos. Los inicios se ajustan al siguiente múltiplo de cinco minutos; si una cita termina a las 10:02 y no hay margen adicional, el siguiente inicio posible es 10:05. Primero se añade el tiempo entre citas y luego se redondea.
- **Condiciones para reservar:** explica que controlan separación, anticipación y fechas ofrecidas en el portal público.
- **Tiempo entre citas:** margen para preparación, limpieza o desinfección. Ejemplo: fin a las 10:00 y margen de cinco minutos permite otro inicio desde 10:05 si hay disponibilidad; cero permite citas consecutivas.
- **Anticipación mínima:** ejemplo acordado: con 60 minutos, si son las 10:00 se podrán ofrecer horarios a partir de las 11:00. Se conserva la validación de múltiplos de cinco.
- **Días disponibles para reservar:** sustituye la etiqueta Horizonte futuro. Con 20 se permiten fechas desde hoy hasta 20 días en el futuro; con cero, únicamente hoy si existen horarios válidos. El campo y contrato HTTP siguen siendo `diasFuturos`.
- La demo conserva su intervalo configurable y advierte que su consulta de ejemplo no reproduce el motor real ni su redondeo. No se modifica la lógica de disponibilidad del backend ni el simulador para aparentar una capacidad conectada.

## Paginación local de catálogos y Bloqueos

- Servicios, Sucursales, Profesionales y Recepcionistas tienen páginas independientes de diez registros. Primero se aplican los filtros existentes sobre todos los datos cargados y después se obtiene la página. Se conserva el orden del catálogo.
- El pie muestra el intervalo y el total filtrado. Anterior, Siguiente y Página X de Y aparecen únicamente cuando hay más de diez coincidencias. El estado sin coincidencias conserva la limpieza de filtros y no muestra navegación.
- Buscar, cambiar un filtro o limpiar vuelve a la primera página. Cambiar entre lista y tarjetas, reducir el ancho o volver a renderizar conserva la página válida. Si desaparece el último registro de una página, se ajusta a la última disponible.
- Solo se renderizan los registros de la página actual. Resúmenes, cupos y cantidades de asignaciones siguen utilizando todos los datos cargados. Una alta que no coincide con los filtros conservados muestra un aviso para encontrarla al limpiarlos.
- Cambiar de página lleva el foco y desplaza al inicio de los resultados. Se mantienen tarjetas en móvil, selector lista/tarjetas en escritorio, botones táctiles y colores del tema actual.
- Bloqueos añade búsqueda por motivo, tipo, sucursal y fechas Desde/Hasta. El rango opcional incluye bloqueos que se superponen con cualquier día del intervalo, incluso si comienzan antes. Las fechas invertidas o inválidas muestran un error y no ofrecen paginación.
- La selección de profesional incluye los bloqueos de todo el equipo que le corresponden. El filtro de sucursal incluye los aplicables a todas las sucursales. Limpiar filtros restablece solo los filtros locales de Bloqueos y mantiene el profesional seleccionado; se deshabilita si no hay filtros locales.
- Bloqueos se ordena por fecha de inicio descendente y por identificador descendente en empates. Cambiar el profesional reinicia su página; editar o eliminar mantiene una página válida. Las acciones y restricciones del rol Profesional permanecen intactas.
- El patrón compartido también se aplica a los catálogos y Bloqueos de la demo que existen; Recepcionistas sigue siendo una pantalla conectada.
- Todo sucede sobre las colecciones ya cargadas. No se añaden parámetros, rutas ni contratos de paginación al backend. La descarga inicial completa y su costo permanecen; no se plantea migrar a paginación de servidor.

Archivos añadidos: `src/shared/screens/local-pagination.js`, `catalog-pagination.js`, `src/shared/screens/disponibilidad/block-directory.js` y `block-filters.js`. Se adaptan las cuatro vistas de catálogo, Disponibilidad y sus estilos. Pruebas: `tests/local-pagination.test.js` y `tests/browser-local-pagination.mjs`.

## Archivos principales

- `src/shared/app.js`, `src/shared/styles.css`, `src/shared/forms.js` y `src/shared/ui.js`: navegación Usuarios, uniformidad del menú de cuenta, colores semánticos y formularios laterales con confirmación de descarte.
- `src/shared/screens/catalog-header.js`: encabezado, resumen de cupo y estado del botón de limpieza.
- `src/connected/modules/catalogos/capacity.js`, `src/connected/modules/datos/load.js`: lectura y caché de los cupos del administrador.
- `src/shared/screens/{profesionales,servicios,sucursales}/view.js` y sus adaptadores conectados; `src/connected/screens/recepcionistas/view.js`: filtros, encabezados y menú de recepción.
- `src/connected/screens/recursos/retired-view.js`, `retired-view.css` y `src/shared/actions.js`: panel, búsqueda, navegación interna y acciones de inhabilitados.
- `src/shared/screens/disponibilidad/branch-assignments.js`, `offering.js`, `view.js`, `operational.js` y `style.css`; vistas conectada y demo de Disponibilidad: asignaciones, oferta y explicaciones.
- `tests/admin-review.test.js`, `tests/browser-admin-review.mjs`: pruebas nuevas. `tests/browser/retired-resources.spec.js`: selectores y pasos adaptados al nuevo diálogo; `tests/browser/user-quotas.spec.js`: descarte explícito del alta rechazada al cancelar.

## Contratos consultados

Se leyeron el servicio de profesionales (asignación de sucursales y oferta), las consultas de cupos y los contratos existentes de recursos inhabilitados. Para los textos se verificaron `../backend/src/disponibilidad/primeros-compactos.ts` y `candidatos-libres.ts`: primer candidato por fecha civil de sucursal, margen protegido y redondeo a cinco minutos; horizonte inclusivo hasta hoy más `diasFuturos`.

## Verificación

```sh
npm test
npm run build
node tests/browser-admin-review.mjs
node tests/browser-local-pagination.mjs
git diff --check
```

Resultados: 206 pruebas unitarias aprobadas y compilación correcta. Las pruebas previas cubren asignación bloqueada/preservación de valor, estado de filtros, validación/fallo de cupos y separación de estados/causas de oferta. La revisión de espacios no reportó errores.

La prueba de navegador usa Edge con sesión ficticia e intercepta toda la API. Solo permite dos escrituras simuladas en memoria: restauración de un servicio y modificación de asignaciones para comprobar que se conserva el ID bloqueado. No escribe en la API ni base de datos reales. Comprueba:

- Orden de navegación, apertura de Usuarios y acceso desde el cajón móvil.
- Igualdad de forma de las opciones de cuenta.
- Los cuatro filtros y sus estados de limpieza, conservación del selector de vista y tarjetas móviles.
- Cupos del encabezado y fallo de lectura sin cantidades ficticias.
- Menú de recepción y apertura del restablecimiento.
- Lista/búsqueda/detalle/retorno/restauración de inhabilitados, error 503 y recuperación, estado vacío tras restaurar.
- Casilla requerida deshabilitada, inclusión en FormData y PUT de otras asignaciones conservando el ID.
- Selector de oferta, panel visible, ayuda de horario junto a Guardar y textos definitivos de reglas.
- Ausencia de controles de administrador en el rol Profesional; demo sin inhabilitados conectados y con sus límites explícitos.
- Formularios laterales de las cuatro altas y edición de los tres recursos, incluida creación de bloqueos; altura completa, anclaje derecho y pie visible.
- Validación sin envío y protección del borrador al cancelar, cerrar con X, pulsar fuera o Escape; continuar conserva el texto y descartar cierra.
- Colores computados normal/hover de Desactivar e Inhabilitar en ambos temas, menú sin separadores y componente de cupo de sucursales idéntico al de usuarios.
- Ausencia de errores JavaScript y de desbordamiento horizontal del documento.

Se generan 102 capturas en `test-results/admin-review/` (ignorado por Git): cuatro catálogos y panel lateral a 1366, 1159, 390 y 320px en claro/oscuro; asignaciones, oferta, horario y reglas a 1366, 390 y 320px en ambos temas; se añaden altas de los cuatro catálogos a los cuatro anchos y creación de bloqueos a los tres anchos. Se revisaron visualmente capturas representativas de escritorio y móvil en los dos temas. El tema se persiste en la sesión del navegador de prueba antes de recargar cada vista para no etiquetar incorrectamente capturas.

La ampliación de paginación añade cuatro pruebas unitarias sobre límites 0/1/10/11/21, página inválida, ajuste al desaparecer el último registro, filtros de bloqueos globales, solapamiento y validación de fechas. La prueba específica de navegador verifica los cuatro catálogos con 21 registros, diez resultados sin controles, once con controles, búsqueda sin coincidencias, conservación de página lista/tarjetas/móvil, contadores globales y ajuste tras inhabilitar. En Bloqueos comprueba alcance por profesional/sucursal, fechas superpuestas, errores de rango y limpieza conservando contexto. Confirma que las acciones locales no realizan consultas de API. La única escritura de esta prueba es un retiro interceptado en memoria; no alcanza el backend. Genera 40 capturas en `test-results/local-pagination/` a 1366, 1159, 390 y 320px en ambos temas; se revisaron capturas representativas de escritorio y móvil. La demo de Servicios también tiene una comprobación con menos de diez registros.

No se ejecutó la suite `npm run test:browser`: su preparación modifica una base efímera y queda fuera del alcance de solo lectura del backend de esta tarea. Sus pasos de inhabilitados se actualizaron, pero no se afirma ejecución contra API real. La validación con API simulada no certifica entrega de correos, persistencia real ni conflictos de excepciones no cargadas. Nginx y contratos de despliegue no cambian.
