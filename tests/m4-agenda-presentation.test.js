import test from 'node:test';
import assert from 'node:assert/strict';
import { timelineSegments, timelineRange, renderTimeline, renderMonth, renderMetrics } from '../src/connected/screens/agenda/presentation.js';

const item = { id: 7, estado: 'confirmada', fechaLocal: '2026-11-11', fechaFinLocal: '2026-11-11', horaInicio: '10:00:00', horaFin: '10:45:00', nombreContacto: 'Paciente <QA>', nombreServicio: 'Consulta', nombreProfesional: 'Profesional', zonaHoraria: 'America/Tijuana', causas: [] };
// Primero se fija la presentación esperada: clases y geometría de la demo, con datos reales.
test('la agenda conectada usa cuadrícula horaria y tarjeta de estado de la demo', () => {
  const html = renderTimeline(['2026-11-11'], [item], '2026-11-11');
  assert.match(html, /week-calendar single-day/);
  assert.match(html, /time-gutter/);
  assert.match(html, /calendar-event confirmada/);
  assert.match(html, /top:99px/);
  assert.match(html, /Paciente &lt;QA&gt;/);
  assert.match(html, /America\/Tijuana/);
  assert.doesNotMatch(html, /lunch-block|data-slot-date|current-time/);
});
test('horas fuera de 09–18 y continuación nocturna siguen visibles', () => {
  const late = { ...item, horaInicio: '23:30:00', fechaFinLocal: '2026-11-12', horaFin: '00:15:00' };
  const parts = timelineSegments([late], ['2026-11-11', '2026-11-12']);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].end, '24:00'); assert.equal(parts[1].start, '00:00');
  assert.deepEqual(timelineRange(parts), { firstHour: 0, lastHour: 24 });
  assert.deepEqual(timelineRange(timelineSegments([item], ['2026-11-11'])), { firstHour: 9, lastHour: 18 });
});
test('mes conserva 42 fechas, tres citas y acceso a las restantes como en demo', () => {
  const items = Array.from({ length: 5 }, (_, index) => ({ ...item, id: index + 1 }));
  const html = renderMonth('2026-11-11', items, '2026-11-11');
  assert.equal((html.match(/data-m4-date=/g) || []).length, 43);
  assert.equal((html.match(/class="month-day/g) || []).length, 42);
  assert.equal((html.match(/class="month-event/g) || []).length, 3);
  assert.match(html, /\+2 citas más/);
});
test('métricas comparten la jerarquía de demo sin inventar cifras', () => {
  const html = renderMetrics([item], '2026-11-11');
  assert.equal((html.match(/class="stat-card"/g) || []).length, 4);
  assert.match(html, /Citas del día/); assert.match(html, /stat-number">01/);
  assert.match(renderMetrics(null, '2026-11-11'), /stat-number">…/);
});
