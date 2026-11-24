# M5-T115–T118 · Reportes conectados

La vista de Administración consulta citas de un periodo civil inclusivo. El backend calcula los indicadores y conserva los nombres y costos históricos del corte. Así, cambiar de página o preparar la impresión mantiene las cifras y los filtros aplicados.

## Flujo

1. En **Reportes**, Administración elige fechas, sucursal, Profesional, servicio y agrupación semanal o mensual. **Generar reporte** llama a `POST /reportes/cortes`. Los selectores usan el catálogo del negocio ya cargado por el panel. La vista valida el orden de las fechas antes de consultar.
2. La vista consulta el resumen y la primera página en paralelo. Muestra ambos cuando las respuestas corresponden a la cabecera creada. Hay estados independientes para generación, fallo y un corte de cero citas. Las tasas usan los denominadores del servidor y muestran «Sin datos» con denominador cero. Los ingresos se presentan en MXN con centavos y aviso de estimación incompleta cuando hay citas sin costo histórico.
3. **Anterior** y **Siguiente** piden 100 filas del mismo ID. Cada respuesta debe conservar filtros, fechas, total y metadatos de la página. Un fallo temporal conserva la última página confirmada y permite reintentar. Un 404 retira el corte y exige generar otro. Editar los filtros invalida cualquier respuesta anterior y preparación pendiente.
4. **Preparar impresión** solicita las páginas de ese corte desde la primera. Comprueba total, tamaño de cada página, continuidad y ausencia de citas repetidas. Solo entonces publica la colección completa y habilita **Imprimir reporte**, que abre el diálogo del navegador con la opción «Guardar como PDF». La impresión usa la colección verificada y el mismo resumen. La presentación final, el aviso del menú nativo y la comprobación del PDF corresponden a T119–T121.

## Archivos

| Archivo | Función |
| --- | --- |
| [reportes.vista.js](../../src/connected/screens/reportes/reportes.vista.js) | Renderiza filtros y controles, consulta las tres rutas, controla estados y descarta respuestas de filtros o montajes previos. |
| [reportes.corte.js](../../src/connected/screens/reportes/reportes.corte.js) | Compara cabeceras y páginas. Valida y reúne las filas antes de publicarlas para impresión. |
| [reportes.resultados.js](../../src/connected/screens/reportes/reportes.resultados.js) | Muestra indicadores, tasas, evolución, desgloses y filas. Escapa el texto de nombres históricos y conserva los centavos. |
| [reportes.estilos.css](../../src/connected/screens/reportes/reportes.estilos.css) | Adapta los filtros y las tablas a los tamaños del panel y selecciona la colección completa al imprimir. |
| [pantallas.conectadas.js](../../src/connected/screens/pantallas.conectadas.js), [permisos.roles.js](../../src/connected/modules/permisos/permisos.roles.js) y [aplicacion.nucleo.js](../../src/shared/aplicacion.nucleo.js) | Registran la vista y el acceso de Administración en escritorio y en el menú móvil. |
| [reportes.corte.test.js](../../tests/reportes.corte.test.js) | Prueba páginas válidas y cortes vacíos. Rechaza páginas truncadas, totales o cabeceras incoherentes, duplicados y errores intermedios. |
| [reportes.corte.spec.js](../../tests/m4-navegador/reportes.corte.spec.js) | Recorre carga, vacío, error, indicadores, filtros, paginación, caducidad e impresión en Edge con API interceptada. Comprueba también el acceso de Recepción y la adaptación a escritorio y móvil en ambos temas. |
| [README.md](../../README.md) | Actualiza el alcance de la integración conectada. |

## Verificaciones

- `node --test tests/reportes.corte.test.js` falló primero porque el módulo todavía no existía. Tras implementarlo aprobó 3/3 casos.
- `npm test` aprobó 320/320. `npm run build` y `git diff --check` terminaron correctamente.
- Playwright en Edge aprobó 17/17 casos con API simulada. Se ejecutaron los archivos `reportes.corte` y `demo.pantallas` de la suite `tests/m4-navegador.config.js`, con Vite en el puerto alternativo 5197 durante la verificación. Se revisaron capturas a 1366 y 390 px en temas claro y oscuro.
- La prueba de impresión simula un 503 en la segunda página, comprueba que el botón queda deshabilitado y verifica las 101 filas tras reintentar. Usa una llamada de impresión interceptada y el medio de impresión emulado. La integración con MariaDB y la exportación a PDF quedan fuera de esta verificación del frontend.

## M5-T119–T121 · Presentación y verificación con PDF

**Preparar impresión** vuelve a reunir las páginas del corte. La vista publica la colección cuando terminan la validación y la carga de fuentes. El botón y el menú nativo usan la misma presentación. Si la colección aún no está preparada, falla alguna página o cambian los filtros, se imprime un aviso con instrucciones para prepararla. Si está lista, el papel muestra negocio, periodo civil, etiquetas de filtros, fecha de corte UTC, indicadores y todas las filas con su total. La tabla repite los encabezados y permite envolver nombres largos. La demostración conserva su flujo de impresión de datos ficticios.

| Archivo | Cambio |
| --- | --- |
| [reportes.vista.js](../../src/connected/screens/reportes/reportes.vista.js) | Conserva las etiquetas seleccionadas al generar el corte, renderiza la cabecera y el aviso y espera las fuentes antes de habilitar la impresión. |
| [reportes.resultados.js](../../src/connected/screens/reportes/reportes.resultados.js) | Agrega el total al pie de la tabla imprimible y conserva el total cero en el estado vacío. |
| [reportes.estilos.css](../../src/connected/screens/reportes/reportes.estilos.css) | Separa la vista de pantalla del papel, oculta controles y evita recortes con encabezados repetidos y filas que admiten texto largo. |
| [reportes.corte.spec.js](../../tests/m4-navegador/reportes.corte.spec.js) | Comprueba el aviso antes de preparar, tras un fallo y al cambiar filtros. Guarda dos PDF con el motor de Edge, uno con el aviso y otro con 101 citas. |

La [evidencia de cierre](../../../backend/docs/fase-6-modulo-5/resultados-tareas/m5-t119-t121.md) registra comandos, resultados y la revisión de los PDF. Playwright usa la API interceptada y la generación de PDF de Edge sin abrir el diálogo del sistema.
