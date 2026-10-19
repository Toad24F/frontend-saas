# Acción de estado en Recepcionistas

## Qué cambió y por qué

La fila y la tarjeta ya muestran los datos que aparecían en «Ver detalle». La acción principal ahora es «Desactivar» para una cuenta activa o «Reactivar» para una inactiva. Se quitó el menú de más acciones porque solo contenía esa misma operación. «Restablecer clave» permanece disponible.

## Alcance

- Solo pantalla conectada de Recepcionistas; la demo no incluye esta pantalla.
- Lista y tarjetas en escritorio; tarjetas en móvil. Estilos claro y oscuro.
- El clic conserva el diálogo de confirmación, los mensajes de error y las rutas existentes `POST /recepcionistas/:id/desactivar` y `POST /recepcionistas/:id/reactivar`. Abrir la acción no cambia la cuenta hasta confirmar.

## Archivos

- `src/connected/screens/recepcionistas/view.js`: acción visible según el estado.
- `src/connected/screens/recepcionistas/style.css`: estilo de desactivación y tema oscuro.
- `src/connected/screens/recepcionistas/actions.js`: se retira el detalle repetido.
- `src/shared/actions.js`: se retira el manejador del detalle.

## Comprobación y límites

`git diff --check` pasó, `npm test` pasó con 70 pruebas y `npm run build` terminó correctamente. La ruta conectada mostró la pantalla de inicio de sesión en el navegador local, por lo que no se pudo revisar visualmente la lista o las tarjetas con datos reales en escritorio, móvil y ambos temas. No se modificaron datos reales para probar la confirmación.
