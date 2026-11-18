import test from 'node:test';
import assert from 'node:assert/strict';
import { guardarReglasAgenda } from '../src/connected/modules/disponibilidad/disponibilidad.configuracion.js';
import { validarConfiguracionConectada } from '../src/shared/screens/disponibilidad/disponibilidad.contrato-operativo.js';
import { crearPayloadHorario } from '../src/connected/modules/disponibilidad/disponibilidad.payload.js';
import { validarFranjasHorario } from '../src/shared/screens/disponibilidad/disponibilidad.errores.js';

const base = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 0, anticipacionMinutos: 15, diasFuturos: 60 };
const estadoInicial = { cargado: true, ocupado: false, datos: base, borrador: null, errores: {}, error: '' };

// T048: el PUT reemplaza todo el conjunto y no arrastra claves viejas o de UI.
test('T048: PUT exacto y separación cero, cinco o sesenta', async () => {
  for (const separacion of [0, 5, 60]) {
    const llamadas = [];
    const valores = { ...base, tiempoEntreCitasMinutos: separacion, intervaloMinutos: 15, negocioId: 9 };
    const solicitar = async (...argumentos) => { llamadas.push(argumentos); return { ...base, tiempoEntreCitasMinutos: separacion }; };
    const resultado = await guardarReglasAgenda(estadoInicial, valores, solicitar);
    assert.equal(resultado.guardado, true);
    assert.deepEqual(llamadas, [['/disponibilidad/configuracion', 'PUT', { ...base, tiempoEntreCitasMinutos: separacion }]]);
    assert.equal(resultado.estado.borrador, null);
  }
  for (const separacion of [-5, 7, 65]) assert.ok(validarConfiguracionConectada({ ...base, tiempoEntreCitasMinutos: separacion }).tiempoEntreCitasMinutos);
});

// T049: los fallos no confirman reemplazo y dejan todos los valores capturados.
test('T049: 400 señala campo y 503 conserva borrador y error general', async () => {
  const valores = { ...base, modo: 'agenda_compacta', tiempoEntreCitasMinutos: 5 };
  for (const [status, mensaje] of [[400, 'tiempoEntreCitasMinutos inválido'], [503, 'Servicio no disponible']]) {
    const solicitar = async () => { throw Object.assign(new Error(mensaje), { status }); };
    const resultado = await guardarReglasAgenda(estadoInicial, valores, solicitar);
    assert.equal(resultado.guardado, false);
    assert.deepEqual(resultado.estado.borrador, valores);
    assert.deepEqual(resultado.estado.datos, base);
    assert.match(resultado.estado.error || resultado.estado.errores.tiempoEntreCitasMinutos, /inválido|no disponible/);
  }
  const respuestaInvalida = await guardarReglasAgenda(estadoInicial, valores, async () => ({ ...base }));
  assert.equal(respuestaInvalida.guardado, false);
});

// T050: dos franjas expresan una pausa sin descanso incrustado en la API.
test('T050: semana envía dos franjas y ningún campo de descanso', () => {
  const filas = [
    { id: 1, day: 1, branchId: 3, start: '09:00', end: '12:00', breakStart: '', breakEnd: '', enabled: true },
    { id: -2, day: 1, branchId: 3, start: '13:00', end: '17:00', breakStart: '', breakEnd: '', enabled: true },
  ];
  assert.deepEqual(validarFranjasHorario(filas, [3], false), {});
  assert.deepEqual(crearPayloadHorario(filas), { franjas: [
    { id: 1, diaSemana: 1, orden: 0, sucursalId: 3, inicioMinutos: 540, finMinutos: 720, activo: true },
    { diaSemana: 1, orden: 1, sucursalId: 3, inicioMinutos: 780, finMinutos: 1020, activo: true },
  ] });
  assert.match(validarFranjasHorario([{ ...filas[0], breakStart: '10:00', breakEnd: '10:30' }], [3], false)['horario-1-descanso'], /dos franjas/);
});
