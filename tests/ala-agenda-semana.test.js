import test from 'node:test';
import assert from 'node:assert/strict';
import { saveAgendaConfiguration } from '../src/connected/modules/disponibilidad/configuration.js';
import { validateConnectedConfiguration } from '../src/shared/screens/disponibilidad/operational-contract.js';
import { schedulePayload } from '../src/connected/modules/disponibilidad/payload.js';
import { validateScheduleRows } from '../src/shared/screens/disponibilidad/errors.js';

const base = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 0, anticipacionMinutos: 15, diasFuturos: 60 };
const initial = { loaded: true, busy: false, data: base, draft: null, errors: {}, error: '' };

// T048: el PUT reemplaza todo el conjunto y no arrastra claves viejas o de UI.
test('T048: PUT exacto y separación cero, cinco o sesenta', async () => {
  for (const gap of [0, 5, 60]) {
    const calls = [];
    const values = { ...base, tiempoEntreCitasMinutos: gap, intervaloMinutos: 15, negocioId: 9 };
    const request = async (...args) => { calls.push(args); return { ...base, tiempoEntreCitasMinutos: gap }; };
    const result = await saveAgendaConfiguration(initial, values, request);
    assert.equal(result.saved, true);
    assert.deepEqual(calls, [['/disponibilidad/configuracion', 'PUT', { ...base, tiempoEntreCitasMinutos: gap }]]);
    assert.equal(result.state.draft, null);
  }
  for (const gap of [-5, 7, 65]) assert.ok(validateConnectedConfiguration({ ...base, tiempoEntreCitasMinutos: gap }).tiempoEntreCitasMinutos);
});

// T049: los fallos no confirman reemplazo y dejan todos los valores capturados.
test('T049: 400 señala campo y 503 conserva borrador y error general', async () => {
  const values = { ...base, modo: 'agenda_compacta', tiempoEntreCitasMinutos: 5 };
  for (const [status, message] of [[400, 'tiempoEntreCitasMinutos inválido'], [503, 'Servicio no disponible']]) {
    const request = async () => { throw Object.assign(new Error(message), { status }); };
    const result = await saveAgendaConfiguration(initial, values, request);
    assert.equal(result.saved, false);
    assert.deepEqual(result.state.draft, values);
    assert.deepEqual(result.state.data, base);
    assert.match(result.state.error || result.state.errors.tiempoEntreCitasMinutos, /inválido|no disponible/);
  }
  const invalidResponse = await saveAgendaConfiguration(initial, values, async () => ({ ...base }));
  assert.equal(invalidResponse.saved, false);
});

// T050: dos franjas expresan una pausa sin descanso incrustado en la API.
test('T050: semana envía dos franjas y ningún campo de descanso', () => {
  const rows = [
    { id: 1, day: 1, branchId: 3, start: '09:00', end: '12:00', breakStart: '', breakEnd: '', enabled: true },
    { id: -2, day: 1, branchId: 3, start: '13:00', end: '17:00', breakStart: '', breakEnd: '', enabled: true },
  ];
  assert.deepEqual(validateScheduleRows(rows, [3], false), {});
  assert.deepEqual(schedulePayload(rows), { franjas: [
    { id: 1, diaSemana: 1, orden: 0, sucursalId: 3, inicioMinutos: 540, finMinutos: 720, activo: true },
    { diaSemana: 1, orden: 1, sucursalId: 3, inicioMinutos: 780, finMinutos: 1020, activo: true },
  ] });
  assert.match(validateScheduleRows([{ ...rows[0], breakStart: '10:00', breakEnd: '10:30' }], [3], false)['schedule-1-break'], /dos franjas/);
});
