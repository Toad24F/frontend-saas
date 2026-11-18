export function renderMedidorCupo(etiqueta, activos, limite, disponibles) {
  const porcentaje = limite > 0 ? Math.round(activos / limite * 100) : 0;
  const estado = activos >= limite ? 'lleno' : porcentaje >= 80 ? 'aviso' : 'normal';
  return `<div class="cupo-medidor cupo-medidor-${estado}"><div class="cupo-medidor-encabezado"><strong>${etiqueta}</strong><span>${activos} de ${limite}</span></div><meter min="0" max="${Math.max(1, limite)}" value="${Math.min(activos, limite)}" aria-label="${etiqueta}: ${activos} de ${limite}">${porcentaje}%</meter><div class="cupo-medidor-leyenda"><span>${disponibles === 0 ? 'Sin cupo disponible' : `${disponibles} disponibles`}</span><span>${porcentaje}% utilizado</span></div></div>`;
}
