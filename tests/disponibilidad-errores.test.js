import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretarErroresBloqueo, interpretarErroresHorario, validarBloqueo, validarProyeccion, validarFranjasHorario } from '../src/shared/screens/disponibilidad/disponibilidad.errores.js';

test('bloqueos señalan motivo, fechas y horas por separado', () => {
  const data = new FormData();
  data.set('reason', ' '); data.set('date', '2026-10-20'); data.set('endDate', '2026-10-19');
  data.set('start', '12:00'); data.set('end', '');
  assert.deepEqual(validarBloqueo(data), {
    reason: 'Escribe el motivo del bloqueo.',
    endDate: 'La fecha final debe ser igual o posterior a la fecha inicial.',
    end: 'Indica también la hora final.',
  });
  assert.deepEqual(interpretarErroresBloqueo(new Error('fechaFin debe ser posterior · finMinutos: intervalo inválido')), {
    endDate: 'La fecha final debe ser igual o posterior a la fecha inicial.',
    end: 'Revisa la hora final; debe ser posterior a la inicial.',
  });
});

test('horario semanal señala la celda y detecta empalmes', () => {
  const rows = [
    { id: 10, day: 1, enabled: true, branchId: 2, start: '09:00', end: '12:00', breakStart: '', breakEnd: '' },
    { id: 11, day: 1, enabled: true, branchId: 2, start: '11:30', end: '13:00', breakStart: '', breakEnd: '' },
  ];
  assert.deepEqual(validarFranjasHorario(rows, [2]), {
    'horario-11-entrada': 'Esta franja se empalma con 09:00–12:00.',
  });
  assert.deepEqual(interpretarErroresHorario(new Error('fila 1, finMinutos: debe ser posterior'), rows), {
    'horario-11-salida': 'fila 1, finMinutos: debe ser posterior',
  });
  assert.deepEqual(validarFranjasHorario([{ id: 12, day: 2, enabled: false, branchId: 0, start: '', end: '', breakStart: '', breakEnd: '' }], [2]), {});
});

test('proyección señala la fecha concreta que hace inválido el rango', () => {
  assert.deepEqual(validarProyeccion('2026-10-20', '2026-10-19'), {
    to: 'La fecha final debe ser igual o posterior a la inicial.',
  });
  assert.deepEqual(validarProyeccion('2026-02-30', '2026-03-01'), {
    from: 'Selecciona una fecha inicial válida.',
  });
});
