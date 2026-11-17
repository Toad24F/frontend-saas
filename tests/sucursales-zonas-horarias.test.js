import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONAS_HORARIAS_MEXICO } from '../src/shared/screens/sucursales/sucursales.zonas-horarias.js';

test('incluye todos los identificadores IANA vigentes para México', () => {
  assert.deepEqual(
    ZONAS_HORARIAS_MEXICO.map(({ id }) => id),
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
  for (const { id, name: nombre } of ZONAS_HORARIAS_MEXICO) {
    assert.doesNotThrow(() => new Intl.DateTimeFormat('es-MX', { timeZone: id }));
    assert.ok(nombre.length > 0);
  }
});
