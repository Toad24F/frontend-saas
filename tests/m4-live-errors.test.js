import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRefreshCoordinator,
  createVersionCheck,
} from '../src/connected/modules/agenda/live-refresh.js';
import { privateError } from '../src/connected/modules/agenda/errors.js';
import { createAgendaStore } from '../src/connected/modules/agenda/store.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('T100/T103: coordinador sin solapamiento, tareas independientes y baja explícita', async () => {
  const gate = deferred(),
    calls = [],
    refresh = createRefreshCoordinator();
  const remove = refresh.add(async () => {
    calls.push('agenda');
    await gate.promise;
  });
  refresh.add(async () => {
    calls.push('error');
    throw new Error('Temporal');
  });
  const first = refresh.run();
  const second = refresh.run();
  await Promise.resolve();
  assert.deepEqual(calls, ['agenda', 'error']);
  gate.resolve();
  await Promise.all([first, second]);
  remove();
  await refresh.run();
  assert.deepEqual(calls, ['agenda', 'error', 'error']);
  refresh.clear();
  await refresh.run();
  assert.equal(calls.length, 3);
});

test('T100/T103: comprobación de versión no adopta otra versión y descarta respuesta tras cierre', async () => {
  let version = 2,
    active = true;
  const events = [];
  const check = createVersionCheck({
    version: 2,
    read: async () => ({ version }),
    active: () => active,
    notify: (event) => events.push(event),
  });
  await check();
  assert.deepEqual(events, []);
  version = 3;
  await check();
  await check();
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'stale');
  const gate = deferred();
  const closed = createVersionCheck({
    version: 2,
    read: () => gate.promise,
    active: () => active,
    notify: (event) => events.push(event),
  });
  const pending = closed();
  active = false;
  gate.resolve({ version: 9 });
  await pending;
  assert.equal(events.length, 1);
});

test('T100/T101: fallo o versión inválida impiden presentar el formulario como vigente', async () => {
  for (const read of [
    async () => ({}),
    async () => {
      throw Object.assign(new Error('SQL privado'), { status: 503 });
    },
  ]) {
    const events = [];
    const check = createVersionCheck({
      version: 1,
      read,
      active: () => true,
      notify: (event) => events.push(event),
    });
    await check();
    assert.equal(events[0].kind, 'unverified');
  }
});

test('T100: refresco de la misma consulta conserva último snapshot con aviso ante fallo', async () => {
  let fail = false;
  const store = createAgendaStore(async () => {
    if (fail) throw Object.assign(new Error('Temporal'), { status: 503 });
    return { citas: [{ id: 7 }] };
  });
  await store.load({ desde: '2030-01-01' });
  fail = true;
  const pending = store.load({ desde: '2030-01-01' }, { background: true });
  assert.equal(store.state.busy, false);
  assert.equal(store.state.refreshing, true);
  assert.equal(store.state.data.citas[0].id, 7);
  await pending;
  assert.equal(store.state.error, null);
  assert.equal(store.state.refreshError.status, 503);
  assert.equal(store.state.data.citas.length, 1);
  fail = false;
  await store.load({ desde: '2030-01-01' }, { background: true });
  assert.equal(store.state.refreshError, null);
});

test('T103: un refresco antiguo no reemplaza filtro nuevo ni revive datos tras cerrar sesión', async () => {
  const gate = deferred();
  let n = 0;
  const store = createAgendaStore(async () =>
    ++n === 2 ? gate.promise : { citas: [{ id: n }] },
  );
  await store.load({ busqueda: 'A' });
  const pending = store.load({ busqueda: 'A' }, { background: true });
  await store.load({ busqueda: 'B' });
  gate.resolve({ citas: [{ id: 2 }] });
  await pending;
  assert.equal(store.state.data.citas[0].id, 3);
  const other = deferred(),
    session = createAgendaStore(() => other.promise);
  const old = session.load({});
  session.reset();
  other.resolve({ citas: [7] });
  await old;
  assert.equal(session.state.data, null);
  assert.equal(session.state.refreshError, null);
});

test('T101: una denegación al refrescar retira el snapshot previamente autorizado', async () => {
  for (const status of [400, 401, 403, 404, 409]) {
    let fail = false;
    const store = createAgendaStore(async () => {
      if (fail) throw Object.assign(new Error('Denegado'), { status });
      return { citas: [{ id: 7 }] };
    });
    await store.load({});
    fail = true;
    await store.load({}, { background: true });
    assert.equal(store.state.data, null);
    assert.equal(store.state.error.status, status);
  }
});

test('T101/T103: vacío válido y respuesta inválida no comparten estado', async () => {
  const store = createAgendaStore(async () => ({ citas: [] }));
  await store.load({});
  assert.deepEqual(store.state.data.citas, []);
  assert.equal(store.state.error, null);
  const invalid = createAgendaStore(async () => {
    throw new Error('Respuesta inválida');
  });
  await invalid.load({});
  assert.equal(invalid.state.data, null);
  assert.ok(invalid.state.error);
});

test('T101: 400/401/403/404/409/500/503/red/protocolo se distinguen sin exponer trazas', () => {
  const kinds = new Set();
  for (const [status, kind] of [
    [400, 'invalid'],
    [401, 'session'],
    [403, 'forbidden'],
    [404, 'missing'],
    [409, 'conflict'],
    [500, 'technical'],
    [503, 'technical'],
    [0, 'network'],
    [undefined, 'technical'],
  ]) {
    const error = privateError(
      Object.assign(new Error('SQL SELECT contacto secreto stack trace'), {
        status,
      }),
    );
    assert.equal(error.kind, kind);
    assert.doesNotMatch(error.message, /SELECT|secreto|stack/);
    kinds.add(error.kind);
  }
  assert.equal(kinds.size, 7);
});
