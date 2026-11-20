# Traducción de pruebas y datos de prueba

Fecha 2026-11-20.

## Alcance

Se tradujeron los identificadores propios y los términos en inglés de las descripciones en las pruebas unitarias, las dos suites de Playwright y los recorridos independientes de Edge. También se actualizaron los consumidores de los datos de prueba y las rutas usadas en las instrucciones de ejecución.

| Ruta anterior | Ruta actual |
| --- | --- |
| `tests/browser/` | `tests/navegador/` |
| `tests/browser/global-setup.js` | `tests/navegador/integracion.preparacion.js` |
| `tests/browser/support.js` | `tests/navegador/integracion.utilidades.js` |
| `tests/m4-browser/` | `tests/m4-navegador/` |
| `tests/m4-playwright.config.js` | `tests/m4-navegador.config.js` |
| `tests/fixtures/` | `tests/datos-prueba/` |
| `tests/fixtures/memory-storage.js` | `tests/datos-prueba/memoria.almacenamiento.js` |
| `tests/fixtures/account-portal.html` | `tests/datos-prueba/cuenta.portal.html` |
| `tests/admin-review.test.js` | `tests/administracion.revision.test.js` |
| `tests/backend.test.js` | `tests/conexion.backend.test.js` |
| `tests/browser-admin-review.mjs` | `tests/administracion.revision-navegador.mjs` |
| `tests/browser-local-pagination.mjs` | `tests/paginacion.local-navegador.mjs` |

La integración usa `prepararIntegracion`, `consultarFilas` y `urlPortal`. El sustituto de `sessionStorage` se crea con `crearAlmacenamientoEnMemoria`. La sesión simulada de Agenda devuelve `solicitudesObservadas` y `errores`. Se conservaron las claves HTTP y de almacenamiento, los selectores de producción, los nombres declarados por Playwright y los códigos que vinculan cada prueba con el plan. El ejemplo HTML de Cuenta usa `?caso=demo` para mostrar el enlace ficticio.

La primera corrida con API simulada detectó que la prueba de distribución de Agenda podía medir una tarjeta durante un nuevo render después del cambio de profesional. La prueba espera que ambas tarjetas sean visibles y vuelve a medir mientras se estabiliza la geometría. Conserva las mismas comprobaciones de alineación, ancho y separación.

## Verificación

- `npm test` aprobó 297 pruebas. `npm run build` generó la compilación de producción.
- Se resolvieron 391 referencias de archivos entre imports, datos HTML y rutas de pruebas documentadas. Se revisaron los literales de los casos con respecto a la versión anterior y se conservaron los selectores, datos contractuales y rutas de producto.
- Playwright aprobó los 145 casos con API simulada en la corrida final, sin reintentos. Comando `npm run test:browser -- --config tests/m4-navegador.config.js --workers 2 --retries 1`.
- `npm run test:browser` aprobó los 33 casos con el backend ya compilado y `PORTAL_TEST_BACKEND_READ_ONLY=1`. La prueba T124 esperó el vencimiento real del apartado. Se comprobó que la base efímera autorizada se eliminó al terminar.
- Pasaron los seis recorridos independientes de Edge. El ejemplo HTML de Cuenta abrió en su ruta nueva y se comprobó el tema y el enlace de reserva de la demo.
- `git diff --check` pasó. Los cambios abarcan pruebas, sus configuraciones y documentación.
