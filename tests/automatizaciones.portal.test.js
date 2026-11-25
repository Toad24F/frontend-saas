import test from 'node:test';
import assert from 'node:assert/strict';
import { validarContacto } from '../src/connected/portal-publico/reserva.contacto.js';
import { leerResultadoReserva } from '../src/connected/portal-publico/reserva.envio.js';
import { renderReserva } from '../src/connected/portal-publico/reserva.vista.js';
import { seleccionManual } from '../src/connected/modules/agenda/agenda.contrato-manual.js';

const resultado = { estado: 'pendiente', inicioUtc: '2026-11-24T18:00:00.000Z',
  finUtc: '2026-11-24T18:30:00.000Z', zonaHoraria: 'America/Chihuahua',
  nombreNegocio: 'Uno', nombreServicio: 'Corte', nombreSucursal: 'Centro', nombreProfesional: 'Ana',
  vencimientoConfirmacionUtc: '2026-11-24T17:00:00.000Z', seguimientoManual: false };

test('el portal y alta manual solo envían autorización expresa', () => {
  assert.equal(validarContacto({ nombre: 'Ana', telefono: '6141234567' }).valor.autorizaWhatsapp, false);
  assert.equal(validarContacto({ nombre: 'Ana', telefono: '6141234567', autorizaWhatsapp: true }).valor.autorizaWhatsapp, true);
  const seleccion = { clienteId: 1, sucursalId: 2, personalId: 3, servicioId: 4,
    fechaLocal: '2026-11-24', horaInicio: '09:00' };
  assert.equal(seleccionManual(seleccion).autorizaWhatsapp, false);
  assert.equal(seleccionManual({ ...seleccion, autorizaWhatsapp: true }).autorizaWhatsapp, true);
});

test('el resultado conserva vencimiento UTC y muestra la hora en la zona de la cita', () => {
  assert.deepEqual(leerResultadoReserva(resultado).vencimientoConfirmacionUtc, resultado.vencimientoConfirmacionUtc);
  const html = renderReserva({ fase: 'resultado', resultado });
  assert.match(html, /Plazo de confirmación/);
  assert.match(html, /11:00/);
  assert.match(html, /America\/Chihuahua/);
});

test('seguimiento manual no inventa fecha de vencimiento', () => {
  const manual = { ...resultado, vencimientoConfirmacionUtc: null, seguimientoManual: true };
  const html = renderReserva({ fase: 'resultado', resultado: manual });
  assert.match(html, /Seguimiento manual; sin cancelación automática por plazo/);
  assert.doesNotMatch(html, /Plazo de confirmación/);
});
