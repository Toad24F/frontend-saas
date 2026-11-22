import test from 'node:test';
import assert from 'node:assert/strict';
import { crearClientesClient } from '../src/connected/modules/clientes/clientes.client.js';
import { crearIntentoUnion, reconocerCoincidencia, validarResultadoUnion } from '../src/connected/modules/clientes/clientes.union.js';

const origen = { id: 2, negocioId: 1, version: 3, nombreCompleto: 'Ana', telefono: '6145550101' };
const destino = { id: 7, nombreCompleto: 'Ana López', version: 4 };

// El código tipado es la única fuente válida para ofrecer una ficha destino.
test('T024: solo el rechazo tipado permite ofrecer el destino mínimo', () => {
  assert.deepEqual(reconocerCoincidencia({ status: 409, codigo: 'cliente_coincidente', destino }), destino);
  assert.equal(reconocerCoincidencia({ status: 409, codigo: 'cliente_coincidente', destino: { ...destino, telefono: 'secreto' } }), null);
  assert.equal(reconocerCoincidencia({ status: 409, codigo: 'otro', destino }), null);
});

// Las dos llamadas representan el POST inicial y su recuperación tras perder la respuesta.
test('T025: la unión conserva cuerpo y clave para recuperar una respuesta perdida', async () => {
  const llamadas = [];
  const client = crearClientesClient(async (...argumentos) => {
    llamadas.push(argumentos);
    return { id: '42', origenId: 2, destinoId: 7, versionOrigen: 4, versionDestino: 5, ocurridoEn: '2026-11-22T12:00:00Z' };
  });
  const intento = crearIntentoUnion(origen, destino, { nombreCompleto: 'Ana López', telefono: '6145550101' }, 'clave-fija-de-prueba-123');
  assert.equal(intento.clave, 'clave-fija-de-prueba-123');
  assert.equal(validarResultadoUnion(await client.unir(origen.id, intento), intento).destinoId, 7);
  await client.unir(origen.id, intento);
  assert.deepEqual(llamadas[0], llamadas[1]);
  assert.deepEqual(llamadas[0], ['/clientes/2/uniones', 'POST', intento]);
});

test('T026: una conciliación exige destino elegido y versiones vigentes', () => {
  assert.throws(() => crearIntentoUnion(origen, { ...destino, id: 2 }, null, 'clave-fija-de-prueba-123'));
  assert.throws(() => crearIntentoUnion(origen, { ...destino, version: 0 }, null, 'clave-fija-de-prueba-123'));
  assert.deepEqual(crearIntentoUnion(origen, destino, null, 'clave-fija-de-prueba-123').datosPropuestos, undefined);
});
