import test from 'node:test';
import assert from 'node:assert/strict';
import { portalHeaderClock } from '../src/connected/public/dates.js';

test('la cabecera usa la zona local del visitante y cambia de día en esa zona', () => {
  assert.deepEqual(portalHeaderClock('2026-10-22T05:59:00Z', 'America/Chihuahua'), {
    label: '21 oct 2026 · 23:59', dateTime: '2026-10-21T23:59',
  });
  assert.deepEqual(portalHeaderClock('2026-10-22T06:00:00Z', 'America/Chihuahua'), {
    label: '22 oct 2026 · 00:00', dateTime: '2026-10-22T00:00',
  });
  assert.deepEqual(portalHeaderClock('2026-10-22T05:59:00Z', 'UTC'), {
    label: '22 oct 2026 · 05:59', dateTime: '2026-10-22T05:59',
  });
  const instant = '2026-10-22T05:59:00Z';
  assert.deepEqual(portalHeaderClock(instant),
    portalHeaderClock(instant, Intl.DateTimeFormat().resolvedOptions().timeZone));
});
