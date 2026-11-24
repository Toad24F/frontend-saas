import test from 'node:test';
import assert from 'node:assert/strict';
import { reunirFilasParaImpresion, validarPaginaReporte } from '../src/connected/screens/reportes/reportes.corte.js';

const corte = {
  id: 'corte', fechaCorte: '2026-11-23T17:00:00Z', expiraEn: '2026-11-24T17:00:00Z',
  filtros: { desde: '2026-11-01', hasta: '2026-11-23', agrupacion: 'semana', sucursalId: null, personalId: null, servicioId: null },
};
const primera = { ...corte, pagina: 1, limite: 100, hayMas: true, total: 101,
  filas: Array.from({ length: 100 }, (_, indice) => ({ citaId: indice + 1 })) };
const segunda = { ...corte, pagina: 2, limite: 100, hayMas: false, total: 101, filas: [{ citaId: 101 }] };

// El total del resumen, los metadatos y las claves de cita deben coincidir antes de imprimir.
test('reúne páginas ordenadas y acepta un corte vacío confirmado', async () => {
  const paginas = [];
  const filas = await reunirFilasParaImpresion(corte, 101, (numero) => {
    paginas.push(numero);
    return numero === 1 ? primera : segunda;
  });
  assert.deepEqual(paginas, [1, 2]);
  assert.deepEqual(filas.map(({ citaId }) => citaId), Array.from({ length: 101 }, (_, indice) => indice + 1));
  const vacia = { ...primera, total: 0, hayMas: false, filas: [] };
  assert.deepEqual(await reunirFilasParaImpresion(corte, 0, () => vacia), []);
});

test('rechaza páginas truncadas, de otro corte, con otro filtro o con indicación de continuidad incoherente', () => {
  for (const pagina of [
    { ...segunda, filas: [] }, { ...segunda, id: 'otro-corte' }, { ...segunda, hayMas: true },
    { ...segunda, filtros: { ...segunda.filtros, sucursalId: 12 } }, { ...segunda, total: 102 },
    { ...segunda, pagina: 1 },
  ]) assert.throws(() => validarPaginaReporte(corte, 101, 2, pagina));
});

test('rechaza duplicados entre páginas y propaga un fallo sin entregar filas parciales', async () => {
  await assert.rejects(reunirFilasParaImpresion(corte, 101, (numero) =>
    numero === 1 ? primera : { ...segunda, filas: [{ citaId: 1 }] }));
  const error = new Error('Segunda página no disponible');
  await assert.rejects(reunirFilasParaImpresion(corte, 101, (numero) => {
    if (numero === 1) return primera;
    throw error;
  }), error);
});
