import test from 'node:test';
import assert from 'node:assert/strict';
import { relojCabeceraPortal } from '../src/connected/portal-publico/portal.fechas.js';

test('la cabecera usa la zona local del visitante y cambia de día en esa zona', () => {
  assert.deepEqual(relojCabeceraPortal('2026-10-22T05:59:00Z', 'America/Chihuahua'), {
    etiqueta: '21 oct 2026 · 23:59', dateTime: '2026-10-21T23:59',
  });
  assert.deepEqual(relojCabeceraPortal('2026-10-22T06:00:00Z', 'America/Chihuahua'), {
    etiqueta: '22 oct 2026 · 00:00', dateTime: '2026-10-22T00:00',
  });
  assert.deepEqual(relojCabeceraPortal('2026-10-22T05:59:00Z', 'UTC'), {
    etiqueta: '22 oct 2026 · 05:59', dateTime: '2026-10-22T05:59',
  });
  const instante = '2026-10-22T05:59:00Z';
  assert.deepEqual(relojCabeceraPortal(instante),
    relojCabeceraPortal(instante, Intl.DateTimeFormat().resolvedOptions().timeZone));
});
