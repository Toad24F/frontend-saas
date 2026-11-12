import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

for (const mode of ['connected', 'demo']) for (const width of [1366, 390]) {
  test(`preferencia de vista ${mode} ${width}px: inicio, recarga y acceso temporal al día`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    const url = `/admin/agenda${mode === 'demo' ? '?demo=1' : ''}`;
    const attr = mode === 'demo' ? 'data-view' : 'data-m4-view';
    const dayAttr = mode === 'demo' ? 'data-day' : 'data-m4-date';
    await page.goto(url);
    await expect(page.locator(`[${attr}="${width === 390 ? 'day' : 'week'}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator(`[${attr}="month"]`).click();
    await page.reload();
    await expect(page.locator(`[${attr}="month"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator(`.month-date[${dayAttr}]`).first().click();
    await expect(page.locator(`[${attr}="day"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator(`[${attr}="month"]`)).toHaveAttribute('aria-pressed', 'true');
  });
}
