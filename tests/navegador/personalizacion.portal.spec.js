import { test, expect, consultarFilas, urlPortal } from './integracion.utilidades.js';

const png = { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWNYqCUGAAJRAOKmtwV6AAAAAElFTkSuQmCC', 'base64') };

async function entrar(pagina, correo) {
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/cuenta`);
  await pagina.getByLabel('Correo electrónico').fill(correo);
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await expect(pagina).toHaveURL(/\/admin\/resumen$/);
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/cuenta`);
  await expect(pagina.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible();
}

async function abrir(pagina) {
  await pagina.getByRole('button', { name: 'Personalizar portal' }).press('Enter', { timeout: 5000 });
  const dialogo = pagina.getByRole('dialog');
  await expect(dialogo.getByLabel('Color de acento')).toBeEnabled();
  return dialogo;
}

// Suelta fuera del botón para comprobar la pulsación sin avanzar el formulario.
async function comprobarPulsacionDeMarca(portal, boton) {
  await boton.hover();
  await expect(boton).toHaveCSS('background-color', 'rgb(165, 63, 40)');
  await portal.mouse.down();
  try {
    await expect(boton).toHaveCSS('background-color', 'rgb(154, 58, 38)');
    await expect(boton).toHaveCSS('transform', 'matrix(0.91, 0, 0, 0.91, 0, 2)');
  } finally {
    await portal.mouse.move(0, 0);
    await portal.mouse.up();
  }
  await expect(boton).toHaveCSS('background-color', 'rgb(179, 68, 44)');
}

// La base y el portal deben conservar la publicación hasta confirmar la escritura.
test('M5-T051–T053 · móvil, validación, descarte, publicación y restauración por negocio', async ({ page: pagina, browser: navegador }) => {
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.emulateMedia({ colorScheme: 'dark' });
  await entrar(pagina, 'admin-qa-1@example.test');
  let dialogo = await abrir(pagina);
  const acento = dialogo.getByLabel('Color de acento');
  await expect(acento).toBeFocused();
  await expect(acento).toHaveCSS('outline-style', 'solid');
  await expect(dialogo.getByLabel('Color de fondo')).toHaveCount(0);
  await expect(dialogo.getByLabel('Color de texto')).toHaveCount(0);
  await pagina.keyboard.press('Tab');
  await expect(dialogo.getByLabel('Paleta de acento')).toBeFocused();
  await pagina.keyboard.press('Tab');
  await expect(dialogo.getByLabel('Logo del negocio')).toBeFocused();
  await acento.fill('#17171780');
  await dialogo.getByRole('button', { name: 'Guardar marca' }).press('Enter');
  await expect(dialogo.getByRole('alert')).toContainText('hexadecimal opaco');
  await expect(dialogo.getByRole('alert')).toBeFocused();
  await dialogo.getByLabel('Color de acento').fill('#b3442c');
  await dialogo.getByLabel('Logo del negocio').setInputFiles({ ...png, buffer: Buffer.from('<svg/>') });
  await expect(dialogo.getByRole('alert')).toContainText(/formato|decodificar/);
  await dialogo.getByLabel('Logo del negocio').setInputFiles(png);
  await expect(dialogo.getByRole('img', { name: 'Logo del negocio' })).toBeVisible();
  await dialogo.getByRole('button', { name: 'Descartar cambios' }).press('Enter');
  await expect(pagina.getByRole('button', { name: 'Personalizar portal' })).toBeFocused();
  expect(await consultarFilas('SELECT version FROM personalizacion_portal')).toEqual([]);

  dialogo = await abrir(pagina);
  await dialogo.getByLabel('Color de acento').fill('#b3442c');
  await dialogo.getByLabel('Logo del negocio').setInputFiles(png);
  await expect(dialogo.getByRole('img', { name: 'Logo del negocio' })).toBeVisible();
  await dialogo.getByRole('button', { name: 'Guardar marca' }).press('Enter');
  await expect(dialogo).toBeHidden();

  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  try {
    const portal = await contexto.newPage();
    await portal.goto(urlPortal(1));
    const logo = portal.getByRole('img', { name: 'Logo de Portal QA 1' });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveJSProperty('naturalWidth', 1);
    await expect(portal.locator('.portal-publico')).toHaveCSS('background-color', 'rgb(21, 22, 26)');
    await expect(portal.locator('#portal-principal')).toHaveCSS('color', 'rgb(242, 240, 237)');
    await expect(portal.getByRole('button', { name: 'Continuar' })).toHaveCSS('background-color', 'rgb(179, 68, 44)');
    const servicio = portal.getByRole('radio', { name: /Corte QA/ });
    await servicio.press('Space');
    await expect(servicio).toBeChecked();
    await portal.keyboard.press('Tab');
    const continuar = portal.getByRole('button', { name: 'Continuar' });
    await expect(continuar).toBeFocused();
    await expect(continuar).toHaveCSS('outline-width', '3px');
    await portal.getByRole('button', { name: 'Activar modo claro' }).click();
    await expect(portal.locator('.portal-publico')).toHaveCSS('background-color', 'rgb(244, 245, 246)');
    await expect(portal.locator('#portal-principal')).toHaveCSS('color', 'rgb(37, 42, 46)');
    await expect(continuar).toHaveCSS('background-color', 'rgb(179, 68, 44)');
    expect(await portal.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    const urlLogo = await logo.getAttribute('src');
    await portal.goto(urlPortal(2));
    await expect(portal.getByRole('radio', { name: /Corte QA/ })).toBeVisible();
    await expect(portal.getByRole('img', { name: /Logo de Portal QA/ })).toHaveCount(0);
    expect((await portal.request.get(new URL(urlLogo.replace('portal-qa-1', 'portal-qa-2'), portal.url()).href)).status()).toBe(404);
  } finally { await contexto.close(); }

  dialogo = await abrir(pagina);
  await dialogo.getByRole('button', { name: 'Previsualizar predeterminados' }).press('Enter');
  await expect(dialogo.getByRole('button', { name: 'Cancelar restauración' })).toBeFocused();
  await expect(dialogo.getByRole('img', { name: 'Logo del negocio' })).toBeHidden();
  await dialogo.getByRole('button', { name: 'Cancelar restauración' }).press('Enter');
  await expect(dialogo.getByRole('img', { name: 'Logo del negocio' })).toBeVisible();
  expect(await consultarFilas('SELECT version FROM personalizacion_portal')).toEqual([{ version: 1 }]);
  await dialogo.getByRole('button', { name: 'Previsualizar predeterminados' }).press('Enter');
  await dialogo.getByRole('button', { name: 'Aplicar predeterminados' }).press('Enter');
  await expect(dialogo).toBeHidden();
  expect(await consultarFilas('SELECT version, logo_id FROM personalizacion_portal')).toEqual([{ version: 2, logo_id: null }]);
  await pagina.goto(urlPortal(1));
  await expect(pagina.getByRole('radio', { name: /Corte QA/ })).toBeVisible();
  await expect(pagina.locator('#portal-iniciales-negocio')).toBeVisible();
  await expect(pagina.getByRole('img', { name: 'Logo de Portal QA 1' })).toHaveCount(0);
});

// Dos sesiones ven la misma versión. El editor atrasado explica el 409 y recarga el valor publicado.
test('M5-T053 · escritorio claro, conflicto de versión y recuperación del valor publicado', async ({ page: pagina, browser: navegador }) => {
  await pagina.emulateMedia({ colorScheme: 'light' });
  await entrar(pagina, 'admin-qa-2@example.test');
  const dialogo = await abrir(pagina);
  const contexto = await navegador.newContext();
  try {
    const segunda = await contexto.newPage();
    await entrar(segunda, 'admin-qa-2@example.test');
    const segundoDialogo = await abrir(segunda);
    await segundoDialogo.getByLabel('Color de acento').fill('#884bad');
    await segundoDialogo.getByRole('button', { name: 'Guardar marca' }).press('Enter');
    await expect(segundoDialogo).toBeHidden();
    await dialogo.getByLabel('Color de acento').fill('#b3442c');
    await dialogo.getByRole('button', { name: 'Guardar marca' }).press('Enter');
    await expect(dialogo.getByRole('alert')).toContainText('Recarga la marca publicada');
    await expect(dialogo.getByRole('alert')).toBeFocused();
    await dialogo.getByRole('button', { name: 'Recargar marca publicada' }).press('Enter');
    await expect(dialogo.getByLabel('Color de acento')).toHaveValue('#884bad');
  } finally { await contexto.close(); }
});

test('M5-T051 · la demo permite editar y descartar la muestra sin consultar la API', async ({ page: pagina }) => {
  const peticiones = [];
  pagina.on('request', (peticion) => {
    if (new URL(peticion.url()).pathname.startsWith('/negocio/personalizacion')) peticiones.push(peticion.url());
  });
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/configuracion?demo=1`);
  const dialogo = await abrir(pagina);
  await expect(dialogo.getByText(/no se publican en un portal real/)).toBeVisible();
  await dialogo.getByLabel('Color de acento').fill('#b3442c');
  await expect(dialogo.locator('.personalizacion-muestra-boton')).toHaveCSS('background-color', 'rgb(179, 68, 44)');
  await pagina.keyboard.press('Escape');
  await expect(pagina.getByRole('button', { name: 'Personalizar portal' })).toBeFocused();
  const reabierto = await abrir(pagina);
  await expect(reabierto.getByLabel('Color de acento')).toHaveValue('#2164d8');
  expect(peticiones).toEqual([]);
});

// El selector nativo y el campo editable comparten borrador, contraste y restauración.
test('Selector de marca · paleta y pegado hexadecimal sincronizados en móvil', async ({ page: pagina }) => {
  await pagina.setViewportSize({ width: 320, height: 720 });
  await pagina.emulateMedia({ colorScheme: 'dark' });
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/configuracion?demo=1`);
  const dialogo = await abrir(pagina);
  const hex = dialogo.getByLabel('Color de acento', { exact: true });
  const selector = dialogo.getByLabel('Paleta de acento', { exact: true });
  await expect(dialogo.locator('input[type="color"]')).toHaveCount(1);
  await expect(selector).toHaveValue('#2164d8');
  await selector.fill('#b3442c');
  await expect(hex).toHaveValue('#b3442c');
  await expect(dialogo.locator('.personalizacion-muestra-boton')).toHaveCSS('background-color', 'rgb(179, 68, 44)');

  // La interfaz del sistema pertenece al navegador. Fill ejerce el input nativo
  // y el evento paste usa el mismo portapapeles que recibe el campo.
  await hex.evaluate((elemento) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', ' 884BAD ');
    elemento.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  });
  await expect(hex).toHaveValue('#884bad');
  await expect(selector).toHaveValue('#884bad');
  await expect(dialogo.locator('.personalizacion-muestra-boton')).toHaveCSS('background-color', 'rgb(136, 75, 173)');
  await hex.fill('#884bad80');
  await expect(hex).toHaveAttribute('aria-invalid', 'true');
  await expect(selector).toHaveValue('#884bad');
  await expect(dialogo.locator('.personalizacion-muestra-boton')).toHaveCSS('background-color', 'rgb(136, 75, 173)');
  await dialogo.getByRole('button', { name: 'Previsualizar predeterminados' }).click();
  await expect(selector).toHaveValue('#2164d8');
  await expect(selector).toBeDisabled();
  await dialogo.getByRole('button', { name: 'Cancelar restauración' }).click();
  await expect(hex).toHaveValue('#884bad80');
  await expect(selector).toHaveValue('#884bad');
  await expect(dialogo.locator('.personalizacion-muestra-boton')).toHaveCSS('background-color', 'rgb(136, 75, 173)');
  expect(await dialogo.evaluate((elemento) => elemento.scrollWidth)).toBe(await dialogo.evaluate((elemento) => elemento.clientWidth));
});

test('Acento en hover y pulsación en ambos temas del portal', async ({ page: portal }) => {
  await portal.emulateMedia({ colorScheme: 'dark' });
  // El catálogo real proporciona servicios; solo fijamos el acento de esta prueba visual.
  await portal.route('**/publico/negocios/portal-qa-1/catalogo', async (ruta) => {
    const respuesta = await ruta.fetch();
    const catalogo = await respuesta.json();
    await ruta.fulfill({ response: respuesta, json: { ...catalogo, marca: { acento: '#b3442c' } } });
  });
  await portal.goto(urlPortal(1));
  const continuar = portal.getByRole('button', { name: 'Continuar' });
  await continuar.hover({ force: true });
  await expect(continuar).toBeDisabled();
  await expect(continuar).toHaveCSS('background-color', 'rgb(179, 68, 44)');
  await expect(continuar).toHaveCSS('transform', 'none');

  await portal.getByRole('radio', { name: /Corte QA/ }).press('Space');
  await expect(continuar).toBeEnabled();
  await comprobarPulsacionDeMarca(portal, continuar);
  await portal.getByRole('button', { name: 'Activar modo claro' }).click();
  await comprobarPulsacionDeMarca(portal, continuar);
  await portal.emulateMedia({ reducedMotion: 'reduce' });
  await continuar.hover();
  await expect(continuar).toHaveCSS('background-color', 'rgb(165, 63, 40)');
  await expect(continuar).toHaveCSS('transform', 'none');
});
