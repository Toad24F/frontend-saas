import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastePortal, tonosAcentoPortal, rutaLogoPortal } from '../src/shared/personalizacion.marca.js';

test('conserva el acento elegido y adapta el tono de controles y enlaces a cada tema', () => {
  for (const acento of ['#FFFFFF', '#000000', '#777777', '#b3442c']) {
    const tonos = tonosAcentoPortal(acento);
    assert.equal(tonos.relleno, acento.toLowerCase());
    assert.ok(contrastePortal(tonos.relleno, tonos.sobreRelleno) >= 4.5);
    for (const fondo of ['#ffffff', '#f4f5f6', '#eef0f2']) assert.ok(contrastePortal(tonos.claro, fondo) >= 4.5);
    for (const fondo of ['#15161a', '#202127', '#2b2c33']) assert.ok(contrastePortal(tonos.oscuro, fondo) >= 4.5);
  }
  assert.equal(tonosAcentoPortal('#2164d880'), null);
});

test('la ruta de logo queda ligada al slug y a un UUID', () => {
  const id = '11223344-5566-4788-8899-aabbccddeeff';
  assert.equal(rutaLogoPortal('negocio-propio', id), `/publico/negocios/negocio-propio/logos/${id}`);
  assert.equal(rutaLogoPortal('../ajeno', id), null);
  assert.equal(rutaLogoPortal('negocio-propio', 'https://ajeno.test/logo.png'), null);
});
