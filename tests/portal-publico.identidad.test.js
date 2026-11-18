import test from 'node:test';
import assert from 'node:assert/strict';
import { inicialesNegocio } from '../src/connected/portal-publico/negocio.identidad.js';

test('las iniciales se derivan del nombre público sin depender de la demo', () => {
  assert.equal(inicialesNegocio('Unión Salud'), 'US');
  assert.equal(inicialesNegocio('Clínica Bienestar'), 'CB');
  assert.equal(inicialesNegocio('Centro de Salud'), 'CS');
  assert.equal(inicialesNegocio(' Citalendar '), 'C');
  assert.equal(inicialesNegocio(''), '');
});
