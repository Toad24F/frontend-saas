import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`atención por columna y todas las sedes ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { errors } = await setup(page, 'recepcionista', theme);
    let failure = true;
    await page.route((url) => url.pathname === '/citas', async (route) => {
      const q = new URL(route.request().url()).searchParams, day = q.get('desde');
      await route.fulfill({ json: { desde: day, hasta: q.get('hasta'), citas: [1, 2].map((id) => ({ id, version: 1, estado: 'confirmada', fechaLocal: day, fechaFinLocal: day, horaInicio: '10:00:00', horaFin: '11:00:00', sucursalId: 1, personalId: id, nombreContacto: `Paciente ${id}`, nombreServicio: 'Consulta', nombreProfesional: `Profesional ${id}`, nombreSucursal: 'Norte', zonaHoraria: 'America/Chihuahua', causas: [] })) } });
    });
    await page.route((url) => /\/profesionales\/\d+\/atencion$/.test(url.pathname), async (route) => {
      const url = new URL(route.request().url()), id = Number(url.pathname.split('/')[2]), day = url.searchParams.get('desde');
      if (id === 2 && failure) { await route.fulfill({ status: 503, json: { message: 'Temporal' } }); return; }
      await route.fulfill({ json: { desde: day, hasta: url.searchParams.get('hasta'), personalId: id, omisiones: [], intervalos: [
        { fecha: day, sucursalId: 1, inicioMinutos: 540, finMinutos: 720, inicioUtc: `${day}T15:00:00Z`, finUtc: `${day}T18:00:00Z` },
        { fecha: day, sucursalId: 2, inicioMinutos: 840, finMinutos: 1080, inicioUtc: `${day}T20:00:00Z`, finUtc: `${new Date(Date.parse(day) + 86400000).toISOString().slice(0, 10)}T00:00:00Z` },
      ] } });
    });
    await page.goto('/admin/agenda');
    await page.locator('[data-m4-view="day"]').click();
    const one = page.locator('[data-calendar-professional="1"]'), two = page.locator('[data-calendar-professional="2"]');
    await expect(one.locator('.agenda-no-attention')).toHaveCount(1);
    await expect(one.locator('.agenda-no-attention')).toContainText('Sin atención en ninguna sucursal');
    await expect(two.locator('.agenda-no-attention')).toHaveCount(0);
    await expect(two).toContainText('No se pudo consultar');
    failure = false;
    await page.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
    await expect(two.locator('.agenda-no-attention')).toHaveCount(1);
    await page.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await expect(one.locator('.agenda-no-attention')).toHaveCount(1);
    await expect(one.locator('.agenda-no-attention')).toHaveAttribute('title', /12:00–18:00/);
    await expect(two.locator('.agenda-no-attention')).toHaveAttribute('title', /12:00–18:00/);
    await one.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/m4/atencion-columnas-${width}-${theme}.png` });
    await page.goto('/admin/agenda?demo=1');
    await page.locator('[data-view="day"]').click();
    await expect(page.locator('.by-professional .agenda-no-attention').first()).toBeVisible();
    await page.getByLabel('Sucursal', { exact: true }).selectOption('all');
    await expect(page.locator('.by-professional .agenda-no-attention').first()).toContainText('Sin atención en ninguna sucursal');
    expect(errors).toEqual([]);
  });
}
