import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`distribución adaptable y máximo editable ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page, 'recepcionista', theme);
    await page.goto('/admin/agenda');
    await page.locator('[data-m4-view="day"]').click();
    await expect(page.locator('.calendar-event')).toHaveCount(1);
    const card = page.locator('.calendar-event');
    await expect.poll(() => card.evaluate((el) => Math.abs(el.querySelector("strong").getBoundingClientRect().y - el.querySelector(".event-time").getBoundingClientRect().y))).toBeLessThan(1);
    const geometry = await card.evaluate((el) => {
      const rect = (s) => el.querySelector(s).getBoundingClientRect();
      return { name: rect('strong').y, time: rect('.event-time').y, service: rect('.event-service').y, branch: rect('.event-branch').y };
    });
    expect(geometry.name).toBeCloseTo(geometry.time, 0);
    expect(geometry.service).toBeCloseTo(geometry.branch, 0);
    await page.evaluate(() => document.documentElement.style.setProperty('--agenda-hour-max', '60px'));
    const scale = () => page.locator('.week-calendar').evaluate((el) => parseFloat(el.style.getPropertyValue('--hour-height')));
    await expect.poll(scale).toBeLessThanOrEqual(60);
    await page.evaluate(() => document.documentElement.style.setProperty('--agenda-hour-max', '300px'));
    await expect.poll(scale).toBeGreaterThan(60);
    await page.evaluate(() => document.documentElement.style.setProperty('--agenda-hour-max', '24px'));
    await expect.poll(scale).toBe(24);
    await expect(card).toHaveAttribute('data-density', 'tiny');
    await expect(card).toHaveAttribute('title', /Consulta histórica/);
    await page.evaluate(() => document.documentElement.style.removeProperty('--agenda-hour-max'));
    await page.evaluate(() => {
      const sheet = [...document.styleSheets].find((s) => [...s.cssRules].some((r) => r.selectorText === ':root' && r.style?.getPropertyValue('--agenda-hour-max')));
      const rule = [...sheet.cssRules].find((r) => r.selectorText === ':root' && r.style?.getPropertyValue('--agenda-hour-max'));
      rule.style.setProperty('--agenda-hour-max', '72px');
    });
    await expect.poll(scale).toBe(72);
    await page.evaluate(() => document.documentElement.style.setProperty('--agenda-hour-max', '240px'));
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/m4/compacta-${width}-${theme}.png` });
  });
}
