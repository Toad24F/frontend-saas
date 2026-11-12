import { test, expect } from '@playwright/test';

import { setup } from './agenda-fixture.js';

test('T088: navegación y rutas directas por los cuatro roles', async ({ page }) => {
  for (const role of ['admin_negocio', 'recepcionista', 'profesional', 'superadmin']) {
    await page.unrouteAll({ behavior: 'wait' });
    const { seen, errors } = await setup(page, role);
    await page.goto('/admin/agenda');
    if (role === 'superadmin') {
      await expect(page).toHaveURL(/\/admin\/plataforma/);
      expect(seen).not.toContain('GET /citas');
    } else {
      await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
      await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
      await expect(page.locator('.sidebar [data-nav="clientes"]')).toHaveCount(role === 'profesional' ? 0 : 1);
      await page.goto('/admin/clientes');
      if (role === 'profesional') await expect(page).toHaveURL(/\/admin\/agenda/);
      else await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
      // Desde T098 la ruta consulta clientes solo para Administración y Recepción.
      expect(seen.some((entry) => /\/clientes/.test(entry))).toBe(role !== 'profesional');
    }
    expect(errors).toEqual([]);
  }
});
test('T090–T092: vistas, filtros locales, error de refresco, detalle e historial', async ({ page }) => {
  const { seen, errors } = await setup(page);
  await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  for (const view of ['month', 'day', 'week']) {
    await page.locator(`[data-m4-view="${view}"]`).click();
    await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
    if (view === 'month') await expect(page.locator('[data-m4-date]')).toHaveCount(42);
  }
  await page.getByLabel('Buscar paciente').fill('vacío');
  await expect(page.getByText('Sin citas en este periodo')).toBeVisible();
  await expect(page.getByLabel('Buscar paciente')).toBeFocused();
  await page.getByLabel('Buscar paciente').fill('');
  await page.getByLabel('Buscar paciente').press('Enter');
  let failure = null;
  await page.route((url) => url.pathname === '/citas', async (route) => {
    if (!failure) { await route.fallback(); return; }
    await route.fulfill({ status: failure, json: { message: failure === 400 ? 'La consulta supera 1.000 citas. Acota el periodo o los filtros.' : 'Temporal' } });
  });
  failure = 503;
  await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(page.locator('[data-live-warning]')).toBeVisible();
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  failure = 400;
  await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(page.locator('[data-m4-error]')).toBeVisible();
  await expect(page.locator('.agenda-summary')).toContainText('Resumen no disponible');
  failure = null;
  await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  const reads = seen.filter((x) => x === 'GET /citas').length;
  await page.getByLabel('Sucursal').selectOption('1');
  await page.getByLabel('Profesional', { exact: true }).selectOption('1');
  await page.getByLabel('Estado', { exact: true }).selectOption('confirmada');
  expect(seen.filter((x) => x === 'GET /citas').length).toBe(reads);
  await page.locator('[data-m4-appointment="7"]').click();
  const dialog = page.getByRole('dialog');
  for (const text of ['6145550101', '2026-11-12', 'America/Tijuana', 'Nota <segura>', 'Sin registro histórico', '9007199254740993']) await expect(dialog).toContainText(text);
  await dialog.getByRole('button', { name: 'Siguiente página' }).click();
  await expect(dialog).toContainText('9007199254740994');
  await dialog.getByRole('button', { name: 'Página anterior' }).click();
  await expect(dialog).toContainText('9007199254740993');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeFocused();
  expect(seen.every((entry) => entry.startsWith('GET '))).toBe(true);
  expect(errors).toEqual([]);
});
test('T091: filtro local conserva borrador y foco ante un refresco remoto tardío', async ({ page }) => {
  await setup(page); await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  await page.route((url) => url.pathname === '/citas', async (route) => {
    const url = new URL(route.request().url()); await barrier;
    await route.fulfill({ json: { desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta'), citas: [] } });
  });
  const pending = page.waitForRequest((request) => new URL(request.url()).pathname === '/citas');
  await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click(); await pending;
  await page.getByLabel('Buscar paciente').fill('Paciente');
  await page.getByLabel('Buscar paciente').press('Enter');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  const response = page.waitForResponse((request) => new URL(request.url()).pathname === '/citas');
  release(); await response;
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  await expect(page.getByLabel('Buscar paciente')).toHaveValue('Paciente');
  await expect(page.getByLabel('Buscar paciente')).toBeFocused();
});
test('T092: fallo de historial conserva contacto, permite reintentar; detalle denegado no usa la demo', async ({ page }) => {
  await setup(page);
  await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  await page.route((url) => url.pathname === '/citas/7/historial', (route) => route.fulfill({ status: 503, json: { message: 'Temporal' } }));
  await page.locator('[data-m4-appointment="7"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('6145550101');
  await expect(dialog.locator('[data-m4-error]')).toBeVisible();
  await page.unroute((url) => url.pathname === '/citas/7/historial');
  // Un manejador posterior sustituye únicamente el fallo anterior, sin tocar la API real.
  await page.route((url) => url.pathname === '/citas/7/historial', (route) => route.fulfill({ json: { pagina: 1, limite: 50, hayMas: false, eventos: [] } }));
  await dialog.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(dialog).toContainText('Sin eventos registrados.');
  await page.keyboard.press('Escape');
  await page.route((url) => url.pathname === '/citas/7', (route) => route.fulfill({ status: 404, json: { message: 'No encontrado' } }));
  await page.locator('[data-m4-appointment="7"]').click();
  await expect(dialog).toContainText('no está disponible para tu cuenta');
  await expect(dialog).not.toContainText('6145550101');
});
for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`T090/T092: revisión ${width}px ${theme}, conectado y demo`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { errors } = await setup(page, 'recepcionista', theme);
    await page.goto('/admin/agenda');
    await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
    for (const view of ['day', 'week', 'month']) {
      await page.locator(`[data-m4-view="${view}"]`).click();
      await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
      if (view !== 'month') await expect(page.locator('.week-calendar .calendar-event')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.locator('[data-m4-appointment="7"]').click();
    await expect(page.getByRole('dialog')).toContainText('Nota <segura>');
    // El detalle largo debe aislar el texto del calendario y permitir llegar a su historial.
    // Esperar la transición vigente de tema; no medir un fotograma intermedio de la interpolación.
    await expect.poll(() => page.getByRole('dialog').evaluate((dialog) => getComputedStyle(dialog).backgroundColor)).toMatch(/^rgb\(/);
    await page.getByRole('dialog').getByRole('heading', { name: 'Historial de la cita' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Siguiente página' })).toBeVisible();
    await page.screenshot({ path: `test-results/m4/detail-${width}-${theme}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `test-results/m4/agenda-${width}-${theme}.png`, fullPage: true });
    await page.goto('/admin/agenda?demo=1');
    await expect(page.locator('[data-appointment]').first()).toBeVisible();
    // El diseño existente oculta esta nota en móvil; se comprueba su presencia y el modo explícito.
    await expect(page.getByText('Datos ficticios', { exact: true })).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('data-app-mode', 'demo');
    await page.screenshot({ path: `test-results/m4/demo-${width}-${theme}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

// La demo es la referencia viva: mismos datos y fecha para comparar geometría y estilos, no solo capturas aisladas.
test('paridad con demo: métricas, filtros, cuadrícula y tarjetas en ambos temas y tamaños', async ({ page, context }) => {
  await page.goto('/admin/agenda?demo=1');
  await expect(page.locator('[data-appointment]').first()).toBeVisible();
  const demo = await page.evaluate(async () => (await import('/src/shared/data.js')).db);
  const connected = await context.newPage();
  await connected.clock.setFixedTime(new Date('2026-09-08T18:00:00Z'));
  await setup(connected);
  await connected.route((url) => url.pathname === '/citas', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const desde = query.get('desde'), hasta = query.get('hasta');
    const citas = demo.appointments.filter((item) => item.tenantId === 1 && item.date >= desde && item.date <= hasta).map((item) => ({
      id: item.id, version: 1, estado: item.status, origen: item.origin, fechaLocal: item.date, fechaFinLocal: item.date,
      horaInicio: `${item.start}:00`, horaFin: `${item.end}:00`, sucursalId: item.branchId, personalId: item.professionalId,
      nombreContacto: demo.clients.find((row) => row.id === item.clientId).name,
      nombreServicio: demo.services.find((row) => row.id === item.serviceId).name,
      nombreProfesional: demo.professionals.find((row) => row.id === item.professionalId).name,
      zonaHoraria: 'America/Chihuahua', causas: [],
    }));
    await route.fulfill({ json: { desde, hasta, citas } });
  });
  // Solo estilos estructurales que deben coincidir; contacto, permisos y controles de escritura difieren por contrato.
  const properties = ['fontFamily', 'fontSize', 'fontWeight', 'padding', 'borderRadius', 'backgroundColor', 'color', 'gridTemplateColumns'];
  const inspect = (target, selector) => target.locator(selector).first().evaluate((element, properties) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(properties.map((key) => [key, style[key]]));
  }, properties);
  for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
    for (const target of [page, connected]) {
      await target.setViewportSize({ width, height: 900 });
      await target.addInitScript((theme) => localStorage.setItem('cita-theme', theme), theme);
    }
    await page.goto('/admin/agenda?demo=1'); await connected.goto('/admin/agenda');
    await expect(connected.locator('[data-m4-appointment]').first()).toBeVisible();
    await expect(page.locator('[data-appointment]').first()).toBeVisible();
    for (const selector of ['.page-heading h1', '.agenda-summary', '.calendar-panel', '.calendar-toolbar', '.filter-select', '.segmented', '.week-header', '.calendar-event.confirmada']) {
      await expect.poll(async () => JSON.stringify(await inspect(connected, selector))).toBe(JSON.stringify(await inspect(page, selector)));
    }
    await expect(connected.locator('.agenda-summary strong')).toHaveText(await page.locator('.agenda-summary strong').textContent());
    await expect(connected.locator('.calendar-event')).toHaveCount(await page.locator('.calendar-event').count());
    await connected.screenshot({ path: `test-results/m4/paridad-conectado-${width}-${theme}.png`, fullPage: true });
    await page.screenshot({ path: `test-results/m4/paridad-demo-${width}-${theme}.png`, fullPage: true });
    await page.locator('[data-view="month"]').click();
    await connected.locator('[data-m4-view="month"]').click();
    await expect(connected.locator('.month-day')).toHaveCount(42);
    for (const selector of ['.month-calendar', '.month-label', '.month-day', '.month-event.confirmada']) {
      await expect.poll(async () => JSON.stringify(await inspect(connected, selector))).toBe(JSON.stringify(await inspect(page, selector)));
    }
    await connected.locator('.month-more').first().click();
    await page.locator('.month-more').first().click();
    await expect(connected.locator('.single-day .calendar-event')).toHaveCount(await page.locator('.single-day .calendar-event').count());
  }
  await connected.close();
});
