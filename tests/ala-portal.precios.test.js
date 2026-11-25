import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSeleccionPortal } from '../src/connected/portal-publico/seleccion.flujo.js';
import { renderSeleccion } from '../src/connected/portal-publico/seleccion.vista.js';
import { crearReservaPortal } from '../src/connected/portal-publico/reserva.flujo.js';
import { renderReserva } from '../src/connected/portal-publico/reserva.vista.js';
import { leerResultadoReserva } from '../src/connected/portal-publico/reserva.envio.js';
import { crearAlmacenamientoEnMemoria } from './datos-prueba/memoria.almacenamiento.js';

const slug = 'centro';
const iniciar = '2026-10-20T17:00:00.000Z';
const zona = 'America/Mazatlan';
const servicio = (costo) => ({ id: 1, nombre: 'Consulta', duracionMinutos: 30,
  ...(costo === undefined ? {} : { costo }) });
const catalogo = (consulta, costo) => ({ negocio: { slug, nombre: 'Centro' },
  servicios: [servicio(costo)],
  sucursales: consulta.servicioId ? [{ id: 2, nombre: 'Sucursal', direccion: 'Calle 1', zonaHoraria: zona }] : [],
  profesionales: consulta.sucursalId ? [{ id: 3, nombre: 'Ana' }] : [] });
const resultado = (costo) => ({ estado: 'pendiente',
  inicioUtc: iniciar, finUtc: '2026-10-20T17:30:00.000Z', zonaHoraria: zona,
  nombreNegocio: 'Centro histórico', nombreServicio: 'Consulta histórica',
  nombreSucursal: 'Sucursal histórica', nombreProfesional: 'Ana histórica',
  ...(costo === undefined ? {} : { costo }) });

// Los dobles reproducen la proyección HTTP: el importe puede existir o faltar,
// pero el navegador nunca recibe costoAceptado como campo público.
const mismoPrecio = Symbol('mismo precio');
const precioOculto = Symbol('precio oculto');
function reserva(precioCatalogo, precioApartado, precioPropio = mismoPrecio) {
  const precioVigente = precioPropio === mismoPrecio ? precioApartado : precioPropio === precioOculto ? undefined : precioPropio;
  const llamadas = [];
  const client = { async solicitar(ruta, opciones = {}) {
    llamadas.push(ruta);
    if (ruta === 'catalogo') return catalogo(opciones.consulta, precioCatalogo);
    if (ruta === 'disponibilidad') return { ...opciones.consulta, modalidad: 'publica', zonaHoraria: zona,
      ranuras: [{ inicioUtc: iniciar, finUtc: '2026-10-20T17:30:00.000Z' }] };
    if (ruta === 'apartados') return { estado: 'concedida', apartadoId: 8, generacion: '1',
      expiraEn: '2026-10-20T16:05:00.000Z', servidorAhora: '2026-10-20T16:00:00.000Z', zonaHoraria: zona,
      ...(precioApartado === undefined ? {} : { costo: precioApartado }) };
    return { apartadoId: 8, generacion: '1', estado: 'vigente',
      expiraEn: '2026-10-20T16:05:00.000Z', servidorAhora: '2026-10-20T16:00:00.000Z',
      ...(precioVigente === undefined ? {} : { costo: precioVigente }) };
  } };
  const flujo = crearReservaPortal(client, { slug, ahora: () => new Date('2026-10-20T16:00:00Z'),
    ahoraMonotono: () => 0, generarClaveOperacion: () => 'operation_test_000001', almacenamiento: crearAlmacenamientoEnMemoria() });
  return { flow: flujo, calls: llamadas };
}
async function irAlFormulario(flujo) {
  await flujo.iniciar(); flujo.elegir('servicioId', 1); await flujo.continuar();
  if (flujo.obtenerEstado().paso === 1) flujo.elegir('sucursalId', 2); await flujo.continuar(); if (flujo.obtenerEstado().paso === 2) flujo.elegir('personalId', 3);
  await flujo.continuar(); flujo.elegirHorario(iniciar); await flujo.apartarHorarioElegido();
}

test('FALA-T008–T009: catálogo sin precio es válido y selección no muestra importe inventado', async () => {
  const client = { solicitar: async (_ruta, { consulta }) => catalogo(consulta, undefined) };
  const flujo = crearSeleccionPortal(client, { slug });
  await flujo.iniciar();
  assert.equal(flujo.obtenerEstado().consulta.estado, 'lista');
  const html = renderSeleccion(flujo.obtenerEstado());
  assert.match(html, /30 min/);
  assert.doesNotMatch(html, /NaN|MXN|\$0/);
  const cero = crearSeleccionPortal({ solicitar: async (_ruta, { consulta }) => catalogo(consulta, '0.00') }, { slug });
  await cero.iniciar();
  assert.match(renderSeleccion(cero.obtenerEstado()), /\$0\.00/);
  // Un campo presente pero vacío no equivale a una omisión autorizada.
  for (const invalido of ['', null]) {
    const malformado = crearSeleccionPortal({ solicitar: async (_ruta, { consulta }) => catalogo(consulta, invalido) }, { slug });
    await malformado.iniciar();
    assert.equal(malformado.obtenerEstado().consulta.estado, 'error');
  }
});

test('FALA-T010: apartado oculto no reutiliza precio del catálogo y lectura propia retira precio previo', async () => {
  const oculto = reserva('900.00', undefined);
  await irAlFormulario(oculto.flow);
  assert.equal(oculto.flow.obtenerEstado().fase, 'formulario');
  assert.doesNotMatch(renderReserva(oculto.flow.obtenerEstado()), /900\.00|MXN|Costo|Pago directamente/);
  const cambiado = reserva('900.00', '450.00', precioOculto);
  await irAlFormulario(cambiado.flow);
  assert.doesNotMatch(renderReserva(cambiado.flow.obtenerEstado()), /450\.00|900\.00|MXN/);
});

test('FALA-T010: costo visible del apartado prevalece sobre cambio del catálogo', async () => {
  const { flow: flujo, calls: llamadas } = reserva('900.00', '450.00');
  await irAlFormulario(flujo);
  const html = renderReserva(flujo.obtenerEstado());
  assert.match(html, /450\.00/);
  assert.doesNotMatch(html, /900\.00/);
  assert.equal(llamadas.filter((ruta) => ruta === 'catalogo').length, 3);
});

test('FALA-T011–T012: resultado histórico visible u oculto nunca usa el catálogo actual', () => {
  const visible = leerResultadoReserva(resultado('450.00'));
  assert.equal(visible.costo, '450.00');
  const oculto = leerResultadoReserva(resultado());
  assert.equal(Object.hasOwn(oculto, 'costo'), false);
  const estado = { fase: 'resultado', seleccion: { servicioId: 1 },
    opciones: { servicios: [servicio('900.00')], sucursales: [], profesionales: [] }, resultado: oculto };
  const html = renderReserva(estado);
  assert.match(html, /Centro histórico|Consulta histórica/);
  assert.doesNotMatch(html, /900\.00|450\.00|MXN|Costo|Pago directamente/);
  assert.throws(() => leerResultadoReserva(resultado(null)));
});
