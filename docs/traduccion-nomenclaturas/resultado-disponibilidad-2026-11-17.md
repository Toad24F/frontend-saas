# Resultado de traducción — Disponibilidad

Fecha: 2026-11-17

## Cambios

Se aplicó la convención `dominio.responsabilidad.extensión` en los siete subgrupos del plan. La traducción coordinó imports, vistas, formularios, estados internos, selectores CSS y atributos `data-*` con sus consumidores.

| Área | Archivos vigentes |
| --- | --- |
| Pantalla compartida | `src/shared/screens/disponibilidad/disponibilidad.vista.js`, `disponibilidad.acciones.js`, `disponibilidad.errores.js`, `disponibilidad.estilos.css` |
| Horario, pestañas, oferta y asignaciones | `disponibilidad.horario-franjas.js`, `disponibilidad.grupos.js`, `disponibilidad.oferta.js`, `disponibilidad.asignaciones-sucursales.js` |
| Bloqueos | `disponibilidad.directorio-bloqueos.js`, `disponibilidad.filtros-bloqueos.js` |
| Consultas y reglas | `disponibilidad.operativa.js`, `disponibilidad.contrato-operativo.js`, `disponibilidad.operativa.css` |
| Pantalla conectada | `src/connected/screens/disponibilidad/disponibilidad.vista.js`, `disponibilidad.acciones.js`, `disponibilidad.payload.js`, `disponibilidad.estilos.css` |
| Integración de la API | `src/connected/modules/disponibilidad/disponibilidad.configuracion.js`, `disponibilidad.payload.js` |
| Demo | `src/demo/disponibilidad.motor.js`, `src/demo/screens/disponibilidad/disponibilidad.vista.js` |

Se actualizaron los consumidores de Disponibilidad en la navegación, Agenda, el portal de demo, Clientes demo, Profesionales, Negocio y recursos inhabilitados. Para Bloqueos se conserva el paginador local común. Los puntos de entrada y las diferencias entre la demostración y el producto conectado se mantienen.

## Contratos

Se contrastaron los controladores, entradas y DTO de Disponibilidad, Bloqueos y Profesionales. Se conservaron las rutas de la SPA `/admin/disponibilidad/equipo`, `/admin/disponibilidad/negocio` y `/admin/disponibilidad/comprobar`, así como la opción `?demo=1`.

Se conservaron, entre otros, `GET /disponibilidad`, `POST /disponibilidad/validar`, `GET /disponibilidad/citas-afectadas`, `GET/PUT /disponibilidad/configuracion`, `PUT /profesionales/:id/horario`, los endpoints de asignación y oferta, y las operaciones de Bloqueos. Las consultas y respuestas siguen usando `personalId`, `sucursalId`, `servicioId`, `desde`, `hasta`, `modalidad`, `ranuras`, `omisiones`, `zonaHoraria` y los campos vigentes de configuración. El payload del horario conserva `franjas`, `diaSemana`, `orden`, `inicioMinutos`, `finMinutos` y `activo`.

El modelo de datos compartido de la demo y las interfaces que consumen Agenda y el portal conservan sus claves. Las pausas conectadas se representan con dos franjas. Los descansos dentro de una franja y las consultas simuladas siguen siendo capacidades de la demo. Los permisos y los datos de los roles se comprobaron con respuestas interceptadas.

## Verificación

- Pruebas unitarias actualizadas de grupos, horarios, franjas inactivas, errores, asignaciones, filtros de Bloqueos, configuración conectada y motor de demo.
- `npm test`: 295 aprobadas, incluidas las 58 que se ejecutaron también de forma dirigida.
- `npm run build`: correcto, 190 módulos transformados.
- `node --check` y `git diff --check`: correctos. La búsqueda en `src/` y `tests/` no encontró referencias a las rutas y selectores anteriores del conjunto.
- `tests/browser-admin-review.mjs`: completada con API simulada. Cubre asignaciones, oferta, horario, formulario de bloqueo y reglas.
- `tests/browser-local-pagination.mjs`: completada con API simulada. Cubre alcance por profesional, filtros, errores de fecha y paginación de Bloqueos sin consultas adicionales.
- Suite M4 filtrada a `disponibilidad.operativa.spec.js`, `manual.spec.js` y `agenda.spec.js`: 26 aprobadas. Los seis casos de Disponibilidad comprueban permisos de Profesional y Recepción, consulta, recuperación de un 503, validación puntual, teclado y descansos en demo.
- Revisión visual de capturas en escritorio y móvil, en claro y oscuro, para conectado y demo. Los recorridos conectados de administración también comprobaron el ancho de 320 px.

En una pasada anterior, la comparación visual de Agenda reportó una diferencia de aproximadamente 0.031 px en su cuadrícula. La prueba pasó en la ejecución final, al igual que en la primera pasada.

El backend y su base de datos quedaron fuera de la ejecución. La suite general de navegador prepara una base temporal del backend y se dejó fuera de esta verificación.
