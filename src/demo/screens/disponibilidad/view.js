import { state, render } from '../../../shared/app.js';
import { addDays, list, tenantById, TODAY } from '../../../shared/data.js';
import { availability as weeklyAvailability } from '../../../shared/screens/disponibilidad/view.js';
import { affectedAppointmentsPanel, availabilityQueryPanel, configurationPanel } from '../../../shared/screens/disponibilidad/operational.js';

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
  return weeklyAvailability({ extraPanels: [
    { id: 'configuration', label: 'Reglas de agenda', context: false, content: configurationPanel(configuration, true) },
    { id: 'slots', label: 'Horarios disponibles', context: false, content: availabilityQueryPanel({ ...query, ...common }, true) },
    { id: 'affected', label: 'Citas afectadas', context: false, content: affectedAppointmentsPanel({ ...affected, ...common }, true) },
  ] });
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

