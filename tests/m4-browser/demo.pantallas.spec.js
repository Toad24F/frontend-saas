import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

const pantallas = [
  ['resumen', 'Buenos días, Adriana'],
  ['reportes', 'Reportes'],
  ['configuracion', 'Configuración'],
  ['notificaciones', 'Notificaciones'],
];

async function vigilarDemo(pagina) {
  const solicitudes = [];
  const errores = [];
  pagina.on('pageerror', (error) => errores.push(error.message));
  await pagina.route('**/*', (ruta) => {
    const solicitud = ruta.request();
    if (!['fetch', 'xhr'].includes(solicitud.resourceType())) return ruta.fallback();
    const destino = new URL(solicitud.url());
    if (solicitud.method() === 'GET' && destino.origin === new URL(solicitud.frame().url()).origin &&
      destino.pathname === '/data/demo.json') return ruta.fallback();
    solicitudes.push(`${solicitud.method()} ${destino.pathname}`);
    return ruta.abort();
  });
  return { solicitudes, errores };
}

test('Resumen muestra las citas de hoy y abre Agenda en la demo', async ({ page: pagina }) => {
  const actividad = await vigilarDemo(pagina);
  await pagina.goto('/admin/resumen?demo=1');
  await expect(pagina.getByRole('heading', { name: 'Citas de hoy' })).toBeVisible();
  await expect(pagina.locator('.resumen-columna')).toHaveCount(7);
  await expect(pagina.locator('.resumen-barra-hoy')).toHaveCount(1);
  await expect(pagina.locator('.resumen-citas-hoy tbody tr').first()).toBeVisible();
  await pagina.getByRole('link', { name: 'Ver mi agenda' }).click();
  await expect(pagina).toHaveURL(/\/admin\/agenda\?demo=1$/);
  await expect(pagina.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  expect(actividad).toEqual({ solicitudes: [], errores: [] });
});

test('Reportes valida el rango, filtra por sucursal y conserva la vista de impresión', async ({ page: pagina }) => {
  const actividad = await vigilarDemo(pagina);
  await pagina.addInitScript(() => { window.print = () => { document.body.dataset.impresionSolicitada = 'true'; }; });
  await pagina.goto('/admin/reportes?demo=1');
  const desde = pagina.getByLabel('Desde');
  const hasta = pagina.getByLabel('Hasta');
  const sucursal = pagina.locator('#reportes-sucursal');
  const aplicar = pagina.getByRole('button', { name: 'Aplicar filtros' });
  await desde.fill('2026-09-30');
  await hasta.fill('2026-09-01');
  await aplicar.click();
  await expect(pagina.getByText('Selecciona un rango válido de fechas.')).toBeVisible();
  await desde.fill('2000-01-01');
  await hasta.fill('2000-01-02');
  await sucursal.selectOption('2');
  await aplicar.click();
  await expect(desde).toHaveValue('2000-01-01');
  await expect(hasta).toHaveValue('2000-01-02');
  await expect(sucursal).toHaveValue('2');
  await expect(pagina.locator('#reportes-imprimible .indicador-valor')).toHaveText(['0', '0', '0', /\$\s*0/]);
  await pagina.getByRole('button', { name: 'Guardar como PDF' }).click();
  await expect(pagina.locator('body')).toHaveAttribute('data-impresion-solicitada', 'true');
  await pagina.emulateMedia({ media: 'print' });
  await expect(pagina.getByRole('heading', { name: /Reporte de citas/ })).toBeVisible();
  await expect(pagina.getByText(/Datos de demostración/)).toBeVisible();
  await expect(aplicar).toBeHidden();
  expect(actividad).toEqual({ solicitudes: [], errores: [] });
});

test('Configuración guarda en memoria y restablece la sucursal del reporte al cambiar de negocio', async ({ page: pagina }) => {
  const actividad = await vigilarDemo(pagina);
  await pagina.goto('/admin/reportes?demo=1');
  await pagina.locator('#reportes-sucursal').selectOption('2');
  await pagina.getByRole('button', { name: 'Aplicar filtros' }).click();
  await pagina.locator('.barra-lateral').getByRole('link', { name: 'Configuración' }).click();
  const nombre = pagina.getByLabel('Nombre del negocio');
  await nombre.fill('Consultorio de prueba');
  await pagina.getByLabel('Correo de contacto').fill('consultorio@example.test');
  await pagina.getByLabel('Teléfono').fill('6145550123');
  await pagina.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(pagina.getByText('Configuración guardada en esta demostración.')).toBeVisible();
  await expect(nombre).toHaveValue('Consultorio de prueba');
  await expect(pagina.getByLabel('Correo de contacto')).toHaveValue('consultorio@example.test');
  await expect(pagina.getByLabel('Teléfono')).toHaveValue('6145550123');
  await expect(pagina.getByLabel('Enlace del portal')).toHaveValue(/\/reservas\/clinica-bienestar\?demo=1$/);
  await pagina.getByRole('button', { name: 'Cambiar negocio' }).click();
  await pagina.getByRole('dialog').getByRole('button', { name: /Espacio Mente/ }).click();
  await expect(nombre).toHaveValue('Espacio Mente');
  await pagina.locator('.barra-lateral').getByRole('link', { name: 'Reportes' }).click();
  await expect(pagina.locator('#reportes-sucursal')).toHaveValue('todas');
  await pagina.goto('/admin/configuracion?demo=1');
  await expect(nombre).toHaveValue('Clínica Bienestar');
  expect(actividad).toEqual({ solicitudes: [], errores: [] });
});

test('Notificaciones conserva los cambios simulados durante la vista y no envía mensajes', async ({ page: pagina }) => {
  const actividad = await vigilarDemo(pagina);
  await pagina.goto('/admin/notificaciones?demo=1');
  const confirmacion = pagina.getByRole('checkbox', { name: 'Activar confirmación de reserva' });
  const recordatorio = pagina.getByRole('checkbox', { name: 'Activar recordatorio' });
  const horas = pagina.getByLabel('Enviar recordatorio');
  await expect(horas).toHaveValue('24');
  await confirmacion.uncheck();
  await recordatorio.uncheck();
  await horas.selectOption('48');
  await pagina.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(pagina.getByText('Configuración guardada en esta demostración.')).toBeVisible();
  await expect(confirmacion).not.toBeChecked();
  await expect(recordatorio).not.toBeChecked();
  await expect(horas).toHaveValue('48');
  await expect(pagina.getByText('Sin envío real').first()).toBeVisible();
  await pagina.reload();
  await expect(confirmacion).toBeChecked();
  await expect(recordatorio).toBeChecked();
  await expect(horas).toHaveValue('24');
  expect(actividad).toEqual({ solicitudes: [], errores: [] });
});

test('El panel conectado redirige rutas de demo y nunca solicita el archivo de ejemplo', async ({ page: pagina }) => {
  const archivosDemo = [];
  pagina.on('request', (solicitud) => {
    if (new URL(solicitud.url()).pathname === '/data/demo.json') archivosDemo.push(solicitud.url());
  });
  const { seen: solicitudes, errors: errores } = await prepararSesion(pagina, 'recepcionista');
  for (const [ruta, titulo] of pantallas) {
    await pagina.goto(`/admin/${ruta}`);
    await expect(pagina.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
    await expect(pagina).toHaveURL(/\/admin\/agenda$/);
    await expect(pagina.getByRole('heading', { name: titulo, exact: true })).toHaveCount(0);
    await expect(pagina.getByText('Clínica Bienestar')).toHaveCount(0);
  }
  expect(solicitudes).toContain('GET /auth/profile');
  expect(archivosDemo).toEqual([]);
  expect(errores).toEqual([]);
});

for (const [ancho, tema] of [[1366, 'light'], [1366, 'dark'], [390, 'light'], [390, 'dark']]) {
  test(`Pantallas de demo a ${ancho}px con tema ${tema}`, async ({ page: pagina }, infoPrueba) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.addInitScript((temaInicial) => localStorage.setItem('cita-theme', temaInicial), tema);
    const actividad = await vigilarDemo(pagina);
    for (const [ruta, titulo] of pantallas) {
      await pagina.goto(`/admin/${ruta}?demo=1`);
      await expect(pagina.getByRole('heading', { name: titulo, exact: true })).toBeVisible();
      await expect(pagina.locator('html')).toHaveAttribute('data-theme', tema);
      await expect.poll(() => pagina.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: ruta }).toBeLessThanOrEqual(1);
      if (ancho === 390) await expect(pagina.getByRole('navigation', { name: 'Navegación inferior' })).toBeVisible();
      await pagina.screenshot({ path: infoPrueba.outputPath(`${ruta}-${ancho}-${tema}.png`), animations: 'disabled', fullPage: true });
    }
    expect(actividad).toEqual({ solicitudes: [], errores: [] });
  });
}
