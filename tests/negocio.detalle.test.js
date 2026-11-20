import test from 'node:test';
import assert from 'node:assert/strict';
import { paginarCorreo, renderResultadosCorreo, renderHistorialCorreo } from '../src/connected/screens/negocio/correo.historial.js';
import { renderMedidorCupo } from '../src/connected/screens/negocio/cupo.medidor.js';
import { renderEstadoLicencia } from '../src/connected/screens/negocio/licencia.presentacion.js';

const filas = (cantidad) => Array.from({ length: cantidad }, (_, indice) => ({ id: String(indice + 1), tipo: indice % 2 ? 'recuperacion' : 'activacion_admin', estado: indice % 3 ? 'enviado' : 'fallido', intentos: 1, confirmadoEn: '2026-11-05T12:00:00Z', proximoIntentoEn: '2026-11-06T12:00:00Z' }));
test('historial: paginación solo después de diez resultados y límites de página', () => {
  for (const cantidad of [0, 1, 10]) assert.doesNotMatch(renderResultadosCorreo(filas(cantidad)), /aria-label="Paginación/);
  assert.match(renderResultadosCorreo(filas(11)), /aria-label="Paginación/);
  const ultimo = paginarCorreo(filas(21), { pagina: 99 });
  assert.equal(ultimo.pagina, 3); assert.deepEqual(ultimo.filas.map((elemento) => elemento.id), ['1']);
  assert.equal(paginarCorreo(filas(11), { pagina: -1 }).pagina, 1);
});
test('historial: filtra antes de paginar, combina filtros y conserva entrada', () => {
  const campo = filas(31), anterior = structuredClone(campo);
  const resultado = paginarCorreo(campo, { estado: 'fallido', tipo: 'activacion_admin' });
  assert.equal(resultado.total, 6);
  assert.deepEqual(resultado.filas.map((elemento) => elemento.id), ['31', '25', '19', '13', '7', '1']);
  assert.deepEqual(campo, anterior);
  assert.doesNotMatch(renderResultadosCorreo(campo, { estado: 'fallido', tipo: 'activacion_admin' }), /aria-label="Paginación/);
  assert.match(renderResultadosCorreo(campo, { estado: 'descartado' }), /No hay correos con estos filtros|Limpiar filtros/);
});
test('historial: orden preciso para identificadores grandes', () => {
  assert.equal(paginarCorreo([{ id: '9007199254740992' }, { id: '9007199254740993' }]).filas[0].id, '9007199254740993');
});
test('seguimiento respeta estado, fechas y elegibilidad visible del reintento', () => {
  for (const estado of ['pendiente', 'tomado', 'enviado', 'descartado', 'fallido']) {
    const html = renderResultadosCorreo([{ ...filas(1)[0], estado, ultimoError: '<script>error</script>' }]);
    assert.equal(html.includes('data-reintentar-envio='), estado === 'fallido');
    assert.equal(html.includes('Procesamiento previsto'), ['fallido', 'pendiente'].includes(estado));
    assert.doesNotMatch(html, /<script>|Confirmación \/ próximo intento|<th[^>]*>Acción/);
  }
  assert.match(renderResultadosCorreo([{ ...filas(1)[0], estado: 'enviado', confirmadoEn: null }]), /Fecha de envío no disponible/);
  assert.match(renderHistorialCorreo(filas(1)), /Invitación de administrador|no confirma recepción ni lectura/);
});
test('indicadores: vacío, advertencia, lleno y consumo superior al límite', () => {
  assert.match(renderMedidorCupo('Usuarios', 0, 5, 5), /0 de 5|5 disponibles/);
  assert.match(renderMedidorCupo('Usuarios', 4, 5, 1), /cupo-medidor-aviso/);
  assert.match(renderMedidorCupo('Usuarios', 5, 5, 0), /cupo-medidor-lleno.*Sin cupo disponible/);
  assert.match(renderMedidorCupo('Usuarios', 6, 5, 0), /value="5".*120% utilizado/);
});

test('licencia: porcentaje real de varios años y sin mensajes duplicados en vigente', () => {
  const html = renderEstadoLicencia({ estado: 'vigente', condicionAcceso: true, duracionTotalMs: 1000 * 86400000, tiempoRestante: { dias: 500, horas: 0, minutos: 0 } });
  assert.match(html, /value="50"/);
  assert.match(html, /500 días restantes/);
  assert.doesNotMatch(html, /nota-informativa|Bloqueo programado|La licencia permite el acceso/);
  assert.doesNotMatch(renderEstadoLicencia({ estado: 'vigente', tiempoRestante: { dias: 3, horas: 0, minutos: 0 } }), /<progress/);
});

test('licencia: congelación, vencimiento, advertencia y suspensión pendiente', () => {
  const datos = { duracionTotalMs: 100 * 86400000, tiempoRestante: { dias: 20, horas: 0, minutos: 0 } };
  const congelado = renderEstadoLicencia({ ...datos, estado: 'suspendida', tiempoCongelado: true, condicionAcceso: false });
  assert.match(congelado, /20 días conservados|Tiempo conservado/);
  assert.doesNotMatch(congelado, /20 días restantes|negocio-tiempo-licencia-aviso/);
  assert.match(congelado, /Reactivar licencia/);
  const vencida = renderEstadoLicencia({ ...datos, estado: 'vencida', tiempoRestante: { dias: 0, horas: 0, minutos: 0 } });
  assert.match(vencida, /negocio-tiempo-licencia-vencido/); assert.match(vencida, /value="0"/);
  assert.match(renderEstadoLicencia({ ...datos, estado: 'vigente' }), /negocio-tiempo-licencia-aviso/);
  assert.match(renderEstadoLicencia({ ...datos, estado: 'suspension_pendiente', bloqueoProgramadoEn: '2026-11-07T12:00:00Z' }), /Bloqueo programado/);
  assert.doesNotMatch(renderEstadoLicencia({ estado: 'pendiente' }), /<progress|data-accion-negocio="renovar"/);
});
