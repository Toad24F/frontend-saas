import test from 'node:test';
import assert from 'node:assert/strict';
import { progresoLicencia } from '../src/connected/screens/cuenta/licencia.progreso.js';

test('la barra usa la duración completa de una licencia de varios años', () => {
  const duracionTotalMs = Date.parse('2029-01-01T00:00:00Z') - Date.parse('2026-01-01T00:00:00Z');
  const puntoMedio = progresoLicencia({
    duracionTotalMs: duracionTotalMs,
    tiempoRestante: { dias: 548, horas: 0, minutos: 0 },
  });
  assert.equal(puntoMedio.valor, 50);
});

test('sin duración real no inventa un porcentaje', () => {
  assert.equal(progresoLicencia({
    tiempoRestante: { dias: 400, horas: 0, minutos: 0 },
  }), null);
});
