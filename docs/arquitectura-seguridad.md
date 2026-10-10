# Alcance, arquitectura y contrato para el backend futuro

## Separación de responsabilidades

La demo no autentica usuarios ni atiende peticiones de negocio en el servidor. `src/demo/data.js` carga un fixture público con `fetch`. Todos los identificadores y filtros del cliente son manipulables. El selector `resource(tabla,id,tenantId)` verifica la pertenencia para mantener coherencia visual, sin constituir un límite de seguridad. La versión conectada usa la API del backend y su autenticación.

Para producción, la API debe derivar `negocio_id` exclusivamente de una sesión autenticada, validar cuenta/licencia activa y aplicar permisos en **cada** lectura o escritura. Debe rechazar o ignorar `tenant_id` suministrado por el cliente, dependiendo del contrato de la ruta. La cuenta de superadministración necesita rutas y permisos explícitos y auditoría independiente.

## Matriz propuesta

| Rol                      | Lectura y escritura autorizada                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Público                  | Catálogo activo, ubicaciones y disponibilidad del slug resuelto; apartar/crear una cita usando token opaco y validaciones del servidor. Nunca listados de clientes ni de citas. |
| Recepcionista            | Citas y clientes de su negocio; consulta de catálogos.                                                                                                                          |
| Profesional              | Su disponibilidad y sus citas, con pertenencia al negocio y al profesional.                                                                                                     |
| Administrador de negocio | Operación y configuración de su propio negocio.                                                                                                                                 |
| Superadministrador       | Gestión de negocios y licencias en rutas específicas; acceso a información de pacientes solo si se define y autoriza expresamente.                                              |

## Anti-IDOR

Un ID opaco, una URL difícil de adivinar o un filtro visual no sustituyen autorización. El servidor debe verificar simultáneamente el identificador y la pertenencia, incluso para búsquedas, exportación PDF, mensajes WhatsApp y acciones masivas.

```sql
-- :negocio_sesion se obtiene de la sesión verificada, no del body ni del slug.
SELECT * FROM citas
WHERE id = :cita_id AND negocio_id = :negocio_sesion;

UPDATE citas
SET estado = :estado
WHERE id = :cita_id AND negocio_id = :negocio_sesion;
```

Devolver un resultado uniforme de recurso no disponible para IDs inexistentes y ajenos. Validar también que cliente, servicio, profesional y sucursal pertenecen al negocio y que el profesional ofrece ese servicio en esa sucursal. El esquema utiliza FKs compuestas como defensa adicional ante relaciones inconsistentes. MySQL/MariaDB no proporcionan aislamiento automático por tenant a partir de estas FKs: las consultas aún requieren ámbito de sesión.

El portal resuelve un slug activo en el servidor y serializa solo propiedades públicas. Nunca debe descargar todos los negocios y luego ocultarlos con JavaScript, como hace explícitamente el fixture de este prototipo.

## Apartamientos y concurrencia

La validación cliente es informativa. En la futura API, apartar, confirmar, reactivar y mover citas deben usar el mismo protocolo transaccional:

1. Verificar sesión o token público, negocio activo y relaciones válidas.
2. Crear si no existe la fila `agenda_mutex(negocio_id, personal_id, fecha)` con upsert.
3. Bloquear esa fila con `SELECT ... FOR UPDATE` dentro de la transacción. Para reprogramar, adquirir días/profesionales en orden estable para evitar deadlocks.
4. Recalcular horario, descansos, bloqueos, citas activas y apartamientos con `expira_en > UTC_TIMESTAMP(3)`.
5. Detectar solapamiento con `existente.inicio < nuevo.fin AND existente.fin > nuevo.inicio`. Un índice único por hora inicial no cubre duraciones diferentes.
6. Crear o consumir un lock de token aleatorio; almacenar solo su hash. Vincularlo a negocio, profesional, servicio, sucursal, fecha, duración y sesión de reserva. Revalidar expiración al confirmar.
7. Insertar la cita y una notificación pendiente en la misma transacción, consumir el apartamiento y confirmar el commit. Un worker procesa WhatsApp con idempotencia y reintentos.

Expirar locks lógicamente en cada consulta; una tarea de limpieza puede borrar los vencidos después. El abandono no depende de que el navegador envíe un evento. El servidor debe emplear su propio reloj y convertir la zona IANA del negocio a UTC en las fronteras necesarias. `fecha`/`hora` en las tablas de agenda representan hora local del negocio; las marcas técnicas `expira_en`, `programado_en` y `enviado_en` son UTC.

## Contrato HTTP propuesto (no implementado)

| Método/ruta                                     | Ámbito y respuesta                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /api/public/reservas/:slug/catalogo`       | Resolver negocio activo, devolver servicios/sucursales públicos.                       |
| `GET /api/public/reservas/:slug/disponibilidad` | Validar IDs del slug; devolver solo slots disponibles y zona horaria.                  |
| `POST /api/public/reservas/:slug/locks`         | Apartamiento transaccional, token opaco, expiración; limitar solicitudes.              |
| `POST /api/public/reservas/:slug/citas`         | Consumir lock válido, validar nombre/teléfono, devolver folio y resumen mínimo.        |
| `GET /api/citas`                                | Sesión, rol y tenant; filtros de rango y paginación.                                   |
| `PATCH /api/citas/:id`                          | Sesión, rol, pertenencia y transición válida; transacción cuando libere/ocupe horario. |
| `GET /api/reportes/citas.pdf`                   | Sesión, tenant y rango limitado; ingresos con `precio_acordado`.                       |
| `POST /api/plataforma/negocios`                 | Solo superadministración con auditoría.                                                |

## Medidas a implementar con la API

Cookies de sesión HttpOnly/Secure/SameSite, CSRF cuando corresponda, CORS con orígenes explícitos, validación de DTOs, escape contextual de contenido, CSP y límites de frecuencia. No exponer hashes, tokens, datos de pacientes ni respuestas sensibles de proveedores en logs. Secretos únicamente en variables del servidor. Documentar retención y consentimiento antes de recolectar información real.

## Pruebas de aceptación futuras

Con dos sesiones reales A y B: probar leer/editar/cancelar citas, obtener clientes, cambiar servicios y exportar reportes de B con A, incluyendo IDs existentes, inexistentes, masivos y `tenant_id` falsificado. Verificar también rol de profesional, negocio suspendido y slug ajeno. Lanzar solicitudes simultáneas para intervalos iguales y parcialmente solapados; solo una debe obtener el espacio. Estos criterios **no están certificados por las pruebas de este frontend**.
