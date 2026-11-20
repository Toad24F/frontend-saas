import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSeleccionPortal } from '../src/connected/portal-publico/seleccion.flujo.js';
import { renderSeleccion } from '../src/connected/portal-publico/seleccion.vista.js';
import { paginarOpciones, renderFiltrosOpciones, renderPaginacionOpciones, crearFiltrosIniciales, horariosDelPeriodo } from '../src/shared/portal-publico/portal.opciones.js';

const servicio = { id: 1, nombre: 'Consulta', duracionMinutos: 30 };
const sucursal = { id: 2, nombre: 'Centro', direccion: 'Calle 1', zonaHoraria: 'America/Mazatlan' };
const profesional = { id: 3, nombre: 'Ana', especialidad: 'Medicina' };
function prepararPrueba({ sucursales = 1, profesionales = 1, horarios = [], handler } = {}) {
  const llamadas = [];
  const catalogo = (consulta) => ({ negocio: { slug: 'qa', nombre: 'QA' }, servicios: [servicio], sucursales: consulta.servicioId ? Array.from({ length: sucursales }, (_, indice) => ({ ...sucursal, id: indice + 2 })) : [], profesionales: consulta.sucursalId ? Array.from({ length: profesionales }, (_, indice) => ({ ...profesional, id: indice + 3 })) : [] });
  const flujo = crearSeleccionPortal({ async solicitar(ruta, { consulta }) {
    llamadas.push({ path: ruta, consulta });
    if (handler) return handler(ruta, consulta, catalogo);
    return ruta === 'catalogo' ? catalogo(consulta) : { ...consulta, modalidad: 'publica', zonaHoraria: sucursal.zonaHoraria, ranuras: horarios };
  } }, { slug: 'qa', ahora: () => new Date('2026-11-07T16:00:00Z') });
  return { flow: flujo, calls: llamadas };
}

test('portal: salta únicas opciones independientemente y vuelve a la última elección real', async () => {
  for (const [sucursales, profesionales, esperado] of [[1, 1, 3], [1, 2, 2], [2, 1, 1], [0, 1, 1]]) {
    const { flow: flujo, calls: llamadas } = prepararPrueba({ sucursales, profesionales });
    await flujo.iniciar(); assert.equal(flujo.obtenerEstado().paso, 0); // Servicio explícito incluso único.
    flujo.elegir('servicioId', 1); await flujo.continuar();
    assert.equal(flujo.obtenerEstado().paso, esperado);
    if (esperado === 3) {
      assert.deepEqual(flujo.obtenerEstado().pasosAutomaticos, [1, 2]);
      assert.equal(flujo.obtenerEstado().consulta.estado, 'vacia');
      await flujo.volver(); assert.equal(flujo.obtenerEstado().paso, 0);
      assert.ok(llamadas.every(({ path: ruta }) => ['catalogo', 'disponibilidad'].includes(ruta)));
    }
    if (!sucursales) assert.equal(flujo.obtenerEstado().seleccion.sucursalId, null);
  }
});

test('portal: múltiples sucursales y un profesional saltan solo el profesional', async () => {
  const { flow: flujo } = prepararPrueba({ sucursales: 2 }); await flujo.iniciar(); flujo.elegir('servicioId', 1); await flujo.continuar();
  flujo.elegir('sucursalId', 2); await flujo.continuar(); assert.equal(flujo.obtenerEstado().paso, 3);
  await flujo.volver(); assert.equal(flujo.obtenerEstado().paso, 1);
  flujo.elegir('sucursalId', 3); assert.equal(flujo.obtenerEstado().seleccion.personalId, null);
  assert.deepEqual(flujo.obtenerEstado().pasosAutomaticos, []);
});

test('portal: una respuesta automática tardía no avanza después de volver', async () => {
  let fin;
  const { flow: flujo } = prepararPrueba({ handler: (ruta, consulta, catalogo) => consulta.servicioId ? new Promise((resolver) => { fin = () => resolver(catalogo(consulta)); }) : catalogo(consulta) });
  await flujo.iniciar(); flujo.elegir('servicioId', 1); const continuar = flujo.continuar();
  assert.match(renderSeleccion(flujo.obtenerEstado()), /portal-esqueleto/);
  await flujo.volver(); fin(); await continuar;
  assert.equal(flujo.obtenerEstado().paso, 0); assert.equal(flujo.obtenerEstado().seleccion.sucursalId, null);
});

test('portal: paginación de seis, búsqueda normalizada y filtros sin alterar colección', () => {
  const filas = Array.from({ length: 13 }, (_, indice) => ({ ...servicio, id: indice + 1, nombre: `Revisión ${indice}`, duracionMinutos: indice < 6 ? 20 : 90 }));
  const anterior = structuredClone(filas);
  for (const total of [0, 1, 6, 7, 13]) {
    const resultado = paginarOpciones(filas.slice(0, total), 0);
    assert.equal(resultado.filas.length, Math.min(total, 6));
    assert.equal(renderPaginacionOpciones(resultado).includes('<nav'), total > 6);
  }
  assert.equal(paginarOpciones(filas, 0, { busqueda: 'revision', filtro: 'corta', pagina: 8 }).pagina, 1);
  assert.equal(paginarOpciones(filas, 0, { busqueda: 'revision', filtro: 'corta', pagina: 1 }).total, 6);
  assert.equal(paginarOpciones(filas, 0, { ...crearFiltrosIniciales(), pagina: 3 }).filas.length, 1);
  assert.equal(paginarOpciones(filas.slice(0, 12), 0, { ...crearFiltrosIniciales(), pagina: 3 }).pagina, 2);
  assert.equal(paginarOpciones([profesional], 2, { busqueda: 'MEDICINA', filtro: 'Medicina', pagina: 1 }).total, 1);
  assert.deepEqual(filas, anterior);
  assert.doesNotMatch(renderFiltrosOpciones(filas, 0), /data-portal-limpiar >/);
});

test('portal: filtros no consultan API ni disparan salto al dejar una opción', async () => {
  const { flow: flujo, calls: llamadas } = prepararPrueba({ sucursales: 7 }); await flujo.iniciar(); flujo.elegir('servicioId', 1); await flujo.continuar();
  const cantidad = llamadas.length;
  flujo.actualizarFiltros('pagina', 2); assert.equal(flujo.obtenerEstado().filtros[1].pagina, 2);
  flujo.elegir('sucursalId', 8);
  flujo.actualizarFiltros('busqueda', 'no existe'); assert.equal(flujo.obtenerEstado().filtros[1].pagina, 1);
  assert.equal(flujo.obtenerEstado().seleccion.sucursalId, 8); assert.match(renderSeleccion(flujo.obtenerEstado()), /No encontramos coincidencias/);
  flujo.actualizarFiltros('limpiar'); assert.equal(flujo.obtenerEstado().paso, 1); assert.equal(llamadas.length, cantidad);
});

test('portal: día vacío tiene texto común, siguiente día solo si conocido y fallo nunca parece vacío', async () => {
  for (const horarios of [[], [{ inicioUtc: '2026-11-08T17:00:00Z', finUtc: '2026-11-08T17:30:00Z' }]]) {
    const { flow: flujo } = prepararPrueba({ horarios }); await flujo.iniciar(); flujo.elegir('servicioId', 1); await flujo.continuar();
    const html = renderSeleccion({ ...flujo.obtenerEstado(), reservaDisponible: true });
    assert.match(html, /No hay horarios disponibles para esta fecha/);
    assert.equal(html.includes('Ver siguiente día disponible'), Boolean(horarios.length));
    assert.match(html, /data-seleccion-continuar disabled/);
    const error = renderSeleccion({ ...flujo.obtenerEstado(), consulta: { estado: 'error', mensaje: 'No pudimos consultar los horarios.' } });
    assert.doesNotMatch(error, /No hay horarios disponibles para esta fecha/); assert.match(error, /Reintentar consulta/);
  }
});

test('portal: partes del día separan al mediodía y skeleton no crea opciones interactivas', () => {
  const horarios = [{ horaInicio: '11:55' }, { horaInicio: '12:00' }];
  assert.equal(horariosDelPeriodo(horarios, 'manana').length, 1); assert.equal(horariosDelPeriodo(horarios, 'tarde')[0].horaInicio, '12:00');
  const html = renderSeleccion({ paso: 0, seleccion: {}, opciones: { servicios: [servicio] }, consulta: { estado: 'cargando', mensaje: 'Consultando opciones disponibles…' } });
  assert.match(html, /aria-busy="true"/); assert.match(html, /portal-esqueleto[^>]*aria-hidden="true"/); assert.doesNotMatch(html, /data-seleccion="/);
});

test('portal: una etapa deja de omitirse si la oferta vigente ahora tiene varias opciones', async () => {
  let expandido = false;
  const { flow: flujo } = prepararPrueba({ handler: (ruta, consulta, catalogo) => {
    if (ruta === 'disponibilidad') return { ...consulta, modalidad: 'publica', zonaHoraria: sucursal.zonaHoraria, ranuras: [] };
    const datos = catalogo(consulta);
    if (expandido && consulta.servicioId) datos.sucursales.push({ ...sucursal, id: 9 });
    return datos;
  } });
  await flujo.iniciar(); flujo.elegir('servicioId', 1); await flujo.continuar();
  assert.equal(flujo.obtenerEstado().paso, 3); expandido = true;
  await flujo.volver(); await flujo.continuar();
  assert.equal(flujo.obtenerEstado().paso, 1); assert.deepEqual(flujo.obtenerEstado().pasosAutomaticos, []);
});

test('portal: una sola opción tras búsqueda sigue siendo una elección explícita', async () => {
  const { flow: flujo } = prepararPrueba({ sucursales: 7, handler: (_ruta, consulta, catalogo) => {
    const datos = catalogo(consulta); datos.sucursales.forEach((elemento) => { elemento.nombre = `Sucursal ${elemento.id}`; }); return datos;
  } }); await flujo.iniciar(); flujo.elegir('servicioId', 1); await flujo.continuar();
  flujo.actualizarFiltros('busqueda', 'Sucursal 8');
  assert.equal((renderSeleccion(flujo.obtenerEstado()).match(/data-seleccion="sucursalId"/g) || []).length, 1);
  const cantidad = flujo.obtenerEstado().opciones.sucursales.length;
  flujo.actualizarFiltros('pagina', 2);
  assert.equal(cantidad, 7); assert.equal(flujo.obtenerEstado().paso, 1); assert.equal(flujo.obtenerEstado().seleccion.sucursalId, null);
});
