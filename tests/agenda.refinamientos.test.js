import test from 'node:test';
import assert from 'node:assert/strict';
import { leyendaAgenda, metricasAgenda, esqueletoCalendario, distribuirEventos } from '../src/shared/screens/agenda/agenda.presentacion.js';

// Regresión de las mejoras acordadas: datos reales separados de placeholders y geometría de tarjetas.
test('métricas compactas sin frases auxiliares y skeleton sin números ficticios', () => {
  const html = metricasAgenda([{ date: '2026-11-11', status: 'confirmada' }], '2026-11-11');
  assert.equal((html.match(/class="tarjeta-indicador"/g) || []).length, 4);
  assert.match(html, /indicador-valor">01/);
  assert.doesNotMatch(html, /indicador-texto|Tu jornada|Todo listo|Atención que/);
  const pendiente = metricasAgenda(null, '2026-11-11');
  assert.match(pendiente, /aria-busy="true"/); assert.match(pendiente, /esqueleto-relleno/);
  assert.doesNotMatch(pendiente, /indicador-valor">00/);
  const fallido = metricasAgenda(null, '2026-11-11', { loading: false });
  assert.match(fallido, /Sin datos/); assert.doesNotMatch(fallido, /esqueleto-numero/);
});
test('leyenda accesible conserva los cinco estados y skeleton respeta día, semana y 42 fechas', () => {
  const leyenda = leyendaAgenda();
  for (const estadoCita of ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio']) assert.match(leyenda, new RegExp(`legend-dot ${estadoCita}`));
  assert.match(leyenda, /Estados de las citas/);
  for (const vista of ['day', 'week', 'month']) {
    const html = esqueletoCalendario(vista);
    assert.match(html, /Cargando citas/); assert.match(html, /aria-hidden="true"/);
    assert.doesNotMatch(html, /data-agenda-cita|calendario-evento/);
    if (vista === 'month') assert.equal((html.match(/esqueleto-celda-mes/g) || []).length, 42);
  }
});
test('citas consecutivas y cortas tienen separación y no se superponen visualmente', () => {
  const elementos = Array.from({ length: 8 }, (_, indice) => ({ id: indice + 1, start: `09:${String(indice * 5).padStart(2, '0')}`, end: `09:${String(indice * 5 + 5).padStart(2, '0')}` }));
  const distribucion = distribuirEventos(elementos, 540);
  for (const [indice, a] of elementos.entries()) for (const b of elementos.slice(indice + 1)) {
    const x = distribucion.get(a.id), y = distribucion.get(b.id);
    const solapamientoHorizontal = Math.min(x.left + x.width, y.left + y.width) - Math.max(x.left, y.left);
    const solapamientoVertical = Math.min(x.top + x.height, y.top + y.height) - Math.max(x.top, y.top);
    assert.ok(solapamientoHorizontal <= 0.01 || solapamientoVertical <= 0, `${a.id} y ${b.id} se superponen`);
  }
  const consecutivo = distribuirEventos([{ id: 1, start: '09:00', end: '09:30' }, { id: 2, start: '09:30', end: '10:00' }], 540);
  assert.equal(consecutivo.get(1).height, 44);
  assert.equal(consecutivo.get(2).top - consecutivo.get(1).top - consecutivo.get(1).height, 4);
});
