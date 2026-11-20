import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentosLineaTiempo, rangoLineaTiempo, renderLineaTiempo, renderMes, renderMetricas } from '../src/connected/screens/agenda/agenda.presentacion.js';

const item = { id: 7, estado: 'confirmada', fechaLocal: '2026-11-11', fechaFinLocal: '2026-11-11', horaInicio: '10:00:00', horaFin: '10:45:00', nombreContacto: 'Paciente <QA>', nombreServicio: 'Consulta', nombreProfesional: 'Profesional', zonaHoraria: 'America/Tijuana', causas: [] };
// Primero se fija la presentación esperada: clases y geometría de la demo, con datos reales.
test('la agenda conectada usa cuadrícula horaria y tarjeta de estado de la demo', () => {
  const html = renderLineaTiempo(['2026-11-11'], [item], '2026-11-11');
  assert.match(html, /calendario-semana dia-unico/);
  assert.match(html, /columna-horas/);
  assert.match(html, /calendario-evento confirmada/);
  const scale = Number(html.match(/--alto-hora:([\d.]+)px/)[1]);
  assert.ok(scale >= 96);
  assert.ok(html.includes(`top:${scale + 2}px`));
  assert.match(html, /Paciente &lt;QA&gt;/);
  assert.match(html, /America\/Tijuana/);
  assert.doesNotMatch(html, /bloque-descanso|data-horario-fecha/);
  assert.match(html, /data-agenda-reloj/);
  assert.match(html, /data-reloj-zona="America\/Tijuana"/);
});
test('horas fuera de 09–18 y continuación nocturna siguen visibles', () => {
  const late = { ...item, horaInicio: '23:30:00', fechaFinLocal: '2026-11-12', horaFin: '00:15:00' };
  const parts = segmentosLineaTiempo([late], ['2026-11-11', '2026-11-12']);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].end, '24:00'); assert.equal(parts[1].start, '00:00');
  assert.deepEqual(rangoLineaTiempo(parts), { primeraHora: 0, ultimaHora: 24 });
  assert.deepEqual(rangoLineaTiempo(segmentosLineaTiempo([item], ['2026-11-11'])), { primeraHora: 9, ultimaHora: 18 });
});
test('mes conserva 42 fechas, tres citas y acceso a las restantes como en demo', () => {
  const items = Array.from({ length: 5 }, (_, index) => ({ ...item, id: index + 1 }));
  const html = renderMes('2026-11-11', items, '2026-11-11');
  assert.equal((html.match(/data-agenda-fecha=/g) || []).length, 43);
  assert.equal((html.match(/class="mes-dia/g) || []).length, 42);
  assert.equal((html.match(/class="mes-evento /g) || []).length, 3);
  assert.match(html, /\+2 citas más/);
});
test('métricas comparten la jerarquía de demo sin inventar cifras', () => {
  const html = renderMetricas([item], '2026-11-11');
  assert.equal((html.match(/class="tarjeta-indicador"/g) || []).length, 4);
  assert.match(html, /Citas del día/); assert.match(html, /indicador-valor">01/);
  assert.match(renderMetricas(null, '2026-11-11'), /esqueleto-numero/);
});
