import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`agenda refinada ${width}px ${theme}: skeleton, leyenda, densidad y panel`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { errors } = await setup(page, 'recepcionista', theme);
    let release;
    const barrier = new Promise((resolve) => { release = resolve; });
    await page.route((url) => url.pathname === '/citas', async (route) => { await barrier; await route.fallback(); });
    await page.goto('/admin/agenda');
    await expect(page.locator('[data-agenda-skeleton]')).toBeVisible();
    await expect(page.locator('.agenda-summary')).toContainText('Cargando citas');
    await expect(page.locator('.stat-caption')).toHaveCount(0);
    await expect(page.locator('.calendar-toolbar .legend')).toContainText('Confirmada');
    expect(await page.locator('.calendar-toolbar').evaluate((el) => {
      const today = el.querySelector('.btn-today'), legend = el.querySelector('.legend'), views = el.querySelector('.segmented');
      return Boolean(today.compareDocumentPosition(legend) & 4) && Boolean(legend.compareDocumentPosition(views) & 4);
    })).toBe(true);
    // El estado de carga se captura después de la entrada de pantalla existente, no durante su fundido.
    await expect(page.locator('.agenda-summary')).toBeVisible();
    await page.screenshot({ path: `test-results/m4/skeleton-${width}-${theme}.png` });
    release();
    await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
    await page.route((url) => url.pathname === '/citas', async (route) => {
      const query = new URL(route.request().url()).searchParams, day = query.get('desde');
      const citas = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, version: 1, folio: `M-DENSE-${String(i + 1).padStart(5, '0')}`, estado: 'confirmada', origen: 'manual', nombreContacto: `Paciente ${i + 1}`, nombreServicio: 'Consulta', nombreProfesional: 'Profesional QA', nombreSucursal: 'Sucursal QA', sucursalId: 1, personalId: 1, fechaLocal: day, fechaFinLocal: day, horaInicio: `${String(9 + Math.floor(i / 4)).padStart(2, '0')}:${String(i % 4 * 15).padStart(2, '0')}:00`, horaFin: `${String(9 + Math.floor((i + 1) / 4)).padStart(2, '0')}:${String((i + 1) % 4 * 15).padStart(2, '0')}:00`, zonaHoraria: 'America/Tijuana', causas: [] }));
      await route.fulfill({ json: { desde: day, hasta: query.get('hasta'), citas } });
    });
    // Móvil ya inicia en Día: cambiar de periodo fuerza la consulta de la fixture densa en ambos tamaños.
    await page.locator('[data-m4-view="week"]').click();
    await page.locator('[data-m4-view="day"]').click();
    await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
    await expect(page.locator('.calendar-event')).toHaveCount(8);
    expect(await page.locator('.calendar-event').evaluateAll((items) => {
      const rects = items.map((el) => el.getBoundingClientRect());
      return rects.every((a, i) => rects.slice(i + 1).every((b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) <= 1 || Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) <= 1));
    })).toBe(true);
    await expect(page.locator('.calendar-event .event-folio')).toHaveCount(8);
    await expect(page.locator('[data-m4-appointment="7"]')).toHaveAttribute('aria-label', /M-DENSE-00007/);
    await page.locator('.calendar-event').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/m4/dense-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('[data-m4-appointment="7"]').click();
    const panel = page.getByRole('dialog');
    await expect(panel).toHaveClass(/agenda-drawer/);
    await expect(panel).toContainText('Historial de la cita');
    await expect.poll(() => panel.evaluate((el) => Math.abs(el.getBoundingClientRect().right - innerWidth) < 1)).toBe(true);
    await page.getByRole('button', { name: 'Guardar estado', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Guardar estado', exact: true })).toBeInViewport();
    await page.screenshot({ path: `test-results/m4/panel-${width}-${theme}.png` });
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-m4-appointment="7"]')).toBeFocused();
    expect(errors).toEqual([]);
  });
}
test('paneles conservan borradores de alta y estado al cerrar sin guardar', async ({ page }) => {
  await setup(page); await page.goto('/admin/agenda');
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  await page.getByLabel('Nombre completo', { exact: true }).fill('Borrador pendiente');
  await page.getByLabel('Notas de consulta').fill('Conservar estas notas');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Borrador pendiente');
  await expect(page.getByLabel('Notas de consulta')).toHaveValue('Conservar estas notas');
  await expect(page.locator('[name="horario"]')).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('[data-m4-appointment="7"]').click();
  await page.getByLabel('Estado de la cita').selectOption('cancelada');
  await page.getByLabel('Motivo del cambio').fill('Borrador de motivo');
  await page.keyboard.press('Escape');
  await page.locator('[data-m4-appointment="7"]').click();
  await expect(page.getByLabel('Estado de la cita')).toHaveValue('cancelada');
  await expect(page.getByLabel('Motivo del cambio')).toHaveValue('Borrador de motivo');
});
test('demo conserva las mismas mejoras y reduce animación cuando se solicita', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin/agenda?demo=1');
  await expect(page.locator('.calendar-toolbar .legend')).toContainText('No asistió');
  await expect(page.locator('.stat-caption')).toHaveCount(0);
  // En columnas estrechas el folio cede espacio a hora/paciente; sigue disponible en el nombre accesible.
  await expect(page.locator('.calendar-event').first()).toHaveAttribute('aria-label', /Folio/);
  await page.locator('[data-appointment]').first().click();
  await expect(page.getByRole('dialog')).toHaveClass(/agenda-drawer/);
  await expect.poll(() => page.getByRole('dialog').evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/^rgb\(/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveClass(/agenda-drawer/);
});
