# Resultado de traducción de Agenda

Fecha: 2026-11-18

## Alcance

Se aplicó la convención `agenda.responsabilidad.extensión` a la estructura compartida, la pantalla conectada, los módulos de integración y las dos entradas de demo. Se migraron juntos los imports, exports, nombres locales, selectores y eventos de los calendarios diario, semanal y mensual, los filtros, el refresco, los paneles y el menú de estados. También se sincronizaron el enrutado, los estilos de tema y movimiento y los consumidores de Clientes y Resumen.

| Carpeta | Archivo anterior → responsabilidad de `agenda.*` |
| --- | --- |
| `src/shared/screens/agenda` | `view` → `vista`, `frame` → `estructura`, `chrome` → `controles`, `panels` → `paneles`, `style` → `estilos` |
| `src/shared/screens/agenda` | `navigation` → `navegacion`, `calendar` → `calendario`, `month` → `mes`, `view-preference` → `preferencia-vista` |
| `src/shared/screens/agenda` | `timeline` → `linea-tiempo`, `table` → `tabla`, `presentation` → `presentacion`, `polish` → `refinamientos`, `utility` → `utilidades` |
| `src/shared/screens/agenda` | `actions` → `acciones`, `filters` → `filtros`, `state-menu` → `menu-estado` |
| `src/connected/modules/agenda` | `attention` → `atencion`, `cache` → `cache`, `calendar` → `calendario`, `errors` → `errores`, `live-refresh` → `refresco-vivo`, `client` → `client`, `store` → `store` |
| `src/connected/modules/agenda` | `manual-contract` → `contrato-manual`, `manual-operation` → `operacion-manual`, `schedule-change` → `cambio-horario`, `versioned-mutation` → `mutacion-versionada` |
| `src/connected/screens/agenda` | `view` → `vista`, `live` → `actualizacion-viva`, `manual-view` → `vista-manual`, `presentation` → `presentacion`, `quick-state` → `estado-rapido`, `schedule-editor` → `editor-horario`, `state-editor` → `editor-estado`, `style` → `estilos` |
| `src/demo` | `agenda-attention.js` → `agenda.atencion.js`, `agenda-quick-state.js` → `agenda.estado-rapido.js` |
| `tests` y `tests/m4-browser` | Pruebas de Agenda con prefijo `agenda.` y respuestas simuladas compartidas en `agenda.respuestas-simuladas.js` |

## Contratos y compatibilidad

Se contrastaron el controlador de citas, las entradas de consulta, cambios de estado y horario y la consulta de atención. Se conservaron `/admin/agenda`, `?demo=1`, las rutas HTTP de citas, atención y disponibilidad, los roles y estados del servidor, y campos como `sucursalId`, `personalId`, `fechaLocal`, `horaInicio` y `version`. La demo conserva el esquema compartido de datos ficticios. Las claves `cita-agenda-view:demo`, `cita-agenda-view:connected` y `citalendar:manual:v1:<negocioId>:<actorId>`, sus valores y el formato de marcadores existentes mantienen su compatibilidad.

Se conservan las convenciones técnicas `client`, `store`, `payload`, `render` y `handle`, las API de navegador, las clases de Bootstrap y los nombres de las interfaces generales de enrutado, tema y datos que son responsabilidad de otros conjuntos. La distribución genérica de columnas en `src/shared/calendar-layout.js` corresponde al apartado 14.

Se reprodujeron fallos en cuatro archivos de pruebas en una copia del commit previo. Las pruebas de atención y orden de columnas ahora fijan el reloj en un lunes porque su API simulada devuelve citas en el primer día del periodo. La prueba móvil de escala comprueba el ancho vigente de 310 px y que la página no desborde. La prueba del calendario diario acota el selector a la cuadrícula para distinguirla de su cabecera fija.

## Verificación

- `npm test`: 295 pruebas aprobadas.
- `npm run build`: compilación correcta con 190 módulos transformados.
- Playwright M4: 122 pruebas aprobadas en Edge. Cubre Día, Semana y Mes, roles, filtros, actualización en vivo, estados, alta manual, cambio de horario y diálogos. Se ejecutó la configuración de `tests/m4-playwright.config.js` con un puerto local alternativo porque el habitual estaba ocupado.
- Revisión visual de las capturas de Agenda a 1366 y 390 px en claro y oscuro, en conectado y demo, incluida la confirmación de cancelación en móvil.
- `git diff --check`: correcto. La búsqueda de las rutas de importación, atributos conectados y eventos anteriores en `src/` y `tests/` no encontró referencias residuales.
- La suite M4 usa respuestas HTTP simuladas para el modo conectado y datos ficticios para la demo. El backend y su base de datos quedan fuera de la ejecución.
