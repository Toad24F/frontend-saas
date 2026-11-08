import { escape } from '../ui.js';

export function catalogHead(title, description, actions, capacity = '') {
  return `<div class="page-heading catalog-page-heading"><div><h1>${escape(title)}</h1><p>${escape(description)}</p></div>${capacity ? `<div class="catalog-capacity">${capacity}</div>` : ''}<div class="heading-actions">${actions}</div></div>`;
}

export function capacityHtml(label, data) {
  if (!data) return `<p class="catalog-quota-error">${escape(label)}: cupo no disponible.</p>`;
  return `<div class="catalog-quota"><div><span>${escape(label)}</span><strong>${data.activos} de ${data.limite}</strong></div><progress max="${Math.max(1, data.limite, data.activos)}" value="${data.activos}" aria-label="${escape(label)}"></progress><small>${data.disponibles} ${data.disponibles === 1 ? 'disponible' : 'disponibles'}</small></div>`;
}

export function hasCatalogFilters(ui) {
  return Boolean(ui.search?.trim() || Object.entries(ui).some(([key, value]) => key !== 'search' && value !== 'all'));
}

export function clearCatalogButton(kind, ui) {
  return `<button type="button" class="btn btn-light catalog-clear" data-${kind}-reset ${hasCatalogFilters(ui) ? '' : 'disabled'}>Limpiar filtros</button>`;
}
