import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleChange,
  createScheduleClient,
} from '../src/connected/modules/agenda/schedule-change.js';
import {
  customerPayload,
  createCustomerClient,
} from '../src/connected/modules/clientes/client.js';
import { createVersionedMutation } from '../src/connected/modules/agenda/versioned-mutation.js';
import { replaceData, appointmentInfo } from '../src/shared/data.js';
import {
  correctDemoCustomer,
  moveDemoAppointment,
} from '../src/demo/customer-schedule.js';

const customer = {
  id: 1,
  negocioId: 2,
  version: 3,
  nombreCompleto: 'Ana',
  telefono: '6145550101',
  creadoEn: '2026-11-12T12:00:00Z',
};
const fail = (status) =>
  Object.assign(new Error('Respuesta rechazada'), { status });

test('demo: corregir ficha conserva contactos previos y mover conserva identidad y duración', () => {
  const cita = {
    id: 7,
    tenantId: 1,
    clientId: 1,
    serviceId: 1,
    branchId: 1,
    professionalId: 1,
    folio: 'DEMO-7',
    status: 'confirmada',
    date: '2030-12-20',
    start: '09:00',
    end: '09:30',
  };
  replaceData({
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
  correctDemoCustomer(1, 1, {
    nombreCompleto: 'Después',
    telefono: '6145550101',
  });
  assert.equal(appointmentInfo(cita).client.name, 'Antes');
  moveDemoAppointment(7, 1, { fechaLocal: '2030-12-20', horaInicio: '10:00' });
  assert.equal(cita.start, '10:00');
  assert.equal(cita.end, '10:30');
  assert.equal(cita.folio, 'DEMO-7');
  assert.throws(() =>
    moveDemoAppointment(7, 1, {
      fechaLocal: '2030-12-20',
      horaInicio: '23:45',
    }),
  );
  assert.equal(cita.start, '10:00');
});
test('T097: cambio cerrado de fecha/hora/versión, sin aceptar combinación ni snapshots', async () => {
  const input = { fechaLocal: '2030-11-20', horaInicio: '09:17', version: 3 };
  assert.deepEqual(
    scheduleChange({ ...input, costo: 1, personalId: 99, zonaHoraria: 'otra' }),
    input,
  );
  for (const bad of [
    { ...input, fechaLocal: '2030-02-30' },
    { ...input, horaInicio: '24:00' },
    { ...input, version: 0 },
    { ...input, version: '3' },
  ])
    assert.throws(() => scheduleChange(bad));
  const calls = [],
    client = createScheduleClient(async (...args) => {
      calls.push(args);
      return { id: 7 };
    });
  await client.change(7, input);
  assert.deepEqual(calls, [['/citas/7/horario', 'PATCH', input]]);
  assert.throws(() => client.change('7/estado', input));
});
test('T099: alta sin versión, corrección con versión, teléfonos compartibles y nombre normalizado', () => {
  const input = {
    nombreCompleto: ' Ana ',
    telefono: '+52 614-555-0101',
    negocioId: 99,
    notas: 'No permitidas',
    version: 3,
  };
  assert.deepEqual(customerPayload(input), {
    nombreCompleto: 'Ana',
    telefono: '6145550101',
  });
  assert.deepEqual(customerPayload(input, true), {
    nombreCompleto: 'Ana',
    telefono: '6145550101',
    version: 3,
  });
  assert.deepEqual(
    customerPayload({ version: 3, telefono: '6145550101' }, true),
    { telefono: '6145550101', version: 3 },
  );
  for (const bad of [
    { nombreCompleto: '', telefono: '6145550101' },
    { nombreCompleto: 'Ana', telefono: 'abc' },
    { nombreCompleto: 'x'.repeat(151), telefono: '6145550101' },
  ])
    assert.throws(() => customerPayload(bad));
  assert.throws(() => customerPayload({ version: 1 }, true));
  assert.throws(() => customerPayload({ ...input, version: 0 }, true));
});
test('T098/T099: rutas privadas y páginas exactas, sin identificadores de negocio elegidos por cliente', async () => {
  const calls = [];
  const client = createCustomerClient(async (...args) => {
    calls.push(args);
    const path = args[0];
    if (path.startsWith('/clientes?'))
      return {
        clientes: [
          customer,
          { ...customer, id: 2, nombreCompleto: 'Otra persona' },
        ],
        pagina: 2,
        limite: 50,
        hayMas: false,
      };
    if (path.includes('/citas'))
      return { citas: [], pagina: 3, limite: 50, hayMas: false };
    return customer;
  });
  const page = await client.list({
    busqueda: 'Ana & %_',
    pagina: 2,
    negocioId: 99,
  });
  assert.equal(page.clientes.length, 2);
  assert.equal(page.clientes[0].telefono, page.clientes[1].telefono);
  await client.detail(1);
  await client.history(1, 3);
  await client.create({ nombreCompleto: 'Ana', telefono: '6145550101' });
  await client.update(1, {
    nombreCompleto: 'Ana',
    telefono: '6145550101',
    version: 3,
  });
  assert.deepEqual(calls, [
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
  for (const response of [
    null,
    {},
    { clientes: [], pagina: 2, limite: 50, hayMas: false },
    { clientes: [{}], pagina: 1, limite: 50, hayMas: false },
  ]) {
    await assert.rejects(createCustomerClient(async () => response).list({}));
  }
  const empty = await createCustomerClient(async () => ({
    clientes: [],
    pagina: 1,
    limite: 50,
    hayMas: false,
  })).list({});
  assert.equal(empty.clientes.length, 0);
  for (const status of [400, 401, 403, 404, 409, 500, 503])
    await assert.rejects(
      createCustomerClient(async () => {
        throw fail(status);
      }).list({}),
      (error) => error.status === status,
    );
});
test('T098: historial conserva snapshots nulos y no acepta citas de otra ficha', async () => {
  const cita = {
    id: 7,
    clienteId: 1,
    nombreContacto: 'Contacto anterior',
    costoAceptado: null,
    inicioUtc: '2030-11-20T15:00:00Z',
    finUtc: '2030-11-20T15:30:00Z',
    zonaHoraria: 'America/Chihuahua',
  };
  const response = { citas: [cita], pagina: 1, limite: 50, hayMas: false };
  const page = await createCustomerClient(async () => response).history(1);
  assert.equal(page.citas[0].nombreContacto, 'Contacto anterior');
  assert.equal(page.citas[0].costoAceptado, null);
  await assert.rejects(
    createCustomerClient(async () => ({
      ...response,
      citas: [{ ...cita, clienteId: 2 }],
    })).history(1),
  );
});
test('T097/T099: doble clic conserva versión observada y un 409 exige releer', async () => {
  let release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const calls = [];
  const mutation = createVersionedMutation(3, async (values) => {
    calls.push(values);
    await barrier;
    throw fail(409);
  });
  const first = mutation.submit({ nombreCompleto: 'Cambio', version: 99 });
  await mutation.submit({ nombreCompleto: 'Otro' });
  release();
  await first;
  assert.deepEqual(calls, [{ nombreCompleto: 'Cambio', version: 3 }]);
  assert.equal(mutation.state.stale, true);
  await mutation.submit({ nombreCompleto: 'Otro' });
  assert.equal(calls.length, 1);
});
test('T097/T099: 400 permite corregir, resultado incierto no se confirma ni reenvía', async () => {
  for (const status of [400, 0, 403, 404, 500, 503]) {
    const mutation = createVersionedMutation(1, async () => {
      throw fail(status);
    });
    await mutation.submit({});
    assert.equal(mutation.state.stale, status !== 400);
    assert.equal(mutation.state.result, null);
  }
  const mutation = createVersionedMutation(
    1,
    async () => ({}),
    () => false,
  );
  await mutation.submit({});
  assert.equal(mutation.state.result, null);
  assert.equal(mutation.state.stale, true);
});
