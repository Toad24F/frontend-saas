import { test, expect } from './integracion.utilidades.js';
import { consultarFilas } from './integracion.utilidades.js';

const origen = () => process.env.PORTAL_TEST_ORIGIN;
async function iniciarSesion(pagina, rol = 'superadmin') {
  await pagina.goto(`${origen()}/admin/negocio/1`);
  await pagina.getByLabel('Correo electrónico').fill(`${rol}-qa${rol === 'superadmin' ? '' : '-1'}@example.test`);
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
}
async function detalle(pagina) {
  await expect(pagina.getByRole('heading', { name: 'Licencia', exact: true })).toBeVisible();
}

// Todos los cambios van a la base efímera y usan la cuenta superadmin ficticia.
test('FALA-T030: plazo 0/2/30, suspensión y renovación usan estado real', async ({ page: pagina }) => {
  await iniciarSesion(pagina); await detalle(pagina);
  await pagina.getByRole('button', { name: 'Programar suspensión' }).click();
  const esperar = pagina.getByLabel('Plazo en días');
  await expect(esperar).toHaveValue('2');
  await esperar.fill('31');
  expect(await esperar.evaluate((campo) => campo.checkValidity())).toBe(false);
  await esperar.fill('0');
  await pagina.getByRole('dialog').getByRole('button', { name: 'Programar suspensión' }).click();
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
  await expect(pagina.getByRole('button', { name: 'Reactivar licencia' })).toBeVisible();
  await expect(pagina.getByRole('button', { name: 'Programar suspensión' })).toHaveCount(0);
  await pagina.getByRole('button', { name: 'Renovar un año' }).click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Renovar un año' }).click();
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
  await expect(pagina.getByRole('button', { name: 'Reactivar licencia' })).toBeVisible();
  const primera = await consultarFilas('SELECT plazo_suspension_dias FROM licencias WHERE negocio_id=1');
  expect(Number(primera[0].plazo_suspension_dias)).toBe(0);
  // La segunda licencia conserva el valor predeterminado del formulario.
  await pagina.goto(`${origen()}/admin/negocio/2`); await detalle(pagina);
  await pagina.getByRole('button', { name: 'Programar suspensión' }).click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Programar suspensión' }).click();
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
  await expect(pagina.getByRole('button', { name: 'Reactivar licencia' })).toBeVisible();
  expect(Number((await consultarFilas('SELECT plazo_suspension_dias FROM licencias WHERE negocio_id=2'))[0].plazo_suspension_dias)).toBe(2);
  await pagina.getByRole('button', { name: 'Reactivar licencia' }).click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Reactivar licencia' }).click();
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
  await expect(pagina.getByRole('button', { name: 'Programar suspensión' })).toBeVisible();
  await pagina.getByRole('button', { name: 'Programar suspensión' }).click();
  await pagina.getByLabel('Plazo en días').fill('30');
  await pagina.getByRole('dialog').getByRole('button', { name: 'Programar suspensión' }).click();
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
  expect(Number((await consultarFilas('SELECT plazo_suspension_dias FROM licencias WHERE negocio_id=2'))[0].plazo_suspension_dias)).toBe(30);
});

// Se pierde solo la respuesta del primer POST: repetir debe devolver la misma
// transición y no añadir una segunda anualidad al vencimiento persistido.
test('FALA-T030: respuesta perdida mantiene clave y bloquea nueva renovación', async ({ page: pagina }) => {
  await iniciarSesion(pagina); await detalle(pagina);
  const anterior = (await consultarFilas('SELECT vence_en FROM licencias WHERE negocio_id=1'))[0].vence_en;
  let perdido = false;
  await pagina.route('**/licencias/1/renovar', async (rutaInterceptada) => {
    if (perdido) { await rutaInterceptada.continue(); return; }
    perdido = true; await rutaInterceptada.fetch(); await rutaInterceptada.abort('failed');
  });
  await pagina.getByRole('button', { name: 'Renovar un año' }).click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Renovar un año' }).click();
  await expect(pagina.getByRole('dialog')).toContainText(/conectar|pendiente/i);
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await pagina.reload(); await detalle(pagina);
  await expect(pagina.getByRole('button', { name: 'Renovar un año' })).toHaveCount(0);
  await pagina.getByRole('button', { name: 'Comprobar operación' }).click();
  await expect(pagina.getByRole('button', { name: 'Renovar un año' })).toBeVisible();
  const posterior = (await consultarFilas('SELECT vence_en FROM licencias WHERE negocio_id=1'))[0].vence_en;
  expect(new Date(posterior).getUTCFullYear()).toBe(new Date(anterior).getUTCFullYear() + 1);
});

test('FALA-T029–T030: avisos se muestran por estado y otro rol carece de acciones', async ({ page: pagina, browser: navegador }) => {
  await iniciarSesion(pagina); await detalle(pagina);
  await pagina.route('**/negocios/1/envios', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(['pendiente', 'fallido', 'enviado'].map((estado, indice) => ({ id: indice + 1,
      tipo: 'aviso_licencia', estado, intentos: indice, confirmadoEn: null, proximoIntentoEn: null }))) }));
  await pagina.reload(); await detalle(pagina);
  await pagina.getByRole('tab', { name: /Historial de correos/ }).click();
  await expect(pagina.getByRole('heading', { name: 'Historial de correos' })).toBeVisible();
  for (const etiqueta of ['Pendiente', 'Fallido', 'Enviado']) await expect(pagina.locator('.etiqueta-suave', { hasText: etiqueta }).first()).toBeVisible();
  const conexionAdmin = await navegador.newContext();
  try {
    const otro = await conexionAdmin.newPage();
    await iniciarSesion(otro, 'admin');
    await expect(otro.getByRole('button', { name: 'Programar suspensión' })).toHaveCount(0);
    await expect(otro.getByRole('button', { name: 'Renovar un año' })).toHaveCount(0);
  } finally { await conexionAdmin.close(); }
});

// Estas capturas permiten revisar el detalle y el diálogo real en los cuatro
// contextos visuales; la prueba también detecta desborde horizontal del panel.
test('FALA-T030: detalle y plazo visibles en escritorio y móvil, claro y oscuro', async ({ page: pagina }, infoPrueba) => {
  await iniciarSesion(pagina); await detalle(pagina);
  // El lote anterior puede dejar suspendido al negocio de prueba; se devuelve
  // a vigente antes de inspeccionar el formulario de una nueva suspensión.
  if (await pagina.getByRole('button', { name: 'Reactivar licencia' }).isVisible()) {
    await pagina.getByRole('button', { name: 'Reactivar licencia' }).click();
    await pagina.getByRole('dialog').getByRole('button', { name: 'Reactivar licencia' }).click();
    await expect(pagina.getByRole('dialog')).toHaveCount(0);
    await expect(pagina.getByRole('button', { name: 'Programar suspensión' })).toBeVisible();
  }
  await expect(pagina.locator('#region-avisos .aviso-app')).toHaveCount(0);
  await pagina.evaluate(() => scrollTo(0, 0));
  await pagina.screenshot({ path: infoPrueba.outputPath('license-desktop-light.png'), fullPage: true, animations: 'disabled' });
  await pagina.getByRole('button', { name: 'Programar suspensión' }).click();
  await pagina.screenshot({ path: infoPrueba.outputPath('license-dialog-desktop-light.png'), animations: 'disabled' });
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await pagina.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await pagina.waitForTimeout(600);
  await pagina.evaluate(() => scrollTo(0, 0));
  await pagina.screenshot({ path: infoPrueba.outputPath('license-desktop-dark.png'), fullPage: true, animations: 'disabled' });
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.waitForTimeout(600);
  await pagina.evaluate(() => scrollTo(0, 0));
  expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await pagina.screenshot({ path: infoPrueba.outputPath('license-mobile-dark.png'), fullPage: true, animations: 'disabled' });
  await pagina.getByRole('button', { name: 'Programar suspensión' }).click();
  const enviarFormulario = pagina.getByRole('dialog').getByRole('button', { name: 'Programar suspensión' });
  // Esperar el final de la transición y aceptar también un hijo del botón.
  // Un elemento ajeno superpuesto sigue haciendo fallar esta comprobación.
  await expect.poll(() => enviarFormulario.evaluate((boton) => {
    const rectangulo = boton.getBoundingClientRect();
    const coincidencia = document.elementFromPoint(rectangulo.left + rectangulo.width / 2, rectangulo.top + rectangulo.height / 2);
    return coincidencia === boton || boton.contains(coincidencia);
  })).toBe(true);
  await pagina.screenshot({ path: infoPrueba.outputPath('license-dialog-mobile-dark.png'), animations: 'disabled' });
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await pagina.getByRole('button', { name: 'Activar modo claro' }).click();
  await pagina.waitForTimeout(600);
  await pagina.evaluate(() => scrollTo(0, 0));
  await pagina.screenshot({ path: infoPrueba.outputPath('license-mobile-light.png'), fullPage: true, animations: 'disabled' });
});
