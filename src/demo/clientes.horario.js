import { listarRegistros, obtenerRecurso, horaAMinutos, minutosAHora, HOY } from '../shared/aplicacion.datos.js';
import { citaCubiertaPorHorarioDemo } from './demo.horario.js';
import { crearPayloadCliente } from '../connected/modules/clientes/clientes.client.js';
import { crearPayloadCambioHorario } from '../connected/modules/agenda/agenda.cambio-horario.js';

// La demo captura el contacto previo antes de corregir una ficha: sus citas mantienen la identidad histórica.
export function corregirClienteDemo(id, negocioId, valores) {
  const payload = crearPayloadCliente(valores),
    cliente = obtenerRecurso('clients', id, negocioId);
  for (const cita of listarRegistros('appointments', negocioId).filter(
    (fila) => fila.clientId === id,
  ))
    cita.contactoHistorico ??= { ...cliente };
  Object.assign(cliente, { name: payload.nombreCompleto, phone: payload.telefono });
}
// Simulación local: valida franjas, descansos y ocupación sin representar la transacción UTC del backend.
export function moverCitaDemo(id, negocioId, valores) {
  crearPayloadCambioHorario({ ...valores, version: 1 });
  const cita = obtenerRecurso('appointments', id, negocioId),
    duracion = horaAMinutos(cita.end) - horaAMinutos(cita.start);
  if (
    cita.status === 'cancelada' ||
    cita.date < HOY ||
    valores.fechaLocal < HOY
  )
    throw new Error('Solo puedes mover citas futuras no canceladas.');
  const propuesta = {
    ...cita,
    date: valores.fechaLocal,
    start: valores.horaInicio,
    end: minutosAHora(horaAMinutos(valores.horaInicio) + duracion),
  };
  const franjas = listarRegistros('schedules', negocioId).filter(
    (fila) => fila.professionalId === cita.professionalId,
  );
  const conflicto = [
    ...listarRegistros('appointments', negocioId).filter(
      (fila) => fila.id !== cita.id && fila.status !== 'cancelada',
    ),
    ...listarRegistros('holds', negocioId).filter((fila) => fila.expiresAt > Date.now()),
  ].some(
    (fila) =>
      fila.professionalId === cita.professionalId &&
      fila.date === propuesta.date &&
      fila.start < propuesta.end &&
      fila.end > propuesta.start,
  );
  const bloqueo = listarRegistros('blocks', negocioId).some(
    (fila) =>
      (!fila.professionalId || fila.professionalId === cita.professionalId) &&
      (!fila.branchId || fila.branchId === cita.branchId) &&
      propuesta.date >= fila.date &&
      propuesta.date <= fila.endDate &&
      (!fila.start || (fila.start < propuesta.end && fila.end > propuesta.start)),
  );
  if (
    horaAMinutos(propuesta.end) >= 1440 ||
    !citaCubiertaPorHorarioDemo(propuesta, franjas) ||
    conflicto ||
    bloqueo
  )
    throw new Error(
      'El horario propuesto no está disponible en esta demostración.',
    );
  Object.assign(cita, { date: propuesta.date, start: propuesta.start, end: propuesta.end });
  return cita;
}
