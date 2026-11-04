import { test, expect } from '@playwright/test';
import { rows } from './support.js';

const origin = () => process.env.PORTAL_TEST_ORIGIN;
async function login(page, role = 'superadmin') {
  await page.goto(`${origin()}/admin/negocio/1`);
  await page.getByLabel('Correo electrónico').fill(`${role}-qa${role === 'superadmin' ? '' : '-1'}@example.test`);
  await page.locator('#login-password').fill('PruebaLicencia2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
}
async function detail(page) {
  await expect(page.getByRole('heading', { name: 'Licencia y cupo' })).toBeVisible();
}

// Todos los cambios van a la base efímera y usan la cuenta superadmin ficticia.
test('FALA-T030: plazo 0/2/30, suspensión y renovación usan estado real', async ({ page }) => {
  await login(page); await detail(page);
  await page.getByRole('button', { name: 'Programar suspensión' }).click();
  const delay = page.getByLabel('Plazo en días');
  await expect(delay).toHaveValue('2');
  await delay.fill('31');
  expect(await delay.evaluate((input) => input.checkValidity())).toBe(false);
  await delay.fill('0');
  await page.getByRole('dialog').getByRole('button', { name: 'Programar suspensión' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reactivar licencia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Programar suspensión' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Renovar un año' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Renovar un año' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reactivar licencia' })).toBeVisible();
  const first = await rows('SELECT plazo_suspension_dias FROM licencias WHERE negocio_id=1');
  expect(Number(first[0].plazo_suspension_dias)).toBe(0);
  // La segunda licencia conserva el valor predeterminado del formulario.
  await page.goto(`${origin()}/admin/negocio/2`); await detail(page);
  await page.getByRole('button', { name: 'Programar suspensión' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Programar suspensión' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reactivar licencia' })).toBeVisible();
  expect(Number((await rows('SELECT plazo_suspension_dias FROM licencias WHERE negocio_id=2'))[0].plazo_suspension_dias)).toBe(2);
  await page.getByRole('button', { name: 'Reactivar licencia' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivar licencia' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Programar suspensión' })).toBeVisible();
  await page.getByRole('button', { name: 'Programar suspensión' }).click();
  await page.getByLabel('Plazo en días').fill('30');
  await page.getByRole('dialog').getByRole('button', { name: 'Programar suspensión' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(Number((await rows('SELECT plazo_suspension_dias FROM licencias WHERE negocio_id=2'))[0].plazo_suspension_dias)).toBe(30);
});

// Se pierde solo la respuesta del primer POST: repetir debe devolver la misma
// transición y no añadir una segunda anualidad al vencimiento persistido.
test('FALA-T030: respuesta perdida mantiene clave y bloquea nueva renovación', async ({ page }) => {
  await login(page); await detail(page);
  const before = (await rows('SELECT vence_en FROM licencias WHERE negocio_id=1'))[0].vence_en;
  let lost = false;
  await page.route('**/licencias/1/renovar', async (route) => {
    if (lost) { await route.continue(); return; }
    lost = true; await route.fetch(); await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Renovar un año' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Renovar un año' }).click();
  await expect(page.getByRole('dialog')).toContainText(/conectar|pendiente/i);
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await page.reload(); await detail(page);
  await expect(page.getByRole('button', { name: 'Renovar un año' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Comprobar operación' }).click();
  await expect(page.getByRole('button', { name: 'Renovar un año' })).toBeVisible();
  const after = (await rows('SELECT vence_en FROM licencias WHERE negocio_id=1'))[0].vence_en;
  expect(new Date(after).getUTCFullYear()).toBe(new Date(before).getUTCFullYear() + 1);
});

test('FALA-T029–T030: avisos se muestran por estado y otro rol carece de acciones', async ({ page, browser }) => {
  await login(page); await detail(page);
  await page.route('**/negocios/1/envios', (route) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(['pendiente', 'fallido', 'enviado'].map((estado, index) => ({ id: index + 1,
      tipo: 'aviso_licencia', estado, intentos: index, confirmadoEn: null, proximoIntentoEn: null }))) }));
  await page.reload(); await detail(page);
  await expect(page.getByRole('heading', { name: 'Historial de correos' })).toBeVisible();
  for (const label of ['Pendiente', 'Fallido', 'Enviado']) await expect(page.locator('.soft-tag', { hasText: label }).first()).toBeVisible();
  const admin = await browser.newContext();
  try {
    const other = await admin.newPage();
    await login(other, 'admin');
    await expect(other.getByRole('button', { name: 'Programar suspensión' })).toHaveCount(0);
    await expect(other.getByRole('button', { name: 'Renovar un año' })).toHaveCount(0);
  } finally { await admin.close(); }
});

// Estas capturas permiten revisar el detalle y el diálogo real en los cuatro
// contextos visuales; la prueba también detecta desborde horizontal del panel.
test('FALA-T030: detalle y plazo visibles en escritorio y móvil, claro y oscuro', async ({ page }, testInfo) => {
  await login(page); await detail(page);
  // El lote anterior puede dejar suspendido al negocio de prueba; se devuelve
  // a vigente antes de inspeccionar el formulario de una nueva suspensión.
  if (await page.getByRole('button', { name: 'Reactivar licencia' }).isVisible()) {
    await page.getByRole('button', { name: 'Reactivar licencia' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reactivar licencia' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Programar suspensión' })).toBeVisible();
  }
  await expect(page.locator('#toast-region .app-toast')).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('license-desktop-light.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Programar suspensión' }).click();
  await page.screenshot({ path: testInfo.outputPath('license-dialog-desktop-light.png'), animations: 'disabled' });
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('license-desktop-dark.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.evaluate(() => scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('license-mobile-dark.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Programar suspensión' }).click();
  const submit = page.getByRole('dialog').getByRole('button', { name: 'Programar suspensión' });
  expect(await submit.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === button;
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('license-dialog-mobile-dark.png'), animations: 'disabled' });
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('license-mobile-light.png'), fullPage: true, animations: 'disabled' });
});
