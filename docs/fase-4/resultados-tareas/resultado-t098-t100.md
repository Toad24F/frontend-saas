# Resultado M3-T098–M3-T100 — Entrada pública y sesión anónima

Fecha: 20 de octubre de 2026.

## Estado y alcance

- [x] **M3-T098 — Crear entrada pública por slug.** `/reservas/:slug` carga una entrada conectada independiente, sin login, navegación administrativa ni importaciones de datos ficticios. Un enlace inválido muestra un error público. `?demo=1` conserva la demo explícita.
- [x] **M3-T099 — Preparar cliente HTTP público del mismo origen.** Peticiones relativas con cookie, cabeceras de inicialización/CSRF, caché deshabilitada, rechazo de redirecciones y errores públicos diferenciados de fallos de transporte y protocolo.
- [x] **M3-T100 — Coordinar inicialización de navegador entre pestañas.** Web Lock exclusivo por negocio, comprobación de BroadcastChannel y de contexto seguro, y verificación de conservación de cookie mediante dos inicializaciones consecutivas. Un fallo impide habilitar mutaciones y se muestra en pantalla.

Las marcas anteriores registran el trabajo **en frontend-saas**. El documento fuente `backend/docs/fase-4-modulo-3/tareas.md` se consultó y no se modificó porque el backend sigue siendo de solo lectura. **M3-T101 y siguientes no se implementaron.** Tampoco se declara habilitación de producción.

## Qué se realizó y por qué

Se separó el arranque público del panel para que una persona con el enlace de su negocio no necesite cuenta administrativa ni cargue sus módulos. Se añadió una base HTTP y de coordinación que utiliza el contrato ya implementado en el backend, sin duplicar disponibilidad ni simular apartados.

La página conserva marca Citalendar, logos por tema, tipografías y tokens existentes: superficies neutras en claro y grafito en oscuro, con acento terracota. Incluye estado accesible de conexión, error y reintento, y selector de tema. La conexión verificada identifica al negocio y explica que la selección de servicios/horarios todavía no está disponible. La demo mantiene su recorrido anterior y sus datos ficticios; no se ha agregado esta capacidad de sesión real a la demo.

## Archivos y responsabilidad

| Archivo | Operación y función |
| --- | --- |
| `src/main.js` | Modificado: delega el arranque al selector de entradas. |
| `src/entry-router.js` | Nuevo: identifica `/reservas/:slug`, decodifica y valida el segmento, conserva `?demo=1` y carga de forma diferida únicamente la entrada elegida. No consulta autenticación. |
| `src/connected/public/entry.js` | Nuevo: monta el shell público, tema, identidad del negocio, carga, errores y reintento; evita dobles clics durante inicialización e inserta nombres recibidos como texto. |
| `src/connected/public/style.css` | Nuevo: estilos acotados del portal con ancho adaptable, separación del encabezado y objetivos táctiles de al menos 44 px. Reutiliza los tokens de ambos temas. |
| `src/connected/public/http.js` | Nuevo: cliente independiente de autenticación privada, rutas públicas permitidas, timeout de 15 segundos, errores tipados y CSRF conservado exclusivamente en memoria tras comprobar la cookie. |
| `src/connected/public/browser-session.js` | Nuevo: valida capacidades, abre/cierra un canal de comprobación y serializa las dos inicializaciones mediante Web Locks con espera máxima de 15 segundos para adquirir el lock. |
| `vite.config.js` | Nuevo: proxy de desarrollo `/publico` hacia la API configurada, conservando Origin y el Path de la cookie. No configura Nginx ni proxy de producción/preview. |
| `tests/portal-publico-base.test.js` | Nuevo: ocho pruebas Node con dobles de HTTP y coordinación para cubrir las tres tareas, incluyendo errores y carreras de inicialización. No abre conexiones a la API ni modifica bases. |
| `README.md` | Modificado: distingue el alcance parcial del portal, describe proxy, requisitos del navegador, variables solo del servidor y límites de publicación. |
| Este documento | Nuevo: marcas de finalización, flujo, descripción de archivos, evidencias y pendientes del lote. |

Se añadieron comentarios en los bloques nuevos para explicar el aislamiento, protección HTTP, verificación de cookie, coordinación y límites del lote.

## Flujo implementado

1. `main.js` resuelve la entrada. Sin `?demo=1`, una ruta pública se procesa antes de cargar cualquier módulo del panel. Rutas administrativas conservan su entrada existente.
2. El shell público aplica tema y logo, muestra «Conectando…» y marca su región principal como ocupada. Slugs vacíos o enlaces mal formados muestran un mensaje sin iniciar HTTP.
3. Se comprueban contexto seguro, Web Locks, disponibilidad operativa de BroadcastChannel y el indicador de cookies del navegador. BroadcastChannel solo se comprueba: avisos de reemplazo corresponden a T108.
4. Todas las pestañas del mismo origen y slug solicitan el mismo lock exclusivo `citalendar:portal:sesion:<slug>`. Dentro de ese lock se ejecutan **las dos** peticiones `POST /publico/negocios/:slug/sesion`, con cuerpo `{}` y `X-Portal-Inicializacion: 1`.
5. El servidor establece su cookie HttpOnly en la primera petición. La segunda debe presentar esa misma cookie y devolver el mismo CSRF ligado a su credencial. Se comprueba también que el negocio devuelto coincida con el slug. No se intenta leer HttpOnly desde JavaScript ni se crea un apartado para verificar identidad.
6. Si ambos tokens coinciden, el cliente habilita en memoria el CSRF de futuras mutaciones. Si no, falla explícitamente por cookies y deja las mutaciones bloqueadas. Una nueva inicialización borra primero cualquier CSRF previo.
7. Al terminar la comprobación se libera el lock, se muestra el nombre real recibido y el estado de conexión verificada. Los nombres se escriben con `textContent`; no se insertan como HTML.
8. Un error mantiene el shell público y muestra un mensaje con reintento cuando corresponde. El 401 invalida el CSRF y no abre login administrativo. No se usa información ficticia para cubrir errores reales.

El cliente distingue `http` (respuesta funcional con estado/código/acción), `network` (red o timeout), `protocol` (respuesta no interpretable), `cookies`, `coordination` y `session`. Los estados 400, 401, 403, 404, 409, 500 y 503 conservan el contrato público `codigo`, `mensaje`, `accion`. No se envía Authorization ni se persisten tokens con localStorage/sessionStorage. Solo la preferencia de tema puede guardarse en localStorage.

## Tests primero y resultados reales

La suite inicial se escribió **antes de crear los módulos de implementación**. La primera ejecución de `node --test tests/portal-publico-base.test.js` terminó con código 1 y `ERR_MODULE_NOT_FOUND` para `src/entry-router.js`: el fallo rojo inicial fue de importación, antes de ejecutar las aserciones. Tras implementar, las seis pruebas iniciales pasaron. Se añadieron dos casos de endurecimiento: invalidación de credencial y timeout.

| Prueba nueva | Qué comprueba |
| --- | --- |
| Entrada aislada T098 | Slug codificado, enlace inválido, entrada pública sin panel/demo y conservación de las entradas administrativa y demo explícita. |
| HTTP/cookie/CSRF T099–T100 | Ruta relativa codificada, `same-origin`, `no-store`, rechazo de redirecciones, ausencia de JWT, doble sesión, protección de mutaciones y rechazo de rutas ajenas. |
| Errores T099 | Los siete estados públicos mantienen estado/código/acción; red y JSON inválido se distinguen de error funcional; 204 devuelve null. |
| Cookies T100 | Cambio de CSRF entre inicializaciones y respuestas inválidas/correspondientes a otro negocio impiden habilitar escrituras. |
| Pestañas T100 | Dos inicializaciones sobre un gestor de locks compartido ejecutan como máximo una sección crítica a la vez y usan el mismo nombre por negocio. |
| Capacidades T100 | Cookies deshabilitadas, contexto inseguro, locks ausentes/denegados o canal ausente/bloqueado impiden iniciar HTTP. |
| Invalidación T099–T100 | Un 401 o reinicialización fallida no deja utilizable el CSRF de una sesión verificada anterior. |
| Timeout T099 | Una petición abortada por plazo se clasifica como fallo de transporte, sin resultado funcional inventado. |

Ejecución final relacionada:

```text
node --test tests/backend.test.js tests/portal-publico-base.test.js
tests 16
pass 16
fail 0
cancelled 0
skipped 0
todo 0
```

Las ocho pruebas existentes de `backend.test.js` verifican regresión relacionada de cliente privado, carga por rol, permisos y payloads. **Todo se ejecuta en el frontend con dobles; no es una ejecución de suites del backend.**

`npm run build`: aprobado, Vite 7.3.6, 109 módulos transformados. `git diff --check`: aprobado. No se ejecutó la suite completa ni se atribuye una ejecución de lint inexistente.

## Revisión visual

Se inició Vite local en `127.0.0.1:5189` y se abrió `/reservas/` (enlace inválido) en el navegador integrado. Se revisó el shell sin login ni navegación administrativa en **1366 × 768 y 390 × 844**, temas claro y oscuro, con logo correcto y texto legible. En móvil se midió `scrollWidth = clientWidth = 390`, sin desbordamiento horizontal en ese estado.

La revisión visual se limitó deliberadamente a un enlace que no genera peticiones de sesión, para no modificar la base real. El éxito de sesión, los fallos HTTP/cookies y la exclusión entre pestañas se verificaron mediante pruebas Node con dobles; **no se afirma integración real de cookie/API ni carrera de pestañas en un navegador**. No se revisaron visualmente el panel y la demo; su selección se cubrió con las pruebas del arranque. Las pruebas de navegador contra API/base desechable pertenecen a T117 y posteriores.

## Configuración y límites

- La API necesita `PORTAL_PUBLICO_ORIGEN` igual al origen exacto del frontend y `PORTAL_CSRF_SECRET` válido, exclusivamente en el servidor. Este lote no cambia configuración, archivos ni datos del backend.
- El cliente público siempre conserva el mismo origen. El proxy Vite no reescribe Origin para eludir validaciones y no elimina el Path de la cookie. Para el build publicado hace falta acordar el proxy real y HTTPS; Nginx no se implementó.
- La cookie de sesión la controla el servidor. La verificación doble reutiliza la identidad existente y no concede/renueva apartados, no crea citas y no modifica el contrato del backend.
- Web Locks requiere contexto seguro; HTTP por IP de red local puede impedir iniciar el flujo. Sin coordinación o cookies no hay modo alternativo que finja una sesión utilizable.
- Los pasos de selección, apartados, contacto, contador, envío y recuperación quedan fuera: el trabajo se detiene después de **T100**.
