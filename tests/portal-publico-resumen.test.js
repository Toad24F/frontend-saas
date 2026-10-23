import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBooking } from '../src/connected/public/booking-view.js';

const selection = {
  phase: 'selection', step: 0,
  selection: { servicioId: null, sucursalId: null, personalId: null, date: '', slot: null },
  query: { status: 'ready', message: '' },
  options: { servicios: [{ id: 1, nombre: 'Consulta general', costo: '600.00', duracionMinutos: 45 }], sucursales: [], profesionales: [] },
  slots: [],
};

test('el resumen conserva las selecciones reales y muestra pago solo con costo conocido', () => {
  const empty = renderBooking(selection);
  assert.match(empty, /Resumen de tu cita/);
  assert.match(empty, /Selecciona un servicio/);
  assert.doesNotMatch(empty, /Pago directamente en sucursal/);

  const chosen = renderBooking({ ...selection, selection: { ...selection.selection, servicioId: 1 } });
  assert.match(chosen, /Consulta general/);
  assert.match(chosen, /45 minutos/);
  assert.match(chosen, /600\.00/);
  assert.match(chosen, /Pago directamente en sucursal/);
});

test('la recuperación muestra el costo aceptado sin inventar duración', () => {
  const html = renderBooking({ phase: 'result', selection: {}, options: { servicios: [], sucursales: [], profesionales: [] },
    result: { folio: 'P-123', estado: 'pendiente', nombreNegocio: 'Unión Salud', nombreServicio: 'Consulta general',
      nombreSucursal: 'Centro', nombreProfesional: 'Ana Ruiz', inicioUtc: '2026-10-22T17:00:00Z',
      finUtc: '2026-10-22T17:45:00Z', zonaHoraria: 'America/Chihuahua', costoAceptado: '650.00' } });
  assert.match(html, /Costo aceptado/);
  assert.match(html, /650\.00/);
  assert.match(html, /Pago directamente en sucursal/);
  assert.doesNotMatch(html, /45 minutos/);
});
