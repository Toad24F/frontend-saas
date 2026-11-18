import test from 'node:test';
import assert from 'node:assert/strict';
import { atencionEquipo, huecosAtencion } from '../src/shared/screens/agenda/agenda.utilidades.js';
const day = '2026-11-16';
const model = (start, end, branch = 1) => ({ data: { intervalos: [{ fecha: day, sucursalId: branch, inicioMinutos: start, finMinutos: end }], omisiones: [] } });
test('semana sombrea solo donde ninguno atiende, respetando sucursal', () => {
  const team = atencionEquipo({ 1: model(540, 720), 2: model(660, 900), 3: model(960, 1080, 2) });
  assert.deepEqual(huecosAtencion(team.data, day, 'all', 540, 1080), [{ start: 900, end: 960 }]);
  assert.deepEqual(huecosAtencion(team.data, day, '1', 540, 1080), [{ start: 900, end: 1080 }]);
});
test('un equipo parcial, con errores o pendiente nunca afirma cierre', () => {
  assert.equal(atencionEquipo({ 1: model(540, 720), 2: { error: 'Fallo' } }).data, undefined);
  assert.equal(atencionEquipo({ 1: { busy: true } }).busy, true);
  assert.equal(atencionEquipo({ 1: model(540, 720) }, false).data, undefined);
  assert.equal(atencionEquipo({}).data, undefined);
});
