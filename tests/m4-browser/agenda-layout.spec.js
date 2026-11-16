import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

async function prepare(page, theme) {
  const fixture = await setup(page, 'admin_negocio', theme);
  await page.route((url) => ['/sucursales', '/profesionales'].includes(url.pathname) || /\/profesionales\/\d+\/sucursales$/.test(url.pathname), async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path === '/sucursales' ? [{ id: 1, nombre: 'Norte', activo: true }, { id: 2, nombre: 'Centro', activo: true }, { id: 3, nombre: 'Sur', activo: true }]
      : path === '/profesionales' ? [{ id: 1, nombre: 'Ana', activo: true }, { id: 2, nombre: 'Beto', activo: true }, { id: 3, nombre: 'Carla', activo: true }]
        : path.includes('/1/') ? [1] : path.includes('/2/') ? [1, 2] : [3];
    await route.fulfill({ json: data });
  });
  await page.route((url) => url.pathname === '/citas', async (route) => {
    const q = new URL(route.request().url()).searchParams;
    const day = await page.evaluate(() => new Date().toLocaleDateString('en-CA'));
    await route.fulfill({ json: { desde: q.get('desde'), hasta: q.get('hasta'), citas: [
      [1, '08:00:00', '08:20:00', 1], [2, '08:20:00', '08:40:00', 1], [3, '09:00:00', '11:00:00', 1], [4, '08:00:00', '08:10:00', 2],
    ].map(([id, start, end, person]) => ({ id, version: 1, folio: `FOLIO-${id}`, estado: 'confirmada', nombreContacto: 'María Fernanda del Carmen López Hernández', nombreServicio: 'Consulta de seguimiento y valoración integral', nombreProfesional: person === 1 ? 'Ana' : 'Beto', nombreSucursal: 'Norte', personalId: person, sucursalId: 1, fechaLocal: day, fechaFinLocal: day, horaInicio: start, horaFin: end, zonaHoraria: 'America/Chihuahua', causas: [] })) } });
  });
  await page.goto('/admin/agenda');
  return fixture;
}

test('filtros principales resuelven asignación, mantienen selección y permiten histórico explícito', async ({ page }) => {
  const { errors } = await prepare(page, 'light');
  const branch = page.getByLabel('Sucursal', { exact: true }), person = page.getByLabel('Profesional', { exact: true });
  await expect(branch).toHaveValue('2');
  await person.selectOption('1'); await expect(branch).toHaveValue('1');
  await person.selectOption('2'); await expect(branch).toHaveValue('1');
  await person.selectOption('3'); await expect(branch).toHaveValue('3');
  await person.selectOption('2'); await expect(branch).toHaveValue('2');
  await page.getByLabel('Consultar otras sucursales (histórico)').check();
  await branch.selectOption('3'); await expect(person).toHaveValue('2');
  await page.getByLabel('Consultar otras sucursales (histórico)').uncheck(); await expect(branch).toHaveValue('2');
  expect(errors).toEqual([]);
});

test('profesional sin asignaciones conserva una vía explícita a sus citas históricas', async ({ page }) => {
  await setup(page, 'profesional');
  await page.route((url) => url.pathname.endsWith('/oferta'), (route) => route.fulfill({ json: { cuentaActiva: true, sucursales: [] } }));
  await page.goto('/admin/agenda');
  await expect(page.getByLabel('Sucursal', { exact: true })).toHaveValue('none');
  await expect(page.locator('.calendar-event')).toHaveCount(0);
  await page.getByLabel('Consultar otras sucursales (histórico)').check();
  await page.getByLabel('Sucursal', { exact: true }).selectOption('all');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  await expect(page.getByLabel('Profesional', { exact: true })).toHaveCount(0);
});

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`tarjetas y columnas ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { errors } = await prepare(page, theme);
    await page.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await page.locator('[data-m4-view="day"]').click();
    await expect(page.locator('[data-calendar-professional]')).toHaveCount(2);
    await expect(page.locator('[data-calendar-professional="1"] [data-m4-appointment="4"]')).toHaveCount(0);
    await page.screenshot({ path: `test-results/m4/agenda-columnas-${width}-${theme}.png`, fullPage: true });
    await page.getByLabel('Profesional', { exact: true }).selectOption('1');
    const first = page.locator('[data-m4-appointment="1"]'), second = page.locator('[data-m4-appointment="2"]');
    await expect(first).toBeVisible();
    const a = await first.boundingBox(), b = await second.boundingBox();
    expect(a.x).toBeCloseTo(b.x, 0); expect(a.width).toBeCloseTo(b.width, 0); expect(a.y + a.height).toBeLessThanOrEqual(b.y);
    expect(await first.evaluate((el) => el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width)).toBeGreaterThan(.95);
    expect(await page.locator('.calendar-event').evaluateAll((cards) => cards.every((card) => [...card.children].every((child) => child.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom)))).toBe(true);
    await expect(page.locator('.calendar-event')).not.toContainText(['FOLIO']);
    expect(await page.locator('.calendar-scroll').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await first.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/m4/agenda-individual-${width}-${theme}.png`, fullPage: true });
    await page.locator('[data-m4-view="week"]').click();
    await page.screenshot({ path: `test-results/m4/agenda-semana-${width}-${theme}.png`, fullPage: true });
    await page.locator('[data-m4-view="month"]').click();
    await expect(page.locator('.month-day')).toHaveCount(42);
    await expect(page.locator('.month-event .event-folio')).toHaveCount(0);
    await page.screenshot({ path: `test-results/m4/agenda-mes-${width}-${theme}.png`, fullPage: true });
    await page.goto('/admin/agenda?demo=1');
    await page.locator('.day-header').filter({ has: page.locator('small', { hasText: /^[1-9]/ }) }).first().click();
    await expect(page.locator('.single-day')).toBeVisible();
    await expect(page.locator('.calendar-event').first()).toBeVisible();
    await page.locator('.calendar-event').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/m4/agenda-demo-dia-${width}-${theme}.png` });
    await expect(page.locator('.calendar-event .event-folio')).toHaveCount(0);
    await page.getByLabel('Profesional', { exact: true }).selectOption(await page.locator('.day-column:has(.calendar-event)').first().getAttribute('data-calendar-professional'));
    expect(await page.locator('.calendar-event').first().evaluate((el) => el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width)).toBeGreaterThan(.95);
    expect(errors).toEqual([]);
  });
}
