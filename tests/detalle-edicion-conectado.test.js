import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarRegistroEditable } from '../src/connected/modules/catalogos/catalogos.detalle.js';

test('edición de catálogos abre con la ficha individual reciente', async () => {
  const llamadas = [];
  const respuestas = {
    '/servicios/7': { nombre: 'Consulta nueva', descripcion: null, duracionMinutos: 30, costo: '250.00', activo: false, creadorPersonalId: 3 },
    '/sucursales/8': { nombre: 'Norte', direccion: 'Calle nueva', telefono: '6141234567', zonaHoraria: 'America/Chihuahua', urlGoogleMaps: null, notasLlegada: 'Planta baja', activo: true },
  };
  const solicitar = async (ruta) => { llamadas.push(ruta); return respuestas[ruta]; };
  const servicio = await consultarRegistroEditable('services', { id: 7, name: 'Nombre viejo', color: 'azul' }, solicitar);
  const sucursal = await consultarRegistroEditable('branches', { id: 8, name: 'Nombre viejo', color: 'naranja' }, solicitar);
  assert.deepEqual(llamadas, ['/servicios/7', '/sucursales/8']);
  assert.equal(servicio.name, 'Consulta nueva');
  assert.equal(servicio.price, 250);
  assert.equal(servicio.color, 'azul');
  assert.equal(sucursal.name, 'Norte');
  assert.equal(sucursal.notes, 'Planta baja');
  assert.equal(sucursal.color, 'naranja');
});

test('edición de profesional refresca solo el perfil', async () => {
  const llamadas = [];
  const respuestas = {
    '/profesionales/9': { nombre: 'María actual', correo: 'maria@example.com', especialidad: 'Medicina', activo: true },
  };
  const persona = await consultarRegistroEditable('professionals', { id: 9, name: 'María anterior', branchIds: [2], serviceIds: [10] }, async (ruta) => { llamadas.push(ruta); return respuestas[ruta]; });
  assert.deepEqual(llamadas, ['/profesionales/9']);
  assert.equal(persona.name, 'María actual');
  assert.deepEqual(persona.branchIds, [2]);
  assert.deepEqual(persona.serviceIds, [10]);
});

test('la edición rechaza IDs inválidos y propaga una ficha eliminada', async () => {
  await assert.rejects(consultarRegistroEditable('services', { id: 0 }), /no válido/);
  await assert.rejects(consultarRegistroEditable('services', { id: 3 }, async () => { throw new Error('Servicio no disponible.'); }), /no disponible/);
});
