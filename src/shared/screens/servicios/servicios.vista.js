import { configureCatalogPaging, catalogPagination, updateCatalogPage } from '../catalog-pagination.js';
import { catalogHead, clearCatalogButton, hasCatalogFilters } from '../catalog-header.js';
import { isDemo, user } from '../../../connected/backend.js';
import { state, render } from '../../app.js';
import { getCatalogView, setCatalogView } from '../catalog-view.js';
import { list, money } from '../../data.js';
import { icon } from '../../icons.js';
import { resourceStatus } from '../../resource-status.js';
import { escape as escapar, pageHead, button, empty } from '../../ui.js';
import '../profesionales/style.css';
import './servicios.estilos.css';

const interfaz = { search: '', status: 'all' };
let negocioId = null;
const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function coincide(servicio) {
  return (!interfaz.search || normalizar(`${servicio.name} ${servicio.description || ''}`).includes(normalizar(interfaz.search)))
    && (interfaz.status === 'all' || (interfaz.status === 'active') === (servicio.active !== false));
}

function renderServicio(servicio, profesionales, propio, profesional, administrar, visible) {
  const activo = servicio.active !== false;
  const asignado = Boolean(profesional?.serviceIds.includes(servicio.id));
  const personas = profesionales.filter((persona) => persona.serviceIds.includes(servicio.id));
  const puedeEditar = !propio || servicio.creatorId === user.id;
  const etiquetaAlternar = propio ? asignado ? 'Quitar selección' : 'Seleccionar' : activo ? 'Desactivar' : 'Activar';
  const alternar = `<button type="button" class="${!propio && activo ? 'action-caution' : ''}" data-alternar-servicio="${servicio.id}" aria-label="${etiquetaAlternar} ${escapar(servicio.name)}">${etiquetaAlternar}</button>`;
  const editar = puedeEditar ? `<button type="button" class="${propio ? 'professional-edit' : 'professional-availability'}" data-editar-servicio="${servicio.id}">Editar${propio ? '' : ` ${icon('arrow')}`}</button>` : '';
  const adicional = administrar(servicio);
  const acciones = propio
    ? `<button type="button" class="professional-availability" data-alternar-servicio="${servicio.id}" aria-label="${etiquetaAlternar} ${escapar(servicio.name)}" ${!activo && !asignado ? 'disabled title="Servicio inactivo en el negocio"' : ''}>${etiquetaAlternar} ${icon('arrow')}</button>${editar}`
    : `${editar}<details class="professional-more"><summary aria-label="Más acciones para ${escapar(servicio.name)}">${icon('more')}</summary><div class="professional-more-menu">${alternar}${adicional}</div></details>`;
  return `<article class="surface professional-entry servicio-entrada" data-servicio-entrada="${servicio.id}" ${visible ? '' : 'hidden'}>
    <div class="professional-person"><span class="servicio-icono ${servicio.color}">${icon(servicio.icon)}</span><div class="professional-identity"><h2>${escapar(servicio.name)}</h2><p>${escapar(servicio.description || 'Sin descripción')}</p></div></div>
    <div class="professional-assignment servicio-detalles"><span>${icon('clock')}<strong>${servicio.duration}</strong> min</span><span>${icon('briefcase')}<strong>${money(servicio.price)}</strong> MXN</span><span>${icon('users')}<strong>${personas.length}</strong> ${personas.length === 1 ? 'profesional' : 'profesionales'}</span></div>
    <span class="professional-status ${propio && activo && !asignado ? 'sin-seleccionar' : resourceStatus(servicio).className}"><i></i>${propio && activo ? asignado ? 'Seleccionado' : 'Sin seleccionar' : resourceStatus(servicio).label}</span>
    <div class="professional-entry-actions">${acciones}</div>
  </article>`;
}

export function servicios(administrar = () => '', { accionesEncabezado = '' } = {}) {
  if (negocioId !== state.tenantId) { Object.assign(interfaz, { search: '', status: 'all' }); negocioId = state.tenantId; }
  const propio = !isDemo && user?.rol === 'profesional';
  const profesional = propio ? list('professionals', state.tenantId)[0] : null;
  const servicios = list('services', state.tenantId);
  const profesionales = list('professionals', state.tenantId);
  const visibles = servicios.filter(coincide);
  const pagina = configureCatalogPaging('servicio', state.tenantId, servicios, () => list('services', state.tenantId).filter(coincide), (servicio) => renderServicio(servicio, profesionales, propio, profesional, administrar, true), 'servicios');
  const activos = servicios.filter((servicio) => servicio.active !== false).length;
  const vistaEscritorio = getCatalogView();
  const vistaResultados = matchMedia('(max-width: 767px)').matches ? 'cards' : vistaEscritorio;
  return `<div class="professional-workspace servicios-espacio">${catalogHead('Servicios', propio ? 'Los servicios que ofreces a tus clientes.' : 'Gestiona lo que ofrece tu negocio.', accionesEncabezado + button('Nuevo servicio', 'nuevo-servicio'))}
    <div class="professional-overview"><strong>${servicios.length}</strong> ${servicios.length === 1 ? 'servicio' : 'servicios'}<span aria-hidden="true">·</span><strong>${activos}</strong> activos<span aria-hidden="true">·</span><strong>${servicios.length - activos}</strong> inactivos</div>
    <section class="professional-toolbar servicios-herramientas" aria-label="Buscar y filtrar servicios">
      <label class="professional-search">${icon('search')}<span class="visually-hidden">Buscar servicios</span><input id="busqueda-servicios" type="search" placeholder="Buscar por nombre o descripción" value="${escapar(interfaz.search)}" autocomplete="off"></label>
      <div class="professional-filters"><label><span>Estado</span><select data-filtro-servicios="estado"><option value="all">Todos</option><option value="active" ${interfaz.status === 'active' ? 'selected' : ''}>Activos</option><option value="inactive" ${interfaz.status === 'inactive' ? 'selected' : ''}>Inactivos</option></select></label>${clearCatalogButton('servicio', interfaz)}</div>
      <div class="professional-view-switch" role="group" aria-label="Tipo de vista"><button type="button" data-vista-servicios="list" aria-pressed="${vistaEscritorio === 'list'}" class="${vistaEscritorio === 'list' ? 'is-selected' : ''}">${icon('menu')}<span>Lista</span></button><button type="button" data-vista-servicios="cards" aria-pressed="${vistaEscritorio === 'cards'}" class="${vistaEscritorio === 'cards' ? 'is-selected' : ''}">${icon('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="professional-results-heading"><span id="conteo-resultados-servicios" role="status" aria-live="polite">${visibles.length} ${visibles.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${servicios.length ? `<div class="professional-results professional-view--${vistaResultados}" data-desktop-view="${vistaEscritorio}" id="servicio-results">${pagina.rows.map((servicio) => renderServicio(servicio, profesionales, propio, profesional, administrar, true)).join('')}</div>${catalogPagination('servicio', pagina)}<div class="professional-no-results" id="sin-resultados-servicios" ${visibles.length ? 'hidden' : ''}>${empty('Sin coincidencias', 'Prueba otra búsqueda o cambia el filtro de estado.', '<button type="button" class="btn btn-light" data-servicio-reset>Limpiar filtros</button>')}</div>` : empty('Aún no hay servicios', 'Crea el primer servicio para organizar tu oferta.', '<button type="button" class="btn btn-primary" data-action="nuevo-servicio">Nuevo servicio</button>')}
    <div class="information-note">${icon('info')} La duración de cada servicio determina los horarios disponibles en tu portal. El precio es informativo; no se realizan cobros en línea.</div>
  </div>`;
}

export function cambiarVistaServicios(vista) {
  if (setCatalogView(vista)) render();
}

export function restablecerFiltrosServicios() {
  Object.assign(interfaz, { search: '', status: 'all' });
  const raiz = document.querySelector('.servicios-espacio');
  if (!raiz) return;
  raiz.querySelector('#busqueda-servicios').value = '';
  raiz.querySelector('[data-filtro-servicios]').value = 'all';
  aplicarFiltrosServicios();
  raiz.querySelector('#busqueda-servicios').focus();
}

export function aplicarFiltrosServicios() {
  const raiz = document.querySelector('.servicios-espacio');
  if (!raiz) return;
  interfaz.search = raiz.querySelector('#busqueda-servicios')?.value.trim() || '';
  interfaz.status = raiz.querySelector('[data-filtro-servicios]')?.value || 'all';
  raiz.querySelectorAll('[data-servicio-reset]').forEach((boton) => { boton.disabled = !hasCatalogFilters(interfaz); });
  const visibles = new Set(list('services', state.tenantId).filter(coincide).map((servicio) => String(servicio.id)));
  updateCatalogPage('servicio', true);
  const conteo = visibles.size;
  raiz.querySelector('#conteo-resultados-servicios').textContent = `${conteo} ${conteo === 1 ? 'resultado' : 'resultados'}`;
  const sinResultados = raiz.querySelector('#sin-resultados-servicios');
  if (sinResultados) sinResultados.hidden = conteo > 0;
}
