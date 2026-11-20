import { test, expect } from '@playwright/test';

import { prepararSesion } from './agenda.respuestas-simuladas.js';

test('T088: navegación y rutas directas por los cuatro roles', async ({ page: pagina }) => {
  for (const rol of ['admin_negocio', 'recepcionista', 'profesional', 'superadmin']) {
    await pagina.unrouteAll({ behavior: 'wait' });
    const { solicitudesObservadas: observado, errores } = await prepararSesion(pagina, rol);
    await pagina.goto('/admin/agenda');
    if (rol === 'superadmin') {
      await expect(pagina).toHaveURL(/\/admin\/plataforma/);
      expect(observado).not.toContain('GET /citas');
    } else {
      await expect(pagina.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
      await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
      await expect(pagina.locator('.barra-lateral [data-nav="clientes"]')).toHaveCount(rol === 'profesional' ? 0 : 1);
      await pagina.goto('/admin/clientes');
      if (rol === 'profesional') await expect(pagina).toHaveURL(/\/admin\/agenda/);
      else await expect(pagina.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
      // Desde T098 la ruta consulta clientes solo para Administración y Recepción.
      expect(observado.some((entrada) => /\/clientes/.test(entrada))).toBe(rol !== 'profesional');
    }
    expect(errores).toEqual([]);
  }
});
test('T090–T092: vistas, filtros locales, error de refresco, detalle e historial', async ({ page: pagina }) => {
  const { solicitudesObservadas: observado, errores } = await prepararSesion(pagina);
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  for (const vista of ['month', 'day', 'week']) {
    await pagina.locator(`[data-agenda-vista="${vista}"]`).click();
    await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
    if (vista === 'month') await expect(pagina.locator('[data-agenda-fecha]')).toHaveCount(42);
  }
  await pagina.getByLabel('Buscar paciente').fill('vacío');
  await expect(pagina.getByText('Sin citas en este periodo')).toBeVisible();
  await expect(pagina.getByLabel('Buscar paciente')).toBeFocused();
  await pagina.getByLabel('Buscar paciente').fill('');
  await pagina.getByLabel('Buscar paciente').press('Enter');
  let fallo = null;
  await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
    if (!fallo) { await rutaInterceptada.fallback(); return; }
    await rutaInterceptada.fulfill({ status: fallo, json: { message: fallo === 400 ? 'La consulta supera 1.000 citas. Acota el periodo o los filtros.' : 'Temporal' } });
  });
  fallo = 503;
  await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(pagina.locator('[data-aviso-en-vivo]')).toBeVisible();
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  fallo = 400;
  await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(pagina.locator('[data-agenda-error]')).toBeVisible();
  await expect(pagina.locator('.agenda-resumen')).toContainText('Resumen no disponible');
  fallo = null;
  await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click();
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  const lecturas = observado.filter((x) => x === 'GET /citas').length;
  await pagina.getByLabel('Sucursal', { exact: true }).selectOption('1');
  await pagina.getByLabel('Profesional', { exact: true }).selectOption('1');
  await pagina.getByLabel('Estado', { exact: true }).selectOption('confirmada');
  expect(observado.filter((x) => x === 'GET /citas').length).toBe(lecturas);
  await pagina.locator('[data-agenda-cita="7"]').click();
  const dialogo = pagina.getByRole('dialog');
  for (const texto of ['6145550101', '2026-11-12', 'America/Tijuana', 'Nota <segura>', 'Sin registro histórico', '9007199254740993']) await expect(dialogo).toContainText(texto);
  await dialogo.getByRole('button', { name: 'Siguiente página' }).click();
  await expect(dialogo).toContainText('9007199254740994');
  await dialogo.getByRole('button', { name: 'Página anterior' }).click();
  await expect(dialogo).toContainText('9007199254740993');
  await pagina.keyboard.press('Escape');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeFocused();
  expect(observado.every((entrada) => entrada.startsWith('GET '))).toBe(true);
  expect(errores).toEqual([]);
});
test('T091: filtro local conserva borrador y foco ante un refresco remoto tardío', async ({ page: pagina }) => {
  await prepararSesion(pagina); await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  let liberar;
  const esperaRespuesta = new Promise((resolverPromesa) => { liberar = resolverPromesa; });
  await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
    const url = new URL(rutaInterceptada.request().url()); await esperaRespuesta;
    await rutaInterceptada.fulfill({ json: { desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta'), citas: [] } });
  });
  const pendiente = pagina.waitForRequest((solicitud) => new URL(solicitud.url()).pathname === '/citas');
  await pagina.getByRole('button', { name: 'Actualizar agenda', exact: true }).click(); await pendiente;
  await pagina.getByLabel('Buscar paciente').fill('Paciente');
  await pagina.getByLabel('Buscar paciente').press('Enter');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  const respuesta = pagina.waitForResponse((solicitud) => new URL(solicitud.url()).pathname === '/citas');
  liberar(); await respuesta;
  await pagina.evaluate(() => new Promise((resolverPromesa) => requestAnimationFrame(() => requestAnimationFrame(resolverPromesa))));
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  await expect(pagina.getByLabel('Buscar paciente')).toHaveValue('Paciente');
  await expect(pagina.getByLabel('Buscar paciente')).toBeFocused();
});
test('T092: fallo de historial conserva contacto, permite reintentar; detalle denegado no usa la demo', async ({ page: pagina }) => {
  await prepararSesion(pagina);
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  await pagina.route((url) => url.pathname === '/citas/7/historial', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 503, json: { message: 'Temporal' } }));
  await pagina.locator('[data-agenda-cita="7"]').click();
  const dialogo = pagina.getByRole('dialog');
  await expect(dialogo).toContainText('6145550101');
  await expect(dialogo.locator('[data-agenda-error]')).toBeVisible();
  await pagina.unroute((url) => url.pathname === '/citas/7/historial');
  // Un manejador posterior sustituye únicamente el fallo anterior, sin tocar la API real.
  await pagina.route((url) => url.pathname === '/citas/7/historial', (rutaInterceptada) => rutaInterceptada.fulfill({ json: { pagina: 1, limite: 50, hayMas: false, eventos: [] } }));
  await dialogo.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(dialogo).toContainText('Sin eventos registrados.');
  await pagina.keyboard.press('Escape');
  await pagina.route((url) => url.pathname === '/citas/7', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 404, json: { message: 'No encontrado' } }));
  await pagina.locator('[data-agenda-cita="7"]').click();
  await expect(dialogo).toContainText('no está disponible para tu cuenta');
  await expect(dialogo).not.toContainText('6145550101');
});
for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
  test(`T090/T092: revisión ${ancho}px ${tema}, conectado y demo`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const { errores } = await prepararSesion(pagina, 'recepcionista', tema);
    await pagina.goto('/admin/agenda');
    await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
    for (const vista of ['day', 'week', 'month']) {
      await pagina.locator(`[data-agenda-vista="${vista}"]`).click();
      await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
      if (vista !== 'month') await expect(pagina.locator('.calendario-semana .calendario-evento')).toHaveCount(1);
      expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await pagina.locator('[data-agenda-cita="7"]').click();
    await expect(pagina.getByRole('dialog')).toContainText('Nota <segura>');
    // El detalle largo debe aislar el texto del calendario y permitir llegar a su historial.
    // Esperar la transición vigente de tema; no medir un fotograma intermedio de la interpolación.
    await expect.poll(() => pagina.getByRole('dialog').evaluate((dialogo) => getComputedStyle(dialogo).backgroundColor)).toMatch(/^rgb\(/);
    await pagina.getByRole('dialog').getByRole('heading', { name: 'Historial de la cita' }).scrollIntoViewIfNeeded();
    await expect(pagina.getByRole('dialog').getByRole('button', { name: 'Siguiente página' })).toBeVisible();
    await pagina.screenshot({ path: `test-results/m4/detail-${ancho}-${tema}.png`, fullPage: true });
    await pagina.keyboard.press('Escape');
    await pagina.screenshot({ path: `test-results/m4/agenda-${ancho}-${tema}.png`, fullPage: true });
    await pagina.goto('/admin/agenda?demo=1');
    await expect(pagina.locator('[data-cita]').first()).toBeVisible();
    // El diseño existente oculta esta nota en móvil; se comprueba su presencia y el modo explícito.
    await expect(pagina.getByText('Datos ficticios', { exact: true })).toHaveCount(1);
    await expect(pagina.locator('html')).toHaveAttribute('data-app-mode', 'demo');
    await pagina.screenshot({ path: `test-results/m4/demo-${ancho}-${tema}.png`, fullPage: true });
    expect(errores).toEqual([]);
  });
}

// La demo es la referencia viva: mismos datos y fecha para comparar geometría y estilos, no solo capturas aisladas.
test('paridad con demo: métricas, filtros, cuadrícula y tarjetas en ambos temas y tamaños', async ({ page: pagina, context: contexto }) => {
  await pagina.goto('/admin/agenda?demo=1');
  await expect(pagina.locator('[data-cita]').first()).toBeVisible();
  const demo = await pagina.evaluate(async () => (await import('/src/shared/aplicacion.datos.js')).datosAplicacion);
  const conectado = await contexto.newPage();
  await conectado.clock.setFixedTime(new Date('2026-09-08T18:00:00Z'));
  await prepararSesion(conectado);
  await conectado.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
    const consulta = new URL(rutaInterceptada.request().url()).searchParams;
    const desde = consulta.get('desde'), hasta = consulta.get('hasta');
    const citas = demo.appointments.filter((elemento) => elemento.tenantId === 1 && elemento.date >= desde && elemento.date <= hasta).map((elemento) => ({
      id: elemento.id, version: 1, estado: elemento.status, origen: elemento.origin, fechaLocal: elemento.date, fechaFinLocal: elemento.date,
      horaInicio: `${elemento.start}:00`, horaFin: `${elemento.end}:00`, sucursalId: elemento.branchId, personalId: elemento.professionalId,
      nombreContacto: demo.clients.find((fila) => fila.id === elemento.clientId).name,
      nombreServicio: demo.services.find((fila) => fila.id === elemento.serviceId).name,
      nombreProfesional: demo.professionals.find((fila) => fila.id === elemento.professionalId).name,
      zonaHoraria: 'America/Chihuahua', causas: [],
    }));
    await rutaInterceptada.fulfill({ json: { desde, hasta, citas } });
  });
  // Solo estilos estructurales que deben coincidir; contacto, permisos y controles de escritura difieren por contrato.
  const propiedades = ['fontFamily', 'fontSize', 'fontWeight', 'padding', 'borderRadius', 'backgroundColor', 'color', 'gridTemplateColumns'];
  const inspeccionar = (destino, selector) => destino.locator(selector).first().evaluate((elemento, propiedades) => {
    const estilo = getComputedStyle(elemento);
    return Object.fromEntries(propiedades.map((clave) => [clave, estilo[clave]]));
  }, propiedades);
  for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
    for (const destino of [pagina, conectado]) {
      await destino.setViewportSize({ width: ancho, height: 900 });
      // Cada combinación compara una primera visita, sin heredar la vista del caso anterior.
      await destino.addInitScript((tema) => {
        localStorage.setItem('cita-theme', tema);
        localStorage.removeItem('cita-agenda-view:connected');
        localStorage.removeItem('cita-agenda-view:demo');
      }, tema);
    }
    await pagina.goto('/admin/agenda?demo=1'); await conectado.goto('/admin/agenda');
    await expect(conectado.locator('[data-agenda-cita]').first()).toBeVisible();
    await expect(pagina.locator('[data-cita]').first()).toBeVisible();
    await conectado.getByLabel('Sucursal', { exact: true }).selectOption(await pagina.getByLabel('Sucursal', { exact: true }).inputValue());
    for (const selector of ['.encabezado-pagina h1', '.agenda-resumen', '.calendario-panel', '.calendario-barra', '.selector-filtro', '.selector-segmentado', '.semana-encabezado', '.calendario-evento.confirmada']) {
      await expect.poll(async () => JSON.stringify(await inspeccionar(conectado, selector))).toBe(JSON.stringify(await inspeccionar(pagina, selector)));
    }
    await expect(conectado.locator('.agenda-resumen strong')).toHaveText(await pagina.locator('.agenda-resumen strong').textContent());
    await expect(conectado.locator('.calendario-evento')).toHaveCount(await pagina.locator('.calendario-evento').count());
    await conectado.screenshot({ path: `test-results/m4/paridad-conectado-${ancho}-${tema}.png`, fullPage: true });
    await pagina.screenshot({ path: `test-results/m4/paridad-demo-${ancho}-${tema}.png`, fullPage: true });
    await pagina.locator('[data-agenda-vista-demo="month"]').click();
    await conectado.locator('[data-agenda-vista="month"]').click();
    await expect(conectado.locator('.mes-dia')).toHaveCount(42);
    for (const selector of ['.calendario-mes', '.mes-etiqueta', '.mes-dia', '.mes-evento.confirmada']) {
      await expect.poll(async () => JSON.stringify(await inspeccionar(conectado, selector))).toBe(JSON.stringify(await inspeccionar(pagina, selector)));
    }
    await conectado.locator('.mes-mas').first().click();
    await pagina.locator('.mes-mas').first().click();
    await expect(conectado.locator('.dia-unico .calendario-evento')).toHaveCount(await pagina.locator('.dia-unico .calendario-evento').count());
  }
  await conectado.close();
});
