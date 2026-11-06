import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentLocks, branchAssignmentForm, clearAssignmentDraft } from '../src/shared/screens/disponibilidad/branch-assignments.js';
import { capacityHtml, clearCatalogButton, hasCatalogFilters } from '../src/shared/screens/catalog-header.js';
import { loadRoleCapacities, roleCapacity, clearRoleCapacities } from '../src/connected/modules/catalogos/capacity.js';
import { offeringPanel } from '../src/shared/screens/disponibilidad/offering.js';

test('asignación bloqueada conserva el valor para FormData y muestra causa', () => {
  clearAssignmentDraft();
  const person = { id: 8, branchIds: [2] };
  const locks = assignmentLocks(person, [{ id: 1, professionalId: 8, branchId: 2, enabled: false }]);
  assert.ok(locks.has(2));
  assert.equal(assignmentLocks(person, [{ id: -1, professionalId: 8, branchId: 3 }]).size, 0);
  const html = branchAssignmentForm(person, [{ id: 2, name: 'Centro', active: true }], false, locks);
  assert.match(html, /type="checkbox"[^>]*checked[^>]*disabled/);
  assert.match(html, /type="hidden" name="branchIds" value="2"/);
  assert.match(html, /Asignación requerida|aria-describedby/);
});
test('limpiar considera búsqueda efectiva y todos los filtros, sin alterar vista', () => {
  assert.equal(hasCatalogFilters({ search: '  ', status: 'all' }), false);
  for (const ui of [{ search: 'a', status: 'all' }, { search: '', status: 'inactive' }, { search: '', branch: '2' }]) assert.ok(hasCatalogFilters(ui));
  assert.match(clearCatalogButton('professional', { search: '', status: 'all' }), /disabled/);
  assert.doesNotMatch(clearCatalogButton('professional', { search: 'a', status: 'all' }), /disabled/);
});
test('cupos por rol: rutas autorizadas, respuesta validada y fallo sin cifras ficticias', async () => {
  clearRoleCapacities();
  const paths = [];
  await loadRoleCapacities(async (path) => { paths.push(path); if (path.includes('recepcionistas')) throw Error('503'); return { limite: 5, activos: 2, disponibles: 3 }; });
  assert.deepEqual(paths.sort(), ['/profesionales/cupo', '/recepcionistas/cupo']);
  assert.equal(roleCapacity('profesionales').activos, 2);
  assert.equal(roleCapacity('recepcionistas'), null);
  assert.match(capacityHtml('Recepción', null), /no disponible/);
  assert.match(capacityHtml('Profesionales', roleCapacity('profesionales')), /2 de 5/);
});
test('oferta separa estado y causas de la API y escapa nombres', () => {
  const html = offeringPanel({ id: 7, name: '<Persona>' }, { sucursales: [{ id: 2, nombre: 'Centro', sucursalActiva: true, atencionActiva: true, servicios: [{ id: 3, nombre: '<Servicio>', ofrecido: false, motivosExclusion: ['servicio_no_seleccionado'] }] }] });
  assert.match(html, /No ofrecido/); assert.match(html, /No seleccionado en general/);
  assert.match(html, /0 de 1 servicios ofrecidos/); assert.doesNotMatch(html, /<Persona>|<Servicio>/);
  assert.match(html, /data-offering-select/);
});
