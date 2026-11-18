import test from 'node:test';
import assert from 'node:assert/strict';
import { crearIntentoStore } from '../src/connected/portal-publico/intento.store.js';
import { crearReservaPortal } from '../src/connected/portal-publico/reserva.flujo.js';
import { renderReserva } from '../src/connected/portal-publico/reserva.vista.js';
import { memoryStorage } from './fixtures/memory-storage.js';
import { adquirirMutacionPublica } from '../src/connected/portal-publico/portal.sesion-navegador.js';

const marcador = { negocio: 'centro', apartadoId: 8, clave: 'attempt_test_000001' };

// Una carrera incierta no equivale a permiso para iniciar otra reserva. Se
// ejercitan las acciones públicas completas y se inspeccionan llamadas reales del doble.
test('T116: incertidumbre bloquea navegación y concesiones hasta ausencia terminal', async () => {
  let ausente = false;
  const rutaBase = prepararPrueba((ruta) => {
    if (ruta === 'intentos') return { id: marcador.clave, apartadoId: 8, estado: 'preparado' };
    if (ruta.endsWith('/resolver') && ausente) return { estado: 'no_registrado' };
    throw Error('respuesta perdida');
  });
  await formulario(rutaBase.flow); const contacto = rutaBase.flow.obtenerEstado().contacto;
  await rutaBase.flow.enviarReserva(); const cantidad = rutaBase.calls.length;
  rutaBase.flow.elegir('servicioId', 1); rutaBase.flow.elegirHorario(resultado.inicioUtc);
  await rutaBase.flow.seleccionarFecha('2026-10-22'); await rutaBase.flow.continuar(); await rutaBase.flow.volver();
  await rutaBase.flow.volverADisponibilidad(); await rutaBase.flow.apartarHorarioElegido(); await rutaBase.flow.enviarReserva();
  assert.equal(rutaBase.calls.length, cantidad); assert.equal(rutaBase.flow.obtenerEstado().fase, 'incierto');
  assert.deepEqual(rutaBase.flow.obtenerEstado().contacto, contacto);
  assert.deepEqual(Object.keys(JSON.parse(rutaBase.almacenamiento.getItem(rutaBase.store.clave))).sort(), ['apartadoId', 'clave', 'negocio']);
  await rutaBase.flow.resolverEnvio(); assert.equal(rutaBase.flow.obtenerEstado().fase, 'incierto');
  ausente = true; await rutaBase.flow.resolverEnvio();
  assert.equal(rutaBase.flow.obtenerEstado().fase, 'seleccion'); assert.equal(rutaBase.flow.obtenerEstado().seleccion.horario, null);
  assert.deepEqual(rutaBase.flow.obtenerEstado().contacto, contacto); assert.equal(rutaBase.store.leer().estado, 'ausente');
});

test('T116: contacto sobrevive vencimiento y navegación interna sin persistirse', async () => {
  let mono = 0;
  const rutaBase = prepararPrueba(null, { ahoraMonotono: () => mono });
  await formulario(rutaBase.flow); const contacto = rutaBase.flow.obtenerEstado().contacto;
  mono = 300001; rutaBase.flow.actualizarContador();
  assert.equal(rutaBase.flow.obtenerEstado().estadoApartado, 'vencido');
  await rutaBase.flow.volverADisponibilidad();
  assert.equal(rutaBase.flow.obtenerEstado().fase, 'seleccion'); assert.deepEqual(rutaBase.flow.obtenerEstado().contacto, contacto);
  assert.equal(rutaBase.store.leer().estado, 'ausente');
  await rutaBase.flow.volver(); await rutaBase.flow.continuar();
  assert.deepEqual(rutaBase.flow.obtenerEstado().contacto, contacto);
  rutaBase.flow.salir(); assert.deepEqual(rutaBase.flow.obtenerEstado().contacto, { nombre: '', telefono: '', notas: '' });
});
const resultado = { folio: 'P-123456789012345678', estado: 'pendiente', inicioUtc: '2026-10-20T17:00:00.000Z',
  finUtc: '2026-10-20T17:30:00.000Z', zonaHoraria: 'America/Mazatlan', costo: '450.00',
  nombreNegocio: 'Negocio histórico', nombreServicio: 'Servicio guardado', nombreSucursal: 'Sucursal histórica', nombreProfesional: 'Profesional histórico' };
const crearPromesaControlada = () => { let resolver, rechazar; const promise = new Promise((yes, no) => { resolver = yes; rechazar = no; }); return { promise, resolver, reject: rechazar }; };
function prepararPrueba(handler, extra = {}) {
  const almacenamiento = extra.almacenamiento || memoryStorage();
  const store = crearIntentoStore('centro', () => almacenamiento);
  const llamadas = [], mensajes = [];
  const client = { async solicitar(ruta, opciones = {}) {
    llamadas.push({ path: ruta, ...opciones });
    if (ruta === 'catalogo') return { negocio: { slug: 'centro' }, servicios: [{ id: 1, nombre: 'Actual', costo: '999.00', duracionMinutos: 30 }],
      sucursales: opciones.consulta.servicioId ? [{ id: 2, nombre: 'Centro', direccion: 'Calle 1', zonaHoraria: 'America/Mazatlan' }] : [], profesionales: opciones.consulta.sucursalId ? [{ id: 3, nombre: 'Ana' }] : [] };
    if (ruta === 'disponibilidad') return { ...opciones.consulta, modalidad: 'publica', zonaHoraria: 'America/Mazatlan', ranuras: [{ inicioUtc: resultado.inicioUtc, finUtc: resultado.finUtc }] };
    if (ruta === 'apartados') return { estado: 'concedida', apartadoId: 8, generacion: '1', costo: '450.00', zonaHoraria: 'America/Mazatlan', expiraEn: '2026-10-20T16:05:00Z', servidorAhora: '2026-10-20T16:00:00Z' };
    if (ruta === 'apartados/8') return extra.ownResponse ? extra.ownResponse() : { apartadoId: 8, generacion: '1', estado: 'vigente', costo: '450.00', expiraEn: '2026-10-20T16:05:00Z', servidorAhora: '2026-10-20T16:00:00Z' };
    if (handler) return handler(ruta, opciones, store);
    if (ruta === 'intentos') return { id: marcador.clave, apartadoId: 8, estado: 'preparado' };
    if (ruta.endsWith('/reservar')) return resultado;
    if (ruta.endsWith('/resolver')) return { estado: 'registrado', resultado: resultado };
    return null;
  } };
  const flujo = crearReservaPortal(client, { slug: 'centro', almacenamiento, generarClaveIntento: () => marcador.clave,
    generarClaveOperacion: () => 'operation_test_000001', ahoraMonotono: () => 0, ahora: () => new Date('2026-10-20T16:00:00Z'),
    channel: { postMessage: (datos) => mensajes.push(datos), close() {} }, ...extra });
  return { flow: flujo, calls: llamadas, store, almacenamiento, messages: mensajes };
}
async function formulario(flujo) {
  await flujo.iniciar(); flujo.elegir('servicioId', 1); await flujo.continuar(); if (flujo.obtenerEstado().paso === 1) flujo.elegir('sucursalId', 2); await flujo.continuar();
  if (flujo.obtenerEstado().paso === 2) flujo.elegir('personalId', 3); await flujo.continuar(); flujo.elegirHorario(resultado.inicioUtc); await flujo.apartarHorarioElegido();
  flujo.actualizarContacto('nombre', '  Ana  '); flujo.actualizarContacto('telefono', '+52 614-123-4567'); flujo.actualizarContacto('notas', ' Nota privada ');
}

test('T110: almacena exactamente negocio, apartado y clave; lectura aislada por negocio', () => {
  const almacenamiento = memoryStorage(), store = crearIntentoStore('centro', () => almacenamiento);
  assert.equal(store.leer().estado, 'ausente'); store.guardar(marcador);
  assert.deepEqual(store.leer().marcador, marcador);
  assert.deepEqual(JSON.parse(almacenamiento.getItem(store.clave)), marcador);
  assert.equal(crearIntentoStore('otro', () => almacenamiento).leer().estado, 'ausente');
  assert.throws(() => store.guardar({ ...marcador, nombre: 'Privado' }));
});

test('T110: marcador confirmado antes de preparar y enviar; contenido normalizado solo por HTTP', async () => {
  const { flow: flujo, store, calls: llamadas, messages: mensajes } = prepararPrueba((ruta, opciones, guardado) => {
    assert.deepEqual(guardado.leer().marcador, marcador);
    if (ruta === 'intentos') return { id: marcador.clave, apartadoId: 8, estado: 'preparado' };
    if (ruta.endsWith('/reservar')) return resultado;
  });
  await formulario(flujo); await flujo.enviarReserva();
  assert.deepEqual(llamadas.find((llamada) => llamada.path === 'intentos').body, { clave: marcador.clave, apartadoId: 8 });
  assert.deepEqual(llamadas.find((llamada) => llamada.path.endsWith('/reservar')).body, { nombre: 'Ana', telefono: '6141234567', notas: 'Nota privada' });
  assert.equal(store.leer().estado, 'ausente'); assert.equal(flujo.obtenerEstado().fase, 'resultado');
  assert.ok(!JSON.stringify(mensajes).includes('Nota privada'));
});

test('T110: fallo de persistencia impide toda preparación y envío', async () => {
  const almacenamiento = memoryStorage(); almacenamiento.setItem = () => { throw Error('bloqueado'); };
  const { flow: flujo, calls: llamadas } = prepararPrueba(null, { almacenamiento }); await formulario(flujo); await flujo.enviarReserva();
  assert.equal(flujo.obtenerEstado().fase, 'formulario'); assert.ok(!llamadas.some((llamada) => llamada.path.startsWith('intentos')));
  assert.match(flujo.obtenerEstado().aviso, /guardar|almacenamiento/i);
});

test('T111: validación local señala campos sin persistir ni llamar al escritor', async () => {
  const { flow: flujo, calls: llamadas, store } = prepararPrueba(); await formulario(flujo); flujo.actualizarContacto('telefono', '123'); await flujo.enviarReserva();
  assert.ok(flujo.obtenerEstado().erroresContacto.telefono); assert.equal(store.leer().estado, 'ausente');
  assert.ok(!llamadas.some((llamada) => llamada.path === 'intentos'));
});

test('T111: doble clic excluido y reintento usa el mismo contenido aunque se intente editar', async () => {
  let primera = true; const pendiente = crearPromesaControlada();
  const { flow: flujo, calls: llamadas, store } = prepararPrueba((ruta) => ruta === 'intentos' ? { id: marcador.clave, apartadoId: 8, estado: 'preparado' }
    : ruta.endsWith('/reservar') ? primera ? (primera = false, pendiente.promise) : resultado : { estado: 'registrado', resultado: resultado });
  await formulario(flujo); const sending = flujo.enviarReserva(); await flujo.enviarReserva();
  pendiente.reject(Error('red')); await sending;
  assert.equal(flujo.obtenerEstado().fase, 'incierto'); assert.deepEqual(store.leer().marcador, marcador);
  flujo.actualizarContacto('nombre', 'Otro'); await flujo.repetirEnvio();
  const escrituras = llamadas.filter((llamada) => llamada.path.endsWith('/reservar'));
  assert.equal(escrituras.length, 2); assert.deepEqual(escrituras[0].body, escrituras[1].body);
  assert.equal(flujo.obtenerEstado().fase, 'resultado');
});

test('T111–T112: 400/409 conservan datos y no reinician sin ausencia terminal', async () => {
  for (const estado of [400, 409]) {
    const { flow: flujo, store } = prepararPrueba((ruta) => {
      if (ruta === 'intentos') return { id: marcador.clave, apartadoId: 8, estado: 'preparado' };
      throw Object.assign(Error('rechazo'), { status: estado });
    });
    await formulario(flujo); await flujo.enviarReserva();
    assert.equal(flujo.obtenerEstado().fase, 'incierto'); assert.equal(flujo.obtenerEstado().contacto.nombre, '  Ana  ');
    assert.deepEqual(store.leer().marcador, marcador);
    await flujo.resolverEnvio(); assert.equal(flujo.obtenerEstado().fase, 'incierto');
  }
});

test('T112: recarga con marcador resuelve antes de catálogo y sin contacto', async () => {
  const almacenamiento = memoryStorage(); crearIntentoStore('centro', () => almacenamiento).guardar(marcador);
  const { flow: flujo, calls: llamadas } = prepararPrueba(null, { almacenamiento }); await flujo.iniciar();
  assert.equal(llamadas.length, 1); assert.equal(llamadas[0].path, `intentos/${marcador.clave}/resolver`);
  assert.deepEqual(llamadas[0].body, { apartadoId: 8 }); assert.equal(flujo.obtenerEstado().fase, 'resultado');
  assert.equal(flujo.obtenerEstado().resultado.folio, resultado.folio);
});

test('T112: solo no_registrado comprobado elimina marcador y reinicia selección', async () => {
  const almacenamiento = memoryStorage(); crearIntentoStore('centro', () => almacenamiento).guardar(marcador);
  const { flow: flujo, calls: llamadas, store } = prepararPrueba(() => ({ estado: 'no_registrado' }), { almacenamiento }); await flujo.iniciar();
  assert.equal(flujo.obtenerEstado().fase, 'seleccion'); assert.equal(flujo.obtenerEstado().paso, 0); assert.equal(store.leer().estado, 'ausente');
  assert.equal(llamadas[0].path, `intentos/${marcador.clave}/resolver`); assert.equal(llamadas[1].path, 'catalogo');
});

test('T112: 401/404/503, red y respuesta inválida nunca se interpretan como ausencia', async () => {
  for (const modo of [401, 404, 503, 'network', 'invalida']) {
    const almacenamiento = memoryStorage(); crearIntentoStore('centro', () => almacenamiento).guardar(marcador);
    const { flow: flujo, calls: llamadas, store } = prepararPrueba(() => {
      if (modo === 'invalida') return { estado: 'desconocido' };
      throw Object.assign(Error('fallo'), typeof modo === 'number' ? { status: modo } : {});
    }, { almacenamiento });
    await flujo.iniciar(); assert.equal(flujo.obtenerEstado().fase, 'incierto'); assert.deepEqual(store.leer().marcador, marcador);
    assert.equal(llamadas.length, 1); await flujo.apartarHorarioElegido(); assert.equal(llamadas.length, 1);
  }
});

test('T112: marcador corrupto o almacenamiento inaccesible bloquean sin borrar evidencia', async () => {
  const almacenamiento = memoryStorage(), store = crearIntentoStore('centro', () => almacenamiento);
  almacenamiento.setItem(store.clave, '{incorrecto');
  const { flow: flujo, calls: llamadas } = prepararPrueba(null, { almacenamiento }); await flujo.iniciar();
  assert.equal(flujo.obtenerEstado().fase, 'incierto'); assert.equal(llamadas.length, 0);
  assert.equal(almacenamiento.getItem(store.clave), '{incorrecto');
  assert.equal(crearIntentoStore('centro', () => { throw Error('bloqueado'); }).leer().estado, 'no-disponible');
});

test('T112: limpieza fallida tras ausencia terminal no habilita otra reserva', async () => {
  const almacenamiento = memoryStorage(); crearIntentoStore('centro', () => almacenamiento).guardar(marcador);
  almacenamiento.removeItem = () => { throw Error('bloqueado'); };
  const { flow: flujo } = prepararPrueba(() => ({ estado: 'no_registrado' }), { almacenamiento }); await flujo.iniciar();
  assert.equal(flujo.obtenerEstado().fase, 'incierto');
});

test('T112: desaparecer un marcador corrupto no equivale a ausencia terminal del servidor', async () => {
  const almacenamiento = memoryStorage(), store = crearIntentoStore('centro', () => almacenamiento);
  almacenamiento.setItem(store.clave, '{corrupto');
  const { flow: flujo, calls: llamadas } = prepararPrueba(null, { almacenamiento }); await flujo.iniciar();
  almacenamiento.removeItem(store.clave); await flujo.resolverEnvio();
  assert.equal(flujo.obtenerEstado().fase, 'incierto'); assert.equal(llamadas.length, 0);
});

test('T113: salida mientras prepara/envía o resultado incierto no libera el apartado', async () => {
  for (const stage of ['prepare', 'write']) {
    const pendiente = crearPromesaControlada();
    const { flow: flujo, calls: llamadas, store } = prepararPrueba((ruta) => ruta === 'intentos'
      ? stage === 'prepare' ? pendiente.promise : { id: marcador.clave, apartadoId: 8, estado: 'preparado' }
      : ruta.endsWith('/reservar') ? pendiente.promise : null);
    await formulario(flujo); const sending = flujo.enviarReserva();
    await new Promise((resolver) => setImmediate(resolver));
    flujo.salir(); pendiente.reject(Error('red')); await sending;
    assert.equal(llamadas.filter((llamada) => llamada.path.endsWith('/liberar')).length, 0);
    assert.deepEqual(store.leer().marcador, marcador);
    if (stage === 'prepare') assert.ok(!llamadas.some((llamada) => llamada.path.endsWith('/reservar')));
  }
});

test('T113: preparación exitosa recibida después de salir no inicia un escritor tardío', async () => {
  const pendiente = crearPromesaControlada();
  const { flow: flujo, calls: llamadas, store } = prepararPrueba((ruta) => ruta === 'intentos' ? pendiente.promise : resultado);
  await formulario(flujo); const enviar = flujo.enviarReserva();
  await new Promise((resolver) => setImmediate(resolver));
  flujo.salir(); pendiente.resolver({ id: marcador.clave, apartadoId: 8, estado: 'preparado' }); await enviar;
  assert.ok(!llamadas.some((llamada) => llamada.path.endsWith('/reservar') || llamada.path.endsWith('/liberar')));
  assert.deepEqual(store.leer().marcador, marcador);
});

test('T111: preparación ya registrada recupera el resultado sin repetir el escritor', async () => {
  const { flow: flujo, calls: llamadas } = prepararPrueba((ruta) => ruta === 'intentos' ? { id: marcador.clave, apartadoId: 8, estado: 'registrado' } : { estado: 'registrado', resultado: resultado });
  await formulario(flujo); await flujo.enviarReserva();
  assert.equal(flujo.obtenerEstado().fase, 'resultado'); assert.ok(!llamadas.some((llamada) => llamada.path.endsWith('/reservar')));
  assert.equal(llamadas.at(-1).path, `intentos/${marcador.clave}/resolver`);
});

test('T113: consulta y avisos atrasados no borran el resumen ni liberan otro apartado', async () => {
  const rutaBase = prepararPrueba(); await formulario(rutaBase.flow);
  // Un aviso posterior al resultado no reactiva la gestión del apartado consumido.
  await rutaBase.flow.enviarReserva(); await rutaBase.flow.handleMensaje({ type: 'refresh', slug: 'centro' });
  await rutaBase.flow.volverADisponibilidad(); rutaBase.flow.salir();
  assert.equal(rutaBase.flow.obtenerEstado().resultado.folio, resultado.folio);
  assert.ok(!rutaBase.calls.some((llamada) => llamada.path.endsWith('/liberar')));
});

test('T111–T113: un envío incierto conserva el lock para bloquear apartados de otra pestaña', async () => {
  let activo = false;
  const bloqueos = { async request(_name, opciones, handler) {
    assert.equal(opciones.ifAvailable, true);
    if (activo) return handler(null);
    activo = true;
    try { return await handler({}); } finally { activo = false; }
  } };
  const adquirirMutacion = () => adquirirMutacionPublica('centro', { locks: bloqueos });
  const primera = prepararPrueba((ruta) => {
    if (ruta === 'intentos') return { id: marcador.clave, apartadoId: 8, estado: 'preparado' };
    if (ruta.endsWith('/resolver')) return { estado: 'registrado', resultado: resultado };
    throw Error('red');
  }, { adquirirMutacion });
  await formulario(primera.flow); await primera.flow.enviarReserva();
  assert.equal(primera.flow.obtenerEstado().fase, 'incierto');
  assert.equal(await adquirirMutacion(), null);
  await primera.flow.resolverEnvio();
  const bloqueoAdquirido = await adquirirMutacion(); assert.ok(bloqueoAdquirido); bloqueoAdquirido.liberar();
});

test('T114: resumen histórico pendiente, escapado y sin enlaces de gestión ni promesa de WhatsApp', async () => {
  const { flow: flujo } = prepararPrueba((ruta) => ruta === 'intentos' ? { id: marcador.clave, apartadoId: 8, estado: 'preparado' } : { ...resultado, nombreServicio: '<script>histórico</script>' });
  await formulario(flujo); await flujo.enviarReserva(); const html = renderReserva(flujo.obtenerEstado());
  assert.match(html, /Pendiente/); assert.match(html, /P-123456789012345678/); assert.match(html, /450.00/);
  assert.match(html, /America\/Mazatlan/); assert.match(html, /10:00/); assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|href=|WhatsApp|999.00|confirmada/i);
});

test('T114: resultado incompleto nunca muestra éxito ni borra marcador', async () => {
  for (const bad of [{ estado: 'confirmada' }, { zonaHoraria: 'ZonaInexistente' }, { costo: null }, { inicioUtc: '2026-10-20T17:00:00' }, { finUtc: '2026-10-20T16:00:00Z' }]) {
    const { flow: flujo, store } = prepararPrueba((ruta) => ruta === 'intentos' ? { id: marcador.clave, apartadoId: 8, estado: 'preparado' } : { ...resultado, ...bad });
    await formulario(flujo); await flujo.enviarReserva();
    assert.equal(flujo.obtenerEstado().fase, 'incierto'); assert.deepEqual(store.leer().marcador, marcador);
  }
});

test('T113: una lectura de apartado iniciada antes del envío no invalida el resultado posterior', async () => {
  const consultaApartadoDiferida = crearPromesaControlada(), respuestaPendiente = crearPromesaControlada(); let diferido = false, sending = false;
  const rutaBase = prepararPrueba(null, { ownResponse: () => diferido ? consultaApartadoDiferida.promise : { apartadoId: 8, generacion: '1', estado: 'vigente', expiraEn: '2026-10-20T16:05:00Z', servidorAhora: '2026-10-20T16:00:00Z' },
    adquirirMutacion: async () => sending ? respuestaPendiente.promise : { liberar() {} } });
  await formulario(rutaBase.flow); sending = true;
  const enviar = rutaBase.flow.enviarReserva(); diferido = true;
  const verificacion = rutaBase.flow.verificarVigencia();
  respuestaPendiente.resolver({ liberar() {} }); await enviar;
  consultaApartadoDiferida.resolver({ apartadoId: 8, generacion: '1', estado: 'sustituido', expiraEn: '2026-10-20T16:05:00Z', servidorAhora: '2026-10-20T16:00:00Z' }); await verificacion;
  assert.equal(rutaBase.flow.obtenerEstado().fase, 'resultado'); assert.equal(rutaBase.flow.obtenerEstado().resultado.folio, resultado.folio);
});
