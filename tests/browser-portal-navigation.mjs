// Vite activo. Toda ruta pública se intercepta: no usa el backend ni su base de datos.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
const origin = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const business = { slug: 'qa-navegacion', nombre: 'Portal QA · API simulada' };
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const services = Array.from({ length: 13 }, (_, i) => ({ id: i + 1, nombre: `Revisión ${String(i + 1).padStart(2, '0')}`, descripcion: 'Descripción pública de prueba', duracionMinutos: i < 6 ? 20 : 90 }));
const branches = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, nombre: `Sucursal ${i + 1}`, direccion: 'Calle de prueba', zonaHoraria: 'America/Mazatlan' }));
const people = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, nombre: `Profesional ${i + 1}`, especialidad: i % 2 ? 'Dental' : 'Medicina' }));
let mode = 'many', availability = 'normal', releaseCatalog, releaseSlots, releaseSession, firstSession = true, requests = 0;
const errors = [], writes = [];
await mkdir('test-results/portal-navigation', { recursive: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/data/demo.json', async (route) => {
    const data = JSON.parse(await readFile('public/data/demo.json', 'utf8'));
    data.services.push(...Array.from({ length: 9 }, (_, i) => ({ ...data.services[0], id: 100 + i, name: `Servicio QA ${i + 1}` })));
    await route.fulfill({ json: data });
  });
  await context.route('**/publico/**', async (route) => {
    requests++;
    const url = new URL(route.request().url()), path = url.pathname.split('/').at(-1);
    if (route.request().method() !== 'GET') { writes.push(path); assert.equal(path, 'sesion'); }
    if (path === 'sesion') {
      if (firstSession) { firstSession = false; await new Promise((resolve) => { releaseSession = resolve; }); }
      return route.fulfill({ json: { negocio: business, csrfToken: 'a'.repeat(64) } });
    }
    if (path === 'catalogo') {
      if (mode === 'loading') await new Promise((resolve) => { releaseCatalog = resolve; });
      return route.fulfill({ json: { negocio: business, servicios: services, sucursales: url.searchParams.has('servicioId') ? mode === 'single' ? branches.slice(0, 1) : branches : [], profesionales: url.searchParams.has('sucursalId') ? mode === 'single' ? people.slice(0, 1) : people : [] } });
    }
    assert.equal(path, 'disponibilidad');
    if (availability === 'loading') await new Promise((resolve) => { releaseSlots = resolve; });
    if (availability === 'error') return route.fulfill({ status: 503, json: { codigo: 'portal_503', mensaje: 'No pudimos consultar los horarios. Reintenta para comprobar la disponibilidad.', accion: 'reintentar' } });
    const query = Object.fromEntries(url.searchParams);
    for (const key of ['servicioId', 'sucursalId', 'personalId']) query[key] = Number(query[key]);
    const ranuras = availability === 'empty' ? [] : [`${tomorrow}T17:00:00Z`, `${tomorrow}T20:00:00Z`, `${future}T17:00:00Z`].filter((date) => date.slice(0, 10) >= query.desde && date.slice(0, 10) <= query.hasta).map((inicioUtc) => ({ inicioUtc, finUtc: new Date(Date.parse(inicioUtc) + 1200000).toISOString() }));
    return route.fulfill({ json: { ...query, modalidad: 'publica', zonaHoraria: 'America/Mazatlan', ranuras } });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const url = `${origin}/reservas/${business.slug}`;
  const shot = async (name) => {
    for (const width of [1366, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        const current = await page.evaluate(() => document.documentElement.dataset.theme);
        if (current !== theme) {
          const toggle = page.locator('#public-theme');
          if (await toggle.count()) await toggle.click();
          else await page.getByRole('button', { name: /Activar modo/ }).click();
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}/${width}/${theme}`);
        await page.screenshot({ fullPage: true, animations: 'disabled', path: `test-results/portal-navigation/${name}-${width}-${theme}.png` });
      }
    }
  };
  await page.goto(url);
  await expect(page.locator('#public-initial-skeleton')).toBeVisible();
  await expect(page.locator('#public-main')).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => typeof releaseSession).toBe('function'); releaseSession();
  await expect(page.locator('[data-selection]')).toHaveCount(6);
  await expect(page.locator('[data-public-clear]').first()).toBeDisabled();
  const count = requests;
  await page.getByLabel('Buscar servicio').fill('revision 13');
  await expect(page.locator('[data-selection]')).toHaveCount(1);
  await expect(page.locator('[data-public-page]')).toHaveCount(0);
  await page.locator('[data-selection]').check();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.locator('.public-pagination')).toContainText('7–12 de 13');
  await expect(page.locator('.public-action-selection')).toContainText('Revisión 13');
  await page.getByLabel('Duración').selectOption('short');
  await expect(page.locator('[data-selection]')).toHaveCount(6);
  await expect(page.locator('[data-public-page]')).toHaveCount(0);
  await page.getByLabel('Buscar servicio').fill('inexistente');
  await expect(page.getByRole('heading', { name: 'No encontramos coincidencias' })).toBeVisible();
  await page.locator('.public-option-tools [data-public-clear]').click();
  assert.equal(requests, count);
  await shot('servicios');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Buscar sucursal')).toBeVisible();
  await page.getByLabel('Buscar sucursal').fill('calle');
  await expect(page.locator('[data-selection]')).toHaveCount(6);
  await page.locator('[data-selection]').first().check();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Especialidad')).toBeVisible();
  await page.getByLabel('Especialidad').selectOption('Dental');
  await expect(page.locator('[data-selection]')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Elige un profesional', exact: true })).toBeVisible();
  await page.locator('[data-selection]').first().check();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No hay horarios disponibles para esta fecha', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apartar este horario', exact: true })).toBeDisabled();
  await shot('dia-vacio');
  await page.getByRole('button', { name: 'Ver siguiente día disponible' }).click();
  await expect(page.locator('[data-slot]')).toHaveCount(2);
  await page.locator('[data-slot]').first().check();
  await page.getByRole('button', { name: 'Tarde (1)', exact: true }).click();
  await expect(page.locator('[data-slot]')).toHaveCount(1);
  await expect(page.locator('.public-selected')).toContainText('10:00');
  await shot('horarios');
  availability = 'loading';
  await page.getByLabel('Fecha de tu cita').fill(future);
  await expect(page.locator('.public-skeleton-slots')).toBeVisible();
  await expect(page.locator('[data-slot]')).toHaveCount(0);
  await shot('skeleton-horarios');
  releaseSlots(); availability = 'empty';
  await expect(page.getByRole('heading', { name: 'No hay horarios disponibles para esta fecha', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver siguiente día disponible' })).toHaveCount(0);
  availability = 'error';
  await page.getByLabel('Fecha de tu cita').fill(tomorrow);
  await expect(page.getByRole('button', { name: 'Reintentar consulta' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No hay horarios disponibles para esta fecha', exact: true })).toHaveCount(0);
  mode = 'single'; availability = 'normal'; await page.goto(url);
  await page.locator('[data-selection]').first().check(); await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Elige fecha y hora', exact: true })).toBeVisible();
  await expect(page.locator('.public-auto-note')).toContainText('Sucursal y Profesional');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Elige un servicio', exact: true })).toBeVisible();
  mode = 'loading'; await page.goto(url);
  await expect(page.locator('.public-skeleton').last()).toBeVisible();
  await shot('skeleton-catalogo');
  releaseCatalog(); mode = 'many'; await expect(page.locator('[data-selection]')).toHaveCount(6);
  await page.goto(`${origin}/reservas/clinica-bienestar?demo=1`);
  await expect(page.locator('.booking-choice').first()).toBeVisible();
  await expect(page.locator('.booking-choice')).toHaveCount(6);
  await page.getByLabel('Buscar servicio').fill('Servicio QA 9');
  await expect(page.locator('.booking-choice')).toHaveCount(1);
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await shot('demo-servicios');
  await page.locator('[data-book-choice=serviceId][data-value="1"]').click();
  await page.locator('[data-book-next]').click();
  await expect(page.locator('[data-book-choice=branchId]').first()).toBeVisible();
  await page.locator('[data-book-choice=branchId]').first().click(); await page.locator('[data-book-next]').click();
  await expect(page.getByRole('heading', { name: 'Elige fecha y hora', exact: true })).toBeVisible();
  await page.getByLabel('Fecha de tu cita').fill('');
  await expect(page.getByRole('alert')).toContainText('Elige una fecha válida');
  await expect(page.locator('[data-book-next]')).toBeDisabled();
  assert.deepEqual(errors, []); assert.ok(writes.every((path) => path === 'sesion'));
  console.log('OK: portal público, API interceptada, búsquedas sin consultas, 6/7/13, selección conservada, saltos, vuelta, filtros de hora, vacíos/error/skeleton y 48 capturas claro/oscuro a cuatro anchos; demo incluida.');
} finally { await browser.close(); }
