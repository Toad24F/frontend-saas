# M5-T064 — Formulario de plazos y recordatorios

## Flujo

1. El Administrador entra en **Mi cuenta → Plazos y recordatorios → Configurar plazos**. Al abrir, el editor consulta `GET /negocio/automatizaciones`. El formulario distingue los valores vigentes del borrador que se está editando.
2. El plazo de confirmación acepta entre 6 y 24 horas enteras. El recordatorio admite entre 12 y 48. Si un campo está fuera de rango o no contiene un entero, el editor explica el error, enfoca el primer campo inválido y conserva los valores digitados.
3. **Guardar plazos** envía `{ version, plazoConfirmacionHoras, recordatorioHoras }` a `PUT /negocio/automatizaciones`. El editor espera la respuesta antes de mostrar los nuevos valores vigentes. El servidor conserva las citas, condiciones y recordatorios ya asignados.
4. Un error 400 muestra el mensaje del servidor y conserva el borrador. Un conflicto 409 también conserva el borrador, bloquea otro guardado con esa versión y ofrece **Recargar valores vigentes**. Esta acción hace un nuevo GET y reemplaza el borrador con los valores del servidor.
5. En **Configuración** de la demo, el mismo formulario guarda valores simulados en memoria por negocio. El modo conectado presenta el acceso solo al Administrador.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/shared/automatizaciones.editor.js` | Dibuja el acceso y el diálogo, valida los campos, controla la carga, el guardado y la resolución de conflictos. |
| `src/shared/automatizaciones.estilos.css` | Aplica el acento del panel al botón y hace visible su foco en claro y oscuro. |
| `src/connected/screens/cuenta/cuenta.vista.js` | Muestra el acceso al formulario para el Administrador. |
| `src/connected/screens/cuenta/cuenta.acciones.js` | Abre el diálogo y ejecuta GET y PUT con la sesión autenticada. |
| `src/demo/screens/configuracion/configuracion.vista.js` | Abre el diálogo compartido en la demo y conserva los plazos ficticios por negocio durante la sesión. |
| `tests/navegador/automatizaciones.configuracion.spec.js` | Comprueba el formulario desde el navegador, los errores HTTP y el efecto sobre datos históricos en una base desechable. |

## Pruebas

Las tres pruebas de navegador se escribieron primero y fallaron porque faltaba el botón **Configurar plazos**. Al repetirlas después del cambio, pasaron **3/3**.

1. En móvil oscuro, comprueba los valores iniciales 12/24, el orden de foco, los errores de rango y de entero y la ausencia de PUT inválidos. Guarda los límites 6/48, recarga y compara las filas completas de cita, condición y recordatorio con las anteriores.
2. En escritorio claro, comprueba el mensaje de un 400 interceptado y un conflicto 409 real causado por otra sesión de Administrador. Verifica que el borrador persiste hasta recargar y que la nueva lectura muestra los valores ganadores.
3. Verifica que Recepción carece del control. Abre la demo, guarda un valor, cierra con Escape y vuelve a abrir. Comprueba el foco y que la demo no llama a la API.

`npm test` pasó **312/312**. `npm run build` y `git diff --check` completaron con código 0. Se revisó el diálogo en móvil oscuro y escritorio claro mediante las trazas de Edge.
