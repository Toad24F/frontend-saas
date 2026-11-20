// Vite activo. API simulada; la única escritura permitida es un retiro en memoria.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origen = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const navegador = await chromium.launch({ channel: 'msedge', headless: true });
const conNombre = (id) => id === 21 ? 'Registro único' : `Registro ${id}`;
let profesionales = Array.from({ length: 21 }, (_, indice) => ({ id: indice + 1, nombre: conNombre(indice + 1), correo: `prof${indice + 1}@example.test`, activo: indice % 2 === 0 }));
const servicios = Array.from({ length: 21 }, (_, indice) => ({ id: indice + 1, nombre: conNombre(indice + 1), activo: indice % 2 === 0, duracionMinutos: 30, costo: 200, seleccionado: indice === 0 }));
const sucursales = Array.from({ length: 21 }, (_, indice) => ({ id: indice + 1, nombre: conNombre(indice + 1), activo: indice % 2 === 0, direccion: 'Dirección de prueba', telefono: '6145550101', zonaHoraria: 'America/Chihuahua' }));
const recepcionistas = Array.from({ length: 21 }, (_, indice) => ({ id: indice + 1, nombre: conNombre(indice + 1), email: `recep${indice + 1}@example.test`, activo: indice % 2 === 0 }));
const bloques = Array.from({ length: 21 }, (_, indice) => ({ id: indice + 1, personalId: indice % 3 === 0 ? null : 1, sucursalId: indice % 5 === 0 ? null : indice % 2 ? 1 : 2, tipo: ['vacaciones', 'dia_festivo', 'emergencia'][indice % 3], motivo: `Bloqueo ${indice + 1}`, fechaInicio: `2026-11-${String(indice + 1).padStart(2, '0')}`, fechaFin: indice === 0 ? '2026-11-09' : `2026-11-${String(indice + 1).padStart(2, '0')}`, inicioMinutos: null, finMinutos: null }));
let solicitudes = 0;
const errores = [], escrituras = [];
await mkdir('test-results/local-pagination', { recursive: true });
try {
  const contexto = await navegador.newContext({ reducedMotion: 'reduce' });
  await contexto.addInitScript(() => {
    sessionStorage.setItem('cita-session', 'qa-simulado');
    localStorage.setItem('citalendar-professionals-view', 'cards');
  });
  await contexto.route((url) => /^\/(auth|profesionales|recepcionistas|servicios|sucursales|bloqueos|disponibilidad)(\/|$)/.test(url.pathname), async (rutaInterceptada) => {
    solicitudes++;
    const ruta = new URL(rutaInterceptada.request().url()).pathname, metodo = rutaInterceptada.request().method();
    if (metodo !== 'GET') {
      escrituras.push(ruta);
      assert.equal(ruta, '/profesionales/21/inhabilitar');
      profesionales = profesionales.filter((elemento) => elemento.id !== 21);
      await rutaInterceptada.fulfill({ json: { id: 21, activo: false, inhabilitadoEn: '2026-11-05T12:00:00Z' } }); return;
    }
    let datos;
    const id = Number(ruta.split('/')[2]);
    if (ruta === '/auth/profile') datos = { user: { sub: 1, rol: 'admin_negocio', negocioId: 1, nombre: 'Administración QA', nombreNegocio: 'Negocio QA' } };
    else if (ruta === '/profesionales') datos = profesionales;
    else if (ruta === '/servicios') datos = servicios;
    else if (ruta === '/sucursales') datos = sucursales;
    else if (ruta === '/recepcionistas') datos = recepcionistas;
    else if (ruta === '/profesionales/cupo' || ruta === '/recepcionistas/cupo') datos = { limite: 30, activos: 11, disponibles: 19 };
    else if (ruta === '/sucursales/cupo') datos = { limiteSucursalesActivas: 30, sucursalesActivas: 11, disponibles: 19 };
    else if (ruta.endsWith('/sucursales')) datos = [1, 2];
    else if (ruta.endsWith('/servicios')) datos = servicios;
    else if (ruta.endsWith('/horario')) datos = [];
    else if (ruta.endsWith('/oferta')) datos = { cuentaActiva: true, sucursales: [] };
    else if (ruta === '/bloqueos') datos = bloques;
    else if (/^\/profesionales\/\d+$/.test(ruta)) datos = profesionales.find((elemento) => elemento.id === id);
    else if (ruta === '/disponibilidad/configuracion') datos = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 0, anticipacionMinutos: 15, diasFuturos: 60 };
    else throw Error(`Ruta inesperada ${ruta}`);
    await rutaInterceptada.fulfill({ json: datos });
  });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (error) => errores.push(error.message));
  for (const [pantalla, clase] of [['profesionales', 'profesional'], ['recepcionistas', 'recepcionista'], ['servicios', 'servicio'], ['sucursales', 'sucursal']]) {
    await pagina.setViewportSize({ width: 1366, height: 900 });
    await pagina.goto(`${origen}/admin/${pantalla}`);
    const esProfesionales = pantalla === 'profesionales';
    const esRecepcionistas = pantalla === 'recepcionistas';
    const esSucursales = pantalla === 'sucursales';
    const esServicios = pantalla === 'servicios';
    const resultados = pagina.locator(`#${clase}-resultados`), pie = pagina.locator(`[data-paginacion-catalogo=${clase}]`);
    await resultados.waitFor();
    await expect(resultados.locator('article')).toHaveCount(10);
    const selectorVista = pagina.getByRole('group', { name: 'Tipo de vista' });
    await expect(selectorVista.getByRole('button', { name: esProfesionales ? 'Tarjetas' : 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    assert.match(await pagina.locator('.profesionales-resumen').innerText(), /21/);
    const solicitudesIniciales = solicitudes;
    await pie.getByRole('button', { name: 'Siguiente', exact: true }).click();
    assert.match(await pie.innerText(), /11–20 de 21/);
    await selectorVista.getByRole('button', { name: 'Lista' }).click();
    assert.equal(await pagina.evaluate(() => localStorage.getItem('citalendar-catalog-view')), 'list');
    await selectorVista.getByRole('button', { name: 'Tarjetas' }).click();
    assert.equal(await pagina.evaluate(() => localStorage.getItem('citalendar-catalog-view')), 'cards');
    assert.match(await pie.innerText(), /11–20 de 21/);
    await pagina.setViewportSize({ width: 390, height: 900 });
    await expect(selectorVista).toBeHidden();
    await expect(resultados.locator('article')).toHaveCount(10);
    assert.match(await resultados.getAttribute('class'), /vista--tarjetas/);
    await pie.getByRole('button', { name: 'Siguiente', exact: true }).click();
    assert.equal(await resultados.locator('article').count(), 1);
    assert.match(await pie.innerText(), /21–21 de 21/);
    assert.equal(solicitudes, solicitudesIniciales);
    await pagina.locator(esProfesionales ? '[data-filtro-profesionales=estado]' : esRecepcionistas ? '[data-filtro-recepcionistas=estado]' : esServicios ? '[data-filtro-servicios=estado]' : esSucursales ? '[data-filtro-sucursales=estado]' : `[data-${clase}-filter=status]`).selectOption('inactivo');
    await expect(resultados.locator('article')).toHaveCount(10);
    assert.equal(await pie.locator('nav').count(), 0);
    await pagina.locator(esProfesionales ? '[data-filtro-profesionales=estado]' : esRecepcionistas ? '[data-filtro-recepcionistas=estado]' : esServicios ? '[data-filtro-servicios=estado]' : esSucursales ? '[data-filtro-sucursales=estado]' : `[data-${clase}-filter=status]`).selectOption('activo');
    assert.equal(await pie.locator('nav').count(), 1);
    await pagina.locator(esProfesionales ? '#busqueda-profesionales' : esRecepcionistas ? '#busqueda-recepcionistas' : esServicios ? '#busqueda-servicios' : esSucursales ? '#busqueda-sucursales' : `#${clase}-search`).fill('unico');
    assert.equal(await resultados.locator('article').count(), 1);
    assert.equal(await pie.locator('nav').count(), 0);
    await pagina.locator(esProfesionales ? '#busqueda-profesionales' : esRecepcionistas ? '#busqueda-recepcionistas' : esServicios ? '#busqueda-servicios' : esSucursales ? '#busqueda-sucursales' : `#${clase}-search`).fill('sin coincidencias');
    assert.equal(await resultados.locator('article').count(), 0);
    await pagina.locator(esProfesionales ? '#sin-resultados-profesionales' : esRecepcionistas ? '#sin-resultados-recepcionistas' : esServicios ? '#sin-resultados-servicios' : esSucursales ? '#sin-resultados-sucursales' : `#${clase}-no-results`).waitFor();
    await pagina.locator(esProfesionales ? '.profesionales-herramientas [data-profesional-limpiar]' : esRecepcionistas ? '.profesionales-herramientas [data-recepcionista-limpiar]' : esServicios ? '.profesionales-herramientas [data-servicio-limpiar]' : esSucursales ? '.profesionales-herramientas [data-sucursal-limpiar]' : `.profesionales-herramientas [data-${clase}-limpiar]`).click();
    await expect(resultados.locator('article')).toHaveCount(10);
    for (const ancho of [1366, 1159, 390, 320]) {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      if (ancho > 767) await selectorVista.getByRole('button', { name: 'Lista' }).click();
      for (const tema of ['light', 'dark']) {
        await pagina.evaluate((tema) => { localStorage.setItem('cita-theme', tema); document.documentElement.dataset.theme = tema; }, tema);
        assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${pantalla}/${ancho}/${tema}`);
        await pagina.evaluate(() => scrollTo(0, 0));
        await pagina.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/local-pagination/${ancho}-${tema}-${pantalla}.png` });
      }
    }
  }
  await pagina.goto(`${origen}/admin/profesionales`);
  await pagina.locator('#profesional-resultados').waitFor();
  const pieProfesional = pagina.locator('[data-paginacion-catalogo=profesional]');
  await pieProfesional.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await pieProfesional.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await pagina.locator('#profesional-resultados summary').click();
  await pagina.locator('[data-accion-profesional=inhabilitar]').click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Inhabilitar', exact: true }).click();
  await pagina.waitForFunction(() => document.querySelector('[data-paginacion-catalogo=profesional]')?.textContent.includes('11–20 de 20'));
  assert.equal(await pagina.locator('#profesional-resultados article').count(), 10);
  await pagina.goto(`${origen}/admin/disponibilidad/equipo`);
  await pagina.getByRole('tab', { name: 'Bloqueos', exact: true }).click();
  const resultadosBloqueo = pagina.locator('[data-resultados-bloqueos]');
  assert.equal(await resultadosBloqueo.locator('.bloqueo-entrada').count(), 10);
  let solicitudesBloqueo = solicitudes;
  await pagina.locator('[data-pagina-bloqueos="2"]').click();
  assert.match(await resultadosBloqueo.innerText(), /11–20 de 21/);
  assert.equal(solicitudes, solicitudesBloqueo);
  await Promise.all([pagina.waitForResponse((respuesta) => new URL(respuesta.url()).pathname === '/profesionales/2/oferta'), pagina.locator('#profesional-bloqueos').selectOption('2')]);
  assert.equal(await resultadosBloqueo.locator('.bloqueo-entrada').count(), 7);
  assert.equal(await resultadosBloqueo.locator('nav').count(), 0);
  await Promise.all([pagina.waitForResponse((respuesta) => new URL(respuesta.url()).pathname === '/profesionales/1/oferta'), pagina.locator('#profesional-bloqueos').selectOption('1')]);
  solicitudesBloqueo = solicitudes;
  await pagina.locator('[data-filtro-bloqueos=desde]').fill('2026-11-02');
  await pagina.locator('[data-filtro-bloqueos=hasta]').fill('2026-11-02');
  assert.equal(await resultadosBloqueo.locator('.bloqueo-entrada').count(), 2);
  await pagina.locator('[data-filtro-bloqueos=desde]').fill('2026-11-09');
  await resultadosBloqueo.getByRole('alert').waitFor();
  assert.equal(await resultadosBloqueo.locator('nav').count(), 0);
  await pagina.locator('.bloqueos-filtros [data-limpiar-bloqueos]').click();
  assert.equal(await pagina.locator('#profesional-bloqueos').inputValue(), '1');
  await pagina.locator('[data-filtro-bloqueos=sucursal]').selectOption('1');
  const sucursalEsperada = bloques.filter((elemento) => !elemento.sucursalId || elemento.sucursalId === 1).length;
  assert.match(await resultadosBloqueo.innerText(), new RegExp(`de ${sucursalEsperada} bloqueos`));
  await pagina.locator('[data-filtro-bloqueos=tipo]').selectOption('vacaciones');
  assert.equal(await resultadosBloqueo.locator('nav').count(), 0);
  await pagina.locator('[data-filtro-bloqueos=busqueda]').fill('no existe');
  await resultadosBloqueo.getByRole('heading', { name: 'Sin coincidencias' }).waitFor();
  await pagina.locator('.bloqueos-filtros [data-limpiar-bloqueos]').click();
  assert.equal(solicitudes, solicitudesBloqueo);
  await pagina.locator('.aviso-app').first().waitFor({ state: 'hidden' });
  for (const ancho of [1366, 1159, 390, 320]) for (const tema of ['light', 'dark']) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.evaluate((tema) => document.documentElement.dataset.theme = tema, tema);
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await pagina.evaluate(() => scrollTo(0, 0));
    await pagina.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/local-pagination/${ancho}-${tema}-bloqueos.png` });
  }
  await pagina.goto(`${origen}/admin/servicios?demo=1`);
  await pagina.locator('#servicio-resultados').waitFor();
  assert.equal(await pagina.locator('[data-pagina-catalogo]').count(), 0);
  assert.deepEqual(errores, []);
  assert.deepEqual(escrituras, ['/profesionales/21/inhabilitar']);
  console.log('OK: 4 catálogos y Bloqueos, filtros antes de paginar, cambio lista/tarjetas/móvil, 10/11/21, ajuste de última página, alcance global, fechas, cero consultas por paginación. API simulada.');
} finally { await navegador.close(); }
