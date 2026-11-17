import { configurarPaginacionCatalogo, renderPaginacionCatalogo, actualizarPaginaCatalogo } from '../../../shared/screens/catalogos/catalogos.paginacion.js';
import { renderCupoCatalogo } from '../../../shared/screens/catalogos/catalogos.encabezado.js';
import { consultarCupoRol } from '../../modules/catalogos/catalogos.cupo.js';
import { renderEncabezadoCatalogo, renderBotonLimpiarCatalogo, hayFiltrosCatalogo } from '../../../shared/screens/catalogos/catalogos.encabezado.js';
import { state, render } from '../../../shared/app.js';
import { consultarVistaCatalogos, cambiarVistaCatalogos } from '../../../shared/screens/catalogos/catalogos.vista.js';
import { list } from '../../../shared/data.js';
import { icon } from '../../../shared/icons.js';
import { resourceStatus } from '../../../shared/resource-status.js';
import { avatar, escape as escapar, pageHead, button, empty } from '../../../shared/ui.js';
import '../../../shared/screens/profesionales/profesionales.estilos.css';
import './recepcionistas.estilos.css';
import { retiredSection } from '../recursos/retired-view.js';

const interfaz = { busqueda: '', estado: 'todos' };
let negocioId = null;
const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function coincide(persona) {
  return (!interfaz.busqueda || normalizar(`${persona.name} ${persona.email}`).includes(normalizar(interfaz.busqueda)))
    && (interfaz.estado === 'todos' || (interfaz.estado === 'activo') === Boolean(persona.active));
}

function etiquetaActivacion(valor) {
  if (!valor) return 'Sin fecha de activación';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha de activación';
  return `Activada ${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(fecha)}`;
}

function renderRecepcionista(persona, visible) {
  const activa = Boolean(persona.active);
  return `<article class="surface profesional-entrada" data-recepcionista-entrada="${persona.id}" ${visible ? '' : 'hidden'}>
    <div class="profesional-persona">${avatar(persona.initials, 'mint', 'profesional-avatar')}<div class="profesional-identidad"><h2>${escapar(persona.name)}</h2><p>Cuenta de recepción</p><small>${escapar(persona.email)}</small></div></div>
    <div class="profesional-asignacion"><span>${icon('calendar')}${escapar(etiquetaActivacion(persona.activatedAt))}</span></div>
    <span class="profesional-estado ${resourceStatus(persona).className}"><i></i>${resourceStatus(persona).label === 'Activo' ? 'Activa' : resourceStatus(persona).label === 'Inactivo' ? 'Inactiva' : 'Inhabilitada'}</span>
    <div class="profesional-acciones"><button type="button" class="profesional-disponibilidad recepcionista-accion-estado ${activa ? 'action-caution' : ''}" data-accion-recepcionista="${activa ? 'desactivar' : 'reactivar'}" data-recepcionista-id="${persona.id}" aria-label="${activa ? 'Desactivar' : 'Reactivar'} a ${escapar(persona.name)}">${activa ? 'Desactivar' : 'Reactivar'}</button><details class="profesional-mas"><summary aria-label="Más acciones para ${escapar(persona.name)}">${icon('more')}</summary><div class="profesional-menu-mas"><button type="button" data-accion-recepcionista="restablecer" data-recepcionista-id="${persona.id}">Restablecer contraseña</button><button type="button" class="action-danger" data-accion-recepcionista="inhabilitar" data-recepcionista-id="${persona.id}" aria-label="Inhabilitar a ${escapar(persona.name)}">Inhabilitar</button></div></details></div>
  </article>`;
}

export function recepcionistas() {
  if (negocioId !== state.tenantId) { Object.assign(interfaz, { busqueda: '', estado: 'todos' }); negocioId = state.tenantId; }
  const personas = list('receptionists', state.tenantId);
  const visibles = personas.filter(coincide);
  const pagina = configurarPaginacionCatalogo('recepcionista', state.tenantId, personas, () => list('receptionists', state.tenantId).filter(coincide), (persona) => renderRecepcionista(persona, true), 'recepcionistas');
  const activas = personas.filter((persona) => persona.active).length;
  const vistaEscritorio = consultarVistaCatalogos();
  const vistaResultados = matchMedia('(max-width: 767px)').matches ? 'tarjetas' : vistaEscritorio;
  return `<div class="profesionales-espacio recepcionistas-espacio">${renderEncabezadoCatalogo('Recepcionistas', 'Gestiona las cuentas de recepción de tu negocio.', retiredSection('recepcionistas') + button('Nueva recepcionista', 'nueva-recepcionista'), renderCupoCatalogo('Recepcionistas activos', consultarCupoRol('recepcionistas')))}
    <div class="profesionales-resumen"><strong>${personas.length}</strong> ${personas.length === 1 ? 'recepcionista' : 'recepcionistas'}<span aria-hidden="true">·</span><strong>${activas}</strong> ${activas === 1 ? 'activa' : 'activas'}<span aria-hidden="true">·</span><strong>${personas.length - activas}</strong> ${personas.length - activas === 1 ? 'inactiva' : 'inactivas'}</div>
    <section class="profesionales-herramientas recepcionistas-herramientas" aria-label="Buscar y filtrar recepcionistas">
      <label class="profesionales-busqueda">${icon('search')}<span class="visually-hidden">Buscar recepcionistas</span><input id="busqueda-recepcionistas" type="search" placeholder="Buscar por nombre o correo" value="${escapar(interfaz.busqueda)}" autocomplete="off"></label>
      <div class="profesionales-filtros"><label><span>Estado</span><select data-filtro-recepcionistas="estado"><option value="todos">Todas</option><option value="activo" ${interfaz.estado === 'activo' ? 'selected' : ''}>Activas</option><option value="inactivo" ${interfaz.estado === 'inactivo' ? 'selected' : ''}>Inactivas</option></select></label>${renderBotonLimpiarCatalogo('recepcionista', interfaz)}</div>
      <div class="profesionales-selector-vista" role="group" aria-label="Tipo de vista"><button type="button" data-vista-recepcionistas="lista" aria-pressed="${vistaEscritorio === 'lista'}" class="${vistaEscritorio === 'lista' ? 'is-selected' : ''}">${icon('menu')}<span>Lista</span></button><button type="button" data-vista-recepcionistas="tarjetas" aria-pressed="${vistaEscritorio === 'tarjetas'}" class="${vistaEscritorio === 'tarjetas' ? 'is-selected' : ''}">${icon('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="profesionales-encabezado-resultados"><span id="conteo-resultados-recepcionistas" role="estado" aria-live="polite">${visibles.length} ${visibles.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${personas.length ? `<div class="profesionales-resultados profesionales-vista--${vistaResultados}" data-vista-escritorio="${vistaEscritorio}" id="recepcionista-resultados">${pagina.filas.map((persona) => renderRecepcionista(persona, true)).join('')}</div>${renderPaginacionCatalogo('recepcionista', pagina)}<div class="profesionales-sin-resultados" id="sin-resultados-recepcionistas" ${visibles.length ? 'hidden' : ''}>${empty('Sin coincidencias', 'Prueba otra búsqueda o cambia el filtro de estado.', '<button type="button" class="btn btn-light" data-recepcionista-limpiar>Limpiar filtros</button>')}</div>` : empty('Sin recepcionistas', 'Crea una cuenta para tu equipo de recepción.', '<button type="button" class="btn btn-primary" data-action="nueva-recepcionista">Nueva recepcionista</button>')}
  </div>`;
}

export function cambiarVistaRecepcionistas(vista) {
  if (cambiarVistaCatalogos(vista)) render();
}

export function restablecerFiltrosRecepcionistas() {
  Object.assign(interfaz, { busqueda: '', estado: 'todos' });
  const raiz = document.querySelector('.recepcionistas-espacio');
  if (!raiz) return;
  raiz.querySelector('#busqueda-recepcionistas').value = '';
  raiz.querySelector('[data-filtro-recepcionistas]').value = 'todos';
  aplicarFiltrosRecepcionistas();
  raiz.querySelector('#busqueda-recepcionistas').focus();
}

export function aplicarFiltrosRecepcionistas() {
  const raiz = document.querySelector('.recepcionistas-espacio');
  if (!raiz) return;
  interfaz.busqueda = raiz.querySelector('#busqueda-recepcionistas')?.value.trim() || '';
  interfaz.estado = raiz.querySelector('[data-filtro-recepcionistas]')?.value || 'todos';
  raiz.querySelectorAll('[data-recepcionista-limpiar]').forEach((boton) => { boton.disabled = !hayFiltrosCatalogo(interfaz); });
  const visibles = new Set(list('receptionists', state.tenantId).filter(coincide).map((persona) => String(persona.id)));
  actualizarPaginaCatalogo('recepcionista', true);
  const conteo = visibles.size;
  raiz.querySelector('#conteo-resultados-recepcionistas').textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`;
  const sinResultados = raiz.querySelector('#sin-resultados-recepcionistas');
  if (sinResultados) sinResultados.hidden = conteo > 0;
}
