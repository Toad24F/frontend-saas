import { icon } from '../../../shared/icons.js';
import { escape as esc } from '../../../shared/ui.js';
import { statuses } from '../../../shared/data.js';
import { calendarColumns } from '../../../shared/calendar-layout.js';
import { calendarPeriod, civilAdd } from '../../modules/agenda/calendar.js';
import { reasonText } from '../../../shared/screens/disponibilidad/operational-contract.js';

const dateLabel = (value, options) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', ...options }).format(new Date(`${value}T12:00:00Z`));
const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) + Number(value.slice(6, 8) || 0) / 60;
const historical = (value) => value == null ? 'Sin registro histórico' : value;

// Un segmento por fecha visible conserva citas nocturnas sin convertir sus horas a la zona del navegador.
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
export function calendarTitle(view, value) {
  if (view === 'month') return dateLabel(value, { month: 'long', year: 'numeric' });
  if (view === 'day') return dateLabel(value, { day: 'numeric', month: 'long', year: 'numeric' });
  const period = calendarPeriod(view, value);
  return `${dateLabel(period.desde, { day: 'numeric' })} – ${dateLabel(period.hasta, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

// Mismas clases, iconos y textos de métricas que la demo; la ausencia de lectura no se representa como cero.
export function renderMetrics(appointments, day) {
  const items = appointments?.filter((item) => item.fechaLocal === day);
  const count = (status) => items == null ? null : status ? items.filter((item) => item.estado === status).length : items.length;
  return `<div class="stats-grid">${[
    [count(), 'Citas del día', 'calendar', 'orange', 'Tu jornada, de un vistazo'],
    [count('confirmada'), 'Confirmadas', 'circleCheck', 'blue', 'Todo listo para recibirles'],
    [count('pendiente'), 'Por confirmar', 'clock', 'amber', count('pendiente') ? 'Esperando confirmación' : 'Estás al día'],
    [count('completada'), 'Completadas', 'check', 'green', 'Atención que hace la diferencia'],
  ].map(([number, label, image, color, description]) => `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(image)}</span></div><div class="stat-number">${number == null ? '…' : String(number).padStart(2, '0')}</div><div class="stat-caption">${color === 'green' ? '<span class="mini-dot green"></span>' : ''}${items == null ? 'Pendiente de consulta' : description}</div></div>`).join('')}</div>`;
}

// Se reutilizan el DOM visual y CSS del calendario de demo, sin sus descansos ni acciones de alta ficticias.
export function renderTimeline(days, appointments, today) {
  const segments = timelineSegments(appointments, days);
  const { firstHour, lastHour } = timelineRange(segments), hourHeight = 96, hours = lastHour - firstHour;
  return `${days.length > 1 ? '<p class="calendar-scroll-hint">Desplázate horizontalmente para ver los siete días.</p>' : ''}<div class="calendar-scroll" tabindex="0" aria-label="Calendario de citas por horas"><div class="week-calendar ${days.length === 1 ? 'single-day' : ''}" style="--days:${days.length};--hour-height:${hourHeight}px"><div class="week-header"><span class="time-header">Hora local</span>${days.map((day) => `<button class="day-header ${day === today ? 'is-today' : ''} ${[0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay()) ? 'weekend' : ''}" data-m4-date="${day}"><span>${esc(dateLabel(day, { weekday: 'short' }).replace('.', ''))}</span><strong>${Number(day.slice(-2))}</strong>${day === today ? '<i></i>' : ''}</button>`).join('')}</div><div class="week-body" style="height:${hours * hourHeight}px"><div class="time-gutter">${Array.from({ length: hours + 1 }, (_, index) => `<span style="top:${index * hourHeight}px">${String(firstHour + index).padStart(2, '0')}:00</span>`).join('')}</div>${days.map((day) => {
    const items = segments.filter((item) => item.day === day);
    // La altura táctil mínima también participa en el reparto para que dos citas cortas no se tapen.
    const columns = calendarColumns(items.map((item) => {
      const end = Math.max(minutes(item.end), minutes(item.start) + 30);
      return { ...item, end: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}` };
    }));
    return `<div class="day-column ${day === today ? 'is-today' : ''}" data-calendar-date="${day}">${Array.from({ length: hours }, () => '<div class="calendar-cell" aria-hidden="true"></div>').join('')}${items.map((item) => {
      const start = minutes(item.start), end = minutes(item.end), { lane, width } = columns.get(item.id);
      const causes = item.causas.map((cause) => reasonText(cause.codigo)).join(' · ');
      const label = `${historical(item.nombreContacto)}, ${item.start.slice(0, 5)} a ${item.end.slice(0, 5)}, ${historical(item.nombreServicio)}, ${statuses[item.estado]}, ${item.zonaHoraria}${causes ? ` · ${causes}` : ''}`;
      return `<button class="calendar-event ${esc(item.estado)} ${end - start <= 30 ? 'is-short' : ''}" data-m4-appointment="${item.id}" style="top:${((start - firstHour * 60) / 60) * hourHeight + 3}px;height:${Math.max(((end - start) / 60) * hourHeight - 6, 48)}px;left:calc(${lane * width}% + 5px);width:calc(${width}% - 10px)" aria-label="${esc(label)}" title="${esc(label)}"><span class="event-time"><span>${esc(item.start.slice(0, 5))}<span class="event-range-end"> – ${esc(item.end.slice(0, 5))}</span></span>${item.estado === 'completada' ? icon('check') : causes ? icon('info') : ''}</span><strong>${esc(historical(item.nombreContacto))}</strong><span class="event-service">${esc(historical(item.nombreServicio))}</span><span class="event-professional">${esc(historical(item.nombreProfesional))}</span></button>`;
    }).join('')}${!items.length ? '<span class="day-off">Sin citas</span>' : ''}</div>`;
  }).join('')}</div></div></div>`;
}

// El mes conserva la densidad de la demo. «Más» abre el día completo, sin perder citas del periodo recibido.
export function renderMonth(value, appointments, today) {
  const { desde } = calendarPeriod('month', value);
  return `<div class="month-scroll" tabindex="0" aria-label="Calendario mensual"><div class="month-calendar">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => `<div class="month-label">${day}</div>`).join('')}${Array.from({ length: 42 }, (_, index) => {
    const day = civilAdd(desde, index), items = appointments.filter((item) => item.fechaLocal === day);
    return `<div class="month-day ${day.slice(0, 7) !== value.slice(0, 7) ? 'muted-day' : ''} ${day === today ? 'is-today' : ''}"><button class="month-date" data-m4-date="${day}" aria-label="Ver día ${day}">${Number(day.slice(-2))}</button>${items.slice(0, 3).map((item) => `<button class="month-event ${esc(item.estado)}" data-m4-appointment="${item.id}" title="${esc(`${historical(item.nombreContacto)} · ${item.zonaHoraria}`)}">${esc(item.horaInicio.slice(0, 5))} ${esc(historical(item.nombreContacto))}</button>`).join('')}${items.length > 3 ? `<button class="month-more" data-m4-date="${day}">+${items.length - 3} citas más</button>` : ''}</div>`;
  }).join('')}</div></div>`;
}
