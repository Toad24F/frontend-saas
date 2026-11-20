import test from 'node:test';
import assert from 'node:assert/strict';
import { atencionEquipo, huecosAtencion } from '../src/shared/screens/agenda/agenda.utilidades.js';
const dia = '2026-11-16';
const modelo = (inicio, fin, sucursal = 1) => ({ data: { intervalos: [{ fecha: dia, sucursalId: sucursal, inicioMinutos: inicio, finMinutos: fin }], omisiones: [] } });
test('semana sombrea solo donde ninguno atiende, respetando sucursal', () => {
  const equipo = atencionEquipo({ 1: modelo(540, 720), 2: modelo(660, 900), 3: modelo(960, 1080, 2) });
  assert.deepEqual(huecosAtencion(equipo.data, dia, 'all', 540, 1080), [{ start: 900, end: 960 }]);
  assert.deepEqual(huecosAtencion(equipo.data, dia, '1', 540, 1080), [{ start: 900, end: 1080 }]);
});
test('un equipo parcial, con errores o pendiente nunca afirma cierre', () => {
  assert.equal(atencionEquipo({ 1: modelo(540, 720), 2: { error: 'Fallo' } }).data, undefined);
  assert.equal(atencionEquipo({ 1: { busy: true } }).busy, true);
  assert.equal(atencionEquipo({ 1: modelo(540, 720) }, false).data, undefined);
  assert.equal(atencionEquipo({}).data, undefined);
});
