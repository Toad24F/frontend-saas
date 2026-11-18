// UTC se usa solo para aritmética de fechas civiles, nunca para reinterpretar horarios de citas.
const interpretar = (valor) => {
  const d = new Date(`${valor}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== valor) throw new Error('Fecha inválida.');
  return d;
};
export const sumarDiasCiviles = (valor, dias) => { const d = interpretar(valor); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); };
export function periodoCalendario(vista, valor) {
  interpretar(valor);
  if (vista === 'day') return { desde: valor, hasta: valor };
  if (!['week', 'month'].includes(vista)) throw new Error('Vista inválida.');
  const primero = vista === 'month' ? `${valor.slice(0, 7)}-01` : valor;
  const desde = sumarDiasCiviles(primero, 1 - (interpretar(primero).getUTCDay() || 7));
  return { desde, hasta: sumarDiasCiviles(desde, vista === 'month' ? 41 : 6) };
}
export function moverFechaCalendario(vista, valor, direccion) {
  if (vista !== 'month') return sumarDiasCiviles(valor, direccion * (vista === 'week' ? 7 : 1));
  const d = interpretar(`${valor.slice(0, 7)}-01`); d.setUTCMonth(d.getUTCMonth() + direccion); return d.toISOString().slice(0, 10);
}
export function hoyCivil(ahora = new Date(), zona) {
  const partes = new Intl.DateTimeFormat('en-CA', { ...(zona ? { timeZone: zona } : {}), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora);
  const get = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
