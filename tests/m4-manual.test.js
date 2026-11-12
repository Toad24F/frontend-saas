import test from 'node:test';
import assert from 'node:assert/strict';
import { manualSelection, manualSlots, createManualClient, canManageAppointments, stateChange } from '../src/connected/modules/agenda/manual-contract.js';
import { createManualOperation } from '../src/connected/modules/agenda/manual-operation.js';

const selection = { sucursalId: 2, personalId: 3, servicioId: 4, fechaLocal: '2026-11-20', horaInicio: '09:17', clienteNuevo: { nombreCompleto: 'Ana', telefono: '6145550101' }, notas: null };
const result = { id: 7, folio: 'M-7', estado: 'confirmada', origen: 'manual', version: 1, ...selection, clienteId: 8, inicioUtc: '2026-11-20T15:17:00Z', finUtc: '2026-11-20T15:47:00Z', finOcupacionUtc: '2026-11-20T15:52:00Z', zonaHoraria: 'America/Chihuahua', costoAceptado: '200.00' };
const slot = { inicioUtc: result.inicioUtc, finUtc: result.finUtc };
const storage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; };
const scope = { actorId: 5, negocioId: 1 };
const key = () => 'manual_test_key_123456';
const error = (status) => Object.assign(new Error(`Fallo ${status}`), { status });

// Primero se fijan el contrato cerrado y la autoridad del servidor, sin usar el motor de demo.
test('T093: cliente existente o nuevo; normaliza contacto y excluye precio, zona, fin e identidad', () => {
  const base = { ...selection, clienteNuevo: { nombreCompleto: ' Ana ', telefono: '+52 614-555-0101' }, precio: 1, finUtc: 'inventado', negocioId: 99 };
  assert.deepEqual(manualSelection(base), selection);
  const { clienteNuevo, ...existing } = selection;
  assert.deepEqual(manualSelection({ ...existing, clienteId: '8' }), { ...existing, clienteId: 8 });
  for (const values of [{ ...selection, clienteId: 8 }, { ...existing }, { ...selection, horaInicio: '25:00' }, { ...selection, fechaLocal: '2026-02-30' }, { ...selection, personalId: 0 }, { ...selection, notas: 'x'.repeat(2001) }, { ...selection, clienteNuevo: { nombreCompleto: '', telefono: '123' } }]) assert.throws(() => manualSelection(values));
});
test('T094: opciones solo de ranuras manuales del servidor, con zona real y fecha exacta', () => {
  const response = { ...selection, desde: selection.fechaLocal, hasta: selection.fechaLocal, modalidad: 'manual', zonaHoraria: result.zonaHoraria, ranuras: [slot], omisiones: [] };
  assert.deepEqual(manualSlots(response, selection), [{ ...slot, fechaLocal: selection.fechaLocal, horaInicio: '09:17' }]);
  assert.deepEqual(manualSlots({ ...response, ranuras: [] }, selection), []);
  for (const invalid of [null, { ...response, modalidad: 'publica' }, { ...response, personalId: 99 }, { ...response, ranuras: [{}] }, { ...response, desde: 'otro' }]) assert.throws(() => manualSlots(invalid, selection));
});
test('T093–T096: permisos, estado/version/motivo y rutas exactas sin campos extra', async () => {
  assert.equal(canManageAppointments('profesional'), false); assert.equal(canManageAppointments('superadmin'), false);
  for (const role of ['admin_negocio', 'recepcionista']) assert.equal(canManageAppointments(role), true);
  assert.deepEqual(stateChange({ estado: 'cancelada', version: 3, motivo: ' Motivo ', negocioId: 5 }), { estado: 'cancelada', version: 3, motivo: 'Motivo' });
  for (const bad of [{ estado: 'otro', version: 1 }, { estado: 'confirmada', version: 0 }, { estado: 'cancelada', version: 1, motivo: 'x'.repeat(2001) }]) assert.throws(() => stateChange(bad));
  const calls = [], client = createManualClient(async (...args) => { calls.push(args); return {}; });
  await client.availability(selection); await client.prepare(key(), selection); await client.register(key(), selection); await client.resolve(key(), selection);
  await client.changeState(7, { estado: 'cancelada', version: 2, motivo: '' });
  assert.equal(calls[0][0], '/disponibilidad?personalId=3&sucursalId=2&servicioId=4&desde=2026-11-20&hasta=2026-11-20&modalidad=manual');
  assert.deepEqual(calls.slice(1), [['/citas/manuales/intentos', 'POST', { clave: key(), seleccion: selection }], [`/citas/manuales/intentos/${key()}/registrar`, 'POST', selection], [`/citas/manuales/intentos/${key()}/resolver`, 'POST', selection], ['/citas/7/estado', 'PATCH', { estado: 'cancelada', version: 2, motivo: null }]]);
});
test('T095: doble clic prepara/registra una sola vez y mantiene resultado hasta reconocerlo', async () => {
  let unblock; const wait = new Promise((resolve) => { unblock = resolve; }); const calls = [];
  const operation = createManualOperation({ scope, storage: storage(), keyFactory: key, client: { prepare: async (...args) => { calls.push(args); await wait; return { clave: key(), estado: 'preparado' }; }, register: async () => result } });
  const first = operation.submit(selection); await operation.submit(selection);
  unblock(); await first;
  assert.equal(calls.length, 1); assert.equal(operation.state.status, 'registered'); assert.equal(operation.state.result.folio, 'M-7');
  await operation.submit(selection); assert.equal(calls.length, 1);
  operation.acknowledge(); assert.equal(operation.state.status, 'idle');
});
test('T095: respuesta perdida y recarga resuelven misma clave y contenido, sin segundo registro', async () => {
  const saved = storage(); const calls = [];
  const operation = createManualOperation({ scope, storage: saved, keyFactory: key, client: { prepare: async () => ({ clave: key(), estado: 'preparado' }), register: async () => { throw error(0); } } });
  await operation.submit(selection); assert.equal(operation.state.status, 'uncertain');
  const recovered = createManualOperation({ scope, storage: saved, keyFactory: key, client: { resolve: async (...args) => { calls.push(args); return { estado: 'registrado', resultado: result }; } } });
  await recovered.start();
  assert.deepEqual(calls, [[key(), selection]]); assert.equal(recovered.state.result.folio, result.folio);
  await recovered.submit({ ...selection, horaInicio: '10:00' }); assert.equal(calls.length, 1);
});
test('T095: preparación perdida se resuelve también y solo ausencia terminal permite otro intento', async () => {
  const saved = storage(); let registers = 0;
  const operation = createManualOperation({ scope, storage: saved, keyFactory: key, client: { prepare: async () => { throw error(503); }, register: async () => { registers++; }, resolve: async () => ({ estado: 'no_registrado' }) } });
  await operation.submit(selection); assert.equal(operation.state.status, 'uncertain');
  await operation.resolve(); assert.equal(operation.state.status, 'not_registered'); assert.equal(registers, 0);
  operation.acknowledge(); assert.equal(operation.state.status, 'idle');
});
test('T095: 400/401/403/404/409/500/503 del resolutor nunca significan ausencia ni borran marcador', async () => {
  for (const status of [400, 401, 403, 404, 409, 500, 503]) {
    const saved = storage();
    const operation = createManualOperation({ scope, storage: saved, keyFactory: key, client: { prepare: async () => { throw error(0); }, resolve: async () => { throw error(status); } } });
    await operation.submit(selection); await operation.resolve();
    assert.equal(operation.state.status, 'uncertain'); assert.throws(() => operation.acknowledge());
    const anotherActor = createManualOperation({ scope: { ...scope, actorId: 99 }, storage: saved, keyFactory: key, client: {} });
    assert.equal(anotherActor.state.status, 'idle');
  }
});
test('T095: almacenamiento bloqueado o corrupto impide cualquier escritura; no se confirma respuesta malformada', async () => {
  let writes = 0;
  for (const saved of [{ getItem() { throw Error('bloqueado'); } }, { getItem() { return '{roto'; } }, { getItem() { return null; }, setItem() { throw Error('sin espacio'); } }]) {
    const operation = createManualOperation({ scope, storage: saved, keyFactory: key, client: { prepare: async () => { writes++; } } });
    await operation.submit(selection); assert.equal(operation.state.status, 'storage_error');
  }
  assert.equal(writes, 0);
  const operation = createManualOperation({ scope, storage: storage(), keyFactory: key, client: { prepare: async () => ({ estado: 'preparado', clave: key() }), register: async () => ({}), resolve: async () => ({ estado: 'registrado', resultado: {} }) } });
  await operation.submit(selection); await operation.resolve(); assert.equal(operation.state.status, 'uncertain');
});
test('T095: otro controlador abierto antes del envío no reemplaza una clave ya persistida', async () => {
  const saved = storage(); let writes = 0;
  const first = createManualOperation({ scope, storage: saved, keyFactory: key, client: { prepare: async () => { throw error(0); } } });
  const second = createManualOperation({ scope, storage: saved, keyFactory: () => 'otra_clave_manual_1234', client: { prepare: async () => { writes++; }, resolve: async () => { throw error(503); } } });
  await first.submit(selection); await second.submit({ ...selection, horaInicio: '10:00' });
  assert.equal(writes, 0); assert.equal(second.state.marker.clave, key());
});
