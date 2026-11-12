# Módulo 4 — seguimiento del frontend

Alcance implementado en frontend: **M4-T088–M4-T096**. Fecha: 2026-11-11. Este seguimiento pertenece al frontend; el [plan original del backend](../../../backend/docs/fase-5-modulo-4/tareas.md) se consultó en modo de solo lectura.

Evidencia: [archivos, flujo, tests primero, verificaciones y límites](resultados-tareas/m4-t088-t092.md).

Corrección visual conservada: [agenda con el diseño de la demo](resultados-tareas/ajuste-agenda-paridad-demo-2026-11-11.md). Nuevo lote autorizado: [alta manual, recuperación y estado, T093–T096](resultados-tareas/m4-t093-t096.md).

Refinamiento visual solicitado después del lote: [skeleton, leyenda superior, métricas compactas, citas distinguibles y paneles laterales](resultados-tareas/agenda-carga-estados-paneles-2026-11-11.md). Se aplica a demo/conectado y no cierra tareas posteriores a T096.

- [x] **M4-T088 — Habilitar navegación por rol.** Agenda para Administración, Recepción y Profesional; Clientes solo para Administración/Recepción. Rutas directas y barra móvil conservan el alcance autorizado.
- [x] **M4-T089 — Crear cliente HTTP de agenda y clientes.** Lecturas reales mediante el cliente autenticado, sin identidad elegida en el navegador ni respaldo ficticio ante fallos.
- [x] **M4-T090 — Conectar vistas día, semana y mes.** Periodo completo de 1, 7 o 42 fechas; sin paginación del calendario, ni truncamiento ante exceso; zonas históricas por cita.
- [x] **M4-T091 — Conectar filtros y búsqueda de agenda.** Sucursal, Profesional, estado y nombre se envían al servidor al aplicar filtros; las respuestas fuera de orden no reemplazan la consulta vigente.
- [x] **M4-T092 — Conectar detalle e historial de cita.** Snapshot autorizado con origen, estado, contacto, notas, costo y horario; eventos reales paginados con actor y valores anteriores/nuevos.

- [x] **M4-T093 — Construir formulario manual conectado.** Administración y Recepción eligen ficha por ID o persona nueva; el servidor establece costo, fin y resultado. Demo actualizada con selección explícita de ficha.
- [x] **M4-T094 — Conectar selección de disponibilidad manual.** Solo permite seleccionar ranuras devueltas por el motor privado en modalidad manual; cambiar combinación/fecha invalida la consulta y un fallo no se presenta como agenda llena.
- [x] **M4-T095 — Conectar preparación y recuperación manual.** Guarda la misma clave y selección antes de preparar; doble envío, respuesta perdida y recarga pasan por resolución antes de permitir otra cita. Solo un resultado terminal reconocido libera el formulario.
- [x] **M4-T096 — Conectar cambio de estado.** Administración y Recepción envían estado, versión observada y motivo opcional; conflicto o respuesta incierta exigen actualizar detalle, sin sobrescribir automáticamente.

**Punto de parada: T096.** T097 y posteriores siguen pendientes. Clientes solo incorpora navegación; su búsqueda se utiliza dentro del alta manual, sin implementar la pantalla de directorio ni la edición de fichas de T098–T099. No se cierra el módulo ni se acreditan pruebas contra API/base real de T104 y posteriores.
