// Vite activo. API simulada; la única escritura permitida es un retiro en memoria.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const named = (id) => id === 21 ? 'Registro único' : `Registro ${id}`;
let professionals = Array.from({ length: 21 }, (_, i) => ({ id: i + 1, nombre: named(i + 1), correo: `prof${i + 1}@example.test`, activo: i % 2 === 0 }));
const services = Array.from({ length: 21 }, (_, i) => ({ id: i + 1, nombre: named(i + 1), activo: i % 2 === 0, duracionMinutos: 30, costo: 200, seleccionado: i === 0 }));
const branches = Array.from({ length: 21 }, (_, i) => ({ id: i + 1, nombre: named(i + 1), activo: i % 2 === 0, direccion: 'Dirección de prueba', telefono: '6145550101', zonaHoraria: 'America/Chihuahua' }));
const receptionists = Array.from({ length: 21 }, (_, i) => ({ id: i + 1, nombre: named(i + 1), email: `recep${i + 1}@example.test`, activo: i % 2 === 0 }));
const blocks = Array.from({ length: 21 }, (_, i) => ({ id: i + 1, personalId: i % 3 === 0 ? null : 1, sucursalId: i % 5 === 0 ? null : i % 2 ? 1 : 2, tipo: ['vacaciones', 'dia_festivo', 'emergencia'][i % 3], motivo: `Bloqueo ${i + 1}`, fechaInicio: `2026-11-${String(i + 1).padStart(2, '0')}`, fechaFin: i === 0 ? '2026-11-09' : `2026-11-${String(i + 1).padStart(2, '0')}`, inicioMinutos: null, finMinutos: null }));
let requests = 0;
const errors = [], writes = [];
await mkdir('test-results/local-pagination', { recursive: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => sessionStorage.setItem('cita-session', 'qa-simulado'));
  await context.route((url) => /^\/(auth|profesionales|recepcionistas|servicios|sucursales|bloqueos|disponibilidad)(\/|$)/.test(url.pathname), async (route) => {
    requests++;
    const path = new URL(route.request().url()).pathname, method = route.request().method();
    if (method !== 'GET') {
      writes.push(path);
      assert.equal(path, '/profesionales/21/inhabilitar');
      professionals = professionals.filter((item) => item.id !== 21);
      await route.fulfill({ json: { id: 21, activo: false, inhabilitadoEn: '2026-11-05T12:00:00Z' } }); return;
    }
    let data;
    const id = Number(path.split('/')[2]);
    if (path === '/auth/profile') data = { user: { sub: 1, rol: 'admin_negocio', negocioId: 1, nombre: 'Administración QA', nombreNegocio: 'Negocio QA' } };
    else if (path === '/profesionales') data = professionals;
    else if (path === '/servicios') data = services;
    else if (path === '/sucursales') data = branches;
    else if (path === '/recepcionistas') data = receptionists;
    else if (path === '/profesionales/cupo' || path === '/recepcionistas/cupo') data = { limite: 30, activos: 11, disponibles: 19 };
    else if (path === '/sucursales/cupo') data = { limiteSucursalesActivas: 30, sucursalesActivas: 11, disponibles: 19 };
    else if (path.endsWith('/sucursales')) data = [1, 2];
    else if (path.endsWith('/servicios')) data = services;
    else if (path.endsWith('/horario')) data = [];
    else if (path.endsWith('/oferta')) data = { cuentaActiva: true, sucursales: [] };
    else if (path === '/bloqueos') data = blocks;
    else if (/^\/profesionales\/\d+$/.test(path)) data = professionals.find((item) => item.id === id);
    else if (path === '/disponibilidad/configuracion') data = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 0, anticipacionMinutos: 15, diasFuturos: 60 };
    else throw Error(`Ruta inesperada ${path}`);
    await route.fulfill({ json: data });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  for (const [screen, kind] of [['profesionales', 'professional'], ['recepcionistas', 'reception'], ['servicios', 'service'], ['sucursales', 'branch']]) {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(`${origin}/admin/${screen}`);
    const results = page.locator(`#${kind}-results`), footer = page.locator(`[data-catalog-pagination=${kind}]`);
    await results.waitFor();
    await expect(results.locator('article')).toHaveCount(10);
    assert.match(await page.locator('.professional-overview').innerText(), /21/);
    const initialRequests = requests;
    await footer.getByRole('button', { name: 'Siguiente', exact: true }).click();
    assert.match(await footer.innerText(), /11–20 de 21/);
    await page.locator(`[data-${kind}-view=cards]`).click();
    assert.match(await footer.innerText(), /11–20 de 21/);
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(results.locator('article')).toHaveCount(10);
    assert.match(await results.getAttribute('class'), /view--cards/);
    await footer.getByRole('button', { name: 'Siguiente', exact: true }).click();
    assert.equal(await results.locator('article').count(), 1);
    assert.match(await footer.innerText(), /21–21 de 21/);
    assert.equal(requests, initialRequests);
    await page.locator(`[data-${kind}-filter=status]`).selectOption('inactive');
    await expect(results.locator('article')).toHaveCount(10);
    assert.equal(await footer.locator('nav').count(), 0);
    await page.locator(`[data-${kind}-filter=status]`).selectOption('active');
    assert.equal(await footer.locator('nav').count(), 1);
    await page.locator(`#${kind}-search`).fill('unico');
    assert.equal(await results.locator('article').count(), 1);
    assert.equal(await footer.locator('nav').count(), 0);
    await page.locator(`#${kind}-search`).fill('sin coincidencias');
    assert.equal(await results.locator('article').count(), 0);
    await page.locator(`#${kind}-no-results`).waitFor();
    await page.locator(`.professional-toolbar [data-${kind}-reset]`).click();
    await expect(results.locator('article')).toHaveCount(10);
    for (const width of [1366, 1159, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      if (width > 767) await page.locator(`[data-${kind}-view=list]`).click();
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => { localStorage.setItem('cita-theme', theme); document.documentElement.dataset.theme = theme; }, theme);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${screen}/${width}/${theme}`);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/local-pagination/${width}-${theme}-${screen}.png` });
      }
    }
  }
  await page.goto(`${origin}/admin/profesionales`);
  await page.locator('#professional-results').waitFor();
  const professionalFooter = page.locator('[data-catalog-pagination=professional]');
  await professionalFooter.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await professionalFooter.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.locator('#professional-results summary').click();
  await page.locator('[data-professional-action=disable]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Inhabilitar', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-catalog-pagination=professional]')?.textContent.includes('11–20 de 20'));
  assert.equal(await page.locator('#professional-results article').count(), 10);
  await page.goto(`${origin}/admin/disponibilidad/equipo`);
  await page.getByRole('tab', { name: 'Bloqueos', exact: true }).click();
  const blockResults = page.locator('[data-block-results]');
  assert.equal(await blockResults.locator('.block-item').count(), 10);
  let blockRequests = requests;
  await page.locator('[data-block-page="2"]').click();
  assert.match(await blockResults.innerText(), /11–20 de 21/);
  assert.equal(requests, blockRequests);
  await Promise.all([page.waitForResponse((response) => new URL(response.url()).pathname === '/profesionales/2/oferta'), page.locator('#block-professional').selectOption('2')]);
  assert.equal(await blockResults.locator('.block-item').count(), 7);
  assert.equal(await blockResults.locator('nav').count(), 0);
  await Promise.all([page.waitForResponse((response) => new URL(response.url()).pathname === '/profesionales/1/oferta'), page.locator('#block-professional').selectOption('1')]);
  blockRequests = requests;
  await page.locator('[data-block-filter=from]').fill('2026-11-02');
  await page.locator('[data-block-filter=to]').fill('2026-11-02');
  assert.equal(await blockResults.locator('.block-item').count(), 2);
  await page.locator('[data-block-filter=from]').fill('2026-11-09');
  await blockResults.getByRole('alert').waitFor();
  assert.equal(await blockResults.locator('nav').count(), 0);
  await page.locator('.block-filters [data-block-clear]').click();
  assert.equal(await page.locator('#block-professional').inputValue(), '1');
  await page.locator('[data-block-filter=branch]').selectOption('1');
  const branchExpected = blocks.filter((item) => !item.sucursalId || item.sucursalId === 1).length;
  assert.match(await blockResults.innerText(), new RegExp(`de ${branchExpected} bloqueos`));
  await page.locator('[data-block-filter=type]').selectOption('vacaciones');
  assert.equal(await blockResults.locator('nav').count(), 0);
  await page.locator('[data-block-filter=search]').fill('no existe');
  await blockResults.getByRole('heading', { name: 'Sin coincidencias' }).waitFor();
  await page.locator('.block-filters [data-block-clear]').click();
  assert.equal(requests, blockRequests);
  await page.locator('.app-toast').first().waitFor({ state: 'hidden' });
  for (const width of [1366, 1159, 390, 320]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/local-pagination/${width}-${theme}-bloqueos.png` });
  }
  await page.goto(`${origin}/admin/servicios?demo=1`);
  await page.locator('#service-results').waitFor();
  assert.equal(await page.locator('[data-catalog-page]').count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, ['/profesionales/21/inhabilitar']);
  console.log('OK: 4 catálogos y Bloqueos, filtros antes de paginar, cambio lista/tarjetas/móvil, 10/11/21, ajuste de última página, alcance global, fechas, cero consultas por paginación. API simulada.');
} finally { await browser.close(); }
