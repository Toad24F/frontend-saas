import { test, expect } from '@playwright/test';

const temas = [
  { nombre: 'light', fondo: 'rgb(244, 245, 246)', acento: '#b9482b' },
  { nombre: 'dark', fondo: 'rgb(21, 22, 26)', acento: '#ba4e34' },
];

for (const ancho of [1366, 390]) {
  for (const tema of temas) {
    test(`estilos globales y navegación a ${ancho} px en tema ${tema.nombre}`, async ({ page: pagina }) => {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      await pagina.addInitScript((nombre) => localStorage.setItem('cita-theme', nombre), tema.nombre);
      await pagina.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          value: { async writeText(enlace) { sessionStorage.setItem('enlace-copiado-prueba', enlace); } },
        });
      });
      await pagina.emulateMedia({ reducedMotion: 'no-preference' });
      await pagina.goto('/admin/resumen?demo=1');
      await expect(pagina.getByRole('heading', { name: 'Buenos días, Adriana' })).toBeVisible();
      await expect(pagina.locator('html')).toHaveAttribute('data-theme', tema.nombre);
      await expect(pagina.locator('body')).toHaveCSS('background-color', tema.fondo);
      await expect.poll(() => pagina.locator('html').evaluate((raiz) => getComputedStyle(raiz).getPropertyValue('--acento').trim())).toBe(tema.acento);
      const contenido = pagina.getByRole('main');
      await expect(contenido).toHaveCSS('animation-name', 'entrada-pantalla');
      await pagina.emulateMedia({ reducedMotion: 'reduce' });
      await expect(contenido).toHaveCSS('animation-name', 'none');

      const barra = pagina.getByRole('navigation', { name: 'Navegación inferior' });
      if (ancho === 390) {
        await expect(barra).toHaveCSS('position', 'fixed');
        await expect(barra.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
        const mas = barra.getByRole('button', { name: 'Más secciones' });
        await mas.click();
        await expect(mas).toHaveAttribute('aria-expanded', 'true');
        await pagina.keyboard.press('Escape');
        await expect(mas).toBeFocused();
        await expect(mas).toHaveAttribute('aria-expanded', 'false');
      } else {
        await expect(barra).toBeHidden();
      }
      await pagina.goto('/admin/configuracion?demo=1');
      const portal = pagina.getByRole('region', { name: 'Tu portal de reservas' });
      await expect(portal).toHaveCSS('padding-top', ancho === 390 ? '20px' : '26px');
      await expect(portal.getByLabel('Enlace del portal')).toHaveValue(/\/reservas\/clinica-bienestar\?demo=1$/);
      await expect(portal.getByRole('link', { name: 'Abrir portal (nueva pestaña)' })).toHaveAttribute('target', '_blank');
      await portal.getByRole('button', { name: 'Copiar enlace' }).click();
      await expect(portal.getByRole('status')).toHaveText('Enlace copiado.');
      expect(await pagina.evaluate(() => sessionStorage.getItem('enlace-copiado-prueba'))).toMatch(/\/reservas\/clinica-bienestar\?demo=1$/);
      await pagina.getByRole('button', { name: 'Cambiar negocio' }).click();
      const dialogo = pagina.getByRole('dialog', { name: 'Cambiar espacio de trabajo' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toHaveCSS('animation-name', 'none');
      await dialogo.getByRole('button', { name: 'Cerrar' }).click();
      await expect(pagina.getByRole('button', { name: 'Cambiar negocio' })).toBeFocused();
    });
  }
}
