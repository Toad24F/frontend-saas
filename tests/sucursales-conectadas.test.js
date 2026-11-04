import test from 'node:test';
import assert from 'node:assert/strict';
import { disableBranch } from '../src/connected/modules/sucursales/operations.js';

test('FALA-T039: inhabilitar sucursal usa POST y cuerpo vacío', async () => {
  const calls = [];
  const response = await disableBranch(14, async (...args) => { calls.push(args); return null; });
  assert.equal(response, null);
  assert.deepEqual(calls, [['/sucursales/14/inhabilitar', 'POST', {}]]);
});

test('la baja rechaza IDs inválidos y conserva los conflictos del backend', async () => {
  assert.throws(() => disableBranch(0), /no válida/);
  assert.throws(() => disableBranch(1.5), /no válida/);
  await assert.rejects(disableBranch(14, async () => { throw new Error('La sucursal tiene historial.'); }), /tiene historial/);
});
