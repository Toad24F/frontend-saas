# Calendario de fechas disponibles del portal

## Cambio y motivo

El selector de fecha nativo permitía señalar días sin horarios, porque no admite desactivar fechas aisladas según una respuesta de disponibilidad. El portal conectado muestra ahora los 31 días de la ventana consultada: solo habilita los días presentes en las ranuras públicas devueltas por el backend; los demás aparecen grises y desactivados. Los controles anterior y siguiente consultan ventanas contiguas. La selección de horario y el apartado siguen revalidándose en el servidor.

La demo presenta un calendario equivalente para sus próximos 45 días, calculado con su motor ficticio. No atribuye esos datos al backend.

## Alcance

- Portal conectado, temas claro y oscuro, escritorio y móvil: `src/connected/public/selection.js`, `selection-view.js` y `style.css`.
- Portal demo, temas claro y oscuro, escritorio y móvil: `src/demo/screens/reservas/booking.js` y `style.css`.
- Pruebas de selección: `tests/portal-publico-seleccion.test.js`.

El calendario conectado refleja la disponibilidad de la última consulta. La API conserva la autoridad sobre reglas de anticipación, horizonte, horarios, ocupaciones y licencia. Una ranura puede dejar de estar libre después de la consulta; la revalidación anterior al apartado sigue siendo necesaria. El calendario de la demo usa únicamente datos ficticios.

## Comprobación

Se ejecutaron `node --test tests/portal-publico-seleccion.test.js` (21/21), `npm test` (281/281), `npm run build` y `git diff --check`. No se pudo iniciar Vite desde este entorno para la revisión visual: el sistema devolvió `listen EACCES` en `127.0.0.1:5173`. Queda pendiente revisar visualmente escritorio y móvil en ambos temas y ambos modos desde un navegador con acceso al servidor de desarrollo.
