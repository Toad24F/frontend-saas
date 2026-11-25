import { test, expect, consultarFilas } from './integracion.utilidades.js';

const rutaConfiguracion = '**/negocio/automatizaciones';
const cuenta = () => `${process.env.PORTAL_TEST_ORIGIN}/admin/cuenta`;

async function entrar(pagina, correo) {
  await pagina.goto(cuenta());
  await pagina.getByLabel('Correo electrónico').fill(correo);
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(pagina).toHaveURL(/\/admin\/resumen$/);
  await pagina.goto(cuenta());
  await expect(pagina.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible();
}

async function abrir(pagina) {
  await pagina.getByRole('button', { name: 'Configurar plazos' }).press('Enter', { timeout: 5000 });
  const dialogo = pagina.getByRole('dialog', { name: 'Plazos y recordatorios' });
  await expect(dialogo.getByLabel('Plazo de confirmación')).toBeEnabled();
  return dialogo;
}

// La escritura real debe conservar las filas que guardan la política de una cita previa.
test('M5-T064 · carga valores, valida rangos y guarda sin recalcular trabajos anteriores', async ({ page: pagina }) => {
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.emulateMedia({ colorScheme: 'dark' });
  const [{ id: citaId, negocio_id: negocioId }] = await consultarFilas("SELECT c.id, c.negocio_id FROM citas c JOIN clientes x ON x.id=c.cliente_id WHERE x.nombre_completo='Cliente Retiro QA'");
  const ahora = new Date();
  await consultarFilas(`INSERT INTO canales_whatsapp (negocio_id, remitente_externo_id, secreto_ref)
    VALUES (?, 'phone-t064', 'secret://whatsapp/prueba-t064')`, [negocioId]);
  await consultarFilas(`INSERT INTO condiciones_confirmacion_cita
    (negocio_id, cita_id, generacion, categoria, instante_base, plazo_aplicado_minutos, vencimiento_utc, version_configuracion)
    VALUES (?, ?, 1, 'normal', ?, 720, ?, 0)`, [negocioId, citaId, ahora, new Date(+ahora + 43_200_000)]);
  await consultarFilas(`INSERT INTO envios_whatsapp
    (negocio_id, cita_id, generacion, tipo, clave_efecto, programado_en, util_hasta, proximo_intento_en, destino_e164, parametros_plantilla)
    VALUES (?, ?, 1, 'recordatorio', 'recordatorio-t064', ?, ?, ?, '+526145550199', '{}')`,
  [negocioId, citaId, ahora, new Date(+ahora + 300_000), ahora]);
  const leerHistorico = () => Promise.all([
    consultarFilas('SELECT * FROM citas WHERE id = ?', [citaId]),
    consultarFilas('SELECT * FROM condiciones_confirmacion_cita WHERE cita_id = ?', [citaId]),
    consultarFilas('SELECT * FROM envios_whatsapp WHERE cita_id = ?', [citaId]),
  ]);
  const anterior = await leerHistorico();
  const escrituras = [];
  pagina.on('request', (peticion) => {
    if (peticion.method() === 'PUT' && peticion.url().endsWith('/negocio/automatizaciones')) escrituras.push(peticion.postDataJSON());
  });
  await entrar(pagina, 'admin-qa-2@example.test');
  const dialogo = await abrir(pagina);
  const plazo = dialogo.getByLabel('Plazo de confirmación');
  const recordatorio = dialogo.getByLabel('Anticipación del recordatorio');
  const guardar = dialogo.getByRole('button', { name: 'Guardar plazos' });
  await expect(plazo).toHaveValue('12');
  await expect(recordatorio).toHaveValue('24');
  await expect(plazo).toBeFocused();
  await pagina.keyboard.press('Tab');
  await expect(recordatorio).toBeFocused();
  await plazo.fill('5');
  await recordatorio.fill('48.5');
  await guardar.press('Enter');
  await expect(dialogo.getByRole('alert')).toContainText('entre 6 y 24');
  await expect(dialogo.getByRole('alert')).toContainText('entre 12 y 48');
  await expect(plazo).toBeFocused();
  expect(escrituras).toEqual([]);
  await plazo.fill('6');
  await recordatorio.fill('48');
  await guardar.press('Enter');
  await expect(dialogo.getByRole('status')).toContainText('Configuración guardada');
  await expect(guardar).toBeFocused();
  await expect(guardar).toHaveCSS('background-color', 'rgb(186, 78, 52)');
  expect(escrituras).toEqual([{ version: 0, plazoConfirmacionHoras: 6, recordatorioHoras: 48 }]);
  expect(await leerHistorico()).toEqual(anterior);
  await pagina.reload();
  const vigente = await abrir(pagina);
  await expect(vigente.getByLabel('Plazo de confirmación')).toHaveValue('6');
  await expect(vigente.getByLabel('Anticipación del recordatorio')).toHaveValue('48');
  expect(await vigente.evaluate((elemento) => elemento.scrollWidth)).toBe(await vigente.evaluate((elemento) => elemento.clientWidth));
});

test('M5-T064 · muestra el 400 y resuelve el 409 real sin reenviar una versión obsoleta', async ({ page: pagina, browser: navegador }) => {
  await pagina.emulateMedia({ colorScheme: 'light' });
  await entrar(pagina, 'admin-qa-1@example.test');
  const dialogo = await abrir(pagina);
  const plazo = dialogo.getByLabel('Plazo de confirmación');
  const guardar = dialogo.getByRole('button', { name: 'Guardar plazos' });
  await pagina.route(rutaConfiguracion, (ruta) => ruta.fulfill({
    status: 400, json: { message: 'El plazo de confirmación debe ser un entero entre 6 y 24.' },
  }), { times: 1 });
  await plazo.fill('18');
  await guardar.click();
  await expect(dialogo.getByRole('alert')).toContainText('El plazo de confirmación debe ser un entero');
  await expect(plazo).toHaveValue('18');

  const otroContexto = await navegador.newContext();
  try {
    const otra = await otroContexto.newPage();
    await entrar(otra, 'admin-qa-1@example.test');
    const editor = await abrir(otra);
    await editor.getByLabel('Plazo de confirmación').fill('20');
    await editor.getByLabel('Anticipación del recordatorio').fill('30');
    await editor.getByRole('button', { name: 'Guardar plazos' }).click();
    await expect(editor.getByRole('status')).toContainText('Configuración guardada');
    await guardar.click();
    await expect(dialogo.getByRole('alert')).toContainText('La versión de automatizaciones cambió');
    await expect(plazo).toHaveValue('18');
    await expect(guardar).toBeDisabled();
    await dialogo.getByRole('button', { name: 'Recargar valores vigentes' }).press('Enter');
    await expect(plazo).toHaveValue('20');
    await expect(dialogo.getByLabel('Anticipación del recordatorio')).toHaveValue('30');
    await expect(plazo).toBeFocused();
  } finally { await otroContexto.close(); }
});

test('M5-T064 · Recepción no tiene acceso al formulario y la demo funciona localmente', async ({ page: pagina }) => {
  const peticiones = [];
  pagina.on('request', (peticion) => {
    if (peticion.url().endsWith('/negocio/automatizaciones')) peticiones.push(peticion.method());
  });
  await entrar(pagina, 'recepcion-1-qa@example.test');
  await expect(pagina.getByRole('button', { name: 'Configurar plazos' })).toHaveCount(0);
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/configuracion?demo=1`);
  const dialogo = await abrir(pagina);
  await expect(dialogo.getByText(/demostración.*simulados/i)).toBeVisible();
  await dialogo.getByLabel('Anticipación del recordatorio').fill('36');
  await dialogo.getByRole('button', { name: 'Guardar plazos' }).click();
  await expect(dialogo.getByRole('status')).toContainText('Configuración guardada');
  await pagina.keyboard.press('Escape');
  await expect(pagina.getByRole('button', { name: 'Configurar plazos' })).toBeFocused();
  const reabierto = await abrir(pagina);
  await expect(reabierto.getByLabel('Anticipación del recordatorio')).toHaveValue('36');
  expect(peticiones).toEqual([]);
});
