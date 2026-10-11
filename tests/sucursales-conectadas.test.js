import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteBranch } from '../src/connected/modules/sucursales/operations.js';

test('la baja de sucursal usa DELETE sin cuerpo', async () => {
  const calls = [];
  const response = await deleteBranch(14, async (...args) => { calls.push(args); return null; });
  assert.equal(response, null);
  assert.deepEqual(calls, [['/sucursales/14', 'DELETE']]);
});

test('la baja rechaza IDs inválidos y conserva los conflictos del backend', async () => {
  assert.throws(() => deleteBranch(0), /no válida/);
  assert.throws(() => deleteBranch(1.5), /no válida/);
  await assert.rejects(deleteBranch(14, async () => { throw new Error('La sucursal tiene historial.'); }), /tiene historial/);
});
