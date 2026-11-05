import test from 'node:test';
import assert from 'node:assert/strict';
import { readPricePublication, savePricePublication } from '../src/connected/modules/publicacion/precios.js';
import { pricePublicationPanel } from '../src/connected/screens/cuenta/price-publication.js';
import { readConnectedConfiguration, validateConnectedConfiguration } from '../src/shared/screens/disponibilidad/operational-contract.js';

// La frontera usa el actor autenticado; nunca acepta un negocioId del navegador.
test('T044: lee el booleano vigente y conserva el fallo de lectura', async () => {
  const calls = [];
  const request = async (...args) => { calls.push(args); return { mostrarPreciosPublicos: false }; };
  assert.equal((await readPricePublication(request)).mostrarPreciosPublicos, false);
  assert.deepEqual(calls, [['/negocios/publicacion-catalogo']]);
  await assert.rejects(readPricePublication(async () => { throw new Error('Sin conexión'); }), /Sin conexión/);
  assert.match(pricePublicationPanel({ loading: false, data: null, error: 'Sin conexión' }), /Sin conexión/);
  assert.doesNotMatch(pricePublicationPanel({ loading: false, data: null, error: 'Sin conexión' }), /checked/);
});

test('T045: envía solo el booleano y exige confirmación de la respuesta', async () => {
  const calls = [];
  const request = async (...args) => { calls.push(args); return { mostrarPreciosPublicos: false }; };
  assert.equal((await savePricePublication(false, request)).mostrarPreciosPublicos, false);
  assert.deepEqual(calls, [['/negocios/publicacion-catalogo', 'PATCH', { mostrarPreciosPublicos: false }]]);
  await assert.rejects(savePricePublication(true, async () => ({ mostrarPreciosPublicos: false })), /confirmó/);
  assert.match(pricePublicationPanel({ loading: false, data: { mostrarPreciosPublicos: true }, error: '' }), /servicios creados después/);
});

test('T047: el nuevo tiempo admite cero y rechaza el campo anterior', () => {
  const base = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 0, anticipacionMinutos: 15, diasFuturos: 60 };
  assert.deepEqual(validateConnectedConfiguration(base), {});
  assert.ok(validateConnectedConfiguration({ ...base, tiempoEntreCitasMinutos: undefined, intervaloMinutos: 15 }).tiempoEntreCitasMinutos);
  assert.deepEqual(readConnectedConfiguration(base), base);
  assert.throws(() => readConnectedConfiguration({ ...base, tiempoEntreCitasMinutos: undefined, intervaloMinutos: 15 }), /no es válida/);
});
