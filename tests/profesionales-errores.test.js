import test from 'node:test';
import assert from 'node:assert/strict';
import { validarProfesional, interpretarErrorProfesional } from '../src/shared/screens/profesionales/profesionales.errores.js';

test('señala cada dato inválido y ambas asignaciones en la demostración', () => {
  const datos = new FormData();
  datos.set('name', '   ');
  datos.set('specialty', '');
  datos.set('email', 'correo-invalido');
  assert.deepEqual(validarProfesional(datos, { demo: true }), {
    name: 'Escribe el nombre completo.',
    specialty: 'Escribe la especialidad.',
    email: 'Escribe un correo válido, por ejemplo nombre@dominio.com.',
    services: 'Selecciona al menos un servicio.',
    branches: 'Selecciona al menos una sucursal.',
  });
});

test('la contraseña nueva se exige al crear y se permite vacía al editar', () => {
  const datos = new FormData();
  datos.set('name', 'Ana García');
  datos.set('specialty', 'Odontología');
  datos.set('email', 'ana@example.com');
  assert.equal(validarProfesional(datos).password, 'Escribe una contraseña.');
  assert.deepEqual(validarProfesional(datos, { existente: true }), {});
  datos.set('password', 'muy-corta');
  assert.equal(validarProfesional(datos, { existente: true }).password, 'Usa al menos 12 caracteres.');
});

test('ubica los errores de la API en los campos afectados', () => {
  assert.deepEqual(interpretarErrorProfesional(new Error('El nombre ya está registrado en este negocio.')), {
    name: 'El nombre ya está registrado en este negocio.',
  });
  assert.deepEqual(interpretarErrorProfesional(new Error('El correo ya está registrado.')), {
    email: 'El correo ya está registrado.',
  });
  assert.deepEqual(interpretarErrorProfesional(new Error('nombre: should not be empty · especialidad: should not be empty')), {
    name: 'Escribe el nombre completo.',
    specialty: 'Escribe la especialidad.',
  });
  assert.equal(interpretarErrorProfesional(new Error('No se pudo conectar con el backend.')), null);
});
