// Solo presentación de instantes del servidor; no calcula candidatos ni aplica
// reglas de disponibilidad. La fecha inicial se expresa en la zona de la sucursal.
function parts(instant, zone, time = false) {
  return new Intl.DateTimeFormat('en-US', { timeZone: zone,
    ...(time ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } :
      { year: 'numeric', month: '2-digit', day: '2-digit' }),
  }).formatToParts(new Date(instant));
}
export function localDate(instant, zone) {
  const values = parts(instant, zone);
  const get = (type) => values.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function localTime(instant, zone) {
  const values = parts(instant, zone, true);
  return `${values.find((part) => part.type === 'hour').value}:${values.find((part) => part.type === 'minute').value}`;
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const stamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value;
}
export function dateLabel(value) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${value}T12:00:00Z`));
}
