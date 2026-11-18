import test from 'node:test';
import assert from 'node:assert/strict';
import { huecosAtencion } from '../src/shared/screens/agenda/agenda.utilidades.js';
import { atencionDemo } from '../src/demo/agenda.atencion.js';
import { renderLineaTiempo } from '../src/shared/screens/agenda/agenda.linea-tiempo.js';
const day = '2026-11-16';
const data = { intervalos: [{ fecha: day, sucursalId: 1, inicioMinutos: 480, finMinutos: 720 }, { fecha: day, sucursalId: 2, inicioMinutos: 840, finMinutos: 1080 }], omisiones: [] };
test('todas combina sedes y una omisión impide afirmar cierre completo', () => {
  assert.deepEqual(huecosAtencion(data, day, 'all', 480, 1080), [{ start: 720, end: 840 }]);
  assert.deepEqual(huecosAtencion({ ...data, omisiones: [{ fecha: day, sucursalId: 2 }] }, day, 'all', 480, 1080), []);
});
test('no combina referencias horarias diferentes ni duplica huecos de intervalos solapados', () => {
  const intervals = data.intervalos.map((x, i) => ({ ...x, inicioUtc: `${day}T${i ? '21' : '14'}:00:00Z` }));
  assert.deepEqual(huecosAtencion({ ...data, intervalos: intervals }, day, 'all', 480, 1080), []);
  assert.deepEqual(huecosAtencion({ ...data, intervalos: [...data.intervalos, { fecha: day, sucursalId: 3, inicioMinutos: 700, finMinutos: 900 }] }, day, 'all', 480, 1080), []);
});
test('demo admite todas las sedes para una persona', () => {
  const model = atencionDemo([day], '1', 'all', [{ enabled: true, professionalId: 1, branchId: 2, day: 1, start: '08:00', end: '12:00' }], []);
  assert.equal(model.intervalos[0].sucursalId, 2);
});
test('cada columna conserva su atención y el error no inventa cierre', () => {
  const html = renderLineaTiempo([day], [], day, { profesional: 'all', sucursal: 'all', profesionales: [{ id: 1, name: 'Ana' }, { id: 2, name: 'Beto' }], atencionPorProfesional: { 1: { data }, 2: { error: 'No se pudo consultar' } } });
  const columns = html.split('data-calendario-profesional=');
  assert.match(columns[1], /agenda-sin-atencion/);
  assert.doesNotMatch(columns[2], /agenda-sin-atencion/);
  assert.match(columns[2], /No se pudo consultar/);
});
