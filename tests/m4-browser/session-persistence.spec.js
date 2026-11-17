import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

test('nuevo contexto de navegador restaura el acceso persistente y valida perfil', async ({ page, browser }) => {
  await setup(page);
  await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('cita-session'))).toBe('m4-test');
  // storageState conserva localStorage; las sesiones de pestaña no forman parte de esa instantánea.
  const persisted = await page.context().storageState();
  await page.close();
  const reopenedContext = await browser.newContext({ storageState: persisted });
  try {
    const reopened = await reopenedContext.newPage();
    const { seen, errors } = await setup(reopened);
    await reopened.addInitScript(() => sessionStorage.removeItem('cita-session'));
    await reopened.goto('/admin/agenda');
    await expect(reopened.locator('[data-m4-appointment="7"]')).toBeVisible();
    expect(seen).toContain('GET /auth/profile');
    expect(seen).not.toContain('POST /auth/login');
    expect(errors).toEqual([]);
  } finally { await reopenedContext.close(); }
});

test('acceso persistido vencido exige login y limpia el almacenamiento', async ({ page }) => {
  const { seen } = await setup(page);
  await page.addInitScript(() => { sessionStorage.removeItem('cita-session'); localStorage.setItem('cita-session', 'expired-test'); });
  await page.route((url) => url.pathname === '/auth/profile', (route) => route.fulfill({ status: 401, json: { message: 'Sesión no válida.' } }));
  await page.goto('/admin/agenda');
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('cita-session'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('cita-session'))).toBeNull();
  expect(seen).not.toContain('GET /citas');
});

test('cerrar sesión en otra pestaña retira el panel de la pestaña abierta', async ({ page, context }) => {
  await setup(page); await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  const other = await context.newPage();
  try {
    await setup(other); await other.goto('/admin/agenda');
    await expect(other.locator('[data-m4-appointment="7"]')).toBeVisible();
    await other.evaluate(() => localStorage.removeItem('cita-session'));
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('cita-session'))).toBeNull();
  } finally { await other.close(); }
});

test('cerrar la sesión conectada no sustituye la demo abierta por un login', async ({ page, context }) => {
  await setup(page); await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  const demo = await context.newPage();
  try {
    await demo.goto('/admin/agenda?demo=1');
    await expect(demo.locator('[data-appointment]').first()).toBeVisible();
    await page.evaluate(() => localStorage.removeItem('cita-session'));
    await demo.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(demo.locator('[data-appointment]').first()).toBeVisible();
    await expect(demo.locator('input[type="password"]')).toHaveCount(0);
  } finally { await demo.close(); }
});
