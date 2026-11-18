import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`semana: atención común del equipo ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { errors } = await prepararSesion(page, 'admin_negocio', theme);
    let failure = false;
    await page.route((url) => url.pathname === '/sucursales', (route) => route.fulfill({ json: [{ id: 1, nombre: 'Norte', activo: true }, { id: 2, nombre: 'Sur', activo: true }] }));
    await page.route((url) => url.pathname === '/profesionales', (route) => route.fulfill({ json: [{ id: 1, nombre: 'Ana', activo: true }, { id: 2, nombre: 'Beto', activo: true }] }));
    await page.route((url) => /\/profesionales\/\d+\/sucursales$/.test(url.pathname), (route) => route.fulfill({ json: [1, 2] }));
    await page.route((url) => /\/profesionales\/\d+\/atencion$/.test(url.pathname), async (route) => {
      const u = new URL(route.request().url()), id = Number(u.pathname.split('/')[2]), day = u.searchParams.get('desde');
      if (failure && id === 2) { await route.fulfill({ status: 503, json: { message: 'Temporal' } }); return; }
      const spans = id === 1 ? [[1, 540, 720], [2, 960, 1080]] : [[1, 660, 900]];
      const utc = (minutes) => new Date(Date.parse(day + 'T00:00:00Z') + (minutes + 360) * 60000).toISOString();
      await route.fulfill({ json: { desde: day, hasta: u.searchParams.get('hasta'), personalId: id, omisiones: [], intervalos: spans.map(([branch, start, end]) => ({ fecha: day, sucursalId: branch, inicioMinutos: start, finMinutos: end, inicioUtc: utc(start), finUtc: utc(end) })) } });
    });
    await page.goto('/admin/agenda');
    const first = page.locator('.columna-dia').first();
    await expect(first.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /15:00–18:00/);
    await page.getByLabel('Sucursal', { exact: true }).selectOption('all');
    await expect(first.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /15:00–16:00/);
    await page.getByLabel('Profesional', { exact: true }).selectOption('1');
    await expect(first.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /12:00–16:00/);
    await page.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await expect(first.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /12:00–18:00/);
    await page.getByLabel('Profesional', { exact: true }).selectOption('all');
    await expect(first.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /15:00–18:00/);
    await first.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/m4/semana-atencion-${width}-${theme}.png` });
    failure = true;
    await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
    await expect(page.getByText('No se pudo comprobar la atención de todo el equipo. Usa Actualizar agenda.', { exact: true })).toBeVisible();
    await expect(page.locator('.agenda-sin-atencion')).toHaveCount(0);
    await page.goto('/admin/agenda?demo=1');
    await page.getByLabel('Sucursal', { exact: true }).selectOption('all');
    await expect(page.locator('.calendario-semana:not(.dia-unico)')).toBeVisible();
    await expect(page.locator('.agenda-sin-atencion').first()).toContainText('ningún profesional');
    expect(errors).toEqual([]);
  });
}
