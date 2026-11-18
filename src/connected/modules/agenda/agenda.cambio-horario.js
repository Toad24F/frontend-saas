// El cambio conserva la identidad y los snapshots de la cita; solo envía la propuesta civil y la versión leída.
export function idPositivo(valor) {
  if (!Number.isInteger(valor) || valor < 1 || valor > 4294967295)
    throw new Error('Identificador o versión inválida.');
  return valor;
}
export function crearPayloadCambioHorario(valores) {
  const { fechaLocal, horaInicio, version } = valores;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaLocal) ||
    !Number.isFinite(Date.parse(`${fechaLocal}T00:00:00Z`)) ||
    new Date(`${fechaLocal}T00:00:00Z`).toISOString().slice(0, 10) !==
      fechaLocal
  )
    throw new Error('Elige una fecha válida.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio))
    throw new Error('Elige una hora válida.');
  return { fechaLocal, horaInicio, version: idPositivo(version) };
}
export const crearClientCambioHorario = (solicitar) => ({
  cambiarHorario(id, valores) {
    return solicitar(
      `/citas/${idPositivo(id)}/horario`,
      'PATCH',
      crearPayloadCambioHorario(valores),
    );
  },
});
