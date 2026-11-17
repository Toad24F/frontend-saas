export const clockMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) + Number(value.slice(6, 8) || 0) / 60;
export const minuteClock = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
export function teamAttention(models, complete = true) {
  if (!complete) return { error: 'No se dispone del catálogo completo del equipo para comprobar los tramos sin atención.' };
  const values = Object.values(models || {});
  if (!values.length) return { error: 'No hay información del equipo para comprobar la atención.' };
  if (values.some((x) => x.busy)) return { busy: true };
  if (values.some((x) => x.error || !x.data)) return { error: 'No se pudo comprobar la atención de todo el equipo. Usa Actualizar agenda.' };
  return { data: { intervalos: values.flatMap((x) => x.data.intervalos), omisiones: values.flatMap((x) => x.data.omisiones) } };
}
export function attentionUnavailableReason(data, day, branch) {
  if (!data) return '';
  if (data.omisiones.some((x) => x.fecha === day && (branch === 'all' || String(x.sucursalId) === String(branch)))) return 'Atención incompleta en esta fecha; no se sombrea.';
  if (branch === 'all') {
    const offsets = new Set(data.intervalos.filter((x) => x.fecha === day && x.inicioUtc).map((x) => Date.parse(x.fecha + 'T00:00:00Z') + x.inicioMinutos * 60000 - Date.parse(x.inicioUtc)));
    if (offsets.size > 1) return 'Horarios con distintas referencias horarias; no se combina el sombreado.';
  }
  return '';
}
export function attentionGaps(data, day, branch, first, last) {
  if (!data || attentionUnavailableReason(data, day, branch)) return [];
  const spans = data.intervalos.filter((x) => x.fecha === day && (branch === 'all' || String(x.sucursalId) === String(branch)))
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
  const sorted = items.map((x) => ({ ...x, from: clockMinutes(x.start), to: clockMinutes(x.end) })).sort((a, b) => a.from - b.from || a.id - b.id);
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
