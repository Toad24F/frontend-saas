import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`cabeceras fijas y sincronizadas ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page, 'recepcionista', theme);
    for (const mode of ['connected', 'demo']) {
      await page.goto(`/admin/agenda${mode === 'demo' ? '?demo=1' : ''}`);
      const attr = mode === 'demo' ? 'data-view' : 'data-m4-view';
      for (const view of ['week', 'day']) {
        await page.locator(`[${attr}="${view}"]`).click();
        await expect(page.locator('.week-body')).toBeVisible();
        if (view === 'day') {
          const header = page.locator('.day-header:has(.professional-heading)').first();
          await expect(header).toBeVisible();
          await expect.poll(() => header.evaluate((el) => {
            const rect = (s) => { const b = el.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y }; };
            const day = rect(':scope > span'), date = rect(':scope > strong'), person = rect('.professional-heading'), count = rect('small');
            return person.x > day.x && Math.abs(count.x - person.x) < 1 && Math.abs(person.y - day.y) < 1 && Math.abs(count.y - date.y) < 1;
          })).toBe(true);
        }
        await page.evaluate(() => window.scrollTo({ top: 1100, behavior: 'instant' }));
        const boxes = await page.evaluate(() => ['.topbar', '.agenda-toolbar', '.calendar-filters', '.week-header'].map((s) => {
          const b = document.querySelector(s).getBoundingClientRect(); return { top: b.top, bottom: b.bottom };
        }));
        if (width < 768) {
          expect(Math.abs(boxes[3].top - boxes[0].bottom)).toBeLessThan(2);
          expect(boxes[1].bottom).toBeLessThan(boxes[0].bottom);
          expect(boxes[2].bottom).toBeLessThan(boxes[0].bottom);
        } else for (let i = 1; i < boxes.length; i++) expect(Math.abs(boxes[i].top - boxes[i - 1].bottom)).toBeLessThan(2);
        await page.locator('.calendar-scroll').evaluate((el) => { el.scrollLeft = 220; });
        await expect.poll(() => page.evaluate(() => {
          const h = document.querySelector('.week-header .day-header').getBoundingClientRect();
          const b = document.querySelector('.day-column').getBoundingClientRect();
          return Math.abs(h.left - b.left) + Math.abs(h.width - b.width);
        })).toBeLessThan(2);
        await page.screenshot({ path: `test-results/m4/cabeceras-${mode}-${view}-${width}-${theme}.png` });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      }
    }
  });
}
