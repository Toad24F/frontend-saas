export const horaAMinutos = (valor) => Number(valor.slice(0, 2)) * 60 + Number(valor.slice(3, 5)) + Number(valor.slice(6, 8) || 0) / 60;
export const minutosAHora = (valor) => `${String(Math.floor(valor / 60)).padStart(2, '0')}:${String(Math.floor(valor % 60)).padStart(2, '0')}`;
export function atencionEquipo(modelos, completo = true) {
  if (!completo) return { error: 'No se dispone del catálogo completo del equipo para comprobar los tramos sin atención.' };
  const valores = Object.values(modelos || {});
  if (!valores.length) return { error: 'No hay información del equipo para comprobar la atención.' };
  if (valores.some((x) => x.busy)) return { busy: true };
  if (valores.some((x) => x.error || !x.data)) return { error: 'No se pudo comprobar la atención de todo el equipo. Usa Actualizar agenda.' };
  return { data: { intervalos: valores.flatMap((x) => x.data.intervalos), omisiones: valores.flatMap((x) => x.data.omisiones) } };
}
export function motivoFaltaAtencion(datos, dia, sucursal) {
  if (!datos) return '';
  if (datos.omisiones.some((x) => x.fecha === dia && (sucursal === 'all' || String(x.sucursalId) === String(sucursal)))) return 'Atención incompleta en esta fecha; no se sombrea.';
  if (sucursal === 'all') {
    const desfases = new Set(datos.intervalos.filter((x) => x.fecha === dia && x.inicioUtc).map((x) => Date.parse(x.fecha + 'T00:00:00Z') + x.inicioMinutos * 60000 - Date.parse(x.inicioUtc)));
    if (desfases.size > 1) return 'Horarios con distintas referencias horarias; no se combina el sombreado.';
  }
  return '';
}
export function huecosAtencion(datos, dia, sucursal, primero, ultimo) {
  if (!datos || motivoFaltaAtencion(datos, dia, sucursal)) return [];
  const extensiones = datos.intervalos.filter((x) => x.fecha === dia && (sucursal === 'all' || String(x.sucursalId) === String(sucursal)))
    .map((x) => [Math.max(primero, x.inicioMinutos), Math.min(ultimo, x.finMinutos)]).filter(([a, b]) => a < b).sort((a, b) => a[0] - b[0]);
  let cursor = primero;
  const resultado = [];
  for (const [inicio, fin] of extensiones) {
    if (inicio > cursor) resultado.push({ start: cursor, end: inicio });
    cursor = Math.max(cursor, fin);
  }
  if (cursor < ultimo) resultado.push({ start: cursor, end: ultimo });
  return resultado;
}
export function posicionHoraActual(dia, zonas, ahora = new Date()) {
  const unicos = [...new Set(zonas)];
  if (unicos.length !== 1) return null;
  try {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: unicos[0], year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ahora).map((p) => [p.type, p.value]));
    return `${partes.year}-${partes.month}-${partes.day}` === dia ? Number(partes.hour) * 60 + Number(partes.minute) : null;
  } catch { return null; }
}
// Agrupar componentes conectados de huellas visuales, sin duplicar ni omitir citas.
export function gruposDensos(elementos, anchoColumna, anchoMinimo = 105) {
  const ordenados = elementos.map((x) => ({ ...x, from: horaAMinutos(x.start), to: horaAMinutos(x.end) })).sort((a, b) => a.from - b.from || a.id - b.id);
  const grupos = [];
  let grupo = [], fin = -1;
  function ejecutarPendientes() {
    const puntos = grupo.flatMap((x) => [[x.from, 1], [x.to, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let cantidad = 0, max = 0;
    for (const [, delta] of puntos) { cantidad += delta; max = Math.max(max, cantidad); }
    if (max > Math.max(1, Math.floor(anchoColumna / anchoMinimo))) grupos.push({ start: grupo[0].from, end: Math.max(...grupo.map((x) => horaAMinutos(x.end))), ids: grupo.map((x) => x.id) });
    grupo = [];
  }
  for (const elemento of ordenados) {
    if (grupo.length && elemento.from >= fin) ejecutarPendientes();
    if (!grupo.length) fin = elemento.to;
    fin = Math.max(fin, elemento.to); grupo.push(elemento);
  }
  if (grupo.length) ejecutarPendientes();
  return grupos;
}
