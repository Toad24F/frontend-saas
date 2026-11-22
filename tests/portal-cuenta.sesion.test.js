import test from 'node:test';
import assert from 'node:assert/strict';
import { iniciarSesion, restaurarSesion, cargarDatosBackend, olvidarSesion, usuarioActual } from '../src/connected/backend.js';
import { datosAplicacion } from '../src/shared/aplicacion.datos.js';
import { urlPortalCuenta } from '../src/shared/cuenta.portal.js';

// Solo HTTP doble: sesión privada y catálogos vacíos del negocio propio. Una
// consulta a /negocios sería un error: sigue siendo exclusiva de superadmin.
async function conSesion(ejecutar) {
  const fetchOriginal = global.fetch, almacenamientoOriginal = global.sessionStorage;
  const llamadas = [];
  let identificador = 'clinica-login';
  global.sessionStorage = { setItem() {}, removeItem() {} };
  global.fetch = async (url) => {
    const ruta = new URL(url).pathname;
    llamadas.push(ruta);
    const cuenta = { id: 2, sub: 2, nombre: 'Admin ficticio', negocioId: 7, rol: 'admin_negocio', identificadorPublico: identificador };
    if (ruta === '/auth/login') return Response.json({ accessToken: 'token-ficticio', usuario: cuenta });
    if (ruta === '/auth/profile') return Response.json({ user: cuenta });
    if (ruta === '/sucursales/cupo') return Response.json({ negocioId: 7, disponibles: 1 });
    assert.ok(['/servicios', '/sucursales', '/profesionales', '/recepcionistas', '/bloqueos'].includes(ruta), `Petición inesperada: ${ruta}`);
    return Response.json(ruta === '/bloqueos' ? { bloqueos: [], pagina: 1, limite: 25, total: 0 } : []);
  };
  try { await ejecutar({ calls: llamadas, setIdentifier(valor) { identificador = valor; } }); }
  finally { olvidarSesion(); global.fetch = fetchOriginal; global.sessionStorage = almacenamientoOriginal; }
}

test('perfil conectado: inicio de sesión carga el slug real y habilita enlace público sin consulta global', async () => {
  await conSesion(async ({ calls: llamadas }) => {
    await iniciarSesion('admin@example.test', 'credencial-ficticia'); await cargarDatosBackend();
    assert.equal(datosAplicacion.tenants[0].slug, 'clinica-login');
    assert.equal(urlPortalCuenta({ usuario: usuarioActual, negocio: datosAplicacion.tenants[0], origen: 'https://citalendar.example' }), 'https://citalendar.example/reservas/clinica-login');
    assert.ok(!llamadas.some((ruta) => ruta.startsWith('/negocios')));
  });
});

test('perfil conectado: restauración reemplaza el identificador anterior por el vigente', async () => {
  await conSesion(async ({ setIdentifier: guardarIdentificador }) => {
    await iniciarSesion('admin@example.test', 'credencial-ficticia'); await cargarDatosBackend();
    guardarIdentificador('clinica-actualizada'); await restaurarSesion(); await cargarDatosBackend();
    assert.equal(datosAplicacion.tenants[0].slug, 'clinica-actualizada');
  });
});

test('perfil conectado: contrato antiguo o slug inválido bloquea sin reutilizar el enlace anterior', async () => {
  for (const identificador of [undefined, null, '', '../ajeno', 'clinica?demo=1', '<script>']) {
    await conSesion(async ({ setIdentifier: guardarIdentificador }) => {
      await iniciarSesion('admin@example.test', 'credencial-ficticia'); await cargarDatosBackend();
      guardarIdentificador(identificador); await restaurarSesion(); await cargarDatosBackend();
      assert.equal(datosAplicacion.tenants[0].slug, '');
      assert.equal(urlPortalCuenta({ usuario: usuarioActual, negocio: datosAplicacion.tenants[0], origen: 'https://citalendar.example' }), null);
    });
  }
});
