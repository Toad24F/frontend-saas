import {
  datosAplicacion,
  listarRegistros,
  obtenerRecurso,
  horaAMinutos,
  minutosAHora,
  crearFecha,
  sumarDias,
  HOY,
  obtenerNegocio,
} from '../shared/aplicacion.datos.js';
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
  const servicio = obtenerRecurso('services', servicioId, negocioId),
    profesional = obtenerRecurso('professionals', profesionalId, negocioId);
  obtenerRecurso('branches', sucursalId, negocioId);
  if (
    !profesional.serviceIds.includes(servicio.id) ||
    !profesional.branchIds.includes(Number(sucursalId)) ||
    dia < HOY
  )
    return [];
  const franjas = listarRegistros('schedules', negocioId).filter(
    (franja) =>
      franja.professionalId === profesional.id &&
      franja.branchId === Number(sucursalId) &&
      franja.day === crearFecha(dia).getDay() &&
      franja.enabled,
  );
  if (!franjas.length) return [];
  const citas = listarRegistros('appointments', negocioId).filter(
    (cita) =>
      cita.professionalId === profesional.id &&
      cita.date === dia &&
      !['cancelada', 'no_asistio'].includes(cita.status),
  );
  const apartados = listarRegistros('holds', negocioId).filter(
    (apartado) =>
      apartado.professionalId === profesional.id &&
      apartado.date === dia &&
      apartado.expiresAt > Date.now() &&
      apartado.id !== apartadoIgnorado,
  );
  const bloqueos = listarRegistros('blocks', negocioId).filter(
    (bloqueo) =>
      (!bloqueo.professionalId || bloqueo.professionalId === profesional.id) &&
      (!bloqueo.branchId || bloqueo.branchId === Number(sucursalId)) &&
      dia >= bloqueo.date &&
      dia <= bloqueo.endDate,
  );
  const resultado = [];
  for (const franja of franjas) for (
    let inicio = horaAMinutos(franja.start);
    inicio + servicio.duration <= horaAMinutos(franja.end);
    inicio += 15
  ) {
    const fin = inicio + servicio.duration;
    if (franja.breakStart &&
      seEmpalman(
        inicio,
        fin,
        horaAMinutos(franja.breakStart),
        horaAMinutos(franja.breakEnd),
      )
    )
      continue;
    if (
      [...citas, ...apartados].some((cita) =>
        seEmpalman(inicio, fin, horaAMinutos(cita.start), horaAMinutos(cita.end)),
      )
    )
      continue;
    if (
      bloqueos.some(
        (bloqueo) =>
          !bloqueo.start || seEmpalman(inicio, fin, horaAMinutos(bloqueo.start), horaAMinutos(bloqueo.end)),
      )
    )
      continue;
    resultado.push(minutosAHora(inicio));
  }
  const unicos = [...new Set(resultado)].sort();
  if ((modo || obtenerNegocio(negocioId).mode) === 'compact' && unicos.length) {
    const consecutivos = unicos.filter((hora) =>
      citas.some(
        (cita) =>
          horaAMinutos(cita.end) === horaAMinutos(hora) ||
          horaAMinutos(hora) + servicio.duration === horaAMinutos(cita.start),
      ),
    );
    return consecutivos.length ? consecutivos : [unicos[0]];
  }
  return unicos;
}
export function buscarFechasDemo(opciones, cantidad = 14) {
  return Array.from({ length: cantidad }, (_, indice) =>
    sumarDias(opciones.from || HOY, indice),
  )
    .map((dia) => ({ day: dia, slots: buscarHorariosDemo({ ...opciones, day: dia }) }))
    .filter((fecha) => fecha.slots.length);
}
export function liberarApartadoDemo(id) {
  datosAplicacion.holds = datosAplicacion.holds.filter((apartado) => apartado.id !== id);
}
export function apartarHorarioDemo(opciones, inicio) {
  if (!buscarHorariosDemo({ ...opciones, mode: 'free' }).includes(inicio))
    throw new Error('Ese horario ya no está disponible. Elige otro.');
  const servicio = obtenerRecurso('services', opciones.serviceId, opciones.tenantId);
  const apartado = {
    id: crypto.randomUUID(),
    tenantId: opciones.tenantId,
    professionalId: Number(opciones.professionalId),
    serviceId: Number(opciones.serviceId),
    branchId: Number(opciones.branchId),
    date: opciones.day,
    start: inicio,
    end: minutosAHora(horaAMinutos(inicio) + servicio.duration),
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  datosAplicacion.holds = datosAplicacion.holds.filter((apartado) => apartado.expiresAt > Date.now());
  datosAplicacion.holds.push(apartado);
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
    const apartado = datosAplicacion.holds.find(
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
  const servicio = obtenerRecurso('services', opciones.serviceId, opciones.tenantId);
  // El formulario manual de demo elige ficha por ID o crea una persona nueva.
  // El portal de ejemplo conserva su comportamiento previo cuando no envía estas opciones.
  let cliente = opciones.clientId != null
    ? obtenerRecurso('clients', opciones.clientId, opciones.tenantId)
    : opciones.newClient ? null : listarRegistros('clients', opciones.tenantId).find((ficha) => ficha.phone === contacto.phone);
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
      id: Math.max(0, ...datosAplicacion.clients.map((ficha) => ficha.id)) + 1,
      tenantId: opciones.tenantId,
      name: contacto.name.trim(),
      phone: contacto.phone,
    };
    datosAplicacion.clients.push(cliente);
  }
  const id = Math.max(0, ...datosAplicacion.appointments.map((cita) => cita.id)) + 1;
  const cita = {
    id,
    tenantId: opciones.tenantId,
    serviceId: servicio.id,
    professionalId: Number(opciones.professionalId),
    branchId: Number(opciones.branchId),
    clientId: cliente.id,
    date: opciones.day,
    start: opciones.start,
    end: minutosAHora(horaAMinutos(opciones.start) + servicio.duration),
    status: 'confirmada',
    reason: contacto.reason || '',
    origin: opciones.origin || 'portal_publico',
  };
  datosAplicacion.appointments.push(cita);
  if (apartadoId) liberarApartadoDemo(apartadoId);
  return cita;
}
