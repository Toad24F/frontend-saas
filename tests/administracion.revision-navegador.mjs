// Con Vite activo. Toda la API está interceptada; ninguna escritura llega al backend.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origen = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const navegador = await chromium.launch({ channel: 'msedge', headless: true });
const servicios = [{ id: 1, nombre: 'Consulta', activo: true, duracionMinutos: 30, costo: 200, seleccionado: true }, { id: 2, nombre: 'Revisión', activo: true, duracionMinutos: 20, costo: 100, seleccionado: false }];
const sucursales = [1, 2].map((id) => ({ id, nombre: id === 1 ? 'Norte' : 'Sur', activo: true, direccion: 'Calle de prueba', zonaHoraria: 'America/Chihuahua', telefono: '6145550101' }));
const profesionales = [1, 2].map((id) => ({ id, nombre: id === 1 ? 'María' : 'Ana', correo: `prof${id}@example.test`, activo: id === 1 }));
let asignado = [1];
let restaurado = false;
let rol = 'admin_negocio';
const errores = [], escrituras = [];
const captura = (tipo) => ({ id: 300, nombre: `Retirado ${tipo}`, email: 'retirado@example.test', activo: false, inhabilitadoEn: '2026-11-01T12:00:00Z' });
await mkdir('test-results/admin-review', { recursive: true });
try {
  const contexto = await navegador.newContext({ reducedMotion: 'reduce' });
  await contexto.addInitScript(() => sessionStorage.setItem('cita-session', 'qa-simulado'));
  await contexto.route((url) => /^\/(auth|profesionales|recepcionistas|servicios|sucursales|bloqueos|disponibilidad)(\/|$)/.test(url.pathname), async (rutaInterceptada) => {
    const url = new URL(rutaInterceptada.request().url()), ruta = url.pathname, metodo = rutaInterceptada.request().method();
    if (metodo !== 'GET') {
      escrituras.push([metodo, ruta, rutaInterceptada.request().postDataJSON()]);
      if (metodo === 'POST' && ruta === '/servicios/300/restaurar') { restaurado = true; await rutaInterceptada.fulfill({ json: { id: 300, activo: false, inhabilitadoEn: null } }); return; }
      if (metodo === 'PUT' && ruta === '/profesionales/1/sucursales') { asignado = rutaInterceptada.request().postDataJSON().sucursalIds; await rutaInterceptada.fulfill({ json: asignado }); return; }
      throw Error(`Escritura inesperada ${metodo} ${ruta}`);
    }
    const tipo = ruta.split('/')[1];
    let datos;
    if (ruta === '/auth/profile') datos = { user: { sub: 1, rol: rol, negocioId: 1, nombre: 'Administración QA', nombreNegocio: 'Negocio QA', identificadorPublico: 'negocio-qa' } };
    else if (ruta.endsWith('/inhabilitados/300')) datos = captura(tipo);
    else if (ruta.endsWith('/inhabilitados')) datos = restaurado && tipo === 'servicios' ? [] : [captura(tipo)];
    else if (ruta === '/servicios') datos = servicios;
    else if (/^\/servicios\/\d+$/.test(ruta)) datos = servicios.find((elemento) => elemento.id === Number(ruta.split('/')[2]));
    else if (/^\/sucursales\/\d+$/.test(ruta)) datos = sucursales.find((elemento) => elemento.id === Number(ruta.split('/')[2]));
    else if (/^\/profesionales\/\d+$/.test(ruta)) datos = profesionales.find((elemento) => elemento.id === Number(ruta.split('/')[2]));
    else if (ruta === '/sucursales') datos = sucursales;
    else if (ruta === '/sucursales/cupo') datos = { limiteSucursalesActivas: 3, sucursalesActivas: 2, disponibles: 1 };
    else if (ruta === '/profesionales/cupo' || ruta === '/recepcionistas/cupo') datos = { limite: 5, activos: 1, disponibles: 4 };
    else if (ruta === '/profesionales') datos = profesionales;
    else if (ruta === '/recepcionistas') datos = [{ id: 10, nombre: 'Manuela', email: 'recepcion@example.test', activo: true, activadoEn: '2026-10-01T12:00:00Z' }];
    else if (ruta.endsWith('/sucursales')) datos = asignado;
    else if (ruta.endsWith('/servicios')) datos = servicios;
    else if (ruta.endsWith('/horario')) datos = [{ id: 1, diaSemana: 1, sucursalId: 1, inicioMinutos: 540, finMinutos: 780, activo: false }];
    else if (ruta.endsWith('/oferta')) datos = { cuentaActiva: true, sucursales: sucursales.map((b) => ({ id: b.id, nombre: b.nombre, sucursalActiva: true, atencionActiva: true, servicios: servicios.map((s) => ({ id: s.id, nombre: s.nombre, ofrecido: s.seleccionado, motivosExclusion: s.seleccionado ? [] : ['servicio_no_seleccionado'] })) })) };
    else if (ruta === '/bloqueos') datos = [];
    else if (ruta === '/disponibilidad/configuracion') datos = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 5, anticipacionMinutos: 60, diasFuturos: 20 };
    else if (ruta === '/disponibilidad/citas-afectadas') datos = { desde: url.searchParams.get('desde'), hasta: url.searchParams.get('hasta'), citas: [] };
    else throw Error(`Ruta inesperada ${ruta}`);
    await rutaInterceptada.fulfill({ json: datos });
  });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (error) => errores.push(error.message));
  const navegar = async (ruta) => { await pagina.goto(`${origen}/admin/${ruta}`); await pagina.locator('.encabezado-pagina').waitFor(); };
  await navegar('profesionales');
  await pagina.locator('.menu-cuenta-disparador').click();
  const estructura = (selector) => pagina.locator(selector).evaluate((elemento) => { const c = getComputedStyle(elemento); return [c.borderRadius, c.padding, c.minHeight]; });
  assert.deepEqual(await estructura('#menu-cuenta-panel a'), await estructura('#menu-cuenta-panel button'));
  await pagina.keyboard.press('Escape');
  const navegacion = await pagina.locator('.barra-lateral nav').innerText();
  assert.ok(navegacion.indexOf('Servicios') < navegacion.indexOf('Sucursales') && navegacion.indexOf('Sucursales') < navegacion.indexOf('Usuarios') && navegacion.indexOf('Usuarios') < navegacion.indexOf('Disponibilidad'));
  assert.equal(await pagina.locator('[data-users-menu]').getAttribute('aria-expanded'), 'true');
  for (const ancho of [1366, 1159, 390, 320]) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    for (const tema of ['light', 'dark']) {
      await pagina.evaluate((tema) => { localStorage.setItem('cita-theme', tema); document.documentElement.dataset.theme = tema; }, tema);
      for (const [pantalla, clase] of [['profesionales', 'profesional'], ['recepcionistas', 'recepcionista'], ['servicios', 'service'], ['sucursales', 'branch']]) {
        await navegar(pantalla);
        const esProfesionales = pantalla === 'profesionales';
        const esRecepcionistas = pantalla === 'recepcionistas';
        const esSucursales = pantalla === 'sucursales';
        const esServicios = pantalla === 'servicios';
        const limpiarFiltro = pagina.locator(esProfesionales ? '.profesionales-herramientas [data-profesional-limpiar]' : esRecepcionistas ? '.profesionales-herramientas [data-recepcionista-limpiar]' : esServicios ? '.profesionales-herramientas [data-servicio-limpiar]' : esSucursales ? '.profesionales-herramientas [data-sucursal-limpiar]' : '.profesionales-herramientas [data-' + clase + '-reset]');
        assert.equal(await limpiarFiltro.isDisabled(), true);
        await pagina.locator(esProfesionales ? '#busqueda-profesionales' : esRecepcionistas ? '#busqueda-recepcionistas' : esServicios ? '#busqueda-servicios' : esSucursales ? '#busqueda-sucursales' : '#' + clase + '-search').fill('no coincide');
        assert.equal(await limpiarFiltro.isEnabled(), true);
        await limpiarFiltro.click();
        assert.equal(await limpiarFiltro.isDisabled(), true);
        assert.equal(await pagina.locator('main section[aria-label^="Inhabilitados"]').count(), 0);
        if (pantalla === 'sucursales') {
          assert.equal(await pagina.locator('.catalogo-cupo .catalogo-indicador-cupo').count(), 1);
          assert.equal(await pagina.locator('.catalogo-indicador-cupo progress').evaluate((elemento) => getComputedStyle(elemento).height), '7px');
        }
        if (pantalla === 'recepcionistas') {
          const precaucion = pagina.locator('.recepcionista-accion-estado.accion-precaucion');
          assert.equal(await precaucion.evaluate((elemento) => getComputedStyle(elemento).backgroundColor), tema === 'dark' ? 'rgb(73, 56, 22)' : 'rgb(255, 240, 194)');
          await precaucion.hover();
          await expect(precaucion).toHaveCSS('background-color', tema === 'dark' ? 'rgb(96, 74, 28)' : 'rgb(255, 228, 154)');
        }
        const accion = { profesionales: 'nuevo-profesional', recepcionistas: 'nueva-recepcionista', servicios: 'nuevo-servicio', sucursales: 'nueva-sucursal' }[pantalla];
        await pagina.locator('[data-action="' + accion + '"]').first().click();
        await pagina.locator('.formulario-lateral[open]').waitFor();
        const rectangulo = await pagina.locator('.formulario-lateral').boundingBox();
        assert.ok(Math.abs(rectangulo.x + rectangulo.width - ancho) < 2);
        assert.ok(Math.abs(rectangulo.y) < 2 && Math.abs(rectangulo.height - 900) < 2);
        const rectanguloPie = await pagina.locator('.formulario-lateral #editor-form > .dialogo-pie').boundingBox();
        assert.ok(rectanguloPie.y + rectanguloPie.height <= 901);
        await pagina.screenshot({ animations: 'disabled', path: `test-results/admin-review/${ancho}-${tema}-alta-${pantalla}.png` });
        await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
        await pagina.locator('.profesional-mas summary').first().click();
        const peligro = pagina.locator('.profesional-menu-mas button.accion-peligro').first();
        assert.equal(await peligro.evaluate((elemento) => getComputedStyle(elemento).color), tema === 'dark' ? 'rgb(255, 182, 190)' : 'rgb(165, 42, 50)');
        assert.equal(await peligro.evaluate((elemento) => getComputedStyle(elemento).borderTopWidth), '0px');
        await peligro.hover();
        assert.equal(await peligro.evaluate((elemento) => getComputedStyle(elemento).backgroundColor), tema === 'dark' ? 'rgb(78, 43, 48)' : 'rgb(251, 227, 227)');
        await peligro.click();
        assert.equal(await pagina.locator('.formulario-lateral[open]').count(), 0);
        await pagina.getByRole('dialog').locator('.accion-peligro[data-confirm]').waitFor();
        await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
        assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${ancho}/${tema}/${pantalla}`);
        await pagina.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/admin-review/${ancho}-${tema}-${pantalla}.png` });
      }
      await pagina.locator('[data-inhabilitados-abrir]').click();
      await pagina.locator('[data-inhabilitados-detalle]').waitFor();
      await pagina.screenshot({ animations: 'disabled', path: `test-results/admin-review/${ancho}-${tema}-inhabilitados.png` });
      await pagina.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    }
  }
  await pagina.locator('.navegacion-inferior [data-action=menu]').click();
  await pagina.locator('[data-users-menu]').click();
  await pagina.locator('.barra-lateral [data-nav=recepcionistas]').click();
  assert.equal(await pagina.locator('[data-users-menu]').getAttribute('aria-expanded'), 'true');
  await pagina.setViewportSize({ width: 1366, height: 900 });
  for (const [pantalla, editar] of [['profesionales', 'data-editar-profesional'], ['servicios', 'data-editar-servicio'], ['sucursales', 'data-editar-sucursal']]) {
    await navegar(pantalla);
    await pagina.locator('[' + editar + ']').first().click();
    await pagina.locator('.formulario-lateral[open]').waitFor();
    await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
  await navegar('recepcionistas');
  await pagina.locator('[data-action=nueva-recepcionista]').click();
  await pagina.locator('#f-name').fill('Borrador de prueba');
  await pagina.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  assert.equal(await pagina.locator('.formulario-lateral[open]').count(), 1);
  assert.equal(escrituras.length, 0);
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await pagina.locator('[data-discard-confirm]:visible').waitFor();
  await pagina.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  assert.equal(await pagina.locator('#f-name').inputValue(), 'Borrador de prueba');
  await pagina.locator('.formulario-lateral [data-close]').click();
  await pagina.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await pagina.mouse.click(20, 100);
  await pagina.getByRole('button', { name: 'Seguir editando', exact: true }).click();
  await pagina.keyboard.press('Escape');
  await pagina.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
  await pagina.locator('.profesional-mas summary').click();
  await pagina.getByRole('button', { name: 'Restablecer contraseña', exact: true }).click();
  await pagina.getByRole('dialog').waitFor();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await navegar('servicios');
  await pagina.locator('[data-inhabilitados-abrir]').click();
  await pagina.locator('[data-inhabilitados-busqueda]').fill('no coincide');
  await pagina.getByText('No hay coincidencias en los inhabilitados.', { exact: true }).waitFor();
  await pagina.locator('[data-inhabilitados-busqueda]').fill('Retirado');
  await pagina.locator('[data-inhabilitados-detalle]').click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Volver a inhabilitados' }).click();
  await pagina.locator('[data-inhabilitados-restaurar]').click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
  await pagina.getByText('Recurso restaurado como inactivo. Actívalo por separado cuando corresponda.', { exact: true }).waitFor();
  await navegar('disponibilidad/equipo');
  const bloqueado = pagina.locator('input[type=checkbox][name=branchIds][value="1"]');
  await bloqueado.waitFor();
  assert.equal(await bloqueado.isDisabled(), true);
  const valores = await pagina.locator('#formulario-asignaciones-sucursales').evaluate((formulario) => new FormData(formulario).getAll('branchIds'));
  assert.deepEqual(valores, ['1']);
  await pagina.locator('input[type=checkbox][name=branchIds][value="2"]').check();
  await pagina.getByRole('button', { name: 'Guardar asignaciones' }).click();
  await pagina.waitForFunction(() => document.querySelector('[data-asignacion-resumen]')?.textContent === 'Sin cambios pendientes');
  assert.deepEqual(asignado, [1, 2]);
  await pagina.getByRole('tab', { name: 'Oferta por sucursal' }).click();
  await pagina.locator('[data-oferta-selector]').waitFor();
  await pagina.locator('[data-oferta-selector]').selectOption('2');
  assert.equal(await pagina.locator('[data-oferta-sucursal="2"]').isVisible(), true);
  assert.equal(await pagina.locator('[data-oferta-sucursal="1"]').isVisible(), false);
  assert.equal(await pagina.locator('[data-disponibilidad-accion=atencion]:visible').getAttribute('class'), 'btn accion-precaucion');
  await pagina.getByRole('tab', { name: 'Horario semanal' }).click();
  await pagina.locator('.aviso-app').first().waitFor({ state: 'hidden' });
  assert.equal(await pagina.locator('#formulario-horario .pie-formulario-seccion .horario-ayuda').count(), 1);
  for (const anchoPrueba of [1366, 390, 320]) for (const tema of ['light', 'dark']) {
    await pagina.setViewportSize({ width: anchoPrueba, height: 900 });
    await pagina.evaluate((tema) => { localStorage.setItem('cita-theme', tema); document.documentElement.dataset.theme = tema; }, tema);
    for (const [etiqueta, archivo] of [['Sucursales asignadas', 'asignaciones'], ['Oferta por sucursal', 'oferta'], ['Horario semanal', 'horario']]) {
      await pagina.getByRole('tab', { name: etiqueta, exact: true }).click();
      assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), etiqueta);
      await pagina.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/admin-review/${anchoPrueba}-${tema}-${archivo}.png` });
    }
  }
  await pagina.getByRole('tab', { name: 'Bloqueos', exact: true }).click();
  for (const anchoSimulado of [1366, 390, 320]) for (const temaPrueba of ['light', 'dark']) {
    await pagina.setViewportSize({ width: anchoSimulado, height: 900 });
    await pagina.evaluate((tema) => { localStorage.setItem('cita-theme', tema); document.documentElement.dataset.theme = tema; }, temaPrueba);
    await pagina.locator('[data-action=nuevo-bloqueo]').click();
    await pagina.locator('.formulario-lateral[open]').waitFor();
    await pagina.screenshot({ animations: 'disabled', path: `test-results/admin-review/${anchoSimulado}-${temaPrueba}-alta-bloqueo.png` });
    await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
  await navegar('disponibilidad/negocio');
  await pagina.locator('.configuracion-redondeo').waitFor();
  const textoConfiguracion = await pagina.locator('#formulario-configuracion-agenda').innerText();
  for (const texto of ['primer horario disponible de cada día', '10:02', '10:05', 'limpie o desinfecte', 'si son las 10:00', 'a partir de las 11:00', 'hasta 20 días en el futuro']) assert.ok(textoConfiguracion.includes(texto), texto);
  for (const anchoReglas of [1366, 390, 320]) for (const temaSimulado of ['light', 'dark']) {
    await pagina.setViewportSize({ width: anchoReglas, height: 900 });
    await pagina.evaluate((tema) => document.documentElement.dataset.theme = tema, temaSimulado);
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await pagina.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/admin-review/${anchoReglas}-${temaSimulado}-reglas.png` });
  }
  await pagina.route('**/profesionales/cupo', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 503, json: { message: 'Cupo no disponible' } }));
  await navegar('profesionales');
  await pagina.getByText('Profesionales activos: cupo no disponible.', { exact: true }).waitFor();
  await pagina.unroute('**/profesionales/cupo');
  await pagina.setViewportSize({ width: 1366, height: 900 });
  await navegar('profesionales');
  await pagina.locator('[data-vista-profesionales=tarjetas]').click();
  await pagina.locator('#busqueda-profesionales').fill('María');
  await pagina.locator('.profesionales-herramientas [data-profesional-limpiar]').click();
  assert.equal(await pagina.locator('[data-vista-profesionales=tarjetas]').getAttribute('aria-pressed'), 'true');
  await pagina.getByRole('group', { name: 'Tipo de vista' }).getByRole('button', { name: 'Lista', exact: true }).click();
  await pagina.route('**/servicios/inhabilitados', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 503, json: { message: 'Lista no disponible' } }));
  await navegar('servicios');
  await pagina.locator('[data-inhabilitados-abrir]').click();
  await pagina.getByRole('dialog').getByRole('alert').waitFor();
  await pagina.unroute('**/servicios/inhabilitados');
  await pagina.getByRole('dialog').getByRole('button', { name: 'Reintentar', exact: true }).click();
  await pagina.getByText('No hay recursos inhabilitados en este negocio.', { exact: true }).waitFor();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
  rol = 'profesional';
  await navegar('servicios');
  assert.equal(await pagina.locator('[data-users-menu], [data-inhabilitados-abrir]').count(), 0);
  rol = 'admin_negocio';
  await pagina.goto(`${origen}/admin/servicios?demo=1`);
  await pagina.locator('#busqueda-servicios').waitFor();
  assert.equal(await pagina.locator('[data-inhabilitados-abrir]').count(), 0);
  for (const ancho of [1366, 390]) for (const tema of ['light', 'dark']) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    for (const [pantalla, selector] of [['profesionales', '[data-profesional-id]'], ['servicios', '[data-servicio-entrada]'], ['sucursales', '[data-sucursal-entrada]']]) {
      await pagina.goto(`${origen}/admin/${pantalla}?demo=1`);
      await pagina.evaluate((valor) => { localStorage.setItem('cita-theme', valor); document.documentElement.dataset.theme = valor; }, tema);
      await pagina.locator(selector).first().waitFor();
      assert.equal(await pagina.locator('[data-inhabilitados-abrir]').count(), 0);
      assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `demo/${pantalla}/${ancho}/${tema}`);
      await pagina.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/admin-review/${ancho}-${tema}-demo-${pantalla}.png` });
    }
  }
  await pagina.goto(`${origen}/admin/disponibilidad/negocio?demo=1`);
  await pagina.getByText('Esta demostración usa su intervalo configurable; no reproduce el redondeo del motor conectado.', { exact: true }).waitFor();
  assert.deepEqual(errores, []);
  console.log('OK: catálogos y filtros; Recepcionistas conectado, y Profesionales, Servicios y Sucursales conectados/demo, en escritorio/móvil y ambos temas; navegación Usuarios, cupos, menú de recepción, panel de inhabilitados/detalle/restauración, asignación bloqueada conservada, oferta y reglas. API simulada; solo 2 escrituras en memoria.');
} finally { await navegador.close(); }
