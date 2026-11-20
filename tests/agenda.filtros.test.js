import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverSucursalesAgenda } from '../src/shared/screens/agenda/agenda.filtros.js';
const sucursales = [{ id: 3, name: 'Sur', active: true }, { id: 1, name: 'Norte', active: true }, { id: 2, name: 'Centro', active: true }];
const profesionales = [{ id: 1, branchIds: [1] }, { id: 2, branchIds: [1, 2] }, { id: 3, branchIds: [] }];
const resolverPromesa = (argumentos) => resolverSucursalesAgenda({ sucursales: sucursales, profesionales: profesionales, sucursal: 'all', profesional: 'all', ...argumentos });
test('inicio estable, profesional principal y selección compatible', () => {
  assert.equal(resolverPromesa({ inicial: true }).sucursal, '2');
  assert.equal(resolverPromesa({ inicial: true, sucursal: '1' }).sucursal, '1');
  assert.equal(resolverPromesa({ profesional: '1' }).sucursal, '1');
  assert.equal(resolverPromesa({ profesional: '2', sucursal: '1' }).sucursal, '1');
  assert.equal(resolverPromesa({ profesional: '2', sucursal: '3' }).sucursal, '2');
  assert.equal(resolverPromesa({ profesional: '2' }).sucursal, 'all');
  assert.equal(resolverPromesa({ sucursal: '3' }).sucursal, '3');
});
test('asignaciones vacías y desconocidas no son equivalentes; histórico es explícito', () => {
  assert.equal(resolverPromesa({ profesional: '3' }).sucursal, 'none');
  assert.equal(resolverPromesa({ profesional: '9', sucursal: '3' }).conocido, false);
  assert.equal(resolverPromesa({ profesional: '1', sucursal: '3', historial: true }).sucursal, '3');
  assert.deepEqual(resolverPromesa({ profesional: '1' }).opciones.map((x) => x.id), [1]);
});
