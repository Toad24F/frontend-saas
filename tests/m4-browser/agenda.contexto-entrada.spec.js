import { test, expect } from '@playwright/test';

test('primera entrada desde el portal respeta una sucursal explícita de reserva', async ({ page }) => {
  await page.goto('/reservas/clinica-bienestar?demo=1');
  await expect(page.getByRole('link', { name: /Volver al panel/ })).toBeVisible();
  const branch = await page.evaluate(async () => {
    const { estadoAplicacion: state } = await import('/src/shared/aplicacion.nucleo.js');
    const { listarRegistros: list } = await import('/src/shared/aplicacion.datos.js');
    const branches = list('branches', state.negocioId).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    state.sucursal = String(branches.at(-1).id);
    return state.sucursal;
  });
  await page.getByRole('link', { name: /Volver al panel/ }).click();
  await expect(page.getByLabel('Sucursal', { exact: true })).toHaveValue(branch);
});
