import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`semana: atención común del equipo ${ancho} ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const { errores } = await prepararSesion(pagina, 'admin_negocio', tema);
    let fallo = false;
    await pagina.route((url) => url.pathname === '/sucursales', (rutaInterceptada) => rutaInterceptada.fulfill({ json: [{ id: 1, nombre: 'Norte', activo: true }, { id: 2, nombre: 'Sur', activo: true }] }));
    await pagina.route((url) => url.pathname === '/profesionales', (rutaInterceptada) => rutaInterceptada.fulfill({ json: [{ id: 1, nombre: 'Ana', activo: true }, { id: 2, nombre: 'Beto', activo: true }] }));
    await pagina.route((url) => /\/profesionales\/\d+\/sucursales$/.test(url.pathname), (rutaInterceptada) => rutaInterceptada.fulfill({ json: [1, 2] }));
    await pagina.route((url) => /\/profesionales\/\d+\/atencion$/.test(url.pathname), async (rutaInterceptada) => {
      const u = new URL(rutaInterceptada.request().url()), id = Number(u.pathname.split('/')[2]), dia = u.searchParams.get('desde');
      if (fallo && id === 2) { await rutaInterceptada.fulfill({ status: 503, json: { message: 'Temporal' } }); return; }
      const tramos = id === 1 ? [[1, 540, 720], [2, 960, 1080]] : [[1, 660, 900]];
      const utc = (minutos) => new Date(Date.parse(dia + 'T00:00:00Z') + (minutos + 360) * 60000).toISOString();
      await rutaInterceptada.fulfill({ json: { desde: dia, hasta: u.searchParams.get('hasta'), personalId: id, omisiones: [], intervalos: tramos.map(([sucursal, inicio, fin]) => ({ fecha: dia, sucursalId: sucursal, inicioMinutos: inicio, finMinutos: fin, inicioUtc: utc(inicio), finUtc: utc(fin) })) } });
    });
    await pagina.goto('/admin/agenda');
    const primera = pagina.locator('.columna-dia').first();
    await expect(primera.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /15:00–18:00/);
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('all');
    await expect(primera.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /15:00–16:00/);
    await pagina.getByLabel('Profesional', { exact: true }).selectOption('1');
    await expect(primera.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /12:00–16:00/);
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await expect(primera.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /12:00–18:00/);
    await pagina.getByLabel('Profesional', { exact: true }).selectOption('all');
    await expect(primera.locator('.agenda-sin-atencion').last()).toHaveAttribute('title', /15:00–18:00/);
    await primera.scrollIntoViewIfNeeded();
    await pagina.screenshot({ path: `test-results/m4/semana-atencion-${ancho}-${tema}.png` });
    fallo = true;
    await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
    await expect(pagina.getByText('No se pudo comprobar la atención de todo el equipo. Usa Actualizar agenda.', { exact: true })).toBeVisible();
    await expect(pagina.locator('.agenda-sin-atencion')).toHaveCount(0);
    await pagina.goto('/admin/agenda?demo=1');
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('all');
    await expect(pagina.locator('.calendario-semana:not(.dia-unico)')).toBeVisible();
    await expect(pagina.locator('.agenda-sin-atencion').first()).toContainText('ningún profesional');
    expect(errores).toEqual([]);
  });
}
