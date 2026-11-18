import test from 'node:test';
import assert from 'node:assert/strict';
import { leerVistaAgenda, guardarVistaAgenda } from '../src/shared/screens/agenda/agenda.preferencia-vista.js';

const memory = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
test('primera visita elige Semana en móvil y escritorio; ignora valores inválidos', () => {
  const storage = memory();
  assert.equal(leerVistaAgenda(true, 'connected', storage), 'week');
  assert.equal(leerVistaAgenda(false, 'connected', storage), 'week');
  storage.setItem('cita-agenda-view:connected', 'invalid');
  assert.equal(leerVistaAgenda(false, 'connected', storage), 'week');
});
test('la elección explícita prevalece sobre el tamaño y la demo no modifica conectado', () => {
  const storage = memory();
  for (const view of ['day', 'week', 'month']) {
    guardarVistaAgenda(view, 'connected', storage);
    assert.equal(leerVistaAgenda(true, 'connected', storage), view);
    assert.equal(leerVistaAgenda(false, 'connected', storage), view);
  }
  guardarVistaAgenda('day', 'demo', storage);
  assert.equal(leerVistaAgenda(false, 'demo', storage), 'day');
  assert.equal(leerVistaAgenda(false, 'connected', storage), 'month');
  guardarVistaAgenda('invalid', 'connected', storage);
  assert.equal(leerVistaAgenda(false, 'connected', storage), 'month');
});
test('almacenamiento bloqueado conserva valores iniciales y no impide usar el calendario', () => {
  const storage = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Bloqueado'); } };
  assert.equal(leerVistaAgenda(true, 'connected', storage), 'week');
  assert.equal(leerVistaAgenda(false, 'connected', storage), 'week');
  assert.doesNotThrow(() => guardarVistaAgenda('month', 'connected', storage));
});
