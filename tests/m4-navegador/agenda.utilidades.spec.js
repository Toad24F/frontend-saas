import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

async function preparar(pagina, tema = 'light') {
  const datosPrueba = await prepararSesion(pagina, 'recepcionista', tema);
  const llamadas = [];
  await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
    const url = new URL(rutaInterceptada.request().url()); llamadas.push(url.search);
    const desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta');
    await rutaInterceptada.fulfill({ json: { desde, hasta, citas: Array.from({ length: 12 }, (_, indice) => ({
      id: indice + 1, version: 1, folio: `QA-${indice + 1}`, estado: 'confirmada', nombreContacto: `Paciente ${indice + 1}`,
      nombreServicio: 'Consulta', nombreProfesional: 'Profesional QA', nombreSucursal: 'Sede QA',
      personalId: 1, sucursalId: 1, fechaLocal: desde, fechaFinLocal: desde,
      horaInicio: '12:00:00', horaFin: '12:45:00', zonaHoraria: 'America/Chihuahua',
      causas: indice === 0 ? [{ codigo: 'bloqueo' }] : [],
    })) } });
  });
  await pagina.route((url) => url.pathname === '/profesionales/1/atencion', async (rutaInterceptada) => {
    const url = new URL(rutaInterceptada.request().url()), desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta');
    await rutaInterceptada.fulfill({ json: { desde, hasta, personalId: 1, intervalos: [
      { fecha: desde, sucursalId: 1, inicioMinutos: 540, finMinutos: 780, inicioUtc: `${desde}T15:00:00Z`, finUtc: `${desde}T19:00:00Z` },
      { fecha: desde, sucursalId: 1, inicioMinutos: 840, finMinutos: 1080, inicioUtc: `${desde}T20:00:00Z`, finUtc: `${new Date(Date.parse(`${desde}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)}T00:00:00Z` },
    ], omisiones: [] } });
  });
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('.agenda-resumen')).toContainText('12 citas');
  return { ...datosPrueba, llamadas };
}
test('filtros locales sin carga, refresco explícito y atención de recepción', async ({ page: pagina }) => {
  const { llamadas, errores } = await preparar(pagina);
  const anterior = llamadas.length;
  await pagina.getByLabel('Buscar paciente').fill('Paciente 12');
  await expect(pagina.locator('.agenda-resumen')).toContainText('1 cita en');
  expect(llamadas.length).toBe(anterior);
  await expect(pagina.locator('[data-agenda-esqueleto]')).toHaveCount(0);
  await pagina.getByLabel('Buscar paciente').fill('');
  await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
  await pagina.getByLabel('Profesional', { exact: true }).selectOption('1');
  await expect(pagina.locator('.agenda-sin-atencion').first()).toBeVisible();
  await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect.poll(() => llamadas.length).toBe(anterior + 1);
  await expect(pagina.getByLabel('Profesional', { exact: true })).toHaveValue('1');
  expect(errores).toEqual([]);
});
test('grupo semanal abre día, enfoca y resalta todas sus citas; volver conserva semana', async ({ page: pagina }) => {
  await preparar(pagina, 'dark');
  await pagina.locator('[data-agenda-vista="week"]').click();
  const grupo = pagina.locator('[data-agenda-densidad]').first();
  await expect(grupo).toContainText('12 citas');
  await grupo.click();
  await expect(pagina.locator('[data-agenda-vista="day"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(pagina.locator('.agenda-resaltado')).toHaveCount(12);
  await expect(pagina.locator('[data-agenda-cita="1"]')).toBeFocused();
  expect(await pagina.locator('[data-agenda-cita="1"]').evaluate((tarjeta) => tarjeta.getBoundingClientRect().top >= document.querySelector('.semana-encabezado').getBoundingClientRect().bottom)).toBe(true);
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
  await pagina.getByRole('button', { name: 'Volver a la semana' }).click();
  await expect(pagina.locator('[data-agenda-vista="week"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(pagina.locator('[data-agenda-densidad]').first()).toBeFocused();
});

test('refresco idéntico conserva el DOM y una recuperación retira el aviso técnico', async ({ page: pagina }) => {
  await preparar(pagina);
  await pagina.evaluate(() => { window.agendaNode = document.querySelector('.calendario-semana'); });
  await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(pagina.getByRole('button', { name: 'Actualizar agenda', exact: true })).toBeEnabled();
  expect(await pagina.evaluate(() => window.agendaNode === document.querySelector('.calendario-semana'))).toBe(true);
  let rechazarPromesa = true;
  await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
    if (rechazarPromesa) await rutaInterceptada.fulfill({ status: 503, json: { message: 'Temporal' } });
    else await rutaInterceptada.fallback();
  });
  await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(pagina.locator('[data-aviso-en-vivo]')).toBeVisible();
  rechazarPromesa = false;
  await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(pagina.locator('[data-aviso-en-vivo]')).toHaveCount(0);
});

test('atención fallida u omitida nunca inventa un sombreado en la fecha afectada', async ({ page: pagina }) => {
  await preparar(pagina);
  let rechazarPromesa = true;
  await pagina.route((url) => url.pathname === '/profesionales/1/atencion', async (rutaInterceptada) => {
    if (rechazarPromesa) { await rutaInterceptada.fulfill({ status: 403, json: { message: 'No autorizado' } }); return; }
    const consulta = new URL(rutaInterceptada.request().url()).searchParams;
    await rutaInterceptada.fulfill({ json: { desde: consulta.get('desde'), hasta: consulta.get('hasta'), personalId: 1, intervalos: [], omisiones: [{ fecha: consulta.get('desde'), sucursalId: 1, motivo: 'Hora local inexistente o repetida.' }] } });
  });
  await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
  await pagina.getByLabel('Profesional', { exact: true }).selectOption('1');
  await expect(pagina.locator('.agenda-aviso-atencion')).toContainText('No se pudo comprobar');
  await expect(pagina.locator('.agenda-sin-atencion')).toHaveCount(0);
  rechazarPromesa = false;
  await pagina.getByRole('button', { name: 'Actualizar agenda' }).click();
  await expect(pagina.locator('.agenda-aviso-atencion')).toContainText('Atención incompleta');
  await expect(pagina.locator('.columna-dia').first().locator('.agenda-sin-atencion')).toHaveCount(0);
});

for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`revisión visual de utilidad ${ancho}px ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const { errores } = await preparar(pagina, tema);
    await pagina.locator('[data-agenda-vista="week"]').click();
    await expect(pagina.locator('[data-agenda-densidad]')).toBeVisible();
    expect(await pagina.locator('.calendario-desplazamiento').evaluate((elemento) => elemento.scrollHeight <= elemento.clientHeight + 1)).toBe(true);
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await pagina.screenshot({ path: `test-results/m4/utilidad-semana-${ancho}-${tema}.png`, fullPage: true });
    await pagina.locator('[data-agenda-densidad]').click();
    await expect(pagina.locator('.agenda-resaltado')).toHaveCount(12);
    expect(await pagina.locator('[data-agenda-cita="1"]').evaluate((tarjeta) => { const cuadro = tarjeta.getBoundingClientRect(); return cuadro.top >= 0 && cuadro.bottom < innerHeight - 100; })).toBe(true);
    expect(await pagina.locator('.dia-unico .encabezado-dia strong').evaluate((etiqueta) => etiqueta.getBoundingClientRect().left < innerWidth)).toBe(true);
    await pagina.screenshot({ path: `test-results/m4/utilidad-dia-${ancho}-${tema}.png`, fullPage: true });
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await pagina.getByLabel('Profesional', { exact: true }).selectOption('1');
    await expect(pagina.locator('.agenda-sin-atencion').first()).toBeVisible();
    await pagina.screenshot({ path: `test-results/m4/utilidad-atencion-${ancho}-${tema}.png`, fullPage: true });
    await pagina.goto('/admin/agenda?demo=1');
    await expect(pagina.locator('.agenda-resumen')).toBeVisible();
    await expect(pagina.getByText('Datos ficticios', { exact: true })).toBeVisible();
    await pagina.evaluate(async () => { await Promise.allSettled(document.querySelector('main').getAnimations({ subtree: true }).map((x) => x.finished)); });
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await pagina.screenshot({ path: `test-results/m4/utilidad-demo-${ancho}-${tema}.png`, fullPage: true });
    await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
    await pagina.getByLabel('Profesional', { exact: true }).selectOption('1');
    await expect(pagina.locator('.agenda-sin-atencion').first()).toBeVisible();
    await pagina.screenshot({ path: `test-results/m4/utilidad-atencion-demo-${ancho}-${tema}.png`, fullPage: true });
    expect(errores).toEqual([]);
  });
}
