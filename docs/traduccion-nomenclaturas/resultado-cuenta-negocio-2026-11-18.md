# Resultado de traducción de Cuenta, negocio, licencias y publicación

Fecha: 2026-11-18

## Alcance

Se tradujeron los nombres internos de Mi cuenta, su licencia y la publicación de precios, así como el detalle de Negocio, sus cupos, historial de correos y operaciones de licencia. Los imports, exports, selectores, atributos `data-*`, propiedades de estado y pruebas se actualizaron juntos. Las rutas de entrada del panel y la presentación se conservan. El portal compartido y el directorio de Plataforma conservan sus interfaces y siguen sirviendo a sus consumidores en demo.

| Carpeta | Nombres anteriores y actuales |
| --- | --- |
| `src/connected/screens/cuenta/` | `view.js` → `cuenta.vista.js`, `actions.js` → `cuenta.acciones.js`, `license-progress.js` → `licencia.progreso.js`, `price-publication.js` → `cuenta.publicacion-precios.js`, `style.css` → `cuenta.estilos.css` |
| `src/connected/screens/negocio/` | `view.js` → `negocio.vista.js`, `actions.js` → `negocio.acciones.js`, `workspace.js` → `negocio.espacio-trabajo.js`, `style.css` → `negocio.estilos.css` |
| `src/connected/screens/negocio/` | `license-operations.js` → `licencia.operaciones.js`, `license-presentation.js` → `licencia.presentacion.js`, `mail-history.js` → `correo.historial.js`, `user-quota.js` → `usuarios.cupo.js`, `quota-meter.js` → `cupo.medidor.js` |
| `src/connected/modules/publicacion/` | `precios.js` → `publicacion.precios.js` |
| `tests/` | `account-license-progress.test.js` → `licencia.progreso.test.js`, `business-detail.test.js` → `negocio.detalle.test.js`, `ala-licencias.test.js` → `ala-licencia.operaciones.test.js`, `ala-cupos-usuarios.test.js` → `ala-usuarios.cupo.test.js`, `ala-publicacion-agenda.test.js` → `ala-publicacion.precios-agenda.test.js` |
| Navegador | `browser-business-detail.mjs` → `negocio.detalle-navegador.mjs`, `browser/licenses.spec.js` → `browser/licencia.operaciones.spec.js`, `browser/user-quotas.spec.js` → `browser/usuarios.cupo.spec.js`. Se añadió `m4-browser/cuenta.publicacion-licencia.spec.js`. |

Se ajustaron el índice de pantallas, las acciones delegadas y los imports de cupos de Profesionales, Recepcionistas y catálogos compartidos. La oferta de Disponibilidad consume la clase compartida renombrada. El CSS conserva las declaraciones y estados visuales.

## Contratos y persistencia

- Se cotejaron los controladores de negocio, vigencia, envíos de correo y publicación. Los endpoints, métodos y permisos siguen siendo los del backend. Publicar precios corresponde a administración del negocio. Las operaciones de licencia, edición de cupos e historial de correo del detalle corresponden a superadministración. La vigencia propia se mantiene para administración, recepción y profesionales.
- El PATCH de publicación envía únicamente `mostrarPreciosPublicos`. Los cupos conservan `limiteSucursales`, `limiteProfesionalesActivos` y `limiteRecepcionistasActivos` según la ruta. Se conservaron `plazoDias`, `envioId`, los nombres de respuesta, los valores de estados del backend y la cabecera `Idempotency-Key`.
- Se conservó `citalendar:license:pending:<actorId>` y el formato serializado `action`, `businessId`, `licenseId`, `body` y `key`. Un intento previo puede reanudarse con el mismo cuerpo y clave. La limpieza sigue ocurriendo después de leer la vigencia.
- Las etiquetas y controles de las pantallas conservan sus textos, los límites y la semántica accesible. Los DTO, las clases de Bootstrap, los atributos HTML y ARIA y la interfaz compartida `api` conservan sus nombres.

## Verificación

- `npm test` pasó con 296 pruebas, incluidas 30 del conjunto ejecutadas también por separado. La política de progreso, estados de licencia, contratos de publicación, validaciones de cupos, correo y recuperación de un marcador de licencia previo tienen cobertura unitaria.
- `npm run build` y `git diff --check` pasaron. La búsqueda de imports, exports, clases y selectores anteriores no encontró referencias involuntarias en el conjunto.
- Pasaron nueve pruebas Playwright de Cuenta y autenticación en Edge con API simulada. Se comprobó el progreso, permisos por rol, lectura y reintentos de publicación, preservación del borrador, validación del cambio de contraseña y formularios de autenticación que comparten su navegación. Se revisaron las capturas a 1366 y 390 px con ambos temas.
- El detalle se recorrió en Edge con API simulada. Se verificaron teclado, pestañas, progreso, suspensión, límites, historial, filtros, paginación, estados vacío y error, vuelta desde Plataforma y acceso a la demo. Se generaron 40 capturas entre 320 y 1920 px, en claro y oscuro. También se comprobó el PATCH de cupos tras un 409 y la recuperación por interfaz de un marcador anterior. Pasaron los recorridos aislados de Plataforma y catálogos.
- Playwright detectó los ocho casos de licencias y cupos con MariaDB. Su ejecución quedó pendiente porque el runner prepara una base efímera en el backend. Las escrituras de las pruebas ejecutadas se resolvieron con dobles locales.

Para repetir Cuenta y autenticación, usa `npm run test:browser -- --config tests/m4-playwright.config.js cuenta.publicacion-licencia autenticacion.flujos`. Para repetir Negocio, inicia Vite y ejecuta `node tests/negocio.detalle-navegador.mjs`. Ambos recorridos interceptan la API.
