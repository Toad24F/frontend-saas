import test from 'node:test';
import assert from 'node:assert/strict';
import { login, restoreSession, loadBackendData, forgetSession, user } from '../src/connected/backend.js';
import { db } from '../src/shared/data.js';
import { accountPortalUrl } from '../src/shared/account-portal.js';

// Solo HTTP doble: sesión privada y catálogos vacíos del negocio propio. Una
// consulta a /negocios sería un error: sigue siendo exclusiva de superadmin.
async function withSession(run) {
  const originalFetch = global.fetch, originalStorage = global.sessionStorage;
  const calls = [];
  let identifier = 'clinica-login';
  global.sessionStorage = { setItem() {}, removeItem() {} };
  global.fetch = async (url) => {
    const path = new URL(url).pathname;
    calls.push(path);
    const account = { id: 2, sub: 2, nombre: 'Admin ficticio', negocioId: 7, rol: 'admin_negocio', identificadorPublico: identifier };
    if (path === '/auth/login') return Response.json({ accessToken: 'token-ficticio', usuario: account });
    if (path === '/auth/profile') return Response.json({ user: account });
    if (path === '/sucursales/cupo') return Response.json({ negocioId: 7, disponibles: 1 });
    assert.ok(['/servicios', '/sucursales', '/profesionales', '/recepcionistas', '/bloqueos'].includes(path), `Petición inesperada: ${path}`);
    return Response.json([]);
  };
  try { await run({ calls, setIdentifier(value) { identifier = value; } }); }
  finally { forgetSession(); global.fetch = originalFetch; global.sessionStorage = originalStorage; }
}

test('perfil conectado: login carga el slug real y habilita enlace público sin consulta global', async () => {
  await withSession(async ({ calls }) => {
    await login('admin@example.test', 'credencial-ficticia'); await loadBackendData();
    assert.equal(db.tenants[0].slug, 'clinica-login');
    assert.equal(accountPortalUrl({ user, tenant: db.tenants[0], origin: 'https://citalendar.example' }), 'https://citalendar.example/reservas/clinica-login');
    assert.ok(!calls.some((path) => path.startsWith('/negocios')));
  });
});

test('perfil conectado: restauración reemplaza el identificador anterior por el vigente', async () => {
  await withSession(async ({ setIdentifier }) => {
    await login('admin@example.test', 'credencial-ficticia'); await loadBackendData();
    setIdentifier('clinica-actualizada'); await restoreSession(); await loadBackendData();
    assert.equal(db.tenants[0].slug, 'clinica-actualizada');
  });
});

test('perfil conectado: contrato antiguo o slug inválido bloquea sin reutilizar el enlace anterior', async () => {
  for (const identifier of [undefined, null, '', '../ajeno', 'clinica?demo=1', '<script>']) {
    await withSession(async ({ setIdentifier }) => {
      await login('admin@example.test', 'credencial-ficticia'); await loadBackendData();
      setIdentifier(identifier); await restoreSession(); await loadBackendData();
      assert.equal(db.tenants[0].slug, '');
      assert.equal(accountPortalUrl({ user, tenant: db.tenants[0], origin: 'https://citalendar.example' }), null);
    });
  }
});
