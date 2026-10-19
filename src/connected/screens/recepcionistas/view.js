import { state, render } from '../../../shared/app.js';
import { getCatalogView, setCatalogView } from '../../../shared/screens/catalog-view.js';
import { list } from '../../../shared/data.js';
import { icon } from '../../../shared/icons.js';
import { avatar, escape, pageHead, button, empty } from '../../../shared/ui.js';
import '../../../shared/screens/profesionales/style.css';
import './style.css';

const ui = { search: '', status: 'all' };
let tenantId = null;
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function matches(person) {
  return (!ui.search || normalize(`${person.name} ${person.email}`).includes(normalize(ui.search)))
    && (ui.status === 'all' || (ui.status === 'active') === Boolean(person.active));
}

function activationLabel(value) {
  if (!value) return 'Sin fecha de activación';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha de activación';
  return `Activada ${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)}`;
}

function renderPerson(person, visible) {
  const active = Boolean(person.active);
  return `<article class="surface professional-entry" data-reception-entry="${person.id}" ${visible ? '' : 'hidden'}>
    <div class="professional-person">${avatar(person.initials, 'mint', 'professional-avatar')}<div class="professional-identity"><h2>${escape(person.name)}</h2><p>Cuenta de recepción</p><small>${escape(person.email)}</small></div></div>
    <div class="professional-assignment"><span>${icon('calendar')}${escape(activationLabel(person.activatedAt))}</span></div>
    <span class="professional-status ${active ? 'is-active' : 'is-inactive'}"><i></i>${active ? 'Activa' : 'Inactiva'}</span>
    <div class="professional-entry-actions"><button type="button" class="professional-availability reception-status-action ${active ? 'is-deactivate' : ''}" data-reception-action="${active ? 'deactivate' : 'reactivate'}" data-reception-id="${person.id}" aria-label="${active ? 'Desactivar' : 'Reactivar'} a ${escape(person.name)}">${active ? 'Desactivar' : 'Reactivar'}</button><button type="button" class="professional-edit" data-reception-action="reset" data-reception-id="${person.id}">Restablecer clave</button></div>
  </article>`;
}

export function receptionists() {
  if (tenantId !== state.tenantId) { Object.assign(ui, { search: '', status: 'all' }); tenantId = state.tenantId; }
  const people = list('receptionists', state.tenantId);
  const visible = people.filter(matches);
  const active = people.filter((person) => person.active).length;
  const desktopView = getCatalogView();
  const resultView = matchMedia('(max-width: 767px)').matches ? 'cards' : desktopView;
  return `<div class="professional-workspace reception-workspace">${pageHead('Recepcionistas', 'Gestiona las cuentas de recepción de tu negocio.', button('Nueva recepcionista', 'new-receptionist'))}
    <div class="professional-overview"><strong>${people.length}</strong> ${people.length === 1 ? 'recepcionista' : 'recepcionistas'}<span aria-hidden="true">·</span><strong>${active}</strong> ${active === 1 ? 'activa' : 'activas'}<span aria-hidden="true">·</span><strong>${people.length - active}</strong> ${people.length - active === 1 ? 'inactiva' : 'inactivas'}</div>
    <section class="professional-toolbar reception-toolbar" aria-label="Buscar y filtrar recepcionistas">
      <label class="professional-search">${icon('search')}<span class="visually-hidden">Buscar recepcionistas</span><input id="reception-search" type="search" placeholder="Buscar por nombre o correo" value="${escape(ui.search)}" autocomplete="off"></label>
      <div class="professional-filters"><label><span>Estado</span><select data-reception-filter="status"><option value="all">Todas</option><option value="active" ${ui.status === 'active' ? 'selected' : ''}>Activas</option><option value="inactive" ${ui.status === 'inactive' ? 'selected' : ''}>Inactivas</option></select></label></div>
      <div class="professional-view-switch" role="group" aria-label="Tipo de vista"><button type="button" data-reception-view="list" aria-pressed="${desktopView === 'list'}" class="${desktopView === 'list' ? 'is-selected' : ''}">${icon('menu')}<span>Lista</span></button><button type="button" data-reception-view="cards" aria-pressed="${desktopView === 'cards'}" class="${desktopView === 'cards' ? 'is-selected' : ''}">${icon('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="professional-results-heading"><span id="reception-results-count" role="status" aria-live="polite">${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${people.length ? `<div class="professional-results professional-view--${resultView}" data-desktop-view="${desktopView}" id="reception-results">${people.map((person) => renderPerson(person, visible.includes(person))).join('')}</div><div class="professional-no-results" id="reception-no-results" ${visible.length ? 'hidden' : ''}>${empty('Sin coincidencias', 'Prueba otra búsqueda o cambia el filtro de estado.', '<button type="button" class="btn btn-light" data-reception-reset>Limpiar filtros</button>')}</div>` : empty('Sin recepcionistas', 'Crea una cuenta para tu equipo de recepción.', '<button type="button" class="btn btn-primary" data-action="new-receptionist">Nueva recepcionista</button>')}
  </div>`;
}

export function setReceptionView(view) {
  if (setCatalogView(view)) render();
}

export function resetReceptionFilters() {
  Object.assign(ui, { search: '', status: 'all' });
  const root = document.querySelector('.reception-workspace');
  if (!root) return;
  root.querySelector('#reception-search').value = '';
  root.querySelector('[data-reception-filter]').value = 'all';
  applyReceptionFilters();
  root.querySelector('#reception-search').focus();
}

export function applyReceptionFilters() {
  const root = document.querySelector('.reception-workspace');
  if (!root) return;
  ui.search = root.querySelector('#reception-search')?.value.trim() || '';
  ui.status = root.querySelector('[data-reception-filter]')?.value || 'all';
  const visible = new Set(list('receptionists', state.tenantId).filter(matches).map((person) => String(person.id)));
  root.querySelectorAll('[data-reception-entry]').forEach((entry) => { entry.hidden = !visible.has(entry.dataset.receptionEntry); });
  const count = visible.size;
  root.querySelector('#reception-results-count').textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`;
  const noResults = root.querySelector('#reception-no-results');
  if (noResults) noResults.hidden = count > 0;
}
