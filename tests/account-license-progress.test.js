import test from 'node:test';
import assert from 'node:assert/strict';
import { licenseProgress } from '../src/connected/screens/cuenta/license-progress.js';

test('la barra usa la duración completa de una licencia de varios años', () => {
  const totalMs = Date.parse('2029-01-01T00:00:00Z') - Date.parse('2026-01-01T00:00:00Z');
  const halfway = licenseProgress({
    duracionTotalMs: totalMs,
    tiempoRestante: { dias: 548, horas: 0, minutos: 0 },
  });
  assert.equal(halfway.value, 50);
});

test('sin duración real no inventa un porcentaje', () => {
  assert.equal(licenseProgress({
    tiempoRestante: { dias: 400, horas: 0, minutos: 0 },
  }), null);
});
