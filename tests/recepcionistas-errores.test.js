import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReceptionist, receptionistError } from '../src/connected/screens/recepcionistas/errors.js';

test('alta señala nombre, correo y contraseña en su origen', () => {
  const data = new FormData();
  data.set('name', '  ');
  data.set('email', 'correo-inválido');
  data.set('password', 'corta');
  assert.deepEqual(validateReceptionist(data), {
    name: 'Escribe el nombre completo.',
    email: 'Escribe un correo válido, por ejemplo nombre@dominio.com.',
    password: 'Usa al menos 12 caracteres.',
  });
});

test('restablecimiento valida solo la contraseña', () => {
  const data = new FormData();
  data.set('password', 'contraseña-larga');
  assert.deepEqual(validateReceptionist(data, true), {});
  data.set('password', 'corta');
  assert.deepEqual(validateReceptionist(data, true), { password: 'Usa al menos 12 caracteres.' });
});

test('conflictos de la API apuntan al campo correspondiente', () => {
  assert.deepEqual(receptionistError(new Error('El nombre ya está registrado en este negocio.')), {
    name: 'El nombre ya está registrado en este negocio.',
  });
  assert.deepEqual(receptionistError(new Error('El correo ya está registrado.')), {
    email: 'El correo ya está registrado.',
  });
  assert.deepEqual(receptionistError(new Error('La contraseña debe tener al menos 12 caracteres.')), {
    password: 'La contraseña debe tener al menos 12 caracteres.',
  });
  assert.equal(receptionistError(new Error('No se pudo conectar con el backend.')), null);
});
