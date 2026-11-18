import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`columnas, filtros fijos y aviso retirado ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date('2026-11-16T18:00:00Z'));
    await prepararSesion(page, 'recepcionista', theme);
    await page.route((url) => url.pathname === '/citas', async (route) => {
      const q = new URL(route.request().url()).searchParams, day = q.get('desde');
      await route.fulfill({ json: { desde: day, hasta: q.get('hasta'), citas: [1, 2, 3, 4].flatMap((id) => Array.from({ length: id }, (_, i) => ({ id: id * 10 + i, version: 1, estado: id === 4 ? 'pendiente' : 'confirmada', fechaLocal: day, fechaFinLocal: day, horaInicio: `${String(9 + i).padStart(2, '0')}:00:00`, horaFin: `${String(10 + i).padStart(2, '0')}:00:00`, personalId: id, sucursalId: 1, nombreContacto: 'Cliente', nombreServicio: 'Consulta', nombreProfesional: `Persona ${id}`, nombreSucursal: 'Norte', zonaHoraria: 'America/Chihuahua', causas: [] }))) } });
    });
    await page.goto('/admin/agenda');
    await page.locator('[data-agenda-vista="day"]').click();
    await expect(page.locator('[data-calendario-profesional]')).toHaveCount(4);
    expect(await page.locator('[data-calendario-profesional]').evaluateAll((els) => els.map((e) => e.dataset.calendarioProfesional))).toEqual(['4', '3', '2', '1']);
    if (width === 1366) {
      const sizes = await page.locator('.calendario-desplazamiento').evaluate((el) => ({ available: el.clientWidth - 58, column: el.querySelector('.columna-dia').getBoundingClientRect().width, overflow: el.scrollWidth > el.clientWidth }));
      expect(sizes.column * 3).toBeCloseTo(sizes.available, -1);
      expect(sizes.overflow).toBe(true);
    }
    await expect(page.getByRole('button', { name: 'Reintentar atención' })).toHaveCount(0);
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    const position = await page.locator('.calendario-filtros').evaluate((el) => ({ top: el.getBoundingClientRect().top, bar: document.querySelector('.agenda-barra').getBoundingClientRect().bottom }));
    if (width >= 768) expect(Math.abs(position.top - position.bar)).toBeLessThan(2);
    else expect(await page.locator('.calendario-filtros').evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThan(0);
    await page.screenshot({ path: `test-results/m4/filtros-fijos-${width}-${theme}.png` });
    await page.getByLabel('Estado', { exact: true }).selectOption('confirmada');
    await expect(page.locator('[data-calendario-profesional]')).toHaveCount(3);
    if (width === 1366) expect(await page.locator('.calendario-desplazamiento').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(page.getByLabel('Estado', { exact: true })).toHaveValue('confirmada');
    await page.goto('/admin/agenda?demo=1');
    await page.locator('[data-agenda-vista-demo="day"]').click();
    const counts = await page.locator('[data-calendario-profesional]').evaluateAll((els) => els.map((el) => el.querySelectorAll('.calendario-evento').length));
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }));
    if (width >= 768) expect(await page.locator('.calendario-filtros').evaluate((el) => Math.abs(el.getBoundingClientRect().top - document.querySelector('.agenda-barra').getBoundingClientRect().bottom))).toBeLessThan(2);
    else expect(await page.locator('.calendario-filtros').evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThan(0);
  });
}
