let filtros;

export function filtrosResumen(hoy, alcance) {
  if (filtros?.hoy !== hoy || filtros.alcance !== alcance) {
    filtros = { hoy, alcance, fecha: hoy, estado: '' };
  }
  return filtros;
}

function segmentoPulsado(evento, dona) {
  const { left, top, width, height } = dona.getBoundingClientRect();
  const x = evento.clientX - left - width / 2;
  const y = evento.clientY - top - height / 2;
  const distancia = Math.hypot(x, y) / (width / 2);
  if (distancia < 0.74 || distancia > 1) return null;
  const giro = ((Math.atan2(x, -y) * 180 / Math.PI + 360) % 360) / 360;
  return [...dona.querySelectorAll('[data-resumen-segmento]')].find((segmento) => giro < Number(segmento.dataset.resumenFin))?.dataset.resumenSegmento;
}

export function handleFiltrosResumen(evento, render) {
  const fecha = evento.target.closest('[data-resumen-fecha]');
  const estado = evento.target.closest('[data-resumen-estado]');
  const dona = evento.target.closest('[data-resumen-dona]');
  const limpiar = evento.target.closest('[data-resumen-limpiar]');
  if (!filtros || !(fecha || estado || dona || limpiar)) return false;

  let selector;
  if (fecha) {
    filtros.fecha = fecha.dataset.resumenFecha;
    selector = `[data-resumen-fecha="${filtros.fecha}"]`;
  } else {
    const siguiente = limpiar ? filtros.estado : estado?.dataset.resumenEstado ?? segmentoPulsado(evento, dona);
    if (!siguiente) return true;
    filtros.estado = siguiente === filtros.estado ? '' : siguiente;
    selector = `[data-resumen-estado="${siguiente}"]`;
  }
  render();
  (document.querySelector(selector) || document.querySelector('#resumen-citas-titulo'))?.focus({ preventScroll: true });
  return true;
}
