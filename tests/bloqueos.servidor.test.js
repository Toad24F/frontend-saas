import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarPaginaBloqueos } from '../src/connected/modules/bloqueos/bloqueos.lista-client.js';
import { configurarConsultaBloqueos, renderDirectorioBloqueos } from '../src/shared/screens/disponibilidad/disponibilidad.directorio-bloqueos.js';

test('T043: consulta una página y combina vigencia, alcance y solapamiento', async () => {
  const rutas = [];
  const solicitar = async ruta => { rutas.push(ruta); return { bloqueos: [{ id: 3, fechaInicio: '2026-11-01', fechaFin: '2026-11-02', inicioMinutos: null, finMinutos: null, tipo: 'vacaciones', motivo: 'Viaje', personalId: null, sucursalId: null, vigencia: 'anterior' }], pagina: 2, limite: 25, total: 27 }; };
  const resultado = await consultarPaginaBloqueos(solicitar, 7, { pagina: 2, vigencia: 'todos', busqueda: 'Viaje', tipo: 'vacaciones', sucursal: '8', personalId: '9', desde: '2026-11-01', hasta: '2026-11-30' });
  assert.deepEqual(rutas, ['/bloqueos?pagina=2&limite=25&vigencia=todos&motivo=Viaje&tipo=vacaciones&sucursalId=8&personalId=9&desde=2026-11-01&hasta=2026-11-30']);
  assert.equal(resultado.bloqueos[0].tenantId, 7);
  assert.equal(resultado.bloqueos[0].vigencia, 'anterior');
  assert.equal(resultado.total, 27);
});

test('T043: respuesta parcial se rechaza como error', async () => {
  await assert.rejects(consultarPaginaBloqueos(async () => ({ bloqueos: [], pagina: 1, limite: 25, total: 1 }), 7), /válida/);
});

test('T043: administración ve vigencias y total del servidor; demo conserva lista local', () => {
  configurarConsultaBloqueos(async () => {}, { bloqueos: [{ id: 1, reason: 'Viaje' }], pagina: 1, limite: 25, total: 40 }, true);
  const conectado = renderDirectorioBloqueos(7, '', [], [], fila => `<p>${fila.reason}</p>`, true);
  assert.match(conectado, /40 bloqueos/);
  assert.match(conectado, /Anteriores/);
  assert.match(conectado, /Página 1 de 2/);
  const demo = renderDirectorioBloqueos(7, '', [], [], fila => `<p>${fila.reason}</p>`, false);
  assert.doesNotMatch(demo, /data-filtro-bloqueos="vigencia"/);
});
