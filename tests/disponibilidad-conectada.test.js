import test from 'node:test';
import assert from 'node:assert/strict';
import { exceptionPayload, minutesToClock, minutesToLabel, validateProjectionRange } from '../src/connected/screens/disponibilidad/payload.js';

test('la excepción conserva IDs y representa cierre explícito sin franjas', () => {
  assert.deepEqual(exceptionPayload(8, []), { sucursalId: 8, franjas: [] });
  assert.deepEqual(exceptionPayload(8, [
    { id: 12, start: '09:00', end: '12:00', breakStart: '', breakEnd: '' },
    { start: '13:00', end: '00:00', breakStart: '17:00', breakEnd: '17:30' },
  ]), { sucursalId: 8, franjas: [
    { id: 12, orden: 0, inicioMinutos: 540, finMinutos: 720, descansoInicioMinutos: null, descansoFinMinutos: null },
    { orden: 1, inicioMinutos: 780, finMinutos: 1440, descansoInicioMinutos: 1020, descansoFinMinutos: 1050 },
  ] });
  assert.equal(minutesToClock(1440), '00:00');
  assert.equal(minutesToLabel(1440), '24:00');
});

test('la proyección exige fechas civiles y como máximo 366 días inclusivos', () => {
  assert.doesNotThrow(() => validateProjectionRange('2026-01-01', '2027-01-01'));
  assert.throws(() => validateProjectionRange('2026-01-01', '2027-01-02'), /366 días/);
  assert.throws(() => validateProjectionRange('2026-02-30', '2026-03-01'), /rango válido/);
  assert.throws(() => validateProjectionRange('2026-02-01', '2026-01-31'), /rango válido/);
});
