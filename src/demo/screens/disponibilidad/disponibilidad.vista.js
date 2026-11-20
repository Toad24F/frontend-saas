import { estadoAplicacion, render } from '../../../shared/aplicacion.nucleo.js';
import { sumarDias, listarRegistros, obtenerNegocio, HOY } from '../../../shared/aplicacion.datos.js';
import { renderDisponibilidadSemanal } from '../../../shared/screens/disponibilidad/disponibilidad.vista.js';
import { renderPanelOferta } from '../../../shared/screens/disponibilidad/disponibilidad.oferta.js';
import { renderFormularioAsignaciones, limpiarBorradorAsignaciones, bloqueosDeAsignacion } from '../../../shared/screens/disponibilidad/disponibilidad.asignaciones-sucursales.js';
import { renderPanelCitasAfectadas, renderPanelConsultaHorario, renderPanelConfiguracion } from '../../../shared/screens/disponibilidad/disponibilidad.operativa.js';
import { escaparHtml as esc, renderEstadoVacio, mostrarAviso } from '../../../shared/interfaz.componentes.js';

let configuracion = null;
let consulta = null;
let afectadas = null;

function prepararModelos() {
  const negocio = obtenerNegocio(estadoAplicacion.negocioId);
  const profesionales = listarRegistros('professionals', estadoAplicacion.negocioId);
  const sucursales = listarRegistros('branches', estadoAplicacion.negocioId);
  const servicios = listarRegistros('services', estadoAplicacion.negocioId);
  const persona = profesionales[0];
  configuracion ||= { ocupado: false, datos: { modo: negocio.mode === 'compact' ? 'agenda_compacta' : 'ventana_libre', intervaloMinutos: 15, anticipacionMinutos: 15, diasFuturos: 60 }, borrador: null, errores: {}, error: '' };
  consulta ||= { ocupado: false, resultado: null, error: '', errores: {}, desactualizado: false, filtros: { personalId: persona?.id || '', sucursalId: persona?.branchIds?.[0] || '', servicioId: persona?.serviceIds?.[0] || '', from: HOY, to: sumarDias(HOY, 6), modalidad: 'publica' }, validacion: { ocupado: false, resultado: null, error: '', date: '', time: '' } };
  afectadas ||= { ocupado: false, resultado: null, error: '', errores: {}, desactualizado: false, filtros: { personalId: '', sucursalId: '', from: HOY, to: sumarDias(HOY, 6) } };
  return { tenant: negocio, profesionales, sucursales, servicios };
}

const formarInstanteUtc = (fecha, reloj) => {
  const [hora, minuto] = reloj.split(':').map(Number);
  return new Date(Date.parse(`${fecha}T00:00:00.000Z`) + (hora * 60 + minuto + 360) * 60000).toISOString();
};
const formarHoraUtc = (fecha, hora) => formarInstanteUtc(fecha, `${String(hora).padStart(2, '0')}:00`);

export function renderDisponibilidadDemo() {
  const datos = prepararModelos();
  const catalogos = { rol: 'admin_negocio', profesionales: datos.profesionales, sucursales: datos.sucursales, servicios: datos.servicios };
  const persona = datos.profesionales.find((elemento) => elemento.id === Number(estadoAplicacion.profesionalHorario)) || datos.profesionales[0];
  const panelSucursales = persona ? `<section class="superficie disponibilidad-seccion-adicional"><div class="encabezado-seccion"><div><h2>Sucursales asignadas</h2><p>Elige las sucursales donde puede atender ${esc(persona.name)}.</p></div></div>${datos.sucursales.length ? renderFormularioAsignaciones(persona, datos.sucursales, true, bloqueosDeAsignacion(persona, listarRegistros('schedules', estadoAplicacion.negocioId), listarRegistros('appointments', estadoAplicacion.negocioId))) : renderEstadoVacio('Sin sucursales disponibles', 'Crea una sucursal antes de asignarla.')}</section>` : '';
  return renderDisponibilidadSemanal({ panelesAdicionales: [
    ...(persona ? [{ id: 'sucursales', etiqueta: 'Sucursales asignadas', contenido: panelSucursales }] : []),
    ...(persona ? [{ id: 'oferta', etiqueta: 'Oferta por sucursal', contenido: renderPanelOferta(persona, { sucursales: datos.sucursales.filter((sucursal) => persona.branchIds.includes(sucursal.id)).map((sucursal) => ({ id: sucursal.id, nombre: sucursal.name, sucursalActiva: sucursal.active !== false, atencionActiva: true, servicios: datos.servicios.map((servicio) => ({ id: servicio.id, nombre: servicio.name, ofrecido: persona.serviceIds.includes(servicio.id) && servicio.active !== false, motivosExclusion: !persona.serviceIds.includes(servicio.id) ? ['servicio_no_seleccionado'] : servicio.active === false ? ['servicio_inactivo'] : [] })) })) }, true) }] : []),
    { id: 'configuracion', etiqueta: 'Reglas de agenda', contexto: false, contenido: renderPanelConfiguracion(configuracion, true) },
    { id: 'horarios', etiqueta: 'Horarios disponibles', contexto: false, contenido: renderPanelConsultaHorario({ ...consulta, ...catalogos }, true) },
    { id: 'afectadas', etiqueta: 'Citas afectadas', contexto: false, contenido: renderPanelCitasAfectadas({ ...afectadas, ...catalogos }, true) },
  ] });
}

export function guardarSucursalesAsignadasDemo(personaId, sucursalesIds) {
  const persona = listarRegistros('professionals', estadoAplicacion.negocioId).find((elemento) => elemento.id === personaId);
  const sucursales = listarRegistros('branches', estadoAplicacion.negocioId);
  if (!persona || !sucursales.length) throw new Error('Crea una sucursal y un profesional primero.');
  if (sucursalesIds.some((id) => !sucursales.some((sucursal) => sucursal.id === id && (sucursal.active !== false || persona.branchIds.includes(id))))) throw new Error('Una sucursal ya no está disponible. Actualiza la vista.');
  const eliminadas = persona.branchIds.filter((id) => !sucursalesIds.includes(id));
  const franjas = listarRegistros('schedules', estadoAplicacion.negocioId).some((fila) => fila.professionalId === persona.id && eliminadas.includes(fila.branchId));
  const citas = listarRegistros('appointments', estadoAplicacion.negocioId).some((elemento) => elemento.professionalId === persona.id && eliminadas.includes(elemento.branchId) && !['cancelada', 'no_asistio', 'completada'].includes(elemento.status));
  if (franjas || citas) throw new Error('La sucursal conserva franjas o citas activas. Resuélvelas antes de quitarla.');
  persona.branchIds = sucursalesIds;
  limpiarBorradorAsignaciones(persona.id);
  render();
  mostrarAviso('Asignaciones guardadas en esta demostración.');
}

export function guardarConfiguracionDemo(valores, errores) {
  configuracion = { ...configuracion, borrador: valores, errores };
  if (Object.keys(errores).length) { render(); return false; }
  configuracion = { ...configuracion, datos: valores, borrador: null, errores: {}, error: '' };
  obtenerNegocio(estadoAplicacion.negocioId).mode = valores.modo === 'agenda_compacta' ? 'compact' : 'free';
  render();
  return true;
}

export function consultarHorariosDemo(valores, errores) {
  consulta = { ...consulta, filtros: valores, errores, error: '', validacion: { ...consulta.validacion, resultado: null } };
  if (Object.keys(errores).length) { render(); return; }
  const zona = 'America/Chihuahua';
  const horarios = valores.modalidad === 'publica' && valores.from === sumarDias(HOY, 6) ? [] : [9, 10, 11, 15].map((hora) => ({ inicioUtc: formarHoraUtc(valores.from, hora), finUtc: formarHoraUtc(valores.from, hora + 1) }));
  consulta.resultado = { personalId: valores.personalId, sucursalId: valores.sucursalId, servicioId: valores.servicioId, desde: valores.from, hasta: valores.to, zonaHoraria: zona, calculadoEn: formarHoraUtc(HOY, 8), modalidad: valores.modalidad, reglas: configuracion.datos, ranuras: horarios, omisiones: [] };
  consulta.desactualizado = false;
  render();
}

export function seleccionarHorarioDemo(fecha, hora) { consulta = { ...consulta, validacion: { ...consulta.validacion, date: fecha, time: hora, resultado: null, error: '' } }; render(); }
export function cambiarAModalidadManualDemo() { consulta = { ...consulta, filtros: { ...consulta.filtros, modalidad: 'manual' }, validacion: { ...consulta.validacion, resultado: null } }; render(); }
export function validarHorarioDemo(valores) {
  const inicio = formarInstanteUtc(valores.fechaLocal, valores.horaInicio);
  const fin = new Date(Date.parse(inicio) + 60 * 60000).toISOString();
  consulta = { ...consulta, validacion: { ...consulta.validacion, date: valores.fechaLocal, time: valores.horaInicio, resultado: { valido: true, inicioUtc: inicio, finUtc: fin, zonaHoraria: 'America/Chihuahua', modalidad: valores.modalidad, motivos: [] }, error: '' } };
  render();
}
export function consultarAfectadasDemo(valores, errores) {
  afectadas = { ...afectadas, filtros: valores, errores };
  if (Object.keys(errores).length) { render(); return; }
  const citas = listarRegistros('appointments', estadoAplicacion.negocioId).filter((elemento) => elemento.date >= valores.from && elemento.date <= valores.to && elemento.status !== 'cancelada').slice(0, 1);
  afectadas.resultado = { desde: valores.from, hasta: valores.to, citas: citas.map((elemento) => ({ citaId: elemento.id, personalId: elemento.professionalId, sucursalId: elemento.branchId, servicioId: elemento.serviceId, inicioUtc: formarInstanteUtc(elemento.date, elemento.start), finUtc: formarInstanteUtc(elemento.date, elemento.end), zonaHoraria: 'America/Chihuahua', causas: [{ codigo: 'bloqueo', referenciaTipo: 'bloqueo', referenciaId: 1 }] })) };
  render();
}

