import { escape as esc, avatar } from '../../ui.js';
import { icon } from '../../icons.js';
import { directoryPage, followUps, licenseNames, matchesFollowUp, remainingLabel } from './directory-model.js';

export const directoryState = { query: '', license: '', followUp: '', page: 1 };
const hasFilters = () => Boolean(directoryState.query.trim() || directoryState.license || directoryState.followUp);

export function directoryResults(tenants, options = directoryState, demo = false) {
  const result = directoryPage(tenants, options);
  if (!result.total) return `<div class="platform-empty"><h3>${tenants.length ? 'No hay negocios con estos filtros' : 'Aún no hay negocios'}</h3><p>${tenants.length ? 'Prueba otra búsqueda o limpia los filtros.' : 'Registra el primero para iniciar su invitación.'}</p>${tenants.length ? '<button type="button" class="btn btn-light" data-platform-clear>Limpiar filtros</button>' : ''}</div>`;
  return `<table class="table app-table platform-table"><caption class="visually-hidden">Negocios de la plataforma</caption><thead><tr>${['Negocio', 'Administrador', 'Estado de licencia', 'Tiempo restante', 'Administración'].map((label) => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${result.rows.map((tenant) => `<tr><td data-label="Negocio"><div class="person-cell">${avatar(tenant.initials, 'mint')}<span><strong>${esc(tenant.name)}</strong><small>${esc(tenant.slug)}</small></span></div></td><td data-label="Administrador">${esc(tenant.email || 'Sin correo')}</td><td data-label="Estado de licencia"><span class="platform-license platform-license-${Object.hasOwn(licenseNames, tenant.license) ? tenant.license : 'unknown'}">${esc(licenseNames[tenant.license] || 'Sin licencia')}</span></td><td data-label="Tiempo restante">${esc(remainingLabel(tenant))}</td><td data-label="Administración">${demo ? `<div class="platform-demo-actions"><button type="button" class="btn btn-light" data-toggle-tenant="${esc(tenant.id)}">${tenant.suspended ? 'Reactivar' : 'Suspender'}</button><button type="button" class="btn btn-light" data-license-tenant="${esc(tenant.id)}">Renovar licencia</button></div>` : `<button type="button" class="btn btn-light" data-business-detail="${esc(tenant.id)}" aria-label="Administrar ${esc(tenant.name)}">Administrar ${icon('arrow')}</button>`}</td></tr>`).join('')}</tbody></table><div class="platform-footer"><p role="status">Mostrando ${(result.page - 1) * 10 + 1}–${Math.min(result.page * 10, result.total)} de ${result.total} negocios</p>${result.total > 10 ? `<nav aria-label="Paginación de negocios"><button type="button" class="btn btn-light" data-platform-page="${result.page - 1}" ${result.page === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${result.page} de ${result.pages}</span><button type="button" class="btn btn-light" data-platform-page="${result.page + 1}" ${result.page === result.pages ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
}

export function directoryHtml(tenants, demo = false) {
  const metrics = [
    ['', 'Negocios registrados', 'Todos los negocios de la plataforma', 'grid'],
    ['pending', 'Por activar', demo ? 'Activación no simulada' : 'Invitaciones pendientes', 'clock'],
    ['expiring', 'Próximas a vencer', demo ? 'Vigencia no simulada' : 'Licencias vigentes con menos de 30 días', 'calendar'],
    ['blocked', 'Acceso bloqueado', 'Negocios sin acceso habilitado', 'lock'],
  ];
  const select = (field, label, values) => `<label>${label}<select class="form-select" data-platform-filter="${field}"><option value="">Todos</option>${Object.entries(values).map(([value, text]) => `<option value="${value}" ${directoryState[field] === value ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
  return `<div class="platform-directory" data-platform-demo="${demo}"><div class="stats-grid">${metrics.map(([filter, label, caption, symbol]) => `<div class="stat-card platform-metric"><span class="stat-top">${label}<span class="stat-icon">${icon(symbol)}</span></span><span class="stat-number">${demo && ['pending', 'expiring'].includes(filter) ? '—' : tenants.filter((tenant) => matchesFollowUp(tenant, filter)).length}</span><span class="stat-caption">${caption}</span></div>`).join('')}</div><section class="platform-list" aria-labelledby="platform-businesses"><h2 id="platform-businesses">Negocios</h2><p>${demo ? 'Explora negocios ficticios y prueba sus acciones de licencia en esta sesión.' : 'Busca un negocio y abre su administración para gestionar la licencia, los límites y el acceso del administrador.'}</p>${demo ? '<p class="information-note">Demostración con datos ficticios. La activación y los días restantes no están simulados; las acciones de licencia solo cambian esta sesión.</p>' : ''}<div class="platform-filters"><label class="platform-search">Buscar negocio<input class="form-control" type="search" data-platform-search value="${esc(directoryState.query)}" placeholder="Nombre, identificador o correo" /></label>${select('license', 'Estado de licencia', licenseNames)}${select('followUp', 'Seguimiento', demo ? { blocked: followUps.blocked } : followUps)}<button type="button" class="btn btn-light" data-platform-clear ${hasFilters() ? '' : 'disabled'}>Limpiar filtros</button><button type="button" class="btn btn-light" data-platform-refresh>Actualizar</button></div><p class="platform-feedback" role="alert" hidden></p><div data-platform-results>${directoryResults(tenants, directoryState, demo)}</div></section></div>`;
}

export function bindDirectory(getTenants, refresh, demo) {
  function update(root, focus = false) {
    const result = root.querySelector('[data-platform-results]');
    result.innerHTML = directoryResults(getTenants(), directoryState, demo);
    root.querySelectorAll('[data-platform-clear]').forEach((button) => { button.disabled = !hasFilters(); });
    if (focus) { result.tabIndex = -1; result.focus({ preventScroll: true }); }
  }
  function reset(root, followUp = '') {
    Object.assign(directoryState, { query: '', license: '', followUp, page: 1 });
    root.querySelector('[data-platform-search]').value = '';
    root.querySelectorAll('[data-platform-filter]').forEach((select) => { select.value = directoryState[select.dataset.platformFilter]; });
    update(root);
  }
  document.addEventListener('input', (event) => {
    const root = event.target.closest('.platform-directory');
    if (!root || !event.target.matches('[data-platform-search]')) return;
    directoryState.query = event.target.value;
    directoryState.page = 1;
    update(root);
  });
  document.addEventListener('change', (event) => {
    const root = event.target.closest('.platform-directory');
    if (!root || !event.target.matches('[data-platform-filter]')) return;
    directoryState[event.target.dataset.platformFilter] = event.target.value;
    directoryState.page = 1;
    update(root);
  });
  document.addEventListener('click', async (event) => {
    const root = event.target.closest('.platform-directory');
    if (!root) return;
    if (event.target.closest('[data-platform-clear]')) { reset(root); root.querySelector('[data-platform-search]').focus(); return; }
    const page = event.target.closest('[data-platform-page]');
    if (page) { directoryState.page = Number(page.dataset.platformPage); update(root, true); return; }
    const button = event.target.closest('[data-platform-refresh]');
    if (!button) return;
    button.disabled = true;
    button.textContent = 'Actualizando…';
    const feedback = root.querySelector('.platform-feedback');
    feedback.hidden = true;
    try {
      await refresh();
      if (!root.isConnected) return;
      root.outerHTML = directoryHtml(getTenants(), demo);
      document.querySelector('[data-platform-refresh]')?.focus({ preventScroll: true });
    } catch (error) {
      if (!root.isConnected) return;
      feedback.textContent = `No se pudo actualizar: ${error.message} Se conserva la última consulta.`;
      feedback.hidden = false;
      button.disabled = false;
      button.textContent = 'Actualizar';
    }
  });
}
