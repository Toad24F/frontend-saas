import test from 'node:test';
import assert from 'node:assert/strict';
import { validarRecepcionista, interpretarErrorRecepcionista } from '../src/connected/screens/recepcionistas/recepcionistas.errores.js';

test('alta señala nombre, correo y contraseña en su origen', () => {
  const datos = new FormData();
  datos.set('name', '  ');
  datos.set('email', 'correo-inválido');
  datos.set('password', 'corta');
  assert.deepEqual(validarRecepcionista(datos), {
    name: 'Escribe el nombre completo.',
    email: 'Escribe un correo válido, por ejemplo nombre@dominio.com.',
    password: 'Usa al menos 12 caracteres.',
  });
});

test('restablecimiento valida solo la contraseña', () => {
  const datos = new FormData();
  datos.set('password', 'contraseña-larga');
  assert.deepEqual(validarRecepcionista(datos, true), {});
  datos.set('password', 'corta');
  assert.deepEqual(validarRecepcionista(datos, true), { password: 'Usa al menos 12 caracteres.' });
});

test('conflictos de la API apuntan al campo correspondiente', () => {
  assert.deepEqual(interpretarErrorRecepcionista(new Error('El nombre ya está registrado en este negocio.')), {
    name: 'El nombre ya está registrado en este negocio.',
  });
  assert.deepEqual(interpretarErrorRecepcionista(new Error('El correo ya está registrado.')), {
    email: 'El correo ya está registrado.',
  });
  assert.deepEqual(interpretarErrorRecepcionista(new Error('La contraseña debe tener al menos 12 caracteres.')), {
    password: 'La contraseña debe tener al menos 12 caracteres.',
  });
  assert.equal(interpretarErrorRecepcionista(new Error('No se pudo conectar con el backend.')), null);
});
