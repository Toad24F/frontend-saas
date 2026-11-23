import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSeguimientoCita } from '../src/connected/screens/agenda/agenda.seguimiento.js';

test('el seguimiento separa la política de los estados de entrega y escapa el motivo', () => {
  const html = renderSeguimientoCita({
    estado: 'seguimiento_manual', vencimientoUtc: '2026-11-23T18:00:00.000Z',
    motivoSeguimiento: '<img src=x onerror=alert(1)>',
    envios: [{ tipo: 'inicial_pendiente', estado: 'leido' }, { tipo: 'recordatorio', estado: 'fallido' }],
  }, 'America/Chihuahua');
  assert.match(html, /Seguimiento manual/);
  assert.match(html, /Mensaje inicial/);
  assert.match(html, /Leído/);
  assert.match(html, /Recordatorio/);
  assert.match(html, /Fallido/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|Plazo activo|Asistencia confirmada/);
});

test('muestra el plazo activo en la zona de la cita y omite un bloque inexistente', () => {
  const html = renderSeguimientoCita({
    estado: 'plazo_activo', vencimientoUtc: '2026-11-23T18:00:00.000Z', envios: [],
  }, 'America/Chihuahua');
  assert.match(html, /Plazo activo/);
  assert.match(html, /12:00/);
  assert.match(html, /America\/Chihuahua/);
  assert.equal(renderSeguimientoCita(null, 'America/Chihuahua'), '');
});
