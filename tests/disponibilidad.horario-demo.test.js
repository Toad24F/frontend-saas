import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { db, TODAY } from '../src/shared/data.js';
import { cargarDatosDemo } from '../src/demo/demo.datos.js';
import { buscarHorariosDemo } from '../src/demo/disponibilidad.motor.js';
import { validarFranjasDemo, citaCubiertaPorHorarioDemo } from '../src/demo/demo.horario.js';

const fixture = JSON.parse(await readFile(new URL('../public/data/demo.json', import.meta.url), 'utf8'));
beforeEach(async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(fixture));
  try { await cargarDatosDemo(); } finally { globalThis.fetch = previous; }
});
const row = (branchId, start, end) => ({
  id: branchId, day: 2, branchId, start, end,
  breakStart: '', breakEnd: '', enabled: true,
});

test('la demo inicia con sábado en dos sucursales y una hora para comer', () => {
  const saturday = db.schedules.filter((s) => s.professionalId === 1 && s.day === 6);
  assert.equal(saturday.length, 2);
  assert.doesNotThrow(() => validarFranjasDemo(saturday, [1, 2]));
  assert.deepEqual(saturday.map((s) => [s.branchId, s.start, s.end]), [
    [2, '09:00', '13:00'], [1, '14:00', '18:00'],
  ]);
});

test('acepta comer y regresar a otra sucursal', () => {
  const rows = [row(2, '09:00', '13:00'), row(1, '14:00', '18:00')];
  assert.doesNotThrow(() => validarFranjasDemo(rows, [1, 2]));
  db.schedules = db.schedules.filter((s) => !(s.professionalId === 1 && s.day === 2));
  db.schedules.push(...rows.map((s, i) => ({ ...s, id: 100 + i, professionalId: 1, tenantId: 1 })));
  const base = { tenantId: 1, professionalId: 1, serviceId: 1, day: TODAY, mode: 'free' };
  assert.ok(buscarHorariosDemo({ ...base, branchId: 1 }).includes('17:00'));
  assert.ok(!buscarHorariosDemo({ ...base, branchId: 1 }).includes('12:00'));
  assert.ok(buscarHorariosDemo({ ...base, branchId: 2 }).includes('12:00'));
  assert.ok(!buscarHorariosDemo({ ...base, branchId: 2 }).includes('13:00'));
  assert.ok(citaCubiertaPorHorarioDemo({ date: TODAY, branchId: 1, start: '14:00', end: '14:45' }, rows));
});

test('rechaza empalmes y acepta franjas contiguas en distintas sucursales', () => {
  assert.throws(() => validarFranjasDemo([row(2, '09:00', '13:00'), row(1, '12:45', '18:00')], [1, 2]), /Empalme/);
  assert.doesNotThrow(() => validarFranjasDemo([row(2, '09:00', '13:00'), row(1, '13:15', '18:00')], [1, 2]));
  assert.doesNotThrow(() => validarFranjasDemo([row(2, '09:00', '13:00'), row(1, '13:00', '18:00')], [1, 2]));
});

test('valida descanso opcional, sucursal asignada y jornada dentro del día', () => {
  assert.throws(() => validarFranjasDemo([row(3, '09:00', '13:00')], [1, 2]), /sucursal asignada/);
  assert.throws(() => validarFranjasDemo([row(2, '23:00', '01:00')], [1, 2]), /mismo día/);
  assert.throws(() => validarFranjasDemo([{ ...row(2, '09:00', '13:00'), breakStart: '11:00' }], [1, 2]), /descanso/);
});
