# Auditoría y propuesta de mejora de la interfaz del administrador de negocio

**Fecha:** 11 de octubre de 2026  
**Alcance:** versión conectada, rol `admin_negocio`. Revisión del código de la interfaz y de sus flujos; no es una prueba visual con sesión iniciada ni una medición con usuarios.  
**Objetivo:** hacer más rápida y clara la administración cotidiana sin cambiar permisos, reglas de negocio, rutas de la API ni operaciones disponibles.

## Resumen ejecutivo

La interfaz ya tiene una base sólida: identidad visual propia (DM Sans, Manrope, acento terracota y verdes), modo claro y oscuro, navegación por rol, adaptación móvil, foco visible, formularios con validación y confirmaciones para bajas. No conviene rehacerla. La mejora de mayor impacto está en **ordenar la información y las acciones**: que cada pantalla diga qué hay, qué falta y cuál es el siguiente paso; que las acciones frecuentes destaquen y las delicadas tengan menos peso visual; y que los controles no disponibles no parezcan operativos.

El administrador conectado puede gestionar profesionales, recepcionistas, servicios, sucursales, disponibilidad y su cuenta. Agenda, clientes, reportes y portal siguen fuera del alcance conectado actual. La propuesta respeta esa frontera y evita presentar la demo como una función real.

## Hallazgos de la auditoría

| Prioridad | Hallazgo y evidencia | Efecto en el uso | Propuesta |
| --- | --- | --- | --- |
| Alta | **Catálogos sin estado vacío orientador.** Profesionales, servicios y sucursales generan la cuadrícula aun cuando la lista está vacía ([profesionales](../src/shared/screens/profesionales/view.js), [servicios](../src/shared/screens/servicios/view.js), [sucursales](../src/shared/screens/sucursales/view.js)). Recepcionistas sí muestra un estado vacío. | Una página recién configurada parece incompleta y no explica la secuencia de alta. | Estados vacíos específicos con una sola acción principal: crear sucursal, crear servicio o crear profesional, según el caso. Explicar las dependencias reales sin bloquear altas que la API permite. |
| Alta | **Controles de modo de agenda con apariencia activa en la versión conectada.** Disponibilidad muestra “Ventana libre” y “Agenda compacta”, aunque la propia vista dice que aún no forman parte de la entrega y el manejador responde con un aviso ([vista](../src/shared/screens/disponibilidad/view.js), [acciones](../src/shared/actions.js)). | Se invita a intentar una configuración que no se puede guardar. | En el panel conectado, sustituir esos controles por una nota breve de disponibilidad futura o retirarlos de esta vista. Mantenerlos en la demo. Dar protagonismo al horario, bloqueos, excepciones y oferta, que sí funcionan. |
| Alta | **Densidad y jerarquía de acciones poco claras.** Las tarjetas de profesionales reúnen disponibilidad, edición, desactivación/reactivación y eliminación; las de servicios y sucursales también colocan acciones de estado y eliminación junto a datos operativos ([profesionales](../src/connected/screens/profesionales/view.js), [servicios](../src/connected/screens/servicios/view.js), [sucursales](../src/shared/screens/sucursales/view.js)). | Cuesta distinguir la acción cotidiana de una baja irreversible, especialmente en móvil. | Una acción principal visible por entidad; editar y ver detalle como secundarias; desactivar/reactivar y eliminar en un menú de acciones claramente etiquetado. Mantener las confirmaciones actuales y explicar su efecto antes de ejecutar. |
| Media | **Presentación uniforme para información de distinta importancia.** Profesionales y servicios usan una cuadrícula fija de tres tarjetas; sucursales reserva 150 px por tarjeta para un mapa decorativo que no representa su ubicación real ([estilos generales](../src/shared/styles.css), [estilo de sucursales](../src/shared/screens/sucursales/style.css)). | Al crecer el catálogo, baja la velocidad de exploración; dirección, estado, horario y asignaciones quedan subordinados a decoración. | Usar una vista de lista compacta para catálogos largos y conservar tarjetas en grupos pequeños. En sucursales, pasar dirección, estado y cupo al primer plano; dejar la ilustración como acento menor y rotularla como ilustración. |
| Media | **Disponibilidad concentra demasiadas tareas en una sola página.** Horario semanal, bloqueos, oferta por sucursal, excepciones y proyección se apilan verticalmente ([vista compartida](../src/shared/screens/disponibilidad/view.js), [vista conectada](../src/connected/screens/disponibilidad/view.js)). | Se pierde el contexto del profesional seleccionado y hay mucho desplazamiento para llegar a la tarea buscada. | Conservar la misma ruta y operaciones, pero dividir visualmente la página en secciones navegables: Horario, Oferta, Excepciones y Proyección. Mantener visible el profesional activo y un resumen breve de su estado. |
| Media | **El espacio conectado se identifica de forma genérica.** La carga de datos del administrador asigna el nombre “Mi negocio” y el encabezado usa “Mi espacio” ([carga](../src/connected/modules/datos/load.js), [shell](../src/shared/app.js)). | En operaciones que afectan sucursales y personal, falta contexto visible sobre el negocio activo. | Mostrar nombre real del negocio si la API lo entrega; hasta entonces, usar una etiqueta honesta y estable como “Administración del negocio” y evitar que el selector sugiera cambio de negocio para este rol. |
| Media | **Texto auxiliar pequeño y varios grises claros.** Hay metadatos de 11–12 px y textos de ayuda con colores pálidos en tarjetas, formularios y sucursales ([estilos compartidos](../src/shared/styles.css), [sucursales](../src/shared/screens/sucursales/style.css), [servicios](../src/shared/screens/servicios/style.css)). | Los datos secundarios —que en un panel administrativo suelen ser necesarios— pierden legibilidad. | Definir dos niveles de texto auxiliar, mínimo 12–13 px según contexto, revisar contraste en ambos temas y reservar 11 px para etiquetas muy breves no esenciales. |
| Baja | **La respuesta de guardado existe, pero el estado de espera es desigual.** Los formularios comunes deshabilitan Guardar sin cambiar su etiqueta, mientras algunas acciones críticas muestran “Procesando…” ([formularios](../src/shared/forms.js), [acciones de profesionales](../src/connected/screens/profesionales/actions.js)). | En conexiones lentas, no siempre es evidente que la solicitud sigue en curso. | Unificar “Guardando…”, “Procesando…” y actualización de lista, con estado visible en el control y mensaje final consistente. Mantener la protección contra envíos repetidos. |

## Dirección visual propuesta

**Una interfaz de trabajo serena y precisa.** Conservar terracota como acento de acción, verdes como base y las tipografías actuales. Reducir la competencia entre bordes, sombras, ilustraciones y botones. Una superficie debe agrupar una tarea o un conjunto de datos relacionado; las listas de operación pueden usar separación y líneas sutiles en vez de tarjetas para cada registro.

- **Jerarquía:** título de página, descripción útil de una línea, acción principal y después datos. El estado activo/inactivo debe leerse sin depender solo del color.
- **Densidad adaptable:** tarjetas para pocos registros; lista o tabla para muchos, con búsqueda local y filtros de estado cuando el volumen lo justifique. No alterar la consulta ni los permisos del backend.
- **Acciones:** crear y guardar con el acento principal; editar/ver en estilo neutro; desactivar y eliminar en acciones secundarias con confirmación. “Eliminar” debe seguir explicando las restricciones de historial que aplica la API.
- **Tipografía y color:** conservar DM Sans y Manrope; aumentar legibilidad de metadatos, alinear cifras con números tabulares en cupos y precios, y comprobar contraste real en claro y oscuro.
- **Movimiento:** mantener las transiciones existentes donde ayuden a reconocer un cambio de estado; evitar que la animación retrase la lectura de tablas o formularios. Respetar `prefers-reduced-motion`.

## Propuesta por pantalla

### 1. Inicio de administración y navegación

Mantener las seis secciones autorizadas y “Mi cuenta”. En el encabezado, mostrar el contexto del negocio y la sección actual. Evitar añadir “Resumen” o “Agenda” conectados hasta que tengan datos y operaciones reales. El enlace “Ver demo” debe permanecer identificado como comparación. En móvil, conservar la barra inferior y el acceso “Más”, comprobando que Disponibilidad y Recepcionistas se encuentren sin recorrer una lista extensa.

### 2. Profesionales

Encabezar con total de activos e inactivos y una acción “Nuevo profesional”. Para cada persona, mostrar primero nombre, especialidad, estado, sucursales y cantidad de servicios. “Ver disponibilidad” es la acción principal de trabajo; “Editar” debe tener etiqueta visible y no depender de un icono. Desactivar/reactivar y eliminar pasan a un menú de acciones. En el formulario, agrupar identidad, acceso, servicios y sucursales, indicando que guardar la cuenta y las asignaciones son pasos de backend separados; si falla el segundo, explicar qué quedó guardado y cómo reintentar.

### 3. Servicios

Priorizar nombre, duración, precio informativo, estado global y número de profesionales. Separar visualmente “Desactivar” de “Eliminar”; la baja no debe parecer equivalente a retirar temporalmente el servicio de la oferta. Si no hay servicios, guiar al alta del primero. Mantener el aviso de que el precio es informativo y no implica cobro en línea.

### 4. Sucursales

Dar más espacio al nombre, dirección, teléfono, estado y cupo de sucursales activas; reducir el mapa ilustrativo. Mostrar “X de Y activas” cerca del botón de alta. Cuando el cupo esté completo, explicar que desactivar una sucursal libera lugar y que reactivar requiere cupo. Las acciones de editar, desactivar/reactivar y eliminar deben conservar sus significados y sus posibles errores del servidor.

### 5. Recepcionistas

La tabla actual es una buena base. Mantener el resumen de cuentas, convertir el estado en una etiqueta semántica consistente y agrupar las acciones por fila para facilitar el escaneo. La frase sobre Agenda y Clientes debe quedar como nota discreta de alcance, sin sugerir que la recepcionista ya puede operar esas secciones. Conservar el estado vacío y añadir la acción de alta dentro de él.

### 6. Disponibilidad

Poner primero el selector de profesional y un resumen de sus sucursales y atención. Dentro de la misma página, usar navegación interna a Horario semanal, Oferta por sucursal, Excepciones y Proyección. Cada bloque debe explicar qué modifica: el horario define franjas; la oferta explica por qué un servicio se ofrece o no; la proyección muestra tramos, no citas reservables. Los mensajes de carga y error ya presentes deben mantener su reintento. En móvil, priorizar las tarjetas de día existentes y evitar que una tabla ancha sea la única forma de revisar el horario.

## Orden de ejecución sugerido

1. **Claridad funcional:** ocultar o marcar como no disponibles los modos de agenda en conectado; revisar textos de demo y contexto del negocio.
2. **Estados y acciones:** añadir estados vacíos a los tres catálogos; ordenar acciones y conservar confirmaciones y mensajes del backend.
3. **Estructura:** simplificar tarjetas, mejorar densidad de listas y reorganizar Disponibilidad dentro de su ruta actual.
4. **Pulido:** ajustar tamaños, contraste, cifras, estados de espera y respuesta móvil en temas claro y oscuro.

## Criterios para aceptar el rediseño

- El administrador sigue pudiendo crear, consultar, editar y cambiar estado de profesionales, servicios y sucursales; gestionar recepcionistas, horarios, bloqueos, oferta, excepciones y cuenta según los permisos actuales.
- Ninguna acción de la demo aparece como operación conectada disponible sin respaldo de la API.
- Desde un catálogo vacío se entiende qué crear y existe una acción directa para hacerlo.
- “Desactivar” y “Eliminar” tienen jerarquía y consecuencias claramente distintas; las confirmaciones y respuestas de conflicto siguen visibles.
- Con teclado se identifican navegación, foco, estado seleccionado, errores y confirmaciones. En móvil, los controles frecuentes tienen área táctil cómoda y no quedan cubiertos por la barra inferior.
- La revisión visual cubre escritorio y móvil en temas claro y oscuro, con datos vacíos, abundantes, inactivos, carga y error. La verificación funcional recorre cada operación conectada antes de dar por terminada una futura implementación.

## Límites de esta revisión

Esta auditoría se basa en el repositorio, el contrato documentado y los estados implementados. No se inició sesión en una instancia del backend ni se observaron tiempos de tarea de usuarios. Por eso las observaciones sobre densidad, jerarquía y legibilidad son propuestas de diseño fundamentadas en la implementación; conviene validarlas con una revisión visual y un recorrido real antes de ejecutar cambios.
