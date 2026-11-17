import test from 'node:test';
import assert from 'node:assert/strict';
import { eventLayout } from '../src/shared/screens/agenda/presentation.js';
import { renderTimeline } from '../src/shared/screens/agenda/timeline.js';
import { renderMonth } from '../src/shared/screens/agenda/month.js';
import { denseGroups } from '../src/shared/screens/agenda/utility.js';

const day = '2026-11-16';
const item = { id: 1, folio: 'FOLIO-SECRET', estado: 'confirmada', fechaLocal: day, fechaFinLocal: day, horaInicio: '08:00', horaFin: '08:20', personalId: 1, sucursalId: 1, nombreContacto: 'Cliente largo', nombreServicio: 'Consulta', nombreProfesional: 'Ana', nombreSucursal: 'Norte', zonaHoraria: 'America/Chihuahua', causas: [] };
test('consecutivas ocupan ancho completo; solo empalmes reales generan columnas', () => {
  const layout = eventLayout([{ id: 1, start: '08:00', end: '08:20' }, { id: 2, start: '08:20', end: '08:40' }]);
  assert.equal(layout.get(1).width, 100); assert.equal(layout.get(2).width, 100);
  const overlap = eventLayout([{ id: 1, start: '08:00', end: '09:00' }, { id: 2, start: '08:30', end: '09:30' }]);
  assert.equal(overlap.get(1).width, 50);
});
test('las consecutivas no se agrupan como si fueran simultáneas', () => {
  assert.deepEqual(denseGroups([{ id: 1, start: '08:00', end: '08:20' }, { id: 2, start: '08:20', end: '08:40' }], 160), []);
});
test('día distribuye por profesional, incluye columnas vacías y elimina folio de tarjetas', () => {
  const html = renderTimeline([day], [item], day, { professional: 'all', branch: 'all', professionals: [{ id: 1, name: 'Ana', branchIds: [1] }, { id: 2, name: 'Beto', branchIds: [1] }] });
  assert.match(html, /data-calendar-professional="1"/); assert.match(html, /data-calendar-professional="2"/);
  assert.match(html, /event-branch/); assert.doesNotMatch(html, /FOLIO-SECRET|event-folio|Folio/);
  assert.doesNotMatch(renderMonth(day, [item], day), /FOLIO-SECRET|event-folio|Folio/);
});
test('la escala crece para citas cortas manteniendo duración proporcional', () => {
  const html = renderTimeline([day], [item, { ...item, id: 2, horaInicio: '09:00', horaFin: '11:00' }], day, { professional: '1', branch: '1' });
  const scale = Number(html.match(/--hour-height:([\d.]+)px/)[1]);
  assert.ok(scale >= 240);
  const cards = [...html.matchAll(/class="calendar-event[^]*?style="top:([\d.]+)px;height:([\d.]+)px/g)];
  assert.equal(cards.length, 2);
  assert.ok(Math.abs((Number(cards[1][2]) + 4) / (Number(cards[0][2]) + 4) - 6) < 0.01);
});
test('campos condicionales y continuidad nocturna conservan una escala común', () => {
  const days = [day, '2026-11-17'];
  const night = { ...item, horaInicio: '23:55', horaFin: '00:10', fechaFinLocal: days[1] };
  const html = renderTimeline(days, [night], day, { professional: 'all', branch: 'all' });
  assert.equal((html.match(/class="calendar-event /g) || []).length, 2);
  assert.equal((html.match(/class="event-professional"/g) || []).length, 2);
  assert.equal((html.match(/class="event-branch"/g) || []).length, 2);
  assert.equal((html.match(/--hour-height:/g) || []).length, 1);
  const single = renderTimeline([day], [item], day, { professional: '1', branch: '1' });
  assert.doesNotMatch(single, /class="event-professional"|class="event-branch"/);
});
test('profesional histórico no se pierde y las columnas no duplican personas por sucursal', () => {
  const html = renderTimeline([day], [item, { ...item, id: 2, sucursalId: 2 }], day, { professional: 'all', branch: 'all', professionals: [{ id: 1, name: 'Ana', active: false, branchIds: [] }] });
  assert.equal((html.match(/data-calendar-professional="1"/g) || []).length, 1);
  assert.equal((html.match(/class="calendar-event /g) || []).length, 2);
});
