import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

test('refresco conserva la hora explorada y escala también marcas y reloj', async ({ page }) => {
  await prepararSesion(page);
  await page.clock.setFixedTime(new Date('2026-11-16T18:20:00Z'));
  let short = false;
  await page.route((url) => url.pathname === '/citas', async (route) => {
    const q = new URL(route.request().url()).searchParams, day = '2026-11-16';
    await route.fulfill({ json: { desde: q.get('desde'), hasta: q.get('hasta'), citas: [
      { id: 1, version: 1, estado: 'confirmada', nombreContacto: 'Paciente', nombreServicio: 'Consulta', nombreProfesional: 'Ana', nombreSucursal: 'Norte', personalId: 1, sucursalId: 1, fechaLocal: day, fechaFinLocal: day, horaInicio: '08:00:00', horaFin: short ? '08:05:00' : '08:20:00', zonaHoraria: 'America/Chihuahua', causas: [] },
    ] } });
  });
  await page.goto('/admin/agenda');
  await page.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '2000px'));
  await page.locator('[data-agenda-vista="day"]').click();
  const grid = page.locator('.calendario-semana');
  await expect(page.locator('.calendario-evento')).toHaveCount(1);
  await expect.poll(() => grid.evaluate((el) => parseFloat(el.style.getPropertyValue('--alto-hora')))).toBe(180);
  const scale = await grid.evaluate((el) => parseFloat(el.style.getPropertyValue('--alto-hora')));
  await page.evaluate(() => {
    const grid = document.querySelector('.calendario-semana'), body = grid.querySelector('.semana-cuerpo');
    window.scrollTo({ top: window.scrollY + body.getBoundingClientRect().top + 2 * parseFloat(grid.style.getPropertyValue('--alto-hora')) - 100, behavior: 'instant' });
  });
  const anchor = () => page.evaluate(async () => (await import('/src/shared/screens/agenda/agenda.navegacion.js')).anclaDesplazamientoAgenda()?.minuto ?? -1);
  const before = await anchor();
  short = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => grid.evaluate((el) => parseFloat(el.style.getPropertyValue('--alto-hora')))).toBeGreaterThan(scale * 3);
  expect(Math.abs(await anchor() - before)).toBeLessThan(1);
  const geometry = await grid.evaluate((el) => {
    const height = parseFloat(el.style.getPropertyValue('--alto-hora'));
    return { uniform: [...el.querySelectorAll('.columna-horas > span')].every((label, i) => Math.abs(parseFloat(label.style.top) - i * height) < .1), clock: parseFloat(el.querySelector('[data-agenda-reloj]').style.top), height };
  });
  expect(geometry.uniform).toBe(true);
  // 18:20 UTC son 12:20 en Chihuahua: 260 minutos después de las 08:00.
  expect(geometry.clock).toBeCloseTo(260 / 60 * geometry.height, 0);
});
