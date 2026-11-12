import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgendaCache } from '../src/connected/modules/agenda/cache.js';
import { attentionGaps, currentTimePosition, denseGroups } from '../src/shared/screens/agenda/utility.js';
import { readAgendaAttention } from '../src/connected/modules/agenda/attention.js';
import { eventLayout } from '../src/shared/screens/agenda/presentation.js';

const period = { desde: '2026-11-09', hasta: '2026-11-15' };
const appointment = { id: 1, fechaLocal: '2026-11-12', sucursalId: 2, personalId: 3, estado: 'confirmada', nombreContacto: 'Ángela %_', causas: [{ codigo: 'bloqueo' }] };
test('cache reutiliza periodo completo, subconjunto, filtros y búsqueda literal sin llamadas', async () => {
  const calls = [];
  const cache = createAgendaCache(async (query) => { calls.push(query); return { ...period, citas: [appointment] }; });
  await cache.read(period);
  const result = await cache.read({ desde: '2026-11-12', hasta: '2026-11-12', sucursalId: '2', personalId: '3', busqueda: 'angela %_', afectadas: true });
  assert.equal(calls.length, 1);
  assert.equal(result.citas.length, 1);
  assert.deepEqual((await cache.read({ ...period, estado: 'pendiente' })).citas, []);
  assert.equal(calls.length, 1);
  cache.clear(); await cache.read(period); assert.equal(calls.length, 2);
  await cache.read(period, { force: true }); assert.equal(calls.length, 3);
});
test('cache no presenta una consulta filtrada como periodo completo cuando excede el límite', async () => {
  const calls = [];
  const cache = createAgendaCache(async (query) => {
    calls.push(query);
    if (!query.personalId) throw Object.assign(new Error('La consulta supera 1.000 citas. Acota el periodo o los filtros.'), { status: 400 });
    return { ...period, citas: [appointment] };
  });
  await cache.read({ ...period, personalId: '3' });
  await assert.rejects(cache.read(period));
  assert.equal(calls.length, 3);
});
test('cache descarta lecturas pendientes al limpiar sesión y no conserva una denegación', async () => {
  let resolve;
  const cache = createAgendaCache(() => new Promise((r) => { resolve = r; }));
  const pending = cache.read(period); cache.clear(); resolve({ ...period, citas: [appointment] }); await pending;
  assert.equal(cache.size, 0);
  let denied = false;
  const other = createAgendaCache(async () => { if (denied) throw Object.assign(new Error('Denegado'), { status: 403 }); return { ...period, citas: [appointment] }; });
  await other.read(period); denied = true;
  await assert.rejects(other.read(period, { force: true })); assert.equal(other.size, 0);
});
test('cache elimina snapshots si la consulta acotada de respaldo es denegada', async () => {
  let denied = false;
  const cache = createAgendaCache(async (query) => {
    if (!denied) return { ...period, citas: [appointment] };
    throw Object.assign(new Error(query.personalId ? 'Denegado' : 'La consulta supera 1.000 citas.'), { status: query.personalId ? 403 : 400 });
  });
  await cache.read(period);
  denied = true;
  await assert.rejects(cache.read({ ...period, personalId: '3' }, { force: true }));
  assert.equal(cache.size, 0);
});
test('cache comparte la lectura pendiente y caduca sin consultar indefinidamente datos antiguos', async () => {
  let calls = 0, now = 0, resolve;
  const cache = createAgendaCache(() => { calls++; return new Promise((r) => { resolve = r; }); }, { now: () => now, ttl: 30000 });
  const one = cache.read(period), two = cache.read({ ...period, estado: 'pendiente' });
  assert.equal(calls, 1);
  resolve({ ...period, citas: [appointment] });
  assert.equal((await one).citas.length, 1); assert.equal((await two).citas.length, 0);
  now = 30001; assert.equal(cache.peek(period), null);
});
test('sin atención es complemento de intervalos efectivos; omisiones no se convierten en cierre', () => {
  const data = { intervalos: [{ fecha: '2026-11-12', sucursalId: 2, inicioMinutos: 540, finMinutos: 780 }, { fecha: '2026-11-12', sucursalId: 2, inicioMinutos: 840, finMinutos: 1080 }], omisiones: [] };
  assert.deepEqual(attentionGaps(data, '2026-11-12', 2, 540, 1080), [{ start: 780, end: 840 }]);
  assert.deepEqual(attentionGaps({ ...data, omisiones: [{ fecha: '2026-11-12', sucursalId: 2 }] }, '2026-11-12', 2, 540, 1080), []);
  assert.deepEqual(attentionGaps(null, '2026-11-12', 2, 540, 1080), []);
});
test('agrupación conserva IDs exactos y deja intacta una cita aislada', () => {
  const items = [{ id: 99, start: '08:00', end: '08:30' }, ...Array.from({ length: 8 }, (_, i) => ({ id: i + 1, start: '09:00', end: '09:30' }))];
  const groups = denseGroups(items, 180);
  assert.equal(groups.length, 1); assert.deepEqual(groups[0].ids, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(groups[0].start, 540); assert.equal(groups[0].end, 570);
  assert.equal(denseGroups(items, 1000).length, 0);
});
test('hora actual usa una zona inequívoca y solo la fecha de hoy', () => {
  const now = new Date('2026-11-12T18:20:00Z');
  assert.equal(currentTimePosition('2026-11-12', ['America/Chihuahua'], now), 740);
  assert.equal(currentTimePosition('2026-11-11', ['America/Chihuahua'], now), null);
  assert.equal(currentTimePosition('2026-11-12', ['America/Chihuahua', 'America/Tijuana'], now), null);
});
test('atención valida perfil, periodo, intervalos y omisiones antes de sombrear', async () => {
  const response = { ...period, personalId: 3, intervalos: [], omisiones: [] };
  const calls = [];
  assert.deepEqual(await readAgendaAttention(async (path) => { calls.push(path); return response; }, 3, period), response);
  assert.equal(calls[0], '/profesionales/3/atencion?desde=2026-11-09&hasta=2026-11-15');
  for (const data of [{ ...response, personalId: 4 }, { ...response, desde: '2026-11-10' }, { ...response, intervalos: [{}] }, { ...response, omisiones: [{}] }]) await assert.rejects(readAgendaAttention(async () => data, 3, period));
});
test('una cita aprovecha columnas libres después del pico sin superponer otras', () => {
  const layout = eventLayout([{ id: 1, start: '09:00', end: '11:00' }, { id: 2, start: '09:00', end: '09:30' }, { id: 3, start: '09:00', end: '09:30' }, { id: 4, start: '09:30', end: '10:00' }]);
  assert.ok(layout.get(4).width > 60);
  assert.ok(layout.get(4).left >= layout.get(1).width - 0.01);
});
