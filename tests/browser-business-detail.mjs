// Prueba aislada: intercepta toda la API; no utiliza ni modifica el backend.
// Con Vite iniciado: node tests/browser-business-detail.mjs
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const origin = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const business = { id: 1, nombre: 'Negocio de prueba', identificadorPublico: 'negocio-prueba', creadoEn: '2026-10-01T12:00:00Z', administrador: { id: 2, email: 'admin@example.test', activadoEn: null }, licencia: { id: 1 } };
const validity = { duracionTotalMs: 365 * 86400000, estado: 'vigente', condicionAcceso: true, venceEn: '2027-11-05T12:00:00Z', tiempoRestante: { dias: 365, horas: 0, minutos: 0 } };
let deliveries = Array.from({ length: 23 }, (_, i) => ({ id: String(i + 1), tipo: i % 2 ? 'recuperacion' : 'activacion_admin', estado: ['enviado', 'fallido', 'pendiente', 'tomado', 'descartado'][i % 5], intentos: i % 3, confirmadoEn: i % 5 === 0 ? '2026-11-05T12:00:00Z' : null, proximoIntentoEn: '2026-11-05T13:00:00Z', ultimoError: i % 5 === 1 ? 'No se pudo entregar el correo.' : null }));
const errors = [];
await mkdir('test-results/business-detail', { recursive: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => sessionStorage.setItem('cita-session', 'qa-ficticio'));
  await context.route((url) => url.pathname.startsWith('/auth/') || url.pathname.startsWith('/negocios') || url.pathname.startsWith('/licencias'), async (route) => {
    const path = new URL(route.request().url()).pathname;
    assert.equal(route.request().method(), 'GET', `Petición inesperada: ${path}`);
    const data = path === '/auth/profile' ? { user: { sub: 1, rol: 'superadmin', nombre: 'Superadmin QA' } }
      : path === '/negocios' ? [business] : path === '/negocios/1' ? business
        : path === '/negocios/1/envios' ? deliveries : path === '/licencias/1/vigencia' ? validity
          : path === '/negocios/1/cupo-sucursales' ? { sucursalesActivas: 3, limiteSucursalesActivas: 5, disponibles: 2 }
            : path === '/negocios/1/cupo-usuarios' ? { profesionales: { activos: 4, limite: 5, disponibles: 1 }, recepcionistas: { activos: 3, limite: 3, disponibles: 0 } } : null;
    assert.notEqual(data, null, `Ruta inesperada: ${path}`);
    await route.fulfill({ json: data });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
  await page.goto(`${origin}/admin/negocio/1`);
  try { await page.getByRole('tab', { name: 'General', exact: true }).waitFor({ timeout: 10000 }); } catch (error) { console.log(await page.locator('body').innerText()); throw error; }
  assert.equal(await page.locator('[role=tabpanel]:visible').count(), 1);
  await page.getByRole('tab', { name: 'General', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'Límites y uso' }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('meter:visible').count(), 3);
  for (const width of [1920, 1532, 1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
      for (const tab of ['general', 'limits', 'mail']) {
        await page.locator(`[data-business-tab=${tab}]`).click();
        assert.equal(await page.locator('[role=tabpanel]:visible').count(), 1);
        assert.equal(await page.locator(`#business-panel-${tab} .surface`).count(), 0);
        assert.equal(await page.locator('.business-license-summary').count(), 0);
        if (tab === 'general') {
          assert.equal(await page.locator('#business-panel-general .soft-tag').count(), 0);
          assert.equal(await page.locator('.business-license-badge:visible').innerText(), 'Vigente');
          assert.equal(await page.locator('progress:visible').getAttribute('value'), '100');
        }
        if (tab === 'general' || tab === 'limits') {
          const aligned = await page.locator(tab === 'general' ? '.business-license-time progress' : '.business-limits meter').evaluateAll((bars) => bars.every((bar) => {
            const section = bar.closest('section').getBoundingClientRect();
            const rect = bar.getBoundingClientRect();
            return Math.abs(rect.left - section.left) < 2 && Math.abs(rect.right - section.right) < 2;
          }));
          assert.ok(aligned, `${width}/${theme}/${tab}: ancho de barra`);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${theme}/${tab}: desbordamiento`);
        await page.evaluate(async () => { await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))); await new Promise(requestAnimationFrame); });
        await page.screenshot({ animations: 'disabled', path: `test-results/business-detail/${width}-${theme}-${tab}.png`, fullPage: true });
        if (tab === 'general') {
          const normalRed = theme === 'light' ? 'rgb(203, 70, 70)' : 'rgb(91, 21, 27)';
          const hoverRed = theme === 'light' ? 'rgb(169, 39, 39)' : 'rgb(148, 28, 38)';
          const suspend = page.locator('[data-business-action=suspend]');
          const color = (target) => target.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, text: getComputedStyle(el).color }));
          await page.mouse.move(0, 0);
          assert.deepEqual(await color(suspend), { bg: normalRed, text: 'rgb(255, 255, 255)' });
          await suspend.hover();
          assert.deepEqual(await color(suspend), { bg: hoverRed, text: 'rgb(255, 255, 255)' });
          await suspend.click();
          const form = page.locator('#license-suspension-form');
          await form.waitFor();
          assert.equal(await form.locator('.dialog-footer').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
          const confirm = form.getByRole('button', { name: 'Programar suspensión', exact: true });
          assert.deepEqual(await color(confirm), { bg: normalRed, text: 'rgb(255, 255, 255)' });
          await confirm.hover();
          assert.deepEqual(await color(confirm), { bg: hoverRed, text: 'rgb(255, 255, 255)' });
          await page.keyboard.press('Tab');
          await confirm.focus();
          assert.equal(await confirm.evaluate((el) => getComputedStyle(el).outlineStyle), 'solid');
          await page.screenshot({ animations: 'disabled', path: `test-results/business-detail/${width}-${theme}-suspension.png` });
          await form.getByRole('button', { name: 'Cancelar' }).click();
        }
      }
    }
  }
  assert.equal(await page.locator('.mail-table tbody tr').count(), 10);
  assert.equal(await page.locator('.mail-id').count(), 0);
  assert.doesNotMatch(await page.locator('.mail-table').innerText(), /Envío #/);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  assert.match(await page.locator('.mail-footer').innerText(), /11–20 de 23/);
  await page.locator('[data-mail-filter=status]').selectOption('fallido');
  assert.equal(await page.getByRole('navigation', { name: 'Paginación de correos' }).count(), 0);
  assert.equal(await page.locator('.mail-table tbody tr').count(), 5);
  await page.locator('[data-mail-filter=type]').selectOption('activacion_admin');
  assert.equal(await page.locator('.mail-table tbody tr').count(), 2);
  await page.getByRole('button', { name: /Reintentar ahora:/ }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).first().click();
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.locator('.mail-table').waitFor();
  assert.equal(await page.locator('[data-business-tab=mail]').getAttribute('aria-selected'), 'true');
  deliveries = deliveries.slice(0, 10);
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.mail-footer')?.textContent.includes('de 10 correos'));
  assert.equal(await page.locator('[data-mail-page]').count(), 0);
  deliveries = [];
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.getByRole('heading', { name: 'Sin correos registrados' }).waitFor();
  assert.equal(await page.locator('[data-mail-page]').count(), 0);
  deliveries = [{ id: '1', tipo: 'recuperacion', estado: 'enviado', intentos: 1 }];
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.locator('.mail-table').waitFor();
  await page.locator('[data-mail-filter=status]').selectOption('fallido');
  await page.getByRole('heading', { name: 'No hay correos con estos filtros' }).waitFor();
  await page.locator('[data-mail-results] [data-mail-clear]').click();
  await page.locator('.mail-table').waitFor();
  await page.route('**/negocios/1/envios', (route) => route.fulfill({ status: 503, json: { message: 'Correo temporalmente no disponible' } }));
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.mail-table').count(), 0);
  await page.unroute('**/negocios/1/envios');
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await page.locator('.mail-table').waitFor();
  await page.goto(`${origin}/admin/plataforma?demo=1`);
  await page.locator('.page-heading').waitFor();
  assert.equal(await page.locator('.business-workspace').count(), 0);
  assert.deepEqual(errors, []);
  console.log('OK: pestañas/teclado, 40 capturas (1920/1532/1366/390/320, claro/oscuro), suspensión normal/hover/foco/modal, filtros, paginación, actualización, vacío y humo demo. API simulada, cero escrituras.');
} finally { await browser.close(); }
