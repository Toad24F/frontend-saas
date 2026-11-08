// Con Vite activo. Toda la API está interceptada; ninguna escritura llega al backend.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const services = [{ id: 1, nombre: 'Consulta', activo: true, duracionMinutos: 30, costo: 200, seleccionado: true }, { id: 2, nombre: 'Revisión', activo: true, duracionMinutos: 20, costo: 100, seleccionado: false }];
const branches = [1, 2].map((id) => ({ id, nombre: id === 1 ? 'Norte' : 'Sur', activo: true, direccion: 'Calle de prueba', zonaHoraria: 'America/Chihuahua', telefono: '6145550101' }));
const professionals = [1, 2].map((id) => ({ id, nombre: id === 1 ? 'María' : 'Ana', correo: `prof${id}@example.test`, activo: id === 1 }));
let assigned = [1];
let restored = false;
let role = 'admin_negocio';
const errors = [], writes = [];
const snapshot = (type) => ({ id: 300, nombre: `Retirado ${type}`, email: 'retirado@example.test', activo: false, inhabilitadoEn: '2026-11-01T12:00:00Z' });
await mkdir('test-results/admin-review', { recursive: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => sessionStorage.setItem('cita-session', 'qa-simulado'));
  await context.route((url) => /^\/(auth|profesionales|recepcionistas|servicios|sucursales|bloqueos|disponibilidad)(\/|$)/.test(url.pathname), async (route) => {
    const url = new URL(route.request().url()), path = url.pathname, method = route.request().method();
    if (method !== 'GET') {
      writes.push([method, path, route.request().postDataJSON()]);
      if (method === 'POST' && path === '/servicios/300/restaurar') { restored = true; await route.fulfill({ json: { id: 300, activo: false, inhabilitadoEn: null } }); return; }
      if (method === 'PUT' && path === '/profesionales/1/sucursales') { assigned = route.request().postDataJSON().sucursalIds; await route.fulfill({ json: assigned }); return; }
      throw Error(`Escritura inesperada ${method} ${path}`);
    }
    const type = path.split('/')[1];
    let data;
    if (path === '/auth/profile') data = { user: { sub: 1, rol: role, negocioId: 1, nombre: 'Administración QA', nombreNegocio: 'Negocio QA', identificadorPublico: 'negocio-qa' } };
    else if (path.endsWith('/inhabilitados/300')) data = snapshot(type);
    else if (path.endsWith('/inhabilitados')) data = restored && type === 'servicios' ? [] : [snapshot(type)];
    else if (path === '/servicios') data = services;
    else if (/^\/servicios\/\d+$/.test(path)) data = services.find((item) => item.id === Number(path.split('/')[2]));
    else if (/^\/sucursales\/\d+$/.test(path)) data = branches.find((item) => item.id === Number(path.split('/')[2]));
    else if (/^\/profesionales\/\d+$/.test(path)) data = professionals.find((item) => item.id === Number(path.split('/')[2]));
    else if (path === '/sucursales') data = branches;
    else if (path === '/sucursales/cupo') data = { limiteSucursalesActivas: 3, sucursalesActivas: 2, disponibles: 1 };
    else if (path === '/profesionales/cupo' || path === '/recepcionistas/cupo') data = { limite: 5, activos: 1, disponibles: 4 };
    else if (path === '/profesionales') data = professionals;
    else if (path === '/recepcionistas') data = [{ id: 10, nombre: 'Manuela', email: 'recepcion@example.test', activo: true, activadoEn: '2026-10-01T12:00:00Z' }];
    else if (path.endsWith('/sucursales')) data = assigned;
    else if (path.endsWith('/servicios')) data = services;
    else if (path.endsWith('/horario')) data = [{ id: 1, diaSemana: 1, sucursalId: 1, inicioMinutos: 540, finMinutos: 780, activo: false }];
    else if (path.endsWith('/oferta')) data = { cuentaActiva: true, sucursales: branches.map((b) => ({ id: b.id, nombre: b.nombre, sucursalActiva: true, atencionActiva: true, servicios: services.map((s) => ({ id: s.id, nombre: s.nombre, ofrecido: s.seleccionado, motivosExclusion: s.seleccionado ? [] : ['servicio_no_seleccionado'] })) })) };
    else if (path === '/bloqueos') data = [];
    else if (path === '/disponibilidad/configuracion') data = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 5, anticipacionMinutos: 60, diasFuturos: 20 };
    else if (path === '/disponibilidad/citas-afectadas') data = { desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta'), citas: [] };
    else throw Error(`Ruta inesperada ${path}`);
    await route.fulfill({ json: data });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const goto = async (path) => { await page.goto(`${origin}/admin/${path}`); await page.locator('.page-heading').waitFor(); };
  await goto('profesionales');
  await page.locator('.account-menu-trigger').click();
  const shape = (selector) => page.locator(selector).evaluate((el) => { const c = getComputedStyle(el); return [c.borderRadius, c.padding, c.minHeight]; });
  assert.deepEqual(await shape('#account-menu-panel a'), await shape('#account-menu-panel button'));
  await page.keyboard.press('Escape');
  const nav = await page.locator('.sidebar nav').innerText();
  assert.ok(nav.indexOf('Servicios') < nav.indexOf('Sucursales') && nav.indexOf('Sucursales') < nav.indexOf('Usuarios') && nav.indexOf('Usuarios') < nav.indexOf('Disponibilidad'));
  assert.equal(await page.locator('[data-users-menu]').getAttribute('aria-expanded'), 'true');
  for (const width of [1366, 1159, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => { localStorage.setItem('cita-theme', theme); document.documentElement.dataset.theme = theme; }, theme);
      for (const [screen, kind] of [['profesionales', 'professional'], ['recepcionistas', 'reception'], ['servicios', 'service'], ['sucursales', 'branch']]) {
        await goto(screen);
        const clear = page.locator('.professional-toolbar [data-' + kind + '-reset]');
        assert.equal(await clear.isDisabled(), true);
        await page.locator('#' + kind + '-search').fill('no coincide');
        assert.equal(await clear.isEnabled(), true);
        await clear.click();
        assert.equal(await clear.isDisabled(), true);
        assert.equal(await page.locator('main section[aria-label^="Inhabilitados"]').count(), 0);
        if (screen === 'sucursales') {
          assert.equal(await page.locator('.catalog-capacity .catalog-quota').count(), 1);
          assert.equal(await page.locator('.catalog-quota progress').evaluate((el) => getComputedStyle(el).height), '7px');
        }
        if (screen === 'recepcionistas') {
          const caution = page.locator('.reception-status-action.action-caution');
          assert.equal(await caution.evaluate((el) => getComputedStyle(el).backgroundColor), theme === 'dark' ? 'rgb(73, 56, 22)' : 'rgb(255, 240, 194)');
          await caution.hover();
          await expect(caution).toHaveCSS('background-color', theme === 'dark' ? 'rgb(96, 74, 28)' : 'rgb(255, 228, 154)');
        }
        const action = { profesionales: 'new-professional', recepcionistas: 'new-receptionist', servicios: 'new-service', sucursales: 'new-branch' }[screen];
        await page.locator('[data-action="' + action + '"]').first().click();
        await page.locator('.form-drawer[open]').waitFor();
        const rect = await page.locator('.form-drawer').boundingBox();
        assert.ok(Math.abs(rect.x + rect.width - width) < 2);
        assert.ok(Math.abs(rect.y) < 2 && Math.abs(rect.height - 900) < 2);
        const footerRect = await page.locator('.form-drawer #editor-form > .dialog-footer').boundingBox();
        assert.ok(footerRect.y + footerRect.height <= 901);
        await page.screenshot({ animations: 'disabled', path: `test-results/admin-review/${width}-${theme}-alta-${screen}.png` });
        await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.locator('.professional-more summary').first().click();
        const danger = page.locator('.professional-more-menu button.action-danger').first();
        assert.equal(await danger.evaluate((el) => getComputedStyle(el).color), theme === 'dark' ? 'rgb(255, 182, 190)' : 'rgb(165, 42, 50)');
        assert.equal(await danger.evaluate((el) => getComputedStyle(el).borderTopWidth), '0px');
        await danger.hover();
        assert.equal(await danger.evaluate((el) => getComputedStyle(el).backgroundColor), theme === 'dark' ? 'rgb(78, 43, 48)' : 'rgb(251, 227, 227)');
        await danger.click();
        assert.equal(await page.locator('.form-drawer[open]').count(), 0);
        await page.getByRole('dialog').locator('.action-danger[data-confirm]').waitFor();
        await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${theme}/${screen}`);
        await page.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/admin-review/${width}-${theme}-${screen}.png` });
      }
      await page.locator('[data-retired-open]').click();
      await page.locator('[data-retired-detail]').waitFor();
      await page.screenshot({ animations: 'disabled', path: `test-results/admin-review/${width}-${theme}-inhabilitados.png` });
      await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    }
  }
  await page.locator('.mobile-tabbar [data-action=menu]').click();
  await page.locator('[data-users-menu]').click();
  await page.locator('.sidebar [data-nav=recepcionistas]').click();
  assert.equal(await page.locator('[data-users-menu]').getAttribute('aria-expanded'), 'true');
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const [screen, edit] of [['profesionales', 'data-edit-professional'], ['servicios', 'data-edit-service'], ['sucursales', 'data-edit-branch']]) {
    await goto(screen);
    await page.locator('[' + edit + ']').first().click();
    await page.locator('.form-drawer[open]').waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
  await goto('recepcionistas');
  await page.locator('[data-action=new-receptionist]').click();
  await page.locator('#f-name').fill('Borrador de prueba');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  assert.equal(await page.locator('.form-drawer[open]').count(), 1);
  assert.equal(writes.length, 0);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.locator('[data-discard-confirm]:visible').waitFor();
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  assert.equal(await page.locator('#f-name').inputValue(), 'Borrador de prueba');
  await page.locator('.form-drawer [data-close]').click();
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await page.mouse.click(20, 100);
  await page.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
  await page.locator('.professional-more summary').click();
  await page.getByRole('button', { name: 'Restablecer contraseña', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await goto('servicios');
  await page.locator('[data-retired-open]').click();
  await page.locator('[data-retired-search]').fill('no coincide');
  await page.getByText('No hay coincidencias en los inhabilitados.', { exact: true }).waitFor();
  await page.locator('[data-retired-search]').fill('Retirado');
  await page.locator('[data-retired-detail]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Volver a inhabilitados' }).click();
  await page.locator('[data-retired-restore]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
  await page.getByText('Recurso restaurado como inactivo. Actívalo por separado cuando corresponda.', { exact: true }).waitFor();
  await goto('disponibilidad/equipo');
  const locked = page.locator('input[type=checkbox][name=branchIds][value="1"]');
  await locked.waitFor();
  assert.equal(await locked.isDisabled(), true);
  const values = await page.locator('#branch-assignments-form').evaluate((form) => new FormData(form).getAll('branchIds'));
  assert.deepEqual(values, ['1']);
  await page.locator('input[type=checkbox][name=branchIds][value="2"]').check();
  await page.getByRole('button', { name: 'Guardar asignaciones' }).click();
  await page.waitForFunction(() => document.querySelector('[data-assignment-summary]')?.textContent === 'Sin cambios pendientes');
  assert.deepEqual(assigned, [1, 2]);
  await page.getByRole('tab', { name: 'Oferta por sucursal' }).click();
  await page.locator('[data-offering-select]').waitFor();
  await page.locator('[data-offering-select]').selectOption('2');
  assert.equal(await page.locator('[data-offering-branch="2"]').isVisible(), true);
  assert.equal(await page.locator('[data-offering-branch="1"]').isVisible(), false);
  assert.equal(await page.locator('[data-availability-action=attention]:visible').getAttribute('class'), 'btn action-caution');
  await page.getByRole('tab', { name: 'Horario semanal' }).click();
  await page.locator('.app-toast').first().waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#schedule-form .section-form-footer .schedule-help').count(), 1);
  for (const width of [1366, 390, 320]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((theme) => { localStorage.setItem('cita-theme', theme); document.documentElement.dataset.theme = theme; }, theme);
    for (const [label, file] of [['Sucursales asignadas', 'asignaciones'], ['Oferta por sucursal', 'oferta'], ['Horario semanal', 'horario']]) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label);
      await page.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/admin-review/${width}-${theme}-${file}.png` });
    }
  }
  await page.getByRole('tab', { name: 'Bloqueos', exact: true }).click();
  for (const width of [1366, 390, 320]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((theme) => { localStorage.setItem('cita-theme', theme); document.documentElement.dataset.theme = theme; }, theme);
    await page.locator('[data-action=new-block]').click();
    await page.locator('.form-drawer[open]').waitFor();
    await page.screenshot({ animations: 'disabled', path: `test-results/admin-review/${width}-${theme}-alta-bloqueo.png` });
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
  await goto('disponibilidad/negocio');
  await page.locator('.configuration-rounding').waitFor();
  const configurationText = await page.locator('#agenda-configuration-form').innerText();
  for (const text of ['primer horario disponible de cada día', '10:02', '10:05', 'limpie o desinfecte', 'si son las 10:00', 'a partir de las 11:00', 'hasta 20 días en el futuro']) assert.ok(configurationText.includes(text), text);
  for (const width of [1366, 390, 320]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/admin-review/${width}-${theme}-reglas.png` });
  }
  await page.route('**/profesionales/cupo', (route) => route.fulfill({ status: 503, json: { message: 'Cupo no disponible' } }));
  await goto('profesionales');
  await page.getByText('Profesionales activos: cupo no disponible.', { exact: true }).waitFor();
  await page.unroute('**/profesionales/cupo');
  await page.setViewportSize({ width: 1366, height: 900 });
  await goto('profesionales');
  await page.locator('[data-professional-view=cards]').click();
  await page.locator('#professional-search').fill('María');
  await page.locator('.professional-toolbar [data-professional-reset]').click();
  assert.equal(await page.locator('[data-professional-view=cards]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-professional-view=list]').click();
  await page.route('**/servicios/inhabilitados', (route) => route.fulfill({ status: 503, json: { message: 'Lista no disponible' } }));
  await goto('servicios');
  await page.locator('[data-retired-open]').click();
  await page.getByRole('dialog').getByRole('alert').waitFor();
  await page.unroute('**/servicios/inhabilitados');
  await page.getByRole('dialog').getByRole('button', { name: 'Reintentar', exact: true }).click();
  await page.getByText('No hay recursos inhabilitados en este negocio.', { exact: true }).waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
  role = 'profesional';
  await goto('servicios');
  assert.equal(await page.locator('[data-users-menu], [data-retired-open]').count(), 0);
  role = 'admin_negocio';
  await page.goto(`${origin}/admin/servicios?demo=1`);
  await page.locator('#service-search').waitFor();
  assert.equal(await page.locator('[data-retired-open]').count(), 0);
  await page.goto(`${origin}/admin/disponibilidad/negocio?demo=1`);
  await page.getByText('Esta demostración usa su intervalo configurable; no reproduce el redondeo del motor conectado.', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('OK: catálogos, filtros, navegación Usuarios, cupos, menú de recepción, panel de inhabilitados/detalle/restauración, asignación bloqueada conservada, oferta y reglas. API simulada; solo 2 escrituras en memoria.');
} finally { await browser.close(); }
