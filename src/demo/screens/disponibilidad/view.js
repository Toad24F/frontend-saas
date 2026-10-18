import { state, render } from '../../../shared/app.js';
import { addDays, list, tenantById, TODAY } from '../../../shared/data.js';
import { availability as weeklyAvailability } from '../../../shared/screens/disponibilidad/view.js';
import { affectedAppointmentsPanel, availabilityQueryPanel, configurationPanel } from '../../../shared/screens/disponibilidad/operational.js';
import { basicForm } from '../../../shared/forms.js';
import { escape as esc, empty, toast } from '../../../shared/ui.js';

let configuration = null;
let query = null;
let affected = null;

function models() {
  const tenant = tenantById(state.tenantId);
  const professionals = list('professionals', state.tenantId);
  const branches = list('branches', state.tenantId);
  const services = list('services', state.tenantId);
  const person = professionals[0];
  configuration ||= { busy: false, data: { modo: tenant.mode === 'compact' ? 'agenda_compacta' : 'ventana_libre', intervaloMinutos: 15, anticipacionMinutos: 15, diasFuturos: 60 }, draft: null, errors: {}, error: '' };
  query ||= { busy: false, result: null, error: '', errors: {}, stale: false, filters: { personalId: person?.id || '', sucursalId: person?.branchIds?.[0] || '', servicioId: person?.serviceIds?.[0] || '', from: TODAY, to: addDays(TODAY, 6), modalidad: 'publica' }, validation: { busy: false, result: null, error: '', date: '', time: '' } };
  affected ||= { busy: false, result: null, error: '', errors: {}, stale: false, filters: { personalId: '', sucursalId: '', from: TODAY, to: addDays(TODAY, 6) } };
  return { tenant, professionals, branches, services };
}

const utcClock = (date, clock) => {
  const [hour, minute] = clock.split(':').map(Number);
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + (hour * 60 + minute + 360) * 60000).toISOString();
};
const utcAt = (date, hour) => utcClock(date, `${String(hour).padStart(2, '0')}:00`);

export function availability() {
  const data = models();
  const common = { role: 'admin_negocio', professionals: data.professionals, branches: data.branches, services: data.services };
  const person = data.professionals.find((item) => item.id === Number(state.scheduleProfessional)) || data.professionals[0];
  const assigned = data.branches.filter((branch) => person?.branchIds.includes(branch.id));
  const branchPanel = person ? `<section class="surface availability-extra"><div class="section-heading"><div><h2>Sucursales asignadas</h2><p>Define en qué sucursales puede atender ${esc(person.name)}.</p></div><button type="button" class="btn btn-light" data-demo-branch-action ${data.branches.length ? '' : 'disabled'}>Editar asignaciones</button></div>${assigned.length ? `<ul class="assigned-branch-list">${assigned.map((branch) => `<li><strong>${esc(branch.name)}</strong><span>Asignada</span></li>`).join('')}</ul>` : empty('Sin sucursales asignadas', 'Elige una sucursal para configurar horarios.')}<p class="availability-note">Los cambios de esta demo se restablecen al recargar.</p></section>` : '';
  return weeklyAvailability({ extraPanels: [
    ...(person ? [{ id: 'branches', label: 'Sucursales asignadas', content: branchPanel }] : []),
    { id: 'configuration', label: 'Reglas de agenda', context: false, content: configurationPanel(configuration, true) },
    { id: 'slots', label: 'Horarios disponibles', context: false, content: availabilityQueryPanel({ ...query, ...common }, true) },
    { id: 'affected', label: 'Citas afectadas', context: false, content: affectedAppointmentsPanel({ ...affected, ...common }, true) },
  ] });
}

export function editDemoAssignedBranches() {
  const person = list('professionals', state.tenantId).find((item) => item.id === Number(state.scheduleProfessional)) || list('professionals', state.tenantId)[0];
  const branches = list('branches', state.tenantId);
  if (!person || !branches.length) { toast('Crea una sucursal y un profesional primero.'); return; }
  const choices = branches.map((branch) => `<label class="form-check"><input class="form-check-input" type="checkbox" name="branchIds" value="${branch.id}" ${person.branchIds.includes(branch.id) ? 'checked' : ''}><span>${esc(branch.name)}</span></label>`).join('');
  basicForm('Sucursales asignadas', `<p class="field-hint">Selecciona las sucursales donde puede atender ${esc(person.name)}.</p><div class="offering-checks assigned-branch-choices" role="group" aria-label="Sucursales disponibles">${choices}</div>`, async (form) => {
    const next = form.getAll('branchIds').map(Number);
    const removed = person.branchIds.filter((id) => !next.includes(id));
    const schedules = list('schedules', state.tenantId).some((row) => row.professionalId === person.id && removed.includes(row.branchId));
    const appointments = list('appointments', state.tenantId).some((item) => item.professionalId === person.id && removed.includes(item.branchId) && !['cancelada', 'no_asistio', 'completada'].includes(item.status));
    if (schedules || appointments) throw new Error('La sucursal conserva franjas o citas activas. Resuélvelas antes de quitarla.');
    person.branchIds = next;
  });
}

export function demoSaveConfiguration(values, errors) {
  configuration = { ...configuration, draft: values, errors };
  if (Object.keys(errors).length) { render(); return false; }
  configuration = { ...configuration, data: values, draft: null, errors: {}, error: '' };
  tenantById(state.tenantId).mode = values.modo === 'agenda_compacta' ? 'compact' : 'free';
  render();
  return true;
}

export function demoQuery(values, errors) {
  query = { ...query, filters: values, errors, error: '', validation: { ...query.validation, result: null } };
  if (Object.keys(errors).length) { render(); return; }
  const zone = 'America/Chihuahua';
  const slots = values.modalidad === 'publica' && values.from === addDays(TODAY, 6) ? [] : [9, 10, 11, 15].map((hour) => ({ inicioUtc: utcAt(values.from, hour), finUtc: utcAt(values.from, hour + 1) }));
  query.result = { personalId: values.personalId, sucursalId: values.sucursalId, servicioId: values.servicioId, desde: values.from, hasta: values.to, zonaHoraria: zone, calculadoEn: utcAt(TODAY, 8), modalidad: values.modalidad, reglas: configuration.data, ranuras: slots, omisiones: [] };
  query.stale = false;
  render();
}

export function demoSelectSlot(date, time) { query = { ...query, validation: { ...query.validation, date, time, result: null, error: '' } }; render(); }
export function demoSwitchManual() { query = { ...query, filters: { ...query.filters, modalidad: 'manual' }, validation: { ...query.validation, result: null } }; render(); }
export function demoValidate(values) {
  const start = utcClock(values.fechaLocal, values.horaInicio);
  const end = new Date(Date.parse(start) + 60 * 60000).toISOString();
  query = { ...query, validation: { ...query.validation, date: values.fechaLocal, time: values.horaInicio, result: { valido: true, inicioUtc: start, finUtc: end, zonaHoraria: 'America/Chihuahua', modalidad: values.modalidad, motivos: [] }, error: '' } };
  render();
}
export function demoAffected(values, errors) {
  affected = { ...affected, filters: values, errors };
  if (Object.keys(errors).length) { render(); return; }
  const appointments = list('appointments', state.tenantId).filter((item) => item.date >= values.from && item.date <= values.to && item.status !== 'cancelada').slice(0, 1);
  affected.result = { desde: values.from, hasta: values.to, citas: appointments.map((item) => ({ citaId: item.id, personalId: item.professionalId, sucursalId: item.branchId, servicioId: item.serviceId, inicioUtc: utcClock(item.date, item.start), finUtc: utcClock(item.date, item.end), zonaHoraria: 'America/Chihuahua', causas: [{ codigo: 'bloqueo', referenciaTipo: 'bloqueo', referenciaId: 1 }] })) };
  render();
}

