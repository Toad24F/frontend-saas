import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionGaps } from '../src/shared/screens/agenda/utility.js';
import { demoAttention } from '../src/demo/agenda-attention.js';
import { renderTimeline } from '../src/shared/screens/agenda/timeline.js';
const day = '2026-11-16';
const data = { intervalos: [{ fecha: day, sucursalId: 1, inicioMinutos: 480, finMinutos: 720 }, { fecha: day, sucursalId: 2, inicioMinutos: 840, finMinutos: 1080 }], omisiones: [] };
test('todas combina sedes y una omisión impide afirmar cierre completo', () => {
  assert.deepEqual(attentionGaps(data, day, 'all', 480, 1080), [{ start: 720, end: 840 }]);
  assert.deepEqual(attentionGaps({ ...data, omisiones: [{ fecha: day, sucursalId: 2 }] }, day, 'all', 480, 1080), []);
});
test('no combina referencias horarias diferentes ni duplica huecos de intervalos solapados', () => {
  const intervals = data.intervalos.map((x, i) => ({ ...x, inicioUtc: `${day}T${i ? '21' : '14'}:00:00Z` }));
  assert.deepEqual(attentionGaps({ ...data, intervalos: intervals }, day, 'all', 480, 1080), []);
  assert.deepEqual(attentionGaps({ ...data, intervalos: [...data.intervalos, { fecha: day, sucursalId: 3, inicioMinutos: 700, finMinutos: 900 }] }, day, 'all', 480, 1080), []);
});
test('demo admite todas las sedes para una persona', () => {
  const model = demoAttention([day], '1', 'all', [{ enabled: true, professionalId: 1, branchId: 2, day: 1, start: '08:00', end: '12:00' }], []);
  assert.equal(model.intervalos[0].sucursalId, 2);
});
test('cada columna conserva su atención y el error no inventa cierre', () => {
  const html = renderTimeline([day], [], day, { professional: 'all', branch: 'all', professionals: [{ id: 1, name: 'Ana' }, { id: 2, name: 'Beto' }], attentionByProfessional: { 1: { data }, 2: { error: 'No se pudo consultar' } } });
  const columns = html.split('data-calendar-professional=');
  assert.match(columns[1], /agenda-no-attention/);
  assert.doesNotMatch(columns[2], /agenda-no-attention/);
  assert.match(columns[2], /No se pudo consultar/);
});
