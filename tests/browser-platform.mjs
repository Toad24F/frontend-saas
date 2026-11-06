// Vite activo; API totalmente simulada. No usa la base de datos.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let businesses = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, nombre: `Clínica ${i + 1}`, identificadorPublico: `clinica-${i + 1}`, administrador: { id: i + 100, email: `admin${i + 1}@example.test`, activadoEn: i % 5 === 0 ? null : '2026-10-01T12:00:00Z' }, licencia: { id: i + 1 } }));
const validity = (id) => {
  const estado = ['pendiente', 'vigente', 'suspension_pendiente', 'suspendida', 'vencida'][(id - 1) % 5];
  return { estado, condicionAcceso: ['vigente', 'suspension_pendiente'].includes(estado), tiempoRestante: estado === 'pendiente' ? null : { dias: estado === 'vencida' ? 0 : 18, horas: 0, minutos: 0 }, duracionTotalMs: 365 * 86400000, tiempoCongelado: estado === 'suspendida' };
};
const errors = [];
await mkdir('test-results/platform', { recursive: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => sessionStorage.setItem('cita-session', 'qa-simulado'));
  await context.route((url) => /^\/(auth|negocios|licencias)(\/|$)/.test(url.pathname), async (route) => {
    assert.equal(route.request().method(), 'GET');
    const path = new URL(route.request().url()).pathname;
    const id = Number(path.split('/')[2]);
    const data = path === '/auth/profile' ? { user: { sub: 1, rol: 'superadmin', nombre: 'Superadmin QA' } }
      : path === '/negocios' ? businesses
        : path.endsWith('/vigencia') ? validity(id)
          : path.endsWith('/envios') ? (id % 2 ? [] : [{ id: String(id), estado: 'fallido', tipo: 'recuperacion', intentos: 1 }])
            : path.endsWith('/cupo-sucursales') ? { sucursalesActivas: 1, limiteSucursalesActivas: 3, disponibles: 2 }
              : path.endsWith('/cupo-usuarios') ? { profesionales: { activos: 1, limite: 5, disponibles: 4 }, recepcionistas: { activos: 1, limite: 3, disponibles: 2 } }
                : businesses.find((item) => item.id === id);
    assert.ok(data, path);
    await route.fulfill({ json: data });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/admin/plataforma`);
  await page.locator('.platform-table').waitFor();
  assert.equal(await page.locator('.platform-table tbody tr').count(), 10);
  assert.equal(await page.locator('button.platform-metric, [data-platform-metric]').count(), 0);
  assert.equal(await page.locator('.platform-filters [data-platform-clear]').isDisabled(), true);
  for (const width of [1366, 1159, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${theme}`);
      await page.evaluate(async () => { await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))); });
      await page.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/platform/${width}-${theme}.png` });
    }
  }
  await page.locator('[data-platform-search]').fill('CLINICA');
  assert.equal(await page.locator('.platform-filters [data-platform-clear]').isEnabled(), true);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  assert.match(await page.locator('.platform-footer').innerText(), /11–20 de 23/);
  await page.locator('[data-business-detail]').first().click();
  await page.getByRole('tab', { name: 'General', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Volver al panel' }).click();
  assert.equal(await page.locator('[data-platform-search]').inputValue(), 'CLINICA');
  assert.match(await page.locator('.platform-footer').innerText(), /11–20 de 23/);
  await page.locator('[data-platform-filter=license]').selectOption('vigente');
  assert.equal(await page.locator('.platform-table tbody tr').count(), 5);
  assert.equal(await page.locator('[data-platform-page]').count(), 0);
  await page.locator('[data-platform-filter=followUp]').selectOption('failed');
  assert.equal(await page.locator('.platform-table tbody tr').count(), 3);
  await page.locator('[data-platform-search]').fill('no existe');
  await page.getByRole('heading', { name: 'No hay negocios con estos filtros' }).waitFor();
  await page.locator('[data-platform-results] [data-platform-clear]').click();
  for (const [filter, count] of [['pending', 5], ['expiring', 5], ['blocked', 13], ['', 23]]) {
    await page.locator('[data-platform-filter=followUp]').selectOption(filter);
    assert.match(await page.locator('.platform-footer').innerText(), new RegExp(`de ${count} negocios`));
    assert.equal(await page.locator('[data-platform-filter=followUp]').inputValue(), filter);
  }
  assert.equal(await page.locator('.platform-filters [data-platform-clear]').isDisabled(), true);
  businesses = businesses.slice(0, 10);
  await page.locator('[data-platform-refresh]').click();
  await page.waitForFunction(() => document.querySelector('.platform-footer')?.textContent.includes('de 10 negocios'));
  assert.equal(await page.locator('[data-platform-page]').count(), 0);
  await page.route('**/negocios', (route) => route.fulfill({ status: 503, json: { message: 'No disponible' } }));
  await page.locator('[data-platform-refresh]').click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /última consulta/);
  await page.unroute('**/negocios');
  businesses = [];
  await page.locator('[data-platform-refresh]').click();
  await page.getByRole('heading', { name: 'Aún no hay negocios' }).waitFor();
  await page.goto(`${origin}/admin/plataforma?demo=1`);
  await page.locator('.platform-table').waitFor();
  await page.locator('[data-toggle-tenant]').first().click();
  await page.locator('#confirm-tenant').click();
  await page.getByText('Estado del negocio actualizado.', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-business-detail]').count(), 0);
  assert.deepEqual(errors, []);
  console.log('OK: panel en cuatro anchos/ambos temas, búsqueda/filtros/indicadores estáticos/limpiar deshabilitado, paginación, ida/vuelta al detalle, actualizar/error/vacío y acción demo. API simulada; cero escrituras.');
} finally { await browser.close(); }
