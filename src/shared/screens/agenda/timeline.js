import { stateMenuTrigger } from './state-menu.js';
import { icon } from '../../icons.js';
import { escape as esc } from '../../ui.js';
import { statuses } from '../../data.js';
import { eventReference, eventLayout } from './presentation.js';
import { attentionGaps, denseGroups, minuteClock, clockMinutes as minutes } from './utility.js';
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
  const { firstHour, lastHour } = timelineRange(segments), hourHeight = 96, hours = lastHour - firstHour;
  const single = days.length === 1;
  const dayAttr = options.demo ? 'data-day' : 'data-m4-date';
  const itemAttr = options.demo ? 'data-appointment' : 'data-m4-appointment';
  const zones = [...new Set(options.zones || appointments.map((x) => x.zonaHoraria))];
  const layouts = days.map((day) => {
    const items = segments.filter((item) => item.day === day);
    return { day, items, columns: eventLayout(items, firstHour * 60, hourHeight) };
  });
  const lanes = Math.max(1, ...layouts.flatMap(({ columns }) => [...columns.values()].map((x) => Math.round(100 / x.baseWidth))));
  const minWidth = single ? 58 + lanes * 120 : 1178;
  return `${!single ? '<p class="calendar-scroll-hint">Los tramos agrupados abren el día completo. Desplázate para ver todos los días.</p>' : lanes > 1 ? '<p class="calendar-scroll-hint">Desplázate horizontalmente para ver las citas simultáneas.</p>' : ''}<div class="calendar-scroll" tabindex="0" aria-label="Calendario de citas por horas"><div class="week-calendar ${single ? 'single-day' : ''}" data-first-hour="${firstHour}" style="--days:${days.length};--hour-height:${hourHeight}px;min-width:${minWidth}px"><div class="week-header"><span class="time-header">Hora local</span>${layouts.map(({ day, items }) => `<button class="day-header ${day === today ? 'is-today' : ''}" ${dayAttr}="${day}"><span>${esc(dateLabel(day).replace('.', ''))}</span><strong>${Number(day.slice(-2))}</strong><small>${items.length} ${items.length === 1 ? 'cita' : 'citas'}</small></button>`).join('')}</div><div class="week-body" style="height:${hours * hourHeight}px"><div class="time-gutter">${Array.from({ length: hours + 1 }, (_, index) => `<span style="top:${index * hourHeight}px">${String(firstHour + index).padStart(2, '0')}:00</span>`).join('')}</div>${layouts.map(({ day, items, columns }) => {
    const groups = single ? [] : denseGroups(items, options.columnWidth || 160);
    const grouped = new Set(groups.flatMap((x) => x.ids));
    const gaps = attentionGaps(options.attention, day, options.branch, firstHour * 60, lastHour * 60);
    return `<div class="day-column ${day === today ? 'is-today' : ''}" data-calendar-date="${day}">${Array.from({ length: hours }, (_, index) => options.demo ? `<button class="calendar-cell" data-slot-date="${day}" data-slot-time="${minuteClock((firstHour + index) * 60)}" aria-label="Nueva cita el ${day} a las ${minuteClock((firstHour + index) * 60)}"></button>` : '<div class="calendar-cell" aria-hidden="true"></div>').join('')}${gaps.map(({ start, end }) => `<div class="agenda-no-attention" style="top:${(start / 60 - firstHour) * hourHeight}px;height:${(end - start) / 60 * hourHeight}px" title="Sin atención · ${minuteClock(start)}–${minuteClock(end)}"><span>Sin atención</span></div>`).join('')}${items.filter((x) => !grouped.has(x.id)).map((item) => {
      const start = minutes(item.start), end = minutes(item.end), { top, height, left, width } = columns.get(item.id);
      const causes = item.causas.map((cause) => reasonText(cause.codigo)).join(' · ');
      const label = `${historical(item.nombreContacto)}, ${item.start.slice(0, 5)} a ${item.end.slice(0, 5)}, ${historical(item.nombreServicio)}, ${statuses[item.estado]}, ${item.zonaHoraria} · Folio ${item.folio || item.id}${causes ? ` · ${causes}` : ''}`;
      return `<button class="calendar-event ${esc(item.estado)} ${end - start <= 30 ? 'is-short' : ''}" ${itemAttr}="${item.id}" ${options.manageStates ? stateMenuTrigger(item) : ""} style="top:${top}px;height:${height}px;left:calc(${left}% + 5px);width:calc(${width}% - 10px)" aria-label="${esc(label)}" title="${esc(label)}"><span class="event-time"><span>${esc(item.start.slice(0, 5))}<span class="event-range-end"> – ${esc(item.end.slice(0, 5))}</span></span>${eventReference(item.folio, item.id)}${causes ? `<span class="agenda-warning" aria-label="Cita afectada">${icon('info')}</span>` : item.estado === 'completada' ? icon('check') : ''}</span><strong>${esc(historical(item.nombreContacto))}</strong><span class="event-service">${esc(historical(item.nombreServicio))}</span><span class="event-professional">${esc(historical(item.nombreProfesional))}</span>${causes && height >= 80 ? `<span class="event-cause">${esc(reasonText(item.causas[0].codigo))}</span>` : ''}</button>`;
    }).join('')}${groups.map((group) => {
      const affected = items.filter((x) => group.ids.includes(x.id) && x.causas.length).length;
      return `<button class="agenda-density" data-agenda-density data-group-day="${day}" data-start="${group.start}" data-ids="${group.ids.join(',')}" style="top:${(group.start / 60 - firstHour) * hourHeight + 2}px;height:${Math.max(44, (group.end - group.start) / 60 * hourHeight - 4)}px" aria-label="Ver ${group.ids.length} citas del ${day}, ${minuteClock(group.start)} a ${minuteClock(group.end)}${affected ? `, ${affected} con afectaciones` : ''}"><span>${minuteClock(group.start)}–${minuteClock(group.end)}</span><strong>${group.ids.length} citas</strong>${affected ? `<small>${icon('info')}${affected} con afectaciones</small>` : ''}<span class="density-open">Ver día ${icon('chevron')}</span></button>`;
    }).join('')}${zones.length === 1 ? `<div class="current-time" data-agenda-clock data-clock-day="${day}" data-zone="${esc(zones[0])}" data-first="${firstHour * 60}" data-last="${lastHour * 60}" hidden><i></i></div>` : ''}${!items.length && !gaps.length ? '<span class="day-off">Sin citas</span>' : ''}</div>`;
  }).join('')}</div></div></div>`;
}
