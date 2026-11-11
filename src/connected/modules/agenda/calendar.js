// UTC se usa solo para aritmética de fechas civiles, nunca para reinterpretar horarios de citas.
const parse = (value) => {
  const d = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error('Fecha inválida.');
  return d;
};
export const civilAdd = (value, days) => { const d = parse(value); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
export function calendarPeriod(view, value) {
  parse(value);
  if (view === 'day') return { desde: value, hasta: value };
  if (!['week', 'month'].includes(view)) throw new Error('Vista inválida.');
  const first = view === 'month' ? `${value.slice(0, 7)}-01` : value;
  const desde = civilAdd(first, 1 - (parse(first).getUTCDay() || 7));
  return { desde, hasta: civilAdd(desde, view === 'month' ? 41 : 6) };
}
export function moveCalendarDate(view, value, direction) {
  if (view !== 'month') return civilAdd(value, direction * (view === 'week' ? 7 : 1));
  const d = parse(`${value.slice(0, 7)}-01`); d.setUTCMonth(d.getUTCMonth() + direction); return d.toISOString().slice(0, 10);
}
export function todayCivil(now = new Date(), zone) {
  const parts = new Intl.DateTimeFormat('en-CA', { ...(zone ? { timeZone: zone } : {}), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (kind) => parts.find((part) => part.type === kind).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
