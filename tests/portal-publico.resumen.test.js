import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReserva } from '../src/connected/portal-publico/reserva.vista.js';

const seleccion = {
  fase: 'seleccion', paso: 0,
  seleccion: { servicioId: null, sucursalId: null, personalId: null, fecha: '', horario: null },
  consulta: { estado: 'lista', mensaje: '' },
  opciones: { servicios: [{ id: 1, nombre: 'Consulta general', costo: '600.00', duracionMinutos: 45 }], sucursales: [], profesionales: [] },
  horarios: [],
};

test('el resumen conserva las selecciones reales y muestra pago solo con costo conocido', () => {
  const sinContenido = renderReserva(seleccion);
  assert.match(sinContenido, /Resumen de tu cita/);
  assert.match(sinContenido, /Selecciona un servicio/);
  assert.doesNotMatch(sinContenido, /Pago directamente en sucursal/);

  const elegido = renderReserva({ ...seleccion, seleccion: { ...seleccion.seleccion, servicioId: 1 } });
  assert.match(elegido, /Consulta general/);
  assert.match(elegido, /45 minutos/);
  assert.match(elegido, /600\.00/);
  assert.match(elegido, /Pago directamente en sucursal/);
});

test('la recuperación muestra el costo aceptado sin inventar duración', () => {
  const html = renderReserva({ fase: 'resultado', seleccion: {}, opciones: { servicios: [], sucursales: [], profesionales: [] },
    resultado: { estado: 'pendiente', nombreNegocio: 'Unión Salud', nombreServicio: 'Consulta general',
      nombreSucursal: 'Centro', nombreProfesional: 'Ana Ruiz', inicioUtc: '2026-10-22T17:00:00Z',
      finUtc: '2026-10-22T17:45:00Z', zonaHoraria: 'America/Chihuahua', costo: '650.00' } });
  assert.match(html, /Costo de la reserva/);
  assert.match(html, /650\.00/);
  assert.match(html, /Pago directamente en sucursal/);
  assert.doesNotMatch(html, /45 minutos/);
});
