import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const [ancho, tema] of [[1366, 'light'], [1366, 'dark'], [390, 'light'], [390, 'dark']]) test(`T033: agenda propia sin directorio, ${ancho}px ${tema}`, async ({ page: pagina }) => {
  await pagina.setViewportSize({ width: ancho, height: 850 });
  const { solicitudesObservadas, errores } = await prepararSesion(pagina, 'profesional', tema);
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();

  // La cita propia expone los controles de estado y horario con su versión observada.
  await pagina.locator('[data-agenda-cita="7"]').click();
  const detalle = pagina.getByRole('dialog');
  await expect(detalle.getByRole('heading', { name: 'Gestionar estado' })).toBeVisible();
  await expect(detalle.getByRole('heading', { name: 'Cambiar horario' })).toBeVisible();
  await pagina.keyboard.press('Escape');

  // El alta fija el perfil de la sesión y solo ofrece captura de contacto.
  await pagina.locator('[data-agenda-nueva]').click();
  const alta = pagina.getByRole('dialog');
  await expect(alta).toContainText('Personal QA');
  await expect(alta.locator('[name="personalId"]')).toHaveValue('1');
  await expect(alta.getByLabel('Nombre completo')).toBeVisible();
  await expect(alta.getByLabel('Teléfono')).toBeVisible();
  await expect(alta.getByText('Cliente existente')).toHaveCount(0);
  await expect(alta.getByRole('button', { name: 'Buscar clientes' })).toHaveCount(0);
  // El modal queda utilizable por encima de la navegación inferior en ambos tamaños y temas.
  await expect(alta.locator('[data-manual-guardar]')).toBeInViewport();
  await pagina.screenshot({ path: `test-results/m4/profesional-${ancho}-${tema}.png`, fullPage: true });
  expect(solicitudesObservadas.some((entrada) => /\/clientes/.test(entrada))).toBe(false);
  expect(errores).toEqual([]);
});
