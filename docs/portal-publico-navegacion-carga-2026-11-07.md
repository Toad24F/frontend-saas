# Portal público: navegación, disponibilidad y carga

Fecha: 7 de noviembre de 2026. Cambios implementados en frontend. Skill utilizada: `redesign-existing-projects`, respetando el stack vanilla, la marca, los colores semánticos y las diferencias entre conectado y demo.

## Auditoría y plan aplicado

La pantalla mostraba todas las opciones del catálogo en una columna y dejaba Continuar al final. La selección conectada tenía seis etapas fijas; sucursal y profesional requerían interacción incluso si solo había una opción compatible. Los estados de consulta existían, pero no tenían skeleton ni una presentación específica del día sin horarios.

Se aplicó este orden: mantener el contrato público y la protección del apartado; permitir omitir selecciones únicas; limitar la altura de los catálogos con búsqueda y páginas locales; explicar los estados vacíos y de carga; adaptar el resumen y las acciones a móvil; probar el flujo y sus regresiones. No se cambiaron el backend, su base de datos, las dependencias ni la configuración de despliegue.

## Comportamiento implementado

### Selecciones y navegación

- Servicio continúa siendo una elección explícita, incluso cuando solo existe uno.
- Después de consultar el catálogo público filtrado por servicio, una única sucursal se selecciona automáticamente. Después se consulta el catálogo de ese servicio/sucursal: un único profesional se selecciona y se avanza a Fecha y hora.
- Cada etapa se evalúa independientemente. Cero opciones muestra el estado vacío; varias opciones requieren elección. Una búsqueda que deje una coincidencia nunca dispara un salto.
- Volver omite las etapas seleccionadas automáticamente y regresa a la última elección real. Los seis pasos permanecen como referencia, con un aviso de las selecciones automáticas y los nombres en el resumen.
- Cambiar una dependencia limpia las elecciones, filtros y horarios posteriores. La revisión/AbortController existentes siguen descartando consultas atrasadas, incluidos los saltos automáticos. La oferta vigente vuelve a comprobarse; no se convierte una selección antigua en autorización actual.

### Búsqueda, filtros y páginas

- Seis opciones por página. Se filtra sobre la respuesta pública completa y después se pagina; solo se renderiza la página visible. No se envían búsquedas, filtros ni páginas al backend.
- Servicios: búsqueda por nombre/descripción y duración (hasta 30, de 31 a 60, más de 60 minutos).
- Sucursales: búsqueda por nombre/dirección. Profesionales: nombre/especialidad y filtro de especialidad cuando hay varias informadas.
- Los controles de búsqueda aparecen al superar seis opciones o mientras haya un filtro local aplicado. El filtro de duración acompaña esa barra; no se agregan controles innecesarios a catálogos pequeños.
- Anterior/Siguiente y Página X de Y aparecen únicamente con más de seis coincidencias. El contador informa el intervalo y el total filtrado. Buscar, filtrar o limpiar vuelve a la primera página; una página fuera de rango se ajusta.
- Limpiar filtros se atenúa y deshabilita cuando no hay filtros efectivos. Sin coincidencias se explica cómo recuperarse.
- Paginar y filtrar conserva la elección, incluso si queda fuera de la página visible. Una línea junto a Continuar muestra su nombre. El paso siguiente sigue validando IDs presentes en el catálogo público vigente.
- Se conserva escritura, cursor y composición de texto; el cambio de página lleva el foco a los resultados. Las regiones vivas anuncian cantidades y página sin leer datos de contacto.

### Fecha y hora

- Mensaje uniforme: **No hay horarios disponibles para esta fecha**. Ayuda: **Elige otro día para consultar horarios**. No se inventa si la causa es descanso, bloqueo, ocupación, duración o reglas del negocio.
- Si todo el rango consultado carece de horarios, se añade: **No encontramos horarios disponibles en las fechas consultadas. Prueba otra fecha, sucursal o profesional**.
- Ver siguiente día disponible aparece solo si la respuesta actual contiene un día posterior con horarios. No busca fuera del rango ni promete cupos futuros. Cambiar fecha lleva el foco al selector.
- Mañana incluye inicios anteriores a las 12:00; Tarde incluye los de las 12:00 en adelante, siempre en la zona de la sucursal. Todos muestra la jornada completa. Las cantidades corresponden a los horarios de esa fecha.
- Sin resultados en una parte del día se ofrece Ver todos los horarios. Filtrar no cambia el horario elegido; su texto permanece visible aunque quede fuera del filtro.
- Al cambiar fecha se limpia el horario seleccionado y se reinicia la parte del día. Durante carga no se muestran radios antiguos. Apartar permanece deshabilitado sin una selección vigente.
- Un error de transporte presenta su mensaje y Reintentar consulta; nunca se muestra como una agenda vacía. Se preservan los conflictos y mensajes reales de la API y la comprobación del horario antes del apartado.

### Skeleton, temas y tamaños

- Hay skeleton al iniciar la sesión pública, cargar catálogos, consultar horarios y comprobar el apartado. No se añade una espera artificial ni se presentan opciones ficticias como seleccionables.
- Skeletons decorativos con `aria-hidden`, región de consulta ocupada con `aria-busy`, aviso textual de carga y controles de avance deshabilitados. La animación se detiene con `prefers-reduced-motion`.
- Colores basados en tokens del tema actual. Se corrige el azul predeterminado de Bootstrap en el botón primario deshabilitado del portal para mantener terracota atenuado.
- Resumen lateral adherente en escritorio; desplegable en tamaños pequeños, conservando su apertura durante los renders del flujo conectado. Se elimina el cambio de orden que lo colocaba antes del formulario en tableta.
- En móvil, las acciones se adhieren al borde inferior dentro de su sección y respetan la zona segura. Los campos y botones mantienen foco visible y tamaño táctil.

## Alcance conectado/demo y límites

El conectado usa exclusivamente las rutas `/publico/negocios/:slug/...`, su sesión pública y sus respuestas vigentes. No utiliza catálogos privados, autenticación del panel ni datos demo como recuperación de errores. Se conservan el apartado de cinco minutos, la revalidación, el reloj, la recuperación del mismo intento, la exclusión entre pestañas, la publicación opcional de precios y el resultado pendiente.

La demo refleja los títulos, búsqueda/filtros/páginas, selección automática de etapas únicas, resumen desplegable, acciones móviles y filtros de horarios. Se añade fecha manual y el mismo mensaje vacío. Su consulta sigue siendo síncrona, con motor local y rango ilustrativo de 45 días: no se añade un skeleton artificial ni se afirma que reproduzca el motor público, sus ofertas por sucursal o su protocolo de sesión/apartados.

La paginación reduce el DOM y la altura visible; no reduce la descarga inicial del catálogo. El frontend no puede explicar una causa precisa de falta de cupos si la respuesta no la entrega. No se incorporaron categorías, proximidad, calificaciones ni otros datos inexistentes.

## Archivos

- `src/shared/public/options.js`, `options.css`: filtros, paginación local, skeleton y partes del día compartidos con la demo.
- `src/connected/public/selection.js`, `selection-view.js`, `accessibility.js`: navegación, selección automática, estado local, presentación y foco/anuncios.
- `src/connected/public/booking.js`, `booking-view.js`, `entry.js`, `style.css`: delegación, carga inicial, skeleton del apartado, resumen y adaptación por tamaño.
- `src/demo/screens/reservas/booking.js`, `style.css`: equivalencias visuales con las limitaciones de simulación existentes.
- `tests/portal-publico-navegacion.test.js`, `tests/browser-portal-navigation.mjs`: cobertura nueva.
- Pruebas previas de selección, apartado, envío y precios: fixtures de navegación ajustadas. Las que verifican selección manual mantienen varias opciones; las de apartado/envío admiten los saltos. `tests/browser/portal.spec.js` usa los nuevos títulos y el salto de las selecciones únicas de su fixture.

## Verificación

Comandos:

```sh
npm test
npm run build
node tests/browser-portal-navigation.mjs
git diff --check
```

Resultados: 215 pruebas unitarias aprobadas, incluidas nueve nuevas; compilación correcta y `git diff --check` sin errores de espacios. Cubren combinaciones 0/1/varias opciones, regreso sin bucles, oferta que cambia, respuestas tardías, página de seis con límites 0/1/6/7/13, filtros normalizados, selección conservada, ausencia de consultas locales, skeleton y estados vacíos/error. Las pruebas existentes siguen cubriendo precios ocultos, reloj/apartado, conflictos, envío incierto, recuperación y separación por negocio.

La prueba de Edge intercepta todas las rutas públicas. Solo permite los POST de sesión simulados; no aparta ni registra citas en el backend real. Comprueba skeleton inicial y de consultas, búsquedas/filtros/páginas sin nuevas peticiones, selección fuera de página, filtro por especialidad, salto único y regreso, días vacíos, siguiente fecha conocida, fallo 503 separado del vacío, partes del día y conservación del horario seleccionado.

En demo se amplía el catálogo exclusivamente dentro de la respuesta interceptada del JSON para probar seis opciones visibles y búsqueda; se recorre servicio/sucursal, salto del profesional único y fecha vacía con avance deshabilitado. No se modifica el archivo de datos demo real.

Genera 48 capturas en `test-results/portal-navigation/` (ignorado por Git): servicios, día vacío, horarios, skeleton de horarios, skeleton de catálogo y demo de servicios a 1366, 768, 390 y 320px en claro/oscuro. Comprueba que no haya desbordamiento horizontal ni errores JavaScript. Se revisaron capturas representativas de escritorio y móvil en ambos temas. Los temas se cambian mediante el control real para verificar también el logo correspondiente.

No se ejecuta `npm run test:browser`: su preparación modifica una base de datos y queda fuera del alcance de solo lectura del backend. Su especificación se actualiza, pero no se afirma ejecución contra API real. La revisión con API simulada no certifica persistencia real, entrega de mensajes ni disponibilidad futura.
