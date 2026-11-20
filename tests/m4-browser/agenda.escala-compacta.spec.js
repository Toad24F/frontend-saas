import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`distribución adaptable y máximo editable ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await prepararSesion(page, 'recepcionista', theme);
    await page.goto('/admin/agenda');
    await page.locator('[data-agenda-vista="day"]').click();
    await expect(page.locator('.calendario-evento')).toHaveCount(1);
    if (width === 390) {
      await expect.poll(() => page.locator('.columna-dia').evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(310);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const card = page.locator('.calendario-evento');
    await expect(card.locator('.evento-hora')).toHaveCSS('justify-content', 'flex-end');
    await expect(card.locator('.evento-sucursal')).toHaveCSS('text-align', 'right');
    await page.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await expect(card.locator('.evento-hora')).toHaveCSS('justify-content', 'flex-end');
    await expect(card.locator('.evento-sucursal')).toHaveCount(0);
    await page.getByLabel('Sucursal', { exact: true }).selectOption('all');
    await expect.poll(() => card.evaluate((el) => Math.abs(el.querySelector("strong").getBoundingClientRect().y - el.querySelector(".evento-hora").getBoundingClientRect().y))).toBeLessThan(1);
    const geometry = await card.evaluate((el) => {
      const rect = (s) => el.querySelector(s).getBoundingClientRect();
      return { name: rect('strong').y, time: rect('.evento-hora').y, service: rect('.evento-servicio').y, branch: rect('.evento-sucursal').y };
    });
    expect(geometry.name).toBeCloseTo(geometry.time, 0);
    expect(geometry.service).toBeCloseTo(geometry.branch, 0);
    await page.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '60px'));
    const scale = () => page.locator('.calendario-semana').evaluate((el) => parseFloat(el.style.getPropertyValue('--alto-hora')));
    await expect.poll(scale).toBeLessThanOrEqual(60);
    await page.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '300px'));
    await expect.poll(scale).toBeGreaterThan(60);
    await page.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '24px'));
    await expect.poll(scale).toBe(24);
    await expect(card).toHaveAttribute('data-densidad', 'tiny');
    await expect(card).toHaveAttribute('title', /Consulta histórica/);
    await page.evaluate(() => document.documentElement.style.removeProperty('--agenda-alto-hora-maximo'));
    await page.evaluate(() => {
      const sheet = [...document.styleSheets].find((s) => [...s.cssRules].some((r) => r.selectorText === ':root' && r.style?.getPropertyValue('--agenda-alto-hora-maximo')));
      const rule = [...sheet.cssRules].find((r) => r.selectorText === ':root' && r.style?.getPropertyValue('--agenda-alto-hora-maximo'));
      rule.style.setProperty('--agenda-alto-hora-maximo', '72px');
    });
    await expect.poll(scale).toBe(72);
    await page.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '240px'));
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/m4/compacta-${width}-${theme}.png` });
  });
}
