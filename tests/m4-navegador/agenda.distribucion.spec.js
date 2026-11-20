import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

async function preparar(pagina, tema) {
  const datosPrueba = await prepararSesion(pagina, 'admin_negocio', tema);
  await pagina.route((url) => ['/sucursales', '/profesionales'].includes(url.pathname) || /\/profesionales\/\d+\/sucursales$/.test(url.pathname), async (rutaInterceptada) => {
    const ruta = new URL(rutaInterceptada.request().url()).pathname;
    const datos = ruta === '/sucursales' ? [{ id: 1, nombre: 'Norte', activo: true }, { id: 2, nombre: 'Centro', activo: true }, { id: 3, nombre: 'Sur', activo: true }]
      : ruta === '/profesionales' ? [{ id: 1, nombre: 'Ana', activo: true }, { id: 2, nombre: 'Beto', activo: true }, { id: 3, nombre: 'Carla', activo: true }]
        : ruta.includes('/1/') ? [1] : ruta.includes('/2/') ? [1, 2] : [3];
    await rutaInterceptada.fulfill({ json: datos });
  });
  await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
    const q = new URL(rutaInterceptada.request().url()).searchParams;
    const dia = await pagina.evaluate(() => new Date().toLocaleDateString('en-CA'));
    await rutaInterceptada.fulfill({ json: { desde: q.get('desde'), hasta: q.get('hasta'), citas: [
      [1, '08:00:00', '08:20:00', 1], [2, '08:20:00', '08:40:00', 1], [3, '09:00:00', '11:00:00', 1], [4, '08:00:00', '08:10:00', 2],
    ].map(([id, inicio, fin, persona]) => ({ id, version: 1, folio: `FOLIO-${id}`, estado: 'confirmada', nombreContacto: 'María Fernanda del Carmen López Hernández', nombreServicio: 'Consulta de seguimiento y valoración integral', nombreProfesional: persona === 1 ? 'Ana' : 'Beto', nombreSucursal: 'Norte', personalId: persona, sucursalId: 1, fechaLocal: dia, fechaFinLocal: dia, horaInicio: inicio, horaFin: fin, zonaHoraria: 'America/Chihuahua', causas: [] })) } });
  });
  await pagina.goto('/admin/agenda');
  return datosPrueba;
}

test('filtros principales resuelven asignación, mantienen selección y permiten histórico explícito', async ({ page: pagina }) => {
  const { errores } = await preparar(pagina, 'light');
  const sucursal = pagina.getByLabel('Sucursal', { exact: true }), persona = pagina.getByLabel('Profesional', { exact: true });
  await expect(sucursal).toHaveValue('2');
  await persona.selectOption('1'); await expect(sucursal).toHaveValue('1');
  await persona.selectOption('2'); await expect(sucursal).toHaveValue('1');
  await persona.selectOption('3'); await expect(sucursal).toHaveValue('3');
  await persona.selectOption('2'); await expect(sucursal).toHaveValue('2');
  await pagina.getByLabel('Consultar otras sucursales (histórico)').check();
  await sucursal.selectOption('3'); await expect(persona).toHaveValue('2');
  await pagina.getByLabel('Consultar otras sucursales (histórico)').uncheck(); await expect(sucursal).toHaveValue('2');
  expect(errores).toEqual([]);
});

test('profesional sin asignaciones conserva una vía explícita a sus citas históricas', async ({ page: pagina }) => {
  await prepararSesion(pagina, 'profesional');
  await pagina.route((url) => url.pathname.endsWith('/oferta'), (rutaInterceptada) => rutaInterceptada.fulfill({ json: { cuentaActiva: true, sucursales: [] } }));
  await pagina.goto('/admin/agenda');
  await expect(pagina.getByLabel('Sucursal', { exact: true })).toHaveValue('none');
  await expect(pagina.locator('.calendario-evento')).toHaveCount(0);
  await pagina.getByLabel('Consultar otras sucursales (histórico)').check();
  await pagina.getByLabel('Sucursal', { exact: true }).selectOption('all');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  await expect(pagina.getByLabel('Profesional', { exact: true })).toHaveCount(0);
});

for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`tarjetas y columnas ${ancho}px ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const { errores } = await preparar(pagina, tema);
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await pagina.locator('[data-agenda-vista="day"]').click();
    await expect(pagina.locator('[data-calendario-profesional]')).toHaveCount(2);
    await expect(pagina.locator('[data-calendario-profesional="1"] [data-agenda-cita="4"]')).toHaveCount(0);
    await pagina.screenshot({ path: `test-results/m4/agenda-columnas-${ancho}-${tema}.png`, fullPage: true });
    await pagina.getByLabel('Profesional', { exact: true }).selectOption('1');
    const primera = pagina.locator('[data-agenda-cita="1"]'), segunda = pagina.locator('[data-agenda-cita="2"]');
    await expect(primera).toBeVisible();
    await expect(segunda).toBeVisible();
    await expect.poll(async () => {
      const [primerRectangulo, segundoRectangulo] = await Promise.all([primera.boundingBox(), segunda.boundingBox()]);
      return primerRectangulo !== null && segundoRectangulo !== null &&
        Math.abs(primerRectangulo.x - segundoRectangulo.x) < 0.5 &&
        Math.abs(primerRectangulo.width - segundoRectangulo.width) < 0.5 &&
        primerRectangulo.y + primerRectangulo.height <= segundoRectangulo.y;
    }).toBe(true);
    expect(await primera.evaluate((elemento) => elemento.getBoundingClientRect().width / elemento.parentElement.getBoundingClientRect().width)).toBeGreaterThan(.95);
    expect(await pagina.locator('.calendario-evento').evaluateAll((tarjetas) => tarjetas.every((tarjeta) => [...tarjeta.children].every((hijo) => hijo.getBoundingClientRect().bottom <= tarjeta.getBoundingClientRect().bottom)))).toBe(true);
    await expect(pagina.locator('.calendario-evento')).not.toContainText(['FOLIO']);
    expect(await pagina.locator('.calendario-desplazamiento').evaluate((elemento) => elemento.scrollHeight <= elemento.clientHeight + 1)).toBe(true);
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await primera.scrollIntoViewIfNeeded();
    await pagina.screenshot({ path: `test-results/m4/agenda-individual-${ancho}-${tema}.png`, fullPage: true });
    await pagina.locator('[data-agenda-vista="week"]').click();
    await pagina.screenshot({ path: `test-results/m4/agenda-semana-${ancho}-${tema}.png`, fullPage: true });
    await pagina.locator('[data-agenda-vista="month"]').click();
    await expect(pagina.locator('.mes-dia')).toHaveCount(42);
    await expect(pagina.locator('.mes-evento .evento-folio')).toHaveCount(0);
    await pagina.screenshot({ path: `test-results/m4/agenda-mes-${ancho}-${tema}.png`, fullPage: true });
    await pagina.goto('/admin/agenda?demo=1');
    await pagina.locator('.encabezado-dia').filter({ has: pagina.locator('small', { hasText: /^[1-9]/ }) }).first().click();
    await expect(pagina.locator('.calendario-semana.dia-unico')).toBeVisible();
    await expect(pagina.locator('.calendario-evento').first()).toBeVisible();
    await pagina.locator('.calendario-evento').first().scrollIntoViewIfNeeded();
    await pagina.screenshot({ path: `test-results/m4/agenda-demo-dia-${ancho}-${tema}.png` });
    await expect(pagina.locator('.calendario-evento .evento-folio')).toHaveCount(0);
    await pagina.getByLabel('Profesional', { exact: true }).selectOption(await pagina.locator('.columna-dia:has(.calendario-evento)').first().getAttribute('data-calendario-profesional'));
    expect(await pagina.locator('.calendario-evento').first().evaluate((elemento) => elemento.getBoundingClientRect().width / elemento.parentElement.getBoundingClientRect().width)).toBeGreaterThan(.95);
    expect(errores).toEqual([]);
  });
}
