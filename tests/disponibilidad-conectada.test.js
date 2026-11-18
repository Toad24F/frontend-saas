import test from 'node:test';
import assert from 'node:assert/strict';
import { minutosAHora, etiquetaHoraDesdeMinutos, validarRangoProyeccion } from '../src/connected/screens/disponibilidad/disponibilidad.payload.js';

test('la proyección conserva etiquetas de minutos sin rutas de excepción', () => {
  assert.equal(minutosAHora(1440), '00:00');
  assert.equal(etiquetaHoraDesdeMinutos(1440), '24:00');
});

test('la proyección exige fechas civiles y como máximo 366 días inclusivos', () => {
  assert.doesNotThrow(() => validarRangoProyeccion('2026-01-01', '2027-01-01'));
  assert.throws(() => validarRangoProyeccion('2026-01-01', '2027-01-02'), /366 días/);
  assert.throws(() => validarRangoProyeccion('2026-02-30', '2026-03-01'), /rango válido/);
  assert.throws(() => validarRangoProyeccion('2026-02-01', '2026-01-31'), /rango válido/);
});
