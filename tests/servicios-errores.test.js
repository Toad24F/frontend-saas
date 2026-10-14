import test from 'node:test';
import assert from 'node:assert/strict';
import { validateService, serviceError } from '../src/shared/screens/servicios/errors.js';

test('señala por separado los campos inválidos del servicio', () => {
  const data = new FormData();
  data.set('name', ' ');
  data.set('description', ' ');
  data.set('duration', '12.5');
  data.set('price', '-1');
  assert.deepEqual(validateService(data, true), {
    name: 'Escribe el nombre del servicio.',
    description: 'Escribe una descripción del servicio.',
    duration: 'Escribe una duración entre 15 y 240 minutos.',
    price: 'Escribe un precio entre $0 y $99,999, con máximo dos decimales.',
  });
});

test('la demostración exige intervalos de 15 minutos y la API admite minutos enteros', () => {
  const data = new FormData();
  data.set('name', 'Consulta');
  data.set('duration', '20');
  data.set('price', '250.50');
  assert.deepEqual(validateService(data), {});
  assert.deepEqual(validateService(data, true), {
    description: 'Escribe una descripción del servicio.',
    duration: 'Usa intervalos de 15 minutos.',
  });
});

test('ubica las respuestas de la API en nombre, precio y duración', () => {
  assert.deepEqual(serviceError(new Error('El nombre del Servicio ya está registrado en este negocio.')), {
    name: 'Ya existe un servicio con este nombre en tu negocio.',
  });
  assert.deepEqual(serviceError(new Error('costo debe ser no negativo con máximo dos decimales · duracionMinutos debe ser entero')), {
    price: 'El precio debe ser mayor o igual a cero y tener máximo dos decimales.',
    duration: 'La duración debe ser un número entero mayor que cero.',
  });
  assert.equal(serviceError(new Error('No se pudo conectar con el backend.')), null);
});
