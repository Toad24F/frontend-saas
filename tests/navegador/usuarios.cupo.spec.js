import { test, expect } from './integracion.utilidades.js';
import { consultarFilas } from './integracion.utilidades.js';

const origen = () => process.env.PORTAL_TEST_ORIGIN;
async function iniciarSesion(pagina, rol = 'superadmin') {
  await pagina.goto(`${origen()}/admin/negocio/1`);
  await pagina.getByLabel('Correo electrónico').fill(`${rol}-qa${rol === 'superadmin' ? '' : '-1'}@example.test`);
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
}

// El servidor de prueba y sus usuarios pertenecen a una base que prepararIntegracion
// crea y destruye. Las aserciones consultan el resultado persistido allí.
test('FALA-T031–T032: 5/3 inicial, edición de dos límites y 409 conserva borrador', async ({ page: pagina }) => {
  await iniciarSesion(pagina);
  await pagina.getByRole('tab', { name: 'Límites y uso' }).click();
  const seccion = pagina.locator('section', { has: pagina.getByRole('heading', { name: 'Usuarios', exact: true }) });
  await expect(seccion).toContainText('2 de 5');
  await expect(seccion).toContainText('1 de 3');
  await seccion.getByRole('button', { name: 'Cambiar cupos de usuarios' }).click();
  const dialogo = pagina.getByRole('dialog');
  await dialogo.getByLabel('Límite de profesionales activos').fill('0');
  expect(await dialogo.getByLabel('Límite de profesionales activos').evaluate((campo) => campo.checkValidity())).toBe(false);
  await dialogo.getByLabel('Límite de profesionales activos').fill('1');
  await dialogo.getByLabel('Límite de recepcionistas activos').fill('2');
  await dialogo.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialogo).toContainText(/menor al consumo activo/i);
  await expect(dialogo.getByLabel('Límite de profesionales activos')).toHaveValue('1');
  await expect(dialogo.getByLabel('Límite de recepcionistas activos')).toHaveValue('2');
  await expect(seccion).toContainText('2 de 5');
  await dialogo.getByLabel('Límite de profesionales activos').fill('2');
  await dialogo.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(seccion).toContainText('2 de 2');
  await expect(seccion).toContainText('1 de 2');
  const [guardado] = await consultarFilas('SELECT limite_profesionales_activos, limite_recepcionistas_activos FROM negocios WHERE id=1');
  expect(Number(guardado.limite_profesionales_activos)).toBe(2);
  expect(Number(guardado.limite_recepcionistas_activos)).toBe(2);
});

test('FALA-T033–T034: administrador ve cupos propios y no puede editar límites', async ({ page: pagina }) => {
  await iniciarSesion(pagina, 'admin');
  await expect(pagina.getByRole('button', { name: 'Cambiar cupos de usuarios' })).toHaveCount(0);
  const [limites] = await consultarFilas('SELECT limite_profesionales_activos, limite_recepcionistas_activos FROM negocios WHERE id=1');
  await pagina.goto(`${origen()}/admin/profesionales`);
  await pagina.getByRole('button', { name: 'Nuevo profesional' }).first().click();
  await expect(pagina.getByRole('dialog')).toContainText(`Cupo vigente de profesionales: 2 de ${limites.limite_profesionales_activos}`);
  if (Number(limites.limite_profesionales_activos) === 2) {
    // El alta rechazada mantiene el texto capturado y no añade una cuenta.
    const formulario = pagina.getByRole('dialog');
    await formulario.getByLabel('Nombre completo').fill('Profesional Sin Cupo QA');
    await formulario.getByLabel('Especialidad').fill('Pruebas');
    await formulario.getByLabel('Correo').fill('sin-cupo-prof-qa@example.test');
    await formulario.getByLabel('Contraseña').fill('PruebaLicencia2026!');
    await formulario.getByRole('button', { name: 'Guardar' }).click();
    await expect(formulario).toContainText(/No hay cupo/i);
    await expect(formulario.getByLabel('Nombre completo')).toHaveValue('Profesional Sin Cupo QA');
    expect((await consultarFilas("SELECT id FROM usuarios WHERE email='sin-cupo-prof-qa@example.test'")).length).toBe(0);
  }
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  const descartar = pagina.getByRole('button', { name: 'Descartar cambios', exact: true });
  if (await descartar.isVisible()) await descartar.click();
  await pagina.goto(`${origen()}/admin/recepcionistas`);
  await pagina.getByRole('button', { name: 'Nueva recepcionista' }).first().click();
  await expect(pagina.getByRole('dialog')).toContainText(`Cupo vigente de recepcionistas: 1 de ${limites.limite_recepcionistas_activos}`);
});

test('FALA-T034: activación sin lugar conserva la cuenta inactiva y explica el rechazo', async ({ page: pagina, browser: navegador }) => {
  await iniciarSesion(pagina);
  await pagina.getByRole('tab', { name: 'Límites y uso' }).click();
  await pagina.getByRole('button', { name: 'Cambiar cupos de usuarios' }).click();
  await pagina.getByRole('dialog').getByLabel('Límite de recepcionistas activos').fill('1');
  await pagina.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
  const contexto = await navegador.newContext();
  try {
    const conexionAdmin = await contexto.newPage();
    await iniciarSesion(conexionAdmin, 'admin');
    await conexionAdmin.goto(`${origen()}/admin/recepcionistas`);
    await conexionAdmin.getByRole('button', { name: 'Reactivar a Recepción Inactiva QA' }).click();
    const dialogo = conexionAdmin.getByRole('dialog');
    await expect(dialogo).toContainText(/1 de 1 cuentas activas; 0 disponibles/);
    await dialogo.getByRole('button', { name: 'Reactivar' }).click();
    await expect(dialogo).toContainText(/No hay cupo/i);
    await expect(conexionAdmin.getByText('Recepcionista reactivada.')).toHaveCount(0);
    const [cuenta] = await consultarFilas("SELECT activo FROM usuarios WHERE email='recepcion-0-qa@example.test'");
    expect(Number(cuenta.activo)).toBe(0);
  } finally { await contexto.close(); }
});

// Las capturas registran la sección real en ambos tamaños y temas; también
// comprueban que el formulario sigue operable sobre la navegación móvil.
test('FALA-T034: cupos visibles en escritorio y móvil, claro y oscuro', async ({ page: pagina }, infoPrueba) => {
  await iniciarSesion(pagina);
  await pagina.getByRole('tab', { name: 'Límites y uso' }).click();
  await expect(pagina.getByRole('heading', { name: 'Usuarios', exact: true })).toBeVisible();
  await pagina.screenshot({ path: infoPrueba.outputPath('quotas-desktop-light.png'), fullPage: true, animations: 'disabled' });
  await pagina.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await pagina.screenshot({ path: infoPrueba.outputPath('quotas-desktop-dark.png'), fullPage: true, animations: 'disabled' });
  await pagina.setViewportSize({ width: 390, height: 844 });
  await expect(pagina.getByRole('heading', { name: 'Usuarios', exact: true })).toBeVisible();
  expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await pagina.screenshot({ path: infoPrueba.outputPath('quotas-mobile-dark.png'), fullPage: true, animations: 'disabled' });
  await pagina.getByRole('button', { name: 'Cambiar cupos de usuarios' }).click();
  await expect(pagina.getByRole('dialog').getByRole('button', { name: 'Guardar' })).toBeVisible();
  await pagina.screenshot({ path: infoPrueba.outputPath('quotas-dialog-mobile-dark.png'), animations: 'disabled' });
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await pagina.getByRole('button', { name: 'Activar modo claro' }).click();
  await pagina.screenshot({ path: infoPrueba.outputPath('quotas-mobile-light.png'), fullPage: true, animations: 'disabled' });
});
