import test from 'node:test';
import assert from 'node:assert/strict';
import { urlPortalCuenta, renderPortalCuenta, copiarEnlacePortalCuenta } from '../src/shared/cuenta.portal.js';

const contexto = { usuario: { rol: 'admin_negocio', negocioId: 7 }, negocio: { id: 7, slug: 'clinica-centro' }, origen: 'https://citalendar.example' };

// La identidad procede del modelo cargado; nunca se deriva del nombre del negocio.
test('perfil: enlace público propio, sin demo ni credenciales; apertura nativa independiente del router', () => {
  assert.equal(urlPortalCuenta(contexto), 'https://citalendar.example/reservas/clinica-centro');
  const html = renderPortalCuenta(contexto);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /Abrir portal/); assert.match(html, /Copiar enlace/);
  assert.doesNotMatch(html, /data-portal[\s=>]|data-nav|demo=1|token/);
});

test('perfil: no fabrica slug ni mezcla negocio o roles; dato ausente deja acciones deshabilitadas', () => {
  for (const slug of ['', undefined, '<script>', '../otro', 'otro?demo=1']) {
    const variante = { ...contexto, negocio: { id: 7, slug } };
    assert.equal(urlPortalCuenta(variante), null);
    const html = renderPortalCuenta(variante);
    assert.doesNotMatch(html, /href=/); assert.match(html, /disabled/); assert.match(html, /todavía no está disponible/);
  }
  assert.equal(urlPortalCuenta({ ...contexto, negocio: { id: 8, slug: 'otro' } }), null);
  for (const rol of ['superadmin', 'profesional', 'recepcionista']) assert.equal(renderPortalCuenta({ ...contexto, usuario: { ...contexto.usuario, rol } }), '');
});

test('perfil demo: copia y apertura conservan explícitamente la simulación', () => {
  assert.equal(urlPortalCuenta({ ...contexto, demo: true }), 'https://citalendar.example/reservas/clinica-centro?demo=1');
  assert.match(renderPortalCuenta({ ...contexto, demo: true }), /datos ficticios/);
});

test('perfil: copiar confirma solo al resolver; fallo ofrece selección manual del mismo enlace', async () => {
  const llamadas = [], campo = { value: urlPortalCuenta(contexto), focus() { llamadas.push('focus'); }, select() { llamadas.push('select'); } };
  const aviso = { textContent: '' };
  await copiarEnlacePortalCuenta(campo, aviso, { async writeText(valor) { llamadas.push(valor); } });
  assert.equal(llamadas[0], campo.value); assert.equal(aviso.textContent, 'Enlace copiado.');
  await copiarEnlacePortalCuenta(campo, aviso, { async writeText() { throw Error('denegado'); } });
  assert.deepEqual(llamadas.slice(-2), ['focus', 'select']); assert.match(aviso.textContent, /Copia manualmente/);
});
