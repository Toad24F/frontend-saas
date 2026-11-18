import test from 'node:test';
import assert from 'node:assert/strict';
import { distribuirEventos } from '../src/shared/screens/agenda/agenda.presentacion.js';
import { renderLineaTiempo } from '../src/shared/screens/agenda/agenda.linea-tiempo.js';
import { renderMes } from '../src/shared/screens/agenda/agenda.mes.js';
import { gruposDensos } from '../src/shared/screens/agenda/agenda.utilidades.js';

const day = '2026-11-16';
const item = { id: 1, folio: 'FOLIO-SECRET', estado: 'confirmada', fechaLocal: day, fechaFinLocal: day, horaInicio: '08:00', horaFin: '08:20', personalId: 1, sucursalId: 1, nombreContacto: 'Cliente largo', nombreServicio: 'Consulta', nombreProfesional: 'Ana', nombreSucursal: 'Norte', zonaHoraria: 'America/Chihuahua', causas: [] };
test('consecutivas ocupan ancho completo; solo empalmes reales generan columnas', () => {
  const layout = distribuirEventos([{ id: 1, start: '08:00', end: '08:20' }, { id: 2, start: '08:20', end: '08:40' }]);
  assert.equal(layout.get(1).width, 100); assert.equal(layout.get(2).width, 100);
  const overlap = distribuirEventos([{ id: 1, start: '08:00', end: '09:00' }, { id: 2, start: '08:30', end: '09:30' }]);
  assert.equal(overlap.get(1).width, 50);
});
test('las consecutivas no se agrupan como si fueran simultáneas', () => {
  assert.deepEqual(gruposDensos([{ id: 1, start: '08:00', end: '08:20' }, { id: 2, start: '08:20', end: '08:40' }], 160), []);
});
test('día distribuye por profesional, incluye columnas vacías y elimina folio de tarjetas', () => {
  const html = renderLineaTiempo([day], [item], day, { profesional: 'all', sucursal: 'all', profesionales: [{ id: 1, name: 'Ana', branchIds: [1] }, { id: 2, name: 'Beto', branchIds: [1] }] });
  assert.match(html, /data-calendario-profesional="1"/); assert.match(html, /data-calendario-profesional="2"/);
  assert.match(html, /evento-sucursal/); assert.doesNotMatch(html, /FOLIO-SECRET|evento-folio|Folio/);
  assert.doesNotMatch(renderMes(day, [item], day), /FOLIO-SECRET|evento-folio|Folio/);
});
test('la escala crece para citas cortas manteniendo duración proporcional', () => {
  const html = renderLineaTiempo([day], [item, { ...item, id: 2, horaInicio: '09:00', horaFin: '11:00' }], day, { profesional: '1', sucursal: '1' });
  const scale = Number(html.match(/--alto-hora:([\d.]+)px/)[1]);
  assert.ok(scale >= 240);
  const cards = [...html.matchAll(/class="calendario-evento[^]*?style="top:([\d.]+)px;height:([\d.]+)px/g)];
  assert.equal(cards.length, 2);
  assert.ok(Math.abs((Number(cards[1][2]) + 4) / (Number(cards[0][2]) + 4) - 6) < 0.01);
});
test('campos condicionales y continuidad nocturna conservan una escala común', () => {
  const days = [day, '2026-11-17'];
  const night = { ...item, horaInicio: '23:55', horaFin: '00:10', fechaFinLocal: days[1] };
  const html = renderLineaTiempo(days, [night], day, { profesional: 'all', sucursal: 'all' });
  assert.equal((html.match(/class="calendario-evento /g) || []).length, 2);
  assert.equal((html.match(/class="evento-profesional"/g) || []).length, 2);
  assert.equal((html.match(/class="evento-sucursal"/g) || []).length, 2);
  assert.equal((html.match(/--alto-hora:/g) || []).length, 1);
  const single = renderLineaTiempo([day], [item], day, { profesional: '1', sucursal: '1' });
  assert.doesNotMatch(single, /class="evento-profesional"|class="evento-sucursal"/);
});
test('profesional histórico no se pierde y las columnas no duplican personas por sucursal', () => {
  const html = renderLineaTiempo([day], [item, { ...item, id: 2, sucursalId: 2 }], day, { profesional: 'all', sucursal: 'all', profesionales: [{ id: 1, name: 'Ana', active: false, branchIds: [] }] });
  assert.equal((html.match(/data-calendario-profesional="1"/g) || []).length, 1);
  assert.equal((html.match(/class="calendario-evento /g) || []).length, 2);
});
