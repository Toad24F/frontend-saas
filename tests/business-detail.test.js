import test from 'node:test';
import assert from 'node:assert/strict';
import { mailPage, mailResultsHtml, mailHistoryHtml } from '../src/connected/screens/negocio/mail-history.js';
import { quotaMeter } from '../src/connected/screens/negocio/quota-meter.js';
import { licenseStatusHtml } from '../src/connected/screens/negocio/license-presentation.js';

const rows = (count) => Array.from({ length: count }, (_, index) => ({ id: String(index + 1), tipo: index % 2 ? 'recuperacion' : 'activacion_admin', estado: index % 3 ? 'enviado' : 'fallido', intentos: 1, confirmadoEn: '2026-11-05T12:00:00Z', proximoIntentoEn: '2026-11-06T12:00:00Z' }));
test('historial: paginación solo después de diez resultados y límites de página', () => {
  for (const count of [0, 1, 10]) assert.doesNotMatch(mailResultsHtml(rows(count)), /aria-label="Paginación/);
  assert.match(mailResultsHtml(rows(11)), /aria-label="Paginación/);
  const last = mailPage(rows(21), { page: 99 });
  assert.equal(last.page, 3); assert.deepEqual(last.rows.map((item) => item.id), ['1']);
  assert.equal(mailPage(rows(11), { page: -1 }).page, 1);
});
test('historial: filtra antes de paginar, combina filtros y conserva entrada', () => {
  const input = rows(31), before = structuredClone(input);
  const result = mailPage(input, { status: 'fallido', type: 'activacion_admin' });
  assert.equal(result.total, 6);
  assert.deepEqual(result.rows.map((item) => item.id), ['31', '25', '19', '13', '7', '1']);
  assert.deepEqual(input, before);
  assert.doesNotMatch(mailResultsHtml(input, { status: 'fallido', type: 'activacion_admin' }), /aria-label="Paginación/);
  assert.match(mailResultsHtml(input, { status: 'descartado' }), /No hay correos con estos filtros|Limpiar filtros/);
});
test('historial: orden preciso para identificadores grandes', () => {
  assert.equal(mailPage([{ id: '9007199254740992' }, { id: '9007199254740993' }]).rows[0].id, '9007199254740993');
});
test('seguimiento respeta estado, fechas y elegibilidad visible del reintento', () => {
  for (const estado of ['pendiente', 'tomado', 'enviado', 'descartado', 'fallido']) {
    const html = mailResultsHtml([{ ...rows(1)[0], estado, ultimoError: '<script>error</script>' }]);
    assert.equal(html.includes('data-retry-delivery='), estado === 'fallido');
    assert.equal(html.includes('Procesamiento previsto'), ['fallido', 'pendiente'].includes(estado));
    assert.doesNotMatch(html, /<script>|Confirmación \/ próximo intento|<th[^>]*>Acción/);
  }
  assert.match(mailResultsHtml([{ ...rows(1)[0], estado: 'enviado', confirmadoEn: null }]), /Fecha de envío no disponible/);
  assert.match(mailHistoryHtml(rows(1)), /Invitación de administrador|no confirma recepción ni lectura/);
});
test('indicadores: vacío, advertencia, lleno y consumo superior al límite', () => {
  assert.match(quotaMeter('Usuarios', 0, 5, 5), /0 de 5|5 disponibles/);
  assert.match(quotaMeter('Usuarios', 4, 5, 1), /quota-meter-warning/);
  assert.match(quotaMeter('Usuarios', 5, 5, 0), /quota-meter-full.*Sin cupo disponible/);
  assert.match(quotaMeter('Usuarios', 6, 5, 0), /value="5".*120% utilizado/);
});

test('licencia: porcentaje real de varios años y sin mensajes duplicados en vigente', () => {
  const html = licenseStatusHtml({ estado: 'vigente', condicionAcceso: true, duracionTotalMs: 1000 * 86400000, tiempoRestante: { dias: 500, horas: 0, minutos: 0 } });
  assert.match(html, /value="50"/);
  assert.match(html, /500 días restantes/);
  assert.doesNotMatch(html, /information-note|Bloqueo programado|La licencia permite el acceso/);
  assert.doesNotMatch(licenseStatusHtml({ estado: 'vigente', tiempoRestante: { dias: 3, horas: 0, minutos: 0 } }), /<progress/);
});

test('licencia: congelación, vencimiento, advertencia y suspensión pendiente', () => {
  const data = { duracionTotalMs: 100 * 86400000, tiempoRestante: { dias: 20, horas: 0, minutos: 0 } };
  const frozen = licenseStatusHtml({ ...data, estado: 'suspendida', tiempoCongelado: true, condicionAcceso: false });
  assert.match(frozen, /20 días conservados|Tiempo conservado/);
  assert.doesNotMatch(frozen, /20 días restantes|time-warning/);
  assert.match(frozen, /Reactivar licencia/);
  const expired = licenseStatusHtml({ ...data, estado: 'vencida', tiempoRestante: { dias: 0, horas: 0, minutos: 0 } });
  assert.match(expired, /time-expired/); assert.match(expired, /value="0"/);
  assert.match(licenseStatusHtml({ ...data, estado: 'vigente' }), /time-warning/);
  assert.match(licenseStatusHtml({ ...data, estado: 'suspension_pendiente', bloqueoProgramadoEn: '2026-11-07T12:00:00Z' }), /Bloqueo programado/);
  assert.doesNotMatch(licenseStatusHtml({ estado: 'pendiente' }), /<progress|data-business-action="renew"/);
});
