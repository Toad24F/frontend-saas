import test from 'node:test';
import assert from 'node:assert/strict';
import { MEXICO_TIMEZONES } from '../src/shared/screens/sucursales/timezones.js';

test('incluye todos los identificadores IANA vigentes para México', () => {
  assert.deepEqual(
    MEXICO_TIMEZONES.map(({ id }) => id),
    [
      'America/Mexico_City',
      'America/Cancun',
      'America/Merida',
      'America/Monterrey',
      'America/Matamoros',
      'America/Chihuahua',
      'America/Ciudad_Juarez',
      'America/Ojinaga',
      'America/Mazatlan',
      'America/Bahia_Banderas',
      'America/Hermosillo',
      'America/Tijuana',
    ],
  );
});

test('cada opción usa un identificador reconocido por Intl', () => {
  for (const { id, name } of MEXICO_TIMEZONES) {
    assert.doesNotThrow(() => new Intl.DateTimeFormat('es-MX', { timeZone: id }));
    assert.ok(name.length > 0);
  }
});
