import { api, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { list, TODAY, addDays, formatDate } from '../../../shared/data.js';
import { escape as esc, empty } from '../../../shared/ui.js';
import { renderDisponibilidadSemanal } from '../../../shared/screens/disponibilidad/disponibilidad.vista.js';
import { renderPanelOferta } from '../../../shared/screens/disponibilidad/disponibilidad.oferta.js';
import { renderFormularioAsignaciones, bloqueosDeAsignacion } from '../../../shared/screens/disponibilidad/disponibilidad.asignaciones-sucursales.js';
import { renderPanelCitasAfectadas, renderPanelConsultaHorario, renderPanelConfiguracion } from '../../../shared/screens/disponibilidad/disponibilidad.operativa.js';
import { etiquetaHoraDesdeMinutos } from './disponibilidad.payload.js';
import './disponibilidad.estilos.css';
import { leerConfiguracionConectada } from '../../../shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';
import { guardarReglasAgenda } from '../../modules/disponibilidad/disponibilidad.configuracion.js';

let datosPerfil = null;
let cargaPerfil = null;
let proyeccion = null;
let rango = { from: TODAY, to: addDays(TODAY, 13) };
let configuracion = { cargado: false, ocupado: false, datos: null, borrador: null, errores: {}, error: '' };
let consulta = {
  ocupado: false, resultado: null, error: '', errores: {}, desactualizado: false,
  filtros: { personalId: '', sucursalId: '', servicioId: '', from: TODAY, to: addDays(TODAY, 6), modalidad: 'publica' },
  validacion: { ocupado: false, resultado: null, error: '', date: '', time: '' },
};
let afectadas = {
  ocupado: false, resultado: null, error: '', errores: {}, desactualizado: false,
  filtros: { personalId: '', sucursalId: '', from: TODAY, to: addDays(TODAY, 6) },
};

export function consultarProfesionalHorario() {
  const profesionales = list('professionals', state.tenantId);
  return profesionales.find((persona) => persona.id === Number(state.profesionalHorario)) || profesionales[0];
}

const mensajeSeguro = (error) => [403, 404].includes(error.status)
  ? 'La operación o el recurso no está disponible.' : error.message;
const esFalloTecnico = (error) => !error.status || error.status === 500 || error.status === 503;
const renderSiDisponible = () => { if (state.page === 'disponibilidad') render(); };

export async function actualizarDatosDisponibilidad(forzar = false) {
  const persona = consultarProfesionalHorario();
  if (!persona) return;
  const id = persona.id;
  if (!forzar && datosPerfil?.id === id) return;
  if (cargaPerfil?.id === id) return cargaPerfil.promesa;
  datosPerfil = { id, ocupado: true, error: '', oferta: null };
  // La oferta es la única lectura extra del perfil; las rutas de excepción fueron retiradas.
  const promesa = api(`/profesionales/${id}/oferta`).then((oferta) => {
    if (datosPerfil?.id === id) datosPerfil = { id, ocupado: false, error: '', oferta };
  }).catch((error) => {
    if (datosPerfil?.id === id) datosPerfil = { id, ocupado: false, error: mensajeSeguro(error), oferta: null };
  }).finally(() => {
    if (cargaPerfil?.id === id) cargaPerfil = null;
    renderSiDisponible();
  });
  cargaPerfil = { id, promesa };
  return promesa;
}

export function mostrarProyeccion(resultado, desde, hasta) {
  proyeccion = { id: consultarProfesionalHorario()?.id, resultado };
  rango = { from: desde, to: hasta };
  render();
}
export function invalidarProyeccion() { proyeccion = null; }

const ETIQUETAS_MOTIVOS = {
  cuenta_inactiva: 'Cuenta inactiva', sucursal_inactiva: 'Sucursal inactiva',
  servicio_inactivo: 'Servicio inactivo', servicio_no_seleccionado: 'No seleccionado en general',
  atencion_inactiva: 'Atención pausada', servicio_no_ofrecido_en_sucursal: 'No seleccionado en esta sucursal',
};
const formatearFechaProyeccion = (valor) => formatDate(valor, { day: 'numeric', month: 'short', year: 'numeric' });
const nombreSucursal = (id) => list('branches', state.tenantId).find((sucursal) => sucursal.id === id)?.name || `Sucursal ${id}`;

function renderSeccionOferta(persona) { return renderPanelOferta(persona, datosPerfil?.oferta, false, user.rol === 'admin_negocio'); }

function renderSeccionAsignaciones(persona) {
  const sucursales = list('branches', state.tenantId);
  return `<section class="surface disponibilidad-seccion-adicional"><div class="section-heading"><div><h2>Sucursales asignadas</h2><p>Elige las sucursales donde puede atender ${esc(persona.name)}. Después configura sus horarios y servicios.</p></div></div>
    ${sucursales.length ? renderFormularioAsignaciones(persona, sucursales, false, bloqueosDeAsignacion(persona, list('schedules', state.tenantId))) : empty('Sin sucursales disponibles', 'Crea una sucursal en el catálogo antes de asignarla.')}</section>`;
}

function renderSeccionProyeccion(persona) {
  const datos = proyeccion?.id === persona.id ? proyeccion.resultado : null;
  return `<section class="surface disponibilidad-seccion-adicional"><div class="section-heading"><div><h2>Proyección de atención</h2><p>Muestra tramos de trabajo; no representa espacios reservables.</p></div></div><form id="formulario-proyeccion" class="proyeccion-filtros" novalidate><label data-disponibilidad-campo="from">Desde<input class="form-control" type="date" name="from" required value="${rango.from}"></label><label data-disponibilidad-campo="to">Hasta<input class="form-control" type="date" name="to" required value="${rango.to}"></label><button class="btn btn-primary" type="submit">Consultar proyección</button><p id="proyeccion-error" class="form-error disponibilidad-error-general" role="alert" tabindex="-1" hidden></p></form><p class="disponibilidad-nota">La proyección no aplica la selección de servicios ni el interruptor individual de atención por sucursal.</p>${datos ? `<div class="proyeccion-resultados"><h3>Intervalos (${datos.intervalos.length})</h3>${datos.intervalos.length ? `<div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Fecha</th><th>Sucursal</th><th>Horario local</th></tr></thead><tbody>${datos.intervalos.map((elemento) => `<tr><td>${esc(formatearFechaProyeccion(elemento.fecha))}</td><td>${esc(nombreSucursal(elemento.sucursalId))}</td><td>${etiquetaHoraDesdeMinutos(elemento.inicioMinutos)}–${etiquetaHoraDesdeMinutos(elemento.finMinutos)}</td></tr>`).join('')}</tbody></table></div>` : empty('Sin intervalos', 'No hay tramos de atención en este rango.')}<h3>Omisiones (${datos.omisiones.length})</h3>${datos.omisiones.length ? `<div class="blocks-list">${datos.omisiones.map((elemento) => `<div class="bloqueo-entrada"><div><strong>${esc(formatearFechaProyeccion(elemento.fecha))} · ${esc(nombreSucursal(elemento.sucursalId))}</strong><small>${esc(elemento.motivo)}</small></div></div>`).join('')}</div>` : '<p class="disponibilidad-nota">No se reportaron omisiones.</p>'}</div>` : ''}</section>`;
}

function prepararFiltrosIniciales() {
  const profesionales = list('professionals', state.tenantId);
  const sucursales = list('branches', state.tenantId);
  const servicios = list('services', state.tenantId);
  const persona = user.rol === 'profesional' ? profesionales[0] : profesionales.find((elemento) => elemento.id === Number(consulta.filtros.personalId)) || profesionales[0];
  if (persona && !consulta.filtros.personalId) consulta.filtros.personalId = persona.id;
  if (persona && !afectadas.filtros.personalId && user.rol === 'profesional') afectadas.filtros.personalId = persona.id;
  const sucursalesPermitidas = persona ? sucursales.filter((elemento) => persona.branchIds?.includes(elemento.id)) : sucursales;
  const serviciosPermitidos = persona ? servicios.filter((elemento) => persona.serviceIds?.includes(elemento.id)) : servicios;
  if (!consulta.filtros.sucursalId && sucursalesPermitidas[0]) consulta.filtros.sucursalId = sucursalesPermitidas[0].id;
  if (!consulta.filtros.servicioId && serviciosPermitidos[0]) consulta.filtros.servicioId = serviciosPermitidos[0].id;
  return { people: profesionales, sucursales: sucursales, servicios: servicios };
}

export async function actualizarConfiguracionAgenda() {
  if (user.rol !== 'admin_negocio' || configuracion.ocupado) return;
  configuracion = { ...configuracion, ocupado: true, error: '' };
  renderSiDisponible();
  try {
    const datos = leerConfiguracionConectada(await api('/disponibilidad/configuracion'));
    configuracion = { cargado: true, ocupado: false, datos, borrador: null, errores: {}, error: '' };
  } catch (error) {
    configuracion = { ...configuracion, cargado: true, ocupado: false, error: mensajeSeguro(error) };
  }
  renderSiDisponible();
}

export async function guardarConfiguracionConectada(valores) {
  if (user.rol !== 'admin_negocio' || configuracion.ocupado || !configuracion.datos) return false;
  // La frontera valida el reemplazo completo y devuelve el borrador ante 400/503.
  const anterior = configuracion;
  configuracion = { ...anterior, ocupado: true, borrador: valores, error: '', errores: {} };
  renderSiDisponible();
  const resultado = await guardarReglasAgenda(anterior, valores);
  configuracion = resultado.estado;
  renderSiDisponible();
  return resultado.guardado;
}

export function establecerFiltrosConsulta(filtros) {
  consulta = { ...consulta, filtros: { ...consulta.filtros, ...filtros }, errores: {}, error: '', validacion: { ...consulta.validacion, resultado: null, error: '' } };
}
export function establecerErroresConsulta(errores) { consulta = { ...consulta, errores }; renderSiDisponible(); }
export function seleccionarHorarioConsultado(fecha, hora) { consulta = { ...consulta, validacion: { ...consulta.validacion, date: fecha, time: hora, resultado: null, error: '' } }; renderSiDisponible(); }

export async function consultarHorariosDisponibles(filtros = consulta.filtros) {
  establecerFiltrosConsulta(filtros);
  consulta = { ...consulta, ocupado: true, error: '' };
  renderSiDisponible();
  const parametros = new URLSearchParams({ personalId: String(filtros.personalId), sucursalId: String(filtros.sucursalId), servicioId: String(filtros.servicioId), desde: filtros.from, hasta: filtros.to, modalidad: filtros.modalidad });
  try {
    const resultado = await api(`/disponibilidad?${parametros}`);
    consulta = { ...consulta, ocupado: false, resultado, error: '', errores: {}, desactualizado: false };
  } catch (error) {
    const falloTecnico = esFalloTecnico(error);
    consulta = { ...consulta, ocupado: false, resultado: falloTecnico ? consulta.resultado : null, error: mensajeSeguro(error), desactualizado: Boolean(consulta.resultado) && falloTecnico };
  }
  renderSiDisponible();
}

export async function validarInicioConsultado(valores) {
  consulta = { ...consulta, validacion: { ...consulta.validacion, ocupado: true, resultado: null, error: '', date: valores.fechaLocal, time: valores.horaInicio } };
  renderSiDisponible();
  try {
    const resultado = await api('/disponibilidad/validar', 'POST', valores);
    consulta = { ...consulta, validacion: { ...consulta.validacion, ocupado: false, resultado, error: '' } };
  } catch (error) {
    consulta = { ...consulta, validacion: { ...consulta.validacion, ocupado: false, resultado: null, error: mensajeSeguro(error) } };
  }
  renderSiDisponible();
}

export function establecerErroresAfectadas(errores, filtros = afectadas.filtros) { afectadas = { ...afectadas, filtros: { ...filtros }, errores }; renderSiDisponible(); }
export async function consultarCitasAfectadas(filtros = afectadas.filtros) {
  afectadas = { ...afectadas, filtros: { ...filtros }, ocupado: true, error: '', errores: {} };
  renderSiDisponible();
  const parametros = new URLSearchParams({ desde: filtros.from, hasta: filtros.to });
  if (filtros.personalId) parametros.set('personalId', String(filtros.personalId));
  if (filtros.sucursalId) parametros.set('sucursalId', String(filtros.sucursalId));
  try {
    const resultado = await api(`/disponibilidad/citas-afectadas?${parametros}`);
    afectadas = { ...afectadas, ocupado: false, resultado, error: '', desactualizado: false };
  } catch (error) {
    const falloTecnico = esFalloTecnico(error);
    afectadas = { ...afectadas, ocupado: false, resultado: falloTecnico ? afectadas.resultado : null, error: mensajeSeguro(error), desactualizado: Boolean(afectadas.resultado) && falloTecnico };
  }
  renderSiDisponible();
}

export function renderDisponibilidadConectada() {
  const catalogos = prepararFiltrosIniciales();
  if (user.rol === 'admin_negocio' && !configuracion.cargado && !configuracion.ocupado) void actualizarConfiguracionAgenda();
  const panelesOperativos = [];
  if (user.rol === 'admin_negocio') panelesOperativos.push({ id: 'configuracion', etiqueta: 'Reglas de agenda', contexto: false, contenido: renderPanelConfiguracion(configuracion) });
  panelesOperativos.push(
    { id: 'horarios', etiqueta: 'Horarios disponibles', contexto: false, contenido: renderPanelConsultaHorario({ ...consulta, rol: user.rol, profesionales: catalogos.people, sucursales: catalogos.sucursales, servicios: catalogos.servicios }) },
    { id: 'afectadas', etiqueta: 'Citas afectadas', contexto: false, contenido: renderPanelCitasAfectadas({ ...afectadas, rol: user.rol, profesionales: catalogos.people, sucursales: catalogos.sucursales, servicios: catalogos.servicios }) },
  );
  if (user.rol === 'recepcionista') return renderDisponibilidadSemanal({ panelesAdicionales: panelesOperativos });

  const persona = consultarProfesionalHorario();
  if (!persona) return renderDisponibilidadSemanal({ panelesAdicionales: panelesOperativos });
  if (datosPerfil?.id !== persona.id && cargaPerfil?.id !== persona.id) void actualizarDatosDisponibilidad();
  const perfil = datosPerfil?.id === persona.id ? datosPerfil : null;
  const contenidoPendiente = !perfil || perfil.ocupado
    ? '<section class="surface disponibilidad-seccion-adicional" aria-busy="true"><p class="disponibilidad-nota">Cargando datos de disponibilidad…</p></section>'
    : perfil.error
      ? `<section class="surface disponibilidad-seccion-adicional"><p role="alert">${esc(perfil.error)}</p><button type="button" class="btn btn-light" data-disponibilidad-accion="reintentar">Reintentar</button></section>`
      : null;
  return renderDisponibilidadSemanal({
    panelesAdicionales: [
      ...(user.rol === 'admin_negocio' ? [{ id: 'sucursales', etiqueta: 'Sucursales asignadas', contenido: renderSeccionAsignaciones(persona) }] : []),
      { id: 'oferta', etiqueta: 'Oferta por sucursal', contenido: contenidoPendiente || renderSeccionOferta(persona) },
      { id: 'proyeccion', etiqueta: 'Proyección de atención', contenido: contenidoPendiente || renderSeccionProyeccion(persona) },
      ...panelesOperativos,
    ],
  });
}

export function consultarDatosDisponibilidad() { return datosPerfil; }
