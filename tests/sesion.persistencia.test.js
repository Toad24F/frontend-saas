import test from 'node:test';
import assert from 'node:assert/strict';

const crearAlmacenamiento = () => {
  const valores = new Map();
  return { getItem: (clave) => valores.get(clave) ?? null, setItem: (clave, valor) => valores.set(clave, valor), removeItem: (clave) => valores.delete(clave) };
};
let secuencia = 0;
async function conEntornoSesion(ejecutar) {
  const originales = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, window: globalThis.window };
  globalThis.localStorage = crearAlmacenamiento(); globalThis.sessionStorage = crearAlmacenamiento(); globalThis.window = new EventTarget();
  const peticiones = [];
  globalThis.fetch = async (ruta, opciones) => {
    peticiones.push({ ruta: String(ruta), ...opciones });
    if (String(ruta).endsWith('/auth/logout')) return new Response(null, { status: 204 });
    return Response.json(String(ruta).endsWith('/auth/login') ? { accessToken: 'test-access', usuario: { id: 1, rol: 'recepcionista', negocioId: 2 } } : { user: { sub: 1, rol: 'recepcionista', negocioId: 2 } });
  };
  const importarSesion = () => import(`../src/connected/modules/autenticacion/sesion.estado.js?persistencia=${++secuencia}`);
  try { await ejecutar({ importarSesion, peticiones }); }
  finally { Object.assign(globalThis, originales); }
}
test('cerrar la pestaña y reabrir restaura el mismo acceso validando perfil, sin otro ingreso', async () => conEntornoSesion(async ({ importarSesion, peticiones }) => {
  const primera = await importarSesion(); await primera.iniciarSesion('qa@example.test', 'test-password');
  assert.equal(localStorage.getItem('cita-session'), 'test-access');
  globalThis.sessionStorage = crearAlmacenamiento();
  const reabierta = await importarSesion(); assert.equal(await reabierta.restaurarSesion(), true);
  assert.equal(reabierta.usuarioActual.id, 1);
  assert.ok(peticiones.at(-1).ruta.endsWith('/auth/profile'));
  assert.equal(peticiones.at(-1).headers.Authorization, 'Bearer test-access');
  assert.equal(peticiones.filter((x) => x.ruta.endsWith('/auth/login')).length, 1);
}));
test('401 por vencimiento o revocación elimina acceso persistido y datos de sesión', async () => conEntornoSesion(async ({ importarSesion }) => {
  const sesion = await importarSesion(); await sesion.iniciarSesion('qa@example.test', 'test-password');
  globalThis.fetch = async () => Response.json({ message: 'Sesión no válida' }, { status: 401 });
  await assert.rejects(sesion.restaurarSesion(), (error) => error.status === 401);
  assert.equal(localStorage.getItem('cita-session'), null);
  assert.equal(sessionStorage.getItem('cita-session'), null);
  assert.equal(sesion.usuarioActual, null);
}));
test('un fallo temporal no borra el acceso ni se convierte en sesión autorizada', async () => conEntornoSesion(async ({ importarSesion }) => {
  localStorage.setItem('cita-session', 'test-access');
  const sesion = await importarSesion();
  globalThis.fetch = async () => Response.json({ message: 'Temporal' }, { status: 503 });
  await assert.rejects(sesion.restaurarSesion());
  assert.equal(localStorage.getItem('cita-session'), 'test-access');
  assert.equal(sesion.usuarioActual, null);
}));
test('cerrar sesión y olvidar tras cambiar contraseña eliminan ambas copias', async () => conEntornoSesion(async ({ importarSesion, peticiones }) => {
  const sesion = await importarSesion(); await sesion.iniciarSesion('qa@example.test', 'test-password'); await sesion.cerrarSesion();
  const cierre = peticiones.at(-1);
  assert.ok(cierre.ruta.endsWith('/auth/logout'));
  assert.equal(cierre.method, 'POST');
  assert.equal(cierre.headers.Authorization, 'Bearer test-access');
  assert.equal(cierre.body, undefined);
  assert.equal(localStorage.getItem('cita-session'), null); assert.equal(sessionStorage.getItem('cita-session'), null);
  await sesion.iniciarSesion('qa@example.test', 'test-password'); sesion.olvidarSesion();
  assert.equal(localStorage.getItem('cita-session'), null); assert.equal(sesion.usuarioActual, null);
}));
test('sesión anterior en sessionStorage migra solo tras validar el perfil', async () => conEntornoSesion(async ({ importarSesion }) => {
  sessionStorage.setItem('cita-session', 'legacy-test');
  const sesion = await importarSesion(); assert.equal(localStorage.getItem('cita-session'), null);
  await sesion.restaurarSesion(); assert.equal(localStorage.getItem('cita-session'), 'legacy-test');
}));
test('almacenamiento persistente bloqueado mantiene el acceso de la pestaña', async () => conEntornoSesion(async ({ importarSesion }) => {
  globalThis.localStorage = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Bloqueado'); }, removeItem() { throw new Error('Bloqueado'); } };
  const sesion = await importarSesion(); await sesion.iniciarSesion('qa@example.test', 'test-password');
  assert.equal(sessionStorage.getItem('cita-session'), 'test-access');
  const recargada = await importarSesion();
  assert.equal(await recargada.restaurarSesion(), true);
  assert.equal(recargada.usuarioActual.id, 1);
  assert.doesNotThrow(() => recargada.olvidarSesion());
  assert.equal(sessionStorage.getItem('cita-session'), null);
}));
test('cierre o cambio de cuenta en otra pestaña invalida la UI sin borrar su nueva sesión', async () => conEntornoSesion(async ({ importarSesion }) => {
  const sesion = await importarSesion(); await sesion.iniciarSesion('qa@example.test', 'test-password');
  localStorage.setItem('cita-session', 'another-test');
  window.dispatchEvent(Object.assign(new Event('storage'), { key: 'cita-session', newValue: 'another-test', storageArea: localStorage }));
  assert.equal(sesion.usuarioActual, null); assert.equal(sessionStorage.getItem('cita-session'), null);
  assert.equal(localStorage.getItem('cita-session'), 'another-test');
  assert.equal(await sesion.restaurarSesion(), false);
}));
test('una respuesta de perfil tardía no restaura la cuenta retirada desde otra pestaña', async () => conEntornoSesion(async ({ importarSesion }) => {
  const sesion = await importarSesion(); await sesion.iniciarSesion('qa@example.test', 'test-password');
  let resolver;
  globalThis.fetch = () => new Promise((r) => { resolver = r; });
  const pendiente = sesion.restaurarSesion();
  localStorage.removeItem('cita-session');
  window.dispatchEvent(Object.assign(new Event('storage'), { key: 'cita-session', newValue: null, storageArea: localStorage }));
  resolver(Response.json({ user: { sub: 1, rol: 'recepcionista', negocioId: 2 } }));
  assert.equal(await pendiente, false); assert.equal(sesion.usuarioActual, null);
  assert.equal(localStorage.getItem('cita-session'), null);
}));
test('un 401 de una petición antigua no borra una nueva sesión ya iniciada', async () => conEntornoSesion(async ({ importarSesion }) => {
  const sesion = await importarSesion(); await sesion.iniciarSesion('qa@example.test', 'test-password');
  let resolver;
  globalThis.fetch = () => new Promise((r) => { resolver = r; });
  const pendiente = sesion.api('/citas');
  globalThis.fetch = async () => Response.json({ accessToken: 'new-test-access', usuario: { id: 2, rol: 'profesional', negocioId: 2 } });
  await sesion.iniciarSesion('other@example.test', 'test-password');
  resolver(Response.json({ message: 'Sesión anterior vencida' }, { status: 401 }));
  await assert.rejects(pendiente);
  assert.equal(localStorage.getItem('cita-session'), 'new-test-access');
  assert.equal(sesion.usuarioActual.id, 2);
}));
