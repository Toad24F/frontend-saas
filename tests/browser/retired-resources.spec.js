import { test, expect } from '@playwright/test';
import { rows } from './support.js';

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
  const [appointmentBefore] = await rows("SELECT id, estado, inicio_utc, fin_utc FROM citas WHERE folio='RET-QA-2'");
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
    if (item.type === 'servicios') {
      const writes = [];
      page.on('request', (request) => { if (request.method() !== 'GET' && /citas|reservas/.test(request.url())) writes.push(request.url()); });
      await section.getByRole('button', { name: `Revisar citas afectadas de ${item.name}` }).click();
      await expect(section).toContainText(/citas no fueron canceladas ni reprogramadas/i);
      await expect(section).toContainText(`Cita #${appointmentBefore.id}`);
      await expect(section).toContainText('Servicio inhabilitado');
      expect(writes).toEqual([]);
    }
  }
  expect(requests.some((entry) => entry.startsWith('DELETE '))).toBe(false);
  for (const item of cases) {
    expect(requests.some((entry) => new RegExp(`^POST /${item.type}/\\d+/inhabilitar$`).test(entry))).toBe(true);
  }
  const [appointmentAfter] = await rows("SELECT id, estado, inicio_utc, fin_utc FROM citas WHERE folio='RET-QA-2'");
  expect(appointmentAfter).toEqual(appointmentBefore);
});

test('FALA-T035: la demo conserva sus catálogos sin fingir retiros conectados', async ({ page }) => {
  await page.goto(`${origin()}/admin/profesionales?demo=1`);
  await expect(page.getByRole('heading', { name: 'Profesionales' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Consultar inhabilitados' })).toHaveCount(0);
  await expect(page.locator('[data-professional-id]').first()).toBeVisible();
});

test('FALA-T043: otro administrador no consulta el detalle retirado del negocio 2', async ({ page }) => {
  const [account] = await rows("SELECT id FROM usuarios WHERE email='retiro-recep-qa@example.test'");
  await login(page, 'admin-qa-1@example.test');
  const result = await page.evaluate(async (id) => {
    const { api } = await import('/src/connected/modules/auth/session.js');
    try { await api(`/recepcionistas/inhabilitados/${id}`); return 200; }
    catch (error) { return error.status; }
  }, Number(account.id));
  expect([403, 404]).toContain(result);
});

// Cada restauración se verifica desde la API real y en el catálogo. La base
// de prueba fija un cupo lleno después para ejercer el 409 de reactivación.
test('FALA-T041–T043: restaurar los cuatro deja inactivo y activar respeta cupo', async ({ page }) => {
  await login(page, 'admin-qa-2@example.test');
  const items = [
    ['profesionales', 'Profesional QA 2', '[data-professional-id]'],
    ['recepcionistas', 'Recepción Retiro QA', '[data-reception-entry]'],
    ['servicios', 'Corte QA', '[data-service-entry]'],
    ['sucursales', 'Sucursal QA 2', '[data-branch-entry]'],
  ];
  for (const [type, name, selector] of items) {
    await page.goto(`${origin()}/admin/${type}`);
    const section = page.getByRole('region', { name: `Inhabilitados de ${type}` });
    await section.getByRole('button', { name: 'Consultar inhabilitados' }).click();
    await section.getByRole('button', { name: `Restaurar ${name}` }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/inactivo|inactiva/i);
    await dialog.getByRole('button', { name: 'Restaurar' }).click();
    await expect(dialog).toHaveCount(0);
    const card = page.locator(selector, { hasText: name }).first();
    await expect(card).toContainText(/Inactivo|Inactiva/);
    await section.getByRole('button', { name: 'Consultar inhabilitados' }).click();
    await expect(section).not.toContainText(name);
  }
  await rows('UPDATE negocios SET limite_profesionales_activos=1 WHERE id=2');
  await page.goto(`${origin()}/admin/profesionales`);
  const card = page.locator('[data-professional-id]', { hasText: 'Profesional QA 2' }).first();
  await card.locator('summary').click();
  await card.locator('[data-professional-action="reactivate"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivar' }).click();
  await expect(page.getByRole('dialog')).toContainText(/No hay cupo/i);
  await expect(card).toContainText('Inactivo');
});

// Capturas reales del panel separado y su detalle en los tamaños/temas del
// producto; la comprobación de ancho detecta desbordamientos en móvil.
test('FALA-T040: inhabilitados visibles en escritorio y móvil, claro y oscuro', async ({ page }, testInfo) => {
  await login(page, 'admin-qa-2@example.test');
  await page.goto(`${origin()}/admin/recepcionistas`);
  // La prueba anterior restauró esta cuenta. Se retira de nuevo en la base
  // efímera para inspeccionar la sección con un resultado real.
  await page.getByRole('button', { name: 'Inhabilitar a Recepción Retiro QA' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Inhabilitar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const section = page.getByRole('region', { name: 'Inhabilitados de recepcionistas' });
  await section.getByRole('button', { name: 'Consultar inhabilitados' }).click();
  await expect(section).toContainText('Recepción Retiro QA');
  await expect(page.locator('#toast-region .app-toast')).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('retired-desktop-light.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.screenshot({ path: testInfo.outputPath('retired-desktop-dark.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const restore = section.getByRole('button', { name: 'Restaurar Recepción Retiro QA' });
  await restore.scrollIntoViewIfNeeded();
  expect(await restore.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === button;
  })).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('retired-mobile-dark.png'), fullPage: true, animations: 'disabled' });
  await restore.click();
  await page.screenshot({ path: testInfo.outputPath('retired-restore-mobile-dark.png'), animations: 'disabled' });
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await section.getByRole('button', { name: 'Ver detalle de Recepción Retiro QA' }).click();
  await page.screenshot({ path: testInfo.outputPath('retired-detail-mobile-dark.png'), animations: 'disabled' });
  await page.getByRole('dialog').locator('[data-dismiss]').click();
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await page.screenshot({ path: testInfo.outputPath('retired-mobile-light.png'), fullPage: true, animations: 'disabled' });
});
