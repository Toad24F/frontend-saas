import test from 'node:test';
import assert from 'node:assert/strict';
import { api, login, loadBackendData, catalogPayload, schedulePayload, modeUrl, availablePage, defaultPage } from '../src/connected/backend.js';
import { db } from '../src/shared/data.js';
import { validateNewPassword } from '../src/connected/modules/auth/password-policy.js';
import { getBranchQuota } from '../src/connected/modules/sucursales/quota.js';

test('semana completa: conserva IDs, descansos y orden por día; excluye borradores vacíos', () => {
  const row = { id: 12, day: 1, branchId: 3, start: '07:00', end: '12:00', breakStart: '09:00', breakEnd: '09:30', enabled: true };
  const result = schedulePayload([row, { ...row, id: -2, branchId: 4, start: '12:00', end: '00:00', breakStart: '', breakEnd: '' }, { ...row, id: 13, day: 2, enabled: false }, { id: -104, day: 4, enabled: false, start: '', end: '' }]);
  assert.equal(result.franjas.length, 3);
  assert.deepEqual(result.franjas[0], { id: 12, diaSemana: 1, orden: 0, sucursalId: 3, inicioMinutos: 420, finMinutos: 720, descansoInicioMinutos: 540, descansoFinMinutos: 570, activo: true });
  assert.equal(result.franjas[1].id, undefined);
  assert.equal(result.franjas[1].orden, 1);
  assert.equal(result.franjas[1].finMinutos, 1440);
  assert.equal(result.franjas[2].orden, 0);
  assert.equal(result.franjas[2].activo, false);
  assert.deepEqual(schedulePayload([]), { franjas: [] });
});

test('catálogos solo envían los campos admitidos por el backend', () => {
  assert.deepEqual(catalogPayload('services', { name: 'Consulta', price: 350.5, duration: 20, description: 'demo', tenantId: 9 }), { nombre: 'Consulta', descripcion: 'demo', costo: '350.5', duracionMinutos: 20 });
  assert.deepEqual(catalogPayload('branches', { name: 'Centro', address: 'Calle 1', phone: '+52 614 1234567', timezone: 'America/Chihuahua', notes: '', maps: '' }), { nombre: 'Centro', direccion: 'Calle 1', telefono: '+52 614 1234567', zonaHoraria: 'America/Chihuahua', notasLlegada: null, urlGoogleMaps: null });
  assert.equal(modeUrl('/admin/profesionales', true), '/admin/profesionales?demo=1');
  assert.equal(modeUrl('/admin/profesionales', false), '/admin/profesionales');
});

test('las contraseñas nuevas respetan longitud, bytes y confirmación', () => {
  assert.doesNotThrow(() => validateNewPassword('clave-segura-123', 'clave-segura-123'));
  assert.throws(() => validateNewPassword('corta'), /al menos 12/);
  assert.throws(() => validateNewPassword('á'.repeat(40)), /72 bytes/);
  assert.throws(() => validateNewPassword('clave-segura-123', 'otra-clave-123'), /no coinciden/);
});

test('API interpreta 204 y errores de validación sin ocultarlos', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api('/bloqueos/1', 'DELETE'), null);
    global.fetch = async () => Response.json({ message: ['Horario solapado', 'Sucursal no asignada'] }, { status: 400 });
    await assert.rejects(api('/profesionales/2/horario', 'PUT', { franjas: [] }), /Horario solapado · Sucursal no asignada/);
  } finally { global.fetch = original; }
});

test('carga datos reales aislados del negocio, sin inventar citas, y envía autorización', async () => {
  const original = global.fetch;
  const storage = global.sessionStorage;
  const requests = [];
  global.sessionStorage = { setItem() {}, removeItem() {} };
  const responses = {
    '/auth/login': { accessToken: 'test-token', usuario: { id: 2, nombre: 'Admin', rol: 'admin_negocio', negocioId: 7 } },
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
    global.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      requests.push({ path, options });
      assert.ok(path in responses, `Ruta inesperada: ${path}`);
      return Response.json(responses[path]);
    };
    await login('test@example.com', 'test-password');
    assert.equal(defaultPage(), 'profesionales');
    assert.equal(availablePage('servicios'), true);
    assert.equal(availablePage('agenda'), false);
    assert.equal(await loadBackendData(), 7);
    assert.deepEqual(getBranchQuota(), responses['/sucursales/cupo']);
    assert.deepEqual(db.professionals[0].branchIds, [20]);
    assert.deepEqual(db.professionals[0].serviceIds, [10]);
    assert.equal(db.professionals[0].active, false);
    assert.equal(db.schedules[0].end, '00:00');
    assert.equal(db.blocks[0].professionalId, 30);
    assert.equal(db.receptionists[0].email, 'recepcion@example.com');
    assert.deepEqual(db.appointments, []);
    assert.deepEqual(db.clients, []);
    assert.equal(db.professionals[0].tenantId, 7);
    assert.ok(requests.slice(1).every(({ options }) => options.headers.Authorization === 'Bearer test-token'));
  } finally { global.fetch = original; global.sessionStorage = storage; }
});

test('el profesional ve sus sucursales asignadas y la autoría real de servicios', async () => {
  const original = global.fetch;
  const storage = global.sessionStorage;
  global.sessionStorage = { setItem() {}, removeItem() {} };
  const responses = {
    '/auth/login': { accessToken: 'professional-token', usuario: { id: 5, nombre: 'Ana Ruiz', email: 'ana@example.com', rol: 'profesional', negocioId: 7 } },
    '/profesionales/5/servicios': [{ id: 11, nombre: 'Consulta', costo: '300.00', duracionMinutos: 30, descripcion: 'Inicial', creadorPersonalId: 5, activo: true, seleccionado: true }],
    '/profesionales/5/horario': [],
    '/profesionales/5/oferta': { cuentaActiva: true, sucursales: [{ id: 20, nombre: 'Centro', sucursalActiva: true, atencionActiva: false, servicios: [] }] },
    '/bloqueos': [],
  };
  try {
    global.fetch = async (url) => Response.json(responses[new URL(url).pathname]);
    await login('ana@example.com', 'test-password');
    assert.equal(defaultPage(), 'servicios');
    assert.equal(availablePage('profesionales'), false);
    assert.equal(availablePage('cuenta'), true);
    await loadBackendData();
    assert.deepEqual(db.professionals[0].branchIds, [20]);
    assert.equal(db.branches[0].name, 'Centro');
    assert.equal(db.branches[0].active, false);
    assert.equal(db.services[0].description, 'Inicial');
    assert.equal(db.services[0].creatorId, 5);
  } finally { global.fetch = original; global.sessionStorage = storage; }
});

test('el panel SA resume licencias y envíos reales sin datos de citas', async () => {
  const original = global.fetch;
  const storage = global.sessionStorage;
  global.sessionStorage = { setItem() {}, removeItem() {} };
  const responses = {
    '/auth/login': { accessToken: 'sa-token', usuario: { id: 1, nombre: 'Superadmin', email: 'sa@example.com', rol: 'superadmin', negocioId: null } },
    '/negocios': [{ id: 7, nombre: 'Clínica', identificadorPublico: 'clinica', emailContacto: null, administrador: { id: 9, email: 'admin@example.com', activadoEn: null }, licencia: { id: 11 } }],
    '/licencias/11/vigencia': { estado: 'suspension_pendiente', condicionAcceso: true, tiempoRestante: { dias: 5, horas: 0, minutos: 0 } },
    '/negocios/7/envios': [{ id: '123', estado: 'fallido' }],
  };
  try {
    global.fetch = async (url) => Response.json(responses[new URL(url).pathname]);
    await login('sa@example.com', 'test-password');
    assert.equal(defaultPage(), 'plataforma');
    assert.equal(availablePage('negocio'), true);
    assert.equal(availablePage('recepcionistas'), false);
    await loadBackendData();
    assert.equal(db.tenants[0].license, 'suspension_pendiente');
    assert.equal(db.tenants[0].failedDeliveries, 1);
    assert.equal(db.tenants[0].category, 'Pendiente de activación');
    assert.deepEqual(db.appointments, []);
  } finally { global.fetch = original; global.sessionStorage = storage; }
});
