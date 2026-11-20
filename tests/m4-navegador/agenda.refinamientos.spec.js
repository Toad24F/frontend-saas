import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`agenda refinada ${ancho}px ${tema}: skeleton, leyenda, densidad y panel`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const { errores } = await prepararSesion(pagina, 'recepcionista', tema);
    let liberar;
    const esperaRespuesta = new Promise((resolverPromesa) => { liberar = resolverPromesa; });
    await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => { await esperaRespuesta; await rutaInterceptada.fallback(); });
    await pagina.goto('/admin/agenda');
    await expect(pagina.locator('[data-agenda-esqueleto]')).toBeVisible();
    await expect(pagina.locator('.agenda-resumen')).toContainText('Cargando citas');
    await expect(pagina.locator('.indicador-texto')).toHaveCount(0);
    await expect(pagina.locator('.calendario-barra .leyenda')).toContainText('Confirmada');
    expect(await pagina.locator('.calendario-barra').evaluate((elemento) => {
      const hoy = elemento.querySelector('.btn-hoy'), leyenda = elemento.querySelector('.leyenda'), vistas = elemento.querySelector('.selector-segmentado');
      return Boolean(hoy.compareDocumentPosition(leyenda) & 4) && Boolean(leyenda.compareDocumentPosition(vistas) & 4);
    })).toBe(true);
    // El estado de carga se captura después de la entrada de pantalla existente, no durante su fundido.
    await expect(pagina.locator('.agenda-resumen')).toBeVisible();
    await pagina.screenshot({ path: `test-results/m4/skeleton-${ancho}-${tema}.png` });
    liberar();
    await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
    await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
      const consulta = new URL(rutaInterceptada.request().url()).searchParams, dia = consulta.get('desde');
      const citas = Array.from({ length: 8 }, (_, indice) => ({ id: indice + 1, version: 1, folio: `M-DENSE-${String(indice + 1).padStart(5, '0')}`, estado: 'confirmada', origen: 'manual', nombreContacto: `Paciente ${indice + 1}`, nombreServicio: 'Consulta', nombreProfesional: 'Profesional QA', nombreSucursal: 'Sucursal QA', sucursalId: 1, personalId: 1, fechaLocal: dia, fechaFinLocal: dia, horaInicio: `${String(9 + Math.floor(indice / 4)).padStart(2, '0')}:${String(indice % 4 * 15).padStart(2, '0')}:00`, horaFin: `${String(9 + Math.floor((indice + 1) / 4)).padStart(2, '0')}:${String((indice + 1) % 4 * 15).padStart(2, '0')}:00`, zonaHoraria: 'America/Tijuana', causas: [] }));
      await rutaInterceptada.fulfill({ json: { desde: dia, hasta: consulta.get('hasta'), citas } });
    });
    // Cambiar de periodo y refrescar carga la fixture densa en ambos tamaños.
    await pagina.locator('[data-agenda-vista="week"]').click();
    await pagina.locator('[data-agenda-vista="day"]').click();
    await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
    await expect(pagina.locator('.calendario-evento')).toHaveCount(8);
    await expect(pagina.locator('.calendario-evento .evento-servicio')).toHaveCount(8);
    expect(await pagina.locator('.calendario-evento').evaluateAll((elementos) => {
      const rectangulos = elementos.map((elemento) => elemento.getBoundingClientRect());
      return rectangulos.every((a, indice) => rectangulos.slice(indice + 1).every((b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) <= 1 || Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) <= 1));
    })).toBe(true);
    await expect(pagina.locator('.calendario-evento .evento-folio')).toHaveCount(0);
    await expect(pagina.locator('[data-agenda-cita="7"]')).not.toHaveAttribute('aria-label', /M-DENSE-00007/);
    await pagina.locator('.calendario-evento').first().scrollIntoViewIfNeeded();
    await pagina.screenshot({ path: `test-results/m4/dense-${ancho}-${tema}.png` });
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await pagina.locator('[data-agenda-cita="7"]').click();
    const panel = pagina.getByRole('dialog');
    await expect(panel).toHaveClass(/agenda-panel-lateral/);
    await expect(panel).toContainText('Historial de la cita');
    await expect.poll(() => panel.evaluate((elemento) => Math.abs(elemento.getBoundingClientRect().right - innerWidth) < 1)).toBe(true);
    await pagina.getByRole('button', { name: 'Guardar estado', exact: true }).scrollIntoViewIfNeeded();
    await expect(pagina.getByRole('button', { name: 'Guardar estado', exact: true })).toBeInViewport();
    await pagina.screenshot({ path: `test-results/m4/panel-${ancho}-${tema}.png` });
    await pagina.keyboard.press('Escape');
    await expect(pagina.locator('[data-agenda-cita="7"]')).toBeFocused();
    expect(errores).toEqual([]);
  });
}
test('paneles conservan borradores de alta y estado al cerrar sin guardar', async ({ page: pagina }) => {
  await prepararSesion(pagina); await pagina.goto('/admin/agenda');
  await pagina.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  await pagina.getByLabel('Nombre completo', { exact: true }).fill('Borrador pendiente');
  await pagina.getByLabel('Notas de consulta').fill('Conservar estas notas');
  await pagina.keyboard.press('Escape');
  await pagina.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  await expect(pagina.getByLabel('Nombre completo', { exact: true })).toHaveValue('Borrador pendiente');
  await expect(pagina.getByLabel('Notas de consulta')).toHaveValue('Conservar estas notas');
  await expect(pagina.locator('[name="horario"]')).toBeDisabled();
  await pagina.keyboard.press('Escape');
  await pagina.locator('[data-agenda-cita="7"]').click();
  await pagina.getByLabel('Estado de la cita').selectOption('cancelada');
  await pagina.getByLabel('Motivo del cambio').fill('Borrador de motivo');
  await pagina.keyboard.press('Escape');
  await pagina.locator('[data-agenda-cita="7"]').click();
  await expect(pagina.getByLabel('Estado de la cita')).toHaveValue('cancelada');
  await expect(pagina.getByLabel('Motivo del cambio')).toHaveValue('Borrador de motivo');
});
test('demo conserva las mismas mejoras y reduce animación cuando se solicita', async ({ page: pagina }) => {
  await pagina.emulateMedia({ reducedMotion: 'reduce' });
  await pagina.goto('/admin/agenda?demo=1');
  await expect(pagina.locator('.calendario-barra .leyenda')).toContainText('No asistió');
  await expect(pagina.locator('.indicador-texto')).toHaveCount(0);
  // El folio ya no aparece en las tarjetas, tampoco en el nombre accesible.
  await expect(pagina.locator('.calendario-evento').first()).not.toHaveAttribute('aria-label', /Folio/);
  await pagina.locator('[data-cita]').first().click();
  await expect(pagina.getByRole('dialog')).toHaveClass(/agenda-panel-lateral/);
  await expect.poll(() => pagina.getByRole('dialog').evaluate((elemento) => getComputedStyle(elemento).backgroundColor)).toMatch(/^rgb\(/);
  await pagina.keyboard.press('Escape');
  await pagina.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  await expect(pagina.getByRole('dialog')).toHaveClass(/agenda-panel-lateral/);
});
