import { zonedParts } from '../../../shared/screens/disponibilidad/operational-contract.js';

export const canManageAppointments = (role) => ['admin_negocio', 'recepcionista'].includes(role);
const positiveId = (value) => {
  const number = Number(value);
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(number) || number > 4294967295) throw new Error('Selecciona un identificador válido.');
  return number;
};
const civilDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error('Selecciona una fecha válida.');
  return value;
};
const optionalText = (value) => {
  if (value != null && typeof value !== 'string') throw new Error('El texto no es válido.');
  const text = value?.trim() || '';
  if ([...text].length > 2000) throw new Error('El texto admite hasta 2.000 caracteres.');
  return text || null;
};
// Solo se prepara la selección admitida: precio, fin, zona y negocio nunca son autoridad del navegador.
export function manualSelection(values) {
  const existing = values.clienteId != null && values.clienteId !== '';
  if (existing === (values.clienteNuevo != null)) throw new Error('Elige un cliente existente o introduce uno nuevo.');
  let customer;
  if (existing) customer = { clienteId: positiveId(values.clienteId) };
  else {
    const nombreCompleto = values.clienteNuevo.nombreCompleto?.trim();
    const telefono = String(values.clienteNuevo.telefono || '').replace(/[\s-]/g, '').replace(/^\+52/, '');
    if (!nombreCompleto || [...nombreCompleto].length > 150) throw new Error('Introduce un nombre de hasta 150 caracteres.');
    if (!/^\d{10}$/.test(telefono)) throw new Error('Introduce diez dígitos mexicanos en el teléfono.');
    customer = { clienteNuevo: { nombreCompleto, telefono } };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.horaInicio || '')) throw new Error('Selecciona un horario devuelto por el servidor.');
  return { sucursalId: positiveId(values.sucursalId), personalId: positiveId(values.personalId), servicioId: positiveId(values.servicioId),
    fechaLocal: civilDate(values.fechaLocal), horaInicio: values.horaInicio, ...customer, notas: optionalText(values.notas) };
}
export function stateChange(values) {
  if (!['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'].includes(values.estado)) throw new Error('Selecciona un estado válido.');
  return { estado: values.estado, version: positiveId(values.version), motivo: optionalText(values.motivo) };
}
// Se proyectan únicamente los instantes recibidos. No se generan candidatos ni se calcula el fin localmente.
export function manualSlots(response, selection) {
  if (!response || response.modalidad !== 'manual' || response.desde !== selection.fechaLocal || response.hasta !== selection.fechaLocal ||
    ['personalId', 'sucursalId', 'servicioId'].some((key) => Number(response[key]) !== Number(selection[key])) || !Array.isArray(response.ranuras) || typeof response.zonaHoraria !== 'string') throw new Error('La respuesta de disponibilidad no es válida.');
  try { new Intl.DateTimeFormat('es-MX', { timeZone: response.zonaHoraria }).format(); } catch { throw new Error('La zona de disponibilidad no es válida.'); }
  return response.ranuras.map((slot) => {
    if (!Number.isFinite(Date.parse(slot?.inicioUtc)) || !Number.isFinite(Date.parse(slot?.finUtc)) || Date.parse(slot.finUtc) <= Date.parse(slot.inicioUtc)) throw new Error('El horario recibido no es válido.');
    const local = zonedParts(slot.inicioUtc, response.zonaHoraria);
    if (local.date !== selection.fechaLocal || !local.time) throw new Error('El horario recibido no corresponde a esta fecha.');
    return { inicioUtc: slot.inicioUtc, finUtc: slot.finUtc, fechaLocal: local.date, horaInicio: local.time };
  });
}
export function validManualResult(result) {
  return result && Number.isInteger(result.id) && result.id > 0 && typeof result.folio === 'string' && result.folio.length > 0 &&
    result.origen === 'manual' && ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'].includes(result.estado) && Number.isInteger(result.version) && result.version > 0 &&
    Number.isFinite(Date.parse(result.inicioUtc)) && Number.isFinite(Date.parse(result.finUtc)) && typeof result.zonaHoraria === 'string' && typeof result.costoAceptado === 'string';
}
export function createManualClient(request) {
  const key = (value) => { if (!/^[A-Za-z0-9_-]{16,64}$/.test(value)) throw new Error('Clave de envío inválida.'); return value; };
  return {
    availability: (values) => request(`/disponibilidad?${new URLSearchParams({ personalId: positiveId(values.personalId), sucursalId: positiveId(values.sucursalId), servicioId: positiveId(values.servicioId), desde: civilDate(values.fechaLocal), hasta: civilDate(values.fechaLocal), modalidad: 'manual' })}`),
    prepare: (value, values) => request('/citas/manuales/intentos', 'POST', { clave: key(value), seleccion: manualSelection(values) }),
    register: (value, values) => request(`/citas/manuales/intentos/${key(value)}/registrar`, 'POST', manualSelection(values)),
    resolve: (value, values) => request(`/citas/manuales/intentos/${key(value)}/resolver`, 'POST', manualSelection(values)),
    changeState: (value, values) => request(`/citas/${positiveId(value)}/estado`, 'PATCH', stateChange(values)),
  };
}
