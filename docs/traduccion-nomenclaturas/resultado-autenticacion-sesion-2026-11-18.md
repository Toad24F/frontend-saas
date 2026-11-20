# Resultado de traducción de Autenticación y sesión

Fecha: 2026-11-18

## Alcance

Se tradujeron los archivos, las funciones, el estado interno, los selectores y los atributos de las pantallas conectadas de ingreso, activación y recuperación. También se actualizaron los consumidores del cierre de sesión, la validación de contraseña y la notificación de sesión expirada. El evento `cita-sesion-expirada` conserva su alcance local y se actualizó en todos sus consumidores, incluidos Agenda y Clientes. La demo conserva su entrada independiente y el acceso desde «Ver demo».

| Archivo anterior | Archivo actual |
| --- | --- |
| `src/connected/modules/auth/session.js` | `src/connected/modules/autenticacion/sesion.estado.js` |
| `src/connected/modules/auth/password-policy.js` | `src/connected/modules/autenticacion/contrasena.politica.js` |
| `src/connected/screens/auth/dialogs.js` | `src/connected/screens/autenticacion/autenticacion.vista.js` |
| `src/connected/screens/auth/style.css` | `src/connected/screens/autenticacion/autenticacion.estilos.css` |
| `tests/sesion.persistencia.test.js` | `tests/sesion.persistencia.test.js` |
| `tests/portal-cuenta.sesion.test.js` | `tests/portal-cuenta.sesion.test.js` |
| `tests/m4-navegador/sesion.persistencia.spec.js` | `tests/m4-navegador/sesion.persistencia.spec.js` |

El módulo usa `iniciarSesion`, `cerrarSesion`, `restaurarSesion`, `olvidarSesion`, `usuarioActual` y `etiquetaRol`. La fachada `backend.js` sigue exponiendo `user` como alias para los consumidores de otros conjuntos. Se conserva `api` como entrada compartida de transporte. Los estilos conservan sus reglas, imágenes de marca y tamaños.

## Compatibilidad con sesiones y API

- La clave `cita-session` se conserva en `localStorage` y `sessionStorage`. La restauración comprueba el perfil con el servidor antes de autorizar el panel. Si solo hay un token en `sessionStorage`, se copia a `localStorage` después de que el perfil se valida y el almacenamiento está disponible. El servidor conserva la autoridad sobre el vencimiento y la revocación.
- Un 401 de una petición con el token actual retira el estado del panel y las copias locales correspondientes. El rechazo de credenciales en el formulario mantiene el error del servidor y permite reintentar. Otra pestaña puede retirar o sustituir el acceso sin que la pestaña anterior borre la nueva sesión persistida. Un fallo temporal de transporte conserva el token para un reintento.
- Se cotejaron `/auth/login`, `/auth/logout`, `/auth/profile`, `/auth/activar-administrador`, `/auth/recuperar-contrasena` y `/auth/cambiar-contrasena` con los controladores y DTO del backend. Los cuerpos mantienen `email`, `password`, `codigo`, `correo`, `nombre`, `passwordActual` y `nuevaPassword` según cada ruta. También se conservaron `Authorization`, los campos de respuesta `accessToken`, `usuario` y `user`, los roles, códigos, mensajes y atributos nativos de formularios.
- La política al establecer una contraseña mantiene 12 caracteres, 72 bytes UTF-8 y coincidencia con la confirmación. El formulario de ingreso delega la comprobación de credenciales al servidor.

## Verificación

- Pasaron las 20 pruebas unitarias específicas y las 295 pruebas de `npm test`. La compilación y `git diff --check` terminaron correctamente. La búsqueda de imports, selectores y del evento anteriores en `src/` y `tests/` no encontró referencias residuales dentro del conjunto.
- Pasaron 27 pruebas de Edge con API simulada, incluidas 8 de autenticación y persistencia y 19 de refresco y errores en Agenda y Clientes. La cobertura incluye reintento después de un 401 de credenciales, foco al mostrar un error, visibilidad de contraseña, activación y recuperación por código, restauración del perfil, vencimiento, cierre entre pestañas y aislamiento de la demo. Se generaron 12 capturas y se revisaron las tres pantallas a 1366 y 390 px en ambos temas y se comprobó que no desborden horizontalmente.
- El backend y su base de datos quedaron fuera de la ejecución. Las pruebas de navegador que usan MariaDB recibieron los selectores nuevos y su ejecución queda pendiente.

Para repetir los casos de navegador sin MariaDB:

```sh
npm run test:browser -- --config tests/m4-navegador.config.js sesion.persistencia autenticacion.flujos agenda.refresco-errores
```
