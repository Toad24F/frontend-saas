# Portal público: navegación por días con horarios

## Cambio y motivo

En el paso de fecha y hora del portal conectado, la tira muestra únicamente días para los que la API pública devolvió al menos un horario. Se quitaron las flechas y el recorte de siete días: todos los días disponibles de la ventana consultada permanecen accesibles mediante el desplazamiento horizontal. Al cambiar la fecha, la tira intenta colocar la seleccionada en segundo lugar si existe una anterior y hay espacio para desplazarla. El campo de fecha sigue permitiendo saltar a una fecha lejana; si está vacía, se conserva el aviso de ausencia de horarios.

La consulta pasa de un día a una ventana de hasta 31 días, límite admitido por `GET /publico/negocios/:slug/disponibilidad`. Las ranuras se agrupan por fecha local usando la zona horaria que devuelve la sucursal. No se inventan horarios ni se interpreta un error de red como un día vacío. Cada cambio de fecha vuelve a consultar disponibilidad; el apartado mantiene su propia comprobación posterior.

## Ajuste de interacción y presentación

La tira conserva sus fechas durante la consulta al pulsar un día disponible. La vista restaura el desplazamiento horizontal cuando la fecha no cambió y desplaza la nueva selección hacia el segundo lugar cuando cambió; el control enfocado se recupera después del render. Al usar el calendario para una fecha que no estaba en la lista, se vacían las fechas previas hasta recibir la nueva respuesta. Un error sigue limpiando los datos de disponibilidad.

Las tarjetas de fecha toman las proporciones y el tratamiento terracota de la demo, con un hover más tenue que la selección y colores basados en los tokens claros/oscuros del portal. El encabezado indica «Horarios disponibles para [fecha]». Los horarios conservan radios nativos para teclado y lectores de pantalla, pero el círculo deja de mostrarse; la tarjeta sigue indicando hover, foco y selección. El texto «Aún no está apartado» se retiró del horario seleccionado y del anuncio accesible; permanece la explicación separada de que la consulta no garantiza una reserva.

En móvil, la cuadrícula usa tres columnas solo a partir de 370 px de ancho de pantalla y cuando hay al menos tres horarios. En teléfonos más estrechos conserva la distribución automática de dos columnas; con uno o dos horarios no reserva una tercera columna vacía. Las filas siguen creciendo con los horarios reales, sin ocultarlos.

Se retiró «Tu tiempo importa. Tu bienestar, también.» del pie del portal conectado y de la demo. «Reservas con Citalendar» permanece alineado a la derecha.

## Alcance y archivos

- Portal conectado: `src/connected/public/selection.js`, `selection-view.js`, `accessibility.js`, `entry.js` y `style.css`.
- Pie de la demo: `src/demo/screens/reservas/booking.js` y `style.css`.
- Pruebas: `tests/portal-publico-seleccion.test.js`.
- La demo ya filtra días sin horarios mediante `nextDates`; no usa la API pública y conserva su comportamiento ficticio.
- Los estilos emplean las variables actuales de ambos temas y la tira permite desplazamiento horizontal en móvil.

## Comprobación

- `npm test`: 159 pruebas correctas; comprueba fechas vacías ocultas, todas las fechas disponibles de la ventana, salto lejano y tira visible durante una nueva consulta.
- `npm run build`: correcto.
- `git diff --check`: correcto; solo avisos de normalización LF/CRLF.
- Revisión visual en navegador pendiente: Vite inició en `127.0.0.1:5174`, pero el navegador integrado no pudo acceder a ese puerto (`ERR_CONNECTION_TIMED_OUT`). La suite de navegador del repositorio crea una base efímera y compila el backend, por lo que no se ejecutó bajo la restricción de backend solo lectura.

## Límite

La posición segunda depende de que exista un día disponible anterior dentro de los 31 días consultados. Si no existe en esa ventana, el seleccionado queda primero. El selector nativo de fecha no puede desactivar días individuales; al elegir uno sin horarios muestra el estado vacío y permite cambiarlo.
