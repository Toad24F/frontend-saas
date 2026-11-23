import test from 'node:test';
import assert from 'node:assert/strict';
import { seleccionManual, horariosManuales, crearClientCitaManual, puedeGestionarCitas, crearPayloadCambioEstado } from '../src/connected/modules/agenda/agenda.contrato-manual.js';
import { crearOperacionManual } from '../src/connected/modules/agenda/agenda.operacion-manual.js';

const seleccion = { sucursalId: 2, personalId: 3, servicioId: 4, fechaLocal: '2026-11-20', horaInicio: '09:17', clienteNuevo: { nombreCompleto: 'Ana', telefono: '6145550101' }, notas: null, autorizaWhatsapp: false };
const resultado = { id: 7, folio: 'M-7', estado: 'confirmada', origen: 'manual', version: 1, ...seleccion, clienteId: 8, inicioUtc: '2026-11-20T15:17:00Z', finUtc: '2026-11-20T15:47:00Z', finOcupacionUtc: '2026-11-20T15:52:00Z', zonaHoraria: 'America/Chihuahua', costoAceptado: '200.00' };
const horario = { inicioUtc: resultado.inicioUtc, finUtc: resultado.finUtc };
const almacenamiento = () => { const valores = new Map(); return { getItem: (clave) => valores.get(clave) ?? null, setItem: (clave, valor) => valores.set(clave, valor), removeItem: (clave) => valores.delete(clave) }; };
const alcance = { actorId: 5, negocioId: 1 };
const clave = () => 'manual_test_key_123456';
const error = (estadoHttp) => Object.assign(new Error(`Fallo ${estadoHttp}`), { status: estadoHttp });

// Primero se fijan el contrato cerrado y la autoridad del servidor, sin usar el motor de demo.
test('T093: cliente existente o nuevo; normaliza contacto y excluye precio, zona, fin e identidad', () => {
  const base = { ...seleccion, clienteNuevo: { nombreCompleto: ' Ana ', telefono: '+52 614-555-0101' }, precio: 1, finUtc: 'inventado', negocioId: 99 };
  assert.deepEqual(seleccionManual(base), seleccion);
  const { clienteNuevo, ...existente } = seleccion;
  assert.deepEqual(seleccionManual({ ...existente, clienteId: '8' }), { ...existente, clienteId: 8 });
  for (const valores of [{ ...seleccion, clienteId: 8 }, { ...existente }, { ...seleccion, horaInicio: '25:00' }, { ...seleccion, fechaLocal: '2026-02-30' }, { ...seleccion, personalId: 0 }, { ...seleccion, notas: 'x'.repeat(2001) }, { ...seleccion, clienteNuevo: { nombreCompleto: '', telefono: '123' } }]) assert.throws(() => seleccionManual(valores));
});
test('T094: opciones solo de ranuras manuales del servidor, con zona real y fecha exacta', () => {
  const respuesta = { ...seleccion, desde: seleccion.fechaLocal, hasta: seleccion.fechaLocal, modalidad: 'manual', zonaHoraria: resultado.zonaHoraria, ranuras: [horario], omisiones: [] };
  assert.deepEqual(horariosManuales(respuesta, seleccion), [{ ...horario, fechaLocal: seleccion.fechaLocal, horaInicio: '09:17' }]);
  assert.deepEqual(horariosManuales({ ...respuesta, ranuras: [] }, seleccion), []);
  for (const invalido of [null, { ...respuesta, modalidad: 'publica' }, { ...respuesta, personalId: 99 }, { ...respuesta, ranuras: [{}] }, { ...respuesta, desde: 'otro' }]) assert.throws(() => horariosManuales(invalido, seleccion));
});
test('T093–T096: permisos, estado/version/motivo y rutas exactas sin campos extra', async () => {
  assert.equal(puedeGestionarCitas('profesional'), false); assert.equal(puedeGestionarCitas('superadmin'), false);
  for (const rol of ['admin_negocio', 'recepcionista']) assert.equal(puedeGestionarCitas(rol), true);
  assert.deepEqual(crearPayloadCambioEstado({ estado: 'cancelada', version: 3, motivo: ' Motivo ', negocioId: 5 }), { estado: 'cancelada', version: 3, motivo: 'Motivo' });
  for (const erroneo of [{ estado: 'otro', version: 1 }, { estado: 'confirmada', version: 0 }, { estado: 'cancelada', version: 1, motivo: 'x'.repeat(2001) }]) assert.throws(() => crearPayloadCambioEstado(erroneo));
  const llamadas = [], client = crearClientCitaManual(async (...argumentos) => { llamadas.push(argumentos); return {}; });
  await client.consultarDisponibilidad(seleccion); await client.preparar(clave(), seleccion); await client.registrar(clave(), seleccion); await client.resolver(clave(), seleccion);
  await client.cambiarEstado(7, { estado: 'cancelada', version: 2, motivo: '' });
  assert.equal(llamadas[0][0], '/disponibilidad?personalId=3&sucursalId=2&servicioId=4&desde=2026-11-20&hasta=2026-11-20&modalidad=manual');
  assert.deepEqual(llamadas.slice(1), [['/citas/manuales/intentos', 'POST', { clave: clave(), seleccion: seleccion }], [`/citas/manuales/intentos/${clave()}/registrar`, 'POST', seleccion], [`/citas/manuales/intentos/${clave()}/resolver`, 'POST', seleccion], ['/citas/7/estado', 'PATCH', { estado: 'cancelada', version: 2, motivo: null }]]);
});
test('T095: doble clic prepara/registra una sola vez y mantiene resultado hasta reconocerlo', async () => {
  let desbloquear; const espera = new Promise((resolverPromesa) => { desbloquear = resolverPromesa; }); const llamadas = [];
  const operacion = crearOperacionManual({ scope: alcance, storage: almacenamiento(), keyFactory: clave, client: { preparar: async (...argumentos) => { llamadas.push(argumentos); await espera; return { clave: clave(), estado: 'preparado' }; }, registrar: async () => resultado } });
  const primera = operacion.submit(seleccion); await operacion.submit(seleccion);
  desbloquear(); await primera;
  assert.equal(llamadas.length, 1); assert.equal(operacion.state.status, 'registered'); assert.equal(operacion.state.result.folio, 'M-7');
  await operacion.submit(seleccion); assert.equal(llamadas.length, 1);
  operacion.acknowledge(); assert.equal(operacion.state.status, 'idle');
});
test('T095: respuesta perdida y recarga resuelven misma clave y contenido, sin segundo registro', async () => {
  const guardado = almacenamiento(); const llamadas = [];
  const operacion = crearOperacionManual({ scope: alcance, storage: guardado, keyFactory: clave, client: { preparar: async () => ({ clave: clave(), estado: 'preparado' }), registrar: async () => { throw error(0); } } });
  await operacion.submit(seleccion); assert.equal(operacion.state.status, 'uncertain');
  const recuperado = crearOperacionManual({ scope: alcance, storage: guardado, keyFactory: clave, client: { resolver: async (...argumentos) => { llamadas.push(argumentos); return { estado: 'registrado', resultado: resultado }; } } });
  await recuperado.start();
  assert.deepEqual(llamadas, [[clave(), seleccion]]); assert.equal(recuperado.state.result.folio, resultado.folio);
  await recuperado.submit({ ...seleccion, horaInicio: '10:00' }); assert.equal(llamadas.length, 1);
});
test('T095: preparación perdida se resuelve también y solo ausencia terminal permite otro intento', async () => {
  const guardado = almacenamiento(); let registros = 0;
  const operacion = crearOperacionManual({ scope: alcance, storage: guardado, keyFactory: clave, client: { preparar: async () => { throw error(503); }, registrar: async () => { registros++; }, resolver: async () => ({ estado: 'no_registrado' }) } });
  await operacion.submit(seleccion); assert.equal(operacion.state.status, 'uncertain');
  await operacion.resolve(); assert.equal(operacion.state.status, 'not_registered'); assert.equal(registros, 0);
  operacion.acknowledge(); assert.equal(operacion.state.status, 'idle');
});
test('T095: 400/401/403/404/409/500/503 del resolutor nunca significan ausencia ni borran marcador', async () => {
  for (const estadoHttp of [400, 401, 403, 404, 409, 500, 503]) {
    const guardado = almacenamiento();
    const operacion = crearOperacionManual({ scope: alcance, storage: guardado, keyFactory: clave, client: { preparar: async () => { throw error(0); }, resolver: async () => { throw error(estadoHttp); } } });
    await operacion.submit(seleccion); await operacion.resolve();
    assert.equal(operacion.state.status, 'uncertain'); assert.throws(() => operacion.acknowledge());
    const otroActor = crearOperacionManual({ scope: { ...alcance, actorId: 99 }, storage: guardado, keyFactory: clave, client: {} });
    assert.equal(otroActor.state.status, 'idle');
  }
});
test('T095: almacenamiento bloqueado o corrupto impide cualquier escritura; no se confirma respuesta malformada', async () => {
  let escrituras = 0;
  for (const guardado of [{ getItem() { throw Error('bloqueado'); } }, { getItem() { return '{roto'; } }, { getItem() { return null; }, setItem() { throw Error('sin espacio'); } }]) {
    const operacion = crearOperacionManual({ scope: alcance, storage: guardado, keyFactory: clave, client: { preparar: async () => { escrituras++; } } });
    await operacion.submit(seleccion); assert.equal(operacion.state.status, 'storage_error');
  }
  assert.equal(escrituras, 0);
  const operacion = crearOperacionManual({ scope: alcance, storage: almacenamiento(), keyFactory: clave, client: { preparar: async () => ({ estado: 'preparado', clave: clave() }), registrar: async () => ({}), resolver: async () => ({ estado: 'registrado', resultado: {} }) } });
  await operacion.submit(seleccion); await operacion.resolve(); assert.equal(operacion.state.status, 'uncertain');
});
test('T095: otro controlador abierto antes del envío no reemplaza una clave ya persistida', async () => {
  const guardado = almacenamiento(); let escrituras = 0;
  const primera = crearOperacionManual({ scope: alcance, storage: guardado, keyFactory: clave, client: { preparar: async () => { throw error(0); } } });
  const segunda = crearOperacionManual({ scope: alcance, storage: guardado, keyFactory: () => 'otra_clave_manual_1234', client: { preparar: async () => { escrituras++; }, resolver: async () => { throw error(503); } } });
  await primera.submit(seleccion); await segunda.submit({ ...seleccion, horaInicio: '10:00' });
  assert.equal(escrituras, 0); assert.equal(segunda.state.marker.clave, clave());
});
