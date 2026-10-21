import { test, expect } from '@playwright/test';
import { portalUrl, rows } from './support.js';

const dateAt = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

// Los selectores siguen controles accesibles; cada caso toma otra fecha para
// evitar que sus citas y apartados compitan entre sí dentro de la base efímera.
async function chooseSlot(page, offset, index = 0, business = 1, apart = true) {
  await page.goto(portalUrl(business));
  await page.getByRole('radio', { name: /Corte QA/ }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('radio', { name: /Sucursal QA/ }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('radio', { name: /Profesional QA/ }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Fecha de tu cita').fill(dateAt(offset));
  await expect(page.locator('[data-slot]').nth(index)).toBeEnabled();
  await page.locator('[data-slot]').nth(index).check();
  const selected = await page.locator('[data-slot]:checked').getAttribute('value');
  if (apart) {
    await page.getByRole('button', { name: 'Apartar este horario' }).click();
    await expect(page.getByRole('heading', { name: 'Cuéntanos de ti' })).toBeVisible();
  }
  return selected;
}

async function fillContact(page, notes = '') {
  await page.getByLabel('Nombre completo').fill('Cliente de prueba');
  await page.getByLabel('Teléfono mexicano').fill('6141234567');
  await page.getByLabel(/Notas o motivo/).fill(notes);
}

async function reserve(page, notes = '') {
  await fillContact(page, notes);
  await page.getByRole('button', { name: 'Reservar' }).click();
  await expect(page.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible();
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
  return page.locator('.public-result-folio').innerText();
}

// T117 abre el portal conectado contra los servidores y la base efímera del runner.
test('T117: inicia la página pública con la oferta real de prueba', async ({ page }) => {
  await page.goto(portalUrl());
  await expect(page.getByRole('heading', { name: 'Tu próxima cita' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Elige tu servicio' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Corte/ })).toBeVisible();
});

test('T118: móvil corrige contacto y confirma exactamente una cita pendiente', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await chooseSlot(page, 3);
    await page.getByRole('button', { name: 'Revisar datos' }).click();
    await expect(page.getByLabel('Nombre completo')).toHaveAttribute('aria-invalid', 'true');
    await fillContact(page);
    await page.getByRole('button', { name: 'Revisar datos' }).click();
    await expect(page.locator('#contact-checked')).toBeVisible();
    const folio = await reserve(page);
    expect(folio).toMatch(/^P-[A-F0-9]{18}$/);
    const citations = await rows('SELECT folio,estado,origen FROM citas WHERE folio=?', [folio]);
    expect(citations).toEqual([{ folio, estado: 'pendiente', origen: 'portal_publico' }]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});

test('T119: teclado, foco y notas HTML se mantienen como texto seguro', async ({ page }) => {
  await page.goto(portalUrl());
  for (const name of [/Corte QA/, /Sucursal QA/, /Profesional QA/]) {
    await page.getByRole('radio', { name }).focus();
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Continuar' }).focus();
    await page.keyboard.press('Enter');
  }
  await page.getByLabel('Fecha de tu cita').fill(dateAt(4));
  await expect(page.locator('[data-slot]').first()).toBeEnabled();
  await page.locator('[data-slot]').first().focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Apartar este horario' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Cuéntanos de ti' })).toBeFocused();
  await page.getByLabel('Nombre completo').focus();
  await page.keyboard.type('Cliente de teclado');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Teléfono mexicano')).toBeFocused();
  await page.keyboard.type('6141234567');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/Notas o motivo/)).toBeFocused();
  const note = '<img src=x onerror="window.__portalInjected=1">';
  await page.keyboard.type(note);
  await page.getByRole('button', { name: 'Revisar datos' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contact-checked')).toBeVisible();
  await page.getByRole('button', { name: 'Reservar' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible();
  expect(await page.evaluate(() => window.__portalInjected ?? 0)).toBe(0);
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  const folio = await page.locator('.public-result-folio').innerText();
  expect((await rows('SELECT motivo_consulta FROM citas WHERE folio=?', [folio]))[0].motivo_consulta).toBe(note);
});

test('T120: pestañas hermanas comparten sesión y avisan al sustituir el apartado', async ({ context, page }) => {
  await chooseSlot(page, 5, 0);
  const second = await context.newPage();
  try {
    await chooseSlot(second, 5, 1);
    await expect(page.locator('.public-hold-notice')).toContainText('ya no está disponible en esta pestaña');
    await expect(page.getByRole('button', { name: 'Reservar' })).toBeDisabled();
    const sessions = await rows('SELECT COUNT(*) n FROM sesiones_reserva_publica WHERE negocio_id=(SELECT id FROM negocios WHERE slug=?)', ['portal-qa-1']);
    expect(Number(sessions[0].n)).toBeGreaterThan(0);
    const holds = await rows(`SELECT COUNT(*) n FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
      WHERE n.slug='portal-qa-1' AND b.liberado_en IS NULL AND b.expira_en > UTC_TIMESTAMP()`);
    expect(Number(holds[0].n)).toBe(1);
    const previousId = (await rows(`SELECT MAX(b.id) AS id FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
      WHERE n.slug='portal-qa-1'`))[0].id;
    const challenger = await context.newPage();
    const outsider = await context.browser().newContext();
    const outsiderPage = await outsider.newPage();
    try {
      await chooseSlot(challenger, 11, 0, 1, false);
      await chooseSlot(outsiderPage, 11, 0);
      await challenger.getByRole('button', { name: 'Apartar este horario' }).click();
      await expect(challenger.getByRole('heading', { name: 'Un espacio en tu día' })).toBeVisible();
      await expect(second.locator('.public-hold-notice')).toContainText('ya no está disponible');
      const previous = await rows('SELECT liberado_en FROM bloqueos_temporales WHERE id=?', [previousId]);
      expect(previous[0].liberado_en).not.toBeNull();
    } finally { await challenger.close(); await outsider.close(); }
  } finally { await second.close(); }
});

test('T121: navegadores aislados disputan un horario sin doble ocupación', async ({ browser }) => {
  const first = await browser.newContext();
  const other = await browser.newContext();
  const a = await first.newPage(); const b = await other.newPage();
  try {
    const occupied = await chooseSlot(a, 6, 0);
    const hold = (await rows(`SELECT b.id FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
      WHERE n.slug='portal-qa-1' ORDER BY b.id DESC LIMIT 1`))[0].id;
    await b.goto(portalUrl());
    await expect(b.getByRole('heading', { name: 'Elige tu servicio' })).toBeVisible();
    const foreign = await b.evaluate(async (id) => {
      const response = await fetch(`/publico/negocios/portal-qa-1/apartados/${id}`, { credentials: 'same-origin' });
      return response.status;
    }, hold);
    expect(foreign).toBe(404);
    await b.getByRole('radio', { name: /Corte QA/ }).check();
    await b.getByRole('button', { name: 'Continuar' }).click();
    await b.getByRole('radio', { name: /Sucursal QA/ }).check();
    await b.getByRole('button', { name: 'Continuar' }).click();
    await b.getByRole('radio', { name: /Profesional QA/ }).check();
    await b.getByRole('button', { name: 'Continuar' }).click();
    await b.getByLabel('Fecha de tu cita').fill(dateAt(6));
    await expect(b.locator('[data-slot]').first()).toBeVisible();
    // La disponibilidad descarta un apartado ajeno ya confirmado.
    expect(await b.locator(`[data-slot][value="${occupied}"]`).count()).toBe(0);
    await chooseSlot(b, 12, 0, 1, false);
    await chooseSlot(a, 12, 0);
    await b.getByRole('button', { name: 'Apartar este horario' }).click();
    await expect(b.getByRole('heading', { name: 'Un espacio en tu día' })).toBeVisible();
    const matching = await rows(`SELECT COUNT(*) n FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
      WHERE n.slug='portal-qa-1' AND b.liberado_en IS NULL AND b.expira_en > UTC_TIMESTAMP()`);
    expect(Number(matching[0].n)).toBe(1);
    const folio = await reserve(a);
    const attempt = (await rows(`SELECT i.clave,i.apartado_id AS apartadoId FROM intentos_reserva_publica i
      JOIN citas c ON c.id=i.cita_id WHERE c.folio=?`, [folio]))[0];
    const foreignResult = await b.evaluate(async ({ clave, apartadoId }) => {
      const base = '/publico/negocios/portal-qa-1';
      const session = await fetch(`${base}/sesion`, { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Portal-Inicializacion': '1' }, body: '{}' });
      const { csrfToken } = await session.json();
      const result = await fetch(`${base}/intentos/${clave}/resolver`, { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ apartadoId }) });
      return result.status;
    }, attempt);
    expect(foreignResult).toBe(404);
  } finally { await first.close(); await other.close(); }
});

test('T122: recarga limpia contacto, salida libera y cookies ausentes bloquean', async ({ browser, page }) => {
  await chooseSlot(page, 7);
  const abandonedId = (await rows(`SELECT MAX(b.id) AS id FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
    WHERE n.slug='portal-qa-1'`))[0].id;
  await fillContact(page, 'Privado temporal');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Elige tu servicio' })).toBeVisible();
  expect(await page.locator('#contact-nombre').count()).toBe(0);
  await expect.poll(async () => (await rows('SELECT liberado_en FROM bloqueos_temporales WHERE id=?', [abandonedId]))[0].liberado_en !== null).toBe(true);
  const context = await browser.newContext();
  const blocked = await context.newPage();
  try {
    await blocked.route('**/publico/negocios/*/sesion', async (route) => {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers['set-cookie'];
      await context.clearCookies();
      await route.fulfill({ response, headers });
    });
    await blocked.goto(portalUrl());
    await expect(blocked.getByText(/no conserva la cookie/)).toBeVisible();
  } finally { await context.close(); }
});

test('T123: respuesta perdida tras commit recupera el mismo folio', async ({ page }) => {
  await chooseSlot(page, 8);
  await fillContact(page);
  await page.route('**/intentos/*/reservar', async (route) => {
    await route.fetch();
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Reservar' }).click();
  await expect(page.getByRole('heading', { name: 'Comprueba tu envío' })).toBeVisible();
  const before = await rows("SELECT folio FROM citas WHERE origen='portal_publico' ORDER BY id DESC LIMIT 1");
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible();
  expect(await page.locator('.public-result-folio').innerText()).toBe(before[0].folio);
});

test('T123: pérdida anterior al escritor termina sin cita tardía', async ({ page }) => {
  await chooseSlot(page, 9);
  await fillContact(page);
  const before = Number((await rows("SELECT COUNT(*) n FROM citas WHERE origen='portal_publico'"))[0].n);
  await page.route('**/intentos/*/reservar', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Reservar' }).click();
  await expect(page.getByRole('heading', { name: 'Comprueba tu envío' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Elige tu servicio' })).toBeVisible();
  expect(Number((await rows("SELECT COUNT(*) n FROM citas WHERE origen='portal_publico'"))[0].n)).toBe(before);
});

test('T124: reloj cambiado y pestaña reactivada no prolongan un apartado vencido', async ({ page }) => {
  test.setTimeout(360_000);
  await chooseSlot(page, 10);
  const before = await page.locator('#public-hold-time').innerText();
  await page.clock.install();
  await page.clock.setFixedTime(new Date(Date.now() - 30 * 86400000));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#public-hold-time')).not.toHaveText('0:00');
  const hold = (await rows(`SELECT b.id,TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), b.expira_en) AS seconds_left FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
    WHERE n.slug='portal-qa-1' ORDER BY b.id DESC LIMIT 1`))[0];
  expect(before).toMatch(/^[0-5]:\d{2}$/);
  const tab = await page.context().newPage();
  await tab.bringToFront();
  // La espera usa la expiración de cinco minutos del servidor. No altera la
  // expiración persistida ni acelera artificialmente el reloj de MariaDB.
  await page.waitForTimeout(Math.max(0, Number(hold.seconds_left) * 1000 + 2100));
  await tab.close();
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.public-hold-notice')).toContainText('apartado venció');
  await expect(page.getByRole('button', { name: 'Reservar' })).toBeDisabled();
});
