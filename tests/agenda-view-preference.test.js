import test from 'node:test';
import assert from 'node:assert/strict';
import { readAgendaView, saveAgendaView } from '../src/shared/screens/agenda/view-preference.js';

const memory = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
test('primera visita elige Día en móvil y Semana en escritorio; ignora valores inválidos', () => {
  const storage = memory();
  assert.equal(readAgendaView(true, 'connected', storage), 'day');
  assert.equal(readAgendaView(false, 'connected', storage), 'week');
  storage.setItem('cita-agenda-view:connected', 'invalid');
  assert.equal(readAgendaView(false, 'connected', storage), 'week');
});
test('la elección explícita prevalece sobre el tamaño y la demo no modifica conectado', () => {
  const storage = memory();
  for (const view of ['day', 'week', 'month']) {
    saveAgendaView(view, 'connected', storage);
    assert.equal(readAgendaView(true, 'connected', storage), view);
    assert.equal(readAgendaView(false, 'connected', storage), view);
  }
  saveAgendaView('day', 'demo', storage);
  assert.equal(readAgendaView(false, 'demo', storage), 'day');
  assert.equal(readAgendaView(false, 'connected', storage), 'month');
  saveAgendaView('invalid', 'connected', storage);
  assert.equal(readAgendaView(false, 'connected', storage), 'month');
});
test('almacenamiento bloqueado conserva valores iniciales y no impide usar el calendario', () => {
  const storage = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Bloqueado'); } };
  assert.equal(readAgendaView(true, 'connected', storage), 'day');
  assert.equal(readAgendaView(false, 'connected', storage), 'week');
  assert.doesNotThrow(() => saveAgendaView('month', 'connected', storage));
});
