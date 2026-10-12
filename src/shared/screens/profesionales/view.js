import { state, render } from '../../app.js';
import { list } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, avatar, pageHead, button, empty } from '../../ui.js';
import './style.css';

const ui = { view: 'list', search: '', status: 'all', branch: 'all', service: 'all' };
try {
  const saved = localStorage.getItem('citalendar-professionals-view');
  if (saved === 'list' || saved === 'cards') ui.view = saved;
} catch { /* La vista sigue disponible sin almacenamiento local. */ }
let tenantId = null;
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function matches(person) {
  const haystack = normalize([person.name, person.specialty, person.email].join(' '));
  return (!ui.search || haystack.includes(normalize(ui.search)))
    && (ui.status === 'all' || (ui.status === 'active') === (person.active !== false))
    && (ui.branch === 'all' || person.branchIds.includes(Number(ui.branch)))
    && (ui.service === 'all' || person.serviceIds.includes(Number(ui.service)));
}

function renderPerson(person, management, visible) {
  const active = person.active !== false;
  return `<article class="surface professional-entry" data-professional-id="${person.id}" ${visible ? '' : 'hidden'}>
    <div class="professional-person">${avatar(person.initials, person.color, 'professional-avatar')}<div class="professional-identity"><h2>${esc(person.name)}</h2><p>${esc(person.specialty || 'Sin especialidad')}</p>${person.email ? `<small>${esc(person.email)}</small>` : ''}</div></div>
    <div class="professional-assignment"><span>${icon('pin')}<strong>${person.branchIds.length}</strong> ${person.branchIds.length === 1 ? 'sucursal' : 'sucursales'}</span><span>${icon('briefcase')}<strong>${person.serviceIds.length}</strong> ${person.serviceIds.length === 1 ? 'servicio' : 'servicios'}</span></div>
    <span class="professional-status ${active ? 'is-active' : 'is-inactive'}"><i></i>${active ? 'Activo' : 'Inactivo'}</span>
    <div class="professional-entry-actions"><a href="/admin/disponibilidad" data-nav="disponibilidad" data-nav-professional="${person.id}" class="professional-availability">Ver disponibilidad ${icon('arrow')}</a><button type="button" class="professional-edit" data-edit-professional="${person.id}">Editar</button>${management(person)}</div>
  </article>`;
}

export function professionals(management = () => '') {
  if (tenantId !== state.tenantId) { Object.assign(ui, { search: '', status: 'all', branch: 'all', service: 'all' }); tenantId = state.tenantId; }
  const people = list('professionals', state.tenantId);
  const branches = list('branches', state.tenantId);
  const services = list('services', state.tenantId);
  const visible = people.filter(matches);
  const active = people.filter((person) => person.active !== false).length;
  return `<div class="professional-workspace">${pageHead('Profesionales', 'Gestiona a quienes atienden en tu negocio.', button('Nuevo profesional', 'new-professional'))}
    <div class="professional-overview"><strong>${people.length}</strong> ${people.length === 1 ? 'profesional' : 'profesionales'}<span aria-hidden="true">·</span><strong>${active}</strong> activos<span aria-hidden="true">·</span><strong>${people.length - active}</strong> inactivos</div>
    <section class="professional-toolbar" aria-label="Buscar y filtrar profesionales">
      <label class="professional-search">${icon('search')}<span class="visually-hidden">Buscar profesionales</span><input id="professional-search" type="search" placeholder="Buscar por nombre, especialidad o correo" value="${esc(ui.search)}" autocomplete="off"></label>
      <div class="professional-filters"><label><span>Estado</span><select data-professional-filter="status"><option value="all">Todos</option><option value="active" ${ui.status === 'active' ? 'selected' : ''}>Activos</option><option value="inactive" ${ui.status === 'inactive' ? 'selected' : ''}>Inactivos</option></select></label><label><span>Sucursal</span><select data-professional-filter="branch"><option value="all">Todas</option>${branches.map((branch) => `<option value="${branch.id}" ${String(ui.branch) === String(branch.id) ? 'selected' : ''}>${esc(branch.name)}</option>`).join('')}</select></label><label><span>Servicio</span><select data-professional-filter="service"><option value="all">Todos</option>${services.map((service) => `<option value="${service.id}" ${String(ui.service) === String(service.id) ? 'selected' : ''}>${esc(service.name)}</option>`).join('')}</select></label></div>
      <div class="professional-view-switch" role="group" aria-label="Tipo de vista"><button type="button" data-professional-view="list" aria-pressed="${ui.view === 'list'}" class="${ui.view === 'list' ? 'is-selected' : ''}">${icon('menu')}<span>Lista</span></button><button type="button" data-professional-view="cards" aria-pressed="${ui.view === 'cards'}" class="${ui.view === 'cards' ? 'is-selected' : ''}">${icon('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="professional-results-heading"><span id="professional-results-count" role="status" aria-live="polite">${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${people.length ? `<div class="professional-results professional-view--${ui.view}" id="professional-results">${people.map((person) => renderPerson(person, management, visible.includes(person))).join('')}</div><div class="professional-no-results" id="professional-no-results" ${visible.length ? 'hidden' : ''}>${empty('Sin coincidencias', 'Prueba otra búsqueda o quita alguno de los filtros.', '<button type="button" class="btn btn-light" data-professional-reset>Limpiar filtros</button>')}</div>` : empty('Aún no hay profesionales', 'Crea el primer perfil para comenzar a organizar tu equipo.', '<button type="button" class="btn btn-primary" data-action="new-professional">Nuevo profesional</button>')}
  </div>`;
}

export function setProfessionalView(view) {
  if (!['list', 'cards'].includes(view) || ui.view === view) return;
  ui.view = view;
  try { localStorage.setItem('citalendar-professionals-view', view); } catch { /* Preferencia temporal. */ }
  render();
}

export function resetProfessionalFilters() {
  Object.assign(ui, { search: '', status: 'all', branch: 'all', service: 'all' });
  const root = document.querySelector('.professional-workspace');
  if (!root) return;
  root.querySelector('#professional-search').value = '';
  root.querySelectorAll('[data-professional-filter]').forEach((select) => { select.value = 'all'; });
  applyProfessionalFilters();
  root.querySelector('#professional-search').focus();
}

export function applyProfessionalFilters() {
  const root = document.querySelector('.professional-workspace');
  if (!root) return;
  ui.search = root.querySelector('#professional-search')?.value.trim() || '';
  root.querySelectorAll('[data-professional-filter]').forEach((select) => { ui[select.dataset.professionalFilter] = select.value; });
  const visible = new Set(list('professionals', state.tenantId).filter(matches).map((person) => String(person.id)));
  root.querySelectorAll('.professional-entry').forEach((entry) => { entry.hidden = !visible.has(entry.dataset.professionalId); });
  const count = visible.size;
  const label = root.querySelector('#professional-results-count');
  if (label) label.textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`;
  const noResults = root.querySelector('#professional-no-results');
  if (noResults) noResults.hidden = count > 0;
}
