import test from 'node:test';
import assert from 'node:assert/strict';
import { crearOperacionesLicencia, validarPlazoSuspension } from '../src/connected/screens/negocio/licencia.operaciones.js';
import { renderEstadoLicencia, renderEnviosLicencia } from '../src/connected/screens/negocio/licencia.presentacion.js';
import { crearAlmacenamientoEnMemoria } from './datos-prueba/memoria.almacenamiento.js';

const valido = (estado = 'vigente') => ({ estado, venceEn: '2027-11-04T00:00:00.000Z',
  bloqueoProgramadoEn: null, condicionAcceso: estado === 'vigente' });
const clave = 'license_attempt_000001';

test('FALA-T024: cliente privado añade cabecera solo cuando la llamada la pide', async () => {
  const fetchAnterior = globalThis.fetch, almacenamientoAnterior = globalThis.sessionStorage;
  const llamadas = [];
  try {
    globalThis.sessionStorage = crearAlmacenamientoEnMemoria();
    globalThis.fetch = async (_url, opciones) => {
      llamadas.push(opciones.headers);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const { api } = await import('../src/connected/modules/autenticacion/sesion.estado.js?ala-license-header');
    await api('/licencias/5/renovar', 'POST', {}, { headers: { 'Idempotency-Key': clave } });
    await api('/negocios');
    assert.equal(llamadas[0]['Idempotency-Key'], clave);
    assert.equal(llamadas[1]['Idempotency-Key'], undefined);
  } finally { globalThis.fetch = fetchAnterior; globalThis.sessionStorage = almacenamientoAnterior; }
});

// La clave y el cuerpo deben existir en sessionStorage antes de tocar HTTP.
test('FALA-T024–T025: suspender guarda cuerpo y clave, los repite y acota cabecera privada', async () => {
  const almacenamiento = crearAlmacenamientoEnMemoria(); const llamadas = [];
  let fallo = true;
  const api = async (ruta, metodo = 'GET', cuerpo, opciones) => {
    llamadas.push({ path: ruta, method: metodo, body: cuerpo, options: opciones,
      saved: almacenamiento.getItem('citalendar:license:pending:7') });
    if (metodo === 'POST' && fallo) { fallo = false; throw Error('respuesta perdida'); }
    return valido('suspension_pendiente');
  };
  const operaciones = crearOperacionesLicencia({ api, almacenamiento, actorId: 7, generarClave: () => clave });
  await assert.rejects(operaciones.ejecutar('suspender', 2, 5, { plazoDias: 0 }));
  assert.deepEqual(operaciones.pendiente(), { action: 'suspender', businessId: 2, licenseId: 5,
    body: { plazoDias: 0 }, key: clave });
  await assert.rejects(operaciones.ejecutar('renovar', 2, 5, {}), /pendiente|comprobar/i);
  await operaciones.reintentar();
  const escrituras = llamadas.filter(({ method: metodo }) => metodo === 'POST');
  assert.equal(escrituras.length, 2);
  assert.ok(escrituras.every(({ saved: guardado }) => guardado && JSON.parse(guardado).key === clave));
  assert.deepEqual(escrituras.map(({ body: cuerpo }) => cuerpo), [{ plazoDias: 0 }, { plazoDias: 0 }]);
  assert.deepEqual(escrituras.map(({ options: opciones }) => opciones.headers['Idempotency-Key']), [clave, clave]);
  assert.equal(llamadas.find(({ method: metodo }) => metodo === 'GET').options, undefined);
  assert.equal(operaciones.pendiente(), null);
});

test('FALA-T027: plazo de suspensión acepta solo enteros de cero a treinta', () => {
  for (const dias of [0, 2, 30]) assert.equal(validarPlazoSuspension(dias), dias);
  for (const dias of [-1, 31, 1.5, '2', null, undefined]) assert.throws(() => validarPlazoSuspension(dias));
});

test('FALA-T028: renovación incierta no admite segunda anualidad y refresca vigencia', async () => {
  const almacenamiento = crearAlmacenamientoEnMemoria(), llamadas = [];
  let fallo = true;
  const api = async (ruta, metodo = 'GET', cuerpo, opciones) => {
    llamadas.push({ path: ruta, method: metodo, body: cuerpo, options: opciones });
    if (metodo === 'POST' && fallo) { fallo = false; throw Error('red'); }
    return valido('suspendida');
  };
  const primera = crearOperacionesLicencia({ api, almacenamiento, actorId: 7, generarClave: () => clave });
  await assert.rejects(primera.ejecutar('renovar', 2, 5, {}));
  const reanudadas = crearOperacionesLicencia({ api, almacenamiento, actorId: 7, generarClave: () => 'other_attempt_000001' });
  await assert.rejects(reanudadas.ejecutar('renovar', 2, 5, {}), /pendiente|comprobar/i);
  const resultado = await reanudadas.reintentar();
  assert.equal(resultado.estado, 'suspendida');
  assert.deepEqual(llamadas.filter(({ method: metodo }) => metodo === 'POST').map(({ options: opciones }) => opciones.headers['Idempotency-Key']), [clave, clave]);
  assert.ok(llamadas.some(({ path: ruta, method: metodo }) => ruta === '/licencias/5/vigencia' && metodo === 'GET'));
});

test('FALA-T026–T027: vista usa estado y bloqueo reales sin plazo fijo ni nueva suspensión', () => {
  const pendiente = renderEstadoLicencia({ ...valido('suspension_pendiente'),
    bloqueoProgramadoEn: '2026-11-06T12:00:00.000Z', condicionAcceso: true });
  assert.match(pendiente, /Suspensión programada|Bloqueo programado/);
  assert.doesNotMatch(pendiente, /48 horas|data-accion-negocio="suspender"/);
  const suspendida = renderEstadoLicencia({ ...valido('suspendida'), condicionAcceso: false });
  assert.match(suspendida, /Acceso bloqueado|Reactivar licencia/);
  assert.doesNotMatch(suspendida, /data-accion-negocio="suspender"/);
  const vencida = renderEstadoLicencia({ ...valido('vencida'), condicionAcceso: false });
  assert.match(vencida, /Vencida|Renovar un año/);
  const sinActivar = renderEstadoLicencia({ ...valido('pendiente'), venceEn: null, condicionAcceso: false });
  assert.doesNotMatch(sinActivar, /data-accion-negocio="renovar"|data-accion-negocio="suspender"/);
});

test('FALA-T029: correo pendiente, fallido y enviado no equivale a transición de licencia', () => {
  const html = renderEnviosLicencia(['pendiente', 'fallido', 'enviado'].map((estado, id) => ({
    id: id + 1, tipo: 'aviso_licencia', estado, intentos: id, confirmadoEn: null, proximoIntentoEn: null,
  })));
  assert.match(html, /Pendiente/); assert.match(html, /Fallido/); assert.match(html, /Enviado/);
  assert.doesNotMatch(html, /Entregado|Correo enviado por renovar/);
});

test('reanuda un marcador de licencia con el formato guardado antes de la traducción', async () => {
  const almacenamiento = crearAlmacenamientoEnMemoria();
  const claveAlmacenamiento = 'citalendar:license:pending:7';
  almacenamiento.setItem(claveAlmacenamiento, '{"action":"suspender","businessId":2,"licenseId":5,"body":{"plazoDias":2},"key":"license_attempt_000001"}');
  const llamadas = [];
  const operaciones = crearOperacionesLicencia({
    almacenamiento,
    actorId: 7,
    api: async (...argumentos) => {
      llamadas.push(argumentos);
      return valido('suspension_pendiente');
    },
  });
  await operaciones.reintentar();
  assert.deepEqual(llamadas, [
    ['/licencias/5/suspender', 'POST', { plazoDias: 2 }, { headers: { 'Idempotency-Key': clave } }],
    ['/licencias/5/vigencia'],
  ]);
  assert.equal(almacenamiento.getItem(claveAlmacenamiento), null);
});
