import test from 'node:test';
import assert from 'node:assert/strict';
import { leerPublicacionPrecios, guardarPublicacionPrecios } from '../src/connected/modules/publicacion/publicacion.precios.js';
import { renderPublicacionPrecios } from '../src/connected/screens/cuenta/cuenta.publicacion-precios.js';
import { leerConfiguracionConectada, validarConfiguracionConectada } from '../src/shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';

// La frontera usa el actor autenticado; nunca acepta un negocioId del navegador.
test('T044: lee el booleano vigente y conserva el fallo de lectura', async () => {
  const llamadas = [];
  const solicitar = async (...argumentos) => { llamadas.push(argumentos); return { mostrarPreciosPublicos: false }; };
  assert.equal((await leerPublicacionPrecios(solicitar)).mostrarPreciosPublicos, false);
  assert.deepEqual(llamadas, [['/negocios/publicacion-catalogo']]);
  await assert.rejects(leerPublicacionPrecios(async () => { throw new Error('Sin conexión'); }), /Sin conexión/);
  assert.match(renderPublicacionPrecios({ cargando: false, datos: null, error: 'Sin conexión' }), /Sin conexión/);
  assert.doesNotMatch(renderPublicacionPrecios({ cargando: false, datos: null, error: 'Sin conexión' }), /checked/);
});

test('T045: envía solo el booleano y exige confirmación de la respuesta', async () => {
  const llamadas = [];
  const solicitar = async (...argumentos) => { llamadas.push(argumentos); return { mostrarPreciosPublicos: false }; };
  assert.equal((await guardarPublicacionPrecios(false, solicitar)).mostrarPreciosPublicos, false);
  assert.deepEqual(llamadas, [['/negocios/publicacion-catalogo', 'PATCH', { mostrarPreciosPublicos: false }]]);
  await assert.rejects(guardarPublicacionPrecios(true, async () => ({ mostrarPreciosPublicos: false })), /confirmó/);
  assert.match(renderPublicacionPrecios({ cargando: false, datos: { mostrarPreciosPublicos: true }, error: '' }), /servicios creados después/);
});

test('T047: el nuevo tiempo admite cero y rechaza el campo anterior', () => {
  const base = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 0, anticipacionMinutos: 15, diasFuturos: 60 };
  assert.deepEqual(validarConfiguracionConectada(base), {});
  assert.ok(validarConfiguracionConectada({ ...base, tiempoEntreCitasMinutos: undefined, intervaloMinutos: 15 }).tiempoEntreCitasMinutos);
  assert.deepEqual(leerConfiguracionConectada(base), base);
  assert.throws(() => leerConfiguracionConectada({ ...base, tiempoEntreCitasMinutos: undefined, intervaloMinutos: 15 }), /no es válida/);
});
