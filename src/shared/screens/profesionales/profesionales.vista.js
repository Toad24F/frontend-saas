import { configurarPaginacionCatalogo, renderPaginacionCatalogo, actualizarPaginaCatalogo } from '../catalogos/catalogos.paginacion.js';
import { renderEncabezadoCatalogo, renderBotonLimpiarCatalogo, hayFiltrosCatalogo } from '../catalogos/catalogos.encabezado.js';
import { state, render } from '../../app.js';
import { consultarVistaCatalogos, cambiarVistaCatalogos } from '../catalogos/catalogos.vista.js';
import { list } from '../../data.js';
import { icon } from '../../icons.js';
import { resourceStatus } from '../../resource-status.js';
import { escape as escapar, avatar, pageHead, button, empty } from '../../ui.js';
import './profesionales.estilos.css';

const interfaz = { busqueda: '', estado: 'todos', sucursal: 'todos', servicio: 'todos' };
let negocioId = null;
const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function coincide(persona) {
  const texto = normalizar([persona.name, persona.specialty, persona.email].join(' '));
  return (!interfaz.busqueda || texto.includes(normalizar(interfaz.busqueda)))
    && (interfaz.estado === 'todos' || (interfaz.estado === 'activo') === (persona.active !== false))
    && (interfaz.sucursal === 'todos' || persona.branchIds.includes(Number(interfaz.sucursal)))
    && (interfaz.servicio === 'todos' || persona.serviceIds.includes(Number(interfaz.servicio)));
}

function renderProfesional(persona, administrar, visible) {
  return `<article class="surface profesional-entrada" data-profesional-id="${persona.id}" ${visible ? '' : 'hidden'}>
    <div class="profesional-persona">${avatar(persona.initials, persona.color, 'profesional-avatar')}<div class="profesional-identidad"><h2>${escapar(persona.name)}</h2><p>${escapar(persona.specialty || 'Sin especialidad')}</p>${persona.email ? `<small>${escapar(persona.email)}</small>` : ''}</div></div>
    <div class="profesional-asignacion"><span>${icon('pin')}<strong>${persona.branchIds.length}</strong> ${persona.branchIds.length === 1 ? 'sucursal' : 'sucursales'}</span><span>${icon('briefcase')}<strong>${persona.serviceIds.length}</strong> ${persona.serviceIds.length === 1 ? 'servicio' : 'servicios'}</span></div>
    <span class="profesional-estado ${resourceStatus(persona).className}"><i></i>${resourceStatus(persona).label}</span>
    <div class="profesional-acciones"><a href="/admin/disponibilidad" data-nav="disponibilidad" data-nav-profesional="${persona.id}" class="profesional-disponibilidad">Ver disponibilidad ${icon('arrow')}</a><button type="button" class="profesional-editar" data-editar-profesional="${persona.id}">Editar</button>${administrar(persona)}</div>
  </article>`;
}

export function profesionales(administrar = () => '', { accionesEncabezado = '', cupo = '' } = {}) {
  if (negocioId !== state.tenantId) { Object.assign(interfaz, { busqueda: '', estado: 'todos', sucursal: 'todos', servicio: 'todos' }); negocioId = state.tenantId; }
  const personas = list('professionals', state.tenantId);
  const sucursales = list('branches', state.tenantId);
  const servicios = list('services', state.tenantId);
  const visibles = personas.filter(coincide);
  const pagina = configurarPaginacionCatalogo('profesional', state.tenantId, personas, () => list('professionals', state.tenantId).filter(coincide), (persona) => renderProfesional(persona, administrar, true), 'profesionales');
  const activos = personas.filter((persona) => persona.active !== false).length;
  const vistaEscritorio = consultarVistaCatalogos();
  const vistaResultados = matchMedia('(max-width: 767px)').matches ? 'tarjetas' : vistaEscritorio;
  return `<div class="profesionales-espacio">${renderEncabezadoCatalogo('Profesionales', 'Gestiona a quienes atienden en tu negocio.', accionesEncabezado + button('Nuevo profesional', 'nuevo-profesional'), cupo)}
    <div class="profesionales-resumen"><strong>${personas.length}</strong> ${personas.length === 1 ? 'profesional' : 'profesionales'}<span aria-hidden="true">·</span><strong>${activos}</strong> activos<span aria-hidden="true">·</span><strong>${personas.length - activos}</strong> inactivos</div>
    <section class="profesionales-herramientas" aria-label="Buscar y filtrar profesionales">
      <label class="profesionales-busqueda">${icon('search')}<span class="visually-hidden">Buscar profesionales</span><input id="busqueda-profesionales" type="search" placeholder="Buscar por nombre, especialidad o correo" value="${escapar(interfaz.busqueda)}" autocomplete="off"></label>
      <div class="profesionales-filtros"><label><span>Estado</span><select data-filtro-profesionales="estado"><option value="todos">Todos</option><option value="activo" ${interfaz.estado === 'activo' ? 'selected' : ''}>Activos</option><option value="inactivo" ${interfaz.estado === 'inactivo' ? 'selected' : ''}>Inactivos</option></select></label><label><span>Sucursal</span><select data-filtro-profesionales="sucursal"><option value="todos">Todas</option>${sucursales.map((sucursal) => `<option value="${sucursal.id}" ${String(interfaz.sucursal) === String(sucursal.id) ? 'selected' : ''}>${escapar(sucursal.name)}</option>`).join('')}</select></label><label><span>Servicio</span><select data-filtro-profesionales="servicio"><option value="todos">Todos</option>${servicios.map((servicio) => `<option value="${servicio.id}" ${String(interfaz.servicio) === String(servicio.id) ? 'selected' : ''}>${escapar(servicio.name)}</option>`).join('')}</select></label>${renderBotonLimpiarCatalogo('profesional', interfaz)}</div>
      <div class="profesionales-selector-vista" role="group" aria-label="Tipo de vista"><button type="button" data-vista-profesionales="lista" aria-pressed="${vistaEscritorio === 'lista'}" class="${vistaEscritorio === 'lista' ? 'is-selected' : ''}">${icon('menu')}<span>Lista</span></button><button type="button" data-vista-profesionales="tarjetas" aria-pressed="${vistaEscritorio === 'tarjetas'}" class="${vistaEscritorio === 'tarjetas' ? 'is-selected' : ''}">${icon('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="profesionales-encabezado-resultados"><span id="conteo-resultados-profesionales" role="estado" aria-live="polite">${visibles.length} ${visibles.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${personas.length ? `<div class="profesionales-resultados profesionales-vista--${vistaResultados}" data-vista-escritorio="${vistaEscritorio}" id="profesional-resultados">${pagina.filas.map((persona) => renderProfesional(persona, administrar, true)).join('')}</div>${renderPaginacionCatalogo('profesional', pagina)}<div class="profesionales-sin-resultados" id="sin-resultados-profesionales" ${visibles.length ? 'hidden' : ''}>${empty('Sin coincidencias', 'Prueba otra búsqueda o quita alguno de los filtros.', '<button type="button" class="btn btn-light" data-profesional-limpiar>Limpiar filtros</button>')}</div>` : empty('Aún no hay profesionales', 'Crea el primer perfil para comenzar a organizar tu equipo.', '<button type="button" class="btn btn-primary" data-action="nuevo-profesional">Nuevo profesional</button>')}
  </div>`;
}

export function cambiarVistaProfesionales(vista) {
  if (cambiarVistaCatalogos(vista)) render();
}

export function restablecerFiltrosProfesionales() {
  Object.assign(interfaz, { busqueda: '', estado: 'todos', sucursal: 'todos', servicio: 'todos' });
  const raiz = document.querySelector('.profesionales-espacio');
  if (!raiz) return;
  raiz.querySelector('#busqueda-profesionales').value = '';
  raiz.querySelectorAll('[data-filtro-profesionales]').forEach((selector) => { selector.value = 'todos'; });
  aplicarFiltrosProfesionales();
  raiz.querySelector('#busqueda-profesionales').focus();
}

export function aplicarFiltrosProfesionales() {
  const raiz = document.querySelector('.profesionales-espacio');
  if (!raiz) return;
  interfaz.busqueda = raiz.querySelector('#busqueda-profesionales')?.value.trim() || '';
  raiz.querySelectorAll('[data-filtro-profesionales]').forEach((selector) => { interfaz[selector.dataset.filtroProfesionales] = selector.value; });
  raiz.querySelectorAll('[data-profesional-limpiar]').forEach((boton) => { boton.disabled = !hayFiltrosCatalogo(interfaz); });
  const visibles = new Set(list('professionals', state.tenantId).filter(coincide).map((persona) => String(persona.id)));
  actualizarPaginaCatalogo('profesional', true);
  const conteo = visibles.size;
  const etiqueta = raiz.querySelector('#conteo-resultados-profesionales');
  if (etiqueta) etiqueta.textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`;
  const sinResultados = raiz.querySelector('#sin-resultados-profesionales');
  if (sinResultados) sinResultados.hidden = conteo > 0;
}
