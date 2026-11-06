import test from 'node:test';
import assert from 'node:assert/strict';
import { directoryPage, matchesFollowUp, remainingLabel } from '../src/shared/screens/plataforma/directory-model.js';
import { directoryHtml, directoryResults } from '../src/shared/screens/plataforma/directory.js';
const business = (id, days = 20) => ({ id, name: `Clínica ${id}`, slug: `clinica-${id}`, email: `admin${id}@example.test`, license: 'vigente', category: 'Activado', validity: { condicionAcceso: true, tiempoRestante: { dias: days } }, failedDeliveries: 0 });
test('panel: seguimiento usa condiciones reales y umbral de treinta días', () => {
  assert.equal(matchesFollowUp(business(1), 'expiring'), true);
  assert.equal(matchesFollowUp(business(1, 30), 'expiring'), false);
  assert.equal(matchesFollowUp({ ...business(1), license: 'suspendida' }, 'expiring'), false);
  assert.equal(matchesFollowUp({ ...business(1), category: 'Pendiente de activación' }, 'pending'), true);
  assert.equal(matchesFollowUp({ ...business(1), validity: null }, 'blocked'), false);
  assert.equal(matchesFollowUp({ ...business(1), validity: { condicionAcceso: false } }, 'blocked'), true);
  assert.equal(matchesFollowUp({ ...business(1), failedDeliveries: 2 }, 'failed'), true);
});
test('panel: búsqueda normalizada, filtros combinados y paginación posterior', () => {
  const data = Array.from({ length: 24 }, (_, i) => business(i + 1));
  const copy = structuredClone(data);
  assert.equal(directoryPage(data, { query: ' CLINICA ' }).total, 24);
  assert.equal(directoryPage(data, { query: 'admin24@' }).rows[0].id, 24);
  assert.equal(directoryPage(data, { query: 'clinica-24' }).rows[0].id, 24);
  assert.equal(directoryPage(data, { query: 'clinica', license: 'suspendida' }).total, 0);
  assert.equal(directoryPage(data, { followUp: 'expiring', page: 99 }).page, 3);
  assert.equal(directoryPage(data, { page: -1 }).rows.length, 10);
  assert.deepEqual(data, copy);
});
test('panel: representación temporal no confunde remanente con acceso', () => {
  assert.equal(remainingLabel(business(1, 0)), 'Menos de 1 día');
  assert.equal(remainingLabel({ ...business(1), license: 'pendiente' }), 'Sin iniciar');
  assert.equal(remainingLabel({ ...business(1), license: 'vencida' }), 'Vencida');
  assert.match(remainingLabel({ ...business(1), license: 'suspendida' }), /conservados/);
  assert.match(remainingLabel({ ...business(1), license: 'suspension_pendiente' }), /bloqueo o vencimiento/);
  assert.equal(remainingLabel({ ...business(1), validity: null }), 'No disponible');
});
test('panel: controles dinámicos, estado vacío y escape de contenido', () => {
  for (const count of [0, 1, 10]) assert.doesNotMatch(directoryResults(Array.from({ length: count }, (_, i) => business(i))), /aria-label="Paginación/);
  assert.match(directoryResults(Array.from({ length: 11 }, (_, i) => business(i))), /aria-label="Paginación/);
  assert.match(directoryResults([business(1)], { query: 'sin coincidencias' }), /No hay negocios con estos filtros/);
  const html = directoryHtml([{ ...business(1), name: '<script>x</script>' }]);
  assert.doesNotMatch(html, /<script>|en total|Datos actuales del backend|Envíos fallidos|>Activado</);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Administrar/);
});
