import test from 'node:test';
import assert from 'node:assert/strict';
import { ejecutarAccionProfesional } from '../src/connected/modules/profesionales/profesionales.operaciones.js';

test('las acciones de estado y baja usan rutas y cuerpos admitidos', async () => {
  const llamadas = [];
  const peticion = async (...argumentos) => { llamadas.push(argumentos); return null; };
  await ejecutarAccionProfesional(12, 'desactivar', peticion);
  await ejecutarAccionProfesional(12, 'reactivar', peticion);
  await ejecutarAccionProfesional(12, 'inhabilitar', peticion);
  assert.deepEqual(llamadas, [
    ['/profesionales/12/desactivar', 'POST', {}],
    ['/profesionales/12/reactivar', 'POST', {}],
    ['/profesionales/12/inhabilitar', 'POST', {}],
  ]);
});

test('la baja no oculta conflictos y rechaza acciones no admitidas', async () => {
  const conflicto = new Error('El perfil conserva historial.');
  await assert.rejects(ejecutarAccionProfesional(12, 'inhabilitar', async () => { throw conflicto; }), (error) => error === conflicto);
  await assert.rejects(ejecutarAccionProfesional(0, 'inhabilitar'), /no válida/);
  await assert.rejects(ejecutarAccionProfesional(12, 'eliminar'), /no válida/);
  await assert.rejects(ejecutarAccionProfesional(12, 'suspender'), /no válida/);
});
