import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCacheAgenda } from '../src/connected/modules/agenda/agenda.cache.js';
import { huecosAtencion, posicionHoraActual, gruposDensos } from '../src/shared/screens/agenda/agenda.utilidades.js';
import { consultarAtencionAgenda } from '../src/connected/modules/agenda/agenda.atencion.js';
import { distribuirEventos } from '../src/shared/screens/agenda/agenda.presentacion.js';

const periodo = { desde: '2026-11-09', hasta: '2026-11-15' };
const cita = { id: 1, fechaLocal: '2026-11-12', sucursalId: 2, personalId: 3, estado: 'confirmada', nombreContacto: 'Ángela %_', causas: [{ codigo: 'bloqueo' }] };
test('caché reutiliza periodo completo, subconjunto, filtros y búsqueda literal sin llamadas', async () => {
  const llamadas = [];
  const memoriaCache = crearCacheAgenda(async (consulta) => { llamadas.push(consulta); return { ...periodo, citas: [cita] }; });
  await memoriaCache.read(periodo);
  const resultado = await memoriaCache.read({ desde: '2026-11-12', hasta: '2026-11-12', sucursalId: '2', personalId: '3', busqueda: 'angela %_', afectadas: true });
  assert.equal(llamadas.length, 1);
  assert.equal(resultado.citas.length, 1);
  assert.deepEqual((await memoriaCache.read({ ...periodo, estado: 'pendiente' })).citas, []);
  assert.equal(llamadas.length, 1);
  memoriaCache.clear(); await memoriaCache.read(periodo); assert.equal(llamadas.length, 2);
  await memoriaCache.read(periodo, { force: true }); assert.equal(llamadas.length, 3);
});
test('caché no presenta una consulta filtrada como periodo completo cuando excede el límite', async () => {
  const llamadas = [];
  const memoriaCache = crearCacheAgenda(async (consulta) => {
    llamadas.push(consulta);
    if (!consulta.personalId) throw Object.assign(new Error('La consulta supera 1.000 citas. Acota el periodo o los filtros.'), { status: 400 });
    return { ...periodo, citas: [cita] };
  });
  await memoriaCache.read({ ...periodo, personalId: '3' });
  await assert.rejects(memoriaCache.read(periodo));
  assert.equal(llamadas.length, 3);
});
test('caché descarta lecturas pendientes al limpiar sesión y no conserva una denegación', async () => {
  let resolverPromesa;
  const memoriaCache = crearCacheAgenda(() => new Promise((respuesta) => { resolverPromesa = respuesta; }));
  const pendiente = memoriaCache.read(periodo); memoriaCache.clear(); resolverPromesa({ ...periodo, citas: [cita] }); await pendiente;
  assert.equal(memoriaCache.size, 0);
  let denegado = false;
  const otro = crearCacheAgenda(async () => { if (denegado) throw Object.assign(new Error('Denegado'), { status: 403 }); return { ...periodo, citas: [cita] }; });
  await otro.read(periodo); denegado = true;
  await assert.rejects(otro.read(periodo, { force: true })); assert.equal(otro.size, 0);
});
test('caché elimina datos previos si la consulta acotada de respaldo es denegada', async () => {
  let denegado = false;
  const memoriaCache = crearCacheAgenda(async (consulta) => {
    if (!denegado) return { ...periodo, citas: [cita] };
    throw Object.assign(new Error(consulta.personalId ? 'Denegado' : 'La consulta supera 1.000 citas.'), { status: consulta.personalId ? 403 : 400 });
  });
  await memoriaCache.read(periodo);
  denegado = true;
  await assert.rejects(memoriaCache.read({ ...periodo, personalId: '3' }, { force: true }));
  assert.equal(memoriaCache.size, 0);
});
test('caché comparte la lectura pendiente y caduca sin consultar indefinidamente datos antiguos', async () => {
  let llamadas = 0, ahora = 0, resolverPromesa;
  const memoriaCache = crearCacheAgenda(() => { llamadas++; return new Promise((respuesta) => { resolverPromesa = respuesta; }); }, { now: () => ahora, ttl: 30000 });
  const primero = memoriaCache.read(periodo), segundo = memoriaCache.read({ ...periodo, estado: 'pendiente' });
  assert.equal(llamadas, 1);
  resolverPromesa({ ...periodo, citas: [cita] });
  assert.equal((await primero).citas.length, 1); assert.equal((await segundo).citas.length, 0);
  ahora = 30001; assert.equal(memoriaCache.peek(periodo), null);
});
test('sin atención es complemento de intervalos efectivos; omisiones no se convierten en cierre', () => {
  const datos = { intervalos: [{ fecha: '2026-11-12', sucursalId: 2, inicioMinutos: 540, finMinutos: 780 }, { fecha: '2026-11-12', sucursalId: 2, inicioMinutos: 840, finMinutos: 1080 }], omisiones: [] };
  assert.deepEqual(huecosAtencion(datos, '2026-11-12', 2, 540, 1080), [{ start: 780, end: 840 }]);
  assert.deepEqual(huecosAtencion({ ...datos, omisiones: [{ fecha: '2026-11-12', sucursalId: 2 }] }, '2026-11-12', 2, 540, 1080), []);
  assert.deepEqual(huecosAtencion(null, '2026-11-12', 2, 540, 1080), []);
});
test('agrupación conserva IDs exactos y deja intacta una cita aislada', () => {
  const elementos = [{ id: 99, start: '08:00', end: '08:30' }, ...Array.from({ length: 8 }, (_, indice) => ({ id: indice + 1, start: '09:00', end: '09:30' }))];
  const grupos = gruposDensos(elementos, 180);
  assert.equal(grupos.length, 1); assert.deepEqual(grupos[0].ids, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(grupos[0].start, 540); assert.equal(grupos[0].end, 570);
  assert.equal(gruposDensos(elementos, 1000).length, 0);
});
test('hora actual usa una zona inequívoca y solo la fecha de hoy', () => {
  const ahora = new Date('2026-11-12T18:20:00Z');
  assert.equal(posicionHoraActual('2026-11-12', ['America/Chihuahua'], ahora), 740);
  assert.equal(posicionHoraActual('2026-11-11', ['America/Chihuahua'], ahora), null);
  assert.equal(posicionHoraActual('2026-11-12', ['America/Chihuahua', 'America/Tijuana'], ahora), null);
});
test('atención valida perfil, periodo, intervalos y omisiones antes de sombrear', async () => {
  const respuesta = { ...periodo, personalId: 3, intervalos: [], omisiones: [] };
  const llamadas = [];
  assert.deepEqual(await consultarAtencionAgenda(async (ruta) => { llamadas.push(ruta); return respuesta; }, 3, periodo), respuesta);
  assert.equal(llamadas[0], '/profesionales/3/atencion?desde=2026-11-09&hasta=2026-11-15');
  for (const datos of [{ ...respuesta, personalId: 4 }, { ...respuesta, desde: '2026-11-10' }, { ...respuesta, intervalos: [{}] }, { ...respuesta, omisiones: [{}] }]) await assert.rejects(consultarAtencionAgenda(async () => datos, 3, periodo));
});
test('una cita aprovecha columnas libres después del pico sin superponer otras', () => {
  const distribucion = distribuirEventos([{ id: 1, start: '09:00', end: '11:00' }, { id: 2, start: '09:00', end: '09:30' }, { id: 3, start: '09:00', end: '09:30' }, { id: 4, start: '09:30', end: '10:00' }]);
  assert.ok(distribucion.get(4).width > 60);
  assert.ok(distribucion.get(4).left >= distribucion.get(1).width - 0.01);
});
