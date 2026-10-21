import test from 'node:test';
import assert from 'node:assert/strict';
import { accountPortalUrl, renderAccountPortal, copyAccountPortal } from '../src/shared/account-portal.js';

const context = { user: { rol: 'admin_negocio', negocioId: 7 }, tenant: { id: 7, slug: 'clinica-centro' }, origin: 'https://citalendar.example' };

// La identidad procede del modelo cargado; nunca se deriva del nombre del negocio.
test('perfil: enlace público propio, sin demo ni credenciales; apertura nativa independiente del router', () => {
  assert.equal(accountPortalUrl(context), 'https://citalendar.example/reservas/clinica-centro');
  const html = renderAccountPortal(context);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /Abrir portal/); assert.match(html, /Copiar enlace/);
  assert.doesNotMatch(html, /data-portal[\s=>]|data-nav|demo=1|token/);
});

test('perfil: no fabrica slug ni mezcla negocio o roles; dato ausente deja acciones deshabilitadas', () => {
  for (const slug of ['', undefined, '<script>', '../otro', 'otro?demo=1']) {
    const state = { ...context, tenant: { id: 7, slug } };
    assert.equal(accountPortalUrl(state), null);
    const html = renderAccountPortal(state);
    assert.doesNotMatch(html, /href=/); assert.match(html, /disabled/); assert.match(html, /todavía no está disponible/);
  }
  assert.equal(accountPortalUrl({ ...context, tenant: { id: 8, slug: 'otro' } }), null);
  for (const rol of ['superadmin', 'profesional', 'recepcionista']) assert.equal(renderAccountPortal({ ...context, user: { ...context.user, rol } }), '');
});

test('perfil demo: copia y apertura conservan explícitamente la simulación', () => {
  assert.equal(accountPortalUrl({ ...context, demo: true }), 'https://citalendar.example/reservas/clinica-centro?demo=1');
  assert.match(renderAccountPortal({ ...context, demo: true }), /datos ficticios/);
});

test('perfil: copiar confirma solo al resolver; fallo ofrece selección manual del mismo enlace', async () => {
  const calls = [], input = { value: accountPortalUrl(context), focus() { calls.push('focus'); }, select() { calls.push('select'); } };
  const status = { textContent: '' };
  await copyAccountPortal(input, status, { async writeText(value) { calls.push(value); } });
  assert.equal(calls[0], input.value); assert.equal(status.textContent, 'Enlace copiado.');
  await copyAccountPortal(input, status, { async writeText() { throw Error('denegado'); } });
  assert.deepEqual(calls.slice(-2), ['focus', 'select']); assert.match(status.textContent, /Copia manualmente/);
});
