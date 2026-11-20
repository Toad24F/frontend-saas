import test from 'node:test';
import assert from 'node:assert/strict';
import { leerFranjasHorario, cambiarEstadoFranja } from '../src/shared/screens/disponibilidad/disponibilidad.horario-franjas.js';

test('una franja inactiva bloquea sus campos y conserva sus valores al guardar', () => {
  const controles = {
    'activo-7': { checked: false },
    'sucursal-7': { value: '2', disabled: true },
    'entrada-7': { value: '09:00', disabled: true },
    'salida-7': { value: '13:00', disabled: true },
    'inicioDescanso-7': { value: '', disabled: true },
    'finDescanso-7': { value: '', disabled: true },
  };
  const eliminar = { disabled: true };
  const clases = new Set(['horario-franja-inactiva']);
  const fila = {
    dataset: { id: '7', horarioDia: '2' },
    classList: { toggle(nombre, activo) { if (activo) clases.add(nombre); else clases.delete(nombre); } },
    querySelector(selector) { return controles[selector.slice(7, -2)]; },
    querySelectorAll() { return [...Object.values(controles).slice(1), eliminar]; },
  };
  const formulario = { querySelectorAll() { return [fila]; } };
  assert.deepEqual(leerFranjasHorario(formulario, 1, 4), [{
    id: 7, tenantId: 1, professionalId: 4, day: 2, enabled: false,
    branchId: 2, start: '09:00', end: '13:00', breakStart: '', breakEnd: '',
  }]);
  cambiarEstadoFranja(fila, true);
  assert.equal(clases.has('horario-franja-inactiva'), false);
  assert.ok([...Object.values(controles).slice(1), eliminar].every((control) => control.disabled === false));
  cambiarEstadoFranja(fila, false);
  assert.equal(clases.has('horario-franja-inactiva'), true);
  assert.ok([...Object.values(controles).slice(1), eliminar].every((control) => control.disabled === true));
});
