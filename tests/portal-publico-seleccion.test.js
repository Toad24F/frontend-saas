import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortalSelection, PORTAL_PHASES } from '../src/connected/public/selection.js';
import { localDate, localTime, validDate } from '../src/connected/public/dates.js';
import { renderSelection } from '../src/connected/public/selection-view.js';
import { renderBooking } from '../src/connected/public/booking-view.js';

// Dobles del contrato público real: nunca se consulta el panel ni una base de datos.
const slug = 'centro';

// Estos dobles ignoran AbortSignal a propósito: la revisión debe descartar
// respuestas tardías incluso si el transporte no coopera con la cancelación.
test('T116: éxito y fallo antiguos no pisan la disponibilidad más reciente', async () => {
  for (const fails of [false, true]) {
    let finish;
    let availabilityCalls = 0;
    const { controller } = setup((path, { query }) => {
      if (path === 'catalogo') return catalog(query);
      if (++availabilityCalls === 2) return new Promise((resolve, reject) => {
        finish = () => fails ? reject(Error('respuesta vieja')) : resolve(availability(query));
      });
      return availability(query, [{ inicioUtc: '2026-10-22T17:00:00.000Z', finUtc: '2026-10-22T17:30:00.000Z' }]);
    });
    await toDate(controller);
    const pending = controller.setDate('2026-10-21');
    await controller.setDate('2026-10-22');
    controller.chooseSlot('2026-10-22T17:00:00.000Z');
    const current = controller.getState();
    finish(); await pending;
    assert.deepEqual(controller.getState(), current);
  }
});

test('T116: cambiar cada dependencia limpia fecha y ranuras; snapshot no permite mutar el estado', async () => {
  for (const [key, id, backs] of [['servicioId', 4, 3], ['sucursalId', 5, 2], ['personalId', 6, 1]]) {
    const { controller } = setup((path, { query }) => path === 'disponibilidad' ? availability(query) : ({ ...catalog(query),
      sucursales: query.servicioId ? [branch, { ...branch, id: 5 }] : [],
      profesionales: query.sucursalId ? [professional, { ...professional, id: 6 }] : [],
    }));
    await toDate(controller); await controller.setDate('2026-10-20'); controller.chooseSlot('2026-10-20T17:00:00.000Z');
    for (let index = 0; index < backs; index++) await controller.back();
    controller.choose(key, id);
    const state = controller.getState();
    assert.equal(state.selection[key], id); assert.equal(state.selection.date, '');
    assert.equal(state.selection.slot, null); assert.deepEqual(state.slots, []);
    if (key === 'servicioId') assert.equal(state.selection.sucursalId, null);
    if (key !== 'personalId') assert.equal(state.selection.personalId, null);
    state.selection[key] = 999;
    assert.equal(controller.getState().selection[key], id);
  }
});
const service = { id: 1, nombre: 'Consulta', costo: '450.00', duracionMinutos: 30 };
const branch = { id: 2, nombre: 'Centro', direccion: 'Calle 1', zonaHoraria: 'America/Mazatlan' };
const professional = { id: 3, nombre: 'Ana' };
const catalog = (query = {}) => ({ negocio: { slug, nombre: 'Centro' },
  servicios: [service, { ...service, id: 4, nombre: 'Seguimiento' }],
  sucursales: query.servicioId ? [branch] : [], profesionales: query.sucursalId ? [professional] : [] });
const availability = (query, ranuras = [{ inicioUtc: '2026-10-20T17:00:00.000Z', finUtc: '2026-10-20T17:30:00.000Z' }]) => ({
  ...query, modalidad: 'publica', zonaHoraria: branch.zonaHoraria, calculadoEn: '2026-10-20T14:00:00Z', ranuras, omisiones: [],
});
function setup(handler) {
  const calls = [];
  const client = { async request(path, options) {
    calls.push({ path, ...options });
    return handler ? handler(path, options) : path === 'catalogo' ? catalog(options.query) : availability(options.query);
  } };
  const controller = createPortalSelection(client, { slug, now: () => new Date('2026-10-20T01:00:00Z') });
  return { controller, calls };
}
async function toDate(controller) {
  await controller.start(); controller.choose('servicioId', 1); await controller.next();
  controller.choose('sucursalId', 2); await controller.next(); controller.choose('personalId', 3); await controller.next();
}

test('el portal presenta campos públicos opcionales sin convertirlos en reservas', async () => {
  const { controller } = setup((_path, { query }) => ({ ...catalog(query),
    negocio: { slug, nombre: 'Centro', categoria: 'Salud' },
    servicios: [{ ...service, descripcion: '<consulta>' }],
    sucursales: query.servicioId ? [{ ...branch, telefono: '6140000000', indicaciones: 'Entrada norte' }] : [],
    profesionales: query.sucursalId ? [{ ...professional, especialidad: 'Medicina' }] : [],
  }));
  await controller.start();
  assert.equal(controller.getState().negocio.categoria, 'Salud');
  const first = renderBooking(controller.getState());
  assert.match(first, /public-booking-columns/);
  assert.match(first, /&lt;consulta&gt;/);
  assert.doesNotMatch(first, /<consulta>/);
  controller.choose('servicioId', 1); await controller.next();
  assert.match(renderBooking(controller.getState()), /Entrada norte/);
  assert.match(renderBooking(controller.getState()), /6140000000/);
  controller.choose('sucursalId', 2); await controller.next();
  assert.match(renderBooking(controller.getState()), /Medicina/);
});

test('T101: define fases separadas y bloquea avances sin selección válida', async () => {
  const { controller } = setup();
  assert.deepEqual(PORTAL_PHASES, ['selection', 'hold', 'form', 'sending', 'uncertain', 'result']);
  await controller.start();
  assert.equal(controller.getState().phase, 'selection');
  await controller.next();
  assert.equal(controller.getState().step, 0);
  assert.throws(() => controller.choose('servicioId', 999), /selección/i);
  assert.throws(() => controller.choose('personalId', 3), /selección/i);
});

test('T102: pasos consultan únicamente opciones públicas compatibles y permiten volver', async () => {
  const { controller, calls } = setup();
  await toDate(controller);
  assert.deepEqual(calls.slice(0, 3).map((call) => call.query), [{}, { servicioId: 1 }, { servicioId: 1, sucursalId: 2 }]);
  assert.equal(calls[3].path, 'disponibilidad');
  assert.equal(calls[3].query.desde, '2026-10-19'); // Fecha de la sucursal, no la UTC.
  await controller.back();
  assert.equal(controller.getState().step, 2);
  assert.equal(controller.getState().selection.personalId, 3);
});

test('T101: cambiar servicio invalida sucursal, profesional, fecha y horario', async () => {
  const { controller } = setup();
  await toDate(controller);
  await controller.setDate('2026-10-20');
  controller.chooseSlot('2026-10-20T17:00:00.000Z');
  await controller.back(); await controller.back(); await controller.back();
  controller.choose('servicioId', 4);
  const state = controller.getState();
  assert.deepEqual(state.selection, { servicioId: 4, sucursalId: null, personalId: null, date: '', slot: null });
  assert.equal(state.slots.length, 0);
  assert.equal(state.hold, null);
  assert.equal(state.result, null);
});

test('T101: una respuesta antigua de catálogo no sobrescribe el paso vigente', async () => {
  let finish;
  const { controller } = setup((path, { query }) => query.servicioId === 1
    ? new Promise((resolve) => { finish = () => resolve(catalog(query)); }) : catalog(query));
  await controller.start(); controller.choose('servicioId', 1);
  const pending = controller.next();
  await controller.back(); controller.choose('servicioId', 4);
  finish(); await pending;
  assert.equal(controller.getState().step, 0);
  assert.equal(controller.getState().selection.servicioId, 4);
  assert.deepEqual(controller.getState().options.sucursales, []);
});

test('T103: fecha real y consulta de hasta 31 fechas inclusivas', async () => {
  const { controller, calls } = setup(); await toDate(controller);
  await controller.setDate('2026-10-20');
  assert.deepEqual(calls.at(-1).query, { servicioId: 1, sucursalId: 2, personalId: 3, desde: '2026-10-19', hasta: '2026-11-18' });
  const count = calls.length;
  for (const date of ['', '2026-02-30', '20/10/2026']) {
    await controller.setDate(date);
    assert.equal(controller.getState().query.status, 'invalid');
  }
  assert.equal(calls.length, count);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
});

test('la tira oculta días vacíos, conserva el elegido en segunda posición y avanza tres días', async () => {
  const days = ['2026-10-20', '2026-10-22', '2026-10-25', '2026-10-28', '2026-11-22'];
  const { controller, calls } = setup((path, { query }) => path === 'catalogo' ? catalog(query) : availability(query,
    days.filter((day) => day >= query.desde && day <= query.hasta)
      .map((day) => ({ inicioUtc: `${day}T17:00:00.000Z`, finUtc: `${day}T17:30:00.000Z` }))));
  await toDate(controller);
  let html = renderSelection(controller.getState());
  assert.match(html, /data-selection-date="2026-10-20"/);
  assert.doesNotMatch(html, /data-selection-date="2026-10-21"/);
  await controller.setDate('2026-10-22');
  html = renderSelection(controller.getState());
  const visible = [...html.matchAll(/data-selection-date="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(visible.slice(0, 3), ['2026-10-20', '2026-10-22', '2026-10-25']);
  await controller.shiftDate(3);
  assert.equal(controller.getState().selection.date, '2026-10-25');
  await controller.shiftDate(-3);
  assert.equal(controller.getState().selection.date, '2026-10-22');
  await controller.setDate('2026-11-21');
  assert.equal(controller.getState().query.status, 'empty');
  assert.deepEqual(controller.getState().availableDates, ['2026-11-22']);
  assert.equal(calls.at(-1).query.hasta, '2026-12-11');
});

test('al consultar otra fecha la tira sigue visible y el horario se presenta sin radio visible ni aviso duplicado', async () => {
  let resolveAvailability;
  let availabilityCalls = 0;
  const { controller } = setup((path, { query }) => {
    if (path === 'catalogo') return catalog(query);
    if (++availabilityCalls === 2) return new Promise((resolve) => { resolveAvailability = () => resolve(availability(query, [
      { inicioUtc: '2026-10-22T17:00:00.000Z', finUtc: '2026-10-22T17:30:00.000Z' },
    ])); });
    return availability(query, [
      { inicioUtc: '2026-10-20T17:00:00.000Z', finUtc: '2026-10-20T17:30:00.000Z' },
      { inicioUtc: '2026-10-22T17:00:00.000Z', finUtc: '2026-10-22T17:30:00.000Z' },
    ]);
  });
  await toDate(controller);
  const pending = controller.setDate('2026-10-22');
  assert.equal(controller.getState().query.status, 'loading');
  assert.deepEqual(controller.getState().availableDates, ['2026-10-20', '2026-10-22']);
  assert.match(renderSelection(controller.getState()), /data-selection-date="2026-10-22"/);
  resolveAvailability(); await pending;
  controller.chooseSlot('2026-10-22T17:00:00.000Z');
  const html = renderSelection(controller.getState());
  assert.match(html, /Horarios disponibles para jueves, 22 de octubre de 2026/);
  assert.match(html, /Horario seleccionado: 10:00 · America\/Mazatlan/);
  assert.doesNotMatch(html, /Aún no está apartado/);
});

test('T103: solo horarios devueltos, en zona de sucursal, sin conceder apartado', async () => {
  const { controller, calls } = setup(); await toDate(controller); await controller.setDate('2026-10-20');
  assert.equal(controller.getState().slots[0].horaInicio, '10:00');
  controller.chooseSlot('2026-10-20T17:00:00.000Z');
  assert.equal(controller.getState().selection.slot.horaInicio, '10:00');
  assert.throws(() => controller.chooseSlot('2026-10-20T18:00:00Z'), /horario/i);
  await controller.next();
  assert.equal(controller.getState().step, 3);
  assert.equal(controller.getState().phase, 'selection');
  assert.ok(calls.every((call) => call.path === 'catalogo' || call.path === 'disponibilidad'));
});

test('T103: vacío, selección inválida y fallo técnico tienen estados diferentes y reintento', async () => {
  let mode = 'empty';
  const { controller } = setup((path, { query }) => {
    if (path === 'catalogo') return catalog(query);
    if (mode === 'error') throw Object.assign(new Error('Temporalmente no disponible'), { status: 503 });
    if (mode === 'invalid') throw Object.assign(new Error('Selección no disponible'), { status: 404 });
    return availability(query, []);
  });
  await toDate(controller); assert.equal(controller.getState().query.status, 'empty');
  mode = 'invalid'; await controller.retry(); assert.equal(controller.getState().query.status, 'invalid');
  mode = 'error'; await controller.retry(); assert.equal(controller.getState().query.status, 'error');
  mode = 'empty'; await controller.retry(); assert.equal(controller.getState().query.status, 'empty');
});

test('T101–T103: respuestas de disponibilidad desordenadas y errores antiguos se descartan', async () => {
  let finish;
  let availabilityCalls = 0;
  const { controller } = setup((path, { query }) => {
    if (path === 'catalogo') return catalog(query);
    if (++availabilityCalls === 2) return new Promise((_resolve, reject) => { finish = () => reject(Error('viejo')); });
    return availability(query, []);
  });
  await toDate(controller);
  const pending = controller.setDate('2026-10-21');
  await controller.setDate('2026-10-22');
  finish(); await pending;
  assert.equal(controller.getState().selection.date, '2026-10-22');
  assert.equal(controller.getState().query.status, 'empty');
});

test('T103: respuesta malformada o de otra selección es error, nunca agenda vacía', async () => {
  let result;
  const { controller } = setup((path, { query }) => path === 'catalogo' ? catalog(query) : result ?? availability(query, []));
  await toDate(controller);
  for (const data of [{}, { ...availability({}), ranuras: null }, availability({ servicioId: 999 }),
    availability({ servicioId: 1, sucursalId: 2, personalId: 3, desde: '2026-10-20', hasta: '2026-10-20' }, [{ inicioUtc: 'incorrecto', finUtc: 'incorrecto' }])]) {
    result = data; await controller.setDate('2026-10-20');
    assert.equal(controller.getState().query.status, 'error');
    assert.deepEqual(controller.getState().slots, []);
  }
});

test('T102: al refrescar oferta desaparecida se invalida la selección anterior', async () => {
  let missing = false;
  const { controller } = setup((_path, { query }) => ({ ...catalog(query), servicios: missing ? [] : catalog(query).servicios }));
  await controller.start(); controller.choose('servicioId', 1);
  missing = true; await controller.retry();
  assert.equal(controller.getState().selection.servicioId, null);
  assert.equal(controller.getState().query.status, 'empty');
});

test('T103: conversión local respeta fecha distinta de UTC y cambios de horario IANA', () => {
  assert.equal(localDate('2026-10-20T01:00:00Z', 'America/Mazatlan'), '2026-10-19');
  assert.equal(localTime('2026-07-01T15:00:00Z', 'America/New_York'), '11:00');
  assert.equal(localTime('2026-12-01T15:00:00Z', 'America/New_York'), '10:00');
});

test('T102–T103: HTML etiquetado, opciones escapadas y horario sin promesa de reserva', async () => {
  const { controller } = setup((_path, { query }) => ({ ...catalog(query), servicios: [{ ...service, nombre: '<script>alert(1)</script>' }] }));
  await controller.start();
  const html = renderSelection(controller.getState());
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<fieldset/); assert.match(html, /<legend/); assert.match(html, /type="radio"/);
  assert.match(html, /aria-current="step"/); assert.match(html, /id="selection-title"[^>]*tabindex="-1"/);
});

test('T101: cambiar sucursal y profesional invalida solo las selecciones posteriores', async () => {
  const { controller } = setup((_path, { query }) => ({ ...catalog(query),
    sucursales: query.servicioId ? [branch, { ...branch, id: 5, nombre: 'Norte' }] : [],
    profesionales: query.sucursalId ? [professional, { id: 6, nombre: 'Luis' }] : [],
  }));
  await controller.start(); controller.choose('servicioId', 1); await controller.next();
  controller.choose('sucursalId', 2); await controller.next(); controller.choose('personalId', 3);
  controller.choose('personalId', 6);
  assert.equal(controller.getState().selection.servicioId, 1);
  assert.equal(controller.getState().selection.sucursalId, 2);
  assert.equal(controller.getState().selection.date, '');
  await controller.back(); controller.choose('sucursalId', 5);
  assert.equal(controller.getState().selection.personalId, null);
  assert.equal(controller.getState().selection.servicioId, 1);
});

test('T101: una disponibilidad tardía no reaparece después de volver', async () => {
  let finish;
  let availabilityCalls = 0;
  const { controller } = setup((path, { query }) => path === 'catalogo' ? catalog(query)
    : ++availabilityCalls === 2 ? new Promise((resolve) => { finish = () => resolve(availability(query, [])); }) : availability(query, []));
  await toDate(controller);
  const pending = controller.setDate('2026-10-21');
  await controller.back(); finish(); await pending;
  assert.equal(controller.getState().step, 2);
  assert.equal(controller.getState().query.status, 'ready');
  assert.deepEqual(controller.getState().slots, []);
});

test('T102: un catálogo fallido no presenta las opciones anteriores como resultado', async () => {
  let fail = false;
  const { controller } = setup((_path, { query }) => { if (fail) throw Error('Error interno'); return catalog(query); });
  await controller.start(); fail = true; await controller.retry();
  const html = renderSelection(controller.getState());
  assert.doesNotMatch(html, /<input type="radio"/);
  assert.match(html, /Reintentar consulta/);
  assert.doesNotMatch(html, /Error interno/);
});
