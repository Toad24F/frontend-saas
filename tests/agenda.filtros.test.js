import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverSucursalesAgenda } from '../src/shared/screens/agenda/agenda.filtros.js';
const branches = [{ id: 3, name: 'Sur', active: true }, { id: 1, name: 'Norte', active: true }, { id: 2, name: 'Centro', active: true }];
const professionals = [{ id: 1, branchIds: [1] }, { id: 2, branchIds: [1, 2] }, { id: 3, branchIds: [] }];
const resolve = (args) => resolverSucursalesAgenda({ sucursales: branches, profesionales: professionals, sucursal: 'all', profesional: 'all', ...args });
test('inicio estable, profesional principal y selección compatible', () => {
  assert.equal(resolve({ inicial: true }).sucursal, '2');
  assert.equal(resolve({ inicial: true, sucursal: '1' }).sucursal, '1');
  assert.equal(resolve({ profesional: '1' }).sucursal, '1');
  assert.equal(resolve({ profesional: '2', sucursal: '1' }).sucursal, '1');
  assert.equal(resolve({ profesional: '2', sucursal: '3' }).sucursal, '2');
  assert.equal(resolve({ profesional: '2' }).sucursal, 'all');
  assert.equal(resolve({ sucursal: '3' }).sucursal, '3');
});
test('asignaciones vacías y desconocidas no son equivalentes; histórico es explícito', () => {
  assert.equal(resolve({ profesional: '3' }).sucursal, 'none');
  assert.equal(resolve({ profesional: '9', sucursal: '3' }).conocido, false);
  assert.equal(resolve({ profesional: '1', sucursal: '3', historial: true }).sucursal, '3');
  assert.deepEqual(resolve({ profesional: '1' }).opciones.map((x) => x.id), [1]);
});
