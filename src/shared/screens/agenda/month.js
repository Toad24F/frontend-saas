import { icon } from '../../icons.js';
import { escape as esc } from '../../ui.js';
import { eventReference } from './presentation.js';
import { calendarPeriod, civilAdd } from '../../../connected/modules/agenda/calendar.js';
import { reasonText } from '../disponibilidad/operational-contract.js';
const dateLabel = (value, options) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', ...options }).format(new Date(value + 'T12:00:00Z'));
const historical = (value) => value == null ? 'Sin registro histórico' : value;
export function calendarTitle(view, value) {
  if (view === 'month') return dateLabel(value, { month: 'long', year: 'numeric' });
  if (view === 'day') return dateLabel(value, { day: 'numeric', month: 'long', year: 'numeric' });
  const period = calendarPeriod(view, value);
  return `${dateLabel(period.desde, { day: 'numeric' })} – ${dateLabel(period.hasta, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

// El mes conserva la densidad de la demo. «Más» abre el día completo, sin perder citas del periodo recibido.
export function renderMonth(value, appointments, today, options = {}) {
  const dayAttr = options.demo ? 'data-day' : 'data-m4-date';
  const itemAttr = options.demo ? 'data-appointment' : 'data-m4-appointment';
  const { desde } = calendarPeriod('month', value);
  return `<div class="month-scroll" tabindex="0" aria-label="Calendario mensual"><div class="month-calendar">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => `<div class="month-label">${day}</div>`).join('')}${Array.from({ length: 42 }, (_, index) => {
    const day = civilAdd(desde, index), items = appointments.filter((item) => item.fechaLocal === day);
    return `<div class="month-day ${day.slice(0, 7) !== value.slice(0, 7) ? 'muted-day' : ''} ${day === today ? 'is-today' : ''}"><button class="month-date" ${dayAttr}="${day}" aria-label="Ver día ${day}">${Number(day.slice(-2))}</button>${items.slice(0, 3).map((item) => `<button class="month-event ${esc(item.estado)}" ${itemAttr}="${item.id}" title="${esc(`${historical(item.nombreContacto)} · ${item.zonaHoraria} · Folio ${item.folio || item.id}${item.causas.length ? ` · ${item.causas.map((x) => reasonText(x.codigo)).join(" · ")}` : ""}`)}"><span class="month-event-label">${esc(item.horaInicio.slice(0, 5))} ${esc(historical(item.nombreContacto))}</span>${item.causas.length ? `<span class="agenda-warning" aria-label="Cita afectada">${icon("info")}</span>` : ""}${eventReference(item.folio, item.id)}</button>`).join('')}${items.length > 3 ? `<button class="month-more" ${dayAttr}="${day}">+${items.length - 3} citas más</button>` : ''}</div>`;
  }).join('')}</div></div>`;
}
