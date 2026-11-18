import test from 'node:test';
import assert from 'node:assert/strict';
import { leyendaAgenda, metricasAgenda, esqueletoCalendario, referenciaEvento, distribuirEventos } from '../src/shared/screens/agenda/agenda.presentacion.js';

// Regresión de las mejoras acordadas: datos reales separados de placeholders y geometría de tarjetas.
test('métricas compactas sin frases auxiliares y skeleton sin números ficticios', () => {
  const html = metricasAgenda([{ date: '2026-11-11', status: 'confirmada' }], '2026-11-11');
  assert.equal((html.match(/class="stat-card"/g) || []).length, 4);
  assert.match(html, /stat-number">01/);
  assert.doesNotMatch(html, /stat-caption|Tu jornada|Todo listo|Atención que/);
  const pending = metricasAgenda(null, '2026-11-11');
  assert.match(pending, /aria-busy="true"/); assert.match(pending, /esqueleto-relleno/);
  assert.doesNotMatch(pending, /stat-number">00/);
  const failed = metricasAgenda(null, '2026-11-11', { loading: false });
  assert.match(failed, /Sin datos/); assert.doesNotMatch(failed, /esqueleto-numero/);
});
test('leyenda accesible conserva los cinco estados y skeleton respeta día, semana y 42 fechas', () => {
  const legend = leyendaAgenda();
  for (const status of ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio']) assert.match(legend, new RegExp(`legend-dot ${status}`));
  assert.match(legend, /Estados de las citas/);
  for (const view of ['day', 'week', 'month']) {
    const html = esqueletoCalendario(view);
    assert.match(html, /Cargando citas/); assert.match(html, /aria-hidden="true"/);
    assert.doesNotMatch(html, /data-agenda-cita|calendario-evento/);
    if (view === 'month') assert.equal((html.match(/esqueleto-celda-mes/g) || []).length, 42);
  }
});
test('referencia usa folio real abreviado o ID sin inventar identificadores ni insertar HTML', () => {
  assert.match(referenciaEvento('M-ABC123456', 7), /#23456/);
  assert.match(referenciaEvento(null, 7), /#7/);
  assert.doesNotMatch(referenciaEvento('<script>', 7), /<script>/);
});
test('citas consecutivas y cortas tienen separación y no se superponen visualmente', () => {
  const items = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, start: `09:${String(i * 5).padStart(2, '0')}`, end: `09:${String(i * 5 + 5).padStart(2, '0')}` }));
  const layout = distribuirEventos(items, 540);
  for (const [i, a] of items.entries()) for (const b of items.slice(i + 1)) {
    const x = layout.get(a.id), y = layout.get(b.id);
    const overlapX = Math.min(x.left + x.width, y.left + y.width) - Math.max(x.left, y.left);
    const overlapY = Math.min(x.top + x.height, y.top + y.height) - Math.max(x.top, y.top);
    assert.ok(overlapX <= 0.01 || overlapY <= 0, `${a.id} y ${b.id} se superponen`);
  }
  const consecutive = distribuirEventos([{ id: 1, start: '09:00', end: '09:30' }, { id: 2, start: '09:30', end: '10:00' }], 540);
  assert.equal(consecutive.get(1).height, 44);
  assert.equal(consecutive.get(2).top - consecutive.get(1).top - consecutive.get(1).height, 4);
});
