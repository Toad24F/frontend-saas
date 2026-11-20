import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { datosAplicacion, HOY } from '../src/shared/aplicacion.datos.js';
import { cargarDatosDemo } from '../src/demo/demo.datos.js';
import { buscarHorariosDemo } from '../src/demo/disponibilidad.motor.js';
import { validarFranjasDemo, citaCubiertaPorHorarioDemo } from '../src/demo/demo.horario.js';

const datosPrueba = JSON.parse(await readFile(new URL('../public/data/demo.json', import.meta.url), 'utf8'));
beforeEach(async () => {
  const previo = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(datosPrueba));
  try { await cargarDatosDemo(); } finally { globalThis.fetch = previo; }
});
const fila = (sucursalId, inicio, fin) => ({
  id: sucursalId, day: 2, branchId: sucursalId, start: inicio, end: fin,
  breakStart: '', breakEnd: '', enabled: true,
});

test('la demo inicia con sábado en dos sucursales y una hora para comer', () => {
  const sabado = datosAplicacion.schedules.filter((s) => s.professionalId === 1 && s.day === 6);
  assert.equal(sabado.length, 2);
  assert.doesNotThrow(() => validarFranjasDemo(sabado, [1, 2]));
  assert.deepEqual(sabado.map((s) => [s.branchId, s.start, s.end]), [
    [2, '09:00', '13:00'], [1, '14:00', '18:00'],
  ]);
});

test('acepta comer y regresar a otra sucursal', () => {
  const consultarFilas = [fila(2, '09:00', '13:00'), fila(1, '14:00', '18:00')];
  assert.doesNotThrow(() => validarFranjasDemo(consultarFilas, [1, 2]));
  datosAplicacion.schedules = datosAplicacion.schedules.filter((s) => !(s.professionalId === 1 && s.day === 2));
  datosAplicacion.schedules.push(...consultarFilas.map((s, indice) => ({ ...s, id: 100 + indice, professionalId: 1, tenantId: 1 })));
  const base = { tenantId: 1, professionalId: 1, serviceId: 1, day: HOY, mode: 'free' };
  assert.ok(buscarHorariosDemo({ ...base, branchId: 1 }).includes('17:00'));
  assert.ok(!buscarHorariosDemo({ ...base, branchId: 1 }).includes('12:00'));
  assert.ok(buscarHorariosDemo({ ...base, branchId: 2 }).includes('12:00'));
  assert.ok(!buscarHorariosDemo({ ...base, branchId: 2 }).includes('13:00'));
  assert.ok(citaCubiertaPorHorarioDemo({ date: HOY, branchId: 1, start: '14:00', end: '14:45' }, consultarFilas));
});

test('rechaza empalmes y acepta franjas contiguas en distintas sucursales', () => {
  assert.throws(() => validarFranjasDemo([fila(2, '09:00', '13:00'), fila(1, '12:45', '18:00')], [1, 2]), /Empalme/);
  assert.doesNotThrow(() => validarFranjasDemo([fila(2, '09:00', '13:00'), fila(1, '13:15', '18:00')], [1, 2]));
  assert.doesNotThrow(() => validarFranjasDemo([fila(2, '09:00', '13:00'), fila(1, '13:00', '18:00')], [1, 2]));
});

test('valida descanso opcional, sucursal asignada y jornada dentro del día', () => {
  assert.throws(() => validarFranjasDemo([fila(3, '09:00', '13:00')], [1, 2]), /sucursal asignada/);
  assert.throws(() => validarFranjasDemo([fila(2, '23:00', '01:00')], [1, 2]), /mismo día/);
  assert.throws(() => validarFranjasDemo([{ ...fila(2, '09:00', '13:00'), breakStart: '11:00' }], [1, 2]), /descanso/);
});
