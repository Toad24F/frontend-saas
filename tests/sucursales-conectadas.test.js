import test from 'node:test';
import assert from 'node:assert/strict';
import { inhabilitarSucursal } from '../src/connected/modules/sucursales/sucursales.operaciones.js';

test('FALA-T039: inhabilitar sucursal usa POST y cuerpo vacío', async () => {
  const llamadas = [];
  const respuesta = await inhabilitarSucursal(14, async (...argumentos) => { llamadas.push(argumentos); return null; });
  assert.equal(respuesta, null);
  assert.deepEqual(llamadas, [['/sucursales/14/inhabilitar', 'POST', {}]]);
});

test('la baja rechaza IDs inválidos y conserva los conflictos del backend', async () => {
  assert.throws(() => inhabilitarSucursal(0), /no válida/);
  assert.throws(() => inhabilitarSucursal(1.5), /no válida/);
  await assert.rejects(inhabilitarSucursal(14, async () => { throw new Error('La sucursal tiene historial.'); }), /tiene historial/);
});
