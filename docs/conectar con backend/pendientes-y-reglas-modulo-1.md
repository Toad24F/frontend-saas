# Pendientes y reglas del módulo 1

**Revisión:** 11 de octubre de 2026. Inventario de la versión conectada tras revisar las consultas individuales. Se contrastaron los controladores y servicios actuales del backend con las llamadas del frontend. El contrato detallado está en [actual.md](actual.md); las implementaciones previas se describen en [paso 1](resultado-navegacion-formularios-modulo-1.md), [paso 2](resultado-paso-2-modulo-1.md), [paso 3](resultado-paso-3-modulo-1.md), [estados y baja de profesionales](resultado-estados-baja-profesionales.md), [cupo y baja de sucursales](resultado-cupo-baja-sucursales.md), [baja de servicios](resultado-baja-servicios.md) y [consultas individuales](resultado-consultas-individuales.md).

## Estado de endpoints existentes

### Operaciones útiles para cerrar el módulo 1

Ya se conectaron las operaciones de alta, edición, activación, desactivación y baja condicionada de los catálogos disponibles. No quedan operaciones de catálogo pendientes con la API actual.

### Consultas individuales revisadas

| Endpoint | Estado | Criterio |
| --- | --- | --- |
| `GET /profesionales/:id` | Conectado al abrir Editar profesional como AN. | Se refrescan perfil, asignaciones y opciones de catálogo antes de mostrar el formulario. |
| `GET /sucursales/:id` | Conectado al abrir Editar sucursal. | Evita editar los campos de una ficha anterior a los cambios de otra sesión. |
| `GET /servicios/:id` | Conectado al abrir Editar servicio. | Evita editar los campos y verificar autoría desde una ficha antigua. |
| `GET /profesionales/:id/sucursales/:sucursalId/atencion` | Sin llamada directa; cubierta por `GET /profesionales/:id/oferta`. | La oferta ya aporta `atencionActiva` y se refresca tras cambiar el interruptor. |

`GET /` es la respuesta de ejemplo de Nest (`Hello World!`), no una función de producto pendiente de pantalla. Que un endpoint de lectura no tenga llamada individual no significa necesariamente que falte una capacidad para el usuario.

## Paso 4: dependencias que el backend aún no expone

- Agenda operativa y citas, datos de clientes y reserva pública: faltan rutas de consulta y gestión, además de disponibilidad reservable. La proyección `GET /profesionales/:id/atencion` devuelve tramos de trabajo y omisiones; no devuelve espacios de cita.
- Recepción todavía no tiene permisos ni rutas para gestionar agenda, citas o clientes. Su pantalla conectada sigue limitada a cuenta y licencia.
- Métricas de actividad, ingresos, reportes PDF, WhatsApp y notificaciones de citas carecen de API operativa. El panel de superadministración solo puede usar negocios, licencias, cupos y envíos existentes.
- Tampoco hay rutas para que AN edite datos generales del negocio, para editar nombre/correo de recepcionistas ni para que P edite su especialidad.

## Reglas guardadas para los siguientes cambios

1. **Diseño:** conservar el estilo actual: estructura, componentes, colores, tipografía, animaciones, efectos, tema claro/oscuro y respuesta móvil. Aplicar `ui-ux-pro-max` a decisiones de interfaz sin sustituir la identidad visual existente.
2. **Separación:** mantener la demo aislada de la versión conectada. Colocar pantallas, JS y CSS nuevos en el módulo correspondiente; conservar el código compartido solo cuando ambas versiones lo usan de verdad.
3. **Datos reales:** en la versión conectada, usar exclusivamente capacidades y estados que expone el backend. No presentar datos simulados de citas, ingresos o reservas como si fueran reales ni prometer acciones que no tengan API.
4. **Roles:** SA gestiona negocios, invitaciones, cupos y licencias; AN gestiona recursos de su negocio; P opera sus propios servicios, sucursales asignadas, horarios, excepciones y bloqueos dirigidos a su perfil; R solo tiene cuenta y vigencia hasta que existan rutas operativas. La autorización final siempre corresponde al backend.
5. **Bajas y estados:** distinguir eliminar de desactivar. Pedir confirmación antes de una baja, mostrar el resultado 204 y el error 409 sin ocultarlo. Desactivar puede conservar historial y relaciones; reactivar puede requerir nuevas validaciones de cupo u horarios.
6. **Identidad y alcance:** tomar el negocio de la sesión autenticada, no de campos inventados en formularios. Usar el ID de perfil profesional para `/profesionales/:id`, el ID de licencia para `/licencias/:id` y el ID de sucursal asignada en las rutas por sucursal.
7. **Disponibilidad:** mantener separados selección general de servicios, selección por sucursal, atención individual, horario semanal, excepción y bloqueo. La oferta efectiva explica estados; la proyección de atención no confirma citas ni aplica selección de servicios o el interruptor individual.
8. **Validación y errores:** enviar solo campos admitidos por cada DTO; respetar `null`, arreglos vacíos, fechas civiles y respuestas 204. Mostrar errores 400/403/404/409 cerca de la acción y actualizar la vista tras una mutación confirmada.
9. **Verificación y registro:** probar las transformaciones o permisos que representen un riesgo concreto, ejecutar pruebas y compilación del frontend, y documentar archivos agregados, modificados o movidos junto con límites conocidos. Evitar modificar datos reales del backend durante pruebas visuales sin necesidad.

## Estado de API disponible

Los flujos de catálogo y estados previstos para el módulo 1 ya están conectados. La consulta individual de atención queda disponible para un futuro flujo que necesite refrescar solo ese interruptor; no se añade una pantalla redundante para consumirla.
