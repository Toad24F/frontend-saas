import { isDemo, user } from '../../../connected/backend.js';
import { state, render } from '../../app.js';
import { list } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, pageHead, button, empty } from '../../ui.js';
import '../profesionales/style.css';
import './style.css';

const ui = { view: 'list', search: '', status: 'all' };
try {
  const saved = localStorage.getItem('citalendar-branches-view');
  if (saved === 'list' || saved === 'cards') ui.view = saved;
} catch { /* La vista funciona sin almacenamiento local. */ }
let scope = null;
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

function matches(branch) {
  return (!ui.search || normalize(`${branch.name} ${branch.address || ''} ${branch.phone || ''} ${branch.notes || ''}`).includes(normalize(ui.search)))
    && (ui.status === 'all' || (ui.status === 'active') === (branch.active !== false));
}

function googleMap(branch) {
  if (!branch.maps) return null;
  try {
    const url = new URL(branch.maps);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(host)) return null;
    if (host === 'www.google.com' && url.pathname.startsWith('/maps/embed')) return { link: url.href, embed: url.href, approximate: false };
    const place = url.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
    const coordinates = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || (place ? decodeURIComponent(place.replace(/\+/g, ' ')) : '') || (coordinates ? `${coordinates[1]},${coordinates[2]}` : '') || branch.address;
    return { link: url.href, embed: query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : null, approximate: !place && !coordinates && !url.searchParams.has('q') && !url.searchParams.has('query') };
  } catch { return null; }
}

function quotaBar(branches, own, quota) {
  const active = branches.filter((branch) => branch.active !== false).length;
  const limit = quota && Number.isFinite(Number(quota.limiteSucursalesActivas)) ? Number(quota.limiteSucursalesActivas) : branches.length;
  const used = quota ? Number(quota.sucursalesActivas) || 0 : active;
  const title = quota ? 'Cupo de sucursales activas' : own ? 'Atención activa en tus sucursales' : 'Sucursales activas';
  return `<section class="branch-capacity" aria-label="${title}"><div class="branch-capacity-heading"><span>${title}</span><strong>${used} de ${limit}</strong></div><progress class="branch-capacity-progress" value="${Math.max(0, used)}" max="${Math.max(1, limit, used)}" aria-label="${title}"></progress>${quota ? `<small>${Number(quota.disponibles) || 0} ${Number(quota.disponibles) === 1 ? 'sucursal disponible' : 'sucursales disponibles'}</small>` : ''}</section>`;
}

function renderBranch(branch, professionals, own, management, visible) {
  const active = branch.active !== false;
  const people = professionals.filter((person) => person.branchIds.includes(branch.id));
  const map = googleMap(branch);
  const status = own ? !branch.globalActive ? 'Sucursal inactiva' : active ? 'Atención activa' : 'Atención pausada' : active ? 'Activa' : 'Inactiva';
  const toggleLabel = own ? active ? 'Pausar atención' : 'Activar atención' : active ? 'Desactivar' : 'Activar';
  const toggle = `<button type="button" data-toggle-branch="${branch.id}" aria-label="${toggleLabel} ${esc(branch.name)}" ${own && !branch.globalActive ? 'disabled title="Sucursal inactiva en el negocio"' : ''}>${toggleLabel}</button>`;
  const actions = own
    ? `<button type="button" class="professional-availability" data-toggle-branch="${branch.id}" aria-label="${toggleLabel} ${esc(branch.name)}" ${!branch.globalActive ? 'disabled title="Sucursal inactiva en el negocio"' : ''}>${toggleLabel} ${icon('arrow')}</button>`
    : `<button type="button" class="professional-availability" data-edit-branch="${branch.id}">Editar ${icon('arrow')}</button><details class="professional-more"><summary aria-label="Más acciones para ${esc(branch.name)}">${icon('more')}</summary><div class="professional-more-menu">${toggle}${management(branch)}</div></details>`;
  return `<article class="surface professional-entry branch-entry" data-branch-entry="${branch.id}" ${visible ? '' : 'hidden'}>
    <div class="branch-map">${map?.embed ? `<iframe title="Mapa de ${esc(branch.name)}" src="${esc(map.embed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>${map.approximate ? '<span class="branch-map-caption">Vista por dirección</span>' : ''}` : `<div class="branch-map-placeholder">${icon('pin')}<span>${branch.maps ? 'Enlace de mapa no compatible' : 'Mapa no agregado'}</span></div>`}</div>
    <div class="professional-person"><span class="branch-icon">${icon('pin')}</span><div class="professional-identity"><h2>${esc(branch.name)}</h2><p>${esc(branch.address || 'Dirección no disponible')}</p>${branch.phone ? `<small>${esc(branch.phone)}</small>` : ''}</div></div>
    <div class="professional-assignment branch-details"><span>${icon('users')}<strong>${people.length}</strong> ${people.length === 1 ? 'profesional' : 'profesionales'}</span>${map ? `<a href="${esc(map.link)}" target="_blank" rel="noopener noreferrer">${icon('pin')}Abrir en Google Maps</a>` : ''}${branch.notes ? `<span class="branch-arrival">${icon('info')}${esc(branch.notes)}</span>` : ''}</div>
    <span class="professional-status ${active && (!own || branch.globalActive) ? 'is-active' : 'is-inactive'}"><i></i>${status}</span>
    <div class="professional-entry-actions">${actions}</div>
  </article>`;
}

export function branches({ quota = null, management = () => '' } = {}) {
  const own = !isDemo && user?.rol === 'profesional';
  const currentScope = `${state.tenantId}:${own ? user.id : 'admin'}`;
  if (scope !== currentScope) { Object.assign(ui, { search: '', status: 'all' }); scope = currentScope; }
  const professional = own ? list('professionals', state.tenantId)[0] : null;
  const branches = list('branches', state.tenantId).filter((branch) => !own || professional?.branchIds.includes(branch.id));
  const professionals = list('professionals', state.tenantId);
  const active = branches.filter((branch) => branch.active !== false).length;
  const visible = branches.filter(matches);
  return `<div class="professional-workspace branch-workspace">${pageHead('Sucursales', own ? 'Consulta y activa la disponibilidad de tus sucursales asignadas.' : 'Gestiona las ubicaciones de tu negocio.', own ? '' : button('Nueva sucursal', 'new-branch'))}
    <div class="professional-overview"><strong>${branches.length}</strong> ${branches.length === 1 ? 'sucursal' : 'sucursales'}<span aria-hidden="true">·</span><strong>${active}</strong> activas<span aria-hidden="true">·</span><strong>${branches.length - active}</strong> inactivas</div>
    ${quotaBar(branches, own, quota)}
    <section class="professional-toolbar branch-toolbar" aria-label="Buscar y filtrar sucursales">
      <label class="professional-search">${icon('search')}<span class="visually-hidden">Buscar sucursales</span><input id="branch-search" type="search" placeholder="Buscar por nombre, dirección o teléfono" value="${esc(ui.search)}" autocomplete="off"></label>
      <div class="professional-filters"><label><span>Estado</span><select data-branch-filter="status"><option value="all">Todas</option><option value="active" ${ui.status === 'active' ? 'selected' : ''}>Activas</option><option value="inactive" ${ui.status === 'inactive' ? 'selected' : ''}>Inactivas</option></select></label></div>
      <div class="professional-view-switch" role="group" aria-label="Tipo de vista"><button type="button" data-branch-view="list" aria-pressed="${ui.view === 'list'}" class="${ui.view === 'list' ? 'is-selected' : ''}">${icon('menu')}<span>Lista</span></button><button type="button" data-branch-view="cards" aria-pressed="${ui.view === 'cards'}" class="${ui.view === 'cards' ? 'is-selected' : ''}">${icon('grid')}<span>Tarjetas</span></button></div>
    </section>
    <div class="professional-results-heading"><span id="branch-results-count" role="status" aria-live="polite">${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}</span></div>
    ${branches.length ? `<div class="professional-results professional-view--${ui.view}" id="branch-results">${branches.map((branch) => renderBranch(branch, professionals, own, management, visible.includes(branch))).join('')}</div><div class="professional-no-results" id="branch-no-results" ${visible.length ? 'hidden' : ''}>${empty('Sin coincidencias', 'Prueba otra búsqueda o cambia el filtro de estado.', '<button type="button" class="btn btn-light" data-branch-reset>Limpiar filtros</button>')}</div>` : empty('Aún no hay sucursales', own ? 'Tu negocio todavía no te asigna una sucursal.' : 'Crea una sucursal para empezar a organizar la atención.', own ? '' : '<button type="button" class="btn btn-primary" data-action="new-branch">Nueva sucursal</button>')}
  </div>`;
}

export function setBranchView(view) {
  if (!['list', 'cards'].includes(view) || ui.view === view) return;
  ui.view = view;
  try { localStorage.setItem('citalendar-branches-view', view); } catch { /* Preferencia temporal. */ }
  render();
}

export function resetBranchFilters() {
  Object.assign(ui, { search: '', status: 'all' });
  const root = document.querySelector('.branch-workspace');
  if (!root) return;
  root.querySelector('#branch-search').value = '';
  root.querySelector('[data-branch-filter]').value = 'all';
  applyBranchFilters();
  root.querySelector('#branch-search').focus();
}

export function applyBranchFilters() {
  const root = document.querySelector('.branch-workspace');
  if (!root) return;
  ui.search = root.querySelector('#branch-search')?.value.trim() || '';
  ui.status = root.querySelector('[data-branch-filter]')?.value || 'all';
  const own = !isDemo && user?.rol === 'profesional';
  const professional = own ? list('professionals', state.tenantId)[0] : null;
  const visible = new Set(list('branches', state.tenantId).filter((branch) => (!own || professional?.branchIds.includes(branch.id)) && matches(branch)).map((branch) => String(branch.id)));
  root.querySelectorAll('[data-branch-entry]').forEach((entry) => { entry.hidden = !visible.has(entry.dataset.branchEntry); });
  const count = visible.size;
  root.querySelector('#branch-results-count').textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`;
  const noResults = root.querySelector('#branch-no-results');
  if (noResults) noResults.hidden = count > 0;
}
