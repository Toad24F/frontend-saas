import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarEnviosCompletos } from '../src/connected/modules/correos/correos.historial-client.js';

test('consulta todas las páginas antes de entregar el historial a la vista existente', async () => {
  const rutas = [];
  const solicitar = async (ruta) => {
    rutas.push(ruta);
    const pagina = Number(new URL(ruta, 'http://local.test').searchParams.get('pagina'));
    return { pagina, limite: 100, total: 101,
      envios: Array.from({ length: pagina === 1 ? 100 : 1 }, (_, indice) => ({ id: String(indice + (pagina - 1) * 100 + 1) })) };
  };
  const envios = await consultarEnviosCompletos(solicitar, 7);
  assert.equal(envios.length, 101);
  assert.deepEqual(rutas, ['/negocios/7/envios?pagina=1&limite=100', '/negocios/7/envios?pagina=2&limite=100']);
});

test('un fallo de página no entrega un historial parcial como completo', async () => {
  await assert.rejects(consultarEnviosCompletos(async (ruta) => ruta.includes('pagina=1')
    ? { pagina: 1, limite: 100, total: 101, envios: Array.from({ length: 100 }, (_, indice) => ({ id: String(indice + 1) })) }
    : Promise.reject(new Error('Fallo de red')), 7), /Fallo de red/);
});
