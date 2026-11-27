import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSeleccionPortal, FASES_PORTAL } from '../src/connected/portal-publico/seleccion.flujo.js';
import { fechaLocal, horaLocal, fechaValida } from '../src/connected/portal-publico/portal.fechas.js';
import { renderSeleccion } from '../src/connected/portal-publico/seleccion.vista.js';
import { renderReserva } from '../src/connected/portal-publico/reserva.vista.js';

// Dobles del contrato público real: nunca se consulta el panel ni una base de datos.
const slug = 'centro';

// Estos dobles ignoran AbortSignal a propósito: la revisión debe descartar
// respuestas tardías incluso si el transporte no coopera con la cancelación.
test('T116: éxito y fallo antiguos no pisan la disponibilidad más reciente', async () => {
  for (const fallos of [false, true]) {
    let fin;
    let consultasHorarios = 0;
    const { controller: controlador } = prepararPrueba((ruta, { consulta }) => {
      if (ruta === 'catalogo') return catalogo(consulta);
      if (++consultasHorarios === 2) return new Promise((resolver, rechazar) => {
        fin = () => fallos ? rechazar(Error('respuesta vieja')) : resolver(disponibilidad(consulta));
      });
      return disponibilidad(consulta, [{ inicioUtc: '2026-10-22T17:00:00.000Z', finUtc: '2026-10-22T17:30:00.000Z' }]);
    });
    await convertirFecha(controlador);
    const pendiente = controlador.seleccionarFecha('2026-10-21');
    await controlador.seleccionarFecha('2026-10-22');
    controlador.elegirHorario('2026-10-22T17:00:00.000Z');
    const actual = controlador.obtenerEstado();
    fin(); await pendiente;
    assert.deepEqual(controlador.obtenerEstado(), actual);
  }
});

test('T116: cambiar cada dependencia limpia fecha y ranuras; la copia impide modificar el estado', async () => {
  for (const [clave, id, regresos] of [['servicioId', 4, 3], ['sucursalId', 5, 2], ['personalId', 6, 1]]) {
    const { controller: controlador } = prepararPrueba((ruta, { consulta }) => ruta === 'disponibilidad' ? disponibilidad(consulta) : ({ ...catalogo(consulta),
      sucursales: consulta.servicioId ? [sucursal, { ...sucursal, id: 5 }] : [],
      profesionales: consulta.sucursalId ? [profesional, { ...profesional, id: 6 }] : [],
    }));
    await convertirFecha(controlador); await controlador.seleccionarFecha('2026-10-20'); controlador.elegirHorario('2026-10-20T17:00:00.000Z');
    for (let indice = 0; indice < regresos; indice++) await controlador.volver();
    controlador.elegir(clave, id);
    const estado = controlador.obtenerEstado();
    assert.equal(estado.seleccion[clave], id); assert.equal(estado.seleccion.fecha, '');
    assert.equal(estado.seleccion.horario, null); assert.deepEqual(estado.horarios, []);
    if (clave === 'servicioId') assert.equal(estado.seleccion.sucursalId, null);
    if (clave !== 'personalId') assert.equal(estado.seleccion.personalId, null);
    estado.seleccion[clave] = 999;
    assert.equal(controlador.obtenerEstado().seleccion[clave], id);
  }
});
const servicio = { id: 1, nombre: 'Consulta', costo: '450.00', duracionMinutos: 30 };
const sucursal = { id: 2, nombre: 'Centro', direccion: 'Calle 1', zonaHoraria: 'America/Mazatlan' };
const profesional = { id: 3, nombre: 'Ana' };
const catalogo = (consulta = {}) => ({ negocio: { slug, nombre: 'Centro' },
  servicios: [servicio, { ...servicio, id: 4, nombre: 'Seguimiento' }],
  sucursales: consulta.servicioId ? [sucursal, { ...sucursal, id: 5 }] : [], profesionales: consulta.sucursalId ? [profesional, { ...profesional, id: 6 }] : [] });
const disponibilidad = (consulta, ranuras = [{ inicioUtc: '2026-10-20T17:00:00.000Z', finUtc: '2026-10-20T17:30:00.000Z' }]) => ({
  ...consulta, modalidad: 'publica', zonaHoraria: sucursal.zonaHoraria, calculadoEn: '2026-10-20T14:00:00Z', ranuras, omisiones: [],
});
function prepararPrueba(handler) {
  const llamadas = [];
  const client = { async solicitar(ruta, opciones) {
    llamadas.push({ path: ruta, ...opciones });
    return handler ? handler(ruta, opciones) : ruta === 'catalogo' ? catalogo(opciones.consulta) : disponibilidad(opciones.consulta);
  } };
  const controlador = crearSeleccionPortal(client, { slug, ahora: () => new Date('2026-10-20T01:00:00Z') });
  return { controller: controlador, calls: llamadas };
}
async function convertirFecha(controlador) {
  await controlador.iniciar(); controlador.elegir('servicioId', 1); await controlador.continuar();
  controlador.elegir('sucursalId', 2); await controlador.continuar(); controlador.elegir('personalId', 3); await controlador.continuar();
}

test('el portal presenta campos públicos opcionales sin convertirlos en reservas', async () => {
  const { controller: controlador } = prepararPrueba((_ruta, { consulta }) => ({ ...catalogo(consulta),
    negocio: { slug, nombre: 'Centro', categoria: 'Salud' },
    servicios: [{ ...servicio, descripcion: '<consulta>' }],
    sucursales: consulta.servicioId ? [{ ...sucursal, telefono: '6140000000', indicaciones: 'Entrada norte' }, { ...sucursal, id: 5 }] : [],
    profesionales: consulta.sucursalId ? [{ ...profesional, especialidad: 'Medicina' }, { ...profesional, id: 6 }] : [],
  }));
  await controlador.iniciar();
  assert.equal(controlador.obtenerEstado().negocio.categoria, 'Salud');
  const primera = renderReserva(controlador.obtenerEstado());
  assert.match(primera, /portal-reserva-columnas/);
  assert.match(primera, /&lt;consulta&gt;/);
  assert.doesNotMatch(primera, /<consulta>/);
  controlador.elegir('servicioId', 1); await controlador.continuar();
  assert.match(renderReserva(controlador.obtenerEstado()), /Entrada norte/);
  assert.match(renderReserva(controlador.obtenerEstado()), /6140000000/);
  controlador.elegir('sucursalId', 2); await controlador.continuar();
  assert.match(renderReserva(controlador.obtenerEstado()), /Medicina/);
});

test('T101: define fases separadas y bloquea avances sin selección válida', async () => {
  const { controller: controlador } = prepararPrueba();
  assert.deepEqual(FASES_PORTAL, ['seleccion', 'apartado', 'formulario', 'enviando', 'incierto', 'resultado']);
  await controlador.iniciar();
  assert.equal(controlador.obtenerEstado().fase, 'seleccion');
  await controlador.continuar();
  assert.equal(controlador.obtenerEstado().paso, 0);
  assert.throws(() => controlador.elegir('servicioId', 999), /selección/i);
  assert.throws(() => controlador.elegir('personalId', 3), /selección/i);
});

test('T102: pasos consultan únicamente opciones públicas compatibles y permiten volver', async () => {
  const { controller: controlador, calls: llamadas } = prepararPrueba();
  await convertirFecha(controlador);
  assert.deepEqual(llamadas.slice(0, 3).map((llamada) => llamada.consulta), [{}, { servicioId: 1 }, { servicioId: 1, sucursalId: 2 }]);
  assert.equal(llamadas[3].path, 'disponibilidad');
  assert.equal(llamadas[3].consulta.desde, '2026-10-19'); // La fecha local de la sucursal puede diferir de UTC.
  assert.equal(llamadas[3].consulta.hasta, '2026-10-31');
  await controlador.volver();
  assert.equal(controlador.obtenerEstado().paso, 2);
  assert.equal(controlador.obtenerEstado().seleccion.personalId, 3);
});

test('T101: cambiar servicio invalida sucursal, profesional, fecha y horario', async () => {
  const { controller: controlador } = prepararPrueba();
  await convertirFecha(controlador);
  await controlador.seleccionarFecha('2026-10-20');
  controlador.elegirHorario('2026-10-20T17:00:00.000Z');
  await controlador.volver(); await controlador.volver(); await controlador.volver();
  controlador.elegir('servicioId', 4);
  const estado = controlador.obtenerEstado();
  assert.deepEqual(estado.seleccion, { servicioId: 4, sucursalId: null, personalId: null, fecha: '', horario: null });
  assert.equal(estado.horarios.length, 0);
  assert.equal(estado.apartado, null);
  assert.equal(estado.resultado, null);
});

test('T101: una respuesta antigua de catálogo no sobrescribe el paso vigente', async () => {
  let fin;
  const { controller: controlador } = prepararPrueba((ruta, { consulta }) => consulta.servicioId === 1
    ? new Promise((resolver) => { fin = () => resolver(catalogo(consulta)); }) : catalogo(consulta));
  await controlador.iniciar(); controlador.elegir('servicioId', 1);
  const pendiente = controlador.continuar();
  await controlador.volver(); controlador.elegir('servicioId', 4);
  fin(); await pendiente;
  assert.equal(controlador.obtenerEstado().paso, 0);
  assert.equal(controlador.obtenerEstado().seleccion.servicioId, 4);
  assert.deepEqual(controlador.obtenerEstado().opciones.sucursales, []);
});

test('T103: fecha real y consulta del mes seleccionado', async () => {
  const { controller: controlador, calls: llamadas } = prepararPrueba(); await convertirFecha(controlador);
  await controlador.seleccionarFecha('2026-10-20');
  assert.deepEqual(llamadas.at(-1).consulta, { servicioId: 1, sucursalId: 2, personalId: 3, desde: '2026-10-19', hasta: '2026-10-31' });
  const cantidad = llamadas.length;
  for (const fecha of ['', '2026-02-30', '20/10/2026']) {
    await controlador.seleccionarFecha(fecha);
    assert.equal(controlador.obtenerEstado().consulta.estado, 'invalida');
  }
  assert.equal(llamadas.length, cantidad);
  assert.equal(fechaValida('2028-02-29'), true);
  assert.equal(fechaValida('2026-02-29'), false);
});

test('el calendario mensual muestra los días disponibles sin una tira duplicada', async () => {
  const dias = ['2026-10-20', '2026-10-22', '2026-10-25', '2026-10-28', '2026-10-29',
    '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-22'];
  const { controller: controlador, calls: llamadas } = prepararPrueba((ruta, { consulta }) => ruta === 'catalogo' ? catalogo(consulta) : disponibilidad(consulta,
    dias.filter((dia) => dia >= consulta.desde && dia <= consulta.hasta)
      .map((dia) => ({ inicioUtc: `${dia}T17:00:00.000Z`, finUtc: `${dia}T17:30:00.000Z` }))));
  await convertirFecha(controlador);
  let html = renderSeleccion(controlador.obtenerEstado());
  assert.match(html, /data-seleccion-fecha="2026-10-20"/);
  assert.doesNotMatch(html, /data-seleccion-fecha="2026-11-02"/);
  assert.doesNotMatch(html, /data-seleccion-fecha="2026-10-21"/);
  assert.doesNotMatch(html, /portal-cinta-fechas|portal-boton-fecha/);
  const calendario = html.match(/<div class="portal-calendario-cuadricula"[\s\S]*?<\/div>/)?.[0];
  assert.ok(calendario);
  await controlador.seleccionarFecha('2026-10-22');
  html = renderSeleccion(controlador.obtenerEstado());
  const calendarioActualizado = html.match(/<div class="portal-calendario-cuadricula"[\s\S]*?<\/div>/)?.[0];
  const visibles = [...calendarioActualizado.matchAll(/class="portal-calendario-dia[^"]*" type="button" data-seleccion-fecha="([^"]+)"/g)].map((coincidencia) => coincidencia[1]);
  assert.deepEqual(visibles, ['2026-10-20', '2026-10-22', '2026-10-25', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
  await controlador.seleccionarFecha('2026-11-21');
  assert.equal(controlador.obtenerEstado().consulta.estado, 'vacia');
  assert.deepEqual(controlador.obtenerEstado().fechasDisponibles, ['2026-11-01', '2026-11-02', '2026-11-22']);
  assert.equal(llamadas.at(-1).consulta.hasta, '2026-11-30');
});

test('el calendario conserva el mes al seleccionar y solo cambia al usar las flechas', async () => {
  const fechas = ['2026-10-20', '2026-10-22', '2026-10-31', '2026-11-02', '2026-11-30'];
  const { controller: controlador, calls: llamadas } = prepararPrueba((ruta, { consulta }) => ruta === 'catalogo' ? catalogo(consulta) : disponibilidad(consulta,
    fechas.filter((fecha) => fecha >= consulta.desde && fecha <= consulta.hasta)
      .map((fecha) => ({ inicioUtc: `${fecha}T17:00:00.000Z`, finUtc: `${fecha}T17:30:00.000Z` }))));
  await convertirFecha(controlador);
  let html = renderSeleccion(controlador.obtenerEstado());
  assert.match(html, /class="portal-calendario-dia [^"]*" type="button" disabled aria-label="miércoles, 21[^\"]*no disponible"/);
  assert.match(html, /class="portal-calendario-dia [^"]*" type="button" data-seleccion-fecha="2026-10-22"/);
  assert.match(html, /class="portal-calendario-dia [^"]*" type="button" data-seleccion-fecha="2026-10-31"/);
  assert.doesNotMatch(html, /data-seleccion-fecha="2026-11-01"/);
  assert.match(html, /<strong>octubre de 2026<\/strong>/);
  assert.equal(controlador.obtenerEstado().rangoFechas.desde, '2026-10-19');
  assert.equal(controlador.obtenerEstado().rangoFechas.hasta, '2026-10-31');
  await controlador.seleccionarFecha('2026-10-22');
  assert.equal(llamadas.at(-1).consulta.desde, '2026-10-19');
  assert.equal(llamadas.at(-1).consulta.hasta, '2026-10-31');
  assert.equal(controlador.obtenerEstado().rangoFechas.desde, '2026-10-19');
  assert.match(renderSeleccion(controlador.obtenerEstado()), /<strong>octubre de 2026<\/strong>/);

  await controlador.desplazarRangoFechas(1);
  assert.equal(llamadas.at(-1).consulta.desde, '2026-11-01');
  assert.equal(llamadas.at(-1).consulta.hasta, '2026-11-30');
  html = renderSeleccion(controlador.obtenerEstado());
  assert.match(html, /<strong>noviembre de 2026<\/strong>/);
  assert.match(html, /data-seleccion-fecha="2026-11-30"/);
  assert.doesNotMatch(html, /data-seleccion-fecha="2026-10-31"/);

  await controlador.desplazarRangoFechas(-1);
  assert.equal(llamadas.at(-1).consulta.desde, '2026-10-19');
  assert.equal(llamadas.at(-1).consulta.hasta, '2026-10-31');
  assert.match(renderSeleccion(controlador.obtenerEstado()), /<strong>octubre de 2026<\/strong>/);
});

test('al consultar otra fecha el calendario sigue visible y el horario se presenta sin radio visible ni aviso duplicado', async () => {
  let resolverHorarios;
  let consultasHorarios = 0;
  const { controller: controlador } = prepararPrueba((ruta, { consulta }) => {
    if (ruta === 'catalogo') return catalogo(consulta);
    if (++consultasHorarios === 2) return new Promise((resolver) => { resolverHorarios = () => resolver(disponibilidad(consulta, [
      { inicioUtc: '2026-10-22T17:00:00.000Z', finUtc: '2026-10-22T17:30:00.000Z' },
    ])); });
    return disponibilidad(consulta, [
      { inicioUtc: '2026-10-20T17:00:00.000Z', finUtc: '2026-10-20T17:30:00.000Z' },
      { inicioUtc: '2026-10-22T17:00:00.000Z', finUtc: '2026-10-22T17:30:00.000Z' },
    ]);
  });
  await convertirFecha(controlador);
  const pendiente = controlador.seleccionarFecha('2026-10-22');
  assert.equal(controlador.obtenerEstado().consulta.estado, 'cargando');
  assert.deepEqual(controlador.obtenerEstado().fechasDisponibles, ['2026-10-20', '2026-10-22']);
  const htmlPendiente = renderSeleccion(controlador.obtenerEstado());
  assert.match(htmlPendiente, /class="portal-calendario"/);
  assert.match(htmlPendiente, /class="portal-calendario-dia seleccionado" type="button" disabled aria-label="jueves, 22 de octubre de 2026, no disponible"/);
  assert.doesNotMatch(htmlPendiente, /portal-cinta-fechas/);
  resolverHorarios(); await pendiente;
  controlador.elegirHorario('2026-10-22T17:00:00.000Z');
  const html = renderSeleccion(controlador.obtenerEstado());
  assert.match(html, /Horarios disponibles para jueves, 22 de octubre de 2026/);
  assert.match(html, /Horario seleccionado: 10:00 · America\/Mazatlan/);
  assert.doesNotMatch(html, /Aún no está apartado/);
});

test('T103: solo horarios devueltos, en zona de sucursal, sin conceder apartado', async () => {
  const { controller: controlador, calls: llamadas } = prepararPrueba(); await convertirFecha(controlador); await controlador.seleccionarFecha('2026-10-20');
  assert.equal(controlador.obtenerEstado().horarios[0].horaInicio, '10:00');
  controlador.elegirHorario('2026-10-20T17:00:00.000Z');
  assert.equal(controlador.obtenerEstado().seleccion.horario.horaInicio, '10:00');
  assert.throws(() => controlador.elegirHorario('2026-10-20T18:00:00Z'), /horario/i);
  await controlador.continuar();
  assert.equal(controlador.obtenerEstado().paso, 3);
  assert.equal(controlador.obtenerEstado().fase, 'seleccion');
  assert.ok(llamadas.every((llamada) => llamada.path === 'catalogo' || llamada.path === 'disponibilidad'));
});

test('T103: vacío, selección inválida y fallo técnico tienen estados diferentes y reintento', async () => {
  let modo = 'vacia';
  const { controller: controlador } = prepararPrueba((ruta, { consulta }) => {
    if (ruta === 'catalogo') return catalogo(consulta);
    if (modo === 'error') throw Object.assign(new Error('Temporalmente no disponible'), { status: 503 });
    if (modo === 'invalida') throw Object.assign(new Error('Selección no disponible'), { status: 404 });
    return disponibilidad(consulta, []);
  });
  await convertirFecha(controlador); assert.equal(controlador.obtenerEstado().consulta.estado, 'vacia');
  modo = 'invalida'; await controlador.reintentar(); assert.equal(controlador.obtenerEstado().consulta.estado, 'invalida');
  modo = 'error'; await controlador.reintentar(); assert.equal(controlador.obtenerEstado().consulta.estado, 'error');
  modo = 'vacia'; await controlador.reintentar(); assert.equal(controlador.obtenerEstado().consulta.estado, 'vacia');
});

test('T101–T103: respuestas de disponibilidad desordenadas y errores antiguos se descartan', async () => {
  let fin;
  let consultasHorarios = 0;
  const { controller: controlador } = prepararPrueba((ruta, { consulta }) => {
    if (ruta === 'catalogo') return catalogo(consulta);
    if (++consultasHorarios === 2) return new Promise((_resolver, rechazar) => { fin = () => rechazar(Error('viejo')); });
    return disponibilidad(consulta, []);
  });
  await convertirFecha(controlador);
  const pendiente = controlador.seleccionarFecha('2026-10-21');
  await controlador.seleccionarFecha('2026-10-22');
  fin(); await pendiente;
  assert.equal(controlador.obtenerEstado().seleccion.fecha, '2026-10-22');
  assert.equal(controlador.obtenerEstado().consulta.estado, 'vacia');
});

test('T103: respuesta malformada o de otra selección es error, nunca agenda vacía', async () => {
  let resultado;
  const { controller: controlador } = prepararPrueba((ruta, { consulta }) => ruta === 'catalogo' ? catalogo(consulta) : resultado ?? disponibilidad(consulta, []));
  await convertirFecha(controlador);
  for (const datos of [{}, { ...disponibilidad({}), ranuras: null }, disponibilidad({ servicioId: 999 }),
    disponibilidad({ servicioId: 1, sucursalId: 2, personalId: 3, desde: '2026-10-20', hasta: '2026-10-20' }, [{ inicioUtc: 'incorrecto', finUtc: 'incorrecto' }])]) {
    resultado = datos; await controlador.seleccionarFecha('2026-10-20');
    assert.equal(controlador.obtenerEstado().consulta.estado, 'error');
    assert.deepEqual(controlador.obtenerEstado().horarios, []);
  }
});

test('T102: al refrescar oferta desaparecida se invalida la selección anterior', async () => {
  let faltante = false;
  const { controller: controlador } = prepararPrueba((_ruta, { consulta }) => ({ ...catalogo(consulta), servicios: faltante ? [] : catalogo(consulta).servicios }));
  await controlador.iniciar(); controlador.elegir('servicioId', 1);
  faltante = true; await controlador.reintentar();
  assert.equal(controlador.obtenerEstado().seleccion.servicioId, null);
  assert.equal(controlador.obtenerEstado().consulta.estado, 'vacia');
});

test('T103: conversión local respeta fecha distinta de UTC y cambios de horario IANA', () => {
  assert.equal(fechaLocal('2026-10-20T01:00:00Z', 'America/Mazatlan'), '2026-10-19');
  assert.equal(horaLocal('2026-07-01T15:00:00Z', 'America/New_York'), '11:00');
  assert.equal(horaLocal('2026-12-01T15:00:00Z', 'America/New_York'), '10:00');
});

test('T102–T103: HTML etiquetado, opciones escapadas y horario sin promesa de reserva', async () => {
  const { controller: controlador } = prepararPrueba((_ruta, { consulta }) => ({ ...catalogo(consulta), servicios: [{ ...servicio, nombre: '<script>alert(1)</script>' }] }));
  await controlador.iniciar();
  const html = renderSeleccion(controlador.obtenerEstado());
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<fieldset/); assert.match(html, /<legend/); assert.match(html, /type="radio"/);
  assert.match(html, /aria-current="step"/); assert.match(html, /id="portal-titulo-paso"[^>]*tabindex="-1"/);
});

test('T101: cambiar sucursal y profesional invalida solo las selecciones posteriores', async () => {
  const { controller: controlador } = prepararPrueba((_ruta, { consulta }) => ({ ...catalogo(consulta),
    sucursales: consulta.servicioId ? [sucursal, { ...sucursal, id: 5, nombre: 'Norte' }] : [],
    profesionales: consulta.sucursalId ? [profesional, { id: 6, nombre: 'Luis' }] : [],
  }));
  await controlador.iniciar(); controlador.elegir('servicioId', 1); await controlador.continuar();
  controlador.elegir('sucursalId', 2); await controlador.continuar(); controlador.elegir('personalId', 3);
  controlador.elegir('personalId', 6);
  assert.equal(controlador.obtenerEstado().seleccion.servicioId, 1);
  assert.equal(controlador.obtenerEstado().seleccion.sucursalId, 2);
  assert.equal(controlador.obtenerEstado().seleccion.fecha, '');
  await controlador.volver(); controlador.elegir('sucursalId', 5);
  assert.equal(controlador.obtenerEstado().seleccion.personalId, null);
  assert.equal(controlador.obtenerEstado().seleccion.servicioId, 1);
});

test('T101: una disponibilidad tardía no reaparece después de volver', async () => {
  let fin;
  let consultasHorarios = 0;
  const { controller: controlador } = prepararPrueba((ruta, { consulta }) => ruta === 'catalogo' ? catalogo(consulta)
    : ++consultasHorarios === 2 ? new Promise((resolver) => { fin = () => resolver(disponibilidad(consulta, [])); }) : disponibilidad(consulta, []));
  await convertirFecha(controlador);
  const pendiente = controlador.seleccionarFecha('2026-10-21');
  await controlador.volver(); fin(); await pendiente;
  assert.equal(controlador.obtenerEstado().paso, 2);
  assert.equal(controlador.obtenerEstado().consulta.estado, 'lista');
  assert.deepEqual(controlador.obtenerEstado().horarios, []);
});

test('T102: un catálogo fallido no presenta las opciones anteriores como resultado', async () => {
  let rechazarPromesa = false;
  const { controller: controlador } = prepararPrueba((_ruta, { consulta }) => { if (rechazarPromesa) throw Error('Error interno'); return catalogo(consulta); });
  await controlador.iniciar(); rechazarPromesa = true; await controlador.reintentar();
  const html = renderSeleccion(controlador.obtenerEstado());
  assert.doesNotMatch(html, /<input type="radio"/);
  assert.match(html, /Reintentar consulta/);
  assert.doesNotMatch(html, /Error interno/);
});
