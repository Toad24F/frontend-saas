import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReceptionist, receptionistError } from '../src/connected/screens/recepcionistas/errors.js';

test('alta señala nombre, correo, contraseña y confirmación en su origen', () => {
  const data = new FormData();
  data.set('name', '  ');
  data.set('email', 'correo-inválido');
  data.set('password', 'corta');
  data.set('confirm', 'distinta');
  assert.deepEqual(validateReceptionist(data), {
    name: 'Escribe el nombre completo.',
    email: 'Escribe un correo válido, por ejemplo nombre@dominio.com.',
    password: 'Usa al menos 12 caracteres.',
    confirm: 'Las contraseñas no coinciden. Vuelve a escribir la confirmación.',
  });
});

test('restablecimiento valida solo la contraseña y su confirmación', () => {
  const data = new FormData();
  data.set('password', 'contraseña-larga');
  data.set('confirm', 'contraseña-larga');
  assert.deepEqual(validateReceptionist(data, true), {});
  data.set('confirm', '');
  assert.deepEqual(validateReceptionist(data, true), { confirm: 'Confirma la contraseña.' });
});

test('conflictos de la API apuntan al campo correspondiente', () => {
  assert.deepEqual(receptionistError(new Error('El nombre ya está registrado en este negocio.')), {
    name: 'El nombre ya está registrado en este negocio.',
  });
  assert.deepEqual(receptionistError(new Error('El correo ya está registrado.')), {
    email: 'El correo ya está registrado.',
  });
  assert.deepEqual(receptionistError(new Error('Las contraseñas no coinciden.')), {
    confirm: 'Las contraseñas no coinciden. Vuelve a escribir la confirmación.',
  });
  assert.equal(receptionistError(new Error('No se pudo conectar con el backend.')), null);
});
