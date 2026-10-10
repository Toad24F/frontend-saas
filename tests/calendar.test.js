import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarColumns } from '../src/shared/calendar-layout.js';
test('las citas solapadas en cadena conservan columnas sin taparse', () => {
  const positions = calendarColumns([
    { id: 1, start: '09:00', end: '10:00' },
    { id: 2, start: '09:30', end: '10:30' },
    { id: 3, start: '10:00', end: '11:00' },
    { id: 4, start: '11:00', end: '12:00' },
  ]);
  assert.deepEqual(positions.get(1), { lane: 0, width: 50 });
  assert.deepEqual(positions.get(2), { lane: 1, width: 50 });
  assert.deepEqual(positions.get(3), { lane: 0, width: 50 });
  assert.deepEqual(positions.get(4), { lane: 0, width: 100 });
});
