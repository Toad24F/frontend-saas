import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

async function prepare(page, theme = 'light') {
  const fixture = await setup(page, 'recepcionista', theme);
  const calls = [];
  await page.route((url) => url.pathname === '/citas', async (route) => {
    const url = new URL(route.request().url()); calls.push(url.search);
    const desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta');
    await route.fulfill({ json: { desde, hasta, citas: Array.from({ length: 12 }, (_, i) => ({
      id: i + 1, version: 1, folio: `QA-${i + 1}`, estado: 'confirmada', nombreContacto: `Paciente ${i + 1}`,
      nombreServicio: 'Consulta', nombreProfesional: 'Profesional QA', nombreSucursal: 'Sede QA',
      personalId: 1, sucursalId: 1, fechaLocal: desde, fechaFinLocal: desde,
      horaInicio: '12:00:00', horaFin: '12:45:00', zonaHoraria: 'America/Chihuahua',
      causas: i === 0 ? [{ codigo: 'bloqueo' }] : [],
    })) } });
  });
  await page.route((url) => url.pathname === '/profesionales/1/atencion', async (route) => {
    const url = new URL(route.request().url()), desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta');
    await route.fulfill({ json: { desde, hasta, personalId: 1, intervalos: [
      { fecha: desde, sucursalId: 1, inicioMinutos: 540, finMinutos: 780, inicioUtc: `${desde}T15:00:00Z`, finUtc: `${desde}T19:00:00Z` },
      { fecha: desde, sucursalId: 1, inicioMinutos: 840, finMinutos: 1080, inicioUtc: `${desde}T20:00:00Z`, finUtc: `${new Date(Date.parse(`${desde}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)}T00:00:00Z` },
    ], omisiones: [] } });
  });
  await page.goto('/admin/agenda');
  await expect(page.locator('.agenda-summary')).toContainText('12 citas');
  return { ...fixture, calls };
}
test('filtros locales sin carga, refresco explícito y atención de recepción', async ({ page }) => {
  const { calls, errors } = await prepare(page);
  const before = calls.length;
  await page.getByLabel('Buscar paciente').fill('Paciente 12');
  await expect(page.locator('.agenda-summary')).toContainText('1 cita en');
  expect(calls.length).toBe(before);
  await expect(page.locator('[data-agenda-skeleton]')).toHaveCount(0);
  await page.getByLabel('Buscar paciente').fill('');
  await page.getByLabel('Sucursal', { exact: true }).selectOption('1');
  await page.getByLabel('Profesional', { exact: true }).selectOption('1');
  await expect(page.locator('.agenda-no-attention').first()).toBeVisible();
  await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect.poll(() => calls.length).toBe(before + 1);
  await expect(page.getByLabel('Profesional', { exact: true })).toHaveValue('1');
  expect(errors).toEqual([]);
});
test('grupo semanal abre día, enfoca y resalta todas sus citas; volver conserva semana', async ({ page }) => {
  await prepare(page, 'dark');
  await page.locator('[data-m4-view="week"]').click();
  const group = page.locator('[data-agenda-density]').first();
  await expect(group).toContainText('12 citas');
  await group.click();
  await expect(page.locator('[data-m4-view="day"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.agenda-highlight')).toHaveCount(12);
  await expect(page.locator('[data-m4-appointment="1"]')).toBeFocused();
  expect(await page.locator('[data-m4-appointment="1"]').evaluate((card) => card.getBoundingClientRect().top >= document.querySelector('.week-header').getBoundingClientRect().bottom)).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Volver a la semana' }).click();
  await expect(page.locator('[data-m4-view="week"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-agenda-density]').first()).toBeFocused();
});

test('refresco idéntico conserva el DOM y una recuperación retira el aviso técnico', async ({ page }) => {
  await prepare(page);
  await page.evaluate(() => { window.agendaNode = document.querySelector('.week-calendar'); });
  await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Actualizar agenda', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.agendaNode === document.querySelector('.week-calendar'))).toBe(true);
  let fail = true;
  await page.route((url) => url.pathname === '/citas', async (route) => {
    if (fail) await route.fulfill({ status: 503, json: { message: 'Temporal' } });
    else await route.fallback();
  });
  await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(page.locator('[data-live-warning]')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(page.locator('[data-live-warning]')).toHaveCount(0);
});

test('atención fallida u omitida nunca inventa un sombreado en la fecha afectada', async ({ page }) => {
  await prepare(page);
  let fail = true;
  await page.route((url) => url.pathname === '/profesionales/1/atencion', async (route) => {
    if (fail) { await route.fulfill({ status: 403, json: { message: 'No autorizado' } }); return; }
    const query = new URL(route.request().url()).searchParams;
    await route.fulfill({ json: { desde: query.get('desde'), hasta: query.get('hasta'), personalId: 1, intervalos: [], omisiones: [{ fecha: query.get('desde'), sucursalId: 1, motivo: 'Hora local inexistente o repetida.' }] } });
  });
  await page.getByLabel('Sucursal', { exact: true }).selectOption('1');
  await page.getByLabel('Profesional', { exact: true }).selectOption('1');
  await expect(page.locator('.agenda-attention-note')).toContainText('No se pudo comprobar');
  await expect(page.locator('.agenda-no-attention')).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Reintentar atención' }).click();
  await expect(page.locator('.agenda-attention-note')).toContainText('Atención incompleta');
  await expect(page.locator('.day-column').first().locator('.agenda-no-attention')).toHaveCount(0);
});

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`revisión visual de utilidad ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { errors } = await prepare(page, theme);
    await page.locator('[data-m4-view="week"]').click();
    await expect(page.locator('[data-agenda-density]')).toBeVisible();
    expect(await page.locator('.calendar-scroll').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/m4/utilidad-semana-${width}-${theme}.png`, fullPage: true });
    await page.locator('[data-agenda-density]').click();
    await expect(page.locator('.agenda-highlight')).toHaveCount(12);
    expect(await page.locator('[data-m4-appointment="1"]').evaluate((card) => { const box = card.getBoundingClientRect(); return box.top >= 0 && box.bottom < innerHeight - 100; })).toBe(true);
    expect(await page.locator('.single-day .day-header strong').evaluate((label) => label.getBoundingClientRect().left < innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/m4/utilidad-dia-${width}-${theme}.png`, fullPage: true });
    await page.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await page.getByLabel('Profesional', { exact: true }).selectOption('1');
    await expect(page.locator('.agenda-no-attention').first()).toBeVisible();
    await page.screenshot({ path: `test-results/m4/utilidad-atencion-${width}-${theme}.png`, fullPage: true });
    await page.goto('/admin/agenda?demo=1');
    await expect(page.locator('.agenda-summary')).toBeVisible();
    await expect(page.getByText('Datos ficticios', { exact: true })).toBeVisible();
    await page.evaluate(async () => { await Promise.allSettled(document.querySelector('main').getAnimations({ subtree: true }).map((x) => x.finished)); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/m4/utilidad-demo-${width}-${theme}.png`, fullPage: true });
    await page.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await page.getByLabel('Profesional', { exact: true }).selectOption('1');
    await expect(page.locator('.agenda-no-attention').first()).toBeVisible();
    await page.screenshot({ path: `test-results/m4/utilidad-atencion-demo-${width}-${theme}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
