import test from 'node:test';
import assert from 'node:assert/strict';
import { puedeGestionarAgenda, puedeGestionarCitas, seleccionManual } from '../src/connected/modules/agenda/agenda.contrato-manual.js';

const contacto = { nombreCompleto: 'Paciente propio', telefono: '6141234567' };
const seleccion = { clienteNuevo: contacto, sucursalId: 3, servicioId: 4, personalId: 99,
  fechaLocal: '2026-11-09', horaInicio: '09:00', notas: '' };

// La capacidad de escribir en la agenda no concede acceso al directorio privado.
test('T033: Profesional gestiona su agenda sin permiso de gestionar clientes', () => {
  assert.equal(puedeGestionarAgenda('profesional'), true);
  assert.equal(puedeGestionarCitas('profesional'), false);
  assert.equal(puedeGestionarAgenda('superadmin'), false);
});

test('T033: formulario profesional fija perfil propio y exige contacto capturado', () => {
  const actor = { id: 7, rol: 'profesional' };
  assert.equal(seleccionManual(seleccion, actor).personalId, 7);
  assert.throws(() => seleccionManual({ ...seleccion, clienteNuevo: null, clienteId: 2 }, actor), /contacto|cliente/i);
});
