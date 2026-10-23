import test from 'node:test';
import assert from 'node:assert/strict';
import { businessInitials } from '../src/connected/public/business-identity.js';

test('las iniciales se derivan del nombre público sin depender de la demo', () => {
  assert.equal(businessInitials('Unión Salud'), 'US');
  assert.equal(businessInitials('Clínica Bienestar'), 'CB');
  assert.equal(businessInitials('Centro de Salud'), 'CS');
  assert.equal(businessInitials(' Citalendar '), 'C');
  assert.equal(businessInitials(''), '');
});
