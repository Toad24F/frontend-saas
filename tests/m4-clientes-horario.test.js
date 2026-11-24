import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crearPayloadCambioHorario,
  crearClientCambioHorario,
} from '../src/connected/modules/agenda/agenda.cambio-horario.js';
import {
  crearPayloadCliente,
  crearClientesClient,
} from '../src/connected/modules/clientes/clientes.client.js';
import { crearMutacionVersionada } from '../src/connected/modules/agenda/agenda.mutacion-versionada.js';
import { reemplazarDatos, ampliarDatosCita } from '../src/shared/aplicacion.datos.js';
import {
  corregirClienteDemo,
  moverCitaDemo,
} from '../src/demo/clientes.horario.js';

const ficha = {
  id: 1,
  negocioId: 2,
  version: 3,
  nombreCompleto: 'Ana',
  telefono: '6145550101',
  creadoEn: '2026-11-12T12:00:00Z',
};
const rechazo = (estadoHttp) =>
  Object.assign(new Error('Respuesta rechazada'), { status: estadoHttp });

test('demo: corregir ficha conserva contactos previos y mover conserva identidad y duración', () => {
  const cita = {
    id: 7,
    tenantId: 1,
    clientId: 1,
    serviceId: 1,
    branchId: 1,
    professionalId: 1,
    status: 'confirmada',
    date: '2030-12-20',
    start: '09:00',
    end: '09:30',
  };
  reemplazarDatos({
    clients: [{ id: 1, tenantId: 1, name: 'Antes', phone: '6145550101' }],
    appointments: [cita],
    services: [{ id: 1, tenantId: 1 }],
    professionals: [{ id: 1, tenantId: 1 }],
    branches: [{ id: 1, tenantId: 1 }],
    schedules: [
      {
        tenantId: 1,
        professionalId: 1,
        branchId: 1,
        day: 5,
        enabled: true,
        start: '08:00',
        end: '18:00',
      },
    ],
    holds: [],
    blocks: [],
  });
  corregirClienteDemo(1, 1, {
    nombreCompleto: 'Después',
    telefono: '6145550101',
  });
  assert.equal(ampliarDatosCita(cita).client.name, 'Antes');
  moverCitaDemo(7, 1, { fechaLocal: '2030-12-20', horaInicio: '10:00' });
  assert.equal(cita.start, '10:00');
  assert.equal(cita.end, '10:30');
  assert.equal(cita.id, 7);
  assert.throws(() =>
    moverCitaDemo(7, 1, {
      fechaLocal: '2030-12-20',
      horaInicio: '23:45',
    }),
  );
  assert.equal(cita.start, '10:00');
});
test('T097: cambio cerrado de fecha/hora/versión, sin aceptar combinación ni datos previos', async () => {
  const entrada = { fechaLocal: '2030-11-20', horaInicio: '09:17', version: 3 };
  assert.deepEqual(
    crearPayloadCambioHorario({ ...entrada, costo: 1, personalId: 99, zonaHoraria: 'otra' }),
    entrada,
  );
  for (const invalido of [
    { ...entrada, fechaLocal: '2030-02-30' },
    { ...entrada, horaInicio: '24:00' },
    { ...entrada, version: 0 },
    { ...entrada, version: '3' },
  ])
    assert.throws(() => crearPayloadCambioHorario(invalido));
  const llamadas = [],
    client = crearClientCambioHorario(async (...argumentos) => {
      llamadas.push(argumentos);
      return { id: 7 };
    });
  await client.cambiarHorario(7, entrada);
  assert.deepEqual(llamadas, [['/citas/7/horario', 'PATCH', entrada]]);
  assert.throws(() => client.cambiarHorario('7/estado', entrada));
});
test('T099: alta sin versión, corrección con versión, teléfonos compartibles y nombre normalizado', () => {
  const entrada = {
    nombreCompleto: ' Ana ',
    telefono: '+52 614-555-0101',
    negocioId: 99,
    notas: 'No permitidas',
    version: 3,
  };
  assert.deepEqual(crearPayloadCliente(entrada), {
    nombreCompleto: 'Ana',
    telefono: '6145550101',
  });
  assert.deepEqual(crearPayloadCliente(entrada, true), {
    nombreCompleto: 'Ana',
    telefono: '6145550101',
    version: 3,
  });
  assert.deepEqual(
    crearPayloadCliente({ version: 3, telefono: '6145550101' }, true),
    { telefono: '6145550101', version: 3 },
  );
  for (const invalido of [
    { nombreCompleto: '', telefono: '6145550101' },
    { nombreCompleto: 'Ana', telefono: 'abc' },
    { nombreCompleto: 'x'.repeat(151), telefono: '6145550101' },
  ])
    assert.throws(() => crearPayloadCliente(invalido));
  assert.throws(() => crearPayloadCliente({ version: 1 }, true));
  assert.throws(() => crearPayloadCliente({ ...entrada, version: 0 }, true));
});
test('T098/T099: rutas privadas y páginas exactas, sin identificadores de negocio elegidos por cliente', async () => {
  const llamadas = [];
  const clientesClient = crearClientesClient(async (...argumentos) => {
    llamadas.push(argumentos);
    const ruta = argumentos[0];
    if (ruta.startsWith('/clientes?'))
      return {
        clientes: [
          ficha,
          { ...ficha, id: 2, nombreCompleto: 'Otra persona' },
        ],
        pagina: 2,
        limite: 50,
        hayMas: false,
      };
    if (ruta.includes('/citas'))
      return { citas: [], pagina: 3, limite: 50, hayMas: false };
    return ficha;
  });
  const pagina = await clientesClient.listar({
    busqueda: 'Ana & %_',
    pagina: 2,
    negocioId: 99,
  });
  assert.equal(pagina.clientes.length, 2);
  assert.equal(pagina.clientes[0].telefono, pagina.clientes[1].telefono);
  await clientesClient.consultar(1);
  await clientesClient.consultarHistorial(1, 3);
  await clientesClient.crear({ nombreCompleto: 'Ana', telefono: '6145550101' });
  await clientesClient.corregir(1, {
    nombreCompleto: 'Ana',
    telefono: '6145550101',
    version: 3,
  });
  assert.deepEqual(llamadas, [
    ['/clientes?busqueda=Ana+%26+%25_&pagina=2&limite=50'],
    ['/clientes/1'],
    ['/clientes/1/citas?pagina=3&limite=50'],
    ['/clientes', 'POST', { nombreCompleto: 'Ana', telefono: '6145550101' }],
    [
      '/clientes/1',
      'PATCH',
      { nombreCompleto: 'Ana', telefono: '6145550101', version: 3 },
    ],
  ]);
});
test('T098: lectura inválida o de otra página no se convierte en directorio vacío', async () => {
  for (const respuesta of [
    null,
    {},
    { clientes: [], pagina: 2, limite: 50, hayMas: false },
    { clientes: [{}], pagina: 1, limite: 50, hayMas: false },
  ]) {
    await assert.rejects(crearClientesClient(async () => respuesta).listar({}));
  }
  const paginaVacia = await crearClientesClient(async () => ({
    clientes: [],
    pagina: 1,
    limite: 50,
    hayMas: false,
  })).listar({});
  assert.equal(paginaVacia.clientes.length, 0);
  for (const estadoHttp of [400, 401, 403, 404, 409, 500, 503])
    await assert.rejects(
      crearClientesClient(async () => {
        throw rechazo(estadoHttp);
      }).listar({}),
      (error) => error.status === estadoHttp,
    );
});
test('T098: historial conserva valores históricos nulos y no acepta citas de otra ficha', async () => {
  const cita = {
    id: 7,
    clienteId: 1,
    nombreContacto: 'Contacto anterior',
    costoAceptado: null,
    inicioUtc: '2030-11-20T15:00:00Z',
    finUtc: '2030-11-20T15:30:00Z',
    zonaHoraria: 'America/Chihuahua',
  };
  const respuesta = { citas: [cita], pagina: 1, limite: 50, hayMas: false };
  const pagina = await crearClientesClient(async () => respuesta).consultarHistorial(1);
  assert.equal(pagina.citas[0].nombreContacto, 'Contacto anterior');
  assert.equal(pagina.citas[0].costoAceptado, null);
  await assert.rejects(
    crearClientesClient(async () => ({
      ...respuesta,
      citas: [{ ...cita, clienteId: 2 }],
    })).consultarHistorial(1),
  );
});
test('T097/T099: doble clic conserva versión observada y un 409 exige releer', async () => {
  let liberar;
  const espera = new Promise((resolver) => {
    liberar = resolver;
  });
  const llamadas = [];
  const mutacion = crearMutacionVersionada(3, async (valores) => {
    llamadas.push(valores);
    await espera;
    throw rechazo(409);
  });
  const primerEnvio = mutacion.submit({ nombreCompleto: 'Cambio', version: 99 });
  await mutacion.submit({ nombreCompleto: 'Otro' });
  liberar();
  await primerEnvio;
  assert.deepEqual(llamadas, [{ nombreCompleto: 'Cambio', version: 3 }]);
  assert.equal(mutacion.state.stale, true);
  await mutacion.submit({ nombreCompleto: 'Otro' });
  assert.equal(llamadas.length, 1);
});
test('T097/T099: 400 permite corregir, resultado incierto no se confirma ni reenvía', async () => {
  for (const estadoHttp of [400, 0, 403, 404, 500, 503]) {
    const mutacion = crearMutacionVersionada(1, async () => {
      throw rechazo(estadoHttp);
    });
    await mutacion.submit({});
    assert.equal(mutacion.state.stale, estadoHttp !== 400);
    assert.equal(mutacion.state.result, null);
  }
  const mutacion = crearMutacionVersionada(
    1,
    async () => ({}),
    () => false,
  );
  await mutacion.submit({});
  assert.equal(mutacion.state.result, null);
  assert.equal(mutacion.state.stale, true);
});
