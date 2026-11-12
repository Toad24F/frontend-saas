import { icon } from '../../icons.js';
import { escape as esc } from '../../ui.js';
import { statuses } from '../../data.js';
import { calendarColumns } from '../../calendar-layout.js';

// Componentes de presentación compartidos: demo y conectado conservan los mismos estados y jerarquía.
export function agendaLegend() {
  return `<div class="legend agenda-legend" role="list" aria-label="Estados de las citas">${Object.entries(statuses).map(([status, label]) => `<span role="listitem"><i class="legend-dot ${status}" aria-hidden="true"></i>${label}</span>`).join('')}</div>`;
}
export function agendaMetrics(appointments, day, { loading = appointments == null } = {}) {
  const items = appointments?.filter((item) => item.date === day);
  const count = (status) => items == null ? null : status ? items.filter((item) => item.status === status).length : items.length;
  return `<div class="stats-grid agenda-stats" aria-label="Resumen del día ${esc(day)}" aria-busy="${loading}">${loading ? '<span class="visually-hidden" role="status">Cargando resumen del día…</span>' : ''}${[
    [count(), 'Citas del día', 'calendar', 'orange'], [count('confirmada'), 'Confirmadas', 'circleCheck', 'blue'],
    [count('pendiente'), 'Por confirmar', 'clock', 'amber'], [count('completada'), 'Completadas', 'check', 'green'],
  ].map(([number, label, image, color]) => `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(image)}</span></div><div class="stat-number">${number == null ? loading ? '<span class="skeleton-fill skeleton-number" aria-hidden="true"></span>' : '<span class="stat-unavailable">Sin datos</span>' : String(number).padStart(2, '0')}</div></div>`).join('')}</div>`;
}
export function calendarSkeleton(view) {
  const month = view === 'month', days = view === 'day' ? 1 : 7;
  const content = month
    ? `<div class="skeleton-month">${Array.from({ length: 7 }, () => '<div class="skeleton-month-label"><span class="skeleton-fill"></span></div>').join('')}${Array.from({ length: 42 }, () => '<div class="skeleton-month-cell"><span class="skeleton-fill"></span></div>').join('')}</div>`
    : `<div class="week-calendar ${days === 1 ? 'single-day' : ''}"><div class="skeleton-week-header" style="--skeleton-days:${days}"><span></span>${Array.from({ length: days }, () => '<span><i class="skeleton-fill"></i></span>').join('')}</div><div class="skeleton-week-body" style="--skeleton-days:${days}"><span></span>${Array.from({ length: days }, () => '<span></span>').join('')}</div></div>`;
  // Ningún placeholder tiene estado, paciente ni acción de cita; solo comunica carga sin datos ficticios.
  return `<div data-agenda-skeleton class="agenda-skeleton" aria-busy="true"><span class="visually-hidden" role="status">Cargando citas…</span><div class="${month ? 'month-scroll' : 'calendar-scroll'}" aria-hidden="true">${content}</div></div>`;
}
export function eventReference(folio, id) {
  return `<span class="event-folio" aria-hidden="true">#${esc(folio ? String(folio).slice(-5) : id)}</span>`;
}
const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) + Number(value.slice(6, 8) || 0) / 60;
const clock = (value) => {
  const seconds = Math.round(value * 60);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
export function eventLayout(items, firstMinute = 540, hourHeight = 96) {
  // Reservar también la huella visual mínima evita superposición de citas breves sin cambiar su duración real.
  const minimum = 44, gap = 4, visualMinutes = (minimum + gap) / hourHeight * 60;
  const footprints = items.map((item) => ({ ...item, start: clock(minutes(item.start)), end: clock(Math.max(minutes(item.end), minutes(item.start) + visualMinutes)) }));
  const columns = calendarColumns(footprints);
  return new Map(items.map((item) => {
    const { lane, width } = columns.get(item.id);
    const footprint = footprints.find((x) => x.id === item.id);
    let span = 1;
    for (let next = lane + 1; next < Math.round(100 / width); next++) {
      if (footprints.some((other) => columns.get(other.id).lane === next && other.start < footprint.end && other.end > footprint.start)) break;
      span++;
    }
    return [item.id, { top: (minutes(item.start) - firstMinute) / 60 * hourHeight + gap / 2,
      height: Math.max((minutes(item.end) - minutes(item.start)) / 60 * hourHeight - gap, minimum), left: lane * width, width: width * span, baseWidth: width }];
  }));
}
