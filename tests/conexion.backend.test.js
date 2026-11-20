import test from 'node:test';
import assert from 'node:assert/strict';
import { api, iniciarSesion, restaurarSesion, cargarDatosBackend, crearPayloadCatalogo, crearPayloadHorario, urlSegunModo, paginaPermitida, paginaInicial } from '../src/connected/backend.js';
import { datosAplicacion } from '../src/shared/aplicacion.datos.js';
import { validarContrasenaNueva } from '../src/connected/modules/autenticacion/contrasena.politica.js';
import { obtenerCupoSucursales } from '../src/connected/modules/sucursales/sucursales.cupo.js';

test('semana completa: conserva IDs y orden por día sin descanso incrustado; excluye borradores vacíos', () => {
  const fila = { id: 12, day: 1, branchId: 3, start: '07:00', end: '12:00', breakStart: '09:00', breakEnd: '09:30', enabled: true };
  const resultado = crearPayloadHorario([fila, { ...fila, id: -2, branchId: 4, start: '12:00', end: '00:00', breakStart: '', breakEnd: '' }, { ...fila, id: 13, day: 2, enabled: false }, { id: -104, day: 4, enabled: false, start: '', end: '' }]);
  assert.equal(resultado.franjas.length, 3);
  assert.deepEqual(resultado.franjas[0], { id: 12, diaSemana: 1, orden: 0, sucursalId: 3, inicioMinutos: 420, finMinutos: 720, activo: true });
  assert.equal(resultado.franjas[1].id, undefined);
  assert.equal(resultado.franjas[1].orden, 1);
  assert.equal(resultado.franjas[1].finMinutos, 1440);
  assert.equal(resultado.franjas[2].orden, 0);
  assert.equal(resultado.franjas[2].activo, false);
  assert.deepEqual(crearPayloadHorario([]), { franjas: [] });
});

test('catálogos solo envían los campos admitidos por el backend', () => {
  assert.deepEqual(crearPayloadCatalogo('services', { name: 'Consulta', price: 350.5, duration: 20, description: 'demo', tenantId: 9 }), { nombre: 'Consulta', descripcion: 'demo', costo: '350.5', duracionMinutos: 20 });
  assert.deepEqual(crearPayloadCatalogo('branches', { name: 'Centro', address: 'Calle 1', phone: '+52 614 1234567', timezone: 'America/Chihuahua', notes: '', maps: '' }), { nombre: 'Centro', direccion: 'Calle 1', telefono: '+52 614 1234567', zonaHoraria: 'America/Chihuahua', notasLlegada: null, urlGoogleMaps: null });
  assert.equal(urlSegunModo('/admin/profesionales', true), '/admin/profesionales?demo=1');
  assert.equal(urlSegunModo('/admin/profesionales', false), '/admin/profesionales');
});

test('las contraseñas nuevas respetan longitud, bytes y confirmación', () => {
  assert.doesNotThrow(() => validarContrasenaNueva('clave-segura-123', 'clave-segura-123'));
  assert.throws(() => validarContrasenaNueva('corta'), /al menos 12/);
  assert.throws(() => validarContrasenaNueva('á'.repeat(40)), /72 bytes/);
  assert.throws(() => validarContrasenaNueva('clave-segura-123', 'otra-clave-123'), /no coinciden/);
});

test('API interpreta 204 y errores de validación sin ocultarlos', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api('/bloqueos/1', 'DELETE'), null);
    global.fetch = async () => Response.json({ message: ['Horario solapado', 'Sucursal no asignada'] }, { status: 400 });
    await assert.rejects(api('/profesionales/2/horario', 'PUT', { franjas: [] }), (error) => {
      assert.match(error.message, /Horario solapado · Sucursal no asignada/);
      assert.equal(error.status, 400);
      return true;
    });
  } finally { global.fetch = original; }
});

test('Recepción accede a disponibilidad privada y conserva cuenta', async () => {
  const original = global.fetch;
  const almacenamiento = global.sessionStorage;
  global.sessionStorage = { setItem() {}, removeItem() {} };
  try {
    global.fetch = async () => Response.json({ accessToken: 'reception-token', usuario: { id: 8, nombre: 'Recepción', rol: 'recepcionista', negocioId: 7 } });
    await iniciarSesion('recepcion@example.com', 'test-password');
    // M4-T088 incorpora Agenda como inicio sin retirar las capacidades anteriores.
    assert.equal(paginaInicial(), 'agenda');
    assert.equal(paginaPermitida('disponibilidad'), true);
    assert.equal(paginaPermitida('cuenta'), true);
    assert.equal(paginaPermitida('profesionales'), false);
  } finally { global.fetch = original; global.sessionStorage = almacenamiento; }
});

test('carga datos reales aislados del negocio, sin inventar citas, y envía autorización', async () => {
  const original = global.fetch;
  const almacenamiento = global.sessionStorage;
  const solicitudes = [];
  global.sessionStorage = { setItem() {}, removeItem() {} };
  const respuestas = {
    '/auth/login': { accessToken: 'test-token', usuario: { id: 2, nombre: 'Admin', rol: 'admin_negocio', negocioId: 7, identificadorPublico: 'clinica-central' } },
    '/auth/profile': { user: { sub: 2, nombre: 'Admin', rol: 'admin_negocio', negocioId: 7, identificadorPublico: 'clinica-central' }, nombreNegocio: 'Clínica Central' },
    '/servicios': [{ id: 10, nombre: 'Consulta', costo: '500.00', duracionMinutos: 45, activo: true }],
    '/sucursales': [{ id: 20, nombre: 'Centro', direccion: 'Calle 1', telefono: '6141234567', zonaHoraria: 'America/Chihuahua', activo: true }],
    '/sucursales/cupo': { negocioId: 7, limiteSucursalesActivas: 3, sucursalesActivas: 1, disponibles: 2 },
    '/profesionales': [{ id: 30, nombre: 'Profesional', correo: 'test@example.com', activo: false }],
    '/recepcionistas': [{ id: 31, nombre: 'Recepción', email: 'recepcion@example.com', activo: true, activadoEn: '2026-10-10T12:00:00.000Z' }],
    '/bloqueos': [{ id: 40, personalId: 30, sucursalId: 20, tipo: 'vacaciones', motivo: 'Vacaciones', fechaInicio: '2026-10-10', fechaFin: '2026-10-11', inicioMinutos: null, finMinutos: null }],
    '/profesionales/30/sucursales': [20],
    '/profesionales/30/servicios': [{ id: 10, seleccionado: true }],
    '/profesionales/30/horario': [{ id: 50, diaSemana: 6, sucursalId: 20, inicioMinutos: 720, finMinutos: 1440, descansoInicioMinutos: null, descansoFinMinutos: null, activo: true }],
  };
  try {
    global.fetch = async (url, opciones) => {
      const ruta = new URL(url).pathname;
      solicitudes.push({ path: ruta, options: opciones });
      assert.ok(ruta in respuestas, `Ruta inesperada: ${ruta}`);
      return Response.json(respuestas[ruta]);
    };
    await iniciarSesion('test@example.com', 'test-password');
    await restaurarSesion();
    assert.equal(paginaInicial(), 'agenda');
    assert.equal(paginaPermitida('servicios'), true);
    assert.equal(paginaPermitida('agenda'), true);
    assert.equal(await cargarDatosBackend(), 7);
    assert.equal(datosAplicacion.tenants[0].name, 'Clínica Central');
    assert.equal(datosAplicacion.tenants[0].slug, 'clinica-central');
    assert.deepEqual(obtenerCupoSucursales(), respuestas['/sucursales/cupo']);
    assert.deepEqual(datosAplicacion.professionals[0].branchIds, [20]);
    assert.deepEqual(datosAplicacion.professionals[0].serviceIds, [10]);
    assert.equal(datosAplicacion.professionals[0].active, false);
    assert.equal(datosAplicacion.schedules[0].end, '00:00');
    assert.equal(datosAplicacion.blocks[0].professionalId, 30);
    assert.equal(datosAplicacion.receptionists[0].email, 'recepcion@example.com');
    assert.deepEqual(datosAplicacion.appointments, []);
    assert.deepEqual(datosAplicacion.clients, []);
    assert.equal(datosAplicacion.professionals[0].tenantId, 7);
    assert.ok(solicitudes.slice(1).every(({ options: opciones }) => opciones.headers.Authorization === 'Bearer test-token'));
  } finally { global.fetch = original; global.sessionStorage = almacenamiento; }
});

test('el profesional ve sus sucursales asignadas y la autoría real de servicios', async () => {
  const original = global.fetch;
  const almacenamiento = global.sessionStorage;
  global.sessionStorage = { setItem() {}, removeItem() {} };
  const respuestas = {
    '/auth/login': { accessToken: 'professional-token', usuario: { id: 5, nombre: 'Ana Ruiz', email: 'ana@example.com', rol: 'profesional', negocioId: 7 } },
    '/profesionales/5/servicios': [{ id: 11, nombre: 'Consulta', costo: '300.00', duracionMinutos: 30, descripcion: 'Inicial', creadorPersonalId: 5, activo: true, seleccionado: true }],
    '/profesionales/5/horario': [],
    '/profesionales/5/oferta': { cuentaActiva: true, sucursales: [{ id: 20, nombre: 'Centro', sucursalActiva: true, atencionActiva: false, servicios: [] }] },
    '/sucursales': [
      { id: 20, nombre: 'Centro', direccion: 'Av. Principal 10', telefono: '6141234567', zonaHoraria: 'America/Chihuahua', urlGoogleMaps: 'https://www.google.com/maps?q=Centro', notasLlegada: 'Entrada norte', activo: true },
      { id: 21, nombre: 'Otra sede', direccion: 'Av. Sur 20', activo: true },
    ],
    '/bloqueos': [],
  };
  try {
    global.fetch = async (url) => Response.json(respuestas[new URL(url).pathname]);
    await iniciarSesion('ana@example.com', 'test-password');
    assert.equal(paginaInicial(), 'agenda');
    assert.equal(paginaPermitida('profesionales'), false);
    assert.equal(paginaPermitida('cuenta'), true);
    await cargarDatosBackend();
    assert.deepEqual(datosAplicacion.professionals[0].branchIds, [20]);
    assert.equal(datosAplicacion.branches[0].name, 'Centro');
    assert.equal(datosAplicacion.branches.length, 1);
    assert.equal(datosAplicacion.branches[0].address, 'Av. Principal 10');
    assert.equal(datosAplicacion.branches[0].phone, '6141234567');
    assert.equal(datosAplicacion.branches[0].maps, 'https://www.google.com/maps?q=Centro');
    assert.equal(datosAplicacion.branches[0].notes, 'Entrada norte');
    assert.equal(datosAplicacion.branches[0].active, false);
    assert.equal(datosAplicacion.services[0].description, 'Inicial');
    assert.equal(datosAplicacion.services[0].creatorId, 5);
    global.fetch = async (url) => new URL(url).pathname === '/sucursales'
      ? Response.json({ message: 'Acceso denegado: privilegios insuficientes.' }, { status: 403 })
      : Response.json(respuestas[new URL(url).pathname]);
    await cargarDatosBackend();
    assert.equal(datosAplicacion.branches[0].name, 'Centro');
    assert.equal(datosAplicacion.branches[0].address, '');
    assert.equal(datosAplicacion.branches[0].active, false);
  } finally { global.fetch = original; global.sessionStorage = almacenamiento; }
});

test('el panel SA resume licencias y envíos reales sin datos de citas', async () => {
  const original = global.fetch;
  const almacenamiento = global.sessionStorage;
  global.sessionStorage = { setItem() {}, removeItem() {} };
  const respuestas = {
    '/auth/login': { accessToken: 'sa-token', usuario: { id: 1, nombre: 'Superadmin', email: 'sa@example.com', rol: 'superadmin', negocioId: null } },
    '/negocios': [{ id: 7, nombre: 'Clínica', identificadorPublico: 'clinica', emailContacto: null, administrador: { id: 9, email: 'admin@example.com', activadoEn: null }, licencia: { id: 11 } }],
    '/licencias/11/vigencia': { estado: 'suspension_pendiente', condicionAcceso: true, tiempoRestante: { dias: 5, horas: 0, minutos: 0 } },
    '/negocios/7/envios': [{ id: '123', estado: 'fallido' }],
  };
  try {
    global.fetch = async (url) => Response.json(respuestas[new URL(url).pathname]);
    await iniciarSesion('sa@example.com', 'test-password');
    assert.equal(paginaInicial(), 'plataforma');
    assert.equal(paginaPermitida('negocio'), true);
    assert.equal(paginaPermitida('recepcionistas'), false);
    await cargarDatosBackend();
    assert.equal(datosAplicacion.tenants[0].license, 'suspension_pendiente');
    assert.equal(datosAplicacion.tenants[0].failedDeliveries, 1);
    assert.equal(datosAplicacion.tenants[0].category, 'Pendiente de activación');
    assert.deepEqual(datosAplicacion.appointments, []);
  } finally { global.fetch = original; global.sessionStorage = almacenamiento; }
});
