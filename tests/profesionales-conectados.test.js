import test from 'node:test';
import assert from 'node:assert/strict';
import { submitProfessionalAction } from '../src/connected/modules/profesionales/operations.js';

test('las acciones de estado y baja usan rutas y cuerpos admitidos', async () => {
  const calls = [];
  const request = async (...args) => { calls.push(args); return null; };
  await submitProfessionalAction(12, 'deactivate', request);
  await submitProfessionalAction(12, 'reactivate', request);
  await submitProfessionalAction(12, 'delete', request);
  assert.deepEqual(calls, [
    ['/profesionales/12/desactivar', 'POST', {}],
    ['/profesionales/12/reactivar', 'POST', {}],
    ['/profesionales/12', 'DELETE'],
  ]);
});

test('la baja no oculta conflictos y rechaza acciones no admitidas', async () => {
  const conflict = new Error('El perfil conserva historial.');
  await assert.rejects(submitProfessionalAction(12, 'delete', async () => { throw conflict; }), (error) => error === conflict);
  await assert.rejects(submitProfessionalAction(0, 'delete'), /no válida/);
  await assert.rejects(submitProfessionalAction(12, 'suspend'), /no válida/);
});
