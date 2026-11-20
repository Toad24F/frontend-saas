import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crearCoordinadorRefresco,
  crearComprobacionVersion,
} from '../src/connected/modules/agenda/agenda.refresco-vivo.js';
import { errorSeguro } from '../src/connected/modules/agenda/agenda.errores.js';
import { crearAgendaStore } from '../src/connected/modules/agenda/agenda.store.js';

const diferido = () => {
  let resolverPromesa;
  const promesa = new Promise((completar) => {
    resolverPromesa = completar;
  });
  return { promesa, resolver: resolverPromesa };
};

test('T100/T103: coordinador sin solapamiento, tareas independientes y baja explícita', async () => {
  const lecturaDiferida = diferido(),
    llamadas = [],
    refrescar = crearCoordinadorRefresco();
  const eliminar = refrescar.add(async () => {
    llamadas.push('agenda');
    await lecturaDiferida.promesa;
  });
  refrescar.add(async () => {
    llamadas.push('error');
    throw new Error('Temporal');
  });
  const primera = refrescar.run();
  const segunda = refrescar.run();
  await Promise.resolve();
  assert.deepEqual(llamadas, ['agenda', 'error']);
  lecturaDiferida.resolver();
  await Promise.all([primera, segunda]);
  eliminar();
  await refrescar.run();
  assert.deepEqual(llamadas, ['agenda', 'error', 'error']);
  refrescar.clear();
  await refrescar.run();
  assert.equal(llamadas.length, 3);
});

test('T100/T103: comprobación de versión no adopta otra versión y descarta respuesta tras cierre', async () => {
  let version = 2,
    activo = true;
  const eventos = [];
  const comprobar = crearComprobacionVersion({
    version: 2,
    read: async () => ({ version }),
    active: () => activo,
    notify: (evento) => eventos.push(evento),
  });
  await comprobar();
  assert.deepEqual(eventos, []);
  version = 3;
  await comprobar();
  await comprobar();
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].kind, 'stale');
  const lecturaDiferida = diferido();
  const cerrado = crearComprobacionVersion({
    version: 2,
    read: () => lecturaDiferida.promesa,
    active: () => activo,
    notify: (evento) => eventos.push(evento),
  });
  const pendiente = cerrado();
  activo = false;
  lecturaDiferida.resolver({ version: 9 });
  await pendiente;
  assert.equal(eventos.length, 1);
});

test('T100/T101: fallo o versión inválida impiden presentar el formulario como vigente', async () => {
  for (const lectura of [
    async () => ({}),
    async () => {
      throw Object.assign(new Error('SQL privado'), { status: 503 });
    },
  ]) {
    const eventos = [];
    const comprobar = crearComprobacionVersion({
      version: 1,
      read: lectura,
      active: () => true,
      notify: (evento) => eventos.push(evento),
    });
    await comprobar();
    assert.equal(eventos[0].kind, 'unverified');
  }
});

test('T100: refresco de la misma consulta conserva los últimos datos con aviso ante fallo', async () => {
  let rechazarPromesa = false;
  const store = crearAgendaStore(async () => {
    if (rechazarPromesa) throw Object.assign(new Error('Temporal'), { status: 503 });
    return { citas: [{ id: 7 }] };
  });
  await store.load({ desde: '2030-01-01' });
  rechazarPromesa = true;
  const pendiente = store.load({ desde: '2030-01-01' }, { background: true });
  assert.equal(store.state.busy, false);
  assert.equal(store.state.refreshing, true);
  assert.equal(store.state.data.citas[0].id, 7);
  await pendiente;
  assert.equal(store.state.error, null);
  assert.equal(store.state.refreshError.status, 503);
  assert.equal(store.state.data.citas.length, 1);
  rechazarPromesa = false;
  await store.load({ desde: '2030-01-01' }, { background: true });
  assert.equal(store.state.refreshError, null);
});

test('T103: un refresco antiguo no reemplaza filtro nuevo ni revive datos tras cerrar sesión', async () => {
  const lecturaDiferida = diferido();
  let n = 0;
  const store = crearAgendaStore(async () =>
    ++n === 2 ? lecturaDiferida.promesa : { citas: [{ id: n }] },
  );
  await store.load({ busqueda: 'A' });
  const pendiente = store.load({ busqueda: 'A' }, { background: true });
  await store.load({ busqueda: 'B' });
  lecturaDiferida.resolver({ citas: [{ id: 2 }] });
  await pendiente;
  assert.equal(store.state.data.citas[0].id, 3);
  const otro = diferido(),
    sesion = crearAgendaStore(() => otro.promesa);
  const anterior = sesion.load({});
  sesion.reset();
  otro.resolver({ citas: [7] });
  await anterior;
  assert.equal(sesion.state.data, null);
  assert.equal(sesion.state.refreshError, null);
});

test('T101: una denegación al refrescar retira los datos previos autorizados', async () => {
  for (const estadoHttp of [400, 401, 403, 404, 409]) {
    let rechazarPromesa = false;
    const store = crearAgendaStore(async () => {
      if (rechazarPromesa) throw Object.assign(new Error('Denegado'), { status: estadoHttp });
      return { citas: [{ id: 7 }] };
    });
    await store.load({});
    rechazarPromesa = true;
    await store.load({}, { background: true });
    assert.equal(store.state.data, null);
    assert.equal(store.state.error.status, estadoHttp);
  }
});

test('T101/T103: vacío válido y respuesta inválida no comparten estado', async () => {
  const store = crearAgendaStore(async () => ({ citas: [] }));
  await store.load({});
  assert.deepEqual(store.state.data.citas, []);
  assert.equal(store.state.error, null);
  const invalido = crearAgendaStore(async () => {
    throw new Error('Respuesta inválida');
  });
  await invalido.load({});
  assert.equal(invalido.state.data, null);
  assert.ok(invalido.state.error);
});

test('T101: 400/401/403/404/409/500/503/red/protocolo se distinguen sin exponer trazas', () => {
  const clases = new Set();
  for (const [estadoHttp, clase] of [
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
    const error = errorSeguro(
      Object.assign(new Error('SQL SELECT contacto secreto stack trace'), {
        status: estadoHttp,
      }),
    );
    assert.equal(error.kind, clase);
    assert.doesNotMatch(error.message, /SELECT|secreto|stack/);
    clases.add(error.kind);
  }
  assert.equal(clases.size, 7);
});
