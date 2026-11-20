import test from 'node:test';
import assert from 'node:assert/strict';
import { leerVistaAgenda, guardarVistaAgenda } from '../src/shared/screens/agenda/agenda.preferencia-vista.js';

const memoria = () => {
  const valores = new Map();
  return { getItem: (clave) => valores.get(clave) ?? null, setItem: (clave, valor) => valores.set(clave, valor) };
};
test('primera visita elige Semana en móvil y escritorio; ignora valores inválidos', () => {
  const almacenamiento = memoria();
  assert.equal(leerVistaAgenda(true, 'connected', almacenamiento), 'week');
  assert.equal(leerVistaAgenda(false, 'connected', almacenamiento), 'week');
  almacenamiento.setItem('cita-agenda-view:connected', 'invalid');
  assert.equal(leerVistaAgenda(false, 'connected', almacenamiento), 'week');
});
test('la elección explícita prevalece sobre el tamaño y la demo no modifica conectado', () => {
  const almacenamiento = memoria();
  for (const vista of ['day', 'week', 'month']) {
    guardarVistaAgenda(vista, 'connected', almacenamiento);
    assert.equal(leerVistaAgenda(true, 'connected', almacenamiento), vista);
    assert.equal(leerVistaAgenda(false, 'connected', almacenamiento), vista);
  }
  guardarVistaAgenda('day', 'demo', almacenamiento);
  assert.equal(leerVistaAgenda(false, 'demo', almacenamiento), 'day');
  assert.equal(leerVistaAgenda(false, 'connected', almacenamiento), 'month');
  guardarVistaAgenda('invalid', 'connected', almacenamiento);
  assert.equal(leerVistaAgenda(false, 'connected', almacenamiento), 'month');
});
test('almacenamiento bloqueado conserva valores iniciales y no impide usar el calendario', () => {
  const almacenamiento = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Bloqueado'); } };
  assert.equal(leerVistaAgenda(true, 'connected', almacenamiento), 'week');
  assert.equal(leerVistaAgenda(false, 'connected', almacenamiento), 'week');
  assert.doesNotThrow(() => guardarVistaAgenda('month', 'connected', almacenamiento));
});
