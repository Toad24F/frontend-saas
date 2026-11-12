export const clockMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) + Number(value.slice(6, 8) || 0) / 60;
export const minuteClock = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
export function attentionGaps(data, day, branch, first, last) {
  if (!data || data.omisiones.some((x) => x.fecha === day && String(x.sucursalId) === String(branch))) return [];
  const spans = data.intervalos.filter((x) => x.fecha === day && String(x.sucursalId) === String(branch))
    .map((x) => [Math.max(first, x.inicioMinutos), Math.min(last, x.finMinutos)]).filter(([a, b]) => a < b).sort((a, b) => a[0] - b[0]);
  let cursor = first;
  const result = [];
  for (const [start, end] of spans) {
    if (start > cursor) result.push({ start: cursor, end: start });
    cursor = Math.max(cursor, end);
  }
  if (cursor < last) result.push({ start: cursor, end: last });
  return result;
}
export function currentTimePosition(day, zones, now = new Date()) {
  const unique = [...new Set(zones)];
  if (unique.length !== 1) return null;
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: unique[0], year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}` === day ? Number(parts.hour) * 60 + Number(parts.minute) : null;
  } catch { return null; }
}
// Agrupar componentes conectados de huellas visuales, sin duplicar ni omitir citas.
export function denseGroups(items, columnWidth, minimumWidth = 105) {
  const sorted = items.map((x) => ({ ...x, from: clockMinutes(x.start), to: Math.max(clockMinutes(x.end), clockMinutes(x.start) + 30) })).sort((a, b) => a.from - b.from || a.id - b.id);
  const groups = [];
  let group = [], end = -1;
  function flush() {
    const points = group.flatMap((x) => [[x.from, 1], [x.to, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let count = 0, max = 0;
    for (const [, delta] of points) { count += delta; max = Math.max(max, count); }
    if (max > Math.max(1, Math.floor(columnWidth / minimumWidth))) groups.push({ start: group[0].from, end: Math.max(...group.map((x) => clockMinutes(x.end))), ids: group.map((x) => x.id) });
    group = [];
  }
  for (const item of sorted) {
    if (group.length && item.from >= end) flush();
    if (!group.length) end = item.to;
    end = Math.max(end, item.to); group.push(item);
  }
  if (group.length) flush();
  return groups;
}
