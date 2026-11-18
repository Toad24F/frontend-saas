import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gruposDisponibilidadPermitidos,
  grupoDePestanaDisponibilidad,
  resolverGrupoDisponibilidad,
} from '../src/shared/screens/disponibilidad/disponibilidad.grupos.js';

test('los grupos visibles respetan el rol y la demo', () => {
  assert.deepEqual(gruposDisponibilidadPermitidos(false, 'admin_negocio').map(({ id }) => id), ['equipo', 'negocio', 'comprobar']);
  assert.deepEqual(gruposDisponibilidadPermitidos(false, 'profesional').map(({ id }) => id), ['equipo', 'comprobar']);
  assert.deepEqual(gruposDisponibilidadPermitidos(false, 'recepcionista').map(({ id }) => id), ['comprobar']);
  assert.deepEqual(gruposDisponibilidadPermitidos(false, 'superadmin'), []);
  assert.deepEqual(gruposDisponibilidadPermitidos(true, null).map(({ id }) => id), ['equipo', 'negocio', 'comprobar']);
});

test('una ruta no permitida vuelve al primer grupo accesible', () => {
  assert.equal(resolverGrupoDisponibilidad('negocio', false, 'profesional'), 'equipo');
  assert.equal(resolverGrupoDisponibilidad('equipo', false, 'recepcionista'), 'comprobar');
  assert.equal(resolverGrupoDisponibilidad('desconocido', true, null), 'equipo');
  assert.equal(resolverGrupoDisponibilidad('equipo', false, 'superadmin'), '');
});

test('las pestañas existentes quedan en el grupo correspondiente', () => {
  for (const id of ['sucursales', 'horario', 'oferta', 'bloqueos', 'equipo-vacio']) assert.equal(grupoDePestanaDisponibilidad(id), 'equipo');
  assert.equal(grupoDePestanaDisponibilidad('configuracion'), 'negocio');
  for (const id of ['proyeccion', 'horarios', 'afectadas']) assert.equal(grupoDePestanaDisponibilidad(id), 'comprobar');
  assert.equal(grupoDePestanaDisponibilidad('inexistente'), '');
});
