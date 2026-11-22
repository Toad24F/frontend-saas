# Fase 6 M5-T024–T029 — unión explícita de clientes

Fecha: 22 de noviembre de 2026. La vista conectada consume `PATCH /clientes/:id` y `POST /clientes/:id/uniones` del backend inspeccionado. La demo conserva datos ficticios y no envía uniones. La migración y las pruebas SQL de T027–T028 se documentan en el repositorio hermano `../../SaaS-backend/docs/fase-6-modulo-5/resultados-tareas/m5-t024-t029.md`.

## Qué cambió y por qué

| Archivo | Qué hace |
| --- | --- |
| `src/connected/modules/autenticacion/sesion.estado.js` | Conserva solo el código y destino del 409 tipado `cliente_coincidente` para que la pantalla pueda presentar la elección autorizada. Los demás errores mantienen el tratamiento anterior. |
| `src/connected/modules/clientes/clientes.client.js` | Añade el POST de unión con el intento exacto que preparó la pantalla. |
| `src/connected/modules/clientes/clientes.union.js` | Nuevo módulo que valida la proyección mínima del destino, fija clave y versiones, valida el resultado y localiza un intento pendiente de esta sesión. |
| `src/connected/screens/clientes/clientes.paneles.js` | Muestra advertencia y botones para aceptar o volver; recorre el directorio paginado al revisar duplicados heredados; conserva el borrador, bloquea cambios durante la decisión y reintenta la misma unión si se pierde la respuesta. |
| `src/connected/screens/clientes/clientes.vista.js` | Muestra un aviso de recuperación tras recarga aunque la ficha origen ya no sea seleccionable; impide iniciar un alta desde ese directorio mientras existe un intento pendiente. |
| `src/demo/screens/clientes/clientes.vista.js` | Aclara que la unión requiere el modo conectado. La edición de demostración sigue siendo ficticia. |
| `tests/clientes.union.test.js` | Nuevas pruebas Node para rechazo tipado, cuerpo/clave de repetición y elección válida de destino. |
| `tests/m4-navegador/clientes-horario.spec.js` | Amplía las respuestas simuladas y comprueba advertencia, aceptación, pérdida/recarga, grupo heredado, teclado, roles, snapshots y cuatro combinaciones de tema/tamaño. Conserva los casos anteriores de Clientes y Agenda. |

## Flujo

1. Administración o Recepción corrige una ficha. Si el backend devuelve una única coincidencia autorizada, el editor muestra ID y nombre destino. «Volver a editar» deja la ficha intacta; no se envía POST. Otros 409 exigen relectura y no muestran un destino supuesto.
2. «Aceptar unión» captura los valores propuestos ya validados, versiones y una clave. Escribe ese cuerpo en `sessionStorage` antes del POST. Si se pierde la respuesta, el botón de reintento usa el mismo cuerpo y clave. Tras recarga, el directorio muestra «Recuperar unión pendiente» incluso si el origen desapareció de su listado. Una respuesta conocida retira el marcador, refresca el directorio y abre el historial del destino.
3. «Revisar coincidencias» lee todas las páginas del directorio propio y compara nombre NFC, minúsculas y espacios compactados más teléfono. Presenta posibles destinos sin elegir uno. El usuario escoge; el servidor vuelve a validar identidad, versiones y pertenencia. Las citas cambian de vínculo, pero sus nombres, teléfonos, costos y demás snapshots históricos no se reescriben.
4. En la demo se explica la diferencia de capacidad; no se simula una unión real.

## Verificación

- **Tests primero:** `node --test tests/clientes.union.test.js` falló inicialmente por ausencia del módulo; el caso Playwright de advertencia falló antes del cambio de pantalla. Luego las tres pruebas Node nuevas pasaron. El caso de conciliación también falló antes de añadir el control.
- `npm test`: **300/300 aprobadas**. Incluye validación de destino y del intento repetido.
- `npx playwright test --config tests/m4-navegador.config.js tests/m4-navegador/clientes-horario.spec.js --reporter=line`: **24/24 aprobadas** con HTTP interceptado. Verifica doble envío tras respuesta perdida, recarga con origen ausente, selección expresa, Administración/Recepción con teclado, ausencia de acceso para Profesional y contacto histórico sin cambios.
- El mismo archivo verificó conectado y demo en 1366 y 390 píxeles, claro y oscuro. Se revisaron visualmente las capturas de aviso móvil oscuro y directorio demo móvil claro; las pruebas comprueban visibilidad de las acciones y ausencia de desbordamiento horizontal del aviso.
- `npm run build` y `git diff --check`: aprobados. La suite HTTP del backend y el índice SQL tienen evidencia separada en el documento citado arriba.

## Límites

El navegador se probó con dobles HTTP, no contra una API desplegada. La búsqueda de grupos heredados recorre el directorio autorizado completo y puede tardar en negocios grandes; la validación final siempre la realiza el backend. El intento pendiente privado se guarda en `sessionStorage` de esa sesión hasta recibir una respuesta conocida; no contiene credenciales ni datos de citas. La demo muestra la distinción de capacidad y no une fichas.
