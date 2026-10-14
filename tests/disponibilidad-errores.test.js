import test from 'node:test';
import assert from 'node:assert/strict';
import { blockApiErrors, exceptionApiErrors, scheduleApiErrors, validateBlock, validateException, validateProjection, validateScheduleRows } from '../src/shared/screens/disponibilidad/errors.js';

test('bloqueos señalan motivo, fechas y horas por separado', () => {
  const data = new FormData();
  data.set('reason', ' '); data.set('date', '2026-10-20'); data.set('endDate', '2026-10-19');
  data.set('start', '12:00'); data.set('end', '');
  assert.deepEqual(validateBlock(data), {
    reason: 'Escribe el motivo del bloqueo.',
    endDate: 'La fecha final debe ser igual o posterior a la fecha inicial.',
    end: 'Indica también la hora final.',
  });
  assert.deepEqual(blockApiErrors(new Error('fechaFin debe ser posterior · finMinutos: intervalo inválido')), {
    endDate: 'La fecha final debe ser igual o posterior a la fecha inicial.',
    end: 'Revisa la hora final; debe ser posterior a la inicial.',
  });
});

test('excepciones ubican los errores en la franja correspondiente', () => {
  const data = new FormData();
  data.set('professionalId', '4'); data.set('branchId', '8'); data.set('date', '2026-10-20');
  const errors = validateException(data, [{ index: 3, start: '12:00', end: '11:00', breakStart: '10:00', breakEnd: '10:30' }], false, true);
  assert.deepEqual(errors, {
    'slot-3-end': 'La salida debe ser posterior a la entrada.',
    'slot-3-break': 'El descanso debe quedar dentro de la franja.',
  });
  assert.deepEqual(exceptionApiErrors(new Error('fila 2, descansoInicioMinutos: fuera de franja')), {
    'slot-2-break': 'El descanso debe quedar dentro de la franja.',
  });
});

test('horario semanal señala la celda y detecta empalmes', () => {
  const rows = [
    { id: 10, day: 1, enabled: true, branchId: 2, start: '09:00', end: '12:00', breakStart: '', breakEnd: '' },
    { id: 11, day: 1, enabled: true, branchId: 2, start: '11:30', end: '13:00', breakStart: '', breakEnd: '' },
  ];
  assert.deepEqual(validateScheduleRows(rows, [2]), {
    'schedule-11-start': 'Esta franja se empalma con 09:00–12:00.',
  });
  assert.deepEqual(scheduleApiErrors(new Error('fila 1, finMinutos: debe ser posterior'), rows), {
    'schedule-11-end': 'fila 1, finMinutos: debe ser posterior',
  });
  assert.deepEqual(validateScheduleRows([{ id: 12, day: 2, enabled: false, branchId: 0, start: '', end: '', breakStart: '', breakEnd: '' }], [2]), {});
});

test('proyección señala la fecha concreta que hace inválido el rango', () => {
  assert.deepEqual(validateProjection('2026-10-20', '2026-10-19'), {
    to: 'La fecha final debe ser igual o posterior a la inicial.',
  });
  assert.deepEqual(validateProjection('2026-02-30', '2026-03-01'), {
    from: 'Selecciona una fecha inicial válida.',
  });
});
