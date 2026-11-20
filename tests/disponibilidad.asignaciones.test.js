import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarBorradorAsignaciones, renderFormularioAsignaciones, limpiarBorradorAsignaciones, mismasSucursalesIds, validarAsignacionesVigentes } from '../src/shared/screens/disponibilidad/disponibilidad.asignaciones-sucursales.js';

test('las asignaciones comparan conjuntos y conservan borradores al cambiar de profesional', () => {
  limpiarBorradorAsignaciones();
  assert.equal(mismasSucursalesIds([3, 1], [1, 3]), true);
  assert.equal(mismasSucursalesIds([1, 3], [1, 2]), false);
  consultarBorradorAsignaciones(10, [1]).seleccionadas = [1, 3];
  consultarBorradorAsignaciones(11, [2]);
  assert.deepEqual(consultarBorradorAsignaciones(10, [1]).seleccionadas, [1, 3]);
  limpiarBorradorAsignaciones(10);
  assert.deepEqual(consultarBorradorAsignaciones(10, [1]).seleccionadas, [1]);
});

test('una sucursal inactiva nueva no se puede marcar; una ya asignada sí se puede quitar', () => {
  limpiarBorradorAsignaciones();
  const sucursales = [
    { id: 1, name: 'Centro', active: false },
    { id: 2, name: 'Norte', active: false },
    { id: 3, name: 'Sur', active: true },
  ];
  const html = renderFormularioAsignaciones({ id: 10, branchIds: [1] }, sucursales);
  assert.match(html, /value="1" checked\s+aria-label="Asignar Centro"/);
  assert.match(html, /value="2"\s+disabled\s+aria-label="Asignar Norte"/);
  assert.match(html, /value="3"\s+aria-label="Asignar Sur"/);
  assert.match(html, /Sin cambios pendientes/);
  assert.match(html, /Guardar asignaciones<\/button>/);
});

test('el guardado detecta cambios ajenos y sucursales inactivas o eliminadas', () => {
  const sucursales = [{ id: 1, activo: true }, { id: 2, activo: false }, { id: 3, activo: true }];
  assert.doesNotThrow(() => validarAsignacionesVigentes([1, 2], [1, 2, 3], [2, 1], sucursales));
  assert.throws(() => validarAsignacionesVigentes([1], [1, 3], [1, 2], sucursales), /cambiaron/);
  assert.throws(() => validarAsignacionesVigentes([1], [1, 2], [1], sucursales), /no está disponible/);
  assert.throws(() => validarAsignacionesVigentes([1], [1, 4], [1], sucursales), /no está disponible/);
});
