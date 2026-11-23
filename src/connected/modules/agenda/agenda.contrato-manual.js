import { partesEnZonaHoraria } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';

export const puedeGestionarCitas = (rol) => ['admin_negocio', 'recepcionista'].includes(rol);
// Gestionar la agenda propia no concede consultar o modificar el directorio de clientes.
export const puedeGestionarAgenda = (rol) => puedeGestionarCitas(rol) || rol === 'profesional';
const idPositivo = (valor) => {
  const numero = Number(valor);
  if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(numero) || numero > 4294967295) throw new Error('Selecciona un identificador válido.');
  return numero;
};
const fechaCivil = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(Date.parse(`${valor}T00:00:00Z`)) || new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) !== valor) throw new Error('Selecciona una fecha válida.');
  return valor;
};
const textoOpcional = (valor) => {
  if (valor != null && typeof valor !== 'string') throw new Error('El texto no es válido.');
  const texto = valor?.trim() || '';
  if ([...texto].length > 2000) throw new Error('El texto admite hasta 2.000 caracteres.');
  return texto || null;
};
// Solo se prepara la selección admitida: precio, fin, zona y negocio nunca son autoridad del navegador.
export function seleccionManual(valores, actor = null) {
  const existente = valores.clienteId != null && valores.clienteId !== '';
  if (existente === (valores.clienteNuevo != null)) throw new Error('Elige un cliente existente o introduce uno nuevo.');
  if (actor?.rol === 'profesional' && existente) throw new Error('Captura el contacto del cliente sin elegir una ficha del directorio.');
  let cliente;
  if (existente) cliente = { clienteId: idPositivo(valores.clienteId) };
  else {
    const nombreCompleto = valores.clienteNuevo.nombreCompleto?.trim();
    const telefono = String(valores.clienteNuevo.telefono || '').replace(/[\s-]/g, '').replace(/^\+52/, '');
    if (!nombreCompleto || [...nombreCompleto].length > 150) throw new Error('Introduce un nombre de hasta 150 caracteres.');
    if (!/^\d{10}$/.test(telefono)) throw new Error('Introduce diez dígitos mexicanos en el teléfono.');
    cliente = { clienteNuevo: { nombreCompleto, telefono } };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valores.horaInicio || '')) throw new Error('Selecciona un horario devuelto por el servidor.');
  // El perfil visible procede de la sesión; el backend lo resuelve otra vez como autoridad.
  return { sucursalId: idPositivo(valores.sucursalId), personalId: idPositivo(actor?.rol === 'profesional' ? actor.id : valores.personalId), servicioId: idPositivo(valores.servicioId),
    fechaLocal: fechaCivil(valores.fechaLocal), horaInicio: valores.horaInicio, ...cliente,
    notas: textoOpcional(valores.notas), autorizaWhatsapp: valores.autorizaWhatsapp === true };
}
export function crearPayloadCambioEstado(valores) {
  if (!['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'].includes(valores.estado)) throw new Error('Selecciona un estado válido.');
  return { estado: valores.estado, version: idPositivo(valores.version), motivo: textoOpcional(valores.motivo) };
}
// Se proyectan únicamente los instantes recibidos. No se generan candidatos ni se calcula el fin localmente.
export function horariosManuales(respuesta, seleccion) {
  if (!respuesta || respuesta.modalidad !== 'manual' || respuesta.desde !== seleccion.fechaLocal || respuesta.hasta !== seleccion.fechaLocal ||
    ['personalId', 'sucursalId', 'servicioId'].some((claveInterna) => Number(respuesta[claveInterna]) !== Number(seleccion[claveInterna])) || !Array.isArray(respuesta.ranuras) || typeof respuesta.zonaHoraria !== 'string') throw new Error('La respuesta de disponibilidad no es válida.');
  try { new Intl.DateTimeFormat('es-MX', { timeZone: respuesta.zonaHoraria }).format(); } catch { throw new Error('La zona de disponibilidad no es válida.'); }
  return respuesta.ranuras.map((horario) => {
    if (!Number.isFinite(Date.parse(horario?.inicioUtc)) || !Number.isFinite(Date.parse(horario?.finUtc)) || Date.parse(horario.finUtc) <= Date.parse(horario.inicioUtc)) throw new Error('El horario recibido no es válido.');
    const local = partesEnZonaHoraria(horario.inicioUtc, respuesta.zonaHoraria);
    if (local.date !== seleccion.fechaLocal || !local.time) throw new Error('El horario recibido no corresponde a esta fecha.');
    return { inicioUtc: horario.inicioUtc, finUtc: horario.finUtc, fechaLocal: local.date, horaInicio: local.time };
  });
}
export function resultadoManualValido(resultado) {
  return resultado && Number.isInteger(resultado.id) && resultado.id > 0 && typeof resultado.folio === 'string' && resultado.folio.length > 0 &&
    resultado.origen === 'manual' && ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'].includes(resultado.estado) && Number.isInteger(resultado.version) && resultado.version > 0 &&
    Number.isFinite(Date.parse(resultado.inicioUtc)) && Number.isFinite(Date.parse(resultado.finUtc)) && typeof resultado.zonaHoraria === 'string' && typeof resultado.costoAceptado === 'string';
}
export function crearClientCitaManual(solicitar) {
  const claveInterna = (valor) => { if (!/^[A-Za-z0-9_-]{16,64}$/.test(valor)) throw new Error('Clave de envío inválida.'); return valor; };
  return {
    consultarDisponibilidad: (valores) => solicitar(`/disponibilidad?${new URLSearchParams({ personalId: idPositivo(valores.personalId), sucursalId: idPositivo(valores.sucursalId), servicioId: idPositivo(valores.servicioId), desde: fechaCivil(valores.fechaLocal), hasta: fechaCivil(valores.fechaLocal), modalidad: 'manual' })}`),
    preparar: (valor, valores) => solicitar('/citas/manuales/intentos', 'POST', { clave: claveInterna(valor), seleccion: seleccionManual(valores) }),
    registrar: (valor, valores) => solicitar(`/citas/manuales/intentos/${claveInterna(valor)}/registrar`, 'POST', seleccionManual(valores)),
    resolver: (valor, valores) => solicitar(`/citas/manuales/intentos/${claveInterna(valor)}/resolver`, 'POST', seleccionManual(valores)),
    cambiarEstado: (valor, valores) => solicitar(`/citas/${idPositivo(valor)}/estado`, 'PATCH', crearPayloadCambioEstado(valores)),
  };
}
