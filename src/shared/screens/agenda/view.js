import './style.css';
import { state } from '../../app.js';
import { icon } from '../../icons.js';
import { agendaLegend, agendaMetrics, eventReference, eventLayout } from './presentation.js';
import './polish.css';
import { db, TODAY, addDays, date, formatDate, list, appointmentInfo, tenantById, statuses } from '../../data.js';
import { escape, pageHead, button } from '../../ui.js';
export function filteredAppointments() {
  return list('appointments', state.tenantId).filter(
    (a) =>
      (state.branch === 'all' || a.branchId === Number(state.branch)) &&
      (state.professional === 'all' ||
        a.professionalId === Number(state.professional)) &&
      (state.status === 'all' || a.status === state.status) &&
      (!state.search ||
        appointmentInfo(a)
          .client.name.toLowerCase()
          .includes(state.search.toLowerCase())),
  );
}
export function stats() { return agendaMetrics(list('appointments', state.tenantId), state.date); }
export function agendaView() {
  const monday = addDays(state.date, 1 - (date(state.date).getDay() || 7));
  const days =
    state.calendarView === 'day'
      ? [state.date]
      : Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const apps = filteredAppointments();
  let title =
    state.calendarView === 'day'
      ? formatDate(state.date)
      : `${date(monday).getDate()} – ${date(addDays(monday, 6)).getDate()} de ${formatDate(addDays(monday, 6), { month: 'long', year: 'numeric' })}`;
  if (state.calendarView === 'month')
    title = formatDate(state.date, { month: 'long', year: 'numeric' });
  const selectFilter = (kind, label, items) =>
    `<label class="filter-select">${icon(kind === 'branch' ? 'pin' : kind === 'professional' ? 'users' : 'circleCheck')}<select aria-label="${label}" data-filter="${kind}"><option value="all">${label}</option>${items.map((o) => `<option value="${o.id}" ${String(state[kind]) === String(o.id) ? 'selected' : ''}>${escape(o.name)}</option>`).join('')}</select>${icon('down')}</label>`;
  return `${pageHead('Agenda', 'Organiza tu día. Conecta con tus pacientes.', `<a class="btn btn-light" href="/reservas/${tenantById(state.tenantId).slug}" data-portal>${icon('external')}Portal de reservas</a>${button('Nueva cita', 'new-appointment')}`)}${stats()}<section class="calendar-panel agenda-calendar" aria-label="Calendario de citas"><div class="calendar-toolbar agenda-toolbar"><div class="calendar-date"><h2>${title}</h2><div class="date-arrows"><button class="icon-btn" data-action="previous" aria-label="Periodo anterior">${icon('left')}</button><button class="icon-btn" data-action="next" aria-label="Periodo siguiente">${icon('chevron')}</button></div><button class="btn btn-today" data-action="today">Hoy</button></div>${agendaLegend()}<div class="segmented" aria-label="Vista del calendario">${[
    ['day', 'Día'],
    ['week', 'Semana'],
    ['month', 'Mes'],
  ]
    .map(
      ([v, l]) =>
        `<button data-view="${v}" class="${state.calendarView === v ? 'selected' : ''}" aria-pressed="${state.calendarView === v}">${l}</button>`,
    )
    .join(
      '',
    )}</div></div><div class="calendar-filters"><div class="filter-group">${selectFilter('branch', 'Todas las sucursales', list('branches', state.tenantId))}${selectFilter('professional', 'Todos los profesionales', list('professionals', state.tenantId))}${selectFilter(
    'status',
    'Todos los estados',
    Object.entries(statuses).map(([id, name]) => ({ id, name })),
  )}</div><label class="search-field">${icon('search')}<input type="search" id="agenda-search" placeholder="Buscar paciente..." aria-label="Buscar paciente" value="${escape(state.search)}"/></label></div>${state.calendarView === 'month' ? monthGrid(apps) : weekGrid(days, apps)}<div class="calendar-footer"><span class="timezone">GMT-6 · Chihuahua</span></div></section><div class="agenda-note">${icon('info')} Los horarios se muestran en la zona horaria de tu negocio.<span>Datos ficticios · 8 de septiembre de 2026</span></div>`;
}
function weekGrid(days, apps) {
  const hourHeight = 96;
  return `${days.length > 1 ? '<p class="calendar-scroll-hint">Desplázate horizontalmente para ver los siete días.</p>' : ''}<div class="calendar-scroll"><div class="week-calendar ${days.length === 1 ? 'single-day' : ''}" style="--days:${days.length};--hour-height:${hourHeight}px"><div class="week-header"><span class="time-header">GMT-6</span>${days.map((day) => `<button class="day-header ${day === TODAY ? 'is-today' : ''} ${date(day).getDay() === 0 || date(day).getDay() === 6 ? 'weekend' : ''}" data-day="${day}"><span>${formatDate(day, { weekday: 'short' }).replace('.', '')}</span><strong>${date(day).getDate()}</strong>${day === TODAY ? '<i></i>' : ''}</button>`).join('')}</div><div class="week-body"><div class="time-gutter">${Array.from({ length: 10 }, (_, i) => `<span style="top:${i * hourHeight}px">${String(i + 9).padStart(2, '0')}:00</span>`).join('')}</div>${days
    .map((day) => {
      const dayApps = apps.filter((a) => a.date === day);
      const columns = eventLayout(dayApps);
      return `<div class="day-column ${day === TODAY ? 'is-today' : ''} ${[0, 6].includes(date(day).getDay()) ? 'weekend' : ''}" data-calendar-date="${day}">${Array.from({ length: 9 }, (_, i) => `<button class="calendar-cell" data-slot-date="${day}" data-slot-time="${String(i + 9).padStart(2, '0')}:00" aria-label="Nueva cita el ${formatDate(day)} a las ${i + 9}:00"></button>`).join('')}<div class="lunch-block" style="top:${4 * hourHeight}px;height:${hourHeight}px">${icon('coffee')}<span>Descanso</span></div>${dayApps
        .map((a) => {
          const e = appointmentInfo(a);
          const start =
            Number(a.start.slice(0, 2)) * 60 + Number(a.start.slice(3));
          const end = Number(a.end.slice(0, 2)) * 60 + Number(a.end.slice(3));
          const { top, height, left, width } = columns.get(a.id);
          const details = `${e.client.name}, ${a.start} a ${a.end}, ${e.service.name}, ${statuses[a.status]}, Folio ${a.folio || a.id}`;
          return `<button class="calendar-event ${a.status} ${end - start <= 30 ? 'is-short' : ''}" data-appointment="${a.id}" style="top:${top}px;height:${height}px;left:calc(${left}% + 5px);width:calc(${width}% - 10px)" aria-label="${escape(details)}" title="${escape(details)}"><span class="event-time"><span>${a.start}<span class="event-range-end"> – ${a.end}</span></span>${eventReference(a.folio, a.id)}${a.status === 'completada' ? icon('check') : ''}</span><strong>${escape(e.client.name)}</strong><span class="event-service">${escape(e.service.name)}</span><span class="event-professional">${escape(e.professional.name)}</span></button>`;
        })
        .join(
          '',
        )}${day === TODAY ? `<div class="current-time" style="top:${(11 + 20 / 60 - 9) * hourHeight}px"><i></i></div>` : ''}${[0, 6].includes(date(day).getDay()) && !dayApps.length ? '<span class="day-off">Sin citas</span>' : ''}</div>`;
    })
    .join('')}</div></div></div>`;
}
function monthGrid(apps) {
  const first = `${state.date.slice(0, 7)}-01`,
    start = addDays(first, 1 - (date(first).getDay() || 7));
  return `<div class="month-scroll"><div class="month-calendar">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="month-label">${d}</div>`).join('')}${Array.from(
    { length: 42 },
    (_, i) => {
      const day = addDays(start, i),
        dayApps = apps.filter((a) => a.date === day);
      return `<div class="month-day ${day.slice(0, 7) !== state.date.slice(0, 7) ? 'muted-day' : ''} ${day === TODAY ? 'is-today' : ''}"><button class="month-date" data-day="${day}">${date(day).getDate()}</button>${dayApps
        .slice(0, 3)
        .map(
          (a) =>
            `<button class="month-event ${a.status}" data-appointment="${a.id}" title="${escape(a.folio || a.id)}"><span class="month-event-label">${a.start} ${escape(appointmentInfo(a).client.name)}</span>${eventReference(a.folio, a.id)}</button>`,
        )
        .join(
          '',
        )}${dayApps.length > 3 ? `<button class="month-more" data-day="${day}">+${dayApps.length - 3} citas más</button>` : ''}</div>`;
    },
  ).join('')}</div></div>`;
}
