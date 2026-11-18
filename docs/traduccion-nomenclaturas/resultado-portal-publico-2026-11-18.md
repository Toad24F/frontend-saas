# Resultado de traducción del portal público y reservas

Fecha: 2026-11-18

## Alcance

Se tradujeron los nombres internos de la entrada pública, la selección, el apartado, el envío y la recuperación, además del portal demo y sus opciones compartidas. Se actualizaron los imports, los exports, los selectores CSS, los atributos `data-*` y sus consumidores en el enrutador, el estado de la demo, los estilos de tema y movimiento y las pruebas. La migración conserva la marca, los temas y el diseño del portal.

| Ubicación final | Archivos anteriores y nombres nuevos |
| --- | --- |
| `src/connected/portal-publico/` | `entry.js` → `portal.entrada.js`, `booking.js` → `reserva.flujo.js`, `booking-view.js` → `reserva.vista.js`, `booking-lifecycle.js` → `reserva.ciclo-vida.js` |
| `src/connected/portal-publico/` | `attempt-store.js` → `intento.store.js`, `selection.js` → `seleccion.flujo.js`, `selection-view.js` → `seleccion.vista.js`, `contact.js` → `reserva.contacto.js`, `dates.js` → `portal.fechas.js`, `submission.js` → `reserva.envio.js` |
| `src/connected/portal-publico/` | `browser-session.js` → `portal.sesion-navegador.js`, `hold-clock.js` → `apartado.reloj.js`, `business-identity.js` → `negocio.identidad.js`, `accessibility.js` → `portal.accesibilidad.js`, `http.js` → `portal.http.js`, `style.css` → `portal.estilos.css` |
| `src/shared/portal-publico/` | `options.js` → `portal.opciones.js`, `options.css` → `portal.opciones.css` |
| `src/demo/screens/reservas/` | `booking.js` → `reserva.vista.js`, `style.css` → `reserva.estilos.css` |
| `tests/` | `portal-publico-*.test.js` → `portal-publico.*.test.js`, `ala-portal-*.test.js` → `ala-portal.*.test.js`, `browser/portal.spec.js` → `browser/portal.reservas.spec.js`, `browser-portal-navigation.mjs` → `portal.navegacion-navegador.mjs`, `fixtures/portal-selection-server.mjs` → `fixtures/portal.servidor-simulado.mjs` |

El controlador de selección ya admitía mover la ventana del calendario, pero el flujo montado en la entrada pública no exponía esa acción. Se conectaron los botones de rango a ese controlador con la misma invalidación que se aplica al seleccionar una fecha. Las pruebas de navegador usan los botones del calendario actual y el servidor simulado devuelve los dos límites del rango que recibe.

## Compatibilidad

- Se cotejaron las rutas del controlador público y las reglas de contacto con el backend. Se conservaron las URLs `/reservas/:slug` y `/publico/negocios/:slug/…`, `?demo=1`, los parámetros, campos, cabeceras de sesión y CSRF, estados y códigos públicos.
- Se conservaron `cita-theme`, `citalendar:public:attempt:<slug codificado>` y el marcador con `negocio`, `apartadoId` y `clave`. Así se puede resolver un intento creado antes de actualizar el frontend.
- Se conservaron los nombres Web Locks y BroadcastChannel bajo `citalendar:portal:`, el campo `slug` y el protocolo entre pestañas `type: changed | released | refresh`. También se conservaron los nombres nativos del navegador, las API de Bootstrap y las interfaces del motor y del estado global de la demo.
- Se mantuvieron los términos técnicos acordados como `client`, `store`, `payload`, `render` y `handle`. La demo sigue usando datos ficticios y la versión conectada sigue dependiendo de la API del mismo origen.

## Verificación

- `npm test` aprobó las 295 pruebas, incluidas las 100 específicas del portal y reservas. `npm run build` y `git diff --check` terminaron correctamente.
- `tests/portal.navegacion-navegador.mjs` comprobó en Edge carga, vacío, error, búsqueda, paginación, elección automática, filtros, avance de rango y la reserva ficticia completa. Generó 48 capturas en claro y oscuro a 1366, 768, 390 y 320 px, con comprobación de desbordamiento horizontal.
- `tests/portal.flujo-navegador.mjs` comprobó foco en el primer campo inválido, revisión de contacto, sustitución entre dos pestañas, expiración, regreso a horarios, pérdida de respuesta, reintento con el mismo marcador y recuperación del folio tras recargar. Se revisaron capturas de escritorio y móvil en ambos temas.
- Playwright detectó los 15 casos de `tests/browser/portal.reservas.spec.js`. Su ejecución con MariaDB quedó fuera de esta verificación porque el runner crea, carga y elimina una base efímera del backend. Los recorridos ejecutados usaron una API de prueba en memoria.

Los dos recorridos de Edge pueden ejecutarse contra la instancia de prueba local. En una terminal se inicia `node tests/fixtures/portal.servidor-simulado.mjs`. En otra se ejecutan `node tests/portal.flujo-navegador.mjs` y, con `BUSINESS_UI_URL` apuntando a `http://127.0.0.1:5193`, `node tests/portal.navegacion-navegador.mjs`.
