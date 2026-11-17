import test from 'node:test';
import assert from 'node:assert/strict';
import { paginarLocalmente, renderPaginacionLocal } from '../src/shared/screens/paginacion.local.js';
import { filteredBlocks, blockRangeError } from '../src/shared/screens/disponibilidad/block-filters.js';
const filtrosBase = { search: '', type: 'all', branch: 'all', from: '', to: '' };

test('páginas locales: 0/1/10/11/21, límites y controles condicionales', () => {
  for (const cantidad of [0, 1, 10, 11, 21]) {
    const filas = Array.from({ length: cantidad }, (_, id) => ({ id }));
    const copia = structuredClone(filas);
    const resultado = paginarLocalmente(filas, 999);
    assert.equal(resultado.pagina, Math.max(1, Math.ceil(cantidad / 10)));
    assert.ok(resultado.filas.length <= 10);
    assert.equal(renderPaginacionLocal(resultado, 'servicios', 'servicio').includes('<nav'), cantidad > 10);
    assert.deepEqual(filas, copia);
  }
  assert.equal(paginarLocalmente(Array(21), -1).pagina, 1);
  assert.equal(paginarLocalmente(Array(21), NaN).pagina, 1);
  assert.doesNotMatch(renderPaginacionLocal(paginarLocalmente([]), 'bloqueos', 'bloqueos'), /1–0/);
});
test('el último registro retirado de una página ajusta el índice sin dejarla vacía', () => {
  const registros = Array.from({ length: 21 }, (_, id) => id);
  assert.deepEqual(paginarLocalmente(registros, 3).filas, [20]);
  registros.pop();
  assert.equal(paginarLocalmente(registros, 3).pagina, 2);
  assert.equal(paginarLocalmente(registros, 3).filas.length, 10);
});
test('bloqueos: rango por solapamiento, búsqueda normalizada y globales aplicables', () => {
  const registros = [
    { id: 1, professionalId: 7, branchId: 2, reason: 'Vacación larga', type: 'vacaciones', date: '2026-11-01', endDate: '2026-11-20' },
    { id: 2, professionalId: null, branchId: null, reason: 'Feriado', type: 'feriado', date: '2026-11-10', endDate: '2026-11-10' },
    { id: 3, professionalId: 8, branchId: 3, reason: 'Otra sede', type: 'emergencia', date: '2026-11-10', endDate: '2026-11-10' },
  ];
  const copia = structuredClone(registros);
  const filtros = { ...filtrosBase, branch: '2', from: '2026-11-10', to: '2026-11-12' };
  assert.deepEqual(filteredBlocks(registros, filtros, '7').map((registro) => registro.id), [2, 1]);
  assert.deepEqual(filteredBlocks(registros, { ...filtros, type: 'dia_festivo' }, '7').map((registro) => registro.id), [2]);
  assert.deepEqual(filteredBlocks(registros, { ...filtrosBase, search: ' VACACION ' }, '7').map((registro) => registro.id), [1]);
  assert.deepEqual(registros, copia);
});
test('bloqueos: fechas inválidas y rango invertido son errores, no consultas vacías', () => {
  assert.match(blockRangeError({ from: '2026-02-30', to: '' }), /válidas/);
  assert.match(blockRangeError({ from: '2026-11-10', to: '2026-11-09' }), /posterior/);
  assert.equal(blockRangeError({ from: '2026-01-01', to: '2027-01-01' }), '');
  assert.equal(blockRangeError({ from: '', to: '' }), '');
});
