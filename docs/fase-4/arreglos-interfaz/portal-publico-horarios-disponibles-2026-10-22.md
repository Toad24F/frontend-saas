# Portal público: navegación por días con horarios

## Cambio y motivo

En el paso de fecha y hora del portal conectado, la tira muestra únicamente días para los que la API pública devolvió al menos un horario. El día elegido aparece en segunda posición cuando hay un día disponible anterior dentro de la ventana consultada. Las flechas desplazan la búsqueda tres días calendario y seleccionan el primer día disponible en la dirección elegida. El campo de fecha sigue permitiendo saltar a una fecha lejana; si está vacía, se conserva el aviso de ausencia de horarios.

La consulta pasa de un día a una ventana de hasta 31 días, límite admitido por `GET /publico/negocios/:slug/disponibilidad`. Las ranuras se agrupan por fecha local usando la zona horaria que devuelve la sucursal. No se inventan horarios ni se interpreta un error de red como un día vacío. Cada cambio de fecha vuelve a consultar disponibilidad; el apartado mantiene su propia comprobación posterior.

## Alcance y archivos

- Portal conectado: `src/connected/public/selection.js`, `selection-view.js` y `style.css`.
- Pruebas: `tests/portal-publico-seleccion.test.js`.
- La demo ya filtra días sin horarios mediante `nextDates`; no usa la API pública y conserva su comportamiento ficticio.
- Los estilos emplean las variables actuales de ambos temas y la tira permite desplazamiento horizontal en móvil.

## Comprobación

- `npm test`: 158 pruebas correctas, incluidas fechas vacías ocultas, selección en segunda posición, flechas y salto lejano.
- `npm run build`: correcto.
- `git diff --check`: correcto; solo avisos de normalización LF/CRLF.
- Revisión visual en navegador pendiente: Vite no pudo escuchar en `127.0.0.1:5173` por `EACCES` en este entorno.

## Límite

La posición segunda depende de que exista un día disponible anterior dentro de los 31 días consultados. Si no existe en esa ventana, el seleccionado queda primero. El selector nativo de fecha no puede desactivar días individuales; al elegir uno sin horarios muestra el estado vacío y permite cambiarlo.
