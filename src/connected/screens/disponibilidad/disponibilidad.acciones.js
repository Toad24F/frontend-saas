import { api, loadBackendData, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { list } from '../../../shared/data.js';
import { basicForm } from '../../../shared/forms.js';
import { toast, escape as esc } from '../../../shared/ui.js';
import { consultarCitasAfectadas, consultarHorariosDisponibles, consultarDatosDisponibilidad, invalidarProyeccion, actualizarDatosDisponibilidad, actualizarConfiguracionAgenda, guardarConfiguracionConectada, seleccionarHorarioConsultado, consultarProfesionalHorario, establecerErroresAfectadas, mostrarProyeccion, establecerErroresConsulta, establecerFiltrosConsulta, validarInicioConsultado } from './disponibilidad.vista.js';
import { consultarBorradorAsignaciones, limpiarBorradorAsignaciones, validarAsignacionesVigentes } from '../../../shared/screens/disponibilidad/disponibilidad.asignaciones-sucursales.js';
import { validarRangoInclusivo } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';
import { limpiarErroresDisponibilidad, limpiarCampoDisponibilidad, mostrarErroresDisponibilidad, mostrarErrorGeneralDisponibilidad, validarProyeccion } from '../../../shared/screens/disponibilidad/disponibilidad.errores.js';

const rutaProfesional = (personaId = consultarProfesionalHorario().id) => `/profesionales/${personaId}`;
const renderCasillasServicios = (elementos, seleccionados) => `<div class="oferta-opciones" data-disponibilidad-campo="serviceIds" tabindex="-1">${elementos.map((elemento) => `<label class="form-check"><input class="form-check-input" type="checkbox" name="serviceIds" value="${elemento.id}" ${seleccionados.includes(elemento.id) ? 'checked' : ''} ${elemento.disabled ? 'disabled' : ''}><span>${esc(elemento.name)}</span></label>`).join('')}</div>`;
const opcionesFormularioServicios = {
  onError(error, formulario) {
    if (/servicio|serviceIds/i.test(error.message || '')) mostrarErroresDisponibilidad(formulario, { serviceIds: error.message });
    else mostrarErrorGeneralDisponibilidad(formulario, error, '#form-error');
  },
};

async function editarServiciosGenerales() {
  const servicios = await api(`${rutaProfesional()}/servicios`);
  const dialogo = basicForm('Servicios generales', `<p class="field-hint">Selecciona los servicios que ofrece este profesional. Los ajustes por sucursal se conservan al desmarcar.</p>${renderCasillasServicios(servicios.map((elemento) => ({ id: elemento.id, name: elemento.nombre, disabled: !elemento.activo && !elemento.seleccionado })), servicios.filter((elemento) => elemento.seleccionado).map((elemento) => elemento.id))}`, async (formulario) => {
    await api(`${rutaProfesional()}/servicios`, 'PUT', { servicioIds: formulario.getAll('serviceIds').map(Number) });
    await actualizarDatosDisponibilidad(true);
  }, true, opcionesFormularioServicios);
  const formulario = dialogo.querySelector('#editor-form');
  formulario.addEventListener('change', (evento) => limpiarCampoDisponibilidad(formulario, evento.target));
}

async function guardarSucursalesAsignadas(formulario) {
  if (user.rol !== 'admin_negocio') throw new Error('No tienes permiso para cambiar asignaciones.');
  const persona = consultarProfesionalHorario();
  if (!persona || persona.id !== Number(formulario.dataset.personaId)) throw new Error('La selección de profesional cambió. Actualiza la vista.');
  const borrador = consultarBorradorAsignaciones(persona.id, persona.branchIds);
  const sucursalesIds = [...new FormData(formulario).getAll('branchIds')].map(Number);
  const [idsVigentes, sucursales] = await Promise.all([
    api(`/profesionales/${persona.id}/sucursales`),
    api('/sucursales'),
  ]);
  validarAsignacionesVigentes(borrador.original, sucursalesIds, idsVigentes, sucursales);
  await api(`/profesionales/${persona.id}/sucursales`, 'PUT', { sucursalIds: sucursalesIds });
  limpiarBorradorAsignaciones(persona.id);
  invalidarProyeccion();
  try {
    await loadBackendData();
    await actualizarDatosDisponibilidad(true);
    render();
    toast('Asignaciones guardadas.');
  } catch (error) {
    render();
    toast('Asignaciones guardadas. No se pudo actualizar la vista: ' + error.message);
  }
}

async function editarServiciosSucursal(sucursalId) {
  const sucursal = consultarDatosDisponibilidad()?.oferta?.sucursales.find((elemento) => elemento.id === sucursalId);
  if (!sucursal) throw new Error('La sucursal no está asignada a este profesional.');
  const seleccion = await api(`${rutaProfesional()}/sucursales/${sucursalId}/servicios`);
  const permitidos = sucursal.servicios.filter((elemento) => elemento.servicioActivo && elemento.seleccionGeneralActiva);
  const dialogo = basicForm(`Servicios en ${esc(sucursal.nombre)}`, `<p class="field-hint">Solo aparecen los servicios activos y seleccionados en general.</p>${renderCasillasServicios(permitidos.map((elemento) => ({ id: elemento.id, name: elemento.nombre })), seleccion.servicioIds || [])}`, async (formulario) => {
    await api(`${rutaProfesional()}/sucursales/${sucursalId}/servicios`, 'PUT', { servicioIds: formulario.getAll('serviceIds').map(Number) });
    await actualizarDatosDisponibilidad(true);
  }, true, opcionesFormularioServicios);
  const formulario = dialogo.querySelector('#editor-form');
  formulario.addEventListener('change', (evento) => limpiarCampoDisponibilidad(formulario, evento.target));
}

async function alternarAtencion(sucursalId, boton) {
  const sucursal = consultarDatosDisponibilidad()?.oferta?.sucursales.find((elemento) => elemento.id === sucursalId);
  if (!sucursal) throw new Error('La sucursal no está asignada.');
  boton.disabled = true;
  try {
    await api(`${rutaProfesional()}/sucursales/${sucursalId}/atencion`, 'PUT', { activo: !sucursal.atencionActiva });
    await actualizarDatosDisponibilidad(true);
    toast(sucursal.atencionActiva ? 'Atención pausada en la sucursal.' : 'Atención activada en la sucursal.');
  } catch (error) { boton.disabled = false; throw error; }
}

export async function handleClicDisponibilidad(evento) {
  const horario = evento.target.closest('[data-disponibilidad-horario]');
  if (horario) {
    seleccionarHorarioConsultado(horario.dataset.fechaHorario, horario.dataset.horaHorario);
    return true;
  }
  const boton = evento.target.closest('[data-disponibilidad-accion]');
  if (!boton) return false;
  if (boton.disabled) return true;
  boton.disabled = true;
  const accion = boton.dataset.disponibilidadAccion;
  const sucursalId = Number(boton.dataset.sucursalOfertaId);
  // Las rutas de excepción por fecha ya no existen; Bloqueos sigue en su módulo.
  try {
    if (accion === 'servicios-generales') await editarServiciosGenerales();
    else if (accion === 'servicios-sucursal') await editarServiciosSucursal(sucursalId);
    else if (accion === 'atencion') await alternarAtencion(sucursalId, boton);
    else if (accion === 'reintentar') await actualizarDatosDisponibilidad(true);
    else if (accion === 'reintentar-configuracion') await actualizarConfiguracionAgenda();
    else if (accion === 'reintentar-consulta') await consultarHorariosDisponibles();
    else if (accion === 'reintentar-afectadas') await consultarCitasAfectadas();
    else if (accion === 'cambiar-a-manual') { establecerFiltrosConsulta({ modalidad: 'manual' }); render(); }
  } finally { boton.disabled = false; }
  return true;
}

document.addEventListener('submit', async (evento) => {
  if (state.page !== 'disponibilidad') return;
  evento.preventDefault();
  const formulario = evento.target;
  if (formulario.id === 'formulario-asignaciones-sucursales') {
    const boton = formulario.querySelector('[type="submit"]');
    if (boton.disabled) return;
    boton.disabled = true;
    try { await guardarSucursalesAsignadas(formulario); }
    catch (error) {
      const destino = formulario.querySelector('[data-asignacion-error]');
      destino.textContent = error.status === 409
        ? 'No se pudo quitar la sucursal: conserva horarios u otros ajustes de atención. Revísalos antes de reintentar.'
        : [403, 404].includes(error.status)
          ? 'La asignación o la sucursal ya no está disponible. Actualiza la página y vuelve a intentarlo.'
          : error.message || 'No se pudieron guardar las asignaciones. Inténtalo de nuevo.';
      destino.hidden = false;
      destino.focus();
    } finally { boton.disabled = false; }
    return;
  }
  if (formulario.id === 'formulario-configuracion-agenda') {
    const datos = new FormData(formulario);
    // El contrato conectado usa el tiempo después de cada cita; el campo viejo pertenece solo a la demo.
    const leerNumero = (nombre) => datos.get(nombre) === null || datos.get(nombre) === '' ? Number.NaN : Number(datos.get(nombre));
    const valores = { modo: datos.get('modo'), tiempoEntreCitasMinutos: leerNumero('tiempoEntreCitasMinutos'), anticipacionMinutos: leerNumero('anticipacionMinutos'), diasFuturos: leerNumero('diasFuturos') };
    const guardado = await guardarConfiguracionConectada(valores);
    if (guardado) toast('Reglas de agenda guardadas.');
    return;
  }
  if (formulario.id === 'formulario-consulta-horarios') {
    const datos = new FormData(formulario);
    const valores = { personalId: Number(datos.get('personalId')), sucursalId: Number(datos.get('sucursalId')), servicioId: Number(datos.get('servicioId')), from: datos.get('from'), to: datos.get('to'), modalidad: datos.get('modalidad') };
    const errores = validarRangoInclusivo(valores.from, valores.to);
    for (const clave of ['personalId', 'sucursalId', 'servicioId']) if (!Number.isSafeInteger(valores[clave]) || valores[clave] <= 0) errores[clave] = 'Selecciona un identificador válido.';
    if (Object.keys(errores).length) { establecerFiltrosConsulta(valores); establecerErroresConsulta(errores); return; }
    await consultarHorariosDisponibles(valores);
    return;
  }
  if (formulario.id === 'formulario-validacion-horario') {
    const datos = new FormData(formulario);
    const valores = { personalId: Number(datos.get('personalId')), sucursalId: Number(datos.get('sucursalId')), servicioId: Number(datos.get('servicioId')), fechaLocal: datos.get('fechaLocal'), horaInicio: datos.get('horaInicio'), modalidad: datos.get('modalidad') };
    if ([valores.personalId, valores.sucursalId, valores.servicioId]
      .some((valor) => !Number.isSafeInteger(valor) || valor <= 0)) {
      mostrarErrorGeneralDisponibilidad(formulario, new Error('Consulta primero una combinación válida.'), '#validacion-horario-error');
      return;
    }
    if (Object.keys(validarRangoInclusivo(valores.fechaLocal, valores.fechaLocal)).length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(valores.horaInicio || '')) {
      mostrarErrorGeneralDisponibilidad(formulario, new Error('Selecciona una fecha y hora válidas.'), '#validacion-horario-error');
      return;
    }
    await validarInicioConsultado(valores);
    return;
  }
  if (formulario.id === 'formulario-citas-afectadas') {
    const datos = new FormData(formulario);
    const valores = { personalId: datos.get('personalId') ? Number(datos.get('personalId')) : '', sucursalId: datos.get('sucursalId') ? Number(datos.get('sucursalId')) : '', from: datos.get('from'), to: datos.get('to') };
    const errores = validarRangoInclusivo(valores.from, valores.to);
    for (const clave of ['personalId', 'sucursalId']) if (valores[clave] !== '' && (!Number.isSafeInteger(valores[clave]) || valores[clave] <= 0)) errores[clave] = 'Usa un identificador entero positivo.';
    if (Object.keys(errores).length) { establecerErroresAfectadas(errores, valores); return; }
    await consultarCitasAfectadas(valores);
    return;
  }
  if (formulario.id !== 'formulario-proyeccion') return;
  const boton = formulario.querySelector('[type="submit"]');
  const desde = formulario.elements.from.value, hasta = formulario.elements.to.value;
  boton.disabled = true;
  try {
    const errores = validarProyeccion(desde, hasta);
    if (Object.keys(errores).length) { mostrarErroresDisponibilidad(formulario, errores); return; }
    limpiarErroresDisponibilidad(formulario);
    const datos = await api(`${rutaProfesional()}/atencion?desde=${desde}&hasta=${hasta}`);
    mostrarProyeccion(datos, desde, hasta);
  } catch (error) { mostrarErrorGeneralDisponibilidad(formulario, error, '#proyeccion-error'); }
  finally { boton.disabled = false; }
});

document.addEventListener('input', (evento) => {
  if (evento.target.closest('#formulario-proyeccion')) limpiarCampoDisponibilidad(evento.target.form, evento.target);
});
document.addEventListener('change', (evento) => {
  if (evento.target.closest('#formulario-proyeccion')) limpiarCampoDisponibilidad(evento.target.form, evento.target);
  if (evento.target.form?.id === 'formulario-consulta-horarios' && evento.target.name === 'modalidad') {
    const datos = new FormData(evento.target.form);
    establecerFiltrosConsulta({ personalId: Number(datos.get('personalId')) || '', sucursalId: Number(datos.get('sucursalId')) || '', servicioId: Number(datos.get('servicioId')) || '', from: datos.get('from'), to: datos.get('to'), modalidad: datos.get('modalidad') });
    render();
  }
});
