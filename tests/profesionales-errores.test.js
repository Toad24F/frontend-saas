import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfessional, professionalError } from '../src/shared/screens/profesionales/errors.js';

test('señala cada dato inválido y ambas asignaciones en la demostración', () => {
  const data = new FormData();
  data.set('name', '   ');
  data.set('specialty', '');
  data.set('email', 'correo-invalido');
  assert.deepEqual(validateProfessional(data, { demo: true }), {
    name: 'Escribe el nombre completo.',
    specialty: 'Escribe la especialidad.',
    email: 'Escribe un correo válido, por ejemplo nombre@dominio.com.',
    services: 'Selecciona al menos un servicio.',
    branches: 'Selecciona al menos una sucursal.',
  });
});

test('la contraseña nueva se exige al crear y se permite vacía al editar', () => {
  const data = new FormData();
  data.set('name', 'Ana García');
  data.set('specialty', 'Odontología');
  data.set('email', 'ana@example.com');
  assert.equal(validateProfessional(data).password, 'Escribe una contraseña.');
  assert.deepEqual(validateProfessional(data, { existing: true }), {});
  data.set('password', 'muy-corta');
  assert.equal(validateProfessional(data, { existing: true }).password, 'Usa al menos 12 caracteres.');
});

test('ubica los errores de la API en los campos afectados', () => {
  assert.deepEqual(professionalError(new Error('El nombre ya está registrado en este negocio.')), {
    name: 'El nombre ya está registrado en este negocio.',
  });
  assert.deepEqual(professionalError(new Error('El correo ya está registrado.')), {
    email: 'El correo ya está registrado.',
  });
  assert.deepEqual(professionalError(new Error('nombre: should not be empty · especialidad: should not be empty')), {
    name: 'Escribe el nombre completo.',
    specialty: 'Escribe la especialidad.',
  });
  assert.equal(professionalError(new Error('No se pudo conectar con el backend.')), null);
});
