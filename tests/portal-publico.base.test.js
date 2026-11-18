import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveEntry, boot } from '../src/entry-router.js';
import { crearPortalClient, ErrorPortalPublico } from '../src/connected/portal-publico/portal.http.js';
import { iniciarSesionNavegador } from '../src/connected/portal-publico/portal.sesion-navegador.js';

const slug = 'clínica centro';
const token = 'a'.repeat(64);
const sesion = (csrfToken = token) => ({ negocio: { slug, nombre: 'Clínica Centro' }, csrfToken });
const respuesta = (datos, estado = 200) => Response.json(datos, { status: estado });

// Las entradas se prueban sin DOM: el portal conectado no debe cargar el panel o la demo.
test('T098: reserva pública elige entrada aislada, conserva demo explícita y no exige login', async () => {
  assert.deepEqual(resolveEntry('/reservas/cl%C3%ADnica%20centro', ''), { mode: 'public', slug });
  assert.equal(resolveEntry('/reservas/centro/', '?demo=1').mode, 'demo');
  assert.equal(resolveEntry('/admin/agenda', '').mode, 'connected');
  assert.equal(resolveEntry('/reservas/%ZZ', '').slug, null);
  assert.equal(resolveEntry('/reservas/', '').mode, 'public');
  assert.equal(resolveEntry('/reservas/centro/extra', '').slug, null);
  const llamadas = [];
  await boot({ pathname: '/reservas/centro', search: '' }, {
    public: async () => ({ iniciarPortalPublico: (valor) => llamadas.push(valor) }),
    connected: () => { throw Error('No cargar administración'); },
    demo: () => { throw Error('No cargar demo'); },
  });
  assert.deepEqual(llamadas, ['centro']);
  for (const modo of ['demo', 'connected']) {
    const modosCargados = [];
    await boot({ pathname: '/admin/agenda', search: modo === 'demo' ? '?demo=1' : '' }, {
      [modo]: async () => { modosCargados.push(modo); return {}; },
    });
    assert.deepEqual(modosCargados, [modo]);
  }
  const codigoFuente = await readFile(new URL('../src/connected/portal-publico/portal.entrada.js', import.meta.url), 'utf8');
  assert.doesNotMatch(codigoFuente, /shared\/app|demo\/|backend\.js|auth\//);
});

// El doble HTTP comprueba el contrato real de cabeceras y no usa credenciales administrativas.
test('T099–T100: mismo origen, cookie, inicialización doble y CSRF solo tras comprobar cookie', async () => {
  const llamadas = [];
  const client = crearPortalClient(slug, { ejecutarFetch: async (url, opciones) => {
    llamadas.push({ url, opciones });
    return respuesta(sesion());
  } });
  await assert.rejects(client.solicitar('apartados', { method: 'POST', body: {} }), /sesión/i);
  await client.iniciarSesionVerificada();
  await client.solicitar('apartados', { method: 'POST', body: { operacion: 'op' } });
  assert.equal(llamadas.length, 3);
  assert.equal(llamadas[0].url, '/publico/negocios/cl%C3%ADnica%20centro/sesion');
  for (const { opciones } of llamadas) {
    assert.equal(opciones.credentials, 'same-origin');
    assert.equal(opciones.cache, 'no-store');
    assert.equal(opciones.redirect, 'error');
    assert.equal(opciones.headers.Authorization, undefined);
  }
  assert.equal(llamadas[0].opciones.headers['X-Portal-Inicializacion'], '1');
  assert.equal(llamadas[0].opciones.body, '{}');
  assert.equal(llamadas[2].opciones.headers['X-CSRF-Token'], token);
  await assert.rejects(client.solicitar('https://ajeno.example'), /ruta/i);
  await assert.rejects(client.solicitar('../sesion'), /ruta/i);
  await assert.rejects(client.solicitar('sesion', { method: 'POST' }), /ruta/i);
});

test('T099: interpreta errores públicos y distingue red, protocolo y respuesta funcional', async () => {
  for (const estado of [400, 401, 403, 404, 409, 500, 503]) {
    const client = crearPortalClient(slug, { ejecutarFetch: async () => respuesta({
      codigo: `portal_${estado}`, mensaje: 'Mensaje público', accion: 'volver',
    }, estado) });
    await assert.rejects(client.solicitar('catalogo'), (error) => {
      assert.ok(error instanceof ErrorPortalPublico);
      assert.equal(error.tipo, 'http');
      assert.equal(error.status, estado);
      assert.equal(error.codigo, `portal_${estado}`);
      assert.equal(error.accion, 'volver');
      return true;
    });
  }
  const sinConexion = crearPortalClient(slug, { ejecutarFetch: async () => { throw Error('secreto interno'); } });
  await assert.rejects(sinConexion.solicitar('catalogo'), (error) => error.tipo === 'network' && error.status === 0 && !error.message.includes('secreto'));
  const respuestaInvalida = crearPortalClient(slug, { ejecutarFetch: async () => new Response('<html>proxy</html>') });
  await assert.rejects(respuestaInvalida.solicitar('catalogo'), (error) => error.tipo === 'protocol');
  const sinContenido = crearPortalClient(slug, { ejecutarFetch: async () => new Response(null, { status: 204 }) });
  assert.equal(await sinContenido.solicitar('catalogo'), null);
});

test('T100: cookies bloqueadas o respuesta de sesión inválida impiden mutaciones', async () => {
  for (const segunda of [sesion('b'.repeat(64)), {}, { ...sesion(), negocio: { slug: 'otro' } }]) {
    let llamadas = 0;
    const client = crearPortalClient(slug, { ejecutarFetch: async () => respuesta(++llamadas === 1 ? sesion() : segunda) });
    await assert.rejects(client.iniciarSesionVerificada(), (error) => ['cookies', 'protocol'].includes(error.tipo));
    await assert.rejects(client.solicitar('apartados', { method: 'POST', body: {} }), /sesión/i);
  }
});

// Un gestor compartido serializa dos pestañas; ninguna inicializa fuera de su sección exclusiva.
test('T100: dos pestañas inicializan en exclusión mutua por negocio', async () => {
  let cola = Promise.resolve();
  let activo = 0;
  let maximo = 0;
  const nombres = [];
  const bloqueos = { request(nombre, opciones, handler) {
    nombres.push(nombre);
    assert.equal(opciones.mode, 'exclusive');
    const resultado = cola.then(handler);
    cola = resultado.catch(() => {});
    return resultado;
  } };
  const crearClientDePrueba = () => ({ async iniciarSesionVerificada() {
    activo++;
    maximo = Math.max(maximo, activo);
    await new Promise((resolver) => setTimeout(resolver, 5));
    activo--;
    return sesion();
  } });
  const entorno = { locks: bloqueos, cookieEnabled: true, isSecureContext: true,
    BroadcastChannel: class { close() {} } };
  const results = await Promise.all([iniciarSesionNavegador(slug, crearClientDePrueba(), entorno), iniciarSesionNavegador(slug, crearClientDePrueba(), entorno)]);
  assert.equal(maximo, 1);
  assert.equal(nombres[0], nombres[1]);
  assert.equal(results[0].negocio.slug, slug);
});

test('T100: coordinación o cookies no disponibles fallan antes de iniciar sesión', async () => {
  const valido = { locks: { request: async (_name, _options, handler) => handler() },
    cookieEnabled: true, isSecureContext: true, BroadcastChannel: class { close() {} } };
  for (const ajustes of [{ locks: null }, { cookieEnabled: false }, { isSecureContext: false },
    { BroadcastChannel: undefined }, { BroadcastChannel: class { constructor() { throw Error('bloqueado'); } } }]) {
    let llamadas = 0;
    await assert.rejects(iniciarSesionNavegador(slug, { iniciarSesionVerificada() { llamadas++; } }, { ...valido, ...ajustes }),
      (error) => ['cookies', 'coordination'].includes(error.tipo));
    assert.equal(llamadas, 0);
  }
  await assert.rejects(iniciarSesionNavegador(slug, {}, { ...valido, locks: { request: async () => { throw Error('denegado'); } } }),
    (error) => error.tipo === 'coordination');
});

// La credencial anterior no puede seguir autorizando escrituras tras un 401
// o una nueva inicialización interrumpida a mitad de su comprobación.
test('T099–T100: 401 y fallo al verificar invalidan el CSRF previo', async () => {
  let fail = false;
  let llamadas = 0;
  const client = crearPortalClient(slug, { ejecutarFetch: async () => {
    llamadas++;
    return fail ? respuesta({ codigo: 'portal_401', mensaje: 'Reinicie', accion: 'reiniciar' }, 401) : respuesta(sesion());
  } });
  await client.iniciarSesionVerificada();
  fail = true;
  await assert.rejects(client.solicitar('catalogo'), (error) => error.status === 401 && error.accion === 'reiniciar');
  await assert.rejects(client.solicitar('apartados', { method: 'POST' }), /sesión/i);
  assert.equal(llamadas, 3);
  fail = false;
  await client.iniciarSesionVerificada();
  fail = true;
  await assert.rejects(client.iniciarSesionVerificada());
  await assert.rejects(client.solicitar('apartados', { method: 'POST' }), /sesión/i);
});

test('T099: una petición agotada termina como fallo de transporte', async () => {
  const client = crearPortalClient(slug, { tiempoLimiteMs: 5, ejecutarFetch: async (_url, opciones) =>
    new Promise((_resolve, rechazar) => {
      opciones.signal.addEventListener('abort', () => rechazar(opciones.signal.reason), { once: true });
    }) });
  // Mantiene el proceso vivo durante el timeout, igual que un socket de fetch real.
  const keepAlive = setInterval(() => {}, 100);
  try { await assert.rejects(client.solicitar('catalogo'), (error) => error.tipo === 'network' && error.status === 0); }
  finally { clearInterval(keepAlive); }
});
