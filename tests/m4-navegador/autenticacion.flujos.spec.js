import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

const credenciales = { email: 'personal@example.test', password: 'Clave-ficticia-123' };
const usuario = { id: 1, nombre: 'Personal QA', rol: 'recepcionista', negocioId: 1 };
const rutaAutenticacion = (segmento) => (url) => url.pathname === '/auth/' + segmento;

for (const [estado, mensaje] of [
  [0, 'No pudimos conectar con Citalendar. Revisa tu conexión e inténtalo de nuevo.'],
  [500, 'Error del servidor.'],
  [503, 'Error del servidor.'],
]) {
  test('muestra el mensaje de ingreso para el estado ' + estado, async ({ page: pagina }) => {
    await pagina.route(rutaAutenticacion('login'), (ruta) => {
      if (estado === 0) return ruta.abort('failed');
      if (estado === 503) return ruta.fulfill({ status: estado, body: 'Servicio no disponible' });
      return ruta.fulfill({ status: estado, json: { message: 'Detalle interno del servidor' } });
    });
    await pagina.goto('/admin/agenda');
    await pagina.getByLabel('Correo electrónico').fill(credenciales.email);
    await pagina.getByLabel('Contraseña', { exact: true }).fill(credenciales.password);
    const entrar = pagina.getByRole('button', { name: 'Entrar' });
    await entrar.click();
    await expect(pagina.getByRole('alert')).toHaveText(mensaje);
    await expect(pagina.getByRole('alert')).toBeFocused();
    await expect(entrar).toBeEnabled();
  });
}

test('reintenta el ingreso tras un 401 y cierra la sesión en ambas pestañas', async ({ page: pagina, context: contexto }) => {
  const { errores } = await prepararSesion(pagina, 'recepcionista', 'light', false);
  const ingresos = [];
  await pagina.route(rutaAutenticacion('login'), (ruta) => {
    ingresos.push(ruta.request().postDataJSON());
    if (ingresos.length === 1) return ruta.fulfill({ status: 401, json: { message: 'Credenciales inválidas.' } });
    return ruta.fulfill({ json: { accessToken: 'sesion-ficticia', usuario } });
  });
  const cierres = [];
  await pagina.route(rutaAutenticacion('logout'), (ruta) => {
    cierres.push(ruta.request().headers().authorization);
    return ruta.fulfill({ status: 204 });
  });

  await pagina.goto('/admin/agenda');
  await expect(pagina).toHaveTitle('Citalendar · Iniciar sesión');
  await expect(pagina.getByLabel('Correo electrónico')).toBeFocused();
  await pagina.getByLabel('Correo electrónico').fill(credenciales.email);
  const contrasena = pagina.getByLabel('Contraseña', { exact: true });
  await contrasena.fill(credenciales.password);
  await pagina.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(contrasena).toHaveAttribute('type', 'text');
  await expect(contrasena).toBeFocused();
  await pagina.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(contrasena).toHaveAttribute('type', 'password');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  const aviso = pagina.getByRole('alert');
  await expect(aviso).toHaveText('Credenciales inválidas.');
  await expect(aviso).toBeFocused();
  await expect(pagina.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await expect(pagina).toHaveURL(/\/admin\/resumen$/);
  await expect(pagina.getByRole('region', { name: 'Citas de hoy' })).toBeVisible();
  expect(ingresos).toEqual([credenciales, credenciales]);

  const otraPagina = await contexto.newPage();
  try {
    await prepararSesion(otraPagina, 'recepcionista', 'light', false);
    await otraPagina.goto('/admin/agenda');
    await expect(otraPagina.locator('[data-agenda-cita="7"]')).toBeVisible();
    await pagina.getByRole('button', { name: 'Opciones de Personal QA' }).click();
    await pagina.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    for (const pestana of [pagina, otraPagina]) {
      await expect(pestana.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
      expect(await pestana.evaluate(() => [localStorage.getItem('cita-session'), sessionStorage.getItem('cita-session')])).toEqual([null, null]);
    }
    expect(cierres).toEqual(['Bearer sesion-ficticia']);
    expect(errores).toEqual([]);
  } finally {
    await otraPagina.close();
  }
});

for (const rol of ['admin_negocio', 'profesional', 'superadmin']) {
  test(`abre la pantalla de inicio después del ingreso de ${rol}`, async ({ page: pagina }) => {
    await prepararSesion(pagina, rol, 'light', false);
    await pagina.route(rutaAutenticacion('login'), (ruta) => ruta.fulfill({ json: { accessToken: 'sesion-ficticia', usuario: { ...usuario, rol } } }));
    await pagina.route((url) => url.pathname === '/bloqueos', (ruta) => ruta.fulfill({ json: { pagina: 1, limite: 25, total: 0, bloqueos: [] } }));
    await pagina.goto('/');
    await pagina.getByLabel('Correo electrónico').fill(credenciales.email);
    await pagina.getByLabel('Contraseña', { exact: true }).fill(credenciales.password);
    await pagina.getByRole('button', { name: 'Entrar' }).click();
    if (rol === 'superadmin') {
      await expect(pagina.getByRole('heading', { name: 'Panel de superadministración' })).toBeVisible();
    } else {
      await expect(pagina).toHaveURL(/\/admin\/resumen$/);
      await expect(pagina.getByRole('region', { name: 'Citas de hoy' })).toBeVisible();
      await pagina.goto('/admin/agenda');
      await expect(pagina.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
      await expect(pagina).toHaveURL(/\/admin\/agenda$/);
    }
  });
}

test('activa y recupera por código, validando el formulario y los cuerpos HTTP', async ({ page: pagina }) => {
  const activaciones = [];
  const recuperaciones = [];
  await pagina.route(rutaAutenticacion('activar-administrador'), (ruta) => {
    activaciones.push(ruta.request().postDataJSON());
    return ruta.fulfill({ json: {} });
  });
  await pagina.route(rutaAutenticacion('recuperar-contrasena'), (ruta) => {
    recuperaciones.push(ruta.request().postDataJSON());
    return ruta.fulfill({ status: 204 });
  });

  await pagina.goto('/admin/agenda');
  await pagina.getByLabel('Correo electrónico').fill(credenciales.email);
  await pagina.getByRole('button', { name: 'Activa tu cuenta' }).click();
  await expect(pagina.getByLabel('Correo invitado')).toHaveValue(credenciales.email);
  await pagina.getByLabel('Código de activación').fill('  CODIGO-QA  ');
  await pagina.getByLabel('Nombre completo').fill('  Personal QA  ');
  await pagina.getByLabel('Contraseña', { exact: true }).fill(credenciales.password);
  await pagina.getByLabel('Confirmar contraseña', { exact: true }).fill('Otra-clave-ficticia');
  await pagina.getByRole('button', { name: 'Activar cuenta', exact: true }).click();
  await expect(pagina.getByRole('alert')).toHaveText('Las contraseñas no coinciden.');
  expect(activaciones).toEqual([]);
  await pagina.getByLabel('Confirmar contraseña', { exact: true }).fill(credenciales.password);
  await pagina.getByRole('button', { name: 'Activar cuenta', exact: true }).click();
  await expect(pagina.getByRole('status').filter({ hasText: 'Cuenta activada.' })).toBeVisible();
  await expect(pagina.getByLabel('Correo electrónico')).toHaveValue(credenciales.email);
  expect(activaciones).toEqual([{ codigo: 'CODIGO-QA', correo: credenciales.email, nombre: 'Personal QA', password: credenciales.password }]);

  await pagina.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  await pagina.getByLabel('Código de recuperación').fill('  RECUPERACION-QA  ');
  await pagina.getByLabel('Nueva contraseña', { exact: true }).fill(credenciales.password);
  await pagina.getByLabel('Confirmar contraseña', { exact: true }).fill(credenciales.password);
  await pagina.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
  await expect(pagina.getByRole('status').filter({ hasText: 'Contraseña actualizada.' })).toBeVisible();
  expect(recuperaciones).toEqual([{ codigo: 'RECUPERACION-QA', password: credenciales.password }]);
  expect(await pagina.evaluate(() => [localStorage.getItem('cita-session'), sessionStorage.getItem('cita-session')])).toEqual([null, null]);
});

for (const [ancho, alto] of [[1366, 900], [390, 844]]) {
  test('muestra las tres pantallas de autenticación en ambos temas a ' + ancho + ' px', async ({ page: pagina }, prueba) => {
    await pagina.setViewportSize({ width: ancho, height: alto });
    await pagina.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await pagina.goto('/admin/agenda');
    for (const tema of ['light', 'dark']) {
      const capturar = async (pantalla) => {
        await expect(pagina.locator('html')).toHaveAttribute('data-theme', tema);
        await expect(pagina.getByText('Un poco más de orden. Más tiempo para cuidar.', { exact: true })).toHaveCount(0);
        await expect(pagina.getByText('Tu negocio, a tu ritmo', { exact: true })).toHaveCount(0);
        await expect(pagina.getByText('La agenda lista para el día que tienes por delante.', { exact: true })).toHaveCount(0);
        const frase = pagina.getByText('Citalendar, la agenda de tu negocio', { exact: true });
        await expect(frase).toHaveCount(1);
        if (ancho > 900) await expect(frase).toBeVisible();
        else await expect(frase).toBeHidden();
        expect(await pagina.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho);
        await pagina.screenshot({ path: prueba.outputPath(pantalla + '-' + tema + '.png'), fullPage: true });
      };
      await capturar('ingreso');
      await pagina.getByRole('button', { name: 'Activa tu cuenta' }).click();
      await expect(pagina.getByLabel('Código de activación')).toBeFocused();
      await capturar('activacion');
      await pagina.getByRole('button', { name: 'Volver a iniciar sesión' }).click();
      await pagina.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
      await expect(pagina.getByLabel('Código de recuperación')).toBeFocused();
      await capturar('recuperacion');
      await pagina.getByRole('button', { name: 'Volver a iniciar sesión' }).click();
      if (tema === 'light') await pagina.getByRole('button', { name: 'Activar modo oscuro' }).click();
    }
    await pagina.getByRole('link', { name: 'Ver demo' }).click();
    await expect(pagina.locator('[data-cita]').first()).toBeVisible();
  });
}
