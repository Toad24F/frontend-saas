import test from 'node:test';
import assert from 'node:assert/strict';
import { readScheduleRows, setScheduleRowEnabled } from '../src/shared/screens/disponibilidad/schedule-rows.js';

test('una franja inactiva bloquea sus campos y conserva sus valores al guardar', () => {
  const controls = {
    'enabled-7': { checked: false },
    'branch-7': { value: '2', disabled: true },
    'start-7': { value: '09:00', disabled: true },
    'end-7': { value: '13:00', disabled: true },
    'breakStart-7': { value: '', disabled: true },
    'breakEnd-7': { value: '', disabled: true },
  };
  const remove = { disabled: true };
  const classes = new Set(['schedule-disabled']);
  const row = {
    dataset: { id: '7', scheduleDay: '2' },
    classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); } },
    querySelector(selector) { return controls[selector.slice(7, -2)]; },
    querySelectorAll() { return [...Object.values(controls).slice(1), remove]; },
  };
  const form = { querySelectorAll() { return [row]; } };
  assert.deepEqual(readScheduleRows(form, 1, 4), [{
    id: 7, tenantId: 1, professionalId: 4, day: 2, enabled: false,
    branchId: 2, start: '09:00', end: '13:00', breakStart: '', breakEnd: '',
  }]);
  setScheduleRowEnabled(row, true);
  assert.equal(classes.has('schedule-disabled'), false);
  assert.ok([...Object.values(controls).slice(1), remove].every((control) => control.disabled === false));
  setScheduleRowEnabled(row, false);
  assert.equal(classes.has('schedule-disabled'), true);
  assert.ok([...Object.values(controls).slice(1), remove].every((control) => control.disabled === true));
});
