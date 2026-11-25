import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

const principal = ['PRINCIPAL', 'Resumen', 'Agenda', 'Clientes'];
const negocio = ['MI NEGOCIO', 'Usuarios', 'Servicios', 'Sucursales', 'Disponibilidad'];
const menu = (pagina) => pagina.getByRole('navigation', { name: 'Navegación principal', includeHidden: true });

for (const [rol, esperado] of [
  ['admin_negocio', [...principal, ...negocio, 'ANÁLISIS', 'Reportes']],
  ['recepcionista', [...principal, 'MI NEGOCIO', 'Disponibilidad']],
  ['profesional', ['PRINCIPAL', 'Resumen', 'Agenda', 'MI NEGOCIO', 'Servicios', 'Sucursales', 'Disponibilidad']],
  ['superadmin', ['PLATAFORMA', 'Negocios']],
]) {
  test(`la barra lateral agrupa las pantallas permitidas para ${rol}`, async ({ page: pagina }, prueba) => {
    await prepararSesion(pagina, rol);
    await pagina.route((url) => url.pathname === '/bloqueos', (ruta) => ruta.fulfill({ json: { pagina: 1, limite: 25, total: 0, bloqueos: [] } }));
    await pagina.goto('/admin/resumen');
    const navegacion = menu(pagina);
    await expect(navegacion.locator(':scope > .navegacion-seccion, :scope > .navegacion-enlace > span, :scope > .nav-disclosure > button > span')).toHaveText(esperado);
    await expect(navegacion.getByRole('link', { name: 'Notificaciones', exact: true })).toHaveCount(0);
    await expect(pagina.locator('.seccion-inferior-lateral').getByRole('link', { name: 'Mi cuenta' })).toBeVisible();

    if (rol === 'admin_negocio') {
      await pagina.screenshot({ path: prueba.outputPath('navegacion-escritorio-claro.png'), animations: 'disabled' });
      await pagina.getByRole('button', { name: 'Activar modo oscuro' }).click();
      await expect(pagina.locator('html')).toHaveAttribute('data-theme', 'dark');
      await pagina.screenshot({ path: prueba.outputPath('navegacion-escritorio-oscuro.png'), animations: 'disabled' });
      await pagina.setViewportSize({ width: 390, height: 844 });
      await pagina.getByRole('button', { name: 'Más secciones' }).click();
      await expect(navegacion.getByRole('link', { name: 'Reportes' })).toBeVisible();
      await pagina.screenshot({ path: prueba.outputPath('navegacion-movil-oscuro.png'), animations: 'disabled' });
      await navegacion.getByRole('button', { name: 'Usuarios' }).click();
      await expect(navegacion.getByRole('link', { name: 'Profesionales' })).toBeVisible();
      await expect(navegacion.getByRole('link', { name: 'Recepcionistas' })).toBeVisible();
      await expect(pagina.getByRole('navigation', { name: 'Navegación inferior' }).getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page');
      await pagina.keyboard.press('Escape');
      await pagina.getByRole('button', { name: 'Activar modo claro' }).click();
      await pagina.getByRole('button', { name: 'Más secciones' }).click();
      await pagina.screenshot({ path: prueba.outputPath('navegacion-movil-claro.png'), animations: 'disabled' });
    }
  });
}

test('la demo conserva sus categorías y el acceso a Notificaciones', async ({ page: pagina }) => {
  await pagina.goto('/admin/resumen?demo=1');
  const navegacion = menu(pagina);
  await expect(navegacion.locator('.navegacion-seccion')).toHaveText(['PRINCIPAL', 'MI NEGOCIO', 'ANÁLISIS']);
  await expect(navegacion.getByRole('link', { name: 'Notificaciones' })).toHaveAttribute('href', /\/admin\/notificaciones\?demo=1$/);
});
