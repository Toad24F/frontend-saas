import { escape } from '../ui.js';

export function localPage(items, page = 1) {
  const pages = Math.max(1, Math.ceil(items.length / 10));
  const current = Math.min(pages, Math.max(1, Number.isSafeInteger(page) ? page : 1));
  return { rows: items.slice((current - 1) * 10, current * 10), total: items.length, page: current, pages };
}

export function paginationHtml(result, label, kind, attribute = 'data-catalog-page') {
  if (!result.total) return '';
  return `<div class="local-pagination"><p role="status">Mostrando ${(result.page - 1) * 10 + 1}–${Math.min(result.page * 10, result.total)} de ${result.total} ${escape(label)}</p>${result.total > 10 ? `<nav aria-label="Paginación de ${escape(label)}"><button type="button" class="btn btn-light" ${attribute}="${result.page - 1}" data-page-kind="${escape(kind)}" ${result.page === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${result.page} de ${result.pages}</span><button type="button" class="btn btn-light" ${attribute}="${result.page + 1}" data-page-kind="${escape(kind)}" ${result.page === result.pages ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
}
