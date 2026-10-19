import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentDraft, branchAssignmentForm, clearAssignmentDraft, sameBranchIds, validateAssignmentSnapshot } from '../src/shared/screens/disponibilidad/branch-assignments.js';

test('las asignaciones comparan conjuntos y conservan borradores al cambiar de profesional', () => {
  clearAssignmentDraft();
  assert.equal(sameBranchIds([3, 1], [1, 3]), true);
  assert.equal(sameBranchIds([1, 3], [1, 2]), false);
  assignmentDraft(10, [1]).selected = [1, 3];
  assignmentDraft(11, [2]);
  assert.deepEqual(assignmentDraft(10, [1]).selected, [1, 3]);
  clearAssignmentDraft(10);
  assert.deepEqual(assignmentDraft(10, [1]).selected, [1]);
});

test('una sucursal inactiva nueva no se puede marcar; una ya asignada sí se puede quitar', () => {
  clearAssignmentDraft();
  const branches = [
    { id: 1, name: 'Centro', active: false },
    { id: 2, name: 'Norte', active: false },
    { id: 3, name: 'Sur', active: true },
  ];
  const html = branchAssignmentForm({ id: 10, branchIds: [1] }, branches);
  assert.match(html, /value="1" checked\s+aria-label="Asignar Centro"/);
  assert.match(html, /value="2"\s+disabled\s+aria-label="Asignar Norte"/);
  assert.match(html, /value="3"\s+aria-label="Asignar Sur"/);
  assert.match(html, /Sin cambios pendientes/);
  assert.match(html, /Guardar asignaciones<\/button>/);
});

test('el guardado detecta cambios ajenos y sucursales inactivas o eliminadas', () => {
  const branches = [{ id: 1, activo: true }, { id: 2, activo: false }, { id: 3, activo: true }];
  assert.doesNotThrow(() => validateAssignmentSnapshot([1, 2], [1, 2, 3], [2, 1], branches));
  assert.throws(() => validateAssignmentSnapshot([1], [1, 3], [1, 2], branches), /cambiaron/);
  assert.throws(() => validateAssignmentSnapshot([1], [1, 2], [1], branches), /no está disponible/);
  assert.throws(() => validateAssignmentSnapshot([1], [1, 4], [1], branches), /no está disponible/);
});
