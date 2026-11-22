import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarPaginaCorreo } from '../src/connected/modules/correos/correos.historial-client.js';
import { renderResultadosCorreoServidor } from '../src/connected/screens/negocio/correo.historial.js';

test('T038: combina filtros y página exactos sin descargar el historial completo', async () => {
  const rutas = [];
  const solicitar = async ruta => {
    rutas.push(ruta);
    return { envios: [{ id: '8', tipo: 'recuperacion', estado: 'fallido', intentos: 1 }],
      pagina: 2, limite: 25, total: 31, contadores: { pendiente: 0, tomado: 0, enviado: 0, fallido: 31, descartado: 0 } };
  };
  const resultado = await consultarPaginaCorreo(solicitar, 7, { pagina: 2, estado: 'fallido',
    tipo: 'recuperacion', desde: '2026-11-01', hasta: '2026-11-22' });
  assert.equal(resultado.total, 31);
  assert.deepEqual(rutas, ['/negocios/7/envios?pagina=2&limite=25&estado=fallido&tipo=recuperacion&desde=2026-11-01&hasta=2026-11-22']);
  assert.match(renderResultadosCorreoServidor(resultado), /31 correos/);
  assert.match(renderResultadosCorreoServidor(resultado), /Página 2 de 2/);
});

test('T038: fallo o respuesta inválida no se presentan como página vacía', async () => {
  await assert.rejects(consultarPaginaCorreo(async () => ({ envios: [], pagina: 1, limite: 25,
    total: 1, contadores: {} }), 7, { pagina: 1 }), /válida/);
  await assert.rejects(consultarPaginaCorreo(async () => { throw new Error('503'); }, 7, {}), /503/);
});
