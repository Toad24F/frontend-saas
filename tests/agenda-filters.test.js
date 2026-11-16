import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAgendaBranches } from '../src/shared/screens/agenda/filters.js';
const branches = [{ id: 3, name: 'Sur', active: true }, { id: 1, name: 'Norte', active: true }, { id: 2, name: 'Centro', active: true }];
const professionals = [{ id: 1, branchIds: [1] }, { id: 2, branchIds: [1, 2] }, { id: 3, branchIds: [] }];
const resolve = (args) => resolveAgendaBranches({ branches, professionals, branch: 'all', professional: 'all', ...args });
test('inicio estable, profesional principal y selección compatible', () => {
  assert.equal(resolve({ initial: true }).branch, '2');
  assert.equal(resolve({ initial: true, branch: '1' }).branch, '1');
  assert.equal(resolve({ professional: '1' }).branch, '1');
  assert.equal(resolve({ professional: '2', branch: '1' }).branch, '1');
  assert.equal(resolve({ professional: '2', branch: '3' }).branch, '2');
  assert.equal(resolve({ professional: '2' }).branch, 'all');
  assert.equal(resolve({ branch: '3' }).branch, '3');
});
test('asignaciones vacías y desconocidas no son equivalentes; histórico es explícito', () => {
  assert.equal(resolve({ professional: '3' }).branch, 'none');
  assert.equal(resolve({ professional: '9', branch: '3' }).known, false);
  assert.equal(resolve({ professional: '1', branch: '3', history: true }).branch, '3');
  assert.deepEqual(resolve({ professional: '1' }).options.map((x) => x.id), [1]);
});
