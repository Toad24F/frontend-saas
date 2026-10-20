import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveEntry, boot } from '../src/entry-router.js';
import { createPublicClient, PublicPortalError } from '../src/connected/public/http.js';
import { initializePublicBrowser } from '../src/connected/public/browser-session.js';

const slug = 'clínica centro';
const token = 'a'.repeat(64);
const session = (csrfToken = token) => ({ negocio: { slug, nombre: 'Clínica Centro' }, csrfToken });
const response = (data, status = 200) => Response.json(data, { status });

// Las entradas se prueban sin DOM: el portal conectado no debe cargar el panel o la demo.
test('T098: reserva pública elige entrada aislada, conserva demo explícita y no exige login', async () => {
  assert.deepEqual(resolveEntry('/reservas/cl%C3%ADnica%20centro', ''), { mode: 'public', slug });
  assert.equal(resolveEntry('/reservas/centro/', '?demo=1').mode, 'demo');
  assert.equal(resolveEntry('/admin/agenda', '').mode, 'connected');
  assert.equal(resolveEntry('/reservas/%ZZ', '').slug, null);
  assert.equal(resolveEntry('/reservas/', '').mode, 'public');
  assert.equal(resolveEntry('/reservas/centro/extra', '').slug, null);
  const calls = [];
  await boot({ pathname: '/reservas/centro', search: '' }, {
    public: async () => ({ startPublicPortal: (value) => calls.push(value) }),
    connected: () => { throw Error('No cargar administración'); },
    demo: () => { throw Error('No cargar demo'); },
  });
  assert.deepEqual(calls, ['centro']);
  for (const mode of ['demo', 'connected']) {
    const loaded = [];
    await boot({ pathname: '/admin/agenda', search: mode === 'demo' ? '?demo=1' : '' }, {
      [mode]: async () => { loaded.push(mode); return {}; },
    });
    assert.deepEqual(loaded, [mode]);
  }
  const source = await readFile(new URL('../src/connected/public/entry.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /shared\/app|demo\/|backend\.js|auth\//);
});

// El doble HTTP comprueba el contrato real de cabeceras y no usa credenciales administrativas.
test('T099–T100: mismo origen, cookie, inicialización doble y CSRF solo tras comprobar cookie', async () => {
  const calls = [];
  const client = createPublicClient(slug, { fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return response(session());
  } });
  await assert.rejects(client.request('apartados', { method: 'POST', body: {} }), /sesión/i);
  await client.initializeVerifiedSession();
  await client.request('apartados', { method: 'POST', body: { operacion: 'op' } });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, '/publico/negocios/cl%C3%ADnica%20centro/sesion');
  for (const { options } of calls) {
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, undefined);
  }
  assert.equal(calls[0].options.headers['X-Portal-Inicializacion'], '1');
  assert.equal(calls[0].options.body, '{}');
  assert.equal(calls[2].options.headers['X-CSRF-Token'], token);
  await assert.rejects(client.request('https://ajeno.example'), /ruta/i);
  await assert.rejects(client.request('../sesion'), /ruta/i);
  await assert.rejects(client.request('sesion', { method: 'POST' }), /ruta/i);
});

test('T099: interpreta errores públicos y distingue red, protocolo y respuesta funcional', async () => {
  for (const status of [400, 401, 403, 404, 409, 500, 503]) {
    const client = createPublicClient(slug, { fetchImpl: async () => response({
      codigo: `portal_${status}`, mensaje: 'Mensaje público', accion: 'volver',
    }, status) });
    await assert.rejects(client.request('catalogo'), (error) => {
      assert.ok(error instanceof PublicPortalError);
      assert.equal(error.kind, 'http');
      assert.equal(error.status, status);
      assert.equal(error.code, `portal_${status}`);
      assert.equal(error.action, 'volver');
      return true;
    });
  }
  const offline = createPublicClient(slug, { fetchImpl: async () => { throw Error('secreto interno'); } });
  await assert.rejects(offline.request('catalogo'), (error) => error.kind === 'network' && error.status === 0 && !error.message.includes('secreto'));
  const broken = createPublicClient(slug, { fetchImpl: async () => new Response('<html>proxy</html>') });
  await assert.rejects(broken.request('catalogo'), (error) => error.kind === 'protocol');
  const empty = createPublicClient(slug, { fetchImpl: async () => new Response(null, { status: 204 }) });
  assert.equal(await empty.request('catalogo'), null);
});

test('T100: cookies bloqueadas o respuesta de sesión inválida impiden mutaciones', async () => {
  for (const second of [session('b'.repeat(64)), {}, { ...session(), negocio: { slug: 'otro' } }]) {
    let calls = 0;
    const client = createPublicClient(slug, { fetchImpl: async () => response(++calls === 1 ? session() : second) });
    await assert.rejects(client.initializeVerifiedSession(), (error) => ['cookies', 'protocol'].includes(error.kind));
    await assert.rejects(client.request('apartados', { method: 'POST', body: {} }), /sesión/i);
  }
});

// Un gestor compartido serializa dos pestañas; ninguna inicializa fuera de su sección exclusiva.
test('T100: dos pestañas inicializan en exclusión mutua por negocio', async () => {
  let tail = Promise.resolve();
  let active = 0;
  let maximum = 0;
  const names = [];
  const locks = { request(name, options, callback) {
    names.push(name);
    assert.equal(options.mode, 'exclusive');
    const result = tail.then(callback);
    tail = result.catch(() => {});
    return result;
  } };
  const makeClient = () => ({ async initializeVerifiedSession() {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return session();
  } });
  const environment = { locks, cookieEnabled: true, isSecureContext: true,
    BroadcastChannel: class { close() {} } };
  const results = await Promise.all([initializePublicBrowser(slug, makeClient(), environment), initializePublicBrowser(slug, makeClient(), environment)]);
  assert.equal(maximum, 1);
  assert.equal(names[0], names[1]);
  assert.equal(results[0].negocio.slug, slug);
});

test('T100: coordinación o cookies no disponibles fallan antes de iniciar sesión', async () => {
  const valid = { locks: { request: async (_name, _options, callback) => callback() },
    cookieEnabled: true, isSecureContext: true, BroadcastChannel: class { close() {} } };
  for (const override of [{ locks: null }, { cookieEnabled: false }, { isSecureContext: false },
    { BroadcastChannel: undefined }, { BroadcastChannel: class { constructor() { throw Error('bloqueado'); } } }]) {
    let calls = 0;
    await assert.rejects(initializePublicBrowser(slug, { initializeVerifiedSession() { calls++; } }, { ...valid, ...override }),
      (error) => ['cookies', 'coordination'].includes(error.kind));
    assert.equal(calls, 0);
  }
  await assert.rejects(initializePublicBrowser(slug, {}, { ...valid, locks: { request: async () => { throw Error('denegado'); } } }),
    (error) => error.kind === 'coordination');
});

// La credencial anterior no puede seguir autorizando escrituras tras un 401
// o una nueva inicialización interrumpida a mitad de su comprobación.
test('T099–T100: 401 y fallo al verificar invalidan el CSRF previo', async () => {
  let fail = false;
  let calls = 0;
  const client = createPublicClient(slug, { fetchImpl: async () => {
    calls++;
    return fail ? response({ codigo: 'portal_401', mensaje: 'Reinicie', accion: 'reiniciar' }, 401) : response(session());
  } });
  await client.initializeVerifiedSession();
  fail = true;
  await assert.rejects(client.request('catalogo'), (error) => error.status === 401 && error.action === 'reiniciar');
  await assert.rejects(client.request('apartados', { method: 'POST' }), /sesión/i);
  assert.equal(calls, 3);
  fail = false;
  await client.initializeVerifiedSession();
  fail = true;
  await assert.rejects(client.initializeVerifiedSession());
  await assert.rejects(client.request('apartados', { method: 'POST' }), /sesión/i);
});

test('T099: una petición agotada termina como fallo de transporte', async () => {
  const client = createPublicClient(slug, { timeoutMs: 5, fetchImpl: async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    }) });
  // Mantiene el proceso vivo durante el timeout, igual que un socket de fetch real.
  const keepAlive = setInterval(() => {}, 100);
  try { await assert.rejects(client.request('catalogo'), (error) => error.kind === 'network' && error.status === 0); }
  finally { clearInterval(keepAlive); }
});
