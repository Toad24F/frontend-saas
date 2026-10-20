import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortalBooking } from '../src/connected/public/booking.js';
import { validateContact } from '../src/connected/public/contact.js';
import { createHoldClock } from '../src/connected/public/hold-clock.js';
import { bindBookingLifecycle } from '../src/connected/public/booking-lifecycle.js';
import { renderBooking } from '../src/connected/public/booking-view.js';
import { createPublicClient } from '../src/connected/public/http.js';

const start = '2026-10-20T17:00:00.000Z';
const now = '2026-10-20T16:00:00.000Z';
const expires = '2026-10-20T16:05:00.000Z';
const granted = (id = 8, gen = '1') => ({ estado: 'concedida', apartadoId: id, generacion: gen,
  expiraEn: expires, servidorAhora: now, zonaHoraria: 'America/Mazatlan', costoAceptado: '450.00' });
const own = (id = 8, gen = '1', estado = 'vigente') => ({ apartadoId: id, generacion: gen, estado, expiraEn: expires, servidorAhora: now });
const contact = { nombre: '  María José  ', telefono: '+52 614-123-4567', notas: ' Consulta ' };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

// Fixtures del contrato, sin API real. Permiten controlar reloj, respuestas perdidas y carreras.
function setup(handler, extra = {}) {
  let mono = 0;
  const calls = [], messages = [];
  const channel = { postMessage: (data) => messages.push(data), close() {} };
  const client = { async request(path, options = {}) {
    calls.push({ path, ...options });
    if (path === 'catalogo') return { negocio: { slug: 'centro' },
      servicios: [{ id: 1, nombre: 'Consulta', costo: '450.00', duracionMinutos: 30 }],
      sucursales: options.query.servicioId ? [{ id: 2, nombre: 'Centro', direccion: 'Calle 1', zonaHoraria: 'America/Mazatlan' }] : [],
      profesionales: options.query.sucursalId ? [{ id: 3, nombre: 'Ana' }] : [] };
    if (path === 'disponibilidad') return { ...options.query, modalidad: 'publica', zonaHoraria: 'America/Mazatlan', ranuras: [{ inicioUtc: start, finUtc: '2026-10-20T17:30:00.000Z' }] };
    if (handler) return handler(path, options);
    if (path === 'apartados') return granted();
    if (path.endsWith('/liberar')) return null;
    return own();
  } };
  const flow = createPortalBooking(client, { slug: 'centro', now: () => new Date(now), monotonicNow: () => mono,
    operationKey: () => 'operation_test_0000001', channel, ...extra });
  return { flow, calls, messages, channel, setMono: (value) => { mono = value; } };
}
async function select(flow) {
  await flow.start(); flow.choose('servicioId', 1); await flow.next(); flow.choose('sucursalId', 2);
  await flow.next(); flow.choose('personalId', 3); await flow.next(); flow.chooseSlot(start);
}
async function form(flow) { await select(flow); await flow.reserveSelected(); }

test('T104: solo abre formulario después de concesión y consulta de vigencia; cuerpo exacto', async () => {
  const pending = deferred();
  const { flow, calls } = setup((path) => path === 'apartados' ? pending.promise : own());
  await select(flow); const request = flow.reserveSelected();
  assert.equal(flow.getState().phase, 'hold');
  assert.equal(flow.getState().hold, null);
  pending.resolve(granted()); await request;
  assert.equal(flow.getState().phase, 'form');
  assert.equal(flow.getState().holdStatus, 'active');
  assert.deepEqual(calls.find((call) => call.path === 'apartados').body, {
    clave: 'operation_test_0000001', personalId: 3, sucursalId: 2, servicioId: 1, fechaLocal: '2026-10-20', horaInicio: '10:00',
  });
  assert.equal(calls.filter((call) => call.path === 'apartados/8').length, 1);
});

test('T104: pérdida de respuesta repite la clave y el contenido; doble clic no duplica', async () => {
  const pending = deferred(); let first = true;
  const { flow, calls } = setup((path) => path === 'apartados' ? (first ? (first = false, pending.promise) : granted()) : own());
  await select(flow); const request = flow.reserveSelected(); await flow.reserveSelected();
  pending.reject(Error('red')); await request;
  assert.equal(flow.getState().phase, 'hold');
  await flow.reserveSelected();
  const writes = calls.filter((call) => call.path === 'apartados');
  assert.equal(writes.length, 2); assert.deepEqual(writes[0].body, writes[1].body);
  assert.equal(flow.getState().phase, 'form');
});

test('T104: conflicto refresca disponibilidad sin fabricar apartado ni formulario', async () => {
  const { flow } = setup(() => { throw Object.assign(Error('conflicto'), { status: 409 }); });
  await select(flow); await flow.reserveSelected();
  assert.equal(flow.getState().phase, 'selection'); assert.equal(flow.getState().hold, null);
  assert.equal(flow.getState().selection.slot, null); assert.match(flow.getState().notice, /horario/i);
});

test('T104: concesión repetida ya vencida o sustituida no abre formulario', async () => {
  for (const status of ['vencido', 'sustituido', 'liberado']) {
    const { flow } = setup((path) => path === 'apartados' ? granted() : own(8, '1', status));
    await select(flow); await flow.reserveSelected(); assert.equal(flow.getState().phase, 'selection');
  }
});

test('T105: normaliza como el servidor sin buscar teléfono ni truncar Unicode', () => {
  assert.deepEqual(validateContact(contact).value, { nombre: 'María José', telefono: '6141234567', notas: 'Consulta' });
  assert.equal(validateContact({ nombre: '😀'.repeat(150), telefono: '614 123 4567', notas: 'x'.repeat(2000) }).valid, true);
  assert.equal(validateContact({ nombre: ' Ana ', telefono: '6141234567', notas: ' ' }).value.notas, null);
  for (const [field, value] of [['nombre', ' '], ['nombre', '😀'.repeat(151)], ['telefono', '+1 6141234567'],
    ['telefono', '614abc4567'], ['telefono', '614123456'], ['notas', 'x'.repeat(2001)]]) {
    assert.ok(validateContact({ ...contact, [field]: value }).errors[field]);
  }
  assert.equal(validateContact({ ...contact, notas: ' '.repeat(33000) }).valid, false);
});

test('T105–T106: errores por campo y contacto solo en memoria, conservado al volver', async () => {
  const { flow, calls } = setup(); await form(flow);
  flow.updateContact('nombre', '<b>Ana</b>'); flow.updateContact('telefono', '123'); flow.updateContact('notas', 'Privado');
  assert.equal(flow.validateContact().valid, false); assert.ok(flow.getState().contactErrors.telefono);
  flow.updateContact('telefono', '+52 614-123-4567'); assert.equal(flow.validateContact().valid, true);
  await flow.returnToAvailability();
  assert.deepEqual(flow.getState().contact, { nombre: '<b>Ana</b>', telefono: '+52 614-123-4567', notas: 'Privado' });
  assert.ok(calls.every((call) => !JSON.stringify(call).includes('Privado')));
  assert.equal(setup().flow.getState().contact.nombre, '');
});

test('T107: cuenta con hora del servidor y reloj monótono; nunca prolonga el vencimiento', () => {
  let mono = 100;
  const clock = createHoldClock(() => mono);
  clock.start(expires, now, 0);
  assert.equal(clock.remaining(), 299900);
  mono = 10100; assert.equal(clock.remaining(), 289900);
  mono = 50; assert.equal(clock.remaining(), 289900); // Un reloj atrasado no recupera tiempo.
  mono = 10100;
  clock.sync(expires, now, mono); assert.equal(clock.remaining(), 289900);
  mono = 300000; assert.equal(clock.remaining(), 0);
});

test('T107: vence en el límite exacto y conserva formulario y texto', async () => {
  const { flow, setMono } = setup(); await form(flow); flow.updateContact('nombre', 'Ana');
  setMono(300000); flow.tick();
  assert.equal(flow.getState().holdStatus, 'expired'); assert.equal(flow.getState().remainingMs, 0);
  assert.equal(flow.getState().phase, 'form'); assert.equal(flow.getState().contact.nombre, 'Ana');
  assert.equal(flow.validateContact().valid, false);
});

test('T108: reenfocar bloquea hasta consultar estado propio y conserva datos ante sustitución', async () => {
  let response = own(); let delayed;
  const { flow } = setup((path) => path === 'apartados' ? granted() : delayed ? delayed.promise : response);
  await form(flow); flow.updateContact('nombre', 'Ana');
  delayed = deferred(); const check = flow.recheck();
  assert.equal(flow.getState().holdStatus, 'checking');
  delayed.resolve(own(8, '1', 'sustituido')); await check;
  assert.equal(flow.getState().holdStatus, 'lost'); assert.equal(flow.getState().contact.nombre, 'Ana');
});

test('T108: avisos sin datos privados, generación antigua ignorada y nueva verificada en servidor', async () => {
  const { flow, channel, calls, messages } = setup(); await form(flow);
  flow.updateContact('nombre', 'Confidencial');
  const count = calls.length;
  await flow.handleMessage({ type: 'changed', slug: 'centro', apartadoId: 7, generacion: '1' });
  await flow.handleMessage({ type: 'changed', slug: 'otro-negocio', apartadoId: 9, generacion: '2' });
  await flow.handleMessage({ type: 'changed', slug: 'centro', apartadoId: 9, generacion: 'inválida' });
  assert.equal(calls.length, count);
  await flow.handleMessage({ type: 'changed', slug: 'centro', apartadoId: 9, generacion: '2' });
  assert.equal(calls.at(-1).path, 'apartados/8');
  assert.equal(flow.getState().holdStatus, 'active'); // Aviso no es autoridad.
  assert.ok(messages.some((message) => message.type === 'changed'));
  assert.ok(!JSON.stringify(messages).includes('Confidencial'));
  assert.equal(typeof channel.onmessage, 'function');
});

test('T108: fallo de consulta o identidad distinta bloquea uso, sin falso vencimiento', async () => {
  let fail = false;
  const { flow } = setup((path) => path === 'apartados' ? granted() : fail ? Promise.reject(Error('red')) : own());
  await form(flow); fail = true; await flow.recheck(); assert.equal(flow.getState().holdStatus, 'unverified');
  fail = false; await flow.recheck(); assert.equal(flow.getState().holdStatus, 'active');
});

test('T109: volver confirma liberación del ID/generación antes de abrir disponibilidad', async () => {
  const pending = deferred();
  const { flow, calls } = setup((path) => path === 'apartados' ? granted() : path.endsWith('/liberar') ? pending.promise : own());
  await form(flow); const back = flow.returnToAvailability();
  assert.equal(flow.getState().phase, 'form'); assert.equal(flow.getState().holdStatus, 'releasing');
  assert.deepEqual(calls.at(-1).body, { generacion: '1' });
  assert.equal(calls.at(-1).path, 'apartados/8/liberar');
  pending.resolve(null); await back; assert.equal(flow.getState().phase, 'selection');
});

test('T109: liberar con respuesta perdida permite repetir sin perder la referencia propia', async () => {
  let fail = true;
  const { flow, calls } = setup((path) => path === 'apartados' ? granted() : path.endsWith('/liberar')
    ? fail ? Promise.reject(Error('red')) : null : own());
  await form(flow); await flow.returnToAvailability();
  assert.equal(flow.getState().holdStatus, 'release-error'); assert.equal(flow.getState().hold.apartadoId, 8);
  fail = false; await flow.returnToAvailability();
  assert.equal(calls.filter((call) => call.path.endsWith('/liberar')).length, 2);
  assert.equal(flow.getState().phase, 'selection');
});

test('T109: salida usa keepalive una vez, borra contacto y libera concesión recibida tarde', async () => {
  const { flow, calls } = setup(); await form(flow); flow.updateContact('nombre', 'Privado');
  flow.exit(); flow.exit(); await Promise.resolve();
  const releases = calls.filter((call) => call.path.endsWith('/liberar'));
  assert.equal(releases.length, 1); assert.equal(releases[0].keepalive, true);
  assert.equal(flow.getState().contact.nombre, '');
  const pending = deferred();
  const late = setup((path) => path === 'apartados' ? pending.promise : null);
  await select(late.flow); const request = late.flow.reserveSelected(); late.flow.exit();
  pending.resolve(granted()); await request;
  assert.equal(late.calls.at(-1).path, 'apartados/8/liberar');
  assert.equal(late.calls.at(-1).keepalive, true);
});

test('T108–T109: una consulta atrasada no devuelve al formulario después de liberar', async () => {
  let delayed;
  const { flow } = setup((path) => path === 'apartados' ? granted() : path.endsWith('/liberar') ? null : delayed ? delayed.promise : own());
  await form(flow); delayed = deferred(); const check = flow.recheck();
  await flow.returnToAvailability(); delayed.resolve(own()); await check;
  assert.equal(flow.getState().phase, 'selection'); assert.equal(flow.getState().hold, null);
});

test('T109: cliente HTTP permite keepalive de liberación con cookie y CSRF', async () => {
  const calls = [];
  const client = createPublicClient('centro', { fetchImpl: async (_url, options) => {
    calls.push(options); return options.keepalive ? new Response(null, { status: 204 }) : Response.json({ negocio: { slug: 'centro', nombre: 'Centro' }, csrfToken: 'a'.repeat(64) });
  } });
  await client.initializeVerifiedSession();
  await client.request('apartados/8/liberar', { method: 'POST', body: { generacion: '1' }, keepalive: true });
  assert.equal(calls.at(-1).keepalive, true); assert.equal(calls.at(-1).headers['X-CSRF-Token'], 'a'.repeat(64));
  assert.equal(calls.at(-1).credentials, 'same-origin');
});

test('T105–T107: formulario escapado, errores accesibles y envío aún deshabilitado', async () => {
  const { flow } = setup(); await form(flow); flow.updateContact('nombre', '<script>x</script>');
  flow.validateContact(); const html = renderBooking(flow.getState());
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /autocomplete="off"/); assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Reservar[^<]*<\/button>/); assert.match(html, /disabled[^>]*>Reservar/);
});

test('T108–T109: eventos de foco, visibilidad y salida se conectan y limpian', async () => {
  const win = new EventTarget(); const doc = new EventTarget(); doc.visibilityState = 'visible';
  let checks = 0, exits = 0, blocked = 0, ticks = 0;
  const cleanup = bindBookingLifecycle({ recheck: async () => { checks++; }, markUnverified() { blocked++; }, exit() { exits++; }, tick() { ticks++; } },
    { window: win, document: doc, setInterval: (callback) => { callback(); return 1; }, clearInterval() {} });
  win.dispatchEvent(new Event('focus')); doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
  win.dispatchEvent(new Event('pagehide')); assert.equal(checks, 1); assert.equal(blocked, 1); assert.equal(exits, 1); assert.equal(ticks, 1);
  cleanup(); win.dispatchEvent(new Event('focus')); assert.equal(checks, 1);
});

test('T107: reintentar tras fallo de verificación no reinicia el presupuesto original', async () => {
  let first = true;
  const { flow, setMono } = setup((path) => path === 'apartados' ? granted() : first ? (first = false, Promise.reject(Error('red'))) : own());
  await select(flow); await flow.reserveSelected();
  setMono(10000); await flow.reserveSelected();
  assert.equal(flow.getState().phase, 'form'); assert.equal(flow.getState().remainingMs, 290000);
});

test('T108: respuesta propia con ID, generación o vencimiento diferentes bloquea sin prolongar', async () => {
  let value = own();
  const { flow } = setup((path) => path === 'apartados' ? granted() : value);
  await form(flow);
  for (const data of [own(9), own(8, '2'), { ...own(), expiraEn: '2026-10-20T16:10:00Z' }]) {
    value = data; await flow.recheck(); assert.equal(flow.getState().holdStatus, 'unverified');
  }
});

test('T106: vencimiento y sustitución conservan los datos al obtener otro apartado', async () => {
  let gen = '1';
  const { flow, setMono } = setup((path) => path === 'apartados' ? granted(8, gen) : path.endsWith('/liberar') ? null : own(8, gen));
  await form(flow); flow.updateContact('nombre', 'Ana'); flow.updateContact('notas', 'Recordar');
  setMono(300000); flow.tick(); await flow.returnToAvailability();
  setMono(300001); gen = '2'; flow.chooseSlot(start); await flow.reserveSelected();
  assert.equal(flow.getState().phase, 'form'); assert.equal(flow.getState().contact.nombre, 'Ana');
  assert.equal(flow.getState().contact.notas, 'Recordar');
});

test('T108: temporizadores del navegador conservan el receptor window', () => {
  const win = new EventTarget(), doc = new EventTarget();
  const cleanup = bindBookingLifecycle({ tick() {} }, { window: win, document: doc,
    setInterval() { assert.equal(this, win); return 1; }, clearInterval() { assert.equal(this, win); } });
  cleanup();
});

test('T108: un reemplazo fallido también avisa para consultar el apartado anterior', async () => {
  const { flow, messages } = setup(() => { throw Object.assign(Error('conflicto'), { status: 409 }); });
  await select(flow); await flow.reserveSelected();
  assert.deepEqual(messages.at(-1), { type: 'refresh', slug: 'centro' });
});

test('T109: BFCache recarga y limpia los valores cacheados de los campos', () => {
  const win = new EventTarget(), doc = new EventTarget();
  const input = { value: 'Privado', defaultValue: 'Privado' };
  doc.querySelectorAll = () => [input];
  let reloads = 0; win.location = { reload() { reloads++; } };
  const cleanup = bindBookingLifecycle({ exit() {}, tick() {} }, { window: win, document: doc, setInterval: () => 1, clearInterval() {} });
  win.dispatchEvent(new Event('pagehide'));
  const show = new Event('pageshow'); Object.defineProperty(show, 'persisted', { value: true });
  win.dispatchEvent(show);
  assert.equal(input.value, ''); assert.equal(input.defaultValue, ''); assert.equal(reloads, 1);
  cleanup();
});
