# Cobertura de pantallas

| Requisito | Implementación del prototipo | Integración pendiente |
| --- | --- | --- |
| Vanilla JS, Fetch, responsive | Módulos ES, fetch de fixture, router sin recarga, Bootstrap 5 | API real |
| Catálogo y múltiples sucursales | Listado, alta y edición en memoria | Persistencia y validación del servidor |
| Dos tenants y slugs | Dos recorridos de ejemplo y selector de negocio | Resolución del slug y serialización pública en API |
| Anti-IDOR | Selector local con pertenencia y documentación de FKs compuestas | Sesiones, roles, consultas acotadas, pruebas de integración |
| Disponibilidad | Días, sucursal, inicio/fin y descanso por profesional | Persistir bloques separados, más de un descanso y horarios fuera de 09–18 |
| Duración/colisiones/cierre | Motor local con intervalos de 15 minutos | Tiempo del servidor y exclusión transaccional |
| Ventana libre / compacta | Opciones por negocio; compacto prioriza bordes y primer día hábil | Estrategia del servidor y búsqueda paginada de días |
| Excepciones | Alta y eliminación de bloqueos por rango | Auditoría y resolución de citas existentes |
| Flujo de seis pasos | Selecciones, contacto, temporizador y folio | Token opaco y creación transaccional |
| Nombre/teléfono/motivo | Nombre y apellido, 10 dígitos, motivo opcional | Revalidar y limitar solicitudes en API |
| Calendario día/semana/mes | Navegación de periodos, filtros y cinco estados | Sincronización y actualizaciones concurrentes |
| Agendamiento manual | Formulario con horarios disponibles y reflejo en agenda | Permisos de recepcionista/profesional |
| WhatsApp | Vista previa, automatizaciones y listado ilustrativo | Proveedor, worker, recordatorios y reintentos |
| Reporte PDF | Filtros, tablas y hoja de impresión para Guardar como PDF | Generador PDF con datos reales |
| Sin pagos | Solo precios informativos | No aplica |
| Diccionario + SQL | Archivos de referencia en docs y db | Ejecutar y verificar en una base vacía |
| Código documentado | README, módulos por responsabilidad, arquitectura | Backend e integración futura |

Los cambios de estado son una demostración. La transición Cancelada requiere confirmación; reactivar una cita con colisión se rechaza. En la API se debe definir una máquina de estados completa, incluyendo quién puede corregir datos históricos.
