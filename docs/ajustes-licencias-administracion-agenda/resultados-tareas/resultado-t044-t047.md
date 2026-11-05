# Resultado FALA-T044–T047

## Flujo implementado

El Administrador abre **Mi cuenta**. La pantalla consulta `GET /negocios/publicacion-catalogo` con su sesión y presenta el booleano `mostrarPreciosPublicos`. Una lectura fallida muestra el error y un reintento; nunca supone que los precios estén visibles. Al guardar, envía `PATCH /negocios/publicacion-catalogo` con solo ese booleano. La vista cambia el estado vigente cuando la respuesta confirma el valor solicitado. Un rechazo mantiene el estado anterior y la selección pendiente para reintentar. El texto indica que la decisión es global, alcanza los servicios creados después y afecta futuras respuestas públicas, sin modificar los importes históricos internos.

En **Disponibilidad → Reglas de agenda**, la versión conectada lee `tiempoEntreCitasMinutos` de `GET /disponibilidad/configuracion`. Muestra cero como separación válida entre citas y rechaza respuestas antiguas o incompletas, en vez de tomar `intervaloMinutos` como dato vigente. Para mantener operativo el formulario al cambiar su campo, el envío conectado usa el nuevo nombre y valida cero o múltiplos de cinco hasta sesenta. La demo conserva por ahora su simulación con `intervaloMinutos`; su adaptación integral corresponde al cierre de demo de esta fase.

## Archivos y propósito

| Archivo | Qué hace |
| --- | --- |
| `src/connected/modules/publicacion/precios.js` | Lee el estado autorizado y guarda un PATCH parcial; exige confirmación del booleano. |
| `src/connected/screens/cuenta/price-publication.js` | Dibuja carga, error, estado vigente, alcance global y selector de publicación. |
| `src/connected/screens/cuenta/view.js` | Carga el estado para la sesión del Administrador y conserva el borrador ante fallo. |
| `src/connected/screens/cuenta/actions.js` y `src/connected/screens/index.js` | Conectan reintento y envío a los controles de cuenta. |
| `src/connected/screens/cuenta/style.css` | Ajusta controles y tamaño táctil al diseño existente. |
| `src/shared/screens/disponibilidad/operational.js` | Presenta el campo conectado nuevo, incluido cero, sin cambiar el formulario ficticio de demo. |
| `src/shared/screens/disponibilidad/operational-contract.js` | Valida el campo y rechaza una lectura incompleta. |
| `src/connected/screens/disponibilidad/view.js` y `actions.js` | Leen el contrato actual y envían el campo correcto desde el formulario conectado. |
| `tests/ala-publicacion-agenda.test.js` | Prueba ruta, booleano, errores, PATCH parcial y tiempo entre citas cero. |
| `tests/browser/portal.spec.js` | Recorre la alternancia real, comprueba el campo `costo` en HTTP y en pantalla, y conserva el costo histórico. |
| `tests/browser/global-setup.js` | Toma credenciales de `.env.test.local`, verifica su separación de la base habitual y crea/elimina una base temporal para el navegador. |
| `tareas.md` | Marca T044–T047 terminadas. |

## Pruebas y límites

Primero se escribió `tests/ala-publicacion-agenda.test.js`: falló por faltar el módulo de publicación. Tras implementar, la prueba específica pasó **3/3** y `npm test` pasó **185/185**. `npm run build` y `git diff --check` pasaron. Las pruebas cubren que la lectura usa la ruta autorizada, propaga el error, que PATCH envía solo el booleano y exige confirmación, y que el contrato de agenda acepta cero y rechaza el campo retirado.

El primer intento de navegador no alcanzó el caso: el runner leía `.env` y el sandbox impedía conectarse a MariaDB. Se corrigió el runner para usar las credenciales separadas de `../backend/.env.test.local`; el nombre de base de prueba debe estar confirmado y ser distinto del habitual. La ejecución fuera del sandbox creó y eliminó una base temporal de nombre validado. No se editó el backend ni su base habitual.

**T046 pasó 1/1** con `npx playwright test tests/browser/portal.spec.js -g 'FALA-T044–T046'` y `PORTAL_TEST_BACKEND_READ_ONLY=1`. El navegador registró una reserva con precio visible; SQL confirmó `costo_aceptado = 100`. Tras ocultar precios, la respuesta real del catálogo omitió `costo`, la selección dejó de mostrar `$100` y la reserva histórica conservó 100. Tras volver a publicar, la respuesta incluyó `costo = 100` y la selección volvió a mostrarlo. El caso se repitió después de añadir la aserción HTTP y pasó de nuevo. Esta verificación cubre el flujo de escritorio del portal; no se realizaron capturas comparativas de móvil y temas.
