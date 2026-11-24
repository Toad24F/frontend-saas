import test from 'node:test';
import assert from 'node:assert/strict';
import { leerResultadoReserva } from '../src/connected/portal-publico/reserva.envio.js';
import { renderReserva } from '../src/connected/portal-publico/reserva.vista.js';

const resultado = { estado: 'pendiente', nombreNegocio: 'Clínica', nombreServicio: 'Consulta',
  nombreSucursal: 'Centro', nombreProfesional: 'Ana', inicioUtc: '2026-11-24T18:00:00Z',
  finUtc: '2026-11-24T18:30:00Z', zonaHoraria: 'America/Chihuahua' };

// Un alta y una recuperación pública comparten el resumen sin identificador visible.
test('T124: el portal acepta y presenta una reserva sin folio', () => {
  const validado = leerResultadoReserva(resultado);
  assert.equal(Object.hasOwn(validado, 'folio'), false);
  const html = renderReserva({ fase: 'resultado', resultado: validado });
  assert.match(html, /Reserva registrada/);
  assert.match(html, /Clínica/);
  assert.doesNotMatch(html, /folio/i);
});
