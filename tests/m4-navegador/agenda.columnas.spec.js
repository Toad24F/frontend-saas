import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`columnas, filtros fijos y aviso retirado ${ancho} ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.clock.setFixedTime(new Date('2026-11-16T18:00:00Z'));
    await prepararSesion(pagina, 'recepcionista', tema);
    await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
      const q = new URL(rutaInterceptada.request().url()).searchParams, dia = q.get('desde');
      await rutaInterceptada.fulfill({ json: { desde: dia, hasta: q.get('hasta'), citas: [1, 2, 3, 4].flatMap((id) => Array.from({ length: id }, (_, indice) => ({ id: id * 10 + indice, version: 1, estado: id === 4 ? 'pendiente' : 'confirmada', fechaLocal: dia, fechaFinLocal: dia, horaInicio: `${String(9 + indice).padStart(2, '0')}:00:00`, horaFin: `${String(10 + indice).padStart(2, '0')}:00:00`, personalId: id, sucursalId: 1, nombreContacto: 'Cliente', nombreServicio: 'Consulta', nombreProfesional: `Persona ${id}`, nombreSucursal: 'Norte', zonaHoraria: 'America/Chihuahua', causas: [] }))) } });
    });
    await pagina.goto('/admin/agenda');
    await pagina.locator('[data-agenda-vista="day"]').click();
    await expect(pagina.locator('[data-calendario-profesional]')).toHaveCount(4);
    expect(await pagina.locator('[data-calendario-profesional]').evaluateAll((elementos) => elementos.map((error) => error.dataset.calendarioProfesional))).toEqual(['4', '3', '2', '1']);
    if (ancho === 1366) {
      const tamanos = await pagina.locator('.calendario-desplazamiento').evaluate((elemento) => ({ available: elemento.clientWidth - 58, column: elemento.querySelector('.columna-dia').getBoundingClientRect().width, overflow: elemento.scrollWidth > elemento.clientWidth }));
      expect(tamanos.column * 3).toBeCloseTo(tamanos.available, -1);
      expect(tamanos.overflow).toBe(true);
    }
    await expect(pagina.getByRole('button', { name: 'Reintentar atención' })).toHaveCount(0);
    await pagina.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    const posicion = await pagina.locator('.calendario-filtros').evaluate((elemento) => ({ top: elemento.getBoundingClientRect().top, bar: document.querySelector('.agenda-barra').getBoundingClientRect().bottom }));
    if (ancho >= 768) expect(Math.abs(posicion.top - posicion.bar)).toBeLessThan(2);
    else expect(await pagina.locator('.calendario-filtros').evaluate((elemento) => elemento.getBoundingClientRect().bottom)).toBeLessThan(0);
    await pagina.screenshot({ path: `test-results/m4/filtros-fijos-${ancho}-${tema}.png` });
    await pagina.getByLabel('Estado', { exact: true }).selectOption('confirmada');
    await expect(pagina.locator('[data-calendario-profesional]')).toHaveCount(3);
    if (ancho === 1366) expect(await pagina.locator('.calendario-desplazamiento').evaluate((elemento) => elemento.scrollWidth <= elemento.clientWidth + 1)).toBe(true);
    await expect(pagina.getByLabel('Estado', { exact: true })).toHaveValue('confirmada');
    await pagina.goto('/admin/agenda?demo=1');
    await pagina.locator('[data-agenda-vista-demo="day"]').click();
    const cantidades = await pagina.locator('[data-calendario-profesional]').evaluateAll((elementos) => elementos.map((elemento) => elemento.querySelectorAll('.calendario-evento').length));
    expect(cantidades).toEqual([...cantidades].sort((a, b) => b - a));
    await pagina.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }));
    if (ancho >= 768) expect(await pagina.locator('.calendario-filtros').evaluate((elemento) => Math.abs(elemento.getBoundingClientRect().top - document.querySelector('.agenda-barra').getBoundingClientRect().bottom))).toBeLessThan(2);
    else expect(await pagina.locator('.calendario-filtros').evaluate((elemento) => elemento.getBoundingClientRect().bottom)).toBeLessThan(0);
  });
}
