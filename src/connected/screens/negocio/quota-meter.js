export function quotaMeter(label, active, limit, available) {
  const percent = limit > 0 ? Math.round(active / limit * 100) : 0;
  const state = active >= limit ? 'full' : percent >= 80 ? 'warning' : 'normal';
  return `<div class="quota-meter quota-meter-${state}"><div class="quota-meter-heading"><strong>${label}</strong><span>${active} de ${limit}</span></div><meter min="0" max="${Math.max(1, limit)}" value="${Math.min(active, limit)}" aria-label="${label}: ${active} de ${limit}">${percent}%</meter><div class="quota-meter-caption"><span>${available === 0 ? 'Sin cupo disponible' : `${available} disponibles`}</span><span>${percent}% utilizado</span></div></div>`;
}
