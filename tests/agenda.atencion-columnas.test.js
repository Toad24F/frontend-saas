import test from 'node:test';
import assert from 'node:assert/strict';
import { huecosAtencion } from '../src/shared/screens/agenda/agenda.utilidades.js';
import { atencionDemo } from '../src/demo/agenda.atencion.js';
import { renderLineaTiempo } from '../src/shared/screens/agenda/agenda.linea-tiempo.js';
const dia = '2026-11-16';
const datos = { intervalos: [{ fecha: dia, sucursalId: 1, inicioMinutos: 480, finMinutos: 720 }, { fecha: dia, sucursalId: 2, inicioMinutos: 840, finMinutos: 1080 }], omisiones: [] };
test('todas combina sedes y una omisión impide afirmar cierre completo', () => {
  assert.deepEqual(huecosAtencion(datos, dia, 'all', 480, 1080), [{ start: 720, end: 840 }]);
  assert.deepEqual(huecosAtencion({ ...datos, omisiones: [{ fecha: dia, sucursalId: 2 }] }, dia, 'all', 480, 1080), []);
});
test('no combina referencias horarias diferentes ni duplica huecos de intervalos solapados', () => {
  const intervalos = datos.intervalos.map((x, indice) => ({ ...x, inicioUtc: `${dia}T${indice ? '21' : '14'}:00:00Z` }));
  assert.deepEqual(huecosAtencion({ ...datos, intervalos: intervalos }, dia, 'all', 480, 1080), []);
  assert.deepEqual(huecosAtencion({ ...datos, intervalos: [...datos.intervalos, { fecha: dia, sucursalId: 3, inicioMinutos: 700, finMinutos: 900 }] }, dia, 'all', 480, 1080), []);
});
test('demo admite todas las sedes para una persona', () => {
  const modelo = atencionDemo([dia], '1', 'all', [{ enabled: true, professionalId: 1, branchId: 2, day: 1, start: '08:00', end: '12:00' }], []);
  assert.equal(modelo.intervalos[0].sucursalId, 2);
});
test('cada columna conserva su atención y el error no inventa cierre', () => {
  const html = renderLineaTiempo([dia], [], dia, { profesional: 'all', sucursal: 'all', profesionales: [{ id: 1, name: 'Ana' }, { id: 2, name: 'Beto' }], atencionPorProfesional: { 1: { data: datos }, 2: { error: 'No se pudo consultar' } } });
  const columnas = html.split('data-calendario-profesional=');
  assert.match(columnas[1], /agenda-sin-atencion/);
  assert.doesNotMatch(columnas[2], /agenda-sin-atencion/);
  assert.match(columnas[2], /No se pudo consultar/);
});
