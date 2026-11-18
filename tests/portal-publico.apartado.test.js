import test from 'node:test';
import assert from 'node:assert/strict';
import { crearReservaPortal } from '../src/connected/portal-publico/reserva.flujo.js';
import { validarContacto } from '../src/connected/portal-publico/reserva.contacto.js';
import { crearRelojApartado } from '../src/connected/portal-publico/apartado.reloj.js';
import { vincularCicloReserva } from '../src/connected/portal-publico/reserva.ciclo-vida.js';
import { renderReserva, actualizarTiempoApartado } from '../src/connected/portal-publico/reserva.vista.js';
import { crearPortalClient } from '../src/connected/portal-publico/portal.http.js';
import { memoryStorage } from './fixtures/memory-storage.js';

const iniciar = '2026-10-20T17:00:00.000Z';
const ahora = '2026-10-20T16:00:00.000Z';
const vencimientoServidor = '2026-10-20T16:05:00.000Z';
const concesion = (id = 8, gen = '1') => ({ estado: 'concedida', apartadoId: id, generacion: gen,
  expiraEn: vencimientoServidor, servidorAhora: ahora, zonaHoraria: 'America/Mazatlan', costo: '450.00' });
// La lectura propia devuelve el costo solo mientras su publicación está activa;
// esta fixture representa el caso visible y las pruebas ALA cubren la omisión.
const propio = (id = 8, gen = '1', estado = 'vigente') => ({ apartadoId: id, generacion: gen, estado,
  expiraEn: vencimientoServidor, servidorAhora: ahora, costo: '450.00' });
const contacto = { nombre: '  María José  ', telefono: '+52 614-123-4567', notas: ' Consulta ' };
const crearPromesaControlada = () => { let resolver, rechazar; const promise = new Promise((yes, no) => { resolver = yes; rechazar = no; }); return { promise, resolver, reject: rechazar }; };

// Fixtures del contrato, sin API real. Permiten controlar reloj, respuestas perdidas y carreras.
function prepararPrueba(handler, extra = {}) {
  let mono = 0;
  const llamadas = [], mensajes = [];
  const canal = { postMessage: (datos) => mensajes.push(datos), close() {} };
  const client = { async solicitar(ruta, opciones = {}) {
    llamadas.push({ path: ruta, ...opciones });
    if (ruta === 'catalogo') return { negocio: { slug: 'centro' },
      servicios: [{ id: 1, nombre: 'Consulta', costo: '450.00', duracionMinutos: 30 }],
      sucursales: opciones.consulta.servicioId ? [{ id: 2, nombre: 'Centro', direccion: 'Calle 1', zonaHoraria: 'America/Mazatlan' }] : [],
      profesionales: opciones.consulta.sucursalId ? [{ id: 3, nombre: 'Ana' }] : [] };
    if (ruta === 'disponibilidad') return { ...opciones.consulta, modalidad: 'publica', zonaHoraria: 'America/Mazatlan', ranuras: [{ inicioUtc: iniciar, finUtc: '2026-10-20T17:30:00.000Z' }] };
    if (handler) return handler(ruta, opciones);
    if (ruta === 'apartados') return concesion();
    if (ruta.endsWith('/liberar')) return null;
    return propio();
  } };
  const flujo = crearReservaPortal(client, { slug: 'centro', ahora: () => new Date(ahora), ahoraMonotono: () => mono,
    generarClaveOperacion: () => 'operation_test_0000001', almacenamiento: memoryStorage(), channel: canal, ...extra });
  return { flow: flujo, calls: llamadas, messages: mensajes, channel: canal, setMono: (valor) => { mono = valor; } };
}
async function select(flujo) {
  await flujo.iniciar(); flujo.elegir('servicioId', 1); await flujo.continuar(); if (flujo.obtenerEstado().paso === 1) flujo.elegir('sucursalId', 2);
  await flujo.continuar(); if (flujo.obtenerEstado().paso === 2) flujo.elegir('personalId', 3); await flujo.continuar(); flujo.elegirHorario(iniciar);
}
async function formulario(flujo) { await select(flujo); await flujo.apartarHorarioElegido(); }

test('T104: solo abre formulario después de concesión y consulta de vigencia; cuerpo exacto', async () => {
  const pendiente = crearPromesaControlada();
  const { flow: flujo, calls: llamadas } = prepararPrueba((ruta) => ruta === 'apartados' ? pendiente.promise : propio());
  await select(flujo); const solicitar = flujo.apartarHorarioElegido();
  assert.equal(flujo.obtenerEstado().fase, 'apartado');
  assert.equal(flujo.obtenerEstado().apartado, null);
  pendiente.resolver(concesion()); await solicitar;
  assert.equal(flujo.obtenerEstado().fase, 'formulario');
  assert.equal(flujo.obtenerEstado().estadoApartado, 'vigente');
  assert.deepEqual(llamadas.find((llamada) => llamada.path === 'apartados').body, {
    clave: 'operation_test_0000001', personalId: 3, sucursalId: 2, servicioId: 1, fechaLocal: '2026-10-20', horaInicio: '10:00',
  });
  assert.equal(llamadas.filter((llamada) => llamada.path === 'apartados/8').length, 1);
});

test('T104: pérdida de respuesta repite la clave y el contenido; doble clic no duplica', async () => {
  const pendiente = crearPromesaControlada(); let primera = true;
  const { flow: flujo, calls: llamadas } = prepararPrueba((ruta) => ruta === 'apartados' ? (primera ? (primera = false, pendiente.promise) : concesion()) : propio());
  await select(flujo); const solicitar = flujo.apartarHorarioElegido(); await flujo.apartarHorarioElegido();
  pendiente.reject(Error('red')); await solicitar;
  assert.equal(flujo.obtenerEstado().fase, 'apartado');
  await flujo.apartarHorarioElegido();
  const escrituras = llamadas.filter((llamada) => llamada.path === 'apartados');
  assert.equal(escrituras.length, 2); assert.deepEqual(escrituras[0].body, escrituras[1].body);
  assert.equal(flujo.obtenerEstado().fase, 'formulario');
});

test('T104: conflicto refresca disponibilidad sin fabricar apartado ni formulario', async () => {
  const { flow: flujo } = prepararPrueba(() => { throw Object.assign(Error('conflicto'), { status: 409 }); });
  await select(flujo); await flujo.apartarHorarioElegido();
  assert.equal(flujo.obtenerEstado().fase, 'seleccion'); assert.equal(flujo.obtenerEstado().apartado, null);
  assert.equal(flujo.obtenerEstado().seleccion.horario, null); assert.match(flujo.obtenerEstado().aviso, /horario/i);
});

test('T104: concesión repetida ya vencida o sustituida no abre formulario', async () => {
  for (const estado of ['vencido', 'sustituido', 'liberado']) {
    const { flow: flujo } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion() : propio(8, '1', estado));
    await select(flujo); await flujo.apartarHorarioElegido(); assert.equal(flujo.obtenerEstado().fase, 'seleccion');
  }
});

test('T105: normaliza como el servidor sin buscar teléfono ni truncar Unicode', () => {
  assert.deepEqual(validarContacto(contacto).valor, { nombre: 'María José', telefono: '6141234567', notas: 'Consulta' });
  assert.equal(validarContacto({ nombre: '😀'.repeat(150), telefono: '614 123 4567', notas: 'x'.repeat(2000) }).valido, true);
  assert.equal(validarContacto({ nombre: ' Ana ', telefono: '6141234567', notas: ' ' }).valor.notas, null);
  for (const [campo, valor] of [['nombre', ' '], ['nombre', '😀'.repeat(151)], ['telefono', '+1 6141234567'],
    ['telefono', '614abc4567'], ['telefono', '614123456'], ['notas', 'x'.repeat(2001)]]) {
    assert.ok(validarContacto({ ...contacto, [campo]: valor }).errores[campo]);
  }
  assert.equal(validarContacto({ ...contacto, notas: ' '.repeat(33000) }).valido, false);
});

test('T105–T106: errores por campo y contacto solo en memoria, conservado al volver', async () => {
  const { flow: flujo, calls: llamadas } = prepararPrueba(); await formulario(flujo);
  flujo.actualizarContacto('nombre', '<b>Ana</b>'); flujo.actualizarContacto('telefono', '123'); flujo.actualizarContacto('notas', 'Privado');
  assert.equal(flujo.validarContacto().valido, false); assert.ok(flujo.obtenerEstado().erroresContacto.telefono);
  flujo.actualizarContacto('telefono', '+52 614-123-4567'); assert.equal(flujo.validarContacto().valido, true);
  await flujo.volverADisponibilidad();
  assert.deepEqual(flujo.obtenerEstado().contacto, { nombre: '<b>Ana</b>', telefono: '+52 614-123-4567', notas: 'Privado' });
  assert.ok(llamadas.every((llamada) => !JSON.stringify(llamada).includes('Privado')));
  assert.equal(prepararPrueba().flow.obtenerEstado().contacto.nombre, '');
});

test('T107: cuenta con hora del servidor y reloj monótono; nunca prolonga el vencimiento', () => {
  let mono = 100;
  const reloj = crearRelojApartado(() => mono);
  reloj.iniciar(vencimientoServidor, ahora, 0);
  assert.equal(reloj.restante(), 299900);
  mono = 10100; assert.equal(reloj.restante(), 289900);
  mono = 50; assert.equal(reloj.restante(), 289900); // Un reloj atrasado no recupera tiempo.
  mono = 10100;
  reloj.sincronizar(vencimientoServidor, ahora, mono); assert.equal(reloj.restante(), 289900);
  mono = 300000; assert.equal(reloj.restante(), 0);
});

test('T107: vence en el límite exacto y conserva formulario y texto', async () => {
  const { flow: flujo, setMono: ajustarRelojMonotono } = prepararPrueba(); await formulario(flujo); flujo.actualizarContacto('nombre', 'Ana');
  ajustarRelojMonotono(300000); flujo.actualizarContador();
  assert.equal(flujo.obtenerEstado().estadoApartado, 'vencido'); assert.equal(flujo.obtenerEstado().milisegundosRestantes, 0);
  assert.equal(flujo.obtenerEstado().fase, 'formulario'); assert.equal(flujo.obtenerEstado().contacto.nombre, 'Ana');
  assert.equal(flujo.validarContacto().valido, false);
});

test('T108: reenfocar bloquea hasta consultar estado propio y conserva datos ante sustitución', async () => {
  let respuesta = propio(); let diferido;
  const { flow: flujo } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion() : diferido ? diferido.promise : respuesta);
  await formulario(flujo); flujo.actualizarContacto('nombre', 'Ana');
  diferido = crearPromesaControlada(); const verificacion = flujo.verificarVigencia();
  assert.equal(flujo.obtenerEstado().estadoApartado, 'verificando');
  diferido.resolver(propio(8, '1', 'sustituido')); await verificacion;
  assert.equal(flujo.obtenerEstado().estadoApartado, 'perdido'); assert.equal(flujo.obtenerEstado().contacto.nombre, 'Ana');
});

test('T108: avisos sin datos privados, generación antigua ignorada y nueva verificada en servidor', async () => {
  const { flow: flujo, channel: canal, calls: llamadas, messages: mensajes } = prepararPrueba(); await formulario(flujo);
  flujo.actualizarContacto('nombre', 'Confidencial');
  const cantidad = llamadas.length;
  await flujo.handleMensaje({ type: 'changed', slug: 'centro', apartadoId: 7, generacion: '1' });
  await flujo.handleMensaje({ type: 'changed', slug: 'otro-negocio', apartadoId: 9, generacion: '2' });
  await flujo.handleMensaje({ type: 'changed', slug: 'centro', apartadoId: 9, generacion: 'inválida' });
  assert.equal(llamadas.length, cantidad);
  await flujo.handleMensaje({ type: 'changed', slug: 'centro', apartadoId: 9, generacion: '2' });
  assert.equal(llamadas.at(-1).path, 'apartados/8');
  assert.equal(flujo.obtenerEstado().estadoApartado, 'vigente'); // Aviso no es autoridad.
  assert.ok(mensajes.some((mensaje) => mensaje.type === 'changed'));
  assert.ok(!JSON.stringify(mensajes).includes('Confidencial'));
  assert.equal(typeof canal.onmessage, 'function');
});

test('T108: fallo de consulta o identidad distinta bloquea uso, sin falso vencimiento', async () => {
  let fail = false;
  const { flow: flujo } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion() : fail ? Promise.reject(Error('red')) : propio());
  await formulario(flujo); fail = true; await flujo.verificarVigencia(); assert.equal(flujo.obtenerEstado().estadoApartado, 'sin-verificar');
  fail = false; await flujo.verificarVigencia(); assert.equal(flujo.obtenerEstado().estadoApartado, 'vigente');
});

test('T109: volver confirma liberación del ID/generación antes de abrir disponibilidad', async () => {
  const pendiente = crearPromesaControlada();
  const { flow: flujo, calls: llamadas } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion() : ruta.endsWith('/liberar') ? pendiente.promise : propio());
  await formulario(flujo); const volver = flujo.volverADisponibilidad();
  assert.equal(flujo.obtenerEstado().fase, 'formulario'); assert.equal(flujo.obtenerEstado().estadoApartado, 'liberando');
  assert.deepEqual(llamadas.at(-1).body, { generacion: '1' });
  assert.equal(llamadas.at(-1).path, 'apartados/8/liberar');
  pendiente.resolver(null); await volver; assert.equal(flujo.obtenerEstado().fase, 'seleccion');
});

test('T109: liberar con respuesta perdida permite repetir sin perder la referencia propia', async () => {
  let fail = true;
  const { flow: flujo, calls: llamadas } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion() : ruta.endsWith('/liberar')
    ? fail ? Promise.reject(Error('red')) : null : propio());
  await formulario(flujo); await flujo.volverADisponibilidad();
  assert.equal(flujo.obtenerEstado().estadoApartado, 'error-liberacion'); assert.equal(flujo.obtenerEstado().apartado.apartadoId, 8);
  fail = false; await flujo.volverADisponibilidad();
  assert.equal(llamadas.filter((llamada) => llamada.path.endsWith('/liberar')).length, 2);
  assert.equal(flujo.obtenerEstado().fase, 'seleccion');
});

test('T109: salida usa keepalive una vez, borra contacto y libera concesión recibida tarde', async () => {
  const { flow: flujo, calls: llamadas } = prepararPrueba(); await formulario(flujo); flujo.actualizarContacto('nombre', 'Privado');
  flujo.salir(); flujo.salir(); await Promise.resolve();
  const releases = llamadas.filter((llamada) => llamada.path.endsWith('/liberar'));
  assert.equal(releases.length, 1); assert.equal(releases[0].keepalive, true);
  assert.equal(flujo.obtenerEstado().contacto.nombre, '');
  const pendiente = crearPromesaControlada();
  const late = prepararPrueba((ruta) => ruta === 'apartados' ? pendiente.promise : null);
  await select(late.flow); const solicitar = late.flow.apartarHorarioElegido(); late.flow.salir();
  pendiente.resolver(concesion()); await solicitar;
  assert.equal(late.calls.at(-1).path, 'apartados/8/liberar');
  assert.equal(late.calls.at(-1).keepalive, true);
});

test('T108–T109: una consulta atrasada no devuelve al formulario después de liberar', async () => {
  let diferido;
  const { flow: flujo } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion() : ruta.endsWith('/liberar') ? null : diferido ? diferido.promise : propio());
  await formulario(flujo); diferido = crearPromesaControlada(); const verificacion = flujo.verificarVigencia();
  await flujo.volverADisponibilidad(); diferido.resolver(propio()); await verificacion;
  assert.equal(flujo.obtenerEstado().fase, 'seleccion'); assert.equal(flujo.obtenerEstado().apartado, null);
});

test('T109: cliente HTTP permite keepalive de liberación con cookie y CSRF', async () => {
  const llamadas = [];
  const client = crearPortalClient('centro', { ejecutarFetch: async (_url, opciones) => {
    llamadas.push(opciones); return opciones.keepalive ? new Response(null, { status: 204 }) : Response.json({ negocio: { slug: 'centro', nombre: 'Centro' }, csrfToken: 'a'.repeat(64) });
  } });
  await client.iniciarSesionVerificada();
  await client.solicitar('apartados/8/liberar', { method: 'POST', body: { generacion: '1' }, keepalive: true });
  assert.equal(llamadas.at(-1).keepalive, true); assert.equal(llamadas.at(-1).headers['X-CSRF-Token'], 'a'.repeat(64));
  assert.equal(llamadas.at(-1).credentials, 'same-origin');
});

test('T105–T107: formulario escapado, errores accesibles y envío sujeto a vigencia', async () => {
  const { flow: flujo } = prepararPrueba(); await formulario(flujo); flujo.actualizarContacto('nombre', '<script>x</script>');
  flujo.validarContacto(); const html = renderReserva(flujo.obtenerEstado());
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /autocomplete="off"/); assert.match(html, /aria-invalid="true"/);
  assert.match(html, /data-enviar-reserva/);
  const expired = { ...flujo.obtenerEstado(), milisegundosRestantes: 0 };
  assert.match(renderReserva(expired), /disabled[^>]*>Reservar/);
});

test('el formulario muestra barra de tiempo y deja fecha, zona y costo en el resumen', async () => {
  const { flow: flujo } = prepararPrueba(); await formulario(flujo);
  const estado = flujo.obtenerEstado();
  const html = renderReserva(estado);
  assert.match(html, /Completa tus datos/);
  assert.match(html, /id="portal-progreso-apartado"[^>]*max="300"/);
  assert.match(html, /America\/Mazatlan/);
  assert.match(html, /450\.00/);
  assert.doesNotMatch(html, /<p class="portal-resumen">|Costo aceptado:/);
  const temporizador = { textContent: '' }, progreso = { value: 300 };
  const contenedor = { querySelector: (selector) => selector === '#portal-tiempo-apartado' ? temporizador : selector === '#portal-progreso-apartado' ? progreso : null };
  actualizarTiempoApartado(contenedor, { milisegundosRestantes: 150000 });
  assert.equal(temporizador.textContent, '2:30');
  assert.equal(progreso.value, 150);
  actualizarTiempoApartado(contenedor, { milisegundosRestantes: 0 });
  assert.equal(progreso.value, 0);
});

test('T108–T109: eventos de foco, visibilidad y salida se conectan y limpian', async () => {
  const win = new EventTarget(); const doc = new EventTarget(); doc.visibilityState = 'visible';
  let checks = 0, exits = 0, blocked = 0, ticks = 0;
  const cleanup = vincularCicloReserva({ verificarVigencia: async () => { checks++; }, marcarSinVerificar() { blocked++; }, salir() { exits++; }, actualizarContador() { ticks++; } },
    { window: win, document: doc, setInterval: (handler) => { handler(); return 1; }, clearInterval() {} });
  win.dispatchEvent(new Event('focus')); doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
  win.dispatchEvent(new Event('pagehide')); assert.equal(checks, 1); assert.equal(blocked, 1); assert.equal(exits, 1); assert.equal(ticks, 1);
  cleanup(); win.dispatchEvent(new Event('focus')); assert.equal(checks, 1);
});

test('T107: reintentar tras fallo de verificación no reinicia el presupuesto original', async () => {
  let primera = true;
  const { flow: flujo, setMono: ajustarRelojMonotono } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion() : primera ? (primera = false, Promise.reject(Error('red'))) : propio());
  await select(flujo); await flujo.apartarHorarioElegido();
  ajustarRelojMonotono(10000); await flujo.apartarHorarioElegido();
  assert.equal(flujo.obtenerEstado().fase, 'formulario'); assert.equal(flujo.obtenerEstado().milisegundosRestantes, 290000);
});

test('T108: respuesta propia con ID, generación o vencimiento diferentes bloquea sin prolongar', async () => {
  let valor = propio();
  const { flow: flujo } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion() : valor);
  await formulario(flujo);
  for (const datos of [propio(9), propio(8, '2'), { ...propio(), expiraEn: '2026-10-20T16:10:00Z' }]) {
    valor = datos; await flujo.verificarVigencia(); assert.equal(flujo.obtenerEstado().estadoApartado, 'sin-verificar');
  }
});

test('T106: vencimiento y sustitución conservan los datos al obtener otro apartado', async () => {
  let gen = '1';
  const { flow: flujo, setMono: ajustarRelojMonotono } = prepararPrueba((ruta) => ruta === 'apartados' ? concesion(8, gen) : ruta.endsWith('/liberar') ? null : propio(8, gen));
  await formulario(flujo); flujo.actualizarContacto('nombre', 'Ana'); flujo.actualizarContacto('notas', 'Recordar');
  ajustarRelojMonotono(300000); flujo.actualizarContador(); await flujo.volverADisponibilidad();
  ajustarRelojMonotono(300001); gen = '2'; flujo.elegirHorario(iniciar); await flujo.apartarHorarioElegido();
  assert.equal(flujo.obtenerEstado().fase, 'formulario'); assert.equal(flujo.obtenerEstado().contacto.nombre, 'Ana');
  assert.equal(flujo.obtenerEstado().contacto.notas, 'Recordar');
});

test('T108: temporizadores del navegador conservan el receptor window', () => {
  const win = new EventTarget(), doc = new EventTarget();
  const cleanup = vincularCicloReserva({ actualizarContador() {} }, { window: win, document: doc,
    setInterval() { assert.equal(this, win); return 1; }, clearInterval() { assert.equal(this, win); } });
  cleanup();
});

test('T108: un reemplazo fallido también avisa para consultar el apartado anterior', async () => {
  const { flow: flujo, messages: mensajes } = prepararPrueba(() => { throw Object.assign(Error('conflicto'), { status: 409 }); });
  await select(flujo); await flujo.apartarHorarioElegido();
  assert.deepEqual(mensajes.at(-1), { type: 'refresh', slug: 'centro' });
});

test('T109: BFCache recarga y limpia los valores cacheados de los campos', () => {
  const win = new EventTarget(), doc = new EventTarget();
  const entrada = { value: 'Privado', defaultValue: 'Privado' };
  doc.querySelectorAll = () => [entrada];
  let reloads = 0; win.location = { reload() { reloads++; } };
  const cleanup = vincularCicloReserva({ salir() {}, actualizarContador() {} }, { window: win, document: doc, setInterval: () => 1, clearInterval() {} });
  win.dispatchEvent(new Event('pagehide'));
  const mostrados = new Event('pageshow'); Object.defineProperty(mostrados, 'persisted', { value: true });
  win.dispatchEvent(mostrados);
  assert.equal(entrada.value, ''); assert.equal(entrada.defaultValue, ''); assert.equal(reloads, 1);
  cleanup();
});
