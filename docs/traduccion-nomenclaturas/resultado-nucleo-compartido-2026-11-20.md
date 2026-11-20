# Traducción del núcleo compartido

Fecha 2026-11-20.

## Alcance

Se actualizaron los archivos, las funciones, las variables y el estado propio del arranque, navegación, datos y componentes compartidos. Los cambios se aplicaron coordinadamente a `index.html`, las pantallas, sus imports estáticos y diferidos, y las pruebas que importan módulos desde el navegador.

| Ubicación | Archivo anterior → actual |
| --- | --- |
| `src/` | `main.js` → `aplicacion.entrada.js`, `entry-router.js` → `entrada.enrutador.js` |
| `src/connected/` | `entry.js` → `conectado.entrada.js`, `mode.js` → `conexion.modo.js`, `modules/datos/load.js` → `modules/datos/datos.carga.js` |
| Índices de pantallas | `connected/screens/index.js` → `pantallas.conectadas.js`, `demo/screens/index.js` → `pantallas.demo.js` |
| `src/shared/` | `app.js` → `aplicacion.nucleo.js`, `actions.js` → `aplicacion.acciones.js`, `data.js` → `aplicacion.datos.js` |
| `src/shared/` | `ui.js` → `interfaz.componentes.js`, `forms.js` → `formularios.componentes.js`, `icons.js` → `iconos.catalogo.js` |
| `src/shared/` | `calendar-layout.js` → `calendario.distribucion.js`, `resource-status.js` → `recursos.estado.js`, `account-portal.js` → `cuenta.portal.js` |
| `tests/` | `calendar.test.js` → `calendario.distribucion.test.js`, `account-portal.test.js` → `cuenta.portal.test.js` |

La demo y el panel conectado siguen seleccionando sus módulos por separado. `backend.js` conserva su función de fachada y reexporta los nombres españoles. La entrada pública sigue cargando su módulo directamente. El [glosario](glosario-nomenclatura-frontend.md#equivalencias-del-núcleo-compartido) registra los cambios de símbolos más usados.

Se sincronizaron las claves del estado volátil con los filtros de Agenda, el detalle de negocio y la navegación. Las acciones internas `go-agenda`, `copy-link` y `back-platform` pasan a `ir-agenda`, `copiar-enlace` y `volver-plataforma`. Las opciones de formulario pasan a `panelLateral`, `validar` y `alFallar`. Se corrigió la referencia al negocio en el cambio rápido de estado de Agenda demo y se añadió un caso de navegador para comprobar el guardado local.

## Compatibilidad

- Se conservaron los contratos HTTP, los roles, las rutas, `?demo=1`, las variables `VITE_*`, los datos persistidos y el contrato de la herramienta WebMCP. La revisión del backend se limitó a lectura.
- Las claves del modelo de registros que comparten el fixture y los adaptadores permanecen vigentes. Sus funciones de acceso se tradujeron y el estado del panel tiene nombres propios en español.
- Las clases e identificadores de componentes compartidos conservan la interfaz visual. La actualización de estos nombres se registra en el [resultado del CSS global](resultado-css-global-2026-11-20.md).

## Verificación

- Pasaron las 297 pruebas unitarias, `npm run build` y `git diff --check`. Se buscaron los imports y nombres anteriores y se cotejaron las variables Vite, las claves de almacenamiento y las rutas del cargador conectado.
- Los 140 casos existentes de Playwright con API simulada pasaron entre la corrida completa y sus reintentos. El caso nuevo de cambio de estado también pasó al seleccionar explícitamente la sucursal de la cita. Se repitieron 33 casos de Agenda, Disponibilidad y pantallas demo con la versión final y todos pasaron en serie. Las comprobaciones de geometría esperan el render antes de medir el ancho.
- Pasaron seis recorridos independientes en Edge con API simulada. Cubrieron catálogos y paginación, Plataforma, Negocio, administración e inhabilitados, navegación pública y el flujo de reserva con servidor ficticio.
- Se revisaron capturas de Agenda y Cuenta en escritorio y móvil en ambos temas. Una comprobación sobre `dist/` abrió el acceso conectado, la entrada pública y la demo desde sus URL. En el mismo entorno de vista previa se verificó el cambio rápido de estado de una cita de ejemplo.

- Los 33 casos de navegador con MariaDB pasaron entre la corrida completa y la repetición de FALA-T050. En la corrida completa pasaron 32 casos. FALA-T050 agotó el tiempo buscando los nombres antiguos de los campos de horario. Se actualizaron sus selectores a `entrada-` y `salida-` y la repetición verificó el guardado de ambas franjas en la API real.
- La integración usó el backend ya compilado con `PORTAL_TEST_BACKEND_READ_ONLY=1` y una base efímera local por corrida. Se comprobó el aislamiento del portal conectado y la eliminación de las bases creadas para estas pruebas.

Para repetir la suite de navegador con API simulada, ejecutar `npm run test:browser -- --config tests/m4-playwright.config.js`.
