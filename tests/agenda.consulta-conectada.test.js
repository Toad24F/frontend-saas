import test from 'node:test';
import assert from 'node:assert/strict';
import { paginasPorRol } from '../src/connected/modules/permisos/permisos.roles.js';
import { periodoCalendario, moverFechaCalendario, hoyCivil } from '../src/connected/modules/agenda/agenda.calendario.js';
import { crearAgendaClient } from '../src/connected/modules/agenda/agenda.client.js';
import { crearAgendaStore } from '../src/connected/modules/agenda/agenda.store.js';

// Tests escritos antes de producción: contratos reales, periodos completos y carreras de lectura.
test('T088: agenda por rol y directorio exclusivo de Administración/Recepción', () => {
  for (const rol of ['admin_negocio', 'recepcionista']) {
    assert.ok(paginasPorRol(rol).includes('agenda'));
    assert.ok(paginasPorRol(rol).includes('clientes'));
  }
  assert.ok(paginasPorRol('profesional').includes('agenda'));
  assert.ok(!paginasPorRol('profesional').includes('clientes'));
  assert.ok(!paginasPorRol('superadmin').includes('agenda'));
  assert.deepEqual(paginasPorRol('desconocido'), []);
});
test('Plataforma y el detalle de Negocio solo están disponibles para superadministración', () => {
  assert.deepEqual(paginasPorRol('superadmin'), ['plataforma', 'negocio', 'cuenta']);
  for (const rol of ['admin_negocio', 'profesional', 'recepcionista']) {
    const paginas = paginasPorRol(rol);
    assert.equal(paginas[0], 'agenda');
    assert.equal(paginas.includes('plataforma'), false);
    assert.equal(paginas.includes('negocio'), false);
  }
});
test('T090: día, semana y mes de seis semanas; aritmética civil sin DST', () => {
  assert.deepEqual(periodoCalendario('day', '2026-11-11'), { desde: '2026-11-11', hasta: '2026-11-11' });
  assert.deepEqual(periodoCalendario('week', '2026-11-01'), { desde: '2026-10-26', hasta: '2026-11-01' });
  assert.deepEqual(periodoCalendario('month', '2026-11-11'), { desde: '2026-10-26', hasta: '2026-12-06' });
  assert.equal(moverFechaCalendario('month', '2026-01-31', 1), '2026-02-01');
  assert.equal(moverFechaCalendario('day', '2028-02-28', 1), '2028-02-29');
  assert.equal(moverFechaCalendario('week', '2026-12-28', 1), '2027-01-04');
  assert.equal(hoyCivil(new Date('2026-11-12T02:00:00Z'), 'America/Chihuahua'), '2026-11-11');
  assert.throws(() => periodoCalendario('month', '2026-02-30'));
});
test('T089/T091: GET cerrado, filtros escapados y ninguna identidad ni paginación en calendario', async () => {
  const llamadas = [];
  const client = crearAgendaClient(async (ruta) => { llamadas.push(ruta); return { desde: '2026-11-01', hasta: '2026-11-01', citas: [] }; });
  await client.listar({ desde: '2026-11-01', hasta: '2026-11-01', sucursalId: '2', personalId: '3', estado: 'confirmada', busqueda: 'Ana & %_', negocioId: 999, pagina: 2 });
  const url = new URL(llamadas[0], 'http://test');
  assert.equal(url.pathname, '/citas');
  assert.deepEqual(Object.fromEntries(url.searchParams), { desde: '2026-11-01', hasta: '2026-11-01', sucursalId: '2', personalId: '3', estado: 'confirmada', busqueda: 'Ana & %_' });
});
test('T089/T092: detalle sin query, historial paginado y clientes solo por GET', async () => {
  const llamadas = [];
  const client = crearAgendaClient(async (...argumentos) => { llamadas.push(argumentos); return {}; });
  await client.consultarDetalle(7); await client.consultarHistorial(7, 2);
  await client.listarClientes({ busqueda: 'Ana', pagina: 2, limite: 20, negocioId: 9 });
  await client.consultarCliente(5); await client.consultarHistorialCliente(5, 3);
  assert.deepEqual(llamadas.map(([ruta]) => ruta), ['/citas/7', '/citas/7/historial?pagina=2&limite=50', '/clientes?busqueda=Ana&pagina=2&limite=20', '/clientes/5', '/clientes/5/citas?pagina=3&limite=50']);
  assert.ok(llamadas.every((argumentos) => argumentos.length === 1));
  assert.throws(() => client.consultarDetalle('1/estado'));
});
test('T090: exceso, error técnico y respuesta incompleta nunca se convierten en vacío', async () => {
  const consulta = { desde: '2026-11-01', hasta: '2026-11-01' };
  for (const respuesta of [null, {}, { ...consulta, citas: [{}] }, { ...consulta, citas: Array(1001).fill({}) }, { desde: 'otro', hasta: consulta.hasta, citas: [] }]) {
    await assert.rejects(crearAgendaClient(async () => respuesta).listar(consulta));
  }
  for (const estadoHttp of [400, 401, 403, 404, 409, 500, 503]) {
    const error = Object.assign(new Error('Acota la consulta'), { status: estadoHttp });
    await assert.rejects(crearAgendaClient(async () => { throw error; }).listar(consulta), (errorPrueba) => errorPrueba === error);
  }
});
const diferido = () => { let resolverPromesa, rechazar; const promesa = new Promise((a, b) => { resolverPromesa = a; rechazar = b; }); return { promise: promesa, resolve: resolverPromesa, reject: rechazar }; };
test('T091: respuesta antigua y error antiguo no reemplazan el último filtro', async () => {
  for (const rechazarAnterior of [false, true]) {
    const primera = diferido(), segunda = diferido(); let n = 0;
    const store = crearAgendaStore(() => (++n === 1 ? primera.promise : segunda.promise));
    const a = store.load({ busqueda: 'A' }); const b = store.load({ busqueda: 'B' });
    segunda.resolve({ citas: [{ id: 2 }] }); await b;
    if (rechazarAnterior) primera.reject(new Error('Antiguo')); else primera.resolve({ citas: [{ id: 1 }] });
    await a;
    assert.equal(store.state.data.citas[0].id, 2);
    assert.equal(store.state.error, null);
  }
});
test('T090/T091: nueva consulta retira datos previos; fallo visible y reintento explícito', async () => {
  let rechazarPromesa = false;
  const store = crearAgendaStore(async () => { if (rechazarPromesa) throw Object.assign(new Error('Temporal'), { status: 503 }); return { citas: [] }; });
  await store.load({ estado: 'confirmada' });
  rechazarPromesa = true; const pendiente = store.load({ estado: 'pendiente' });
  assert.equal(store.state.data, null); assert.equal(store.state.busy, true);
  await pendiente;
  assert.equal(store.state.error.status, 503); assert.equal(store.state.data, null);
  rechazarPromesa = false; await store.load({ estado: 'pendiente' });
  assert.deepEqual(store.state.data, { citas: [] });
});
test('T088: limpiar sesión invalida lecturas pendientes y datos privados', async () => {
  const espera = diferido(), store = crearAgendaStore(() => espera.promise);
  const pendiente = store.load({}); store.reset(); espera.resolve({ citas: [{ id: 1 }] }); await pendiente;
  assert.equal(store.state.data, null); assert.equal(store.state.busy, false);
});
test('T090: más de cien citas siguen completas; 1.000 es un límite técnico inclusivo', async () => {
  const consulta = { desde: '2026-11-01', hasta: '2026-11-01' };
  const cita = { id: 1, estado: 'confirmada', fechaLocal: consulta.desde, fechaFinLocal: consulta.desde, horaInicio: '23:15:00', horaFin: '23:45:00', zonaHoraria: 'America/Tijuana', causas: [] };
  for (const cantidad of [101, 1000]) {
    const respuesta = { ...consulta, citas: Array.from({ length: cantidad }, (_, indice) => ({ ...cita, id: indice + 1 })) };
    const resultado = await crearAgendaClient(async () => respuesta).listar(consulta);
    assert.equal(resultado.citas.length, cantidad);
  }
});
