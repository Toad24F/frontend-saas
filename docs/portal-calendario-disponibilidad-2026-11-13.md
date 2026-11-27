# Calendario mensual de disponibilidad del portal

## Cambio y motivo

El selector de fecha nativo permitía señalar días sin horarios, porque no admite desactivar fechas aisladas según una respuesta de disponibilidad. El portal conectado presenta un mes a la vez y solo habilita los días de ese mes presentes en las ranuras públicas devueltas por el backend; los demás aparecen grises y desactivados. Seleccionar una fecha consulta sus horarios sin cambiar el mes mostrado. Solo las flechas anterior y siguiente cambian el mes. La selección de horario y el apartado siguen revalidándose en el servidor.

La demo presenta el mismo mes a la vez y solo cambia de mes con sus flechas. Su disponibilidad sigue siendo ficticia y se limita a los próximos 45 días; no se atribuye al backend.

## Alcance

- Portal conectado, temas claro y oscuro, escritorio y móvil: `src/connected/portal-publico/seleccion.flujo.js`, `seleccion.vista.js` y `portal.estilos.css`.
- Portal demo, temas claro y oscuro, escritorio y móvil: `src/demo/screens/reservas/reserva.vista.js` y `reserva.estilos.css`.
- Pruebas de selección: `tests/portal-publico.seleccion.test.js`.

El calendario conectado consulta desde hoy hasta el último día del mes actual y el mes completo al navegar a un mes posterior. Refleja la disponibilidad de la última consulta. La API conserva la autoridad sobre reglas de anticipación, horizonte, horarios, ocupaciones y licencia. Una ranura puede dejar de estar libre después de la consulta; la revalidación anterior al apartado sigue siendo necesaria. La navegación del calendario demo respeta su horizonte ficticio de 45 días.

## Comprobación

Verificado el 27 de noviembre de 2026: `node --test tests/portal-publico.seleccion.test.js` (21/21), `npm test` (320/320), `npm run build` y `git diff --check`. En el navegador local comprobé que seleccionar un día conserva el mes y que la flecha cambia al siguiente, en el portal conectado y en la demo. También revisé escritorio oscuro y móvil claro en ambos modos; no se observó desbordamiento horizontal en móvil.
