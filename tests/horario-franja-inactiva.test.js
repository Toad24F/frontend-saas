import test from 'node:test';
import assert from 'node:assert/strict';
import { leerFranjasHorario, cambiarEstadoFranja } from '../src/shared/screens/disponibilidad/disponibilidad.horario-franjas.js';

test('una franja inactiva bloquea sus campos y conserva sus valores al guardar', () => {
  const controls = {
    'activo-7': { checked: false },
    'sucursal-7': { value: '2', disabled: true },
    'entrada-7': { value: '09:00', disabled: true },
    'salida-7': { value: '13:00', disabled: true },
    'inicioDescanso-7': { value: '', disabled: true },
    'finDescanso-7': { value: '', disabled: true },
  };
  const remove = { disabled: true };
  const classes = new Set(['horario-franja-inactiva']);
  const row = {
    dataset: { id: '7', horarioDia: '2' },
    classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); } },
    querySelector(selector) { return controls[selector.slice(7, -2)]; },
    querySelectorAll() { return [...Object.values(controls).slice(1), remove]; },
  };
  const form = { querySelectorAll() { return [row]; } };
  assert.deepEqual(leerFranjasHorario(form, 1, 4), [{
    id: 7, tenantId: 1, professionalId: 4, day: 2, enabled: false,
    branchId: 2, start: '09:00', end: '13:00', breakStart: '', breakEnd: '',
  }]);
  cambiarEstadoFranja(row, true);
  assert.equal(classes.has('horario-franja-inactiva'), false);
  assert.ok([...Object.values(controls).slice(1), remove].every((control) => control.disabled === false));
  cambiarEstadoFranja(row, false);
  assert.equal(classes.has('horario-franja-inactiva'), true);
  assert.ok([...Object.values(controls).slice(1), remove].every((control) => control.disabled === true));
});
