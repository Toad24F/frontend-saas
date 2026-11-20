import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  datosAplicacion,
  obtenerRecurso,
  listarRegistros,
  HOY,
  sumarDias,
  horaAMinutos,
} from '../src/shared/aplicacion.datos.js';
import {
  buscarHorariosDemo,
  apartarHorarioDemo,
  crearCitaDemo,
  liberarApartadoDemo,
  validarContactoDemo,
  seEmpalman,
  buscarFechasDemo,
} from '../src/demo/disponibilidad.motor.js';
import { cargarDatosDemo } from '../src/demo/demo.datos.js';
import { escaparHtml } from '../src/shared/interfaz.componentes.js';
const datosPrueba = JSON.parse(
  await readFile(new URL('../public/data/demo.json', import.meta.url), 'utf8'),
);
beforeEach(async () => {
  const previo = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(datosPrueba));
  try {
    await cargarDatosDemo();
  } finally {
    globalThis.fetch = previo;
  }
});
const opciones = () => ({
  tenantId: 1,
  serviceId: 1,
  professionalId: 1,
  branchId: 2,
  day: HOY,
  mode: 'free',
});
// La demo manual representa la selección expresa por ficha sin cambiar el contrato del portal de ejemplo.
test('demo manual: ficha explícita y cliente nuevo no se fusionan por teléfono compartido', () => {
  const original = datosAplicacion.clients[0];
  const otro = { ...original, id: 100, name: 'Otra Persona' };
  datosAplicacion.clients.push(otro);
  const primerHorario = buscarHorariosDemo(opciones())[0];
  const cita = crearCitaDemo({ ...opciones(), start: primerHorario, clientId: 100 }, { name: otro.name, phone: otro.phone });
  assert.equal(cita.clientId, 100);
  const segundoHorario = buscarHorariosDemo(opciones())[0], cantidad = datosAplicacion.clients.length;
  const citaNueva = crearCitaDemo({ ...opciones(), start: segundoHorario, newClient: true }, { name: 'Persona Nueva', phone: otro.phone });
  assert.equal(datosAplicacion.clients.length, cantidad + 1);
  assert.notEqual(citaNueva.clientId, original.id);
  assert.notEqual(citaNueva.clientId, 100);
});
test('rechaza recursos de otro tenant en el selector de demostración', () => {
  assert.throws(() => obtenerRecurso('appointments', 24, 1), /no está disponible/);
  assert.throws(() => obtenerRecurso('clients', 21, 1), /no está disponible/);
  assert.equal(listarRegistros('appointments', 2).length, 1);
});
test('rechaza una combinación de IDs de distintos negocios', () => {
  assert.throws(
    () => buscarHorariosDemo({ ...opciones(), branchId: 3 }),
    /no está disponible/,
  );
  assert.throws(
    () => buscarHorariosDemo({ ...opciones(), serviceId: 5 }),
    /no está disponible/,
  );
});
test('un profesional solo atiende servicios asignados y en la sucursal del día', () => {
  assert.deepEqual(buscarHorariosDemo({ ...opciones(), serviceId: 2 }), []);
  assert.deepEqual(buscarHorariosDemo({ ...opciones(), branchId: 1 }), []);
});
test('evita empalmes, respeta duración, descanso y cierre', () => {
  const resultado = buscarHorariosDemo(opciones());
  assert.ok(resultado.length);
  assert.ok(!resultado.includes('09:00'));
  assert.ok(resultado.includes('09:45'));
  assert.ok(!resultado.includes('12:30'));
  assert.ok(!resultado.includes('13:00'));
  assert.ok(resultado.includes('17:15'));
  assert.ok(!resultado.includes('17:30'));
  for (const t of resultado) assert.ok(horaAMinutos(t) + 45 <= 18 * 60);
});
test('los intervalos contiguos no se solapan', () => {
  assert.equal(seEmpalman(540, 600, 600, 660), false);
  assert.equal(seEmpalman(540, 615, 600, 660), true);
});
test('un bloqueo completo impide toda disponibilidad en ese día', () => {
  datosAplicacion.blocks.push({
    id: 2,
    tenantId: 1,
    professionalId: 1,
    branchId: 2,
    date: HOY,
    endDate: HOY,
    start: null,
    end: null,
  });
  assert.deepEqual(buscarHorariosDemo(opciones()), []);
});
test('los bloqueos por franja excluyen también solapamientos parciales', () => {
  datosAplicacion.blocks.push({
    id: 2,
    tenantId: 1,
    professionalId: 1,
    branchId: 2,
    date: HOY,
    endDate: HOY,
    start: '10:00',
    end: '11:00',
  });
  const resultado = buscarHorariosDemo(opciones());
  assert.ok(!resultado.includes('09:45'));
  assert.ok(!resultado.includes('10:45'));
  assert.ok(resultado.includes('11:00'));
});
test('cancelar libera un horario y los bloqueos ajenos no afectan', () => {
  obtenerRecurso('appointments', 6, 1).status = 'cancelada';
  datosAplicacion.blocks.push({
    id: 2,
    tenantId: 2,
    date: HOY,
    endDate: HOY,
    start: null,
    end: null,
  });
  assert.ok(buscarHorariosDemo(opciones()).includes('09:00'));
});
test('el apartamiento impide reservas solapadas en esta memoria', () => {
  const apartado = apartarHorarioDemo(opciones(), '09:45');
  assert.ok(!buscarHorariosDemo(opciones()).includes('09:45'));
  assert.ok(!buscarHorariosDemo(opciones()).includes('10:00'));
  assert.throws(() => apartarHorarioDemo(opciones(), '10:00'), /no está disponible/);
  liberarApartadoDemo(apartado.id);
  assert.ok(buscarHorariosDemo(opciones()).includes('09:45'));
});
test('un apartamiento vencido se ignora y no permite confirmar', () => {
  const apartado = apartarHorarioDemo(opciones(), '09:45');
  apartado.expiresAt = Date.now() - 1;
  assert.ok(buscarHorariosDemo(opciones()).includes('09:45'));
  assert.throws(
    () =>
      crearCitaDemo(
        { ...opciones(), start: '09:45' },
        { name: 'Prueba Apellido', phone: '6140001000' },
        apartado.id,
      ),
    /tiempo de reserva terminó/,
  );
});
test('confirmar consume el lock, agrega una cita y evita doble envío', () => {
  const apartado = apartarHorarioDemo(opciones(), '09:45');
  const a = crearCitaDemo(
    { ...opciones(), start: '09:45' },
    { name: 'Prueba Apellido', phone: '6140001000' },
    apartado.id,
  );
  assert.equal(a.tenantId, 1);
  assert.equal(a.end, '10:30');
  assert.ok(a.folio.startsWith('CB-'));
  assert.ok(!datosAplicacion.holds.some((altura) => altura.id === apartado.id));
  assert.throws(() =>
    crearCitaDemo(
      { ...opciones(), start: '09:45' },
      { name: 'Prueba Apellido', phone: '6140001000' },
      apartado.id,
    ),
  );
});
test('no permite usar el lock de otro profesional o servicio', () => {
  const apartado = apartarHorarioDemo(opciones(), '09:45');
  assert.throws(
    () =>
      crearCitaDemo(
        { ...opciones(), professionalId: 2, serviceId: 2, start: '09:45' },
        { name: 'Prueba Apellido', phone: '6140001000' },
        apartado.id,
      ),
    /tiempo de reserva terminó/,
  );
});
test('el nombre y el teléfono se validan antes de insertar', () => {
  const inicial = datosAplicacion.appointments.length;
  assert.throws(() => validarContactoDemo('Ana', '6140000000'));
  assert.throws(() => validarContactoDemo('Ana Pérez', '+526140000000'));
  assert.throws(() => validarContactoDemo('Ana Pérez', '614 000000'));
  assert.doesNotThrow(() => validarContactoDemo('Ana Pérez', '6140000000'));
  assert.equal(datosAplicacion.appointments.length, inicial);
});
test('compacta prioriza horas contiguas y busca otro día al saturarse', () => {
  const resultado = buscarHorariosDemo({ ...opciones(), mode: 'compact' });
  assert.ok(resultado.includes('09:45'));
  assert.ok(!resultado.includes('11:00'));
  datosAplicacion.blocks.push({
    id: 2,
    tenantId: 1,
    professionalId: 1,
    date: HOY,
    endDate: HOY,
    start: null,
    end: null,
  });
  const futuro = buscarFechasDemo({ ...opciones(), mode: 'compact' }, 10);
  assert.ok(futuro.length);
  assert.ok(futuro[0].day > HOY);
});
test('no ofrece fechas anteriores ni domingos', () => {
  assert.deepEqual(buscarHorariosDemo({ ...opciones(), day: sumarDias(HOY, -1) }), []);
  assert.deepEqual(buscarHorariosDemo({ ...opciones(), day: '2026-09-13' }), []);
});
test('el texto introducido por usuarios se escapa antes de insertarlo en HTML', () => {
  assert.equal(
    escaparHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
  );
});
