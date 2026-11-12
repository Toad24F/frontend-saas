import '../../../demo/agenda-quick-state.js';
import './state-menu.css';
import './style.css';
import './polish.css';
import './utility.css';
import { state, render } from '../../app.js';
import { icon } from '../../icons.js';
import { agendaMetrics } from './presentation.js';
import { agendaFrame } from './frame.js';
import { renderTimeline } from './timeline.js';
import { calendarTitle, renderMonth } from './month.js';
import { calendarPeriod, civilAdd } from '../../../connected/modules/agenda/calendar.js';
import { applyAgendaEffects, renderAgendaPreserving } from './navigation.js';
import { demoAttention, demoAppointmentCauses } from '../../../demo/agenda-attention.js';
import { list, TODAY, appointmentInfo, tenantById } from '../../data.js';
import { escape, pageHead, button } from '../../ui.js';
import { statuses } from '../../data.js';
let affectedOnly = false;
const fold = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
export function filteredAppointments() {
  return list('appointments', state.tenantId).filter((a) =>
    (state.branch === 'all' || a.branchId === Number(state.branch)) &&
    (state.professional === 'all' || a.professionalId === Number(state.professional)) &&
    (state.status === 'all' || a.status === state.status) &&
    (!state.search || fold(appointmentInfo(a).client.name).includes(fold(state.search.trim()))));
}
// Resumen conserva sus tarjetas; únicamente la pantalla Agenda usa el resumen lineal.
export function stats() { return agendaMetrics(list('appointments', state.tenantId), state.date); }
export function agendaView() {
  const period = calendarPeriod(state.calendarView, state.date);
  const days = Array.from({ length: state.calendarView === 'day' ? 1 : state.calendarView === 'month' ? 42 : 7 }, (_, i) => civilAdd(period.desde, i));
  const schedules = list('schedules', state.tenantId), blocks = list('blocks', state.tenantId);
  const apps = filteredAppointments().filter((a) => a.date >= period.desde && a.date <= period.hasta).map((a) => {
    const info = appointmentInfo(a);
    return { id: a.id, folio: a.folio, fechaLocal: a.date, fechaFinLocal: a.date, horaInicio: a.start, horaFin: a.end,
      estado: a.status, personalId: a.professionalId, sucursalId: a.branchId, nombreContacto: info.client.name,
      nombreProfesional: info.professional.name, nombreServicio: info.service.name, zonaHoraria: 'America/Chihuahua',
      causas: demoAppointmentCauses(a, schedules, blocks) };
  }).filter((a) => !affectedOnly || a.causas.length);
  const select = (kind, label, items) => `<label class="filter-select">${icon(kind === 'branch' ? 'pin' : kind === 'professional' ? 'users' : 'circleCheck')}<select aria-label="${kind === 'branch' ? 'Sucursal' : kind === 'professional' ? 'Profesional' : 'Estado'}" data-filter="${kind}"><option value="all">${label}</option>${items.map((o) => `<option value="${o.id}" ${String(state[kind]) === String(o.id) ? 'selected' : ''}>${escape(o.name)}</option>`).join('')}</select>${icon('down')}</label>`;
  const filters = select('branch', 'Todas las sucursales', list('branches', state.tenantId)) + select('professional', 'Todos los profesionales', list('professionals', state.tenantId)) + select('status', 'Todos los estados', Object.entries(statuses).map(([id, name]) => ({ id, name })));
  const attention = demoAttention(days, state.professional, state.branch, schedules, blocks);
  const options = { demo: true, manageStates: true, attention, branch: state.branch, zones: ['America/Chihuahua'], columnWidth: Math.max(160, ((document.querySelector('.agenda-calendar')?.clientWidth || innerWidth - 300) - 58) / 7) };
  const body = `${apps.length ? '' : '<p class="m4-empty-summary" role="status">Sin citas en este periodo</p>'}${state.calendarView === 'month' ? renderMonth(state.date, apps, TODAY, options) : renderTimeline(days, apps, TODAY, options)}`;
  applyAgendaEffects();
  return pageHead('Agenda', 'Consulta y da seguimiento a las citas de tu negocio.', `<a class="btn btn-light" href="/reservas/${tenantById(state.tenantId).slug}" data-portal>${icon('external')}Portal de reservas</a>${button('Nueva cita', 'new-appointment')}`) + agendaFrame({ title: calendarTitle(state.calendarView, state.date), view: state.calendarView, demo: true, filters, search: state.search, summary: apps, busy: false, body, affectedOnly, zones: ['America/Chihuahua'], note: attention ? '<p class="agenda-attention-note">La trama indica intervalos sin atención · Simulación con datos ficticios.</p>' : '' });
}
document.addEventListener('click', (event) => {
  if (!new URLSearchParams(location.search).has('demo') || state.page !== 'agenda') return;
  if (event.target.closest('[data-agenda-demo-clear]')) { state.search = ''; render(); document.querySelector('#agenda-search')?.focus(); }
  if (event.target.closest('[data-agenda-demo-refresh]')) {
    renderAgendaPreserving(render);
    const announcement = document.querySelector('[data-agenda-announcement]');
    if (announcement) announcement.textContent = 'Agenda de demostración actualizada con los datos locales.';
  }
});
document.addEventListener('change', (event) => {
  if (event.target.matches('[data-agenda-demo-affected]')) { affectedOnly = event.target.checked; render(); document.querySelector('[data-agenda-demo-affected]')?.focus(); }
});
document.addEventListener('submit', (event) => { if (event.target.matches('[data-demo-agenda-filters]')) event.preventDefault(); });
