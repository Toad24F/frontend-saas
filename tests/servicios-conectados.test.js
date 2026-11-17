import test from 'node:test';
import assert from 'node:assert/strict';
import { inhabilitarServicio } from '../src/connected/modules/servicios/servicios.operaciones.js';

test('FALA-T038: inhabilitar servicio usa POST y cuerpo vacío', async () => {
  const llamadas = [];
  const respuesta = await inhabilitarServicio(12, async (...argumentos) => { llamadas.push(argumentos); return null; });
  assert.equal(respuesta, null);
  assert.deepEqual(llamadas, [['/servicios/12/inhabilitar', 'POST', {}]]);
});

test('la baja rechaza IDs inválidos y conserva los conflictos del backend', async () => {
  assert.throws(() => inhabilitarServicio(0), /no válido/);
  assert.throws(() => inhabilitarServicio(2.5), /no válido/);
  await assert.rejects(inhabilitarServicio(12, async () => { throw new Error('El registro tiene selecciones; puedes desactivarlo.'); }), /tiene selecciones/);
});
