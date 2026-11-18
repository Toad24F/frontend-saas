import {
  db,
  list,
  resource,
  minutes,
  time,
  date,
  addDays,
  TODAY,
  tenantById,
} from '../shared/data.js';
export const seEmpalman = (inicio, fin, otroInicio, otroFin) =>
  inicio < otroFin && fin > otroInicio;
/** Motor de demostración en memoria. No implementa una exclusión distribuida. */
export function buscarHorariosDemo({
  tenantId: negocioId,
  serviceId: servicioId,
  professionalId: profesionalId,
  branchId: sucursalId,
  day: dia,
  ignoreHold: apartadoIgnorado = null,
  mode: modo = null,
}) {
  const servicio = resource('services', servicioId, negocioId),
    profesional = resource('professionals', profesionalId, negocioId);
  resource('branches', sucursalId, negocioId);
  if (
    !profesional.serviceIds.includes(servicio.id) ||
    !profesional.branchIds.includes(Number(sucursalId)) ||
    dia < TODAY
  )
    return [];
  const franjas = list('schedules', negocioId).filter(
    (franja) =>
      franja.professionalId === profesional.id &&
      franja.branchId === Number(sucursalId) &&
      franja.day === date(dia).getDay() &&
      franja.enabled,
  );
  if (!franjas.length) return [];
  const citas = list('appointments', negocioId).filter(
    (cita) =>
      cita.professionalId === profesional.id &&
      cita.date === dia &&
      !['cancelada', 'no_asistio'].includes(cita.status),
  );
  const apartados = list('holds', negocioId).filter(
    (apartado) =>
      apartado.professionalId === profesional.id &&
      apartado.date === dia &&
      apartado.expiresAt > Date.now() &&
      apartado.id !== apartadoIgnorado,
  );
  const bloqueos = list('blocks', negocioId).filter(
    (bloqueo) =>
      (!bloqueo.professionalId || bloqueo.professionalId === profesional.id) &&
      (!bloqueo.branchId || bloqueo.branchId === Number(sucursalId)) &&
      dia >= bloqueo.date &&
      dia <= bloqueo.endDate,
  );
  const resultado = [];
  for (const franja of franjas) for (
    let inicio = minutes(franja.start);
    inicio + servicio.duration <= minutes(franja.end);
    inicio += 15
  ) {
    const fin = inicio + servicio.duration;
    if (franja.breakStart &&
      seEmpalman(
        inicio,
        fin,
        minutes(franja.breakStart),
        minutes(franja.breakEnd),
      )
    )
      continue;
    if (
      [...citas, ...apartados].some((cita) =>
        seEmpalman(inicio, fin, minutes(cita.start), minutes(cita.end)),
      )
    )
      continue;
    if (
      bloqueos.some(
        (bloqueo) =>
          !bloqueo.start || seEmpalman(inicio, fin, minutes(bloqueo.start), minutes(bloqueo.end)),
      )
    )
      continue;
    resultado.push(time(inicio));
  }
  const unicos = [...new Set(resultado)].sort();
  if ((modo || tenantById(negocioId).mode) === 'compact' && unicos.length) {
    const consecutivos = unicos.filter((hora) =>
      citas.some(
        (cita) =>
          minutes(cita.end) === minutes(hora) ||
          minutes(hora) + servicio.duration === minutes(cita.start),
      ),
    );
    return consecutivos.length ? consecutivos : [unicos[0]];
  }
  return unicos;
}
export function buscarFechasDemo(opciones, cantidad = 14) {
  return Array.from({ length: cantidad }, (_, indice) =>
    addDays(opciones.from || TODAY, indice),
  )
    .map((dia) => ({ day: dia, slots: buscarHorariosDemo({ ...opciones, day: dia }) }))
    .filter((fecha) => fecha.slots.length);
}
export function liberarApartadoDemo(id) {
  db.holds = db.holds.filter((apartado) => apartado.id !== id);
}
export function apartarHorarioDemo(opciones, inicio) {
  if (!buscarHorariosDemo({ ...opciones, mode: 'free' }).includes(inicio))
    throw new Error('Ese horario ya no está disponible. Elige otro.');
  const servicio = resource('services', opciones.serviceId, opciones.tenantId);
  const apartado = {
    id: crypto.randomUUID(),
    tenantId: opciones.tenantId,
    professionalId: Number(opciones.professionalId),
    serviceId: Number(opciones.serviceId),
    branchId: Number(opciones.branchId),
    date: opciones.day,
    start: inicio,
    end: time(minutes(inicio) + servicio.duration),
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  db.holds = db.holds.filter((apartado) => apartado.expiresAt > Date.now());
  db.holds.push(apartado);
  return apartado;
}
export function validarContactoDemo(nombre, telefono) {
  if (nombre.trim().split(/\s+/).length < 2 || nombre.trim().length < 5)
    throw new Error('Escribe tu nombre y al menos un apellido.');
  if (!/^\d{10}$/.test(telefono))
    throw new Error('El teléfono debe contener exactamente 10 dígitos.');
}
export function crearCitaDemo(opciones, contacto, apartadoId = null) {
  validarContactoDemo(contacto.name, contacto.phone);
  if (apartadoId) {
    const apartado = db.holds.find(
      (apartado) =>
        apartado.id === apartadoId &&
        apartado.tenantId === opciones.tenantId &&
        apartado.professionalId === Number(opciones.professionalId) &&
        apartado.serviceId === Number(opciones.serviceId) &&
        apartado.branchId === Number(opciones.branchId) &&
        apartado.date === opciones.day &&
        apartado.start === opciones.start,
    );
    if (!apartado || apartado.expiresAt <= Date.now())
      throw new Error(
        'El tiempo de reserva terminó. Selecciona nuevamente un horario.',
      );
  }
  if (
    !buscarHorariosDemo({ ...opciones, ignoreHold: apartadoId, mode: 'free' }).includes(
      opciones.start,
    )
  )
    throw new Error('El horario ya no está disponible. Selecciona otro.');
  const servicio = resource('services', opciones.serviceId, opciones.tenantId);
  // El formulario manual de demo elige ficha por ID o crea una persona nueva.
  // El portal de ejemplo conserva su comportamiento previo cuando no envía estas opciones.
  let cliente = opciones.clientId != null
    ? resource('clients', opciones.clientId, opciones.tenantId)
    : opciones.newClient ? null : list('clients', opciones.tenantId).find((ficha) => ficha.phone === contacto.phone);
  if (cliente) {
    if (
      cliente.name.toLocaleLowerCase() !==
      contacto.name.trim().toLocaleLowerCase()
    )
      throw new Error(
        'Este teléfono ya está en la demostración con otro nombre. Usa un teléfono ficticio distinto.',
      );
  } else {
    cliente = {
      id: Math.max(0, ...db.clients.map((ficha) => ficha.id)) + 1,
      tenantId: opciones.tenantId,
      name: contacto.name.trim(),
      phone: contacto.phone,
    };
    db.clients.push(cliente);
  }
  const id = Math.max(0, ...db.appointments.map((cita) => cita.id)) + 1;
  const cita = {
    id,
    tenantId: opciones.tenantId,
    serviceId: servicio.id,
    professionalId: Number(opciones.professionalId),
    branchId: Number(opciones.branchId),
    clientId: cliente.id,
    date: opciones.day,
    start: opciones.start,
    end: time(minutes(opciones.start) + servicio.duration),
    status: 'confirmada',
    folio: `${tenantById(opciones.tenantId).initials}-${opciones.day.replaceAll('-', '').slice(2)}-${String(id).padStart(4, '0')}`,
    reason: contacto.reason || '',
    origin: opciones.origin || 'portal_publico',
  };
  db.appointments.push(cita);
  if (apartadoId) liberarApartadoDemo(apartadoId);
  return cita;
}
