import { test, expect } from '@playwright/test';

test('primera entrada desde el portal respeta una sucursal explícita de reserva', async ({ page }) => {
  await page.goto('/reservas/clinica-bienestar?demo=1');
  await expect(page.getByRole('link', { name: /Volver al panel/ })).toBeVisible();
  const branch = await page.evaluate(async () => {
    const { state } = await import('/src/shared/app.js');
    const { list } = await import('/src/shared/data.js');
    const branches = list('branches', state.tenantId).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    state.branch = String(branches.at(-1).id);
    return state.branch;
  });
  await page.getByRole('link', { name: /Volver al panel/ }).click();
  await expect(page.getByLabel('Sucursal', { exact: true })).toHaveValue(branch);
});
