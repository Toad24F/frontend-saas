import '../../../demo/agenda.estado-rapido.js';
import './agenda.menu-estado.css';
import './agenda.estilos.css';
import './agenda.refinamientos.css';
import './agenda.utilidades.css';
import { atencionEquipo } from './agenda.utilidades.js';
import { resolverSucursalesAgenda } from './agenda.filtros.js';
import { estadoAplicacion as estado, render } from '../../aplicacion.nucleo.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { metricasAgenda } from './agenda.presentacion.js';
import { estructuraAgenda } from './agenda.estructura.js';
import { renderLineaTiempo } from './agenda.linea-tiempo.js';
import { tituloCalendario, renderMes } from './agenda.mes.js';
import { periodoCalendario, sumarDiasCiviles } from '../../../connected/modules/agenda/agenda.calendario.js';
import { aplicarEfectosAgenda, renderAgendaConservandoPosicion } from './agenda.navegacion.js';
import { atencionDemo, causasCitaDemo } from '../../../demo/agenda.atencion.js';
import { listarRegistros, HOY, ampliarDatosCita, obtenerNegocio } from '../../aplicacion.datos.js';
import { escaparHtml, renderEncabezadoPagina, renderBoton } from '../../interfaz.componentes.js';
import { etiquetasEstadoCita } from '../../aplicacion.datos.js';
let soloAfectadas = false, negocioInicializado;
export function sincronizarFiltrosAgendaDemo() {
  const inicial = negocioInicializado !== estado.negocioId;
  if (inicial) { negocioInicializado = estado.negocioId; estado.historialAgenda = false; }
  const resultado = resolverSucursalesAgenda({ sucursales: listarRegistros('branches', estado.negocioId), profesionales: listarRegistros('professionals', estado.negocioId), profesional: estado.profesional, sucursal: estado.sucursal, inicial, historial: estado.historialAgenda });
  estado.sucursal = resultado.sucursal;
  return resultado;
}
const normalizarBusqueda = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
export function citasFiltradas() {
  return listarRegistros('appointments', estado.negocioId).filter((a) =>
    (estado.sucursal === 'all' || a.branchId === Number(estado.sucursal)) &&
    (estado.profesional === 'all' || a.professionalId === Number(estado.profesional)) &&
    (estado.estadoCita === 'all' || a.status === estado.estadoCita) &&
    (!estado.busqueda || normalizarBusqueda(ampliarDatosCita(a).client.name).includes(normalizarBusqueda(estado.busqueda.trim()))));
}
// Resumen conserva sus tarjetas; únicamente la pantalla Agenda usa el resumen lineal.
export function resumenAgendaDemo() { return metricasAgenda(listarRegistros('appointments', estado.negocioId), estado.fecha); }
export function vistaAgenda() {
  const modeloSucursales = sincronizarFiltrosAgendaDemo();
  const periodo = periodoCalendario(estado.vistaCalendario, estado.fecha);
  const dias = Array.from({ length: estado.vistaCalendario === 'day' ? 1 : estado.vistaCalendario === 'month' ? 42 : 7 }, (_, i) => sumarDiasCiviles(periodo.desde, i));
  const horarios = listarRegistros('schedules', estado.negocioId), bloqueos = listarRegistros('blocks', estado.negocioId);
  const citasAgenda = citasFiltradas().filter((a) => a.date >= periodo.desde && a.date <= periodo.hasta).map((a) => {
    const info = ampliarDatosCita(a);
    return { id: a.id, folio: a.folio, fechaLocal: a.date, fechaFinLocal: a.date, horaInicio: a.start, horaFin: a.end,
      estado: a.status, personalId: a.professionalId, sucursalId: a.branchId, nombreContacto: info.client.name,
      nombreSucursal: info.branch.name, nombreProfesional: info.professional.name, nombreServicio: info.service.name, zonaHoraria: 'America/Chihuahua',
      causas: causasCitaDemo(a, horarios, bloqueos) };
  }).filter((a) => !soloAfectadas || a.causas.length);
  const selectorCampo = (tipo, etiqueta, elementos) => `<label class="selector-filtro">${renderIcono(tipo === 'sucursal' ? 'pin' : tipo === 'profesional' ? 'users' : 'circleCheck')}<select aria-label="${tipo === 'sucursal' ? 'Sucursal' : tipo === 'profesional' ? 'Profesional' : 'Estado'}" data-filtro-agenda="${tipo}">${!elementos.length && estado[tipo] === 'none' ? '<option value="none">Sin sucursales asignadas</option>' : ''}<option value="all" ${estado[tipo] === 'all' ? 'selected' : ''}>${etiqueta}</option>${elementos.map((o) => `<option value="${o.id}" ${String(estado[tipo]) === String(o.id) ? 'selected' : ''}>${escaparHtml(o.name)}</option>`).join('')}</select>${renderIcono('down')}</label>`;
  const filtros = selectorCampo('profesional', 'Todos los profesionales', listarRegistros('professionals', estado.negocioId)) + selectorCampo('sucursal', 'Todas las sucursales', modeloSucursales.opciones) + selectorCampo('estadoCita', 'Todos los estados', Object.entries(etiquetasEstadoCita).map(([id, nombre]) => ({ id, name: nombre }))) + (estado.profesional !== 'all' ? `<label class="agenda-filtro-historial"><input type="checkbox" data-demo-agenda-historial ${estado.historialAgenda ? 'checked' : ''}> Consultar otras sucursales (histórico)</label>` : '');
  const atencion = atencionDemo(dias, estado.profesional, estado.sucursal, horarios, bloqueos);
  const atencionPorProfesional = estado.vistaCalendario !== 'month' && estado.profesional === 'all' ? Object.fromEntries([...new Set([...listarRegistros('professionals', estado.negocioId).filter((p) => p.active !== false && (estado.sucursal === 'all' || p.branchIds?.includes(Number(estado.sucursal)))).map((p) => p.id), ...citasAgenda.map((a) => a.personalId)])].map((id) => [id, { data: atencionDemo(dias, String(id), estado.sucursal, horarios, bloqueos) }])) : undefined;
  const opciones = { atencionEquipo: estado.vistaCalendario === 'week' && estado.profesional === 'all' ? atencionEquipo(atencionPorProfesional) : undefined, atencionPorProfesional, profesional: estado.profesional, profesionales: listarRegistros('professionals', estado.negocioId), demo: true, permitirCambiosEstado: true, atencion, sucursal: estado.sucursal, zonas: ['America/Chihuahua'], anchoColumna: Math.max(160, ((document.querySelector('.agenda-calendario')?.clientWidth || innerWidth - 300) - 58) / 7) };
  const cuerpo = `${citasAgenda.length ? '' : '<p class="agenda-resumen-vacio" role="status">Sin citas en este periodo</p>'}${estado.vistaCalendario === 'month' ? renderMes(estado.fecha, citasAgenda, HOY, opciones) : renderLineaTiempo(dias, citasAgenda, HOY, opciones)}`;
  aplicarEfectosAgenda();
  return renderEncabezadoPagina('Agenda', 'Consulta y da seguimiento a las citas de tu negocio.', `<a class="btn btn-light" href="/reservas/${obtenerNegocio(estado.negocioId).slug}" data-portal>${renderIcono('external')}Portal de reservas</a>${renderBoton('Nueva cita', 'nueva-cita')}`) + estructuraAgenda({ titulo: tituloCalendario(estado.vistaCalendario, estado.fecha), vista: estado.vistaCalendario, demo: true, filtros, busqueda: estado.busqueda, resumen: citasAgenda, ocupado: false, cuerpo, soloAfectadas, zonas: ['America/Chihuahua'], aviso: '' });
}
document.addEventListener('click', (evento) => {
  if (!new URLSearchParams(location.search).has('demo') || estado.pagina !== 'agenda') return;
  if (evento.target.closest('[data-agenda-demo-limpiar]')) { estado.busqueda = ''; render(); document.querySelector('#agenda-busqueda')?.focus(); }
  if (evento.target.closest('[data-agenda-demo-actualizar]')) {
    renderAgendaConservandoPosicion(render);
    const anuncio = document.querySelector('[data-agenda-anuncio]');
    if (anuncio) anuncio.textContent = 'Agenda de demostración actualizada con los datos locales.';
  }
});
document.addEventListener('change', (evento) => {
  if (evento.target.matches('[data-demo-agenda-historial]')) { estado.historialAgenda = evento.target.checked; render(); document.querySelector('[data-demo-agenda-historial]')?.focus(); }
  if (evento.target.matches('[data-agenda-demo-afectadas]')) { soloAfectadas = evento.target.checked; render(); document.querySelector('[data-agenda-demo-afectadas]')?.focus(); }
});
document.addEventListener('submit', (evento) => { if (evento.target.matches('[data-demo-agenda-filtros]')) evento.preventDefault(); });
