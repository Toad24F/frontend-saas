# Resultado del paso 2 del módulo 1

**Fecha:** 10 de octubre de 2026. **Alcance:** dashboard y detalle para superadministración; activación/recuperación reales; gestión de recepcionistas; cuenta y vigencia de licencia. Contrato contrastado con [actual.md](actual.md) y los controladores del backend.

## Archivos agregados y modificados

No se movieron archivos. La demo continúa en sus módulos y las pantallas nuevas viven en `src/connected/screens`.

| Tipo | Archivos | Resultado |
| --- | --- | --- |
| Agregados | `src/connected/screens/negocio/view.js`, `actions.js`, `style.css` | Pantalla de detalle con datos del negocio, cupo, vigencia, invitación e historial de correos. Incluye corrección/reemisión de invitación, cambio de cupo, recuperación de administrador, reintento de correo y transiciones de licencia. |
| Agregados | `src/connected/screens/recepcionistas/view.js`, `actions.js`, `style.css` | Listado, alta, consulta de detalle, desactivación/reactivación y restablecimiento de contraseña. |
| Agregado | `src/connected/screens/auth/dialogs.js` | Sustituye formularios simulados por activación y recuperación con código, conectadas a `/auth/activar-administrador` y `/auth/recuperar-contrasena`. |
| Agregados | `src/connected/screens/cuenta/actions.js`, `style.css`, `src/connected/modules/auth/password-policy.js` | Cambio de contraseña propia, cierre de sesión, validación de longitud y límite de 72 bytes UTF-8. |
| Modificados | `src/connected/screens/cuenta/view.js`, `src/connected/screens/index.js` | Datos de cuenta y consulta de `/licencias/mi-vigencia` para administrador, profesional y recepcionista. SA ve solo su cuenta. Registro de las pantallas nuevas. |
| Modificados | `src/shared/screens/plataforma/view.js`, `src/shared/screens/plataforma/actions.js` | El panel SA usa negocios, licencias e historial de envíos reales. Se conservaron las vistas de la demo. El alta de negocio identifica el correo como el del administrador. |
| Modificados | `src/connected/modules/datos/load.js`, `src/connected/modules/permisos/pages.js`, `src/connected/modules/auth/session.js`, `src/connected/backend.js` | Carga de recepcionistas y métricas operativas SA, permisos de nuevas rutas, cierre local de sesión tras cambio de contraseña y manejo de errores de las rutas públicas. |
| Modificados | `src/shared/app.js`, `src/shared/actions.js` | Ruta con ID `/admin/negocio/:id`, retorno al panel, navegación de recepcionistas y acciones de cuenta. Se retiraron los formularios de autenticación simulados del archivo compartido. |
| Modificado | `tests/backend.test.js` | Verificación del listado de recepcionistas, resumen SA y política de contraseña. |

## Comportamiento conectado

- **Panel SA:** totales de negocios, pendientes de activación, suspensiones programadas y correos fallidos. El listado muestra estado de licencia y días restantes cuando aplica. No incluye cifras de citas o ingresos, porque el backend no las expone.
- **Detalle SA:** usa `GET /negocios/:id`, `/cupo-sucursales`, `/envios` y `/licencias/:licenciaId/vigencia`. Las acciones usan el ID de licencia para transiciones, muestran la suspensión programada a 48 horas y aclaran que renovar no elimina una suspensión. Los correos se describen como *encolados* hasta confirmar entrega.
- **Activación y recuperación:** la activación exige código, correo invitado, nombre y contraseña; la recuperación exige código y nueva contraseña. No existe registro libre ni una solicitud pública de código. El superadministrador autoriza la recuperación de un administrador activado desde el detalle.
- **Recepcionistas:** AN puede crear, ver, desactivar, reactivar y restablecer contraseña. No aparece edición de nombre/correo porque no existe ese endpoint. R sigue sin agenda operativa.
- **Mi cuenta:** todos ven identidad, rol, cambio de contraseña y cierre de sesión. AN/P/R ven vigencia, vencimiento, bloqueo programado y tiempo restante. Tras cambiar la contraseña se limpia la sesión local y se pide iniciar sesión de nuevo.

## Diseño y verificación

Se reutilizaron tarjetas, tablas, botones, modales, iconos, temas y animaciones existentes. Los CSS nuevos solo acomodan las secciones y sus acciones en escritorio y móvil; no cambian la paleta ni los efectos globales.

- `npm test`: 28 pruebas aprobadas.
- `npm run build`: compilación Vite correcta. Se ejecutó fuera del sandbox porque dentro de él `realpath` de `src/shared/app.js` devolvía `EPERM`.
- `git diff --check` y `node --check`: sin errores.
- Navegador local: comprobados dashboard SA, detalle y cuenta en la sesión disponible, además de los campos de activación/recuperación en una pestaña sin sesión. Se revisó “Mi cuenta” a 375 px. No se enviaron códigos ni se cambiaron contraseñas durante esta verificación visual.

## Siguiente paso

Quedan oferta por sucursal, excepciones, proyección de atención y edición de bloqueos del paso 3. Agenda, clientes y reservas reales siguen dependiendo de nuevas API del backend.
