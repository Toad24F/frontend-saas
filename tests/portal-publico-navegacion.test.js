import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortalSelection } from '../src/connected/public/selection.js';
import { renderSelection } from '../src/connected/public/selection-view.js';
import { optionPage, optionToolbar, optionPagination, browseDefaults, periodSlots } from '../src/shared/public/options.js';

const service = { id: 1, nombre: 'Consulta', duracionMinutos: 30 };
const branch = { id: 2, nombre: 'Centro', direccion: 'Calle 1', zonaHoraria: 'America/Mazatlan' };
const professional = { id: 3, nombre: 'Ana', especialidad: 'Medicina' };
function setup({ branches = 1, people = 1, slots = [], handler } = {}) {
  const calls = [];
  const catalog = (query) => ({ negocio: { slug: 'qa', nombre: 'QA' }, servicios: [service], sucursales: query.servicioId ? Array.from({ length: branches }, (_, i) => ({ ...branch, id: i + 2 })) : [], profesionales: query.sucursalId ? Array.from({ length: people }, (_, i) => ({ ...professional, id: i + 3 })) : [] });
  const flow = createPortalSelection({ async request(path, { query }) {
    calls.push({ path, query });
    if (handler) return handler(path, query, catalog);
    return path === 'catalogo' ? catalog(query) : { ...query, modalidad: 'publica', zonaHoraria: branch.zonaHoraria, ranuras: slots };
  } }, { slug: 'qa', now: () => new Date('2026-11-07T16:00:00Z') });
  return { flow, calls };
}

test('portal: salta únicas opciones independientemente y vuelve a la última elección real', async () => {
  for (const [branches, people, expected] of [[1, 1, 3], [1, 2, 2], [2, 1, 1], [0, 1, 1]]) {
    const { flow, calls } = setup({ branches, people });
    await flow.start(); assert.equal(flow.getState().step, 0); // Servicio explícito incluso único.
    flow.choose('servicioId', 1); await flow.next();
    assert.equal(flow.getState().step, expected);
    if (expected === 3) {
      assert.deepEqual(flow.getState().automaticSteps, [1, 2]);
      assert.equal(flow.getState().query.status, 'empty');
      await flow.back(); assert.equal(flow.getState().step, 0);
      assert.ok(calls.every(({ path }) => ['catalogo', 'disponibilidad'].includes(path)));
    }
    if (!branches) assert.equal(flow.getState().selection.sucursalId, null);
  }
});

test('portal: múltiples sucursales y un profesional saltan solo el profesional', async () => {
  const { flow } = setup({ branches: 2 }); await flow.start(); flow.choose('servicioId', 1); await flow.next();
  flow.choose('sucursalId', 2); await flow.next(); assert.equal(flow.getState().step, 3);
  await flow.back(); assert.equal(flow.getState().step, 1);
  flow.choose('sucursalId', 3); assert.equal(flow.getState().selection.personalId, null);
  assert.deepEqual(flow.getState().automaticSteps, []);
});

test('portal: una respuesta automática tardía no avanza después de volver', async () => {
  let finish;
  const { flow } = setup({ handler: (path, query, catalog) => query.servicioId ? new Promise((resolve) => { finish = () => resolve(catalog(query)); }) : catalog(query) });
  await flow.start(); flow.choose('servicioId', 1); const next = flow.next();
  assert.match(renderSelection(flow.getState()), /public-skeleton/);
  await flow.back(); finish(); await next;
  assert.equal(flow.getState().step, 0); assert.equal(flow.getState().selection.sucursalId, null);
});

test('portal: paginación de seis, búsqueda normalizada y filtros sin alterar colección', () => {
  const rows = Array.from({ length: 13 }, (_, i) => ({ ...service, id: i + 1, nombre: `Revisión ${i}`, duracionMinutos: i < 6 ? 20 : 90 }));
  const before = structuredClone(rows);
  for (const total of [0, 1, 6, 7, 13]) {
    const result = optionPage(rows.slice(0, total), 0);
    assert.equal(result.rows.length, Math.min(total, 6));
    assert.equal(optionPagination(result).includes('<nav'), total > 6);
  }
  assert.equal(optionPage(rows, 0, { search: 'revision', filter: 'short', page: 8 }).page, 1);
  assert.equal(optionPage(rows, 0, { search: 'revision', filter: 'short', page: 1 }).total, 6);
  assert.equal(optionPage(rows, 0, { ...browseDefaults(), page: 3 }).rows.length, 1);
  assert.equal(optionPage(rows.slice(0, 12), 0, { ...browseDefaults(), page: 3 }).page, 2);
  assert.equal(optionPage([professional], 2, { search: 'MEDICINA', filter: 'Medicina', page: 1 }).total, 1);
  assert.deepEqual(rows, before);
  assert.doesNotMatch(optionToolbar(rows, 0), /data-public-clear >/);
});

test('portal: filtros no consultan API ni disparan salto al dejar una opción', async () => {
  const { flow, calls } = setup({ branches: 7 }); await flow.start(); flow.choose('servicioId', 1); await flow.next();
  const count = calls.length;
  flow.setBrowse('page', 2); assert.equal(flow.getState().browse[1].page, 2);
  flow.choose('sucursalId', 8);
  flow.setBrowse('search', 'no existe'); assert.equal(flow.getState().browse[1].page, 1);
  assert.equal(flow.getState().selection.sucursalId, 8); assert.match(renderSelection(flow.getState()), /No encontramos coincidencias/);
  flow.setBrowse('clear'); assert.equal(flow.getState().step, 1); assert.equal(calls.length, count);
});

test('portal: día vacío tiene texto común, siguiente día solo si conocido y fallo nunca parece vacío', async () => {
  for (const slots of [[], [{ inicioUtc: '2026-11-08T17:00:00Z', finUtc: '2026-11-08T17:30:00Z' }]]) {
    const { flow } = setup({ slots }); await flow.start(); flow.choose('servicioId', 1); await flow.next();
    const html = renderSelection({ ...flow.getState(), bookingAvailable: true });
    assert.match(html, /No hay horarios disponibles para esta fecha/);
    assert.equal(html.includes('Ver siguiente día disponible'), Boolean(slots.length));
    assert.match(html, /data-selection-next disabled/);
    const error = renderSelection({ ...flow.getState(), query: { status: 'error', message: 'No pudimos consultar los horarios.' } });
    assert.doesNotMatch(error, /No hay horarios disponibles para esta fecha/); assert.match(error, /Reintentar consulta/);
  }
});

test('portal: partes del día separan al mediodía y skeleton no crea opciones interactivas', () => {
  const slots = [{ horaInicio: '11:55' }, { horaInicio: '12:00' }];
  assert.equal(periodSlots(slots, 'morning').length, 1); assert.equal(periodSlots(slots, 'afternoon')[0].horaInicio, '12:00');
  const html = renderSelection({ step: 0, selection: {}, options: { servicios: [service] }, query: { status: 'loading', message: 'Consultando opciones disponibles…' } });
  assert.match(html, /aria-busy="true"/); assert.match(html, /public-skeleton[^>]*aria-hidden="true"/); assert.doesNotMatch(html, /data-selection="/);
});

test('portal: una etapa deja de omitirse si la oferta vigente ahora tiene varias opciones', async () => {
  let expanded = false;
  const { flow } = setup({ handler: (path, query, catalog) => {
    if (path === 'disponibilidad') return { ...query, modalidad: 'publica', zonaHoraria: branch.zonaHoraria, ranuras: [] };
    const data = catalog(query);
    if (expanded && query.servicioId) data.sucursales.push({ ...branch, id: 9 });
    return data;
  } });
  await flow.start(); flow.choose('servicioId', 1); await flow.next();
  assert.equal(flow.getState().step, 3); expanded = true;
  await flow.back(); await flow.next();
  assert.equal(flow.getState().step, 1); assert.deepEqual(flow.getState().automaticSteps, []);
});

test('portal: una sola opción tras búsqueda sigue siendo una elección explícita', async () => {
  const { flow } = setup({ branches: 7, handler: (_path, query, catalog) => {
    const data = catalog(query); data.sucursales.forEach((item) => { item.nombre = `Sucursal ${item.id}`; }); return data;
  } }); await flow.start(); flow.choose('servicioId', 1); await flow.next();
  flow.setBrowse('search', 'Sucursal 8');
  assert.equal((renderSelection(flow.getState()).match(/data-selection="sucursalId"/g) || []).length, 1);
  const count = flow.getState().options.sucursales.length;
  flow.setBrowse('page', 2);
  assert.equal(count, 7); assert.equal(flow.getState().step, 1); assert.equal(flow.getState().selection.sucursalId, null);
});
