import test from 'node:test';
import assert from 'node:assert/strict';
import { bloqueosDeAsignacion, renderFormularioAsignaciones, limpiarBorradorAsignaciones } from '../src/shared/screens/disponibilidad/disponibilidad.asignaciones-sucursales.js';
import { renderCupoCatalogo, renderBotonLimpiarCatalogo, hayFiltrosCatalogo } from '../src/shared/screens/catalogos/catalogos.encabezado.js';
import { cargarCuposPorRol, consultarCupoRol, limpiarCuposPorRol } from '../src/connected/modules/catalogos/catalogos.cupo.js';
import { renderPanelOferta } from '../src/shared/screens/disponibilidad/disponibilidad.oferta.js';

test('asignación bloqueada conserva el valor para FormData y muestra causa', () => {
  limpiarBorradorAsignaciones();
  const persona = { id: 8, branchIds: [2] };
  const bloqueos = bloqueosDeAsignacion(persona, [{ id: 1, professionalId: 8, branchId: 2, enabled: false }]);
  assert.ok(bloqueos.has(2));
  assert.equal(bloqueosDeAsignacion(persona, [{ id: -1, professionalId: 8, branchId: 3 }]).size, 0);
  const html = renderFormularioAsignaciones(persona, [{ id: 2, name: 'Centro', active: true }], false, bloqueos);
  assert.match(html, /type="checkbox"[^>]*checked[^>]*disabled/);
  assert.match(html, /type="hidden" name="branchIds" value="2"/);
  assert.match(html, /Asignación requerida|aria-describedby/);
});
test('limpiar considera búsqueda efectiva y todos los filtros, sin alterar vista', () => {
  assert.equal(hayFiltrosCatalogo({ busqueda: '  ', estado: 'todos' }), false);
  for (const filtros of [{ busqueda: 'a', estado: 'todos' }, { busqueda: '', estado: 'inactivo' }, { busqueda: '', sucursal: '2' }]) assert.ok(hayFiltrosCatalogo(filtros));
  assert.match(renderBotonLimpiarCatalogo('profesional', { busqueda: '', estado: 'todos' }), /disabled/);
  assert.doesNotMatch(renderBotonLimpiarCatalogo('profesional', { busqueda: 'a', estado: 'todos' }), /disabled/);
});
test('cupos por rol: rutas autorizadas, respuesta validada y fallo sin cifras ficticias', async () => {
  limpiarCuposPorRol();
  const rutas = [];
  await cargarCuposPorRol(async (ruta) => { rutas.push(ruta); if (ruta.includes('recepcionistas')) throw Error('503'); return { limite: 5, activos: 2, disponibles: 3 }; });
  assert.deepEqual(rutas.sort(), ['/profesionales/cupo', '/recepcionistas/cupo']);
  assert.equal(consultarCupoRol('profesionales').activos, 2);
  assert.equal(consultarCupoRol('recepcionistas'), null);
  assert.match(renderCupoCatalogo('Recepción', null), /no disponible/);
  assert.match(renderCupoCatalogo('Profesionales', consultarCupoRol('profesionales')), /2 de 5/);
});
test('oferta separa estado y causas de la API y escapa nombres', () => {
  const html = renderPanelOferta({ id: 7, name: '<Persona>' }, { sucursales: [{ id: 2, nombre: 'Centro', sucursalActiva: true, atencionActiva: true, servicios: [{ id: 3, nombre: '<Servicio>', ofrecido: false, motivosExclusion: ['servicio_no_seleccionado'] }] }] });
  assert.match(html, /No ofrecido/); assert.match(html, /No seleccionado en general/);
  assert.match(html, /0 de 1 servicios ofrecidos/); assert.doesNotMatch(html, /<Persona>|<Servicio>/);
  assert.match(html, /data-oferta-selector/);
});
