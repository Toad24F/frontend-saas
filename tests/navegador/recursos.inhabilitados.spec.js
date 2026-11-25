import { test, expect } from './integracion.utilidades.js';
import { consultarFilas } from './integracion.utilidades.js';

const origen = () => process.env.PORTAL_TEST_ORIGIN;
async function iniciarSesion(pagina, correo) {
  await pagina.goto(`${origen()}/admin/profesionales`);
  await pagina.getByLabel('Correo electrónico').fill(correo);
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  // Esperar la transición autenticada evita que el siguiente goto cancele el
  // POST de login y produzca una falsa ausencia de controles.
  await pagina.waitForFunction(() => Boolean(sessionStorage.getItem('cita-session')));
}

// El negocio 2 pertenece solo a la base efímera; los cuatro retiros nunca
// tocan la oferta pública del negocio 1 ni la base habitual del backend.
test('FALA-T035–T040: cuatro retiros recuperables y consultas separadas', async ({ page: pagina }) => {
  await iniciarSesion(pagina, 'admin-qa-2@example.test');
  const [citaAnterior] = await consultarFilas("SELECT c.id, c.estado, c.inicio_utc, c.fin_utc FROM citas c JOIN clientes x ON x.id=c.cliente_id WHERE x.nombre_completo='Cliente Retiro QA'");
  const solicitudes = [];
  pagina.on('request', (solicitud) => {
    if (/\/(profesionales|recepcionistas|servicios|sucursales)\/\d+/.test(solicitud.url())) {
      solicitudes.push(`${solicitud.method()} ${new URL(solicitud.url()).pathname}`);
    }
  });
  const casos = [
    { type: 'profesionales', name: 'Profesional QA 2', article: '[data-profesional-id]', action: '[data-accion-profesional="inhabilitar"]' },
    { type: 'recepcionistas', name: 'Recepción Retiro QA', article: '[data-recepcionista-entrada]', action: '[data-accion-recepcionista="inhabilitar"]' },
    { type: 'servicios', name: 'Corte QA', article: '[data-servicio-entrada]', action: '[data-inhabilitar-servicio]' },
    { type: 'sucursales', name: 'Sucursal QA 2', article: '[data-sucursal-entrada]', action: '[data-inhabilitar-sucursal]' },
  ];
  for (const elemento of casos) {
    await pagina.goto(`${origen()}/admin/${elemento.type}`);
    const tarjeta = pagina.locator(elemento.article, { hasText: elemento.name }).first();
    await expect(tarjeta).toBeVisible();
    if (['profesionales', 'recepcionistas', 'servicios', 'sucursales'].includes(elemento.type)) {
      await tarjeta.locator('summary').click();
    }
    await tarjeta.locator(elemento.action).click();
    const dialogo = pagina.getByRole('dialog');
    await expect(dialogo).toContainText(/Inhabilitar/);
    await expect(dialogo).toContainText(/restaurar/i);
    await dialogo.getByRole('button', { name: /Inhabilitar/ }).click();
    await expect(dialogo).toHaveCount(0);
    await expect(tarjeta).toHaveCount(0);
    await pagina.locator('[data-inhabilitados-abrir]').click();
    const seccion = pagina.getByRole('dialog');
    await expect(seccion).toContainText(elemento.name);
    await expect(seccion).toContainText('Inhabilitado');
    await seccion.getByRole('button', { name: `Ver detalle de ${elemento.name}` }).click();
    await expect(pagina.getByRole('dialog')).toContainText(/Inhabilitado/);
    await pagina.getByRole('dialog').getByRole('button', { name: 'Volver a inhabilitados' }).click();
    if (elemento.type === 'servicios') {
      const escrituras = [];
      pagina.on('request', (solicitud) => { if (solicitud.method() !== 'GET' && /citas|reservas/.test(solicitud.url())) escrituras.push(solicitud.url()); });
      await seccion.getByRole('button', { name: `Revisar citas afectadas de ${elemento.name}` }).click();
      await expect(seccion).toContainText(/citas no fueron canceladas ni reprogramadas/i);
      await expect(seccion).toContainText(`Cita #${citaAnterior.id}`);
      await expect(seccion).toContainText('Servicio inhabilitado');
      expect(escrituras).toEqual([]);
    }
  }
  expect(solicitudes.some((entrada) => entrada.startsWith('DELETE '))).toBe(false);
  for (const elementoPrueba of casos) {
    expect(solicitudes.some((entrada) => new RegExp(`^POST /${elementoPrueba.type}/\\d+/inhabilitar$`).test(entrada))).toBe(true);
  }
  const [citaPosterior] = await consultarFilas("SELECT c.id, c.estado, c.inicio_utc, c.fin_utc FROM citas c JOIN clientes x ON x.id=c.cliente_id WHERE x.nombre_completo='Cliente Retiro QA'");
  expect(citaPosterior).toEqual(citaAnterior);
});

test('FALA-T035: la demo conserva sus catálogos sin fingir retiros conectados', async ({ page: pagina }) => {
  await pagina.goto(`${origen()}/admin/profesionales?demo=1`);
  await expect(pagina.getByRole('heading', { name: 'Profesionales' })).toBeVisible();
  await expect(pagina.locator('[data-inhabilitados-abrir]')).toHaveCount(0);
  await expect(pagina.locator('[data-profesional-id]').first()).toBeVisible();
});

test('FALA-T043: otro administrador no consulta el detalle retirado del negocio 2', async ({ page: pagina }) => {
  const [cuenta] = await consultarFilas("SELECT id FROM usuarios WHERE email='retiro-recep-qa@example.test'");
  await iniciarSesion(pagina, 'admin-qa-1@example.test');
  const resultado = await pagina.evaluate(async (id) => {
    const { api } = await import('/src/connected/modules/autenticacion/sesion.estado.js');
    try { await api(`/recepcionistas/inhabilitados/${id}`); return 200; }
    catch (error) { return error.status; }
  }, Number(cuenta.id));
  expect([403, 404]).toContain(resultado);
});

// Cada restauración se verifica desde la API real y en el catálogo. La base
// de prueba fija un cupo lleno después para ejercer el 409 de reactivación.
test('FALA-T041–T043: restaurar los cuatro deja inactivo y activar respeta cupo', async ({ page: pagina }) => {
  await iniciarSesion(pagina, 'admin-qa-2@example.test');
  const elementos = [
    ['profesionales', 'Profesional QA 2', '[data-profesional-id]'],
    ['recepcionistas', 'Recepción Retiro QA', '[data-recepcionista-entrada]'],
    ['servicios', 'Corte QA', '[data-servicio-entrada]'],
    ['sucursales', 'Sucursal QA 2', '[data-sucursal-entrada]'],
  ];
  for (const [tipo, nombre, selector] of elementos) {
    await pagina.goto(`${origen()}/admin/${tipo}`);
    await pagina.locator('[data-inhabilitados-abrir]').click();
    const seccion = pagina.getByRole('dialog');
    await seccion.getByRole('button', { name: `Restaurar ${nombre}` }).click();
    const dialogo = pagina.getByRole('dialog');
    await expect(dialogo).toContainText(/inactivo|inactiva/i);
    await dialogo.getByRole('button', { name: 'Restaurar' }).click();
    await expect(dialogo).toHaveCount(0);
    const tarjeta = pagina.locator(selector, { hasText: nombre }).first();
    await expect(tarjeta).toContainText(/Inactivo|Inactiva/);
    await pagina.locator('[data-inhabilitados-abrir]').click();
    await expect(seccion).not.toContainText(nombre);
  }
  await consultarFilas('UPDATE negocios SET limite_profesionales_activos=1 WHERE id=2');
  await pagina.goto(`${origen()}/admin/profesionales`);
  const tarjeta = pagina.locator('[data-profesional-id]', { hasText: 'Profesional QA 2' }).first();
  await tarjeta.locator('summary').click();
  await tarjeta.locator('[data-accion-profesional="reactivar"]').click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Reactivar' }).click();
  await expect(pagina.getByRole('dialog')).toContainText(/No hay cupo/i);
  await expect(tarjeta).toContainText('Inactivo');
});

// Capturas reales del panel separado y su detalle en los tamaños/temas del
// producto; la comprobación de ancho detecta desbordamientos en móvil.
test('FALA-T040: inhabilitados visibles en escritorio y móvil, claro y oscuro', async ({ page: pagina }, infoPrueba) => {
  await iniciarSesion(pagina, 'admin-qa-2@example.test');
  await pagina.goto(`${origen()}/admin/recepcionistas`);
  // La prueba anterior restauró esta cuenta. Se retira de nuevo en la base
  // efímera para inspeccionar la sección con un resultado real.
  await pagina.locator('[data-recepcionista-entrada]', { hasText: 'Recepción Retiro QA' }).locator('summary').click();
  await pagina.getByRole('button', { name: 'Inhabilitar a Recepción Retiro QA' }).click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Inhabilitar' }).click();
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
  await pagina.locator('[data-inhabilitados-abrir]').click();
  const seccion = pagina.getByRole('dialog');
  await expect(seccion).toContainText('Recepción Retiro QA');
  await expect(pagina.locator('#region-avisos .aviso-app')).toHaveCount(0);
  await pagina.evaluate(() => scrollTo(0, 0));
  await pagina.screenshot({ path: infoPrueba.outputPath('retired-desktop-light.png'), fullPage: true, animations: 'disabled' });
  await pagina.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await pagina.screenshot({ path: infoPrueba.outputPath('retired-desktop-dark.png'), fullPage: true, animations: 'disabled' });
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.evaluate(() => scrollTo(0, 0));
  expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const restaurar = seccion.getByRole('button', { name: 'Restaurar Recepción Retiro QA' });
  await restaurar.scrollIntoViewIfNeeded();
  expect(await restaurar.evaluate((boton) => {
    const rectangulo = boton.getBoundingClientRect();
    return document.elementFromPoint(rectangulo.left + rectangulo.width / 2, rectangulo.top + rectangulo.height / 2) === boton;
  })).toBe(true);
  await pagina.evaluate(() => scrollTo(0, 0));
  await pagina.screenshot({ path: infoPrueba.outputPath('retired-mobile-dark.png'), fullPage: true, animations: 'disabled' });
  await restaurar.click();
  await pagina.screenshot({ path: infoPrueba.outputPath('inhabilitados-restaurar-mobile-dark.png'), animations: 'disabled' });
  await pagina.getByRole('dialog').getByRole('button', { name: 'Volver a inhabilitados' }).click();
  await seccion.getByRole('button', { name: 'Ver detalle de Recepción Retiro QA' }).click();
  await pagina.screenshot({ path: infoPrueba.outputPath('inhabilitados-detalle-mobile-dark.png'), animations: 'disabled' });
  await pagina.getByRole('dialog').getByRole('button', { name: 'Volver a inhabilitados' }).click();
  await pagina.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await pagina.screenshot({ path: infoPrueba.outputPath('retired-mobile-light.png'), fullPage: true, animations: 'disabled' });
});
