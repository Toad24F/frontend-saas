import test from 'node:test';
import assert from 'node:assert/strict';
import { minutesToClock, minutesToLabel, validateProjectionRange } from '../src/connected/screens/disponibilidad/payload.js';

test('la proyección conserva etiquetas de minutos sin rutas de excepción', () => {
  assert.equal(minutesToClock(1440), '00:00');
  assert.equal(minutesToLabel(1440), '24:00');
});

test('la proyección exige fechas civiles y como máximo 366 días inclusivos', () => {
  assert.doesNotThrow(() => validateProjectionRange('2026-01-01', '2027-01-01'));
  assert.throws(() => validateProjectionRange('2026-01-01', '2027-01-02'), /366 días/);
  assert.throws(() => validateProjectionRange('2026-02-30', '2026-03-01'), /rango válido/);
  assert.throws(() => validateProjectionRange('2026-02-01', '2026-01-31'), /rango válido/);
});
