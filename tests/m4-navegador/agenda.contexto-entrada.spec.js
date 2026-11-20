import { test, expect } from '@playwright/test';

test('primera entrada desde el portal respeta una sucursal explícita de reserva', async ({ page: pagina }) => {
  await pagina.goto('/reservas/clinica-bienestar?demo=1');
  await expect(pagina.getByRole('link', { name: /Volver al panel/ })).toBeVisible();
  const sucursal = await pagina.evaluate(async () => {
    const { estadoAplicacion: estado } = await import('/src/shared/aplicacion.nucleo.js');
    const { listarRegistros: lista } = await import('/src/shared/aplicacion.datos.js');
    const sucursales = lista('branches', estado.negocioId).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    estado.sucursal = String(sucursales.at(-1).id);
    return estado.sucursal;
  });
  await pagina.getByRole('link', { name: /Volver al panel/ }).click();
  await expect(pagina.getByLabel('Sucursal', { exact: true })).toHaveValue(sucursal);
});
