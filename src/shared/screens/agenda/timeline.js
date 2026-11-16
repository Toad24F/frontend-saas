import { stateMenuTrigger } from './state-menu.js';
import { icon } from '../../icons.js';
import { escape as esc } from '../../ui.js';
import { statuses } from '../../data.js';
import { eventLayout } from './presentation.js';
import { attentionGaps, attentionUnavailableReason, denseGroups, minuteClock, clockMinutes as minutes } from './utility.js';
import { reasonText } from '../disponibilidad/operational-contract.js';

const dateLabel = (day) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short' }).format(new Date(`${day}T12:00:00Z`));
const historical = (value) => value == null ? 'Sin registro histórico' : value;
export function timelineSegments(appointments, days) {
  return days.flatMap((day) => appointments.filter((item) => item.fechaLocal <= day && item.fechaFinLocal >= day).flatMap((item) => {
    const start = day === item.fechaLocal ? item.horaInicio : '00:00';
    const end = day === item.fechaFinLocal ? item.horaFin : '24:00';
    return minutes(end) <= minutes(start) ? [] : [{ ...item, day, start, end }];
  }));
}
export function timelineRange(segments) {
  return { firstHour: Math.min(9, ...segments.map((item) => Math.floor(minutes(item.start) / 60))),
    lastHour: Math.max(18, ...segments.map((item) => Math.ceil(minutes(item.end) / 60))) };
}

// Presentación común; cada modo proporciona exclusivamente sus datos y acciones autorizadas.
export function renderTimeline(days, appointments, today, options = {}) {
  const segments = timelineSegments(appointments, days);
  const { firstHour, lastHour } = timelineRange(segments), hours = lastHour - firstHour;
  const single = days.length === 1;
  const dayAttr = options.demo ? 'data-day' : 'data-m4-date';
  const itemAttr = options.demo ? 'data-appointment' : 'data-m4-appointment';
  const zones = [...new Set(options.zones || appointments.map((x) => x.zonaHoraria))];
  const byProfessional = single && options.professional === 'all';
  const people = new Map((options.professionals || []).filter((p) => p.active !== false && (options.branch === 'all' || !Array.isArray(p.branchIds) || p.branchIds.includes(Number(options.branch)))).map((p) => [p.id, p.name]));
  // Las citas históricas siguen visibles aunque el profesional ya no figure en el catálogo.
  for (const item of segments) people.set(item.personalId, people.get(item.personalId) || historical(item.nombreProfesional));
  const counts = new Map();
  for (const item of segments) counts.set(item.personalId, (counts.get(item.personalId) || 0) + 1);
  const headings = byProfessional && people.size ? [...people].sort((a, b) => (counts.get(b[0]) || 0) - (counts.get(a[0]) || 0) || a[1].localeCompare(b[1], 'es') || a[0] - b[0]).map(([person, name]) => ({ day: days[0], person, name })) : days.map((day) => ({ day }));
  const showProfessional = !single && options.professional === 'all';
  const showBranch = options.branch === 'all';
  const layouts = headings.map((heading) => {
    const items = segments.filter((item) => item.day === heading.day && (heading.person == null || item.personalId === heading.person));
    const groups = single ? [] : denseGroups(items, options.columnWidth || 160);
    const grouped = new Set(groups.flatMap((g) => g.ids));
    const base = eventLayout(items, firstHour * 60, 96);
    const lanes = Math.max(1, ...[...base.values()].map((x) => Math.round(100 / x.baseWidth)));
    return { ...heading, items, groups, grouped, lanes, base };
  });
  const laneCount = layouts.reduce((sum, x) => sum + x.lanes, 0);
  const minWidth = byProfessional ? `calc(58px + ${layouts.length} * var(--agenda-professional-column-width, 260px))` : `${single ? 58 + laneCount * 260 : 1178}px`;
  // Estimación conservadora de líneas con la tipografía de 13px; el navegador verifica
  // la altura real tras renderizar y puede aumentar uniformemente la escala si hace falta.
  const requiredHeight = (item, width) => {
    const chars = Math.max(8, Math.floor((width - 30) / 8));
    const lines = (text) => Math.max(1, Math.ceil(String(historical(text)).length / chars));
    return 44 + 18 * (lines(item.nombreContacto) + lines(item.nombreServicio) + (showProfessional ? lines(item.nombreProfesional) : 0) + (showBranch ? lines(item.nombreSucursal) : 0)) + (item.causas.length ? 18 : 0);
  };
  let hourHeight = 96;
  for (const layout of layouts) {
    for (const item of layout.items.filter((x) => !layout.grouped.has(x.id))) {
      const width = single ? 260 : (options.columnWidth || 160) * layout.base.get(item.id).width / 100;
      hourHeight = Math.max(hourHeight, (requiredHeight(item, width) + 4) * 60 / (minutes(item.end) - minutes(item.start)));
    }
    for (const group of layout.groups) hourHeight = Math.max(hourHeight, 92 * 60 / (group.end - group.start));
  }
  hourHeight = Math.ceil(hourHeight);
  for (const layout of layouts) layout.columns = eventLayout(layout.items, firstHour * 60, hourHeight);
  const lanes = Math.max(1, ...layouts.map((x) => x.lanes));
  const grid = byProfessional ? `repeat(${layouts.length},minmax(0,1fr))` : single ? layouts.map((x) => x.lanes + 'fr').join(' ') : 'repeat(7,minmax(0,1fr))';
  return `${!single ? '<p class="calendar-scroll-hint">Los tramos agrupados abren el día completo. Desplázate para ver todos los días.</p>' : (lanes > 1 || byProfessional) ? '<p class="calendar-scroll-hint">Desplázate horizontalmente para ver los profesionales y sus citas.</p>' : ''}<div class="calendar-scroll" tabindex="0" aria-label="Calendario de citas por horas"><div class="week-calendar ${single ? 'single-day' : ''} ${byProfessional ? 'by-professional' : ''} ${showBranch ? 'all-branches' : ''}" data-first-hour="${firstHour}" style="--days:${layouts.length};--agenda-columns:${grid};--hour-height:${hourHeight}px;min-width:${minWidth}"><div class="week-header"><span class="time-header">Hora local</span>${layouts.map(({ day, items, person, name }) => `<button class="day-header ${day === today ? 'is-today' : ''}" ${dayAttr}="${day}"><span>${esc(dateLabel(day).replace('.', ''))}</span><strong>${Number(day.slice(-2))}</strong>${person != null ? `<b class="professional-heading">${esc(name)}</b>` : ''}<small>${items.length} ${items.length === 1 ? 'cita' : 'citas'}</small></button>`).join('')}</div><div class="week-body" style="height:${hours * hourHeight}px"><div class="time-gutter">${Array.from({ length: hours + 1 }, (_, index) => `<span style="top:${index * hourHeight}px">${String(firstHour + index).padStart(2, '0')}:00</span>`).join('')}</div>${layouts.map(({ day, items, columns, groups, grouped, person }) => {
    const model = person != null ? options.attentionByProfessional?.[person] : null;
    const data = person != null ? model?.data : options.attention;
    const attentionNote = model?.busy ? 'Consultando atención…' : model?.error || attentionUnavailableReason(data, day, options.branch);
    const gaps = attentionGaps(data, day, options.branch, firstHour * 60, lastHour * 60);
    const gapLabel = options.branch === 'all' ? 'Sin atención en ninguna sucursal' : 'Sin atención';
    return `<div class="day-column ${day === today ? 'is-today' : ''}" data-calendar-date="${day}" ${person != null ? `data-calendar-professional="${person}"` : ''}>${attentionNote ? `<span class="agenda-column-attention" role="status">${esc(attentionNote)}</span>` : ''}${Array.from({ length: hours }, (_, index) => options.demo ? `<button class="calendar-cell" data-slot-date="${day}" data-slot-time="${minuteClock((firstHour + index) * 60)}" aria-label="Nueva cita el ${day} a las ${minuteClock((firstHour + index) * 60)}"></button>` : '<div class="calendar-cell" aria-hidden="true"></div>').join('')}${gaps.map(({ start, end }) => `<div class="agenda-no-attention" style="top:${(start / 60 - firstHour) * hourHeight}px;height:${(end - start) / 60 * hourHeight}px" title="${gapLabel} · ${minuteClock(start)}–${minuteClock(end)}"><span>${gapLabel}</span></div>`).join('')}${items.filter((x) => !grouped.has(x.id)).map((item) => {
      const start = minutes(item.start), end = minutes(item.end), { top, height, left, width } = columns.get(item.id);
      const causes = item.causas.map((cause) => reasonText(cause.codigo)).join(' · ');
      const label = `${historical(item.nombreContacto)}, ${item.start.slice(0, 5)} a ${item.end.slice(0, 5)}, ${historical(item.nombreServicio)}, ${historical(item.nombreProfesional)}, ${historical(item.nombreSucursal)}, ${statuses[item.estado]}, ${item.zonaHoraria}${causes ? ` · ${causes}` : ''}`;
      return `<button class="calendar-event ${esc(item.estado)} ${end - start <= 30 ? 'is-short' : ''}" ${itemAttr}="${item.id}" ${options.manageStates ? stateMenuTrigger(item) : ""} style="top:${top}px;height:${height}px;left:calc(${left}% + 5px);width:calc(${width}% - 10px)" aria-label="${esc(label)}" title="${esc(label)}"><span class="event-time"><span>${esc(item.start.slice(0, 5))}<span class="event-range-end"> – ${esc(item.end.slice(0, 5))}</span></span>${causes ? `<span class="agenda-warning" aria-label="Cita afectada">${icon('info')}</span>` : item.estado === 'completada' ? icon('check') : ''}</span><strong class="event-client">${esc(historical(item.nombreContacto))}</strong><span class="event-service">${esc(historical(item.nombreServicio))}</span>${showProfessional ? `<span class="event-professional">${esc(historical(item.nombreProfesional))}</span>` : ''}${showBranch ? `<span class="event-branch">${esc(historical(item.nombreSucursal))}</span>` : ''}${causes && height >= 80 ? `<span class="event-cause">${esc(reasonText(item.causas[0].codigo))}</span>` : ''}</button>`;
    }).join('')}${groups.map((group) => {
      const affected = items.filter((x) => group.ids.includes(x.id) && x.causas.length).length;
      return `<button class="agenda-density" data-agenda-density data-group-day="${day}" data-start="${group.start}" data-ids="${group.ids.join(',')}" style="top:${(group.start / 60 - firstHour) * hourHeight + 2}px;height:${Math.max(44, (group.end - group.start) / 60 * hourHeight - 4)}px" aria-label="Ver ${group.ids.length} citas del ${day}, ${minuteClock(group.start)} a ${minuteClock(group.end)}${affected ? `, ${affected} con afectaciones` : ''}"><span>${minuteClock(group.start)}–${minuteClock(group.end)}</span><strong>${group.ids.length} citas</strong>${affected ? `<small>${icon('info')}${affected} con afectaciones</small>` : ''}<span class="density-open">Ver día ${icon('chevron')}</span></button>`;
    }).join('')}${zones.length === 1 ? `<div class="current-time" data-agenda-clock data-clock-day="${day}" data-zone="${esc(zones[0])}" data-hour-height="${hourHeight}" data-first="${firstHour * 60}" data-last="${lastHour * 60}" hidden><i></i></div>` : ''}${!items.length && !gaps.length ? '<span class="day-off">Sin citas</span>' : ''}</div>`;
  }).join('')}</div></div></div>`;
}
