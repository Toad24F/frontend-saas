import '../../../demo/agenda.estado-rapido.js';
import './agenda.menu-estado.css';
import './agenda.estilos.css';
import './agenda.refinamientos.css';
import './agenda.utilidades.css';
import { atencionEquipo } from './agenda.utilidades.js';
import { resolverSucursalesAgenda } from './agenda.filtros.js';
import { state as estado, render } from '../../app.js';
import { icon } from '../../icons.js';
import { metricasAgenda } from './agenda.presentacion.js';
import { estructuraAgenda } from './agenda.estructura.js';
import { renderLineaTiempo } from './agenda.linea-tiempo.js';
import { tituloCalendario, renderMes } from './agenda.mes.js';
import { periodoCalendario, sumarDiasCiviles } from '../../../connected/modules/agenda/agenda.calendario.js';
import { aplicarEfectosAgenda, renderAgendaConservandoPosicion } from './agenda.navegacion.js';
import { atencionDemo, causasCitaDemo } from '../../../demo/agenda.atencion.js';
import { list, TODAY, appointmentInfo, tenantById } from '../../data.js';
import { escape, pageHead, button } from '../../ui.js';
import { statuses } from '../../data.js';
let soloAfectadas = false, negocioInicializado;
export function sincronizarFiltrosAgendaDemo() {
  const inicial = negocioInicializado !== estado.tenantId;
  if (inicial) { negocioInicializado = estado.tenantId; estado.agendaHistory = false; }
  const resultado = resolverSucursalesAgenda({ sucursales: list('branches', estado.tenantId), profesionales: list('professionals', estado.tenantId), profesional: estado.professional, sucursal: estado.branch, inicial, historial: estado.agendaHistory });
  estado.branch = resultado.sucursal;
  return resultado;
}
const normalizarBusqueda = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
export function citasFiltradas() {
  return list('appointments', estado.tenantId).filter((a) =>
    (estado.branch === 'all' || a.branchId === Number(estado.branch)) &&
    (estado.professional === 'all' || a.professionalId === Number(estado.professional)) &&
    (estado.status === 'all' || a.status === estado.status) &&
    (!estado.search || normalizarBusqueda(appointmentInfo(a).client.name).includes(normalizarBusqueda(estado.search.trim()))));
}
// Resumen conserva sus tarjetas; únicamente la pantalla Agenda usa el resumen lineal.
export function resumenAgendaDemo() { return metricasAgenda(list('appointments', estado.tenantId), estado.date); }
export function vistaAgenda() {
  const modeloSucursales = sincronizarFiltrosAgendaDemo();
  const periodo = periodoCalendario(estado.calendarView, estado.date);
  const dias = Array.from({ length: estado.calendarView === 'day' ? 1 : estado.calendarView === 'month' ? 42 : 7 }, (_, i) => sumarDiasCiviles(periodo.desde, i));
  const horarios = list('schedules', estado.tenantId), bloqueos = list('blocks', estado.tenantId);
  const citasAgenda = citasFiltradas().filter((a) => a.date >= periodo.desde && a.date <= periodo.hasta).map((a) => {
    const info = appointmentInfo(a);
    return { id: a.id, folio: a.folio, fechaLocal: a.date, fechaFinLocal: a.date, horaInicio: a.start, horaFin: a.end,
      estado: a.status, personalId: a.professionalId, sucursalId: a.branchId, nombreContacto: info.client.name,
      nombreSucursal: info.branch.name, nombreProfesional: info.professional.name, nombreServicio: info.service.name, zonaHoraria: 'America/Chihuahua',
      causas: causasCitaDemo(a, horarios, bloqueos) };
  }).filter((a) => !soloAfectadas || a.causas.length);
  const selectorCampo = (tipo, etiqueta, elementos) => `<label class="filter-select">${icon(tipo === 'branch' ? 'pin' : tipo === 'professional' ? 'users' : 'circleCheck')}<select aria-label="${tipo === 'branch' ? 'Sucursal' : tipo === 'professional' ? 'Profesional' : 'Estado'}" data-filtro-agenda="${tipo}">${!elementos.length && estado[tipo] === 'none' ? '<option value="none">Sin sucursales asignadas</option>' : ''}<option value="all" ${estado[tipo] === 'all' ? 'selected' : ''}>${etiqueta}</option>${elementos.map((o) => `<option value="${o.id}" ${String(estado[tipo]) === String(o.id) ? 'selected' : ''}>${escape(o.name)}</option>`).join('')}</select>${icon('down')}</label>`;
  const filtros = selectorCampo('professional', 'Todos los profesionales', list('professionals', estado.tenantId)) + selectorCampo('branch', 'Todas las sucursales', modeloSucursales.opciones) + selectorCampo('status', 'Todos los estados', Object.entries(statuses).map(([id, nombre]) => ({ id, name: nombre }))) + (estado.professional !== 'all' ? `<label class="agenda-filtro-historial"><input type="checkbox" data-demo-agenda-historial ${estado.agendaHistory ? 'checked' : ''}> Consultar otras sucursales (histórico)</label>` : '');
  const atencion = atencionDemo(dias, estado.professional, estado.branch, horarios, bloqueos);
  const atencionPorProfesional = estado.calendarView !== 'month' && estado.professional === 'all' ? Object.fromEntries([...new Set([...list('professionals', estado.tenantId).filter((p) => p.active !== false && (estado.branch === 'all' || p.branchIds?.includes(Number(estado.branch)))).map((p) => p.id), ...citasAgenda.map((a) => a.personalId)])].map((id) => [id, { data: atencionDemo(dias, String(id), estado.branch, horarios, bloqueos) }])) : undefined;
  const opciones = { atencionEquipo: estado.calendarView === 'week' && estado.professional === 'all' ? atencionEquipo(atencionPorProfesional) : undefined, atencionPorProfesional, profesional: estado.professional, profesionales: list('professionals', estado.tenantId), demo: true, permitirCambiosEstado: true, atencion, sucursal: estado.branch, zonas: ['America/Chihuahua'], anchoColumna: Math.max(160, ((document.querySelector('.agenda-calendario')?.clientWidth || innerWidth - 300) - 58) / 7) };
  const cuerpo = `${citasAgenda.length ? '' : '<p class="agenda-resumen-vacio" role="status">Sin citas en este periodo</p>'}${estado.calendarView === 'month' ? renderMes(estado.date, citasAgenda, TODAY, opciones) : renderLineaTiempo(dias, citasAgenda, TODAY, opciones)}`;
  aplicarEfectosAgenda();
  return pageHead('Agenda', 'Consulta y da seguimiento a las citas de tu negocio.', `<a class="btn btn-light" href="/reservas/${tenantById(estado.tenantId).slug}" data-portal>${icon('external')}Portal de reservas</a>${button('Nueva cita', 'nueva-cita')}`) + estructuraAgenda({ titulo: tituloCalendario(estado.calendarView, estado.date), vista: estado.calendarView, demo: true, filtros, busqueda: estado.search, resumen: citasAgenda, ocupado: false, cuerpo, soloAfectadas, zonas: ['America/Chihuahua'], aviso: '' });
}
document.addEventListener('click', (evento) => {
  if (!new URLSearchParams(location.search).has('demo') || estado.page !== 'agenda') return;
  if (evento.target.closest('[data-agenda-demo-limpiar]')) { estado.search = ''; render(); document.querySelector('#agenda-busqueda')?.focus(); }
  if (evento.target.closest('[data-agenda-demo-actualizar]')) {
    renderAgendaConservandoPosicion(render);
    const anuncio = document.querySelector('[data-agenda-anuncio]');
    if (anuncio) anuncio.textContent = 'Agenda de demostración actualizada con los datos locales.';
  }
});
document.addEventListener('change', (evento) => {
  if (evento.target.matches('[data-demo-agenda-historial]')) { estado.agendaHistory = evento.target.checked; render(); document.querySelector('[data-demo-agenda-historial]')?.focus(); }
  if (evento.target.matches('[data-agenda-demo-afectadas]')) { soloAfectadas = evento.target.checked; render(); document.querySelector('[data-agenda-demo-afectadas]')?.focus(); }
});
document.addEventListener('submit', (evento) => { if (evento.target.matches('[data-demo-agenda-filtros]')) evento.preventDefault(); });
