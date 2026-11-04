import { test, expect } from '@playwright/test';

const origin = () => process.env.PORTAL_TEST_ORIGIN;
async function login(page, email) {
  await page.goto(`${origin()}/admin/profesionales`);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#login-password').fill('PruebaLicencia2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  // Esperar la transición autenticada evita que el siguiente goto cancele el
  // POST de login y produzca una falsa ausencia de controles.
  await page.waitForFunction(() => Boolean(sessionStorage.getItem('cita-session')));
}

// El negocio 2 pertenece solo a la base efímera; los cuatro retiros nunca
// tocan la oferta pública del negocio 1 ni la base habitual del backend.
test('FALA-T035–T040: cuatro retiros recuperables y consultas separadas', async ({ page }) => {
  await login(page, 'admin-qa-2@example.test');
  const requests = [];
  page.on('request', (request) => {
    if (/\/(profesionales|recepcionistas|servicios|sucursales)\/\d+/.test(request.url())) {
      requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  const cases = [
    { type: 'profesionales', name: 'Profesional QA 2', article: '[data-professional-id]', action: '[data-professional-action="disable"]' },
    { type: 'recepcionistas', name: 'Recepción Retiro QA', article: '[data-reception-entry]', action: '[data-reception-action="disable"]' },
    { type: 'servicios', name: 'Corte QA', article: '[data-service-entry]', action: '[data-disable-service]' },
    { type: 'sucursales', name: 'Sucursal QA 2', article: '[data-branch-entry]', action: '[data-disable-branch]' },
  ];
  for (const item of cases) {
    await page.goto(`${origin()}/admin/${item.type}`);
    const card = page.locator(item.article, { hasText: item.name }).first();
    await expect(card).toBeVisible();
    if (item.type === 'profesionales' || item.type === 'servicios' || item.type === 'sucursales') {
      await card.locator('summary').click();
    }
    await card.locator(item.action).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/Inhabilitar/);
    await expect(dialog).toContainText(/restaurar/i);
    await dialog.getByRole('button', { name: /Inhabilitar/ }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card).toHaveCount(0);
    const section = page.getByRole('region', { name: `Inhabilitados de ${item.type}` });
    await section.getByRole('button', { name: 'Consultar inhabilitados' }).click();
    await expect(section).toContainText(item.name);
    await expect(section).toContainText('Inhabilitado');
    await section.getByRole('button', { name: `Ver detalle de ${item.name}` }).click();
    await expect(page.getByRole('dialog')).toContainText(/Inhabilitado/);
    await page.getByRole('dialog').locator('[data-dismiss]').click();
  }
  expect(requests.some((entry) => entry.startsWith('DELETE '))).toBe(false);
  for (const item of cases) {
    expect(requests.some((entry) => new RegExp(`^POST /${item.type}/\\d+/inhabilitar$`).test(entry))).toBe(true);
  }
});

test('FALA-T035: la demo conserva sus catálogos sin fingir retiros conectados', async ({ page }) => {
  await page.goto(`${origin()}/admin/profesionales?demo=1`);
  await expect(page.getByRole('heading', { name: 'Profesionales' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Consultar inhabilitados' })).toHaveCount(0);
  await expect(page.locator('[data-professional-id]').first()).toBeVisible();
});

// Capturas reales del panel separado y su detalle en los tamaños/temas del
// producto; la comprobación de ancho detecta desbordamientos en móvil.
test('FALA-T040: inhabilitados visibles en escritorio y móvil, claro y oscuro', async ({ page }, testInfo) => {
  await login(page, 'admin-qa-2@example.test');
  await page.goto(`${origin()}/admin/recepcionistas`);
  const section = page.getByRole('region', { name: 'Inhabilitados de recepcionistas' });
  await section.getByRole('button', { name: 'Consultar inhabilitados' }).click();
  await expect(section).toContainText('Recepción Retiro QA');
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('retired-desktop-light.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.screenshot({ path: testInfo.outputPath('retired-desktop-dark.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('retired-mobile-dark.png'), fullPage: true, animations: 'disabled' });
  await section.getByRole('button', { name: 'Ver detalle de Recepción Retiro QA' }).click();
  await page.screenshot({ path: testInfo.outputPath('retired-detail-mobile-dark.png'), animations: 'disabled' });
  await page.getByRole('dialog').locator('[data-dismiss]').click();
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await page.screenshot({ path: testInfo.outputPath('retired-mobile-light.png'), fullPage: true, animations: 'disabled' });
});
