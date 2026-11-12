import { test, expect } from '@playwright/test';

// API simulada con contratos leídos del backend; ninguna escritura llega a Nest o MariaDB.
async function fixture(page, role = 'recepcionista', theme = 'light') {
  const control = { writes: [], lost: false, preparationLost: false, availabilityError: false, resolveError: false, conflict: false, registered: false, version: 1, estado: 'confirmada' };
  await page.addInitScript((theme) => { sessionStorage.setItem('cita-session', 'm4-manual-test'); localStorage.setItem('cita-theme', theme); }, theme);
  const result = () => ({ id: 7, clienteId: 1, folio: 'M-MANUAL-QA', origen: 'manual', estado: control.estado, version: control.version, personalId: 1, sucursalId: 1, servicioId: 1, inicioUtc: '2030-12-20T15:00:00Z', finUtc: '2030-12-20T15:30:00Z', finOcupacionUtc: '2030-12-20T15:35:00Z', zonaHoraria: 'America/Chihuahua', costoAceptado: '200.00', nombreContacto: 'Paciente QA', telefonoContacto: '6145550101', nombreServicio: 'Consulta', nombreProfesional: 'Profesional QA', nombreSucursal: 'Sucursal QA', motivoConsulta: 'Notas QA' });
  await page.route((url) => url.port === '3000', async (route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (req.method() !== 'GET') control.writes.push({ path, method: req.method(), body: req.postDataJSON() });
    let data;
    if (path === '/auth/profile') data = { user: { sub: 1, negocioId: 1, rol: role, nombre: 'Personal QA', negocioNombre: 'Negocio QA' } };
    else if (path === '/citas') data = { desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta'), citas: [{ ...result(), fechaLocal: url.searchParams.get('desde'), fechaFinLocal: url.searchParams.get('desde'), horaInicio: '09:00:00', horaFin: '09:30:00', causas: [] }] };
    else if (path === '/citas/7') data = { ...result(), fechaLocal: '2030-12-20', fechaFinLocal: '2030-12-20', horaInicio: '09:00:00', horaFin: '09:30:00', causas: [] };
    else if (path === '/citas/7/historial') data = { pagina: 1, limite: 50, hayMas: false, eventos: [] };
    else if (path === '/citas/7/estado') {
      if (control.conflict || req.postDataJSON().version !== control.version) { await route.fulfill({ status: 409, json: { message: 'Conflicto' } }); return; }
      control.estado = req.postDataJSON().estado; control.version++; data = { id: 7, folio: 'M-MANUAL-QA', estado: control.estado, version: control.version };
    } else if (path === '/clientes') data = { pagina: Number(url.searchParams.get('pagina') || 1), limite: 50, hayMas: false, clientes: [{ id: 1, nombreCompleto: 'Ana QA', telefono: '6145550101' }, { id: 2, nombreCompleto: 'Otra persona QA', telefono: '6145550101' }] };
    else if (path === '/disponibilidad') {
      if (control.availabilityError) { await route.fulfill({ status: 503, json: { message: 'Fallo de disponibilidad' } }); return; }
      data = { personalId: 1, sucursalId: 1, servicioId: 1, desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta'), modalidad: 'manual', zonaHoraria: 'America/Chihuahua', ranuras: [{ inicioUtc: `${url.searchParams.get('desde')}T15:00:00Z`, finUtc: `${url.searchParams.get('desde')}T15:30:00Z` }], omisiones: [] };
    } else if (path === '/citas/manuales/intentos') {
      if (control.preparationLost) { await route.abort('failed'); return; }
      data = { clave: req.postDataJSON().clave, estado: 'preparado' };
    } else if (path.endsWith('/registrar')) {
      control.registered = true;
      if (control.lost) { await route.abort('failed'); return; }
      data = result();
    } else if (path.endsWith('/resolver')) {
      if (control.resolveError) { await route.fulfill({ status: 503, json: { message: 'Temporal' } }); return; }
      data = control.registered ? { estado: 'registrado', resultado: result() } : { estado: 'no_registrado' };
    } else if (path === '/servicios' || path.endsWith('/servicios')) data = [{ id: 1, nombre: 'Consulta', costo: '200.00', duracionMinutos: 30, activo: true, seleccionado: true }];
    else if (path === '/sucursales') data = [{ id: 1, nombre: 'Sucursal QA', activo: true, zonaHoraria: 'America/Chihuahua' }];
    else if (path === '/profesionales') data = [{ id: 1, nombre: 'Profesional QA', correo: 'qa@example.test', activo: true }];
    else if (path.endsWith('/sucursales')) data = [1];
    else if (path.endsWith('/oferta')) data = { cuentaActiva: true, sucursales: [] };
    else if (path.endsWith('/cupo')) data = { limite: 5, activos: 1, disponibles: 4, limiteSucursalesActivas: 5, sucursalesActivas: 1 };
    else data = [];
    await route.fulfill({ json: data });
  });
  return control;
}
async function fillManual(page, role = 'recepcionista') {
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  const dialog = page.getByRole('dialog');
  if (role === 'recepcionista') for (const name of ['servicioId', 'sucursalId', 'personalId']) await dialog.locator(`[name="${name}"]`).fill('1');
  else for (const name of ['servicioId', 'sucursalId', 'personalId']) await dialog.locator(`[name="${name}"]`).selectOption('1');
  await dialog.getByLabel('Fecha', { exact: true }).fill('2030-12-20');
  await dialog.getByRole('button', { name: 'Consultar horarios' }).click();
  await expect(dialog.locator('[name="horario"] option')).toHaveCount(2);
  await dialog.locator('[name="horario"]').selectOption('0');
  await dialog.getByLabel('Nombre completo', { exact: true }).fill('Paciente QA');
  await dialog.getByLabel('Teléfono', { exact: true }).fill('6145550101');
  await dialog.getByLabel('Notas de consulta').fill('Notas QA');
  return dialog;
}
test('T093/T094: existente por ID, teléfono compartido sin fusión, selección del motor y alta real', async ({ page }) => {
  const api = await fixture(page);
  await page.goto('/admin/agenda');
  const dialog = await fillManual(page);
  await dialog.getByLabel('Cliente existente', { exact: true }).check();
  await dialog.getByLabel('Buscar cliente').fill('QA');
  await dialog.getByRole('button', { name: 'Buscar clientes', exact: true }).click();
  await expect(dialog.getByText('Otra persona QA')).toBeVisible();
  await dialog.locator('[name="clienteId"][value="2"]').check();
  await dialog.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(dialog).toContainText('M-MANUAL-QA');
  const sent = api.writes.find((row) => row.path.endsWith('/registrar')).body;
  expect(sent.clienteId).toBe(2); expect(sent.clienteNuevo).toBeUndefined();
  expect(Object.keys(sent).sort()).toEqual(['clienteId', 'sucursalId', 'personalId', 'servicioId', 'fechaLocal', 'horaInicio', 'notas'].sort());
});
test('T094: fallo de disponibilidad retira horarios anteriores y bloquea registro', async ({ page }) => {
  const api = await fixture(page); await page.goto('/admin/agenda');
  const dialog = await fillManual(page);
  api.availabilityError = true;
  await dialog.getByLabel('Fecha', { exact: true }).fill('2030-12-21');
  await dialog.getByRole('button', { name: 'Consultar horarios' }).click();
  await expect(dialog.locator('[data-manual-error]')).toContainText('disponibilidad');
  await expect(dialog.getByRole('button', { name: 'Confirmar cita', exact: true })).toBeDisabled();
  expect(api.writes).toEqual([]);
});
test('T095: doble clic, respuesta perdida, 503 del resolutor y recarga recuperan el mismo folio', async ({ page }) => {
  const api = await fixture(page); api.lost = true;
  await page.goto('/admin/agenda'); const dialog = await fillManual(page);
  await dialog.getByRole('button', { name: 'Confirmar cita', exact: true }).dblclick();
  await expect(dialog).toContainText('pendiente de comprobar');
  const registered = api.writes.filter((row) => row.path.endsWith('/registrar'));
  expect(registered).toHaveLength(1);
  api.resolveError = true;
  await dialog.getByRole('button', { name: 'Comprobar resultado', exact: true }).click();
  await expect(dialog).toContainText('pendiente de comprobar');
  await page.reload(); api.resolveError = false;
  await page.getByRole('button', { name: 'Comprobar envío pendiente', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('M-MANUAL-QA');
  const resolved = api.writes.filter((row) => row.path.endsWith('/resolver')).at(-1);
  expect(resolved.body).toEqual(registered[0].body);
  expect(resolved.path.replace('/resolver', '/registrar')).toBe(registered[0].path);
  expect(api.writes.filter((row) => row.path.endsWith('/registrar'))).toHaveLength(1);
});
test('T095: pérdida en preparación y ausencia terminal permiten corregir sin registrar', async ({ page }) => {
  const api = await fixture(page); api.preparationLost = true;
  await page.goto('/admin/agenda'); const dialog = await fillManual(page);
  await dialog.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(dialog).toContainText('pendiente de comprobar');
  await dialog.getByRole('button', { name: 'Comprobar resultado', exact: true }).click();
  await expect(dialog).toContainText('No se registró la cita');
  await dialog.getByRole('button', { name: 'Corregir datos', exact: true }).click();
  await expect(dialog.getByLabel('Nombre completo', { exact: true })).toHaveValue('Paciente QA');
  expect(api.writes.filter((row) => row.path.endsWith('/registrar'))).toHaveLength(0);
});
test('T096: motivo y versión observada; 409 conserva borrador sin sobrescribir', async ({ page }) => {
  const api = await fixture(page); await page.goto('/admin/agenda');
  await page.locator('[data-m4-appointment="7"]').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Estado de la cita').selectOption('cancelada');
  await dialog.getByLabel('Motivo del cambio').fill('Solicitud de paciente');
  api.conflict = true;
  await dialog.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  await expect(dialog.locator('[data-state-error]')).toContainText('conflicto');
  await expect(dialog.getByLabel('Motivo del cambio')).toHaveValue('Solicitud de paciente');
  await expect(dialog.getByRole('button', { name: 'Guardar estado', exact: true })).toBeDisabled();
  expect(api.writes).toHaveLength(1); expect(api.writes[0].body).toEqual({ estado: 'cancelada', version: 1, motivo: 'Solicitud de paciente' });
  api.conflict = false;
  await dialog.getByRole('button', { name: 'Actualizar detalle', exact: true }).click();
  await dialog.getByLabel('Estado de la cita').selectOption('cancelada');
  await dialog.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  await expect(dialog.getByLabel('Estado de la cita')).toHaveValue('cancelada');
  expect(api.version).toBe(2);
});
test('T093/T096: Profesional conserva consulta y no recibe formularios de escritura', async ({ page }) => {
  const api = await fixture(page, 'profesional'); await page.goto('/admin/agenda');
  await expect(page.getByRole('button', { name: 'Nueva cita', exact: true })).toHaveCount(0);
  await page.locator('[data-m4-appointment="7"]').click();
  await expect(page.getByRole('dialog')).toContainText('M-MANUAL-QA');
  await expect(page.getByLabel('Estado de la cita')).toHaveCount(0);
  expect(api.writes).toEqual([]);
});
test('T093: demo refleja la selección de ficha y conserva la simulación explícita', async ({ page }) => {
  await page.goto('/admin/agenda?demo=1');
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tipo de cliente').selectOption('existente');
  await expect(dialog.getByLabel('Cliente existente', { exact: true })).toBeVisible();
  await expect(dialog).toContainText('ficticios');
  await expect(dialog).toContainText('versión conectada');
});
for (const width of [1366, 390]) for (const theme of ['light', 'dark']) {
  test(`T093–T096: formulario y estado ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await fixture(page, 'admin_negocio', theme); await page.goto('/admin/agenda');
    const dialog = await fillManual(page, 'admin_negocio');
    const confirm = dialog.getByRole('button', { name: 'Confirmar cita', exact: true });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    // Capturar el estado estable, después de las transiciones de tema y habilitación del botón.
    await expect.poll(() => confirm.evaluate((button) => {
      const channels = getComputedStyle(button).backgroundColor.match(/[\d.]+/g).map(Number);
      return channels[0] > channels[2];
    })).toBe(true);
    await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).backgroundColor)).toMatch(/^rgb\(/);
    await page.screenshot({ path: `test-results/m4/manual-${width}-${theme}.png` });
    await dialog.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
    await expect(dialog).toContainText('M-MANUAL-QA');
    await dialog.getByRole('button', { name: 'Volver a la agenda', exact: true }).click();
    await page.locator('[data-m4-appointment="7"]').click();
    await expect(page.getByLabel('Estado de la cita')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar estado', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Guardar estado', exact: true })).toBeInViewport();
    await expect.poll(() => page.getByRole('dialog').evaluate((element) => getComputedStyle(element).backgroundColor)).toMatch(/^rgb\(/);
    await page.screenshot({ path: `test-results/m4/estado-${width}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
