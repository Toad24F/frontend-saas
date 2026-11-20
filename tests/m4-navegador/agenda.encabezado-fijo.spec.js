import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`cabeceras fijas y sincronizadas ${ancho} ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await prepararSesion(pagina, 'recepcionista', tema);
    for (const modo of ['connected', 'demo']) {
      await pagina.goto(`/admin/agenda${modo === 'demo' ? '?demo=1' : ''}`);
      const atributo = modo === 'demo' ? 'data-agenda-vista-demo' : 'data-agenda-vista';
      for (const vista of ['week', 'day']) {
        await pagina.locator(`[${atributo}="${vista}"]`).click();
        await expect(pagina.locator('.semana-cuerpo')).toBeVisible();
        if (vista === 'day') {
          const cabecera = pagina.locator('.encabezado-dia:has(.titulo-profesional)').first();
          await expect(cabecera).toBeVisible();
          await expect.poll(() => cabecera.evaluate((elemento) => {
            const rectangulo = (s) => { const b = elemento.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y }; };
            const dia = rectangulo(':scope > span'), fecha = rectangulo(':scope > strong'), persona = rectangulo('.titulo-profesional'), cantidad = rectangulo('small');
            return persona.x > dia.x && Math.abs(cantidad.x - persona.x) < 1 && Math.abs(persona.y - dia.y) < 1 && Math.abs(cantidad.y - fecha.y) < 1;
          })).toBe(true);
        }
        await pagina.evaluate(() => window.scrollTo({ top: 1100, behavior: 'instant' }));
        const cuadros = await pagina.evaluate(() => ['.barra-superior', '.agenda-barra', '.calendario-filtros', '.semana-encabezado'].map((s) => {
          const b = document.querySelector(s).getBoundingClientRect(); return { top: b.top, bottom: b.bottom };
        }));
        if (ancho < 768) {
          expect(Math.abs(cuadros[3].top - cuadros[0].bottom)).toBeLessThan(2);
          expect(cuadros[1].bottom).toBeLessThan(cuadros[0].bottom);
          expect(cuadros[2].bottom).toBeLessThan(cuadros[0].bottom);
        } else for (let indice = 1; indice < cuadros.length; indice++) expect(Math.abs(cuadros[indice].top - cuadros[indice - 1].bottom)).toBeLessThan(2);
        await pagina.locator('.calendario-desplazamiento').evaluate((elemento) => { elemento.scrollLeft = 220; });
        await expect.poll(() => pagina.evaluate(() => {
          const altura = document.querySelector('.semana-encabezado .encabezado-dia').getBoundingClientRect();
          const b = document.querySelector('.columna-dia').getBoundingClientRect();
          return Math.abs(altura.left - b.left) + Math.abs(altura.width - b.width);
        })).toBeLessThan(2);
        await pagina.screenshot({ path: `test-results/m4/cabeceras-${modo}-${vista}-${ancho}-${tema}.png` });
        await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      }
    }
  });
}
