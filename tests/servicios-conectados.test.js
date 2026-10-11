import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteService } from '../src/connected/modules/servicios/operations.js';

test('la baja de servicio usa DELETE sin cuerpo', async () => {
  const calls = [];
  const response = await deleteService(12, async (...args) => { calls.push(args); return null; });
  assert.equal(response, null);
  assert.deepEqual(calls, [['/servicios/12', 'DELETE']]);
});

test('la baja rechaza IDs inválidos y conserva los conflictos del backend', async () => {
  assert.throws(() => deleteService(0), /no válido/);
  assert.throws(() => deleteService(2.5), /no válido/);
  await assert.rejects(deleteService(12, async () => { throw new Error('El registro tiene selecciones; puedes desactivarlo.'); }), /tiene selecciones/);
});
