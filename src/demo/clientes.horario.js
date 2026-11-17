import { list, resource, minutes, time, TODAY } from '../shared/data.js';
import { appointmentCovered } from './schedule.js';
import { crearPayloadCliente } from '../connected/modules/clientes/clientes.client.js';
import { scheduleChange } from '../connected/modules/agenda/schedule-change.js';

// La demo captura el contacto previo antes de corregir una ficha: sus citas mantienen la identidad histórica.
export function corregirClienteDemo(id, negocioId, valores) {
  const payload = crearPayloadCliente(valores),
    cliente = resource('clients', id, negocioId);
  for (const cita of list('appointments', negocioId).filter(
    (fila) => fila.clientId === id,
  ))
    cita.contactoHistorico ??= { ...cliente };
  Object.assign(cliente, { name: payload.nombreCompleto, phone: payload.telefono });
}
// Simulación local: valida franjas, descansos y ocupación sin representar la transacción UTC del backend.
export function moverCitaDemo(id, negocioId, valores) {
  scheduleChange({ ...valores, version: 1 });
  const cita = resource('appointments', id, negocioId),
    duracion = minutes(cita.end) - minutes(cita.start);
  if (
    cita.status === 'cancelada' ||
    cita.date < TODAY ||
    valores.fechaLocal < TODAY
  )
    throw new Error('Solo puedes mover citas futuras no canceladas.');
  const propuesta = {
    ...cita,
    date: valores.fechaLocal,
    start: valores.horaInicio,
    end: time(minutes(valores.horaInicio) + duracion),
  };
  const franjas = list('schedules', negocioId).filter(
    (fila) => fila.professionalId === cita.professionalId,
  );
  const conflicto = [
    ...list('appointments', negocioId).filter(
      (fila) => fila.id !== cita.id && fila.status !== 'cancelada',
    ),
    ...list('holds', negocioId).filter((fila) => fila.expiresAt > Date.now()),
  ].some(
    (fila) =>
      fila.professionalId === cita.professionalId &&
      fila.date === propuesta.date &&
      fila.start < propuesta.end &&
      fila.end > propuesta.start,
  );
  const bloqueo = list('blocks', negocioId).some(
    (fila) =>
      (!fila.professionalId || fila.professionalId === cita.professionalId) &&
      (!fila.branchId || fila.branchId === cita.branchId) &&
      propuesta.date >= fila.date &&
      propuesta.date <= fila.endDate &&
      (!fila.start || (fila.start < propuesta.end && fila.end > propuesta.start)),
  );
  if (
    minutes(propuesta.end) >= 1440 ||
    !appointmentCovered(propuesta, franjas) ||
    conflicto ||
    bloqueo
  )
    throw new Error(
      'El horario propuesto no está disponible en esta demostración.',
    );
  Object.assign(cita, { date: propuesta.date, start: propuesta.start, end: propuesta.end });
  return cita;
}
