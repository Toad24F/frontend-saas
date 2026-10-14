import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBranch, branchError } from '../src/shared/screens/sucursales/errors.js';

test('señala cada dato inválido de la sucursal junto a su campo', () => {
  const data = new FormData();
  data.set('name', ' ');
  data.set('address', '');
  data.set('phone', 'abc');
  data.set('timezone', 'Mars/Phobos');
  data.set('maps', 'https://evil.example/maps');
  assert.deepEqual(validateBranch(data), {
    name: 'Escribe el nombre de la sucursal.',
    address: 'Escribe la dirección de la sucursal.',
    phone: 'Escribe entre 7 y 20 caracteres, con al menos 7 dígitos. Puedes usar +, espacios, paréntesis o guiones.',
    timezone: 'Escribe una zona horaria válida, por ejemplo America/Chihuahua.',
    maps: 'Pega un enlace HTTPS de Google Maps.',
  });
});

test('admite teléfono internacional conectado y exige diez dígitos en la demostración', () => {
  const data = new FormData();
  data.set('name', 'Centro');
  data.set('address', 'Calle Uno 5');
  data.set('phone', '+52 614 123 4567');
  data.set('timezone', 'America/Chihuahua');
  data.set('maps', 'https://maps.app.goo.gl/abc123');
  assert.deepEqual(validateBranch(data), {});
  assert.deepEqual(validateBranch(data, true), {
    phone: 'Escribe 10 dígitos, sin espacios ni guiones.',
  });
});

test('ubica los conflictos y errores de la API en el campo afectado', () => {
  assert.deepEqual(branchError(new Error('El nombre de la sucursal ya está registrado en este negocio.')), {
    name: 'Ya existe una sucursal con este nombre en tu negocio.',
  });
  assert.deepEqual(branchError(new Error('telefono tiene formato inválido · urlGoogleMaps debe ser un enlace HTTPS de Google Maps')), {
    phone: 'Revisa el formato del teléfono.',
    maps: 'Pega un enlace HTTPS de Google Maps.',
  });
  assert.equal(branchError(new Error('No se pudo conectar con el backend.')), null);
});
