import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`distribución adaptable y máximo editable ${ancho} ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await prepararSesion(pagina, 'recepcionista', tema);
    await pagina.goto('/admin/agenda');
    await pagina.locator('[data-agenda-vista="day"]').click();
    await expect(pagina.locator('.calendario-evento')).toHaveCount(1);
    if (ancho === 390) {
      await expect.poll(() => pagina.locator('.columna-dia').evaluate((elemento) => elemento.getBoundingClientRect().width)).toBeGreaterThanOrEqual(310);
      expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const tarjeta = pagina.locator('.calendario-evento');
    // Chromium puede normalizar el valor lógico de flex-end como flow-end.
    await expect(tarjeta.locator('.evento-hora')).toHaveCSS('justify-content', /^(flex-end|flow-end)$/);
    await expect(tarjeta.locator('.evento-sucursal')).toHaveCSS('text-align', 'right');
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await expect(tarjeta.locator('.evento-hora')).toHaveCSS('justify-content', /^(flex-end|flow-end)$/);
    await expect(tarjeta.locator('.evento-sucursal')).toHaveCount(0);
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('all');
    await expect.poll(() => tarjeta.evaluate((elemento) => Math.abs(elemento.querySelector("strong").getBoundingClientRect().y - elemento.querySelector(".evento-hora").getBoundingClientRect().y))).toBeLessThan(1);
    const geometria = await tarjeta.evaluate((elemento) => {
      const rectangulo = (s) => elemento.querySelector(s).getBoundingClientRect();
      return { name: rectangulo('strong').y, time: rectangulo('.evento-hora').y, service: rectangulo('.evento-servicio').y, branch: rectangulo('.evento-sucursal').y };
    });
    expect(geometria.name).toBeCloseTo(geometria.time, 0);
    expect(geometria.service).toBeCloseTo(geometria.branch, 0);
    await pagina.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '60px'));
    const escala = () => pagina.locator('.calendario-semana').evaluate((elemento) => parseFloat(elemento.style.getPropertyValue('--alto-hora')));
    await expect.poll(escala).toBeLessThanOrEqual(60);
    await pagina.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '300px'));
    await expect.poll(escala).toBeGreaterThan(60);
    await pagina.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '24px'));
    await expect.poll(escala).toBe(24);
    await expect(tarjeta).toHaveAttribute('data-densidad', 'tiny');
    await expect(tarjeta).toHaveAttribute('title', /Consulta histórica/);
    await pagina.evaluate(() => document.documentElement.style.removeProperty('--agenda-alto-hora-maximo'));
    await pagina.evaluate(() => {
      const hoja = [...document.styleSheets].find((s) => [...s.cssRules].some((respuesta) => respuesta.selectorText === ':root' && respuesta.style?.getPropertyValue('--agenda-alto-hora-maximo')));
      const regla = [...hoja.cssRules].find((respuesta) => respuesta.selectorText === ':root' && respuesta.style?.getPropertyValue('--agenda-alto-hora-maximo'));
      regla.style.setProperty('--agenda-alto-hora-maximo', '72px');
    });
    await expect.poll(escala).toBe(72);
    await pagina.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '240px'));
    await tarjeta.scrollIntoViewIfNeeded();
    await pagina.screenshot({ path: `test-results/m4/compacta-${ancho}-${tema}.png` });
  });
}
