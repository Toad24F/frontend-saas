import { list, resource, minutes, time, TODAY } from '../shared/data.js';
import { appointmentCovered } from './schedule.js';
import { customerPayload } from '../connected/modules/clientes/client.js';
import { scheduleChange } from '../connected/modules/agenda/schedule-change.js';

// La demo captura el contacto previo antes de corregir una ficha: sus citas mantienen la identidad histórica.
export function correctDemoCustomer(id, tenantId, values) {
  const body = customerPayload(values),
    customer = resource('clients', id, tenantId);
  for (const cita of list('appointments', tenantId).filter(
    (row) => row.clientId === id,
  ))
    cita.clientSnapshot ??= { ...customer };
  Object.assign(customer, { name: body.nombreCompleto, phone: body.telefono });
}
// Simulación local: valida franjas, descansos y ocupación sin representar la transacción UTC del backend.
export function moveDemoAppointment(id, tenantId, values) {
  scheduleChange({ ...values, version: 1 });
  const cita = resource('appointments', id, tenantId),
    duration = minutes(cita.end) - minutes(cita.start);
  if (
    cita.status === 'cancelada' ||
    cita.date < TODAY ||
    values.fechaLocal < TODAY
  )
    throw new Error('Solo puedes mover citas futuras no canceladas.');
  const next = {
    ...cita,
    date: values.fechaLocal,
    start: values.horaInicio,
    end: time(minutes(values.horaInicio) + duration),
  };
  const rows = list('schedules', tenantId).filter(
    (row) => row.professionalId === cita.professionalId,
  );
  const conflict = [
    ...list('appointments', tenantId).filter(
      (row) => row.id !== cita.id && row.status !== 'cancelada',
    ),
    ...list('holds', tenantId).filter((row) => row.expiresAt > Date.now()),
  ].some(
    (row) =>
      row.professionalId === cita.professionalId &&
      row.date === next.date &&
      row.start < next.end &&
      row.end > next.start,
  );
  const block = list('blocks', tenantId).some(
    (row) =>
      (!row.professionalId || row.professionalId === cita.professionalId) &&
      (!row.branchId || row.branchId === cita.branchId) &&
      next.date >= row.date &&
      next.date <= row.endDate &&
      (!row.start || (row.start < next.end && row.end > next.start)),
  );
  if (
    minutes(next.end) >= 1440 ||
    !appointmentCovered(next, rows) ||
    conflict ||
    block
  )
    throw new Error(
      'El horario propuesto no está disponible en esta demostración.',
    );
  Object.assign(cita, { date: next.date, start: next.start, end: next.end });
  return cita;
}
