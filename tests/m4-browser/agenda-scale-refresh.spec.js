import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

test('refresco conserva la hora explorada y escala también marcas y reloj', async ({ page }) => {
  await setup(page);
  await page.clock.setFixedTime(new Date('2026-11-16T18:20:00Z'));
  let short = false;
  await page.route((url) => url.pathname === '/citas', async (route) => {
    const q = new URL(route.request().url()).searchParams, day = '2026-11-16';
    await route.fulfill({ json: { desde: q.get('desde'), hasta: q.get('hasta'), citas: [
      { id: 1, version: 1, estado: 'confirmada', nombreContacto: 'Paciente', nombreServicio: 'Consulta', nombreProfesional: 'Ana', nombreSucursal: 'Norte', personalId: 1, sucursalId: 1, fechaLocal: day, fechaFinLocal: day, horaInicio: '08:00:00', horaFin: short ? '08:05:00' : '08:20:00', zonaHoraria: 'America/Chihuahua', causas: [] },
    ] } });
  });
  await page.goto('/admin/agenda');
  await page.evaluate(() => document.documentElement.style.setProperty('--agenda-hour-max', '2000px'));
  await page.locator('[data-m4-view="day"]').click();
  const grid = page.locator('.week-calendar');
  await expect(page.locator('.calendar-event')).toHaveCount(1);
  await expect.poll(() => grid.evaluate((el) => parseFloat(el.style.getPropertyValue('--hour-height')))).toBe(180);
  const scale = await grid.evaluate((el) => parseFloat(el.style.getPropertyValue('--hour-height')));
  await page.evaluate(() => {
    const grid = document.querySelector('.week-calendar'), body = grid.querySelector('.week-body');
    window.scrollTo({ top: window.scrollY + body.getBoundingClientRect().top + 2 * parseFloat(grid.style.getPropertyValue('--hour-height')) - 100, behavior: 'instant' });
  });
  const anchor = () => page.evaluate(async () => (await import('/src/shared/screens/agenda/navigation.js')).agendaScrollAnchor()?.minute ?? -1);
  const before = await anchor();
  short = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => grid.evaluate((el) => parseFloat(el.style.getPropertyValue('--hour-height')))).toBeGreaterThan(scale * 3);
  expect(Math.abs(await anchor() - before)).toBeLessThan(1);
  const geometry = await grid.evaluate((el) => {
    const height = parseFloat(el.style.getPropertyValue('--hour-height'));
    return { uniform: [...el.querySelectorAll('.time-gutter > span')].every((label, i) => Math.abs(parseFloat(label.style.top) - i * height) < .1), clock: parseFloat(el.querySelector('[data-agenda-clock]').style.top), height };
  });
  expect(geometry.uniform).toBe(true);
  // 18:20 UTC son 12:20 en Chihuahua: 260 minutos después de las 08:00.
  expect(geometry.clock).toBeCloseTo(260 / 60 * geometry.height, 0);
});
