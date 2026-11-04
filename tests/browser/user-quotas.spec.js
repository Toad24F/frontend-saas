import { test, expect } from '@playwright/test';
import { rows } from './support.js';

const origin = () => process.env.PORTAL_TEST_ORIGIN;
async function login(page, role = 'superadmin') {
  await page.goto(`${origin()}/admin/negocio/1`);
  await page.getByLabel('Correo electrónico').fill(`${role}-qa${role === 'superadmin' ? '' : '-1'}@example.test`);
  await page.locator('#login-password').fill('PruebaLicencia2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

// El servidor de prueba y sus usuarios pertenecen a una base que globalSetup
// crea y destruye. Las aserciones consultan el resultado persistido allí.
test('FALA-T031–T032: 5/3 inicial, edición de dos límites y 409 conserva borrador', async ({ page }) => {
  await login(page);
  const section = page.locator('section', { has: page.getByRole('heading', { name: 'Cupos de usuarios' }) });
  await expect(section).toContainText('2 / 5');
  await expect(section).toContainText('1 / 3');
  await section.getByRole('button', { name: 'Cambiar cupos de usuarios' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Límite de profesionales activos').fill('0');
  expect(await dialog.getByLabel('Límite de profesionales activos').evaluate((input) => input.checkValidity())).toBe(false);
  await dialog.getByLabel('Límite de profesionales activos').fill('1');
  await dialog.getByLabel('Límite de recepcionistas activos').fill('2');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toContainText(/menor al consumo activo/i);
  await expect(dialog.getByLabel('Límite de profesionales activos')).toHaveValue('1');
  await expect(dialog.getByLabel('Límite de recepcionistas activos')).toHaveValue('2');
  await expect(section).toContainText('2 / 5');
  await dialog.getByLabel('Límite de profesionales activos').fill('2');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(section).toContainText('2 / 2');
  await expect(section).toContainText('1 / 2');
  const [saved] = await rows('SELECT limite_profesionales_activos, limite_recepcionistas_activos FROM negocios WHERE id=1');
  expect(Number(saved.limite_profesionales_activos)).toBe(2);
  expect(Number(saved.limite_recepcionistas_activos)).toBe(2);
});

test('FALA-T033–T034: administrador ve cupos propios y no puede editar límites', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.getByRole('button', { name: 'Cambiar cupos de usuarios' })).toHaveCount(0);
  const [limits] = await rows('SELECT limite_profesionales_activos, limite_recepcionistas_activos FROM negocios WHERE id=1');
  await page.goto(`${origin()}/admin/profesionales`);
  await page.getByRole('button', { name: 'Nuevo profesional' }).first().click();
  await expect(page.getByRole('dialog')).toContainText(`Cupo vigente de profesionales: 2 de ${limits.limite_profesionales_activos}`);
  if (Number(limits.limite_profesionales_activos) === 2) {
    // El alta rechazada mantiene el texto capturado y no añade una cuenta.
    const form = page.getByRole('dialog');
    await form.getByLabel('Nombre completo').fill('Profesional Sin Cupo QA');
    await form.getByLabel('Especialidad').fill('Pruebas');
    await form.getByLabel('Correo').fill('sin-cupo-prof-qa@example.test');
    await form.getByLabel('Contraseña').fill('PruebaLicencia2026!');
    await form.getByRole('button', { name: 'Guardar' }).click();
    await expect(form).toContainText(/No hay cupo/i);
    await expect(form.getByLabel('Nombre completo')).toHaveValue('Profesional Sin Cupo QA');
    expect((await rows("SELECT id FROM usuarios WHERE email='sin-cupo-prof-qa@example.test'")).length).toBe(0);
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await page.goto(`${origin()}/admin/recepcionistas`);
  await page.getByRole('button', { name: 'Nueva recepcionista' }).first().click();
  await expect(page.getByRole('dialog')).toContainText(`Cupo vigente de recepcionistas: 1 de ${limits.limite_recepcionistas_activos}`);
});

test('FALA-T034: activación sin lugar conserva la cuenta inactiva y explica el rechazo', async ({ page, browser }) => {
  await login(page);
  await page.getByRole('button', { name: 'Cambiar cupos de usuarios' }).click();
  await page.getByRole('dialog').getByLabel('Límite de recepcionistas activos').fill('1');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const context = await browser.newContext();
  try {
    const admin = await context.newPage();
    await login(admin, 'admin');
    await admin.goto(`${origin()}/admin/recepcionistas`);
    await admin.getByRole('button', { name: 'Reactivar a Recepción Inactiva QA' }).click();
    const dialog = admin.getByRole('dialog');
    await expect(dialog).toContainText(/1 de 1 cuentas activas; 0 disponibles/);
    await dialog.getByRole('button', { name: 'Reactivar' }).click();
    await expect(dialog).toContainText(/No hay cupo/i);
    await expect(admin.getByText('Recepcionista reactivada.')).toHaveCount(0);
    const [account] = await rows("SELECT activo FROM usuarios WHERE email='recepcion-0-qa@example.test'");
    expect(Number(account.activo)).toBe(0);
  } finally { await context.close(); }
});

// Las capturas registran la sección real en ambos tamaños y temas; también
// comprueban que el formulario sigue operable sobre la navegación móvil.
test('FALA-T034: cupos visibles en escritorio y móvil, claro y oscuro', async ({ page }, testInfo) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Cupos de usuarios' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('quotas-desktop-light.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.screenshot({ path: testInfo.outputPath('quotas-desktop-dark.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Cupos de usuarios' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('quotas-mobile-dark.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Cambiar cupos de usuarios' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Guardar' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('quotas-dialog-mobile-dark.png'), animations: 'disabled' });
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await page.screenshot({ path: testInfo.outputPath('quotas-mobile-light.png'), fullPage: true, animations: 'disabled' });
});
