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
export const overlaps = (start, end, otherStart, otherEnd) =>
  start < otherEnd && end > otherStart;
/** Motor de demostración en memoria. No implementa una exclusión distribuida. */
export function slots({
  tenantId,
  serviceId,
  professionalId,
  branchId,
  day,
  ignoreHold = null,
  mode = null,
}) {
  const service = resource('services', serviceId, tenantId),
    professional = resource('professionals', professionalId, tenantId);
  resource('branches', branchId, tenantId);
  if (
    !professional.serviceIds.includes(service.id) ||
    !professional.branchIds.includes(Number(branchId)) ||
    day < TODAY
  )
    return [];
  const schedules = list('schedules', tenantId).filter(
    (s) =>
      s.professionalId === professional.id &&
      s.branchId === Number(branchId) &&
      s.day === date(day).getDay() &&
      s.enabled,
  );
  if (!schedules.length) return [];
  const appointments = list('appointments', tenantId).filter(
    (a) =>
      a.professionalId === professional.id &&
      a.date === day &&
      !['cancelada', 'no_asistio'].includes(a.status),
  );
  const holds = list('holds', tenantId).filter(
    (h) =>
      h.professionalId === professional.id &&
      h.date === day &&
      h.expiresAt > Date.now() &&
      h.id !== ignoreHold,
  );
  const blocks = list('blocks', tenantId).filter(
    (b) =>
      (!b.professionalId || b.professionalId === professional.id) &&
      (!b.branchId || b.branchId === Number(branchId)) &&
      day >= b.date &&
      day <= b.endDate,
  );
  const result = [];
  for (const schedule of schedules) for (
    let start = minutes(schedule.start);
    start + service.duration <= minutes(schedule.end);
    start += 15
  ) {
    const end = start + service.duration;
    if (schedule.breakStart &&
      overlaps(
        start,
        end,
        minutes(schedule.breakStart),
        minutes(schedule.breakEnd),
      )
    )
      continue;
    if (
      [...appointments, ...holds].some((a) =>
        overlaps(start, end, minutes(a.start), minutes(a.end)),
      )
    )
      continue;
    if (
      blocks.some(
        (b) =>
          !b.start || overlaps(start, end, minutes(b.start), minutes(b.end)),
      )
    )
      continue;
    result.push(time(start));
  }
  const unique = [...new Set(result)].sort();
  if ((mode || tenantById(tenantId).mode) === 'compact' && unique.length) {
    const adjacent = unique.filter((t) =>
      appointments.some(
        (a) =>
          minutes(a.end) === minutes(t) ||
          minutes(t) + service.duration === minutes(a.start),
      ),
    );
    return adjacent.length ? adjacent : [unique[0]];
  }
  return unique;
}
export function nextDates(options, count = 14) {
  return Array.from({ length: count }, (_, i) =>
    addDays(options.from || TODAY, i),
  )
    .map((day) => ({ day, slots: slots({ ...options, day }) }))
    .filter((d) => d.slots.length);
}
export function releaseHold(id) {
  db.holds = db.holds.filter((h) => h.id !== id);
}
export function holdSlot(options, start) {
  if (!slots({ ...options, mode: 'free' }).includes(start))
    throw new Error('Ese horario ya no está disponible. Elige otro.');
  const service = resource('services', options.serviceId, options.tenantId);
  const hold = {
    id: crypto.randomUUID(),
    tenantId: options.tenantId,
    professionalId: Number(options.professionalId),
    serviceId: Number(options.serviceId),
    branchId: Number(options.branchId),
    date: options.day,
    start,
    end: time(minutes(start) + service.duration),
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  db.holds = db.holds.filter((h) => h.expiresAt > Date.now());
  db.holds.push(hold);
  return hold;
}
export function validateContact(name, phone) {
  if (name.trim().split(/\s+/).length < 2 || name.trim().length < 5)
    throw new Error('Escribe tu nombre y al menos un apellido.');
  if (!/^\d{10}$/.test(phone))
    throw new Error('El teléfono debe contener exactamente 10 dígitos.');
}
export function createAppointment(options, contact, holdId = null) {
  validateContact(contact.name, contact.phone);
  if (holdId) {
    const hold = db.holds.find(
      (h) =>
        h.id === holdId &&
        h.tenantId === options.tenantId &&
        h.professionalId === Number(options.professionalId) &&
        h.serviceId === Number(options.serviceId) &&
        h.branchId === Number(options.branchId) &&
        h.date === options.day &&
        h.start === options.start,
    );
    if (!hold || hold.expiresAt <= Date.now())
      throw new Error(
        'El tiempo de reserva terminó. Selecciona nuevamente un horario.',
      );
  }
  if (
    !slots({ ...options, ignoreHold: holdId, mode: 'free' }).includes(
      options.start,
    )
  )
    throw new Error('El horario ya no está disponible. Selecciona otro.');
  const service = resource('services', options.serviceId, options.tenantId);
  let client = list('clients', options.tenantId).find(
    (c) => c.phone === contact.phone,
  );
  if (client) {
    if (
      client.name.toLocaleLowerCase() !==
      contact.name.trim().toLocaleLowerCase()
    )
      throw new Error(
        'Este teléfono ya está en la demostración con otro nombre. Usa un teléfono ficticio distinto.',
      );
  } else {
    client = {
      id: Math.max(0, ...db.clients.map((c) => c.id)) + 1,
      tenantId: options.tenantId,
      name: contact.name.trim(),
      phone: contact.phone,
    };
    db.clients.push(client);
  }
  const id = Math.max(0, ...db.appointments.map((a) => a.id)) + 1;
  const appointment = {
    id,
    tenantId: options.tenantId,
    serviceId: service.id,
    professionalId: Number(options.professionalId),
    branchId: Number(options.branchId),
    clientId: client.id,
    date: options.day,
    start: options.start,
    end: time(minutes(options.start) + service.duration),
    status: 'confirmada',
    folio: `${tenantById(options.tenantId).initials}-${options.day.replaceAll('-', '').slice(2)}-${String(id).padStart(4, '0')}`,
    reason: contact.reason || '',
    origin: options.origin || 'portal_publico',
  };
  db.appointments.push(appointment);
  if (holdId) releaseHold(holdId);
  return appointment;
}
