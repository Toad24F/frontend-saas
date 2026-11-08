import test from 'node:test';
import assert from 'node:assert/strict';
import { localPage, paginationHtml } from '../src/shared/screens/local-pagination.js';
import { filteredBlocks, blockRangeError } from '../src/shared/screens/disponibilidad/block-filters.js';
const defaults = { search: '', type: 'all', branch: 'all', from: '', to: '' };

test('páginas locales: 0/1/10/11/21, límites y controles condicionales', () => {
  for (const count of [0, 1, 10, 11, 21]) {
    const rows = Array.from({ length: count }, (_, id) => ({ id }));
    const copy = structuredClone(rows);
    const result = localPage(rows, 999);
    assert.equal(result.page, Math.max(1, Math.ceil(count / 10)));
    assert.ok(result.rows.length <= 10);
    assert.equal(paginationHtml(result, 'servicios', 'service').includes('<nav'), count > 10);
    assert.deepEqual(rows, copy);
  }
  assert.equal(localPage(Array(21), -1).page, 1);
  assert.equal(localPage(Array(21), NaN).page, 1);
  assert.doesNotMatch(paginationHtml(localPage([]), 'bloqueos', 'blocks'), /1–0/);
});
test('el último registro retirado de una página ajusta el índice sin dejarla vacía', () => {
  const items = Array.from({ length: 21 }, (_, id) => id);
  assert.deepEqual(localPage(items, 3).rows, [20]);
  items.pop();
  assert.equal(localPage(items, 3).page, 2);
  assert.equal(localPage(items, 3).rows.length, 10);
});
test('bloqueos: rango por solapamiento, búsqueda normalizada y globales aplicables', () => {
  const items = [
    { id: 1, professionalId: 7, branchId: 2, reason: 'Vacación larga', type: 'vacaciones', date: '2026-11-01', endDate: '2026-11-20' },
    { id: 2, professionalId: null, branchId: null, reason: 'Feriado', type: 'feriado', date: '2026-11-10', endDate: '2026-11-10' },
    { id: 3, professionalId: 8, branchId: 3, reason: 'Otra sede', type: 'emergencia', date: '2026-11-10', endDate: '2026-11-10' },
  ];
  const copy = structuredClone(items);
  const options = { ...defaults, branch: '2', from: '2026-11-10', to: '2026-11-12' };
  assert.deepEqual(filteredBlocks(items, options, '7').map((item) => item.id), [2, 1]);
  assert.deepEqual(filteredBlocks(items, { ...options, type: 'dia_festivo' }, '7').map((item) => item.id), [2]);
  assert.deepEqual(filteredBlocks(items, { ...defaults, search: ' VACACION ' }, '7').map((item) => item.id), [1]);
  assert.deepEqual(items, copy);
});
test('bloqueos: fechas inválidas y rango invertido son errores, no consultas vacías', () => {
  assert.match(blockRangeError({ from: '2026-02-30', to: '' }), /válidas/);
  assert.match(blockRangeError({ from: '2026-11-10', to: '2026-11-09' }), /posterior/);
  assert.equal(blockRangeError({ from: '2026-01-01', to: '2027-01-01' }), '');
  assert.equal(blockRangeError({ from: '', to: '' }), '');
});
