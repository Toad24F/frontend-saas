import test from 'node:test';
import assert from 'node:assert/strict';
import { paginarDirectorio, coincideSeguimiento, textoTiempoRestante } from '../src/shared/screens/plataforma/plataforma.modelo-directorio.js';
import { renderDirectorio, renderResultadosDirectorio } from '../src/shared/screens/plataforma/plataforma.directorio.js';
const negocio = (id, dias = 20) => ({ id, name: `Clínica ${id}`, slug: `clinica-${id}`, email: `admin${id}@example.test`, license: 'vigente', category: 'Activado', validity: { condicionAcceso: true, tiempoRestante: { dias } }, failedDeliveries: 0 });
test('panel: seguimiento usa condiciones reales y umbral de treinta días', () => {
  assert.equal(coincideSeguimiento(negocio(1), 'por-vencer'), true);
  assert.equal(coincideSeguimiento(negocio(1, 30), 'por-vencer'), false);
  assert.equal(coincideSeguimiento({ ...negocio(1), license: 'suspendida' }, 'por-vencer'), false);
  assert.equal(coincideSeguimiento({ ...negocio(1), category: 'Pendiente de activación' }, 'por-activar'), true);
  assert.equal(coincideSeguimiento({ ...negocio(1), validity: null }, 'acceso-bloqueado'), false);
  assert.equal(coincideSeguimiento({ ...negocio(1), validity: { condicionAcceso: false } }, 'acceso-bloqueado'), true);
  assert.equal(coincideSeguimiento({ ...negocio(1), failedDeliveries: 2 }, 'correos-fallidos'), true);
});
test('panel: búsqueda normalizada, filtros combinados y paginación posterior', () => {
  const negocios = Array.from({ length: 24 }, (_, indice) => negocio(indice + 1));
  const copia = structuredClone(negocios);
  assert.equal(paginarDirectorio(negocios, { busqueda: ' CLINICA ' }).total, 24);
  assert.equal(paginarDirectorio(negocios, { busqueda: 'admin24@' }).filas[0].id, 24);
  assert.equal(paginarDirectorio(negocios, { busqueda: 'clinica-24' }).filas[0].id, 24);
  assert.equal(paginarDirectorio(negocios, { busqueda: 'clinica', estadoLicencia: 'suspendida' }).total, 0);
  assert.equal(paginarDirectorio(negocios, { seguimiento: 'por-vencer', pagina: 99 }).pagina, 3);
  assert.equal(paginarDirectorio(negocios, { pagina: -1 }).filas.length, 10);
  assert.deepEqual(negocios, copia);
});
test('panel: representación temporal no confunde remanente con acceso', () => {
  assert.equal(textoTiempoRestante(negocio(1, 0)), 'Menos de 1 día');
  assert.equal(textoTiempoRestante({ ...negocio(1), license: 'pendiente' }), 'Sin iniciar');
  assert.equal(textoTiempoRestante({ ...negocio(1), license: 'vencida' }), 'Vencida');
  assert.match(textoTiempoRestante({ ...negocio(1), license: 'suspendida' }), /conservados/);
  assert.match(textoTiempoRestante({ ...negocio(1), license: 'suspension_pendiente' }), /bloqueo o vencimiento/);
  assert.equal(textoTiempoRestante({ ...negocio(1), validity: null }), 'No disponible');
});
test('panel: controles dinámicos, estado vacío y escape de contenido', () => {
  for (const cantidad of [0, 1, 10]) assert.doesNotMatch(renderResultadosDirectorio(Array.from({ length: cantidad }, (_, indice) => negocio(indice))), /aria-label="Paginación/);
  assert.match(renderResultadosDirectorio(Array.from({ length: 11 }, (_, indice) => negocio(indice))), /aria-label="Paginación/);
  assert.match(renderResultadosDirectorio([negocio(1)], { busqueda: 'sin coincidencias' }), /No hay negocios con estos filtros/);
  const html = renderDirectorio([{ ...negocio(1), name: '<script>x</script>' }]);
  assert.doesNotMatch(html, /<script>|en total|Datos actuales del backend|Envíos fallidos|>Activado</);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Administrar/);
});
