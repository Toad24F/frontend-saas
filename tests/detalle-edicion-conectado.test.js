import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEditableResource } from '../src/connected/modules/catalogos/detail.js';

test('edición de catálogos abre con la ficha individual reciente', async () => {
  const calls = [];
  const responses = {
    '/servicios/7': { nombre: 'Consulta nueva', descripcion: null, duracionMinutos: 30, costo: '250.00', activo: false, creadorPersonalId: 3 },
    '/sucursales/8': { nombre: 'Norte', direccion: 'Calle nueva', telefono: '6141234567', zonaHoraria: 'America/Chihuahua', urlGoogleMaps: null, notasLlegada: 'Planta baja', activo: true },
  };
  const request = async (path) => { calls.push(path); return responses[path]; };
  const service = await loadEditableResource('services', { id: 7, name: 'Nombre viejo', color: 'blue' }, request);
  const branch = await loadEditableResource('branches', { id: 8, name: 'Nombre viejo', color: 'orange' }, request);
  assert.deepEqual(calls, ['/servicios/7', '/sucursales/8']);
  assert.equal(service.name, 'Consulta nueva');
  assert.equal(service.price, 250);
  assert.equal(service.color, 'blue');
  assert.equal(branch.name, 'Norte');
  assert.equal(branch.notes, 'Planta baja');
  assert.equal(branch.color, 'orange');
});

test('edición de profesional refresca perfil y asignaciones del mismo ID', async () => {
  const calls = [];
  const responses = {
    '/profesionales/9': { nombre: 'María actual', correo: 'maria@example.com', especialidad: 'Medicina', activo: true },
    '/profesionales/9/sucursales': [8],
    '/profesionales/9/servicios': [{ id: 7, seleccionado: true }, { id: 10, seleccionado: false }],
    '/servicios': [{ id: 7, nombre: 'Consulta', activo: true }],
    '/sucursales': [{ id: 8, nombre: 'Norte' }],
  };
  const person = await loadEditableResource('professionals', { id: 9, name: 'María anterior', branchIds: [2], serviceIds: [10] }, async (path) => { calls.push(path); return responses[path]; });
  assert.deepEqual(calls, ['/profesionales/9', '/profesionales/9/sucursales', '/profesionales/9/servicios', '/servicios', '/sucursales']);
  assert.equal(person.name, 'María actual');
  assert.deepEqual(person.branchIds, [8]);
  assert.deepEqual(person.serviceIds, [7]);
  assert.deepEqual(person.catalogServices, [{ id: 7, name: 'Consulta', active: true }]);
  assert.deepEqual(person.catalogBranches, [{ id: 8, name: 'Norte' }]);
});

test('la edición rechaza IDs inválidos y propaga una ficha eliminada', async () => {
  await assert.rejects(loadEditableResource('services', { id: 0 }), /no válido/);
  await assert.rejects(loadEditableResource('services', { id: 3 }, async () => { throw new Error('Servicio no disponible.'); }), /no disponible/);
});
