import { test, expect } from '@playwright/test';

const rolAdministrador = 'admin_negocio';
const vigencia = { estado: 'vigente', condicionAcceso: true, duracionTotalMs: 200 * 86400000,
  venceEn: '2027-11-18T12:00:00Z', tiempoRestante: { dias: 100, horas: 0, minutos: 0 } };

async function prepararCuenta(pagina, rol) {
  const solicitudes = [];
  const publicaciones = [];
  let ocultarPrecios = false;
  let fallarLectura = true;
  let fallarGuardado = true;
  await pagina.addInitScript(() => sessionStorage.setItem('cita-session', 'cuenta-qa'));
  await pagina.route((url) => url.port === '3000', (ruta) => {
    const peticion = ruta.request();
    const { pathname: rutaApi } = new URL(peticion.url());
    solicitudes.push(rutaApi);
    if (rutaApi === '/auth/profile') return ruta.fulfill({ json: { user: {
      sub: 1, nombre: 'Personal QA', email: 'personal@example.test', rol, negocioId: 1,
      identificadorPublico: 'negocio-qa', nombreNegocio: 'Negocio QA',
    } } });
    if (rutaApi === '/licencias/mi-vigencia') return ruta.fulfill({ json: vigencia });
    if (rutaApi === '/negocios/publicacion-catalogo') {
      if (peticion.method() === 'PATCH') {
        publicaciones.push(peticion.postDataJSON());
        if (fallarGuardado) {
          fallarGuardado = false;
          return ruta.fulfill({ status: 409, json: { message: 'No se pudo guardar la publicación.' } });
        }
        ocultarPrecios = !publicaciones.at(-1).mostrarPreciosPublicos;
      } else if (fallarLectura) {
        fallarLectura = false;
        return ruta.fulfill({ status: 503, json: { message: 'Publicación temporalmente no disponible.' } });
      }
      return ruta.fulfill({ json: { mostrarPreciosPublicos: !ocultarPrecios } });
    }
    if (rutaApi.endsWith('/cupo')) return ruta.fulfill({ json: {
      limite: 5, activos: 2, disponibles: 3, sucursalesActivas: 2, limiteSucursalesActivas: 5,
    } });
    if (rutaApi.endsWith('/oferta')) return ruta.fulfill({ json: { cuentaActiva: true, sucursales: [] } });
    if (['/negocios', '/servicios', '/sucursales', '/profesionales', '/recepcionistas', '/bloqueos'].includes(rutaApi) ||
      rutaApi.endsWith('/servicios') || rutaApi.endsWith('/horario')) return ruta.fulfill({ json: [] });
    return ruta.fulfill({ status: 404, json: { message: 'Ruta de prueba sin respuesta.' } });
  });
  await pagina.goto('/admin/cuenta');
  await expect(pagina.getByRole('heading', { name: 'Mi cuenta', exact: true })).toBeVisible();
  return { solicitudes, publicaciones };
}

test('Cuenta de administración reintenta la publicación, conserva el borrador y muestra la vigencia', async ({ page: pagina }, prueba) => {
  await pagina.setViewportSize({ width: 390, height: 900 });
  await pagina.emulateMedia({ reducedMotion: 'reduce' });
  const { publicaciones, solicitudes } = await prepararCuenta(pagina, rolAdministrador);
  const panel = pagina.locator('.cuenta-publicacion-precios');
  await expect(panel.getByRole('alert')).toHaveText('Publicación temporalmente no disponible.');
  await expect(panel.getByRole('combobox')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Reintentar' }).click();
  await expect(panel.getByText('Precios visibles', { exact: true })).toBeVisible();
  const selector = panel.getByLabel('Publicar precios');
  await selector.selectOption('false');
  const guardar = panel.getByRole('button', { name: 'Guardar publicación' });
  await guardar.click();
  await expect(panel.getByRole('alert')).toHaveText('No se pudo guardar la publicación.');
  await expect(selector).toHaveValue('false');
  await expect(panel.getByText('Precios visibles', { exact: true })).toBeVisible();
  await guardar.click();
  await expect(panel.getByText('Precios ocultos', { exact: true })).toBeVisible();
  expect(publicaciones).toEqual([{ mostrarPreciosPublicos: false }, { mostrarPreciosPublicos: false }]);

  const progreso = pagina.getByRole('progressbar');
  await expect(progreso).toHaveAttribute('value', '50');
  await pagina.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect.poll(() => solicitudes.filter((ruta) => ruta === '/licencias/mi-vigencia').length).toBe(2);
  for (const ancho of [1366, 390]) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    for (const tema of ['light', 'dark']) {
      await pagina.evaluate((tema) => {
        document.documentElement.dataset.theme = tema;
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, tema);
      expect(await pagina.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho);
      await pagina.screenshot({ path: prueba.outputPath(ancho + '-' + tema + '.png'), fullPage: true, animations: 'disabled' });
    }
  }
});

for (const rol of ['superadmin', 'recepcionista', 'profesional']) {
  test('Cuenta limita los paneles para ' + rol, async ({ page: pagina }) => {
    const { solicitudes } = await prepararCuenta(pagina, rol);
    await expect(pagina.getByRole('heading', { name: 'Precios en el portal público' })).toHaveCount(0);
    const licencia = pagina.getByRole('heading', { name: 'Licencia del negocio' });
    if (rol === 'superadmin') {
      await expect(licencia).toHaveCount(0);
      expect(solicitudes).not.toContain('/licencias/mi-vigencia');
    } else {
      await expect(licencia).toBeVisible();
      await expect(pagina.getByRole('progressbar')).toHaveAttribute('value', '50');
      expect(solicitudes).toContain('/licencias/mi-vigencia');
    }
    expect(solicitudes).not.toContain('/negocios/publicacion-catalogo');
  });
}

test('el cambio de contraseña de Cuenta valida la confirmación y conserva el contrato', async ({ page: pagina }) => {
  await prepararCuenta(pagina, 'recepcionista');
  const peticiones = [];
  await pagina.route('**/auth/cambiar-contrasena', (ruta) => {
    expect(ruta.request().method()).toBe('POST');
    peticiones.push(ruta.request().postDataJSON());
    return ruta.fulfill({ status: 400, json: { message: 'La contraseña actual no coincide.' } });
  });
  await pagina.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
  const dialogo = pagina.getByRole('dialog');
  await dialogo.getByLabel('Contraseña actual', { exact: true }).fill('Actual-ficticia-123');
  await dialogo.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva-ficticia-123');
  const confirmacion = dialogo.getByLabel('Confirmar nueva contraseña', { exact: true });
  await confirmacion.fill('Distinta-ficticia-123');
  const guardar = dialogo.getByRole('button', { name: 'Guardar contraseña' });
  await guardar.click();
  await expect(dialogo.getByRole('alert')).toHaveText('Las contraseñas no coinciden.');
  expect(peticiones).toEqual([]);
  await confirmacion.fill('Nueva-ficticia-123');
  await guardar.click();
  await expect(dialogo.getByRole('alert')).toHaveText('La contraseña actual no coincide.');
  expect(peticiones).toEqual([{ passwordActual: 'Actual-ficticia-123', nuevaPassword: 'Nueva-ficticia-123' }]);
});
