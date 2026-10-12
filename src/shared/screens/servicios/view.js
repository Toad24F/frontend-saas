import { isDemo, user } from '../../../connected/backend.js';
import { state, render } from '../../app.js';
import { list, money } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, pageHead, button, empty } from '../../ui.js';
import '../profesionales/style.css';
import './style.css';

const ui = { view: 'list', search: '', status: 'all' };
try {
  const saved = localStorage.getItem('citalendar-services-view');
  if (saved === 'list' || saved === 'cards') ui.view = saved;
} catch { /* La vista sigue disponible sin almacenamiento local. */ }
let tenantId = null;
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function matches(service) {
  return (!ui.search || normalize(`${service.name} ${service.description || ''}`).includes(normalize(ui.search)))
    && (ui.status === 'all' || (ui.status === 'active') === (service.active !== false));
}

function renderService(service, professionals, own, professional, management, visible) {
  const active = service.active !== false;
  const assigned = Boolean(professional?.serviceIds.includes(service.id));
  const people = professionals.filter((person) => person.serviceIds.includes(service.id));
  const canEdit = !own || service.creatorId === user.id;
  const toggleLabel = own ? assigned ? 'Quitar selección' : 'Seleccionar' : active ? 'Desactivar' : 'Activar';
  const toggle = `<button type="button" data-toggle-service="${service.id}" aria-label="${toggleLabel} ${esc(service.name)}">${toggleLabel}</button>`;
  const edit = canEdit ? `<button type="button" class="${own ? 'professional-edit' : 'professional-availability'}" data-edit-service="${service.id}">Editar${own ? '' : ` ${icon('arrow')}`}</button>` : '';
  const extra = management(service);
  const actions = own
    ? `<button type="button" class="professional-availability" data-toggle-service="${service.id}" aria-label="${toggleLabel} ${esc(service.name)}" ${!active && !assigned ? 'disabled title="Servicio inactivo en el negocio"' : ''}>${toggleLabel} ${icon('arrow')}</button>${edit}`
    : `${edit}<details class="professional-more"><summary aria-label="Más acciones para ${esc(service.name)}">${icon('more')}</summary><div class="professional-more-menu">${toggle}${extra}</div></details>`;
  return `<article class="surface professional-entry service-entry" data-service-entry="${service.id}" ${visible ? '' : 'hidden'}>
    <div class="professional-person"><span class="service-icon ${service.color}">${icon(service.icon)}</span><div class="professional-identity"><h2>${esc(service.name)}</h2><p>${esc(service.description || 'Sin descripción')}</p></div></div>
    <div class="professional-assignment service-details"><span>${icon('clock')}<strong>${service.duration}</strong> min</span><span>${icon('briefcase')}<strong>${money(service.price)}</strong> MXN</span><span>${icon('users')}<strong>${people.length}</strong> ${people.length === 1 ? 'profesional' : 'profesionales'}</span></div>
    <span class="professional-status ${active ? own && !assigned ? 'is-unselected' : 'is-active' : 'is-inactive'}"><i></i>${active ? own ? assigned ? 'Seleccionado' : 'Sin seleccionar' : 'Activo' : 'Inactivo'}</span>
    <div class="professional-entry-actions">${actions}</div>
  </article>`;
}

export function services(management = () => '') {
  if (tenantId !== state.tenantId) { Object.assign(ui, { search: '', status: 'all' }); tenantId = state.tenantId; }
  const own = !isDemo && user?.rol === 'profesional';
  const professional = own ? list('professionals', state.tenantId)[0] : null;
  const services = list('services', state.tenantId);
  const professionals = list('professionals', state.tenantId);
  const visible = services.filter(matches);
  const active = services.filter((service) => service.active !== false).length;
  return `<div class="professional-workspace service-workspace">${pageHead('Servicios', own ? 'Los servicios que ofreces a tus clientes.' : 'Gestiona lo que ofrece tu negocio.', button('Nuevo servicio', 'new-service'))}
    <div class="professional-overview"><strong>${services.length}</strong> ${services.length === 1 ? 'servicio' : 'servicios'}<span aria-hidden="true">·</span><strong>${active}</strong> activos<span aria-hidden="true">·</span><strong>${services.length - active}</strong> inactivos</div>
    <section class="professional-toolbar service-toolbar" aria-label="Buscar y filtrar servicios">
      <label class="professional-search">${icon('search')}<span class="visually-hidden">Buscar servicios</span><input id="service-search" type="search" placeholder="Buscar por nombre o descripción" value="${esc(ui.search)}" autocomplete="off"></label>
      <div class="professional-filters"><label><span>Estado</span><select data-service-filter="status"><option value="all">Todos</option><option value="active" ${ui.status === 'active' ? 'selected' : ''}>Activos</option><option value="inactive" ${ui.status === 'inactive' ? 'selected' : ''}>Inactivos</option></select></label></div>
      <div class="professional-view-switch" role="group" aria-label="Tipo de vista"><button type="button" data-service-view="list" aria-pressed="${ui.view === 'list'}" class="${ui.view === 'list' ? 'is-selected' : ''}">${icon('menu')}<span>Lista</span></button><button type="button" data-service-view="cards" aria-pressed="${ui.view === 'cards'}" class="${ui.view === 'cards' ? 'is-selected' : ''}">${icon('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="professional-results-heading"><span id="service-results-count" role="status" aria-live="polite">${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${services.length ? `<div class="professional-results professional-view--${ui.view}" id="service-results">${services.map((service) => renderService(service, professionals, own, professional, management, visible.includes(service))).join('')}</div><div class="professional-no-results" id="service-no-results" ${visible.length ? 'hidden' : ''}>${empty('Sin coincidencias', 'Prueba otra búsqueda o cambia el filtro de estado.', '<button type="button" class="btn btn-light" data-service-reset>Limpiar filtros</button>')}</div>` : empty('Aún no hay servicios', 'Crea el primer servicio para organizar tu oferta.', '<button type="button" class="btn btn-primary" data-action="new-service">Nuevo servicio</button>')}
    <div class="information-note">${icon('info')} La duración de cada servicio determina los horarios disponibles en tu portal. El precio es informativo; no se realizan cobros en línea.</div>
  </div>`;
}

export function setServiceView(view) {
  if (!['list', 'cards'].includes(view) || ui.view === view) return;
  ui.view = view;
  try { localStorage.setItem('citalendar-services-view', view); } catch { /* Preferencia temporal. */ }
  render();
}

export function resetServiceFilters() {
  Object.assign(ui, { search: '', status: 'all' });
  const root = document.querySelector('.service-workspace');
  if (!root) return;
  root.querySelector('#service-search').value = '';
  root.querySelector('[data-service-filter]').value = 'all';
  applyServiceFilters();
  root.querySelector('#service-search').focus();
}

export function applyServiceFilters() {
  const root = document.querySelector('.service-workspace');
  if (!root) return;
  ui.search = root.querySelector('#service-search')?.value.trim() || '';
  ui.status = root.querySelector('[data-service-filter]')?.value || 'all';
  const visible = new Set(list('services', state.tenantId).filter(matches).map((service) => String(service.id)));
  root.querySelectorAll('[data-service-entry]').forEach((entry) => { entry.hidden = !visible.has(entry.dataset.serviceEntry); });
  const count = visible.size;
  root.querySelector('#service-results-count').textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`;
  const noResults = root.querySelector('#service-no-results');
  if (noResults) noResults.hidden = count > 0;
}
