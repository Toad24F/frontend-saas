import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const modo of ['connected', 'demo']) for (const ancho of [1366, 390]) {
  test(`preferencia de vista ${modo} ${ancho}px: inicio, recarga y acceso temporal al día`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await prepararSesion(pagina);
    const url = `/admin/agenda${modo === 'demo' ? '?demo=1' : ''}`;
    const atributo = modo === 'demo' ? 'data-agenda-vista-demo' : 'data-agenda-vista';
    const atributoDia = modo === 'demo' ? 'data-agenda-dia-demo' : 'data-agenda-fecha';
    await pagina.goto(url);
    await expect(pagina.locator(`[${atributo}="week"]`)).toHaveAttribute('aria-pressed', 'true');
    await pagina.locator(`[${atributo}="month"]`).click();
    await pagina.reload();
    await expect(pagina.locator(`[${atributo}="month"]`)).toHaveAttribute('aria-pressed', 'true');
    await pagina.locator(`.mes-fecha[${atributoDia}]`).first().click();
    await expect(pagina.locator(`[${atributo}="day"]`)).toHaveAttribute('aria-pressed', 'true');
    await pagina.reload();
    await expect(pagina.locator(`[${atributo}="month"]`)).toHaveAttribute('aria-pressed', 'true');
  });
}
