import test from 'node:test';
import assert from 'node:assert/strict';
import { createAttemptStore } from '../src/connected/public/attempt-store.js';
import { createPortalBooking } from '../src/connected/public/booking.js';
import { renderBooking } from '../src/connected/public/booking-view.js';
import { memoryStorage } from './fixtures/memory-storage.js';
import { acquirePublicMutation } from '../src/connected/public/browser-session.js';

const marker = { negocio: 'centro', apartadoId: 8, clave: 'attempt_test_000001' };
const result = { folio: 'P-123456789012345678', estado: 'pendiente', inicioUtc: '2026-10-20T17:00:00.000Z',
  finUtc: '2026-10-20T17:30:00.000Z', zonaHoraria: 'America/Mazatlan', costoAceptado: '450.00',
  nombreNegocio: 'Negocio histórico', nombreServicio: 'Servicio guardado', nombreSucursal: 'Sucursal histórica', nombreProfesional: 'Profesional histórico' };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function setup(handler, extra = {}) {
  const storage = extra.storage || memoryStorage();
  const store = createAttemptStore('centro', () => storage);
  const calls = [], messages = [];
  const client = { async request(path, options = {}) {
    calls.push({ path, ...options });
    if (path === 'catalogo') return { negocio: { slug: 'centro' }, servicios: [{ id: 1, nombre: 'Actual', costo: '999.00', duracionMinutos: 30 }],
      sucursales: options.query.servicioId ? [{ id: 2, nombre: 'Centro', direccion: 'Calle 1', zonaHoraria: 'America/Mazatlan' }] : [], profesionales: options.query.sucursalId ? [{ id: 3, nombre: 'Ana' }] : [] };
    if (path === 'disponibilidad') return { ...options.query, modalidad: 'publica', zonaHoraria: 'America/Mazatlan', ranuras: [{ inicioUtc: result.inicioUtc, finUtc: result.finUtc }] };
    if (path === 'apartados') return { estado: 'concedida', apartadoId: 8, generacion: '1', costoAceptado: '450.00', zonaHoraria: 'America/Mazatlan', expiraEn: '2026-10-20T16:05:00Z', servidorAhora: '2026-10-20T16:00:00Z' };
    if (path === 'apartados/8') return extra.ownResponse ? extra.ownResponse() : { apartadoId: 8, generacion: '1', estado: 'vigente', expiraEn: '2026-10-20T16:05:00Z', servidorAhora: '2026-10-20T16:00:00Z' };
    if (handler) return handler(path, options, store);
    if (path === 'intentos') return { id: marker.clave, apartadoId: 8, estado: 'preparado' };
    if (path.endsWith('/reservar')) return result;
    if (path.endsWith('/resolver')) return { estado: 'registrado', resultado: result };
    return null;
  } };
  const flow = createPortalBooking(client, { slug: 'centro', storage, attemptKey: () => marker.clave,
    operationKey: () => 'operation_test_000001', monotonicNow: () => 0, now: () => new Date('2026-10-20T16:00:00Z'),
    channel: { postMessage: (data) => messages.push(data), close() {} }, ...extra });
  return { flow, calls, store, storage, messages };
}
async function form(flow) {
  await flow.start(); flow.choose('servicioId', 1); await flow.next(); flow.choose('sucursalId', 2); await flow.next();
  flow.choose('personalId', 3); await flow.next(); flow.chooseSlot(result.inicioUtc); await flow.reserveSelected();
  flow.updateContact('nombre', '  Ana  '); flow.updateContact('telefono', '+52 614-123-4567'); flow.updateContact('notas', ' Nota privada ');
}

test('T110: almacena exactamente negocio, apartado y clave; lectura aislada por negocio', () => {
  const storage = memoryStorage(), store = createAttemptStore('centro', () => storage);
  assert.equal(store.read().status, 'missing'); store.write(marker);
  assert.deepEqual(store.read().marker, marker);
  assert.deepEqual(JSON.parse(storage.getItem(store.key)), marker);
  assert.equal(createAttemptStore('otro', () => storage).read().status, 'missing');
  assert.throws(() => store.write({ ...marker, nombre: 'Privado' }));
});

test('T110: marcador confirmado antes de preparar y enviar; contenido normalizado solo por HTTP', async () => {
  const { flow, store, calls, messages } = setup((path, options, saved) => {
    assert.deepEqual(saved.read().marker, marker);
    if (path === 'intentos') return { id: marker.clave, apartadoId: 8, estado: 'preparado' };
    if (path.endsWith('/reservar')) return result;
  });
  await form(flow); await flow.submitReservation();
  assert.deepEqual(calls.find((call) => call.path === 'intentos').body, { clave: marker.clave, apartadoId: 8 });
  assert.deepEqual(calls.find((call) => call.path.endsWith('/reservar')).body, { nombre: 'Ana', telefono: '6141234567', notas: 'Nota privada' });
  assert.equal(store.read().status, 'missing'); assert.equal(flow.getState().phase, 'result');
  assert.ok(!JSON.stringify(messages).includes('Nota privada'));
});

test('T110: fallo de persistencia impide toda preparación y envío', async () => {
  const storage = memoryStorage(); storage.setItem = () => { throw Error('bloqueado'); };
  const { flow, calls } = setup(null, { storage }); await form(flow); await flow.submitReservation();
  assert.equal(flow.getState().phase, 'form'); assert.ok(!calls.some((call) => call.path.startsWith('intentos')));
  assert.match(flow.getState().notice, /guardar|almacenamiento/i);
});

test('T111: validación local señala campos sin persistir ni llamar al escritor', async () => {
  const { flow, calls, store } = setup(); await form(flow); flow.updateContact('telefono', '123'); await flow.submitReservation();
  assert.ok(flow.getState().contactErrors.telefono); assert.equal(store.read().status, 'missing');
  assert.ok(!calls.some((call) => call.path === 'intentos'));
});

test('T111: doble clic excluido y reintento usa el mismo contenido aunque se intente editar', async () => {
  let first = true; const pending = deferred();
  const { flow, calls, store } = setup((path) => path === 'intentos' ? { id: marker.clave, apartadoId: 8, estado: 'preparado' }
    : path.endsWith('/reservar') ? first ? (first = false, pending.promise) : result : { estado: 'registrado', resultado: result });
  await form(flow); const sending = flow.submitReservation(); await flow.submitReservation();
  pending.reject(Error('red')); await sending;
  assert.equal(flow.getState().phase, 'uncertain'); assert.deepEqual(store.read().marker, marker);
  flow.updateContact('nombre', 'Otro'); await flow.repeatSubmission();
  const writes = calls.filter((call) => call.path.endsWith('/reservar'));
  assert.equal(writes.length, 2); assert.deepEqual(writes[0].body, writes[1].body);
  assert.equal(flow.getState().phase, 'result');
});

test('T111–T112: 400/409 conservan datos y no reinician sin ausencia terminal', async () => {
  for (const status of [400, 409]) {
    const { flow, store } = setup((path) => {
      if (path === 'intentos') return { id: marker.clave, apartadoId: 8, estado: 'preparado' };
      throw Object.assign(Error('rechazo'), { status });
    });
    await form(flow); await flow.submitReservation();
    assert.equal(flow.getState().phase, 'uncertain'); assert.equal(flow.getState().contact.nombre, '  Ana  ');
    assert.deepEqual(store.read().marker, marker);
    await flow.resolveSubmission(); assert.equal(flow.getState().phase, 'uncertain');
  }
});

test('T112: recarga con marcador resuelve antes de catálogo y sin contacto', async () => {
  const storage = memoryStorage(); createAttemptStore('centro', () => storage).write(marker);
  const { flow, calls } = setup(null, { storage }); await flow.start();
  assert.equal(calls.length, 1); assert.equal(calls[0].path, `intentos/${marker.clave}/resolver`);
  assert.deepEqual(calls[0].body, { apartadoId: 8 }); assert.equal(flow.getState().phase, 'result');
  assert.equal(flow.getState().result.folio, result.folio);
});

test('T112: solo no_registrado comprobado elimina marcador y reinicia selección', async () => {
  const storage = memoryStorage(); createAttemptStore('centro', () => storage).write(marker);
  const { flow, calls, store } = setup(() => ({ estado: 'no_registrado' }), { storage }); await flow.start();
  assert.equal(flow.getState().phase, 'selection'); assert.equal(flow.getState().step, 0); assert.equal(store.read().status, 'missing');
  assert.equal(calls[0].path, `intentos/${marker.clave}/resolver`); assert.equal(calls[1].path, 'catalogo');
});

test('T112: 401/404/503, red y respuesta inválida nunca se interpretan como ausencia', async () => {
  for (const mode of [401, 404, 503, 'network', 'invalid']) {
    const storage = memoryStorage(); createAttemptStore('centro', () => storage).write(marker);
    const { flow, calls, store } = setup(() => {
      if (mode === 'invalid') return { estado: 'desconocido' };
      throw Object.assign(Error('fallo'), typeof mode === 'number' ? { status: mode } : {});
    }, { storage });
    await flow.start(); assert.equal(flow.getState().phase, 'uncertain'); assert.deepEqual(store.read().marker, marker);
    assert.equal(calls.length, 1); await flow.reserveSelected(); assert.equal(calls.length, 1);
  }
});

test('T112: marcador corrupto o almacenamiento inaccesible bloquean sin borrar evidencia', async () => {
  const storage = memoryStorage(), store = createAttemptStore('centro', () => storage);
  storage.setItem(store.key, '{incorrecto');
  const { flow, calls } = setup(null, { storage }); await flow.start();
  assert.equal(flow.getState().phase, 'uncertain'); assert.equal(calls.length, 0);
  assert.equal(storage.getItem(store.key), '{incorrecto');
  assert.equal(createAttemptStore('centro', () => { throw Error('bloqueado'); }).read().status, 'unavailable');
});

test('T112: limpieza fallida tras ausencia terminal no habilita otra reserva', async () => {
  const storage = memoryStorage(); createAttemptStore('centro', () => storage).write(marker);
  storage.removeItem = () => { throw Error('bloqueado'); };
  const { flow } = setup(() => ({ estado: 'no_registrado' }), { storage }); await flow.start();
  assert.equal(flow.getState().phase, 'uncertain');
});

test('T112: desaparecer un marcador corrupto no equivale a ausencia terminal del servidor', async () => {
  const storage = memoryStorage(), store = createAttemptStore('centro', () => storage);
  storage.setItem(store.key, '{corrupto');
  const { flow, calls } = setup(null, { storage }); await flow.start();
  storage.removeItem(store.key); await flow.resolveSubmission();
  assert.equal(flow.getState().phase, 'uncertain'); assert.equal(calls.length, 0);
});

test('T113: salida mientras prepara/envía o resultado incierto no libera el apartado', async () => {
  for (const stage of ['prepare', 'write']) {
    const pending = deferred();
    const { flow, calls, store } = setup((path) => path === 'intentos'
      ? stage === 'prepare' ? pending.promise : { id: marker.clave, apartadoId: 8, estado: 'preparado' }
      : path.endsWith('/reservar') ? pending.promise : null);
    await form(flow); const sending = flow.submitReservation();
    await new Promise((resolve) => setImmediate(resolve));
    flow.exit(); pending.reject(Error('red')); await sending;
    assert.equal(calls.filter((call) => call.path.endsWith('/liberar')).length, 0);
    assert.deepEqual(store.read().marker, marker);
    if (stage === 'prepare') assert.ok(!calls.some((call) => call.path.endsWith('/reservar')));
  }
});

test('T113: preparación exitosa recibida después de salir no inicia un escritor tardío', async () => {
  const pending = deferred();
  const { flow, calls, store } = setup((path) => path === 'intentos' ? pending.promise : result);
  await form(flow); const send = flow.submitReservation();
  await new Promise((resolve) => setImmediate(resolve));
  flow.exit(); pending.resolve({ id: marker.clave, apartadoId: 8, estado: 'preparado' }); await send;
  assert.ok(!calls.some((call) => call.path.endsWith('/reservar') || call.path.endsWith('/liberar')));
  assert.deepEqual(store.read().marker, marker);
});

test('T111: preparación ya registrada recupera el resultado sin repetir el escritor', async () => {
  const { flow, calls } = setup((path) => path === 'intentos' ? { id: marker.clave, apartadoId: 8, estado: 'registrado' } : { estado: 'registrado', resultado: result });
  await form(flow); await flow.submitReservation();
  assert.equal(flow.getState().phase, 'result'); assert.ok(!calls.some((call) => call.path.endsWith('/reservar')));
  assert.equal(calls.at(-1).path, `intentos/${marker.clave}/resolver`);
});

test('T113: consulta y avisos atrasados no borran el resumen ni liberan otro apartado', async () => {
  const base = setup(); await form(base.flow);
  // Un aviso posterior al resultado no reactiva la gestión del apartado consumido.
  await base.flow.submitReservation(); await base.flow.handleMessage({ type: 'refresh', slug: 'centro' });
  await base.flow.returnToAvailability(); base.flow.exit();
  assert.equal(base.flow.getState().result.folio, result.folio);
  assert.ok(!base.calls.some((call) => call.path.endsWith('/liberar')));
});

test('T111–T113: un envío incierto conserva el lock para bloquear apartados de otra pestaña', async () => {
  let active = false;
  const locks = { async request(_name, options, callback) {
    assert.equal(options.ifAvailable, true);
    if (active) return callback(null);
    active = true;
    try { return await callback({}); } finally { active = false; }
  } };
  const acquireMutation = () => acquirePublicMutation('centro', { locks });
  const first = setup((path) => {
    if (path === 'intentos') return { id: marker.clave, apartadoId: 8, estado: 'preparado' };
    if (path.endsWith('/resolver')) return { estado: 'registrado', resultado: result };
    throw Error('red');
  }, { acquireMutation });
  await form(first.flow); await first.flow.submitReservation();
  assert.equal(first.flow.getState().phase, 'uncertain');
  assert.equal(await acquireMutation(), null);
  await first.flow.resolveSubmission();
  const lease = await acquireMutation(); assert.ok(lease); lease.release();
});

test('T114: resumen histórico pendiente, escapado y sin enlaces de gestión ni promesa de WhatsApp', async () => {
  const { flow } = setup((path) => path === 'intentos' ? { id: marker.clave, apartadoId: 8, estado: 'preparado' } : { ...result, nombreServicio: '<script>histórico</script>' });
  await form(flow); await flow.submitReservation(); const html = renderBooking(flow.getState());
  assert.match(html, /Pendiente/); assert.match(html, /P-123456789012345678/); assert.match(html, /450.00/);
  assert.match(html, /America\/Mazatlan/); assert.match(html, /10:00/); assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|href=|WhatsApp|999.00|confirmada/i);
});

test('T114: resultado incompleto nunca muestra éxito ni borra marcador', async () => {
  for (const bad of [{ estado: 'confirmada' }, { zonaHoraria: 'ZonaInexistente' }, { costoAceptado: null }, { inicioUtc: '2026-10-20T17:00:00' }, { finUtc: '2026-10-20T16:00:00Z' }]) {
    const { flow, store } = setup((path) => path === 'intentos' ? { id: marker.clave, apartadoId: 8, estado: 'preparado' } : { ...result, ...bad });
    await form(flow); await flow.submitReservation();
    assert.equal(flow.getState().phase, 'uncertain'); assert.deepEqual(store.read().marker, marker);
  }
});

test('T113: una lectura de apartado iniciada antes del envío no invalida el resultado posterior', async () => {
  const delayedOwn = deferred(), gate = deferred(); let delayed = false, sending = false;
  const base = setup(null, { ownResponse: () => delayed ? delayedOwn.promise : { apartadoId: 8, generacion: '1', estado: 'vigente', expiraEn: '2026-10-20T16:05:00Z', servidorAhora: '2026-10-20T16:00:00Z' },
    acquireMutation: async () => sending ? gate.promise : { release() {} } });
  await form(base.flow); sending = true;
  const send = base.flow.submitReservation(); delayed = true;
  const check = base.flow.recheck();
  gate.resolve({ release() {} }); await send;
  delayedOwn.resolve({ apartadoId: 8, generacion: '1', estado: 'sustituido', expiraEn: '2026-10-20T16:05:00Z', servidorAhora: '2026-10-20T16:00:00Z' }); await check;
  assert.equal(base.flow.getState().phase, 'result'); assert.equal(base.flow.getState().result.folio, result.folio);
});
