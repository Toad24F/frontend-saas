import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

const estados = { pendiente: 30, confirmada: 50, completada: 10, cancelada: 10, no_asistio: 1 };
const estimacion = { subtotalConocido: '1250.50', sinCosto: 1, incompleta: true };
const fechaCorte = '2026-11-23T17:00:00.000Z';
const expiraEn = '2026-11-24T17:00:00.000Z';

async function prepararReportes(pagina, tema = 'light') {
  await prepararSesion(pagina, 'admin_negocio', tema);
  await pagina.route('**/sucursales', (ruta) => ruta.fulfill({ json: [{ id: 3, nombre: 'Centro actual', activo: false }] }));
  await pagina.route('**/servicios', (ruta) => ruta.fulfill({ json: [{ id: 4, nombre: 'Consulta actual', activo: true }] }));
  await pagina.route('**/profesionales', (ruta) => ruta.fulfill({ json: [{ id: 5, nombre: 'Profesional actual', activo: true }] }));
  await pagina.route('**/profesionales/5/sucursales', (ruta) => ruta.fulfill({ json: [] }));
  await pagina.route('**/bloqueos?*', (ruta) => ruta.fulfill({ json: { bloqueos: [], total: 0, pagina: 1, limite: 25 } }));
  const solicitudes = [];
  let corte;
  const control = { total: 101, fallo: null };
  // La API interceptada reproduce el contrato y permite provocar fallos por etapa.
  await pagina.route('**/reportes/cortes**', async (ruta) => {
    const url = new URL(ruta.request().url());
    const metodo = ruta.request().method();
    const numero = Number(url.searchParams.get('pagina') || 1);
    solicitudes.push({ metodo, ruta: url.pathname, numero });
    if (metodo === 'POST') {
      await control.espera;
      if (control.fallo === 'crear') return ruta.fulfill({ status: 503, json: {} });
      corte = { id: `corte-${solicitudes.filter(({ metodo }) => metodo === 'POST').length}`, fechaCorte, expiraEn,
        filtros: ruta.request().postDataJSON() };
      control.corte = corte;
      return ruta.fulfill({ status: 201, json: corte });
    }
    if (url.pathname.endsWith('/filas')) {
      if (numero === 2 && control.fallo === 'vencido') return ruta.fulfill({ status: 404, json: {} });
      if (numero === 2 && control.fallo === 'incompleto') return ruta.fulfill({ status: 503, json: {} });
      const limite = Number(url.searchParams.get('limite') || 100);
      const inicio = (numero - 1) * limite;
      const filas = Array.from({ length: Math.max(0, Math.min(limite, control.total - inicio)) }, (_, indice) => ({
        citaId: inicio + indice + 1, fechaCivil: '2026-11-20', nombreServicio: `Servicio histórico ${inicio + indice + 1}${inicio + indice + 1 === control.total && control.detalleFinal ? ' ' + control.detalleFinal : ''}`,
        nombreSucursal: 'Centro histórico', nombreProfesional: 'Profesional histórico',
        estado: 'completada', origen: 'manual', costoAceptado: '125.05',
      }));
      return ruta.fulfill({ json: { ...corte, filas, total: control.total,
        pagina: numero, limite, hayMas: inicio + filas.length < control.total } });
    }
    return ruta.fulfill({ json: { ...corte, totalCitas: control.total,
      estados: control.total ? estados : Object.fromEntries(Object.keys(estados).map((estado) => [estado, 0])),
      origen: { manual: { cantidad: control.total ? 88 : 0, porcentaje: control.total ? 87.13 : null }, portal_publico: { cantidad: control.total ? 13 : 0, porcentaje: control.total ? 12.87 : null } },
      evolucion: control.total ? [{ inicioPeriodo: corte.filtros.agrupacion === 'mes' ? '2026-11-01' : '2026-11-16', totalCitas: 101, estados }] : [],
      serviciosSolicitados: control.total ? control.serviciosSolicitados ?? [{ servicioId: 1, nombres: ['Consulta <histórica>'], cantidad: 101 }] : [],
      tasaInasistencia: control.total ? 9.09 : null, tasaCancelacion: control.total ? 9.9 : null,
      denominadoresTasas: { inasistencia: control.total ? 11 : 0, cancelacion: control.total },
      pasadasSinResultado: control.total ? 2 : 0, cancelacionesAutomaticas: control.total ? 3 : 0,
      ingresosEstimados: control.total ? { ...estimacion,
        porServicio: control.ingresosPorServicio ?? [{ ...estimacion, servicioId: 4, nombres: ['Consulta <histórica>'] }],
        porSucursal: control.ingresosPorSucursal ?? [{ ...estimacion, sucursalId: 3, nombres: ['Centro histórico'] }],
      } : { subtotalConocido: '0.00', sinCosto: 0, incompleta: false, porServicio: [], porSucursal: [] },
    } });
  });
  return { control, solicitudes };
}

async function generar(pagina, agrupacion = 'mes') {
  await pagina.getByLabel('Desde').fill('2026-11-01');
  await pagina.getByLabel('Hasta').fill('2026-11-23');
  await pagina.getByLabel('Agrupación').selectOption(agrupacion);
  await pagina.getByRole('button', { name: 'Generar reporte' }).click();
}

test('genera el corte y distingue carga, error y cero citas', async ({ page: pagina }) => {
  const { control } = await prepararReportes(pagina);
  let continuar;
  control.espera = new Promise((resolver) => { continuar = resolver; });
  await pagina.goto('/admin/reportes');
  await expect(pagina.getByRole('heading', { name: 'Reportes', exact: true })).toBeVisible();
  control.fallo = 'crear';
  await generar(pagina);
  await expect(pagina.getByText('Generando reporte…')).toBeVisible();
  continuar();
  await expect(pagina.getByRole('alert')).toContainText('No se pudo generar el reporte');
  await expect(pagina.getByText('Citas atendidas', { exact: true })).toHaveCount(0);
  control.fallo = null;
  control.total = 0;
  await generar(pagina);
  await expect(pagina.getByText('No hay citas para estos filtros.')).toBeVisible();
  await expect(pagina.locator('.reportes-indicadores').getByText('Sin datos', { exact: true })).toHaveCount(1);
  await expect(pagina.locator('.reportes-barra-origen, .reportes-aviso-pasadas')).toHaveCount(0);
  expect(control.corte.filtros).toEqual({ desde: '2026-11-01', hasta: '2026-11-23',
    agrupacion: 'mes', sucursalId: null, personalId: null, servicioId: null });
  await expect(pagina.getByText('Datos de demostración')).toHaveCount(0);
});

test('muestra indicadores y conserva el corte al paginar hasta que caduca', async ({ page: pagina }) => {
  const { control, solicitudes } = await prepararReportes(pagina, 'dark');
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.goto('/admin/reportes');
  await generar(pagina);
  for (const etiqueta of ['Citas del periodo', 'Citas atendidas', 'Ingresos estimados', 'Tasa de inasistencia',
    'Origen de las citas', 'Citas por servicio', 'Evolución mensual']) {
    await expect(pagina.getByText(etiqueta, { exact: true }).first()).toBeVisible();
  }
  await expect(pagina.getByText('1 de 11 citas con resultado de asistencia')).toBeVisible();
  await expect(pagina.getByText('10 canceladas (9.9 %) · 3 automáticas')).toBeVisible();
  await expect(pagina.getByText('2 citas pasadas sin resultado')).toBeVisible();
  await expect(pagina.getByText(/1 cita sin costo histórico/)).toBeVisible();
  await expect(pagina.getByRole('region', { name: 'Citas por servicio' }).getByText('Consulta <histórica>')).toBeVisible();
  await pagina.getByRole('button', { name: 'Siguiente' }).click();
  await expect(pagina.getByText('Servicio histórico 101', { exact: true })).toBeVisible();
  expect(solicitudes.at(-1)).toMatchObject({ ruta: '/reportes/cortes/corte-1/filas', numero: 2 });
  await pagina.getByRole('button', { name: 'Anterior' }).click();
  await expect(pagina.getByText('Servicio histórico 1', { exact: true })).toBeVisible();
  control.fallo = 'vencido';
  await pagina.getByRole('button', { name: 'Siguiente' }).click();
  await expect(pagina.getByRole('alert')).toContainText('Genera otro reporte');
  await expect(pagina.getByText('Servicio histórico 1', { exact: true })).toHaveCount(0);
  await expect(pagina.getByRole('button', { name: 'Preparar impresión' })).toBeDisabled();
  expect(solicitudes.filter(({ metodo }) => metodo === 'POST')).toHaveLength(1);
  expect(await pagina.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('grafica periodos vacíos y conserva las cifras exactas del corte', async ({ page: pagina }) => {
  await prepararReportes(pagina);
  await pagina.goto('/admin/reportes');
  await generar(pagina, 'semana');
  const evolucion = pagina.getByRole('region', { name: 'Gráfica de evolución semanal' });
  await expect(evolucion.locator('.reportes-columna strong')).toHaveText(['0', '0', '0', '101', '0']);
  const origen = pagina.getByRole('region', { name: 'Origen de las citas' });
  await expect(origen.getByText('88 · 87.13 %')).toBeVisible();
  await expect(origen.getByText('13 · 12.87 %')).toBeVisible();
  const tabla = pagina.getByRole('region', { name: 'Desglose por estado' });
  await expect(tabla).toBeHidden();
  await pagina.getByText('Ver desglose por estado', { exact: true }).click();
  await expect(tabla.getByRole('cell', { name: '101', exact: true })).toBeVisible();
});

test('habilita imprimir solo después de reunir todas las filas del corte', async ({ page: pagina }) => {
  const { control, solicitudes } = await prepararReportes(pagina);
  await pagina.addInitScript(() => { window.print = () => { window.impresiones = (window.impresiones || 0) + 1; }; });
  await pagina.goto('/admin/reportes');
  await generar(pagina);
  const preparar = pagina.getByRole('button', { name: 'Preparar impresión' });
  const imprimir = pagina.getByRole('button', { name: 'Imprimir reporte' });
  await expect(imprimir).toBeDisabled();
  control.fallo = 'incompleto';
  await preparar.click();
  await expect(pagina.getByRole('alert')).toContainText('No se pudo preparar la impresión completa');
  await expect(imprimir).toBeDisabled();
  control.fallo = null;
  await preparar.click();
  await expect(imprimir).toBeEnabled();
  await imprimir.click();
  expect(await pagina.evaluate(() => window.impresiones)).toBe(1);
  expect(solicitudes.filter(({ ruta }) => ruta.endsWith('/filas')).every(({ ruta }) => ruta.includes('/corte-1/'))).toBe(true);
  await pagina.emulateMedia({ media: 'print' });
  await expect(pagina.getByRole('region', { name: 'Desglose por estado' })).toBeVisible();
  for (const titulo of ['Citas por servicio', 'Ingresos estimados por sucursal', 'Ingresos estimados por servicio']) {
    await expect(pagina.getByRole('heading', { name: titulo })).toBeVisible();
  }
  await expect(pagina.getByText('Servicio histórico 101', { exact: true })).toBeVisible();
  await expect(pagina.locator('.reportes-coleccion-impresion tbody tr')).toHaveCount(101);
});

test('Recepción no puede navegar a reportes conectados', async ({ page: pagina }) => {
  const { solicitudesObservadas } = await prepararSesion(pagina, 'recepcionista');
  await pagina.goto('/admin/reportes');
  await expect(pagina).toHaveURL(/\/admin\/agenda$/);
  await expect(pagina.getByRole('link', { name: 'Reportes', exact: true })).toHaveCount(0);
  expect(solicitudesObservadas.some((solicitud) => solicitud.includes('/reportes'))).toBe(false);
});

test('los desgloses largos se desplazan en escritorio y aparecen completos en móvil e impresión', async ({ page: pagina }) => {
  const { control } = await prepararReportes(pagina, 'dark');
  const registros = Array.from({ length: 10 }, (_, indice) => indice + 1);
  const importe = (numero) => ({ subtotalConocido: numero === 10 ? '125.50' : '125.00', sinCosto: Number(numero === 10), incompleta: numero === 10 });
  control.serviciosSolicitados = registros.map((numero) => ({ servicioId: numero, nombres: [`Servicio ${numero}`], cantidad: numero === 1 ? 11 : 10 }));
  control.ingresosPorServicio = registros.map((numero) => ({ ...importe(numero), servicioId: numero, nombres: [`Servicio ${numero}`] }));
  control.ingresosPorSucursal = registros.map((numero) => ({ ...importe(numero), sucursalId: numero, nombres: [`Sucursal ${numero}`] }));
  await pagina.setViewportSize({ width: 1366, height: 900 });
  await pagina.goto('/admin/reportes');
  await generar(pagina);

  const desgloses = pagina.locator('.reportes-desgloses');
  const titulos = ['Citas por servicio', 'Ingresos estimados por sucursal', 'Ingresos estimados por servicio'];
  for (const titulo of titulos) {
    const tabla = desgloses.getByRole('region', { name: titulo });
    await expect(tabla.locator('tbody tr')).toHaveCount(10);
    expect(await tabla.evaluate((elemento) => elemento.scrollHeight > elemento.clientHeight)).toBe(true);
    await tabla.focus();
    await pagina.keyboard.press('End');
    await expect.poll(() => tabla.evaluate((elemento) => elemento.scrollHeight - elemento.clientHeight - elemento.scrollTop)).toBeLessThanOrEqual(1);
    const encabezado = tabla.getByRole('columnheader').first();
    expect(await encabezado.evaluate((celda) => Math.abs(celda.getBoundingClientRect().top - celda.closest('.table-responsive').getBoundingClientRect().top))).toBeLessThanOrEqual(1);
  }

  await pagina.setViewportSize({ width: 390, height: 844 });
  for (const titulo of titulos) {
    const tabla = desgloses.getByRole('region', { name: titulo });
    expect(await tabla.evaluate((elemento) => elemento.scrollHeight - elemento.clientHeight)).toBe(0);
  }
  await pagina.getByRole('button', { name: 'Preparar impresión' }).click();
  await expect(pagina.getByRole('button', { name: 'Imprimir reporte' })).toBeEnabled();
  await pagina.emulateMedia({ media: 'print' });
  for (const titulo of titulos) {
    const tabla = desgloses.getByRole('region', { name: titulo });
    await expect(tabla.locator('tbody tr').last()).toBeVisible();
    await expect(tabla).toHaveCSS('max-height', 'none');
  }
});

for (const [ancho, tema] of [[1366, 'light'], [1366, 'dark'], [390, 'light'], [390, 'dark']]) {
  test(`reportes conectados a ${ancho}px en tema ${tema}`, async ({ page: pagina }, infoPrueba) => {
    const { control } = await prepararReportes(pagina, tema);
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.goto('/admin/reportes');
    await pagina.getByLabel('Sucursal').selectOption('3');
    await pagina.getByLabel('Profesional').selectOption('5');
    await pagina.getByRole('combobox', { name: 'Servicio', exact: true }).selectOption('4');
    await generar(pagina);
    await expect(pagina.getByText('Reporte generado.')).toBeVisible();
    expect(control.corte.filtros).toMatchObject({ sucursalId: 3, personalId: 5, servicioId: 4 });
    await expect(pagina.locator('html')).toHaveAttribute('data-theme', tema);
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (ancho === 390) await expect(pagina.getByRole('navigation', { name: 'Navegación inferior' })).toBeVisible();
    await pagina.screenshot({ path: infoPrueba.outputPath('reportes.png'), animations: 'disabled' });
    const [citas, porSucursal, porServicio] = await pagina.locator('.reportes-desgloses .reportes-tabla').evaluateAll((tablas) =>
      tablas.map((tabla) => tabla.getBoundingClientRect().toJSON()));
    expect(porServicio.x).toBe(porSucursal.x);
    expect(porServicio.top - porSucursal.bottom).toBe(16);
    if (ancho === 390) {
      expect(porSucursal.x).toBe(citas.x);
      expect(porSucursal.top - citas.bottom).toBe(16);
    } else {
      expect(porSucursal.top).toBe(citas.top);
      expect(porSucursal.left - citas.right).toBe(16);
    }
  });
}

test('el menú nativo imprime un aviso hasta que la colección está lista', async ({ page: pagina }, prueba) => {
  const { control } = await prepararReportes(pagina);
  await pagina.goto('/admin/reportes');
  await generar(pagina);
  const preparar = pagina.getByRole('button', { name: 'Preparar impresión' });
  await expect(preparar).toBeEnabled();

  async function comprobarAviso() {
    // Ctrl+P y el menú del navegador usan el mismo medio de impresión y evento beforeprint.
    await pagina.emulateMedia({ media: 'print' });
    await pagina.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await expect(pagina.getByRole('heading', { name: 'Reporte no preparado' })).toBeVisible();
    await expect(pagina.locator('.reportes-resultado')).toBeHidden();
    for (const selector of ['.reportes-filtros', '.barra-lateral', '.navegacion-inferior']) {
      await expect(pagina.locator(selector)).toBeHidden();
    }
    await pagina.emulateMedia({ media: 'screen' });
  }
  await comprobarAviso();
  control.fallo = 'incompleto';
  await preparar.click();
  await expect(pagina.getByRole('alert')).toContainText('No se pudo preparar la impresión completa');
  await expect(pagina.getByRole('button', { name: 'Imprimir reporte' })).toBeDisabled();
  await comprobarAviso();
  await pagina.emulateMedia({ media: 'print' });
  await pagina.pdf({ path: prueba.outputPath('reporte-no-preparado.pdf'), preferCSSPageSize: true });
  await pagina.emulateMedia({ media: 'screen' });

  control.fallo = null;
  await preparar.click();
  await expect(pagina.getByRole('button', { name: 'Imprimir reporte' })).toBeEnabled();
  await pagina.getByLabel('Hasta').fill('2026-11-22');
  await comprobarAviso();
});

test('guarda el corte completo en PDF desde el motor de impresión del navegador', async ({ page: pagina }, prueba) => {
  const { control } = await prepararReportes(pagina, 'dark');
  control.detalleFinal = 'INICIODETALLE ' + 'ContenidoExtensoDePrueba'.repeat(5) + ' FINDETALLE';
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.goto('/admin/reportes');
  await pagina.getByRole('combobox', { name: 'Sucursal', exact: true }).selectOption('3');
  await pagina.getByRole('combobox', { name: 'Profesional', exact: true }).selectOption('5');
  await pagina.getByRole('combobox', { name: 'Servicio', exact: true }).selectOption('4');
  await generar(pagina);
  await pagina.getByRole('button', { name: 'Preparar impresión' }).click();
  await expect(pagina.getByRole('button', { name: 'Imprimir reporte' })).toBeEnabled();
  const cabecera = pagina.locator('.reportes-cabecera-impresion');
  await expect(cabecera).toBeHidden();
  await expect(pagina.locator('.reportes-aviso-impresion')).toBeHidden();
  await pagina.emulateMedia({ media: 'print' });
  for (const dato of ['Negocio QA', 'Centro actual', 'Profesional actual', 'Consulta actual', 'Mensual', 'UTC']) {
    await expect(cabecera).toContainText(dato);
  }
  await expect(pagina.locator('.reportes-aviso-impresion')).toBeHidden();
  await expect(pagina.locator('.reportes-pagina')).toBeHidden();
  await expect(pagina.locator('.reportes-coleccion-impresion tbody tr')).toHaveCount(101);
  await expect(pagina.locator('.reportes-coleccion-impresion tfoot')).toContainText('Total de citas: 101');
  for (const indicador of await pagina.locator('.reportes-indicadores .tarjeta-indicador').all()) {
    await expect(indicador).toHaveCSS('animation-name', 'none');
  }
  const pdf = await pagina.pdf({ path: prueba.outputPath('reporte-101-citas.pdf'), preferCSSPageSize: true });
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
});

