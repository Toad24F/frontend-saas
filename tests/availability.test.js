import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  db,
  loadData,
  resource,
  list,
  TODAY,
  addDays,
  minutes,
} from '../src/data.js';
import {
  slots,
  holdSlot,
  createAppointment,
  releaseHold,
  validateContact,
  overlaps,
  nextDates,
} from '../src/availability.js';
import { escape } from '../src/ui.js';
const fixture = JSON.parse(
  await readFile(new URL('../public/data/demo.json', import.meta.url), 'utf8'),
);
beforeEach(async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(fixture));
  try {
    await loadData();
  } finally {
    globalThis.fetch = previous;
  }
});
const options = () => ({
  tenantId: 1,
  serviceId: 1,
  professionalId: 1,
  branchId: 2,
  day: TODAY,
  mode: 'free',
});
test('rechaza recursos de otro tenant en el selector de demostración', () => {
  assert.throws(() => resource('appointments', 24, 1), /no está disponible/);
  assert.throws(() => resource('clients', 21, 1), /no está disponible/);
  assert.equal(list('appointments', 2).length, 1);
});
test('rechaza una combinación de IDs de distintos negocios', () => {
  assert.throws(
    () => slots({ ...options(), branchId: 3 }),
    /no está disponible/,
  );
  assert.throws(
    () => slots({ ...options(), serviceId: 5 }),
    /no está disponible/,
  );
});
test('un profesional solo atiende servicios asignados y en la sucursal del día', () => {
  assert.deepEqual(slots({ ...options(), serviceId: 2 }), []);
  assert.deepEqual(slots({ ...options(), branchId: 1 }), []);
});
test('evita empalmes, respeta duración, descanso y cierre', () => {
  const result = slots(options());
  assert.ok(result.length);
  assert.ok(!result.includes('09:00'));
  assert.ok(result.includes('09:45'));
  assert.ok(!result.includes('12:30'));
  assert.ok(!result.includes('13:00'));
  assert.ok(result.includes('17:15'));
  assert.ok(!result.includes('17:30'));
  for (const t of result) assert.ok(minutes(t) + 45 <= 18 * 60);
});
test('los intervalos contiguos no se solapan', () => {
  assert.equal(overlaps(540, 600, 600, 660), false);
  assert.equal(overlaps(540, 615, 600, 660), true);
});
test('un bloqueo completo impide toda disponibilidad en ese día', () => {
  db.blocks.push({
    id: 2,
    tenantId: 1,
    professionalId: 1,
    branchId: 2,
    date: TODAY,
    endDate: TODAY,
    start: null,
    end: null,
  });
  assert.deepEqual(slots(options()), []);
});
test('los bloqueos por franja excluyen también solapamientos parciales', () => {
  db.blocks.push({
    id: 2,
    tenantId: 1,
    professionalId: 1,
    branchId: 2,
    date: TODAY,
    endDate: TODAY,
    start: '10:00',
    end: '11:00',
  });
  const result = slots(options());
  assert.ok(!result.includes('09:45'));
  assert.ok(!result.includes('10:45'));
  assert.ok(result.includes('11:00'));
});
test('cancelar libera un horario y los bloqueos ajenos no afectan', () => {
  resource('appointments', 6, 1).status = 'cancelada';
  db.blocks.push({
    id: 2,
    tenantId: 2,
    date: TODAY,
    endDate: TODAY,
    start: null,
    end: null,
  });
  assert.ok(slots(options()).includes('09:00'));
});
test('el apartamiento impide reservas solapadas en esta memoria', () => {
  const hold = holdSlot(options(), '09:45');
  assert.ok(!slots(options()).includes('09:45'));
  assert.ok(!slots(options()).includes('10:00'));
  assert.throws(() => holdSlot(options(), '10:00'), /no está disponible/);
  releaseHold(hold.id);
  assert.ok(slots(options()).includes('09:45'));
});
test('un apartamiento vencido se ignora y no permite confirmar', () => {
  const hold = holdSlot(options(), '09:45');
  hold.expiresAt = Date.now() - 1;
  assert.ok(slots(options()).includes('09:45'));
  assert.throws(
    () =>
      createAppointment(
        { ...options(), start: '09:45' },
        { name: 'Prueba Apellido', phone: '6140001000' },
        hold.id,
      ),
    /tiempo de reserva terminó/,
  );
});
test('confirmar consume el lock, agrega una cita y evita doble envío', () => {
  const hold = holdSlot(options(), '09:45');
  const a = createAppointment(
    { ...options(), start: '09:45' },
    { name: 'Prueba Apellido', phone: '6140001000' },
    hold.id,
  );
  assert.equal(a.tenantId, 1);
  assert.equal(a.end, '10:30');
  assert.ok(a.folio.startsWith('CB-'));
  assert.ok(!db.holds.some((h) => h.id === hold.id));
  assert.throws(() =>
    createAppointment(
      { ...options(), start: '09:45' },
      { name: 'Prueba Apellido', phone: '6140001000' },
      hold.id,
    ),
  );
});
test('no permite usar el lock de otro profesional o servicio', () => {
  const hold = holdSlot(options(), '09:45');
  assert.throws(
    () =>
      createAppointment(
        { ...options(), professionalId: 2, serviceId: 2, start: '09:45' },
        { name: 'Prueba Apellido', phone: '6140001000' },
        hold.id,
      ),
    /tiempo de reserva terminó/,
  );
});
test('el nombre y el teléfono se validan antes de insertar', () => {
  const initial = db.appointments.length;
  assert.throws(() => validateContact('Ana', '6140000000'));
  assert.throws(() => validateContact('Ana Pérez', '+526140000000'));
  assert.throws(() => validateContact('Ana Pérez', '614 000000'));
  assert.doesNotThrow(() => validateContact('Ana Pérez', '6140000000'));
  assert.equal(db.appointments.length, initial);
});
test('compacta prioriza horas contiguas y busca otro día al saturarse', () => {
  const result = slots({ ...options(), mode: 'compact' });
  assert.ok(result.includes('09:45'));
  assert.ok(!result.includes('11:00'));
  db.blocks.push({
    id: 2,
    tenantId: 1,
    professionalId: 1,
    date: TODAY,
    endDate: TODAY,
    start: null,
    end: null,
  });
  const future = nextDates({ ...options(), mode: 'compact' }, 10);
  assert.ok(future.length);
  assert.ok(future[0].day > TODAY);
});
test('no ofrece fechas anteriores ni domingos', () => {
  assert.deepEqual(slots({ ...options(), day: addDays(TODAY, -1) }), []);
  assert.deepEqual(slots({ ...options(), day: '2026-09-13' }), []);
});
test('el texto introducido por usuarios se escapa antes de insertarlo en HTML', () => {
  assert.equal(
    escape('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
  );
});
