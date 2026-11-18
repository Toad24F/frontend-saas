const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const TIPOS_BLOQUEO = { vacaciones: 'Vacaciones', dia_festivo: 'Día festivo', emergencia: 'Emergencia' };
const fechaValida = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor) && Number.isFinite(Date.parse(`${valor}T12:00:00Z`)) && new Date(`${valor}T12:00:00Z`).toISOString().slice(0, 10) === valor;
export function errorRangoBloqueos({ desde, hasta }) {
  if (desde && !fechaValida(desde) || hasta && !fechaValida(hasta)) return 'Introduce fechas válidas.';
  if (desde && hasta && desde > hasta) return 'Hasta debe ser igual o posterior a Desde.';
  return '';
}
export function filtrarBloqueos(bloqueos, filtros, alcance = '') {
  if (errorRangoBloqueos(filtros)) return [];
  const busqueda = normalizar(filtros.busqueda?.trim());
  return bloqueos.filter((bloqueo) => (!alcance || !bloqueo.professionalId || String(bloqueo.professionalId) === String(alcance))
    && (!busqueda || normalizar(bloqueo.reason).includes(busqueda))
    && (filtros.tipo === 'todos' || (bloqueo.type === 'feriado' ? 'dia_festivo' : bloqueo.type) === filtros.tipo)
    && (filtros.sucursal === 'todos' || !bloqueo.branchId || String(bloqueo.branchId) === filtros.sucursal)
    && (!filtros.desde || (bloqueo.endDate || bloqueo.date) >= filtros.desde)
    && (!filtros.hasta || bloqueo.date <= filtros.hasta))
    .slice().sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
}
export function hayFiltrosBloqueos(filtros) {
  return Boolean(filtros.busqueda.trim() || filtros.tipo !== 'todos' || filtros.sucursal !== 'todos' || filtros.desde || filtros.hasta);
}
