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
const fixture = JSON.parse(
  await readFile(new URL('../public/data/demo.json', import.meta.url), 'utf8'),
);
beforeEach(async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(fixture));
  try {
    await cargarDatosDemo();
  } finally {
    globalThis.fetch = previous;
  }
});
const options = () => ({
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
  const other = { ...original, id: 100, name: 'Otra Persona' };
  datosAplicacion.clients.push(other);
  const firstTime = buscarHorariosDemo(options())[0];
  const appointment = crearCitaDemo({ ...options(), start: firstTime, clientId: 100 }, { name: other.name, phone: other.phone });
  assert.equal(appointment.clientId, 100);
  const secondTime = buscarHorariosDemo(options())[0], count = datosAplicacion.clients.length;
  const newAppointment = crearCitaDemo({ ...options(), start: secondTime, newClient: true }, { name: 'Persona Nueva', phone: other.phone });
  assert.equal(datosAplicacion.clients.length, count + 1);
  assert.notEqual(newAppointment.clientId, original.id);
  assert.notEqual(newAppointment.clientId, 100);
});
test('rechaza recursos de otro tenant en el selector de demostración', () => {
  assert.throws(() => obtenerRecurso('appointments', 24, 1), /no está disponible/);
  assert.throws(() => obtenerRecurso('clients', 21, 1), /no está disponible/);
  assert.equal(listarRegistros('appointments', 2).length, 1);
});
test('rechaza una combinación de IDs de distintos negocios', () => {
  assert.throws(
    () => buscarHorariosDemo({ ...options(), branchId: 3 }),
    /no está disponible/,
  );
  assert.throws(
    () => buscarHorariosDemo({ ...options(), serviceId: 5 }),
    /no está disponible/,
  );
});
test('un profesional solo atiende servicios asignados y en la sucursal del día', () => {
  assert.deepEqual(buscarHorariosDemo({ ...options(), serviceId: 2 }), []);
  assert.deepEqual(buscarHorariosDemo({ ...options(), branchId: 1 }), []);
});
test('evita empalmes, respeta duración, descanso y cierre', () => {
  const result = buscarHorariosDemo(options());
  assert.ok(result.length);
  assert.ok(!result.includes('09:00'));
  assert.ok(result.includes('09:45'));
  assert.ok(!result.includes('12:30'));
  assert.ok(!result.includes('13:00'));
  assert.ok(result.includes('17:15'));
  assert.ok(!result.includes('17:30'));
  for (const t of result) assert.ok(horaAMinutos(t) + 45 <= 18 * 60);
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
  assert.deepEqual(buscarHorariosDemo(options()), []);
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
  const result = buscarHorariosDemo(options());
  assert.ok(!result.includes('09:45'));
  assert.ok(!result.includes('10:45'));
  assert.ok(result.includes('11:00'));
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
  assert.ok(buscarHorariosDemo(options()).includes('09:00'));
});
test('el apartamiento impide reservas solapadas en esta memoria', () => {
  const hold = apartarHorarioDemo(options(), '09:45');
  assert.ok(!buscarHorariosDemo(options()).includes('09:45'));
  assert.ok(!buscarHorariosDemo(options()).includes('10:00'));
  assert.throws(() => apartarHorarioDemo(options(), '10:00'), /no está disponible/);
  liberarApartadoDemo(hold.id);
  assert.ok(buscarHorariosDemo(options()).includes('09:45'));
});
test('un apartamiento vencido se ignora y no permite confirmar', () => {
  const hold = apartarHorarioDemo(options(), '09:45');
  hold.expiresAt = Date.now() - 1;
  assert.ok(buscarHorariosDemo(options()).includes('09:45'));
  assert.throws(
    () =>
      crearCitaDemo(
        { ...options(), start: '09:45' },
        { name: 'Prueba Apellido', phone: '6140001000' },
        hold.id,
      ),
    /tiempo de reserva terminó/,
  );
});
test('confirmar consume el lock, agrega una cita y evita doble envío', () => {
  const hold = apartarHorarioDemo(options(), '09:45');
  const a = crearCitaDemo(
    { ...options(), start: '09:45' },
    { name: 'Prueba Apellido', phone: '6140001000' },
    hold.id,
  );
  assert.equal(a.tenantId, 1);
  assert.equal(a.end, '10:30');
  assert.ok(a.folio.startsWith('CB-'));
  assert.ok(!datosAplicacion.holds.some((h) => h.id === hold.id));
  assert.throws(() =>
    crearCitaDemo(
      { ...options(), start: '09:45' },
      { name: 'Prueba Apellido', phone: '6140001000' },
      hold.id,
    ),
  );
});
test('no permite usar el lock de otro profesional o servicio', () => {
  const hold = apartarHorarioDemo(options(), '09:45');
  assert.throws(
    () =>
      crearCitaDemo(
        { ...options(), professionalId: 2, serviceId: 2, start: '09:45' },
        { name: 'Prueba Apellido', phone: '6140001000' },
        hold.id,
      ),
    /tiempo de reserva terminó/,
  );
});
test('el nombre y el teléfono se validan antes de insertar', () => {
  const initial = datosAplicacion.appointments.length;
  assert.throws(() => validarContactoDemo('Ana', '6140000000'));
  assert.throws(() => validarContactoDemo('Ana Pérez', '+526140000000'));
  assert.throws(() => validarContactoDemo('Ana Pérez', '614 000000'));
  assert.doesNotThrow(() => validarContactoDemo('Ana Pérez', '6140000000'));
  assert.equal(datosAplicacion.appointments.length, initial);
});
test('compacta prioriza horas contiguas y busca otro día al saturarse', () => {
  const result = buscarHorariosDemo({ ...options(), mode: 'compact' });
  assert.ok(result.includes('09:45'));
  assert.ok(!result.includes('11:00'));
  datosAplicacion.blocks.push({
    id: 2,
    tenantId: 1,
    professionalId: 1,
    date: HOY,
    endDate: HOY,
    start: null,
    end: null,
  });
  const future = buscarFechasDemo({ ...options(), mode: 'compact' }, 10);
  assert.ok(future.length);
  assert.ok(future[0].day > HOY);
});
test('no ofrece fechas anteriores ni domingos', () => {
  assert.deepEqual(buscarHorariosDemo({ ...options(), day: sumarDias(HOY, -1) }), []);
  assert.deepEqual(buscarHorariosDemo({ ...options(), day: '2026-09-13' }), []);
});
test('el texto introducido por usuarios se escapa antes de insertarlo en HTML', () => {
  assert.equal(
    escaparHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
  );
});
