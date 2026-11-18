import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const mode of ['connected', 'demo']) for (const width of [1366, 390]) {
  test(`preferencia de vista ${mode} ${width}px: inicio, recarga y acceso temporal al día`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await prepararSesion(page);
    const url = `/admin/agenda${mode === 'demo' ? '?demo=1' : ''}`;
    const attr = mode === 'demo' ? 'data-agenda-vista-demo' : 'data-agenda-vista';
    const dayAttr = mode === 'demo' ? 'data-agenda-dia-demo' : 'data-agenda-fecha';
    await page.goto(url);
    await expect(page.locator(`[${attr}="week"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator(`[${attr}="month"]`).click();
    await page.reload();
    await expect(page.locator(`[${attr}="month"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator(`.mes-fecha[${dayAttr}]`).first().click();
    await expect(page.locator(`[${attr}="day"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator(`[${attr}="month"]`)).toHaveAttribute('aria-pressed', 'true');
  });
}
