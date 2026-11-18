import { test, expect } from './support.js';
import { portalUrl, rows } from './support.js';

// La suite previa edita la semana y crea bloqueos del mismo profesional.
// Restaurar solo estos fixtures efímeros evita heredar su oferta reducida.
test.beforeAll(async () => {
  const [{ id: personalId }] = await rows("SELECT id FROM usuarios WHERE email='qa-prof-1@example.test'");
  const [{ id: sucursalId }] = await rows("SELECT id FROM sucursales WHERE negocio_id=1 ORDER BY id LIMIT 1");
  await rows('DELETE FROM bloqueos_horario WHERE negocio_id=1 AND personal_id=?', [personalId]);
  await rows('DELETE FROM horarios_personal WHERE negocio_id=1 AND personal_id=?', [personalId]);
  for (let dia = 0; dia < 7; dia++) {
    await rows('INSERT INTO horarios_personal (negocio_id,personal_id,sucursal_id,dia_semana,orden,inicio_minutos,fin_minutos,activo) VALUES (1,?,?,?,0,480,1080,1)', [personalId, sucursalId, dia]);
  }
});

const fechaDePrueba = (diasAdicionales) => new Date(Date.now() + diasAdicionales * 86400000).toISOString().slice(0, 10);

// Los selectores siguen controles accesibles; cada caso toma otra fecha para
// evitar que sus citas y apartados compitan entre sí dentro de la base efímera.
// El portal actual ofrece fechas del servidor mediante botones de calendario.
async function elegirFecha(pagina, diasAdicionales) {
  const dia = pagina.locator('.portal-calendario-dia[data-seleccion-fecha="' + fechaDePrueba(diasAdicionales) + '"]');
  await expect(dia).toBeEnabled();
  await dia.click();
}

async function elegirHorario(pagina, diasAdicionales, indice = 0, negocioPrueba = 1, apartar = true) {
  await pagina.goto(portalUrl(negocioPrueba));
  await pagina.getByRole('radio', { name: /Corte QA/ }).check();
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Elige fecha y hora' })).toBeVisible();
  await elegirFecha(pagina, diasAdicionales);
  await expect(pagina.locator('[data-horario]').nth(indice)).toBeEnabled();
  // El radio se dibuja con una etiqueta: pulsar su superficie visible como el usuario.
  await pagina.locator('.portal-horario').nth(indice).click();
  await expect(pagina.locator('[data-horario]').nth(indice)).toBeChecked();
  const seleccionado = await pagina.locator('[data-horario]:checked').getAttribute('value');
  if (apartar) {
    await pagina.getByRole('button', { name: 'Apartar este horario' }).click();
    await expect(pagina.getByRole('heading', { name: 'Completa tus datos' })).toBeVisible();
  }
  return seleccionado;
}

async function completarContacto(pagina, notas = '') {
  await pagina.getByLabel('Nombre completo').fill('Cliente de prueba');
  // Cada caso usa otro contacto para no agotar el cupo real de casos anteriores.
  const telefono = '614' + String(test.info().testId.split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 10000000, 0)).padStart(7, '0');
  await pagina.getByLabel('Teléfono mexicano').fill(telefono);
  await pagina.getByLabel(/Notas o motivo/).fill(notas);
}

async function reservar(pagina, notas = '') {
  await completarContacto(pagina, notas);
  await pagina.getByRole('button', { name: 'Reservar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible();
  await expect(pagina.getByText('Pendiente', { exact: true })).toBeVisible();
  return pagina.locator('.portal-resultado-folio').innerText();
}

// FALA-T003 comprueba desde el navegador y una lectura SQL que el runner
// apunta a su base desechable, nunca a la base cotidiana del backend.
test('FALA-T003: portal conectado usa exclusivamente la base efímera del runner', async ({ page: pagina }) => {
  const nombreTemporal = process.env.PORTAL_TEST_DB_NAME;
  expect(nombreTemporal).toMatch(/^citas_persistencia_[a-f0-9]{32}$/);
  expect(await rows('SELECT DATABASE() AS nombre')).toEqual([{ nombre: nombreTemporal }]);
  await pagina.goto(portalUrl());
  await expect(pagina.getByRole('radio', { name: /Corte QA/ })).toBeVisible();
  expect(await rows('SELECT slug FROM negocios ORDER BY slug')).toEqual([
    { slug: 'portal-qa-1' }, { slug: 'portal-qa-2' },
  ]);
});

// FALA-T004 contrasta un slug ausente real con una licencia cerrada simulada
// en la frontera HTTP; ninguna de las dos situaciones debe abrir selección.
test('FALA-T004: slug inválido o licencia cerrada impiden reservar', async ({ page: pagina }) => {
  await pagina.goto(portalUrl().replace('portal-qa-1', 'portal-inexistente'));
  await expect(pagina.locator('#portal-estado')).toContainText(/no disponible|no existe|selección/i);
  await expect(pagina.locator('#portal-seleccion')).toBeHidden();
  await pagina.route('**/publico/negocios/portal-qa-1/sesion', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 403,
    contentType: 'application/json', body: JSON.stringify({ codigo: 'portal_403',
      mensaje: 'La solicitud no está permitida.', accion: 'corregir' }) }));
  await pagina.goto(portalUrl());
  await expect(pagina.locator('#portal-estado')).toContainText('La solicitud no está permitida.');
  await expect(pagina.locator('#portal-seleccion')).toBeHidden();
  await expect(pagina.getByRole('button', { name: 'Apartar este horario' })).toHaveCount(0);
});

// FALA-T012 reproduce la proyección de precio oculto sobre respuestas del
// backend real; el escritor guarda la cita, pero el navegador no recibe importe.
test('FALA-T012: precio oculto no aparece en catálogo, apartado ni resultado', async ({ page: pagina }) => {
  await pagina.route('**/publico/negocios/portal-qa-1/**', async (rutaInterceptada) => {
    const respuesta = await rutaInterceptada.fetch();
    if (!respuesta.ok() || respuesta.status() === 204 || rutaInterceptada.request().url().endsWith('/sesion')) {
      await rutaInterceptada.fulfill({ response: respuesta }); return;
    }
    const ocultarPrecio = (valor) => Array.isArray(valor) ? valor.map(ocultarPrecio) : valor && typeof valor === 'object'
      ? Object.fromEntries(Object.entries(valor).filter(([clave]) => !['costo', 'costoAceptado'].includes(clave))
        .map(([clave, elemento]) => [clave, ocultarPrecio(elemento)])) : valor;
    await rutaInterceptada.fulfill({ response: respuesta, json: ocultarPrecio(await respuesta.json()) });
  });
  await pagina.goto(portalUrl());
  await expect(pagina.getByRole('radio', { name: /Corte QA/ })).toBeVisible();
  await expect(pagina.locator('#portal-seleccion')).not.toContainText(/MXN|NaN|Pago directamente/);
  await elegirHorario(pagina, 11);
  await expect(pagina.locator('#portal-seleccion')).not.toContainText(/MXN|NaN|Pago directamente/);
  await pagina.getByLabel('Nombre completo').fill('Cliente precio oculto');
  await pagina.getByLabel('Teléfono mexicano').fill('6141234577');
  await pagina.getByRole('button', { name: 'Reservar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible();
  await expect(pagina.locator('#portal-seleccion')).not.toContainText(/MXN|NaN|Pago directamente|Costo/);
});

// La opción se cambia desde la cuenta conectada; el portal consulta respuestas
// reales y la base temporal confirma que el costo histórico no se reescribe.
test('FALA-T044–T046: publicación global cambia el portal y conserva el importe histórico', async ({ page: pagina, browser: navegador }) => {
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/cuenta`);
  await pagina.getByLabel('Correo electrónico').fill('admin-qa-1@example.test');
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Precios en el portal público' })).toBeVisible();
  await expect(pagina.getByText('Precios visibles')).toBeVisible();

  const contexto = await navegador.newContext();
  const portal = await contexto.newPage();
  try {
    await elegirHorario(portal, 15);
    await completarContacto(portal);
    const folio = await reservar(portal);
    const before = await rows('SELECT costo_aceptado FROM citas WHERE folio=?', [folio]);
    expect(Number(before[0].costo_aceptado)).toBe(100);

    await pagina.getByLabel('Publicar precios').selectOption('false');
    await pagina.getByRole('button', { name: 'Guardar publicación' }).click();
    await expect(pagina.getByText('Precios ocultos')).toBeVisible();
    const hiddenResponse = portal.waitForResponse((respuesta) => respuesta.url().includes('/publico/negocios/portal-qa-1/catalogo') && respuesta.ok());
    await portal.goto(portalUrl());
    expect((await (await hiddenResponse).json()).servicios[0]).not.toHaveProperty('costo');
    await expect(portal.getByRole('radio', { name: /Corte QA/ })).toBeVisible();
    await expect(portal.locator('#portal-seleccion')).not.toContainText('$100');
    expect(Number((await rows('SELECT costo_aceptado FROM citas WHERE folio=?', [folio]))[0].costo_aceptado)).toBe(100);

    await pagina.getByLabel('Publicar precios').selectOption('true');
    await pagina.getByRole('button', { name: 'Guardar publicación' }).click();
    await expect(pagina.getByText('Precios visibles')).toBeVisible();
    const visibleResponse = portal.waitForResponse((respuesta) => respuesta.url().includes('/publico/negocios/portal-qa-1/catalogo') && respuesta.ok());
    await portal.goto(portalUrl());
    expect(Number((await (await visibleResponse).json()).servicios[0].costo)).toBe(100);
    await expect(portal.locator('#portal-seleccion')).toContainText('$100');
  } finally { await contexto.close(); }
});

// T117 abre el portal conectado contra los servidores y la base efímera del runner.
test('T117: inicia la página pública con la oferta real de prueba', async ({ page: pagina }) => {
  await pagina.goto(portalUrl());
  // La portada usa el nombre del negocio y el primer paso del asistente.
  await expect(pagina.getByRole('heading', { name: 'Portal QA 1' })).toBeVisible();
  await expect(pagina.getByRole('heading', { name: 'Elige un servicio' })).toBeVisible();
  await expect(pagina.getByRole('radio', { name: /Corte/ })).toBeVisible();
});

test('T118: móvil corrige contacto y confirma exactamente una cita pendiente', async ({ browser: navegador }) => {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pagina = await contexto.newPage();
  try {
    await elegirHorario(pagina, 3);
    await pagina.getByRole('button', { name: 'Revisar datos' }).click();
    await expect(pagina.getByLabel('Nombre completo')).toHaveAttribute('aria-invalid', 'true');
    await completarContacto(pagina);
    await pagina.getByRole('button', { name: 'Revisar datos' }).click();
    await expect(pagina.locator('#portal-contacto-validado')).toBeVisible();
    const folio = await reservar(pagina);
    expect(folio).toMatch(/^P-[A-F0-9]{18}$/);
    const citations = await rows('SELECT folio,estado,origen FROM citas WHERE folio=?', [folio]);
    expect(citations).toEqual([{ folio, estado: 'pendiente', origen: 'portal_publico' }]);
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await contexto.close(); }
});

test('T119: teclado, foco y notas HTML se mantienen como texto seguro', async ({ page: pagina }) => {
  await pagina.goto(portalUrl());
  for (const nombre of [/Corte QA/]) {
    await pagina.getByRole('radio', { name: nombre }).focus();
    await pagina.keyboard.press('Space');
    await pagina.getByRole('button', { name: 'Continuar' }).focus();
    await pagina.keyboard.press('Enter');
  }
  await elegirFecha(pagina, 4);
  await expect(pagina.locator('[data-horario]').first()).toBeEnabled();
  await pagina.locator('[data-horario]').first().focus();
  await pagina.keyboard.press('Space');
  await pagina.getByRole('button', { name: 'Apartar este horario' }).focus();
  await pagina.keyboard.press('Enter');
  await expect(pagina.getByRole('heading', { name: 'Completa tus datos' })).toBeFocused();
  await pagina.getByLabel('Nombre completo').focus();
  await pagina.keyboard.type('Cliente de teclado');
  await pagina.keyboard.press('Tab');
  await expect(pagina.getByLabel('Teléfono mexicano')).toBeFocused();
  await pagina.keyboard.type('6141234567');
  await pagina.keyboard.press('Tab');
  await expect(pagina.getByLabel(/Notas o motivo/)).toBeFocused();
  const note = '<img src=x onerror="window.__portalInjected=1">';
  await pagina.keyboard.type(note);
  await pagina.getByRole('button', { name: 'Revisar datos' }).focus();
  await pagina.keyboard.press('Enter');
  await expect(pagina.locator('#portal-contacto-validado')).toBeVisible();
  await pagina.getByRole('button', { name: 'Reservar' }).focus();
  await pagina.keyboard.press('Enter');
  await expect(pagina.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible();
  expect(await pagina.evaluate(() => window.__portalInjected ?? 0)).toBe(0);
  expect(await pagina.locator('img[src="x"]').count()).toBe(0);
  const folio = await pagina.locator('.portal-resultado-folio').innerText();
  expect((await rows('SELECT motivo_consulta FROM citas WHERE folio=?', [folio]))[0].motivo_consulta).toBe(note);
});

test('T120: pestañas hermanas comparten sesión y avisan al sustituir el apartado', async ({ context: contexto, page: pagina }) => {
  await elegirHorario(pagina, 5, 0);
  const second = await contexto.newPage();
  try {
    await elegirHorario(second, 5, 1);
    await expect(pagina.locator('.portal-aviso-apartado')).toContainText('ya no está disponible en esta pestaña');
    await expect(pagina.getByRole('button', { name: 'Reservar' })).toBeDisabled();
    const sesiones = await rows('SELECT COUNT(*) n FROM sesiones_reserva_publica WHERE negocio_id=(SELECT id FROM negocios WHERE slug=?)', ['portal-qa-1']);
    expect(Number(sesiones[0].n)).toBeGreaterThan(0);
    const holds = await rows(`SELECT COUNT(*) n FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
      WHERE n.slug='portal-qa-1' AND b.liberado_en IS NULL AND b.expira_en > UTC_TIMESTAMP()`);
    expect(Number(holds[0].n)).toBe(1);
    const previousId = (await rows(`SELECT MAX(b.id) AS id FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
      WHERE n.slug='portal-qa-1'`))[0].id;
    const challenger = await contexto.newPage();
    const outsider = await contexto.browser().newContext();
    const outsiderPage = await outsider.newPage();
    try {
      await elegirHorario(challenger, 11, 0, 1, false);
      await elegirHorario(outsiderPage, 11, 0);
      await challenger.getByRole('button', { name: 'Apartar este horario' }).click();
      await expect(challenger.getByRole('heading', { name: 'Elige fecha y hora' })).toBeVisible();
      await expect(second.locator('.portal-aviso-apartado')).toContainText('ya no está disponible');
      const previous = await rows('SELECT liberado_en FROM bloqueos_temporales WHERE id=?', [previousId]);
      expect(previous[0].liberado_en).not.toBeNull();
    } finally { await challenger.close(); await outsider.close(); }
  } finally { await second.close(); }
});

test('T121: navegadores aislados disputan un horario sin doble ocupación', async ({ browser: navegador }) => {
  const first = await navegador.newContext();
  const other = await navegador.newContext();
  const a = await first.newPage(); const b = await other.newPage();
  try {
    const occupied = await elegirHorario(a, 6, 0);
    const apartado = (await rows(`SELECT b.id FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
      WHERE n.slug='portal-qa-1' ORDER BY b.id DESC LIMIT 1`))[0].id;
    await b.goto(portalUrl());
    // El primer paso vigente usa este encabezado en la portada conectada.
    await expect(b.getByRole('heading', { name: 'Elige un servicio' })).toBeVisible();
    const foreign = await b.evaluate(async (id) => {
      const respuesta = await fetch(`/publico/negocios/portal-qa-1/apartados/${id}`, { credentials: 'same-origin' });
      return respuesta.status;
    }, apartado);
    expect(foreign).toBe(404);
    await b.getByRole('radio', { name: /Corte QA/ }).check();
    await b.getByRole('button', { name: 'Continuar' }).click();
    await expect(b.getByRole('heading', { name: 'Elige fecha y hora' })).toBeVisible();
    await elegirFecha(b, 6);
    await expect(b.locator('[data-horario]').first()).toBeVisible();
    // La disponibilidad descarta un apartado ajeno ya confirmado.
    expect(await b.locator(`[data-horario][value="${occupied}"]`).count()).toBe(0);
    await elegirHorario(b, 12, 0, 1, false);
    await elegirHorario(a, 12, 0);
    await b.getByRole('button', { name: 'Apartar este horario' }).click();
    await expect(b.getByRole('heading', { name: 'Elige fecha y hora' })).toBeVisible();
    const matching = await rows(`SELECT COUNT(*) n FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
      WHERE n.slug='portal-qa-1' AND b.liberado_en IS NULL AND b.expira_en > UTC_TIMESTAMP()`);
    expect(Number(matching[0].n)).toBe(1);
    const folio = await reservar(a);
    const intento = (await rows(`SELECT i.clave,i.apartado_id AS apartadoId FROM intentos_reserva_publica i
      JOIN citas c ON c.id=i.cita_id WHERE c.folio=?`, [folio]))[0];
    const foreignResult = await b.evaluate(async ({ clave, apartadoId }) => {
      const base = '/publico/negocios/portal-qa-1';
      const sesion = await fetch(`${base}/sesion`, { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Portal-Inicializacion': '1' }, body: '{}' });
      const { csrfToken } = await sesion.json();
      const resultado = await fetch(`${base}/intentos/${clave}/resolver`, { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ apartadoId }) });
      return resultado.status;
    }, intento);
    expect(foreignResult).toBe(404);
  } finally { await first.close(); await other.close(); }
});

test('T122: recarga limpia contacto, salida libera y cookies ausentes bloquean', async ({ browser: navegador, page: pagina }) => {
  await elegirHorario(pagina, 7);
  const abandonedId = (await rows(`SELECT MAX(b.id) AS id FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
    WHERE n.slug='portal-qa-1'`))[0].id;
  await completarContacto(pagina, 'Privado temporal');
  await pagina.reload();
  await expect(pagina.getByRole('heading', { name: 'Elige un servicio' })).toBeVisible();
  expect(await pagina.locator('#portal-contacto-nombre').count()).toBe(0);
  await expect.poll(async () => (await rows('SELECT liberado_en FROM bloqueos_temporales WHERE id=?', [abandonedId]))[0].liberado_en !== null).toBe(true);
  const contexto = await navegador.newContext();
  const blocked = await contexto.newPage();
  try {
    await blocked.route('**/publico/negocios/*/sesion', async (rutaInterceptada) => {
      const respuesta = await rutaInterceptada.fetch();
      const headers = { ...respuesta.headers() };
      delete headers['set-cookie'];
      await contexto.clearCookies();
      await rutaInterceptada.fulfill({ response: respuesta, headers });
    });
    await blocked.goto(portalUrl());
    await expect(blocked.getByText(/no conserva la cookie/)).toBeVisible();
  } finally { await contexto.close(); }
});

test('T123: respuesta perdida tras commit recupera el mismo folio', async ({ page: pagina }) => {
  await elegirHorario(pagina, 8);
  await completarContacto(pagina);
  await pagina.route('**/intentos/*/reservar', async (rutaInterceptada) => {
    await rutaInterceptada.fetch();
    await rutaInterceptada.abort('failed');
  });
  await pagina.getByRole('button', { name: 'Reservar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Comprueba tu envío' })).toBeVisible();
  const before = await rows("SELECT folio FROM citas WHERE origen='portal_publico' ORDER BY id DESC LIMIT 1");
  await pagina.reload();
  await expect(pagina.getByRole('heading', { name: 'Reserva registrada' })).toBeVisible();
  expect(await pagina.locator('.portal-resultado-folio').innerText()).toBe(before[0].folio);
});

test('T123: pérdida anterior al escritor termina sin cita tardía', async ({ page: pagina }) => {
  await elegirHorario(pagina, 9);
  await completarContacto(pagina);
  const before = Number((await rows("SELECT COUNT(*) n FROM citas WHERE origen='portal_publico'"))[0].n);
  await pagina.route('**/intentos/*/reservar', (rutaInterceptada) => rutaInterceptada.abort('failed'));
  await pagina.getByRole('button', { name: 'Reservar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Comprueba tu envío' })).toBeVisible();
  await pagina.reload();
  await expect(pagina.getByRole('heading', { name: 'Elige un servicio' })).toBeVisible();
  expect(Number((await rows("SELECT COUNT(*) n FROM citas WHERE origen='portal_publico'"))[0].n)).toBe(before);
});

// FALA-T023 corta la sesión tras dejar un intento incierto. El cliente debe
// conservar la referencia local aunque no pueda obtener CSRF para resolver.
test('FALA-T023: licencia bloqueada tras recarga conserva recuperación pendiente', async ({ page: pagina }) => {
  await elegirHorario(pagina, 13);
  await completarContacto(pagina, 'Nota que no debe persistir');
  await pagina.route('**/intentos/*/reservar', (rutaInterceptada) => rutaInterceptada.abort('failed'));
  await pagina.getByRole('button', { name: 'Reservar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Comprueba tu envío' })).toBeVisible();
  const before = await pagina.evaluate(() => Object.entries(sessionStorage)
    .filter(([clave]) => clave.startsWith('citalendar:public:attempt:')));
  expect(before).toHaveLength(1);
  await pagina.route('**/publico/negocios/portal-qa-1/sesion', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 403,
    contentType: 'application/json', body: JSON.stringify({ codigo: 'portal_403',
      mensaje: 'Portal temporalmente cerrado.', accion: 'reintentar' }) }));
  await pagina.reload();
  await expect(pagina.locator('#portal-estado')).toContainText('recuperación pendiente');
  await expect(pagina.locator('#portal-seleccion')).toBeHidden();
  expect(await pagina.evaluate(() => Object.entries(sessionStorage)
    .filter(([clave]) => clave.startsWith('citalendar:public:attempt:')))).toEqual(before);
  expect(JSON.stringify(before)).not.toContain('Nota que no debe persistir');
});

// Capturas de revisión del formulario conectado en ambos temas y dos anchos.
// Las comprobaciones de desborde acompañan la inspección humana de las PNG.
test('FALA-T013–T023: formulario visible en escritorio y móvil, claro y oscuro', async ({ page: pagina }, testInfo) => {
  await elegirHorario(pagina, 14);
  await expect(pagina.getByRole('button', { name: 'Reservar' })).toBeVisible();
  await pagina.screenshot({ path: testInfo.outputPath('form-desktop-light.png'), fullPage: true });
  await pagina.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await pagina.screenshot({ path: testInfo.outputPath('form-desktop-dark.png'), fullPage: true });
  await pagina.setViewportSize({ width: 390, height: 844 });
  expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await pagina.screenshot({ path: testInfo.outputPath('form-mobile-dark.png'), fullPage: true });
  await pagina.getByRole('button', { name: 'Activar modo claro' }).click();
  await pagina.screenshot({ path: testInfo.outputPath('form-mobile-light.png'), fullPage: true });
});

test('T124: reloj cambiado y pestaña reactivada no prolongan un apartado vencido', async ({ page: pagina }) => {
  test.setTimeout(360_000);
  await elegirHorario(pagina, 10);
  const before = await pagina.locator('#portal-tiempo-apartado').innerText();
  await pagina.clock.install();
  await pagina.clock.setFixedTime(new Date(Date.now() - 30 * 86400000));
  await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(pagina.locator('#portal-tiempo-apartado')).not.toHaveText('0:00');
  const apartado = (await rows(`SELECT b.id,TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), b.expira_en) AS seconds_left FROM bloqueos_temporales b JOIN negocios n ON n.id=b.negocio_id
    WHERE n.slug='portal-qa-1' ORDER BY b.id DESC LIMIT 1`))[0];
  expect(before).toMatch(/^[0-5]:\d{2}$/);
  const tab = await pagina.context().newPage();
  await tab.bringToFront();
  // La espera usa la expiración de cinco minutos del servidor. No altera la
  // expiración persistida ni acelera artificialmente el reloj de MariaDB.
  await pagina.waitForTimeout(Math.max(0, Number(apartado.seconds_left) * 1000 + 2100));
  await tab.close();
  await pagina.bringToFront();
  await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(pagina.locator('.portal-aviso-apartado')).toContainText('apartado venció');
  await expect(pagina.getByRole('button', { name: 'Reservar' })).toBeDisabled();
});
