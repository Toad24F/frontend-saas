import { escape, empty } from '../../ui.js';
import { localPage, paginationHtml } from '../local-pagination.js';
import { filteredBlocks, blockRangeError, blockTypes, hasBlockFilters } from './block-filters.js';
const defaults = () => ({ search: '', type: 'all', branch: 'all', from: '', to: '' });
let filters = defaults();
let context = null;
let page = 1;

function resultHtml() {
  const result = localPage(filteredBlocks(context.blocks, filters, context.scope), page);
  page = result.page;
  const error = blockRangeError(filters);
  const scopedCount = filteredBlocks(context.blocks, defaults(), context.scope).length;
  return error ? `<p role="alert">${error}</p>` : result.total ? `<div class="blocks-list">${result.rows.map(context.row).join('')}</div>${paginationHtml(result, 'bloqueos', 'blocks', 'data-block-page')}`
    : empty(scopedCount ? 'Sin coincidencias' : 'Sin bloqueos en esta vista', scopedCount ? 'Prueba otra búsqueda o cambia los filtros.' : 'No hay bloqueos para la selección actual.', hasBlockFilters(filters) ? '<button type="button" class="btn btn-light" data-block-clear>Limpiar filtros</button>' : '');
}

export function blockDirectory(tenantId, scope, blocks, branches, row) {
  if (context?.tenantId !== tenantId) { filters = defaults(); page = 1; }
  else if (context.scope !== scope) page = 1;
  context = { tenantId, scope, blocks, row };
  return `<div class="block-directory"><div class="block-filters"><label>Buscar bloqueo<input class="form-control" type="search" data-block-filter="search" placeholder="Motivo del bloqueo" value="${escape(filters.search)}"></label><label>Tipo<select class="form-select" data-block-filter="type"><option value="all">Todos</option>${Object.entries(blockTypes).map(([value, label]) => `<option value="${value}" ${value === filters.type ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Sucursal<select class="form-select" data-block-filter="branch"><option value="all">Todas</option>${branches.map((branch) => `<option value="${branch.id}" ${String(branch.id) === filters.branch ? 'selected' : ''}>${escape(branch.name)}</option>`).join('')}</select></label><label>Desde<input type="date" class="form-control" data-block-filter="from" value="${filters.from}"></label><label>Hasta<input type="date" class="form-control" data-block-filter="to" value="${filters.to}"></label><button type="button" class="btn btn-light" data-block-clear ${hasBlockFilters(filters) ? '' : 'disabled'}>Limpiar filtros</button></div><p class="availability-note">La selección incluye los bloqueos de todo el equipo y de todas las sucursales que le correspondan. El rango incluye cualquier bloqueo que coincida con esas fechas.</p><div data-block-results>${resultHtml()}</div></div>`;
}
function update(root, focus = false) {
  const target = root.querySelector('[data-block-results]');
  target.innerHTML = resultHtml();
  root.querySelectorAll('[data-block-clear]').forEach((button) => { button.disabled = !hasBlockFilters(filters); });
  const invalid = Boolean(blockRangeError(filters));
  root.querySelectorAll('[data-block-filter="from"], [data-block-filter="to"]').forEach((input) => { input.setAttribute('aria-invalid', String(invalid)); });
  if (focus) { target.tabIndex = -1; target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start' }); }
}
if (typeof document !== 'undefined') {
  const filter = (event) => {
    const input = event.target.closest('[data-block-filter]');
    if (!input || !context) return;
    filters[input.dataset.blockFilter] = input.value;
    page = 1;
    update(input.closest('.block-directory'));
  };
  document.addEventListener('input', filter);
  document.addEventListener('change', filter);
  document.addEventListener('click', (event) => {
    const root = event.target.closest('.block-directory');
    if (!root) return;
    const clear = event.target.closest('[data-block-clear]');
    if (clear && !clear.disabled) {
      filters = defaults(); page = 1;
      root.querySelectorAll('[data-block-filter]').forEach((input) => { input.value = filters[input.dataset.blockFilter]; });
      update(root); root.querySelector('[data-block-filter="search"]').focus();
    }
    const control = event.target.closest('[data-block-page]');
    if (control && !control.disabled) { page = Number(control.dataset.blockPage); update(root, true); }
  });
}
