const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const blockTypes = { vacaciones: 'Vacaciones', dia_festivo: 'Día festivo', emergencia: 'Emergencia' };
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export function blockRangeError({ from, to }) {
  if (from && !validDate(from) || to && !validDate(to)) return 'Introduce fechas válidas.';
  if (from && to && from > to) return 'Hasta debe ser igual o posterior a Desde.';
  return '';
}
export function filteredBlocks(blocks, filters, scope = '') {
  if (blockRangeError(filters)) return [];
  const query = normalize(filters.search?.trim());
  return blocks.filter((block) => (!scope || !block.professionalId || String(block.professionalId) === String(scope))
    && (!query || normalize(block.reason).includes(query))
    && (filters.type === 'all' || (block.type === 'feriado' ? 'dia_festivo' : block.type) === filters.type)
    && (filters.branch === 'all' || !block.branchId || String(block.branchId) === filters.branch)
    && (!filters.from || (block.endDate || block.date) >= filters.from)
    && (!filters.to || block.date <= filters.to))
    .slice().sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
}
export function hasBlockFilters(filters) {
  return Boolean(filters.search.trim() || filters.type !== 'all' || filters.branch !== 'all' || filters.from || filters.to);
}
