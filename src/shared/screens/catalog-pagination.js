import { localPage, paginationHtml } from './local-pagination.js';
import { toast } from '../ui.js';
const catalogs = new Map();

export function configureCatalogPaging(kind, scope, allRows, filteredRows, renderRow, label) {
  const previous = catalogs.get(kind);
  const sameScope = previous?.scope === scope;
  const filtered = filteredRows();
  const ids = new Set(allRows.map((row) => row.id));
  if (sameScope && allRows.some((row) => !previous.ids.has(row.id) && !filtered.some((item) => item.id === row.id))) {
    queueMicrotask(() => toast('Hay nuevos registros que no coinciden con los filtros actuales. Limpia los filtros para encontrarlos.'));
  }
  const result = localPage(filtered, sameScope ? previous.page : 1);
  catalogs.set(kind, { scope, ids, filteredRows, renderRow, label, page: result.page });
  return result;
}

export function catalogPagination(kind, result) {
  return `<div data-catalog-pagination="${kind}">${paginationHtml(result, catalogs.get(kind).label, kind)}</div>`;
}

export function updateCatalogPage(kind, reset = false) {
  const context = catalogs.get(kind);
  const target = document.getElementById(`${kind}-results`);
  if (!context || !target) return;
  const result = localPage(context.filteredRows(), reset ? 1 : context.page);
  context.page = result.page;
  target.innerHTML = result.rows.map(context.renderRow).join('');
  document.querySelector(`[data-catalog-pagination="${kind}"]`).innerHTML = paginationHtml(result, context.label, kind);
}

if (typeof document !== 'undefined') document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-catalog-page]');
  if (!button || button.disabled) return;
  const kind = button.dataset.pageKind;
  const context = catalogs.get(kind);
  if (!context) return;
  context.page = Number(button.dataset.catalogPage);
  updateCatalogPage(kind);
  const target = document.getElementById(`${kind}-results`);
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start' });
});
