import test from 'node:test';
import assert from 'node:assert/strict';
import { disableService } from '../src/connected/modules/servicios/operations.js';

test('FALA-T038: inhabilitar servicio usa POST y cuerpo vacío', async () => {
  const calls = [];
  const response = await disableService(12, async (...args) => { calls.push(args); return null; });
  assert.equal(response, null);
  assert.deepEqual(calls, [['/servicios/12/inhabilitar', 'POST', {}]]);
});

test('la baja rechaza IDs inválidos y conserva los conflictos del backend', async () => {
  assert.throws(() => disableService(0), /no válido/);
  assert.throws(() => disableService(2.5), /no válido/);
  await assert.rejects(disableService(12, async () => { throw new Error('El registro tiene selecciones; puedes desactivarlo.'); }), /tiene selecciones/);
});
