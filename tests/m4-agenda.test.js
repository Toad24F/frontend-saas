import test from 'node:test';
import assert from 'node:assert/strict';
import { pagesForRole } from '../src/connected/modules/permisos/roles.js';
import { calendarPeriod, moveCalendarDate, todayCivil } from '../src/connected/modules/agenda/calendar.js';
import { createAgendaClient } from '../src/connected/modules/agenda/client.js';
import { createAgendaStore } from '../src/connected/modules/agenda/store.js';

// Tests escritos antes de producción: contratos reales, periodos completos y carreras de lectura.
test('T088: agenda por rol y directorio exclusivo de Administración/Recepción', () => {
  for (const role of ['admin_negocio', 'recepcionista']) {
    assert.ok(pagesForRole(role).includes('agenda'));
    assert.ok(pagesForRole(role).includes('clientes'));
  }
  assert.ok(pagesForRole('profesional').includes('agenda'));
  assert.ok(!pagesForRole('profesional').includes('clientes'));
  assert.ok(!pagesForRole('superadmin').includes('agenda'));
  assert.deepEqual(pagesForRole('desconocido'), []);
});
test('T090: día, semana y mes de seis semanas; aritmética civil sin DST', () => {
  assert.deepEqual(calendarPeriod('day', '2026-11-11'), { desde: '2026-11-11', hasta: '2026-11-11' });
  assert.deepEqual(calendarPeriod('week', '2026-11-01'), { desde: '2026-10-26', hasta: '2026-11-01' });
  assert.deepEqual(calendarPeriod('month', '2026-11-11'), { desde: '2026-10-26', hasta: '2026-12-06' });
  assert.equal(moveCalendarDate('month', '2026-01-31', 1), '2026-02-01');
  assert.equal(moveCalendarDate('day', '2028-02-28', 1), '2028-02-29');
  assert.equal(moveCalendarDate('week', '2026-12-28', 1), '2027-01-04');
  assert.equal(todayCivil(new Date('2026-11-12T02:00:00Z'), 'America/Chihuahua'), '2026-11-11');
  assert.throws(() => calendarPeriod('month', '2026-02-30'));
});
test('T089/T091: GET cerrado, filtros escapados y ninguna identidad ni paginación en calendario', async () => {
  const calls = [];
  const client = createAgendaClient(async (path) => { calls.push(path); return { desde: '2026-11-01', hasta: '2026-11-01', citas: [] }; });
  await client.list({ desde: '2026-11-01', hasta: '2026-11-01', sucursalId: '2', personalId: '3', estado: 'confirmada', busqueda: 'Ana & %_', negocioId: 999, pagina: 2 });
  const url = new URL(calls[0], 'http://test');
  assert.equal(url.pathname, '/citas');
  assert.deepEqual(Object.fromEntries(url.searchParams), { desde: '2026-11-01', hasta: '2026-11-01', sucursalId: '2', personalId: '3', estado: 'confirmada', busqueda: 'Ana & %_' });
});
test('T089/T092: detalle sin query, historial paginado y clientes solo por GET', async () => {
  const calls = [];
  const client = createAgendaClient(async (...args) => { calls.push(args); return {}; });
  await client.detail(7); await client.history(7, 2);
  await client.clients({ busqueda: 'Ana', pagina: 2, limite: 20, negocioId: 9 });
  await client.customer(5); await client.customerHistory(5, 3);
  assert.deepEqual(calls.map(([path]) => path), ['/citas/7', '/citas/7/historial?pagina=2&limite=50', '/clientes?busqueda=Ana&pagina=2&limite=20', '/clientes/5', '/clientes/5/citas?pagina=3&limite=50']);
  assert.ok(calls.every((args) => args.length === 1));
  assert.throws(() => client.detail('1/estado'));
});
test('T090: exceso, error técnico y respuesta incompleta nunca se convierten en vacío', async () => {
  const query = { desde: '2026-11-01', hasta: '2026-11-01' };
  for (const response of [null, {}, { ...query, citas: [{}] }, { ...query, citas: Array(1001).fill({}) }, { desde: 'otro', hasta: query.hasta, citas: [] }]) {
    await assert.rejects(createAgendaClient(async () => response).list(query));
  }
  for (const status of [400, 401, 403, 404, 409, 500, 503]) {
    const error = Object.assign(new Error('Acota la consulta'), { status });
    await assert.rejects(createAgendaClient(async () => { throw error; }).list(query), (e) => e === error);
  }
});
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
test('T091: respuesta antigua y error antiguo no reemplazan el último filtro', async () => {
  for (const rejectOld of [false, true]) {
    const first = deferred(), second = deferred(); let n = 0;
    const store = createAgendaStore(() => (++n === 1 ? first.promise : second.promise));
    const a = store.load({ busqueda: 'A' }); const b = store.load({ busqueda: 'B' });
    second.resolve({ citas: [{ id: 2 }] }); await b;
    if (rejectOld) first.reject(new Error('Antiguo')); else first.resolve({ citas: [{ id: 1 }] });
    await a;
    assert.equal(store.state.data.citas[0].id, 2);
    assert.equal(store.state.error, null);
  }
});
test('T090/T091: nueva consulta retira datos previos; fallo visible y reintento explícito', async () => {
  let fail = false;
  const store = createAgendaStore(async () => { if (fail) throw Object.assign(new Error('Temporal'), { status: 503 }); return { citas: [] }; });
  await store.load({ estado: 'confirmada' });
  fail = true; const pending = store.load({ estado: 'pendiente' });
  assert.equal(store.state.data, null); assert.equal(store.state.busy, true);
  await pending;
  assert.equal(store.state.error.status, 503); assert.equal(store.state.data, null);
  fail = false; await store.load({ estado: 'pendiente' });
  assert.deepEqual(store.state.data, { citas: [] });
});
test('T088: limpiar sesión invalida lecturas pendientes y datos privados', async () => {
  const wait = deferred(), store = createAgendaStore(() => wait.promise);
  const pending = store.load({}); store.reset(); wait.resolve({ citas: [{ id: 1 }] }); await pending;
  assert.equal(store.state.data, null); assert.equal(store.state.busy, false);
});
test('T090: más de cien citas siguen completas; 1.000 es un límite técnico inclusivo', async () => {
  const query = { desde: '2026-11-01', hasta: '2026-11-01' };
  const cita = { id: 1, estado: 'confirmada', fechaLocal: query.desde, fechaFinLocal: query.desde, horaInicio: '23:15:00', horaFin: '23:45:00', zonaHoraria: 'America/Tijuana', causas: [] };
  for (const count of [101, 1000]) {
    const response = { ...query, citas: Array.from({ length: count }, (_, i) => ({ ...cita, id: i + 1 })) };
    const result = await createAgendaClient(async () => response).list(query);
    assert.equal(result.citas.length, count);
  }
});
