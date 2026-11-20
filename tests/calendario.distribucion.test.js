import test from 'node:test';
import assert from 'node:assert/strict';
import { columnasCalendario } from '../src/shared/calendario.distribucion.js';
test('las citas solapadas en cadena conservan columnas sin taparse', () => {
  const posiciones = columnasCalendario([
    { id: 1, start: '09:00', end: '10:00' },
    { id: 2, start: '09:30', end: '10:30' },
    { id: 3, start: '10:00', end: '11:00' },
    { id: 4, start: '11:00', end: '12:00' },
  ]);
  assert.deepEqual(posiciones.get(1), { carril: 0, ancho: 50 });
  assert.deepEqual(posiciones.get(2), { carril: 1, ancho: 50 });
  assert.deepEqual(posiciones.get(3), { carril: 0, ancho: 50 });
  assert.deepEqual(posiciones.get(4), { carril: 0, ancho: 100 });
});
