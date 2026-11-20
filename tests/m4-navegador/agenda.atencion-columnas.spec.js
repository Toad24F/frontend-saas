import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`atención por columna y todas las sedes ${ancho} ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.clock.setFixedTime(new Date('2026-11-16T18:00:00Z'));
    const { errores } = await prepararSesion(pagina, 'recepcionista', tema);
    let fallo = true;
    await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
      const q = new URL(rutaInterceptada.request().url()).searchParams, dia = q.get('desde');
      await rutaInterceptada.fulfill({ json: { desde: dia, hasta: q.get('hasta'), citas: [1, 2].map((id) => ({ id, version: 1, estado: 'confirmada', fechaLocal: dia, fechaFinLocal: dia, horaInicio: '10:00:00', horaFin: '11:00:00', sucursalId: 1, personalId: id, nombreContacto: `Paciente ${id}`, nombreServicio: 'Consulta', nombreProfesional: `Profesional ${id}`, nombreSucursal: 'Norte', zonaHoraria: 'America/Chihuahua', causas: [] })) } });
    });
    await pagina.route((url) => /\/profesionales\/\d+\/atencion$/.test(url.pathname), async (rutaInterceptada) => {
      const url = new URL(rutaInterceptada.request().url()), id = Number(url.pathname.split('/')[2]), dia = url.searchParams.get('desde');
      if (id === 2 && fallo) { await rutaInterceptada.fulfill({ status: 503, json: { message: 'Temporal' } }); return; }
      await rutaInterceptada.fulfill({ json: { desde: dia, hasta: url.searchParams.get('hasta'), personalId: id, omisiones: [], intervalos: [
        { fecha: dia, sucursalId: 1, inicioMinutos: 540, finMinutos: 720, inicioUtc: `${dia}T15:00:00Z`, finUtc: `${dia}T18:00:00Z` },
        { fecha: dia, sucursalId: 2, inicioMinutos: 840, finMinutos: 1080, inicioUtc: `${dia}T20:00:00Z`, finUtc: `${new Date(Date.parse(dia) + 86400000).toISOString().slice(0, 10)}T00:00:00Z` },
      ] } });
    });
    await pagina.goto('/admin/agenda');
    await pagina.locator('[data-agenda-vista="day"]').click();
    const primero = pagina.locator('[data-calendario-profesional="1"]'), segundo = pagina.locator('[data-calendario-profesional="2"]');
    await expect(primero.locator('.agenda-sin-atencion')).toHaveCount(1);
    await expect(primero.locator('.agenda-sin-atencion')).toContainText('Sin atención en ninguna sucursal');
    await expect(segundo.locator('.agenda-sin-atencion')).toHaveCount(0);
    await expect(segundo).toContainText('No se pudo consultar');
    fallo = false;
    await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
    await expect(segundo.locator('.agenda-sin-atencion')).toHaveCount(1);
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await expect(primero.locator('.agenda-sin-atencion')).toHaveCount(1);
    await expect(primero.locator('.agenda-sin-atencion')).toHaveAttribute('title', /12:00–18:00/);
    await expect(segundo.locator('.agenda-sin-atencion')).toHaveAttribute('title', /12:00–18:00/);
    await primero.scrollIntoViewIfNeeded();
    await pagina.screenshot({ path: `test-results/m4/atencion-columnas-${ancho}-${tema}.png` });
    await pagina.goto('/admin/agenda?demo=1');
    await pagina.locator('[data-agenda-vista-demo="day"]').click();
    await expect(pagina.locator('.por-profesional .agenda-sin-atencion').first()).toBeVisible();
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('all');
    await expect(pagina.locator('.por-profesional .agenda-sin-atencion').first()).toContainText('Sin atención en ninguna sucursal');
    expect(errores).toEqual([]);
  });
}
