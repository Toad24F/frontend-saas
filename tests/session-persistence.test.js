import test from 'node:test';
import assert from 'node:assert/strict';

const memory = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};
let sequence = 0;
async function scenario(run) {
  const saved = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, window: globalThis.window };
  globalThis.localStorage = memory(); globalThis.sessionStorage = memory(); globalThis.window = new EventTarget();
  const requests = [];
  globalThis.fetch = async (path, options) => {
    requests.push({ path: String(path), ...options });
    return Response.json(String(path).endsWith('/auth/login') ? { accessToken: 'test-access', usuario: { id: 1, rol: 'recepcionista', negocioId: 2 } } : { user: { sub: 1, rol: 'recepcionista', negocioId: 2 } });
  };
  const fresh = () => import(`../src/connected/modules/auth/session.js?persistence=${++sequence}`);
  try { await run({ fresh, requests }); }
  finally { Object.assign(globalThis, saved); }
}
test('cerrar la pestaña y reabrir restaura el mismo acceso validando perfil, sin otro login', async () => scenario(async ({ fresh, requests }) => {
  const first = await fresh(); await first.login('qa@example.test', 'test-password');
  assert.equal(localStorage.getItem('cita-session'), 'test-access');
  globalThis.sessionStorage = memory();
  const reopened = await fresh(); assert.equal(await reopened.restoreSession(), true);
  assert.equal(reopened.user.id, 1);
  assert.ok(requests.at(-1).path.endsWith('/auth/profile'));
  assert.equal(requests.at(-1).headers.Authorization, 'Bearer test-access');
  assert.equal(requests.filter((x) => x.path.endsWith('/auth/login')).length, 1);
}));
test('401 por vencimiento o revocación elimina acceso persistido y datos de sesión', async () => scenario(async ({ fresh }) => {
  const session = await fresh(); await session.login('qa@example.test', 'test-password');
  globalThis.fetch = async () => Response.json({ message: 'Sesión no válida' }, { status: 401 });
  await assert.rejects(session.restoreSession(), (error) => error.status === 401);
  assert.equal(localStorage.getItem('cita-session'), null);
  assert.equal(sessionStorage.getItem('cita-session'), null);
  assert.equal(session.user, null);
}));
test('un fallo temporal no borra el acceso ni se convierte en sesión autorizada', async () => scenario(async ({ fresh }) => {
  localStorage.setItem('cita-session', 'test-access');
  const session = await fresh();
  globalThis.fetch = async () => Response.json({ message: 'Temporal' }, { status: 503 });
  await assert.rejects(session.restoreSession());
  assert.equal(localStorage.getItem('cita-session'), 'test-access');
  assert.equal(session.user, null);
}));
test('cerrar sesión y olvidar tras cambiar contraseña eliminan ambas copias', async () => scenario(async ({ fresh }) => {
  const session = await fresh(); await session.login('qa@example.test', 'test-password'); await session.logout();
  assert.equal(localStorage.getItem('cita-session'), null); assert.equal(sessionStorage.getItem('cita-session'), null);
  await session.login('qa@example.test', 'test-password'); session.forgetSession();
  assert.equal(localStorage.getItem('cita-session'), null); assert.equal(session.user, null);
}));
test('sesión anterior en sessionStorage migra solo tras validar el perfil', async () => scenario(async ({ fresh }) => {
  sessionStorage.setItem('cita-session', 'legacy-test');
  const session = await fresh(); assert.equal(localStorage.getItem('cita-session'), null);
  await session.restoreSession(); assert.equal(localStorage.getItem('cita-session'), 'legacy-test');
}));
test('almacenamiento persistente bloqueado mantiene el acceso de la pestaña', async () => scenario(async ({ fresh }) => {
  globalThis.localStorage = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Bloqueado'); }, removeItem() { throw new Error('Bloqueado'); } };
  const session = await fresh(); await session.login('qa@example.test', 'test-password');
  assert.equal(sessionStorage.getItem('cita-session'), 'test-access');
  assert.equal(await session.restoreSession(), true);
  assert.doesNotThrow(() => session.forgetSession());
}));
test('cierre o cambio de cuenta en otra pestaña invalida la UI sin borrar su nueva sesión', async () => scenario(async ({ fresh }) => {
  const session = await fresh(); await session.login('qa@example.test', 'test-password');
  localStorage.setItem('cita-session', 'another-test');
  window.dispatchEvent(Object.assign(new Event('storage'), { key: 'cita-session', newValue: 'another-test', storageArea: localStorage }));
  assert.equal(session.user, null); assert.equal(sessionStorage.getItem('cita-session'), null);
  assert.equal(localStorage.getItem('cita-session'), 'another-test');
  assert.equal(await session.restoreSession(), false);
}));
test('una respuesta de perfil tardía no restaura la cuenta retirada desde otra pestaña', async () => scenario(async ({ fresh }) => {
  const session = await fresh(); await session.login('qa@example.test', 'test-password');
  let resolve;
  globalThis.fetch = () => new Promise((r) => { resolve = r; });
  const pending = session.restoreSession();
  localStorage.removeItem('cita-session');
  window.dispatchEvent(Object.assign(new Event('storage'), { key: 'cita-session', newValue: null, storageArea: localStorage }));
  resolve(Response.json({ user: { sub: 1, rol: 'recepcionista', negocioId: 2 } }));
  assert.equal(await pending, false); assert.equal(session.user, null);
  assert.equal(localStorage.getItem('cita-session'), null);
}));
test('un 401 de una petición antigua no borra una nueva sesión ya iniciada', async () => scenario(async ({ fresh }) => {
  const session = await fresh(); await session.login('qa@example.test', 'test-password');
  let resolve;
  globalThis.fetch = () => new Promise((r) => { resolve = r; });
  const pending = session.api('/citas');
  globalThis.fetch = async () => Response.json({ accessToken: 'new-test-access', usuario: { id: 2, rol: 'profesional', negocioId: 2 } });
  await session.login('other@example.test', 'test-password');
  resolve(Response.json({ message: 'Sesión anterior vencida' }, { status: 401 }));
  await assert.rejects(pending);
  assert.equal(localStorage.getItem('cita-session'), 'new-test-access');
  assert.equal(session.user.id, 2);
}));
