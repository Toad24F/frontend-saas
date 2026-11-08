import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortalSelection } from '../src/connected/public/selection.js';
import { renderSelection } from '../src/connected/public/selection-view.js';
import { createPortalBooking } from '../src/connected/public/booking.js';
import { renderBooking } from '../src/connected/public/booking-view.js';
import { readReservationResult } from '../src/connected/public/submission.js';
import { memoryStorage } from './fixtures/memory-storage.js';

const slug = 'centro';
const start = '2026-10-20T17:00:00.000Z';
const zone = 'America/Mazatlan';
const service = (costo) => ({ id: 1, nombre: 'Consulta', duracionMinutos: 30,
  ...(costo === undefined ? {} : { costo }) });
const catalog = (query, costo) => ({ negocio: { slug, nombre: 'Centro' },
  servicios: [service(costo)],
  sucursales: query.servicioId ? [{ id: 2, nombre: 'Sucursal', direccion: 'Calle 1', zonaHoraria: zone }] : [],
  profesionales: query.sucursalId ? [{ id: 3, nombre: 'Ana' }] : [] });
const result = (costo) => ({ folio: 'P-123456789012345678', estado: 'pendiente',
  inicioUtc: start, finUtc: '2026-10-20T17:30:00.000Z', zonaHoraria: zone,
  nombreNegocio: 'Centro histórico', nombreServicio: 'Consulta histórica',
  nombreSucursal: 'Sucursal histórica', nombreProfesional: 'Ana histórica',
  ...(costo === undefined ? {} : { costo }) });

// Los dobles reproducen la proyección HTTP: el importe puede existir o faltar,
// pero el navegador nunca recibe costoAceptado como campo público.
const samePrice = Symbol('mismo precio');
const hiddenPrice = Symbol('precio oculto');
function booking(catalogPrice, holdPrice, ownPrice = samePrice) {
  const currentPrice = ownPrice === samePrice ? holdPrice : ownPrice === hiddenPrice ? undefined : ownPrice;
  const calls = [];
  const client = { async request(path, options = {}) {
    calls.push(path);
    if (path === 'catalogo') return catalog(options.query, catalogPrice);
    if (path === 'disponibilidad') return { ...options.query, modalidad: 'publica', zonaHoraria: zone,
      ranuras: [{ inicioUtc: start, finUtc: '2026-10-20T17:30:00.000Z' }] };
    if (path === 'apartados') return { estado: 'concedida', apartadoId: 8, generacion: '1',
      expiraEn: '2026-10-20T16:05:00.000Z', servidorAhora: '2026-10-20T16:00:00.000Z', zonaHoraria: zone,
      ...(holdPrice === undefined ? {} : { costo: holdPrice }) };
    return { apartadoId: 8, generacion: '1', estado: 'vigente',
      expiraEn: '2026-10-20T16:05:00.000Z', servidorAhora: '2026-10-20T16:00:00.000Z',
      ...(currentPrice === undefined ? {} : { costo: currentPrice }) };
  } };
  const flow = createPortalBooking(client, { slug, now: () => new Date('2026-10-20T16:00:00Z'),
    monotonicNow: () => 0, operationKey: () => 'operation_test_000001', storage: memoryStorage() });
  return { flow, calls };
}
async function toForm(flow) {
  await flow.start(); flow.choose('servicioId', 1); await flow.next();
  flow.choose('sucursalId', 2); await flow.next(); flow.choose('personalId', 3);
  await flow.next(); flow.chooseSlot(start); await flow.reserveSelected();
}

test('FALA-T008–T009: catálogo sin precio es válido y selección no muestra importe inventado', async () => {
  const client = { request: async (_path, { query }) => catalog(query, undefined) };
  const flow = createPortalSelection(client, { slug });
  await flow.start();
  assert.equal(flow.getState().query.status, 'ready');
  const html = renderSelection(flow.getState());
  assert.match(html, /30 min/);
  assert.doesNotMatch(html, /NaN|MXN|\$0/);
  const zero = createPortalSelection({ request: async (_path, { query }) => catalog(query, '0.00') }, { slug });
  await zero.start();
  assert.match(renderSelection(zero.getState()), /\$0\.00/);
  // Un campo presente pero vacío no equivale a una omisión autorizada.
  for (const invalid of ['', null]) {
    const malformed = createPortalSelection({ request: async (_path, { query }) => catalog(query, invalid) }, { slug });
    await malformed.start();
    assert.equal(malformed.getState().query.status, 'error');
  }
});

test('FALA-T010: apartado oculto no reutiliza precio del catálogo y lectura propia retira precio previo', async () => {
  const hidden = booking('900.00', undefined);
  await toForm(hidden.flow);
  assert.equal(hidden.flow.getState().phase, 'form');
  assert.doesNotMatch(renderBooking(hidden.flow.getState()), /900\.00|MXN|Costo|Pago directamente/);
  const switched = booking('900.00', '450.00', hiddenPrice);
  await toForm(switched.flow);
  assert.doesNotMatch(renderBooking(switched.flow.getState()), /450\.00|900\.00|MXN/);
});

test('FALA-T010: costo visible del apartado prevalece sobre cambio del catálogo', async () => {
  const { flow, calls } = booking('900.00', '450.00');
  await toForm(flow);
  const html = renderBooking(flow.getState());
  assert.match(html, /450\.00/);
  assert.doesNotMatch(html, /900\.00/);
  assert.equal(calls.filter((path) => path === 'catalogo').length, 3);
});

test('FALA-T011–T012: resultado histórico visible u oculto nunca usa el catálogo actual', () => {
  const visible = readReservationResult(result('450.00'));
  assert.equal(visible.costo, '450.00');
  const hidden = readReservationResult(result());
  assert.equal(Object.hasOwn(hidden, 'costo'), false);
  const state = { phase: 'result', selection: { servicioId: 1 },
    options: { servicios: [service('900.00')], sucursales: [], profesionales: [] }, result: hidden };
  const html = renderBooking(state);
  assert.match(html, /Centro histórico|Consulta histórica/);
  assert.doesNotMatch(html, /900\.00|450\.00|MXN|Costo|Pago directamente/);
  assert.throws(() => readReservationResult(result(null)));
});
