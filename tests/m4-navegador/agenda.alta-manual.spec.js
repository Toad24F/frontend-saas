import { test, expect } from '@playwright/test';

// API simulada con contratos leídos del backend; ninguna escritura llega a Nest o MariaDB.
async function datosPrueba(pagina, rol = 'recepcionista', tema = 'light') {
  const control = { escrituras: [], respuestaPerdida: false, preparacionPerdida: false, errorDisponibilidad: false, errorResolucion: false, conflicto: false, registrada: false, version: 1, estado: 'confirmada' };
  await pagina.addInitScript((tema) => { sessionStorage.setItem('cita-session', 'm4-manual-test'); localStorage.setItem('cita-theme', tema); }, tema);
  const resultado = () => ({ id: 7, clienteId: 1, folio: 'M-MANUAL-QA', origen: 'manual', estado: control.estado, version: control.version, personalId: 1, sucursalId: 1, servicioId: 1, inicioUtc: '2030-12-20T15:00:00Z', finUtc: '2030-12-20T15:30:00Z', finOcupacionUtc: '2030-12-20T15:35:00Z', zonaHoraria: 'America/Chihuahua', costoAceptado: '200.00', nombreContacto: 'Paciente QA', telefonoContacto: '6145550101', nombreServicio: 'Consulta', nombreProfesional: 'Profesional QA', nombreSucursal: 'Sucursal QA', motivoConsulta: 'Notas QA' });
  await pagina.route((url) => url.port === '3000', async (rutaInterceptada) => {
    const peticion = rutaInterceptada.request(), url = new URL(peticion.url()), ruta = url.pathname;
    if (peticion.method() !== 'GET') control.escrituras.push({ ruta, metodo: peticion.method(), cuerpo: peticion.postDataJSON() });
    let datos;
    if (ruta === '/auth/profile') datos = { user: { sub: 1, negocioId: 1, rol: rol, nombre: 'Personal QA', negocioNombre: 'Negocio QA' } };
    else if (ruta === '/citas') datos = { desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta'), citas: [{ ...resultado(), fechaLocal: url.searchParams.get('desde'), fechaFinLocal: url.searchParams.get('desde'), horaInicio: '09:00:00', horaFin: '09:30:00', causas: [] }] };
    else if (ruta === '/citas/7') datos = { ...resultado(), fechaLocal: '2030-12-20', fechaFinLocal: '2030-12-20', horaInicio: '09:00:00', horaFin: '09:30:00', causas: [] };
    else if (ruta === '/citas/7/historial') datos = { pagina: 1, limite: 50, hayMas: false, eventos: [] };
    else if (ruta === '/citas/7/estado') {
      if (control.conflicto || peticion.postDataJSON().version !== control.version) { await rutaInterceptada.fulfill({ status: 409, json: { message: 'Conflicto' } }); return; }
      control.estado = peticion.postDataJSON().estado; control.version++; datos = { id: 7, folio: 'M-MANUAL-QA', estado: control.estado, version: control.version };
    } else if (ruta === '/clientes') datos = { pagina: Number(url.searchParams.get('pagina') || 1), limite: 50, hayMas: false, clientes: [{ id: 1, nombreCompleto: 'Ana QA', telefono: '6145550101' }, { id: 2, nombreCompleto: 'Otra persona QA', telefono: '6145550101' }] };
    else if (ruta === '/disponibilidad') {
      if (control.errorDisponibilidad) { await rutaInterceptada.fulfill({ status: 503, json: { message: 'Fallo de disponibilidad' } }); return; }
      datos = { personalId: 1, sucursalId: 1, servicioId: 1, desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta'), modalidad: 'manual', zonaHoraria: 'America/Chihuahua', ranuras: [{ inicioUtc: `${url.searchParams.get('desde')}T15:00:00Z`, finUtc: `${url.searchParams.get('desde')}T15:30:00Z` }], omisiones: [] };
    } else if (ruta === '/citas/manuales/intentos') {
      if (control.preparacionPerdida) { await rutaInterceptada.abort('failed'); return; }
      datos = { clave: peticion.postDataJSON().clave, estado: 'preparado' };
    } else if (ruta.endsWith('/registrar')) {
      control.registrada = true;
      if (control.respuestaPerdida) { await rutaInterceptada.abort('failed'); return; }
      datos = resultado();
    } else if (ruta.endsWith('/resolver')) {
      if (control.errorResolucion) { await rutaInterceptada.fulfill({ status: 503, json: { message: 'Temporal' } }); return; }
      datos = control.registrada ? { estado: 'registrado', resultado: resultado() } : { estado: 'no_registrado' };
    } else if (ruta === '/servicios' || ruta.endsWith('/servicios')) datos = [{ id: 1, nombre: 'Consulta', costo: '200.00', duracionMinutos: 30, activo: true, seleccionado: true }];
    else if (ruta === '/sucursales') datos = [{ id: 1, nombre: 'Sucursal QA', activo: true, zonaHoraria: 'America/Chihuahua' }];
    else if (ruta === '/profesionales') datos = [{ id: 1, nombre: 'Profesional QA', correo: 'qa@example.test', activo: true }];
    else if (ruta.endsWith('/sucursales')) datos = [1];
    else if (ruta.endsWith('/oferta')) datos = { cuentaActiva: true, sucursales: [{ id: 1, nombre: 'Sucursal QA', atencionActiva: true, sucursalActiva: true }] };
    else if (ruta.endsWith('/cupo')) datos = { limite: 5, activos: 1, disponibles: 4, limiteSucursalesActivas: 5, sucursalesActivas: 1 };
    else datos = [];
    await rutaInterceptada.fulfill({ json: datos });
  });
  return control;
}
async function completarManual(pagina, rol = 'recepcionista') {
  await pagina.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  const dialogo = pagina.getByRole('dialog');
  if (rol === 'recepcionista') for (const nombre of ['servicioId', 'sucursalId', 'personalId']) await dialogo.locator(`[name="${nombre}"]`).fill('1');
  else for (const nombrePrueba of ['servicioId', 'sucursalId', 'personalId']) await dialogo.locator(`[name="${nombrePrueba}"]`).selectOption('1');
  await dialogo.getByLabel('Fecha', { exact: true }).fill('2030-12-20');
  await dialogo.getByRole('button', { name: 'Consultar horarios' }).click();
  await expect(dialogo.locator('[name="horario"] option')).toHaveCount(2);
  await dialogo.locator('[name="horario"]').selectOption('0');
  await dialogo.getByLabel('Nombre completo', { exact: true }).fill('Paciente QA');
  await dialogo.getByLabel('Teléfono', { exact: true }).fill('6145550101');
  await dialogo.getByLabel('Notas de consulta').fill('Notas QA');
  return dialogo;
}
test('T093/T094: existente por ID, teléfono compartido sin fusión, selección del motor y alta real', async ({ page: pagina }) => {
  const api = await datosPrueba(pagina);
  await pagina.goto('/admin/agenda');
  const dialogo = await completarManual(pagina);
  await dialogo.getByLabel('Cliente existente', { exact: true }).check();
  await dialogo.getByLabel('Buscar cliente').fill('QA');
  await dialogo.getByRole('button', { name: 'Buscar clientes', exact: true }).click();
  await expect(dialogo.getByText('Otra persona QA')).toBeVisible();
  await dialogo.locator('[name="clienteId"][value="2"]').check();
  await dialogo.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(dialogo).toContainText('M-MANUAL-QA');
  const enviado = api.escrituras.find((fila) => fila.ruta.endsWith('/registrar')).cuerpo;
  expect(enviado.clienteId).toBe(2); expect(enviado.clienteNuevo).toBeUndefined();
  expect(Object.keys(enviado).sort()).toEqual(['clienteId', 'sucursalId', 'personalId', 'servicioId', 'fechaLocal', 'horaInicio', 'notas'].sort());
});
test('T094: fallo de disponibilidad retira horarios anteriores y bloquea registro', async ({ page: pagina }) => {
  const api = await datosPrueba(pagina); await pagina.goto('/admin/agenda');
  const dialogo = await completarManual(pagina);
  api.errorDisponibilidad = true;
  await dialogo.getByLabel('Fecha', { exact: true }).fill('2030-12-21');
  await dialogo.getByRole('button', { name: 'Consultar horarios' }).click();
  await expect(dialogo.locator('[data-manual-error]')).toContainText('disponibilidad');
  await expect(dialogo.getByRole('button', { name: 'Confirmar cita', exact: true })).toBeDisabled();
  expect(api.escrituras).toEqual([]);
});
test('T095: doble clic, respuesta perdida, 503 del resolutor y recarga recuperan el mismo folio', async ({ page: pagina }) => {
  const api = await datosPrueba(pagina); api.respuestaPerdida = true;
  await pagina.goto('/admin/agenda'); const dialogo = await completarManual(pagina);
  await dialogo.getByRole('button', { name: 'Confirmar cita', exact: true }).dblclick();
  await expect(dialogo).toContainText('pendiente de comprobar');
  const registrado = api.escrituras.filter((fila) => fila.ruta.endsWith('/registrar'));
  expect(registrado).toHaveLength(1);
  api.errorResolucion = true;
  await dialogo.getByRole('button', { name: 'Comprobar resultado', exact: true }).click();
  await expect(dialogo).toContainText('pendiente de comprobar');
  await pagina.reload(); api.errorResolucion = false;
  await pagina.getByRole('button', { name: 'Comprobar envío pendiente', exact: true }).click();
  await expect(pagina.getByRole('dialog')).toContainText('M-MANUAL-QA');
  const resuelto = api.escrituras.filter((fila) => fila.ruta.endsWith('/resolver')).at(-1);
  expect(resuelto.cuerpo).toEqual(registrado[0].cuerpo);
  expect(resuelto.ruta.replace('/resolver', '/registrar')).toBe(registrado[0].ruta);
  expect(api.escrituras.filter((fila) => fila.ruta.endsWith('/registrar'))).toHaveLength(1);
});
test('T095: pérdida en preparación y ausencia terminal permiten corregir sin registrar', async ({ page: pagina }) => {
  const api = await datosPrueba(pagina); api.preparacionPerdida = true;
  await pagina.goto('/admin/agenda'); const dialogo = await completarManual(pagina);
  await dialogo.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(dialogo).toContainText('pendiente de comprobar');
  await dialogo.getByRole('button', { name: 'Comprobar resultado', exact: true }).click();
  await expect(dialogo).toContainText('No se registró la cita');
  await dialogo.getByRole('button', { name: 'Corregir datos', exact: true }).click();
  await expect(dialogo.getByLabel('Nombre completo', { exact: true })).toHaveValue('Paciente QA');
  expect(api.escrituras.filter((fila) => fila.ruta.endsWith('/registrar'))).toHaveLength(0);
});
test('T096: motivo y versión observada; 409 conserva borrador sin sobrescribir', async ({ page: pagina }) => {
  const api = await datosPrueba(pagina); await pagina.goto('/admin/agenda');
  await pagina.locator('[data-agenda-cita="7"]').click();
  const dialogo = pagina.locator('#dialogo-app');
  await dialogo.getByLabel('Estado de la cita').selectOption('cancelada');
  await dialogo.getByLabel('Motivo del cambio').fill('Solicitud de paciente');
  api.conflicto = true;
  await dialogo.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  await pagina.getByRole('dialog', { name: '¿Cancelar esta cita?' }).getByRole('button', { name: 'Sí, cancelar cita' }).click();
  await expect(dialogo.locator('[data-estado-error]')).toContainText('conflicto');
  await expect(dialogo.getByLabel('Motivo del cambio')).toHaveValue('Solicitud de paciente');
  await expect(dialogo.getByRole('button', { name: 'Guardar estado', exact: true })).toBeDisabled();
  expect(api.escrituras).toHaveLength(1); expect(api.escrituras[0].cuerpo).toEqual({ estado: 'cancelada', version: 1, motivo: 'Solicitud de paciente' });
  api.conflicto = false;
  await dialogo.getByRole('button', { name: 'Actualizar detalle', exact: true }).click();
  await dialogo.getByLabel('Estado de la cita').selectOption('cancelada');
  await dialogo.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  await pagina.getByRole('dialog', { name: '¿Cancelar esta cita?' }).getByRole('button', { name: 'Sí, cancelar cita' }).click();
  await expect(dialogo.getByLabel('Estado de la cita')).toHaveValue('cancelada');
  await expect.poll(() => api.version).toBe(2);
});
test('T093/T096: Profesional conserva consulta y no recibe formularios de escritura', async ({ page: pagina }) => {
  const api = await datosPrueba(pagina, 'profesional'); await pagina.goto('/admin/agenda');
  await expect(pagina.getByRole('button', { name: 'Nueva cita', exact: true })).toHaveCount(0);
  await pagina.locator('[data-agenda-cita="7"]').click();
  await expect(pagina.getByRole('dialog')).toContainText('M-MANUAL-QA');
  await expect(pagina.getByLabel('Estado de la cita')).toHaveCount(0);
  expect(api.escrituras).toEqual([]);
});
test('T093: demo refleja la selección de ficha y conserva la simulación explícita', async ({ page: pagina }) => {
  await pagina.goto('/admin/agenda?demo=1');
  await pagina.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  const dialogo = pagina.getByRole('dialog');
  await dialogo.getByLabel('Tipo de cliente').selectOption('existente');
  await expect(dialogo.getByLabel('Cliente existente', { exact: true })).toBeVisible();
  await expect(dialogo).toContainText('ficticios');
  await expect(dialogo).toContainText('versión conectada');
});
for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`T093–T096: formulario y estado ${ancho}px ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const errores = []; pagina.on('pageerror', (error) => errores.push(error.message));
    await datosPrueba(pagina, 'admin_negocio', tema); await pagina.goto('/admin/agenda');
    const dialogo = await completarManual(pagina, 'admin_negocio');
    const confirmar = dialogo.getByRole('button', { name: 'Confirmar cita', exact: true });
    await confirmar.scrollIntoViewIfNeeded();
    await expect(confirmar).toBeInViewport();
    // Capturar el estado estable, después de las transiciones de tema y habilitación del botón.
    await expect.poll(() => confirmar.evaluate((boton) => {
      const canales = getComputedStyle(boton).backgroundColor.match(/[\d.]+/g).map(Number);
      return canales[0] > canales[2];
    })).toBe(true);
    await expect.poll(() => dialogo.evaluate((elemento) => getComputedStyle(elemento).backgroundColor)).toMatch(/^rgb\(/);
    await pagina.screenshot({ path: `test-results/m4/manual-${ancho}-${tema}.png` });
    await dialogo.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
    await expect(dialogo).toContainText('M-MANUAL-QA');
    await dialogo.getByRole('button', { name: 'Volver a la agenda', exact: true }).click();
    await pagina.locator('[data-agenda-cita="7"]').click();
    await expect(pagina.getByLabel('Estado de la cita')).toBeVisible();
    await pagina.getByRole('button', { name: 'Guardar estado', exact: true }).scrollIntoViewIfNeeded();
    await expect(pagina.getByRole('button', { name: 'Guardar estado', exact: true })).toBeInViewport();
    await expect.poll(() => pagina.getByRole('dialog').evaluate((elemento) => getComputedStyle(elemento).backgroundColor)).toMatch(/^rgb\(/);
    await pagina.screenshot({ path: `test-results/m4/estado-${ancho}-${tema}.png` });
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errores).toEqual([]);
  });
}
