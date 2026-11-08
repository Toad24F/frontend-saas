import test from 'node:test';
import assert from 'node:assert/strict';
import { createLicenseOperations, validateSuspensionDays } from '../src/connected/screens/negocio/license-operations.js';
import { licenseStatusHtml, licenseDeliveryHtml } from '../src/connected/screens/negocio/license-presentation.js';
import { memoryStorage } from './fixtures/memory-storage.js';

const valid = (estado = 'vigente') => ({ estado, venceEn: '2027-11-04T00:00:00.000Z',
  bloqueoProgramadoEn: null, condicionAcceso: estado === 'vigente' });
const key = 'license_attempt_000001';

test('FALA-T024: cliente privado añade cabecera solo cuando la llamada la pide', async () => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.sessionStorage;
  const calls = [];
  try {
    globalThis.sessionStorage = memoryStorage();
    globalThis.fetch = async (_url, options) => {
      calls.push(options.headers);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const { api } = await import('../src/connected/modules/auth/session.js?ala-license-header');
    await api('/licencias/5/renovar', 'POST', {}, { headers: { 'Idempotency-Key': key } });
    await api('/negocios');
    assert.equal(calls[0]['Idempotency-Key'], key);
    assert.equal(calls[1]['Idempotency-Key'], undefined);
  } finally { globalThis.fetch = oldFetch; globalThis.sessionStorage = oldStorage; }
});

// La clave y el cuerpo deben existir en sessionStorage antes de tocar HTTP.
test('FALA-T024–T025: suspender guarda cuerpo y clave, los repite y acota cabecera privada', async () => {
  const storage = memoryStorage(); const calls = [];
  let fail = true;
  const api = async (path, method = 'GET', body, options) => {
    calls.push({ path, method, body, options,
      saved: storage.getItem('citalendar:license:pending:7') });
    if (method === 'POST' && fail) { fail = false; throw Error('respuesta perdida'); }
    return valid('suspension_pendiente');
  };
  const operations = createLicenseOperations({ api, storage, actorId: 7, keyFactory: () => key });
  await assert.rejects(operations.run('suspender', 2, 5, { plazoDias: 0 }));
  assert.deepEqual(operations.pending(), { action: 'suspender', businessId: 2, licenseId: 5,
    body: { plazoDias: 0 }, key });
  await assert.rejects(operations.run('renovar', 2, 5, {}), /pendiente|comprobar/i);
  await operations.retry();
  const posts = calls.filter(({ method }) => method === 'POST');
  assert.equal(posts.length, 2);
  assert.ok(posts.every(({ saved }) => saved && JSON.parse(saved).key === key));
  assert.deepEqual(posts.map(({ body }) => body), [{ plazoDias: 0 }, { plazoDias: 0 }]);
  assert.deepEqual(posts.map(({ options }) => options.headers['Idempotency-Key']), [key, key]);
  assert.equal(calls.find(({ method }) => method === 'GET').options, undefined);
  assert.equal(operations.pending(), null);
});

test('FALA-T027: plazo de suspensión acepta solo enteros de cero a treinta', () => {
  for (const days of [0, 2, 30]) assert.equal(validateSuspensionDays(days), days);
  for (const days of [-1, 31, 1.5, '2', null, undefined]) assert.throws(() => validateSuspensionDays(days));
});

test('FALA-T028: renovación incierta no admite segunda anualidad y refresca vigencia', async () => {
  const storage = memoryStorage(), calls = [];
  let fail = true;
  const api = async (path, method = 'GET', body, options) => {
    calls.push({ path, method, body, options });
    if (method === 'POST' && fail) { fail = false; throw Error('red'); }
    return valid('suspendida');
  };
  const first = createLicenseOperations({ api, storage, actorId: 7, keyFactory: () => key });
  await assert.rejects(first.run('renovar', 2, 5, {}));
  const resumed = createLicenseOperations({ api, storage, actorId: 7, keyFactory: () => 'other_attempt_000001' });
  await assert.rejects(resumed.run('renovar', 2, 5, {}), /pendiente|comprobar/i);
  const outcome = await resumed.retry();
  assert.equal(outcome.estado, 'suspendida');
  assert.deepEqual(calls.filter(({ method }) => method === 'POST').map(({ options }) => options.headers['Idempotency-Key']), [key, key]);
  assert.ok(calls.some(({ path, method }) => path === '/licencias/5/vigencia' && method === 'GET'));
});

test('FALA-T026–T027: vista usa estado y bloqueo reales sin plazo fijo ni nueva suspensión', () => {
  const pending = licenseStatusHtml({ ...valid('suspension_pendiente'),
    bloqueoProgramadoEn: '2026-11-06T12:00:00.000Z', condicionAcceso: true });
  assert.match(pending, /Suspensión programada|Bloqueo programado/);
  assert.doesNotMatch(pending, /48 horas|data-business-action="suspend"/);
  const suspended = licenseStatusHtml({ ...valid('suspendida'), condicionAcceso: false });
  assert.match(suspended, /Acceso bloqueado|Reactivar licencia/);
  assert.doesNotMatch(suspended, /data-business-action="suspend"/);
  const expired = licenseStatusHtml({ ...valid('vencida'), condicionAcceso: false });
  assert.match(expired, /Vencida|Renovar un año/);
  const waiting = licenseStatusHtml({ ...valid('pendiente'), venceEn: null, condicionAcceso: false });
  assert.doesNotMatch(waiting, /data-business-action="renew"|data-business-action="suspend"/);
});

test('FALA-T029: correo pendiente, fallido y enviado no equivale a transición de licencia', () => {
  const html = licenseDeliveryHtml(['pendiente', 'fallido', 'enviado'].map((estado, id) => ({
    id: id + 1, tipo: 'aviso_licencia', estado, intentos: id, confirmadoEn: null, proximoIntentoEn: null,
  })));
  assert.match(html, /Pendiente/); assert.match(html, /Fallido/); assert.match(html, /Enviado/);
  assert.doesNotMatch(html, /Entregado|Correo enviado por renovar/);
});
