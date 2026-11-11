# Módulo 4 — seguimiento del frontend

Alcance autorizado: **M4-T088–M4-T092**. Fecha: 2026-11-11. Este seguimiento pertenece al frontend; el [plan original del backend](../../../backend/docs/fase-5-modulo-4/tareas.md) se consultó en modo de solo lectura.

Evidencia: [archivos, flujo, tests primero, verificaciones y límites](resultados-tareas/m4-t088-t092.md).

Corrección solicitada antes del commit: [agenda con el diseño de la demo](resultados-tareas/ajuste-agenda-paridad-demo-2026-11-11.md). Se conservan cerradas solo T088–T092; no se implementan tareas posteriores.

- [x] **M4-T088 — Habilitar navegación por rol.** Agenda para Administración, Recepción y Profesional; Clientes solo para Administración/Recepción. Rutas directas y barra móvil conservan el alcance autorizado.
- [x] **M4-T089 — Crear cliente HTTP de agenda y clientes.** Lecturas reales mediante el cliente autenticado, sin identidad elegida en el navegador ni respaldo ficticio ante fallos.
- [x] **M4-T090 — Conectar vistas día, semana y mes.** Periodo completo de 1, 7 o 42 fechas; sin paginación del calendario, ni truncamiento ante exceso; zonas históricas por cita.
- [x] **M4-T091 — Conectar filtros y búsqueda de agenda.** Sucursal, Profesional, estado y nombre se envían al servidor al aplicar filtros; las respuestas fuera de orden no reemplazan la consulta vigente.
- [x] **M4-T092 — Conectar detalle e historial de cita.** Snapshot autorizado con origen, estado, contacto, notas, costo y horario; eventos reales paginados con actor y valores anteriores/nuevos.

**Punto de parada: T092.** T093 y posteriores permanecen fuera del lote. La pantalla Clientes solo incorpora navegación y aviso de conexión pendiente; listado y gestión de fichas siguen en T098–T099. No se cierra el módulo ni se acreditan pruebas contra API/base real de T104 y posteriores.
