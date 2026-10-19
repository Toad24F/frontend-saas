import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedAvailabilityGroups,
  groupForAvailabilityTab,
  resolveAvailabilityGroup,
} from '../src/shared/screens/disponibilidad/groups.js';

test('los grupos visibles respetan el rol y la demo', () => {
  assert.deepEqual(allowedAvailabilityGroups(false, 'admin_negocio').map(({ id }) => id), ['equipo', 'negocio', 'comprobar']);
  assert.deepEqual(allowedAvailabilityGroups(false, 'profesional').map(({ id }) => id), ['equipo', 'comprobar']);
  assert.deepEqual(allowedAvailabilityGroups(false, 'recepcionista').map(({ id }) => id), ['comprobar']);
  assert.deepEqual(allowedAvailabilityGroups(false, 'superadmin'), []);
  assert.deepEqual(allowedAvailabilityGroups(true, null).map(({ id }) => id), ['equipo', 'negocio', 'comprobar']);
});

test('una ruta no permitida vuelve al primer grupo accesible', () => {
  assert.equal(resolveAvailabilityGroup('negocio', false, 'profesional'), 'equipo');
  assert.equal(resolveAvailabilityGroup('equipo', false, 'recepcionista'), 'comprobar');
  assert.equal(resolveAvailabilityGroup('desconocido', true, null), 'equipo');
  assert.equal(resolveAvailabilityGroup('equipo', false, 'superadmin'), '');
});

test('las pestañas existentes quedan en el grupo correspondiente', () => {
  for (const id of ['branches', 'schedule', 'offering', 'changes', 'team-empty']) assert.equal(groupForAvailabilityTab(id), 'equipo');
  assert.equal(groupForAvailabilityTab('configuration'), 'negocio');
  for (const id of ['projection', 'slots', 'affected']) assert.equal(groupForAvailabilityTab(id), 'comprobar');
  assert.equal(groupForAvailabilityTab('inexistente'), '');
});
