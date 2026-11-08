import { test, expect } from '@playwright/test';

// El mismo formulario pasa por 400, 503 y una escritura real en la base efímera;
// solo esta última puede cambiar el estado confirmado en la pantalla.
test('FALA-T048–T049: PUT completo y borrador estable ante 400/503', async ({ page }) => {
  await page.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/disponibilidad/negocio`);
  await page.getByLabel('Correo electrónico').fill('admin-qa-1@example.test');
  await page.locator('#login-password').fill('PruebaLicencia2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toHaveCount(0);
  await page.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/disponibilidad/negocio`);
  const form = page.locator('#agenda-configuration-form');
  await expect(form).toBeVisible();
  await form.locator('label.configuration-choice').nth(1).click();
  await form.locator('[name="tiempoEntreCitasMinutos"]').selectOption('5');
  await form.locator('[name="anticipacionMinutos"]').fill('20');
  await form.locator('[name="diasFuturos"]').fill('30');

  await page.route('**/disponibilidad/configuracion', (route) => route.request().method() === 'PUT'
    ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'tiempoEntreCitasMinutos inválido' }) })
    : route.continue());
  await form.getByRole('button', { name: 'Guardar reglas' }).click();
  await expect(form.locator('[data-availability-field="tiempoEntreCitasMinutos"]')).toContainText('inválido');
  await expect(form.locator('[name="tiempoEntreCitasMinutos"]')).toHaveValue('5');
  await expect(form.locator('[name="anticipacionMinutos"]')).toHaveValue('20');
  await page.unroute('**/disponibilidad/configuracion');

  await page.route('**/disponibilidad/configuracion', (route) => route.request().method() === 'PUT'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Servicio no disponible' }) })
    : route.continue());
  await form.getByRole('button', { name: 'Guardar reglas' }).click();
  await expect(page.getByText('Servicio no disponible')).toBeVisible();
  await expect(form.locator('[name="diasFuturos"]')).toHaveValue('30');
  await page.unroute('**/disponibilidad/configuracion');

  const response = page.waitForResponse((item) => item.url().endsWith('/disponibilidad/configuracion') && item.request().method() === 'PUT');
  await form.getByRole('button', { name: 'Guardar reglas' }).click();
  const saved = await response;
  expect(saved.status()).toBe(200);
  expect(saved.request().postDataJSON()).toEqual({ modo: 'agenda_compacta', tiempoEntreCitasMinutos: 5,
    anticipacionMinutos: 20, diasFuturos: 30 });
  await expect(form.locator('[name="tiempoEntreCitasMinutos"]')).toHaveValue('5');
  await expect(page.getByText('Servicio no disponible')).toHaveCount(0);
  // Capturas de revisión del formulario conectado en los dos anchos y temas.
  await expect(page.locator('.app-toast')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/agenda-desktop-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.admin-layout')).not.toHaveClass(/menu-open/);
  await page.screenshot({ path: 'test-results/agenda-desktop-dark.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/agenda-mobile-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/agenda-mobile-light.png', fullPage: true });
});

// El formulario semanal manda la sustitución real del horario. El hueco de
// 12:00 a 13:00 queda entre dos filas, sin campos de descanso incrustados.
test('FALA-T050: dos franjas semanales representan la pausa en la API', async ({ page }) => {
  await page.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/disponibilidad/equipo`);
  await page.getByLabel('Correo electrónico').fill('admin-qa-1@example.test');
  await page.locator('#login-password').fill('PruebaLicencia2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toHaveCount(0);
  await page.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/disponibilidad/equipo`);
  await page.getByRole('tab', { name: 'Horario semanal' }).click();
  const monday = page.locator('[data-schedule-row][data-schedule-day="1"]');
  await expect(monday.first()).toBeVisible();
  await monday.first().locator('input[name^="start-"]').fill('09:00');
  await monday.first().locator('input[name^="end-"]').fill('12:00');
  await monday.first().locator('[data-add-schedule="1"]').click();
  await expect(monday).toHaveCount(2);
  await monday.nth(1).locator('input[name^="start-"]').fill('13:00');
  await monday.nth(1).locator('input[name^="end-"]').fill('17:00');
  const response = page.waitForResponse((item) => /\/profesionales\/\d+\/horario$/.test(item.url()) && item.request().method() === 'PUT');
  await page.locator('#schedule-form').getByRole('button', { name: 'Guardar horario' }).click();
  const saved = await response;
  expect(saved.status()).toBe(200);
  const sent = saved.request().postDataJSON().franjas.filter((row) => row.diaSemana === 1 && row.activo);
  expect(sent).toHaveLength(2);
  expect(sent.map(({ inicioMinutos, finMinutos }) => [inicioMinutos, finMinutos])).toEqual([[540, 720], [780, 1020]]);
  expect(sent.every((row) => !Object.hasOwn(row, 'descansoInicioMinutos') && !Object.hasOwn(row, 'descansoFinMinutos'))).toBe(true);
});
