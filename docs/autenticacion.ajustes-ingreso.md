# Ajustes del inicio de sesión

## Interfaz

El pie «Un poco más de orden. Más tiempo para cuidar.» y la línea «Tu negocio, a tu ritmo» se retiraron de la plantilla compartida por inicio de sesión, activación y recuperación. En el panel de imagen, «Citalendar, la agenda de tu negocio» sustituye a «La agenda lista para el día que tienes por delante.». El panel se sigue mostrando por encima de 900 px en ambos temas. En pantallas más estrechas se ve el formulario con su texto introductorio.

## Mensajes de acceso

| Caso | Mensaje |
| --- | --- |
| Fallo de conexión (`0`) | No pudimos conectar con Citalendar. Revisa tu conexión e inténtalo de nuevo. |
| Error del servidor (`5xx`) | Error del servidor. |
| Sesión vencida | Tu sesión venció. Por favor, inicia sesión de nuevo. |

Los mensajes de conexión y servidor se aplican cuando el error se presenta en la vista de ingreso. El mensaje de sesión vencida cubre el retorno desde el panel y el rechazo al validar una sesión guardada. El `401` de `POST /auth/login` sigue mostrando el mensaje de credenciales que devuelve la API, al igual que los demás errores ajenos a este ajuste. La demo sigue siendo accesible desde el enlace «Ver demo».

## Archivos

- `autenticacion.vista.js` y `autenticacion.estilos.css` ajustan la plantilla y la presentación del error en el formulario.
- `autenticacion.errores.js` reúne los mensajes del ingreso y `aplicacion.nucleo.js` los aplica al volver al login o al restaurar la sesión.
- `autenticacion.flujos.spec.js`, `sesion.persistencia.spec.js` y `agenda.refresco-errores.spec.js` verifican los flujos afectados.

## Verificación

- Antes de modificar el código de la aplicación, `npm test` pasó con 320 pruebas. Las seis comprobaciones nuevas o actualizadas que se ejecutaron en Edge reprodujeron las diferencias esperadas en los textos, los errores de ingreso y la sesión guardada vencida.
- Después del cambio, `npm test` pasó con 320 pruebas y `npm run build` completó la compilación.
- `npm run test:browser -- --config tests/m4-navegador.config.js autenticacion.flujos sesion.persistencia agenda.refresco-errores` pasó con 30 pruebas en Microsoft Edge. Se revisaron las capturas del login a 1366 × 900 y 390 × 844 en temas claro y oscuro.
- `git diff --check` pasó. La comprobación conectada utilizó respuestas HTTP simuladas y no realizó operaciones sobre el backend ni la base de datos.
