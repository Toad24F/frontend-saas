// Navegación local sobre catálogos públicos ya cargados; nunca consulta el panel.
export const browseDefaults = () => ({ search: '', filter: 'all', page: 1 });
export const normalizeSearch = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const escapePublic = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function optionPage(items, step, browse = browseDefaults()) {
  const query = normalizeSearch(browse.search);
  const filtered = items.filter((item) => normalizeSearch([item.nombre, step === 0 ? item.descripcion : step === 1 ? item.direccion : item.especialidad].filter(Boolean).join(' ')).includes(query)
    && (browse.filter === 'all' || (step === 0 ? browse.filter === 'short' ? item.duracionMinutos <= 30 : browse.filter === 'medium' ? item.duracionMinutos > 30 && item.duracionMinutos <= 60 : item.duracionMinutos > 60 : step === 2 ? item.especialidad === browse.filter : true)));
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(browse.page) ? browse.page : 1));
  return { rows: filtered.slice((page - 1) * 6, page * 6), total: filtered.length, pages, page };
}
export function optionToolbar(items, step, browse = browseDefaults()) {
  const esc = escapePublic;
  if (items.length <= 6 && !browse.search && browse.filter === 'all') return '';
  const specialties = [...new Set(items.map((item) => item.especialidad).filter(Boolean))].sort();
  const filter = step === 0 ? [['short', 'Hasta 30 minutos'], ['medium', 'De 31 a 60 minutos'], ['long', 'Más de 60 minutos']] : step === 2 && specialties.length > 1 ? specialties.map((value) => [value, value]) : [];
  return `<div class="public-option-tools"><label for="public-search">Buscar ${['servicio', 'sucursal', 'profesional'][step]}<input class="form-control" type="search" id="public-search" data-public-browse="search" value="${esc(browse.search)}" placeholder="${['Nombre o descripción', 'Nombre o dirección', 'Nombre o especialidad'][step]}" autocomplete="off"></label>${filter.length ? `<label for="public-filter">${step === 0 ? 'Duración' : 'Especialidad'}<select id="public-filter" class="form-select" data-public-browse="filter"><option value="all">Todas</option>${filter.map(([value, label]) => `<option value="${esc(value)}" ${value === browse.filter ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>` : ''}<button class="btn btn-light" type="button" data-public-clear ${browse.search.trim() || browse.filter !== 'all' ? '' : 'disabled'}>Limpiar filtros</button></div>`;
}
export function optionPagination(result, live = false) {
  if (!result.total) return '';
  return `<div class="public-pagination"><p${live ? ' role="status"' : ''}>Mostrando ${(result.page - 1) * 6 + 1}–${Math.min(result.page * 6, result.total)} de ${result.total} opciones</p>${result.total > 6 ? `<nav aria-label="Paginación de opciones"><button class="btn btn-light" type="button" data-public-page="${result.page - 1}" ${result.page === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${result.page} de ${result.pages}</span><button class="btn btn-light" type="button" data-public-page="${result.page + 1}" ${result.page === result.pages ? 'disabled' : ''}>Siguiente</button></nav>` : ''}</div>`;
}
export function publicSkeleton(slots = false) {
  return `<div class="public-skeleton ${slots ? 'public-skeleton-slots' : ''}" aria-hidden="true">${Array.from({ length: slots ? 6 : 3 }, () => '<span></span>').join('')}</div>`;
}
export const periodSlots = (slots, period = 'all') => slots.filter((slot) => period === 'all' || (period === 'morning' ? slot.horaInicio < '12:00' : slot.horaInicio >= '12:00'));
