// Vite activo. Toda ruta pública se intercepta: no usa el backend ni su base de datos.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
const origen = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const navegador = await chromium.launch({ channel: 'msedge', headless: true });
const negocioPrueba = { slug: 'qa-navegacion', nombre: 'Portal QA · API simulada' };
const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const fechaPosterior = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const servicios = Array.from({ length: 13 }, (_, indice) => ({ id: indice + 1, nombre: `Revisión ${String(indice + 1).padStart(2, '0')}`, descripcion: 'Descripción pública de prueba', duracionMinutos: indice < 6 ? 20 : 90 }));
const sucursales = Array.from({ length: 7 }, (_, indice) => ({ id: indice + 1, nombre: `Sucursal ${indice + 1}`, direccion: 'Calle de prueba', zonaHoraria: 'America/Mazatlan' }));
const profesionales = Array.from({ length: 7 }, (_, indice) => ({ id: indice + 1, nombre: `Profesional ${indice + 1}`, especialidad: indice % 2 ? 'Dental' : 'Medicina' }));
let modo = 'many', disponibilidad = 'normal', resolverCatalogo, resolverHorarios, resolverSesion, primeraSesion = true, peticiones = 0;
const errores = [], escrituras = [];
await mkdir('test-results/portal-navigation', { recursive: true });
try {
  const contexto = await navegador.newContext({ reducedMotion: 'reduce' });
  await contexto.route('**/data/demo.json', async (rutaInterceptada) => {
    const datos = JSON.parse(await readFile('public/data/demo.json', 'utf8'));
    datos.services.push(...Array.from({ length: 9 }, (_, indice) => ({ ...datos.services[0], id: 100 + indice, name: `Servicio QA ${indice + 1}` })));
    await rutaInterceptada.fulfill({ json: datos });
  });
  await contexto.route('**/publico/**', async (rutaInterceptada) => {
    peticiones++;
    const url = new URL(rutaInterceptada.request().url()), ruta = url.pathname.split('/').at(-1);
    if (rutaInterceptada.request().method() !== 'GET') { escrituras.push(ruta); assert.equal(ruta, 'sesion'); }
    if (ruta === 'sesion') {
      if (primeraSesion) { primeraSesion = false; await new Promise((resolverPromesa) => { resolverSesion = resolverPromesa; }); }
      return rutaInterceptada.fulfill({ json: { negocio: negocioPrueba, csrfToken: 'a'.repeat(64) } });
    }
    if (ruta === 'catalogo') {
      if (modo === 'loading') await new Promise((resolverPromesa) => { resolverCatalogo = resolverPromesa; });
      return rutaInterceptada.fulfill({ json: { negocio: negocioPrueba, servicios, sucursales: url.searchParams.has('servicioId') ? modo === 'single' ? sucursales.slice(0, 1) : sucursales : [], profesionales: url.searchParams.has('sucursalId') ? modo === 'single' ? profesionales.slice(0, 1) : profesionales : [] } });
    }
    assert.equal(ruta, 'disponibilidad');
    if (disponibilidad === 'loading') await new Promise((resolverPromesa) => { resolverHorarios = resolverPromesa; });
    if (disponibilidad === 'error') return rutaInterceptada.fulfill({ status: 503, json: { codigo: 'portal_503', mensaje: 'No pudimos consultar los horarios. Reintenta para comprobar la disponibilidad.', accion: 'reintentar' } });
    const consulta = Object.fromEntries(url.searchParams);
    for (const clave of ['servicioId', 'sucursalId', 'personalId']) consulta[clave] = Number(consulta[clave]);
    const ranuras = disponibilidad === 'empty' ? [] : [`${manana}T17:00:00Z`, `${manana}T20:00:00Z`, `${fechaPosterior}T17:00:00Z`].filter((fecha) => fecha.slice(0, 10) >= consulta.desde && fecha.slice(0, 10) <= consulta.hasta).map((inicioUtc) => ({ inicioUtc, finUtc: new Date(Date.parse(inicioUtc) + 1200000).toISOString() }));
    return rutaInterceptada.fulfill({ json: { ...consulta, modalidad: 'publica', zonaHoraria: 'America/Mazatlan', ranuras } });
  });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (error) => errores.push(error.message));
  const url = `${origen}/reservas/${negocioPrueba.slug}`;
  const capturar = async (nombre) => {
    for (const ancho of [1366, 768, 390, 320]) {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      for (const tema of ['light', 'dark']) {
        const actual = await pagina.evaluate(() => document.documentElement.dataset.theme);
        if (actual !== tema) {
          const botonTema = pagina.locator('#portal-tema');
          if (await botonTema.count()) await botonTema.click();
          else await pagina.getByRole('button', { name: /Activar modo/ }).click();
        }
        assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${nombre}/${ancho}/${tema}`);
        await pagina.screenshot({ fullPage: true, animations: 'disabled', path: `test-results/portal-navigation/${nombre}-${ancho}-${tema}.png` });
      }
    }
  };
  await pagina.goto(url);
  await expect(pagina.locator('#portal-esqueleto-inicial')).toBeVisible();
  await expect(pagina.locator('#portal-principal')).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => typeof resolverSesion).toBe('function'); resolverSesion();
  await expect(pagina.locator('[data-seleccion]')).toHaveCount(6);
  await expect(pagina.locator('[data-portal-limpiar]').first()).toBeDisabled();
  const cantidad = peticiones;
  await pagina.getByLabel('Buscar servicio').fill('revision 13');
  await expect(pagina.locator('[data-seleccion]')).toHaveCount(1);
  await expect(pagina.locator('[data-portal-pagina]')).toHaveCount(0);
  await pagina.locator('[data-seleccion]').check();
  await pagina.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await pagina.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(pagina.locator('.portal-paginacion')).toContainText('7–12 de 13');
  await expect(pagina.locator('.portal-opcion-elegida')).toContainText('Revisión 13');
  await pagina.getByLabel('Duración').selectOption('corta');
  await expect(pagina.locator('[data-seleccion]')).toHaveCount(6);
  await expect(pagina.locator('[data-portal-pagina]')).toHaveCount(0);
  await pagina.getByLabel('Buscar servicio').fill('inexistente');
  await expect(pagina.getByRole('heading', { name: 'No encontramos coincidencias' })).toBeVisible();
  await pagina.locator('.portal-filtros-opciones [data-portal-limpiar]').click();
  assert.equal(peticiones, cantidad);
  await capturar('servicios');
  await pagina.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(pagina.getByLabel('Buscar sucursal')).toBeVisible();
  await pagina.getByLabel('Buscar sucursal').fill('calle');
  await expect(pagina.locator('[data-seleccion]')).toHaveCount(6);
  await pagina.locator('[data-seleccion]').first().check();
  await pagina.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(pagina.getByLabel('Especialidad')).toBeVisible();
  await pagina.getByLabel('Especialidad').selectOption('Dental');
  await expect(pagina.locator('[data-seleccion]')).toHaveCount(3);
  await expect(pagina.getByRole('heading', { name: 'Elige un profesional', exact: true })).toBeVisible();
  await pagina.locator('[data-seleccion]').first().check();
  await pagina.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(pagina.getByRole('heading', { name: 'No hay horarios disponibles para esta fecha', exact: true })).toBeVisible();
  await expect(pagina.getByRole('button', { name: 'Apartar este horario', exact: true })).toBeDisabled();
  await capturar('dia-vacio');
  await pagina.getByRole('button', { name: 'Ver siguiente día disponible' }).click();
  await expect(pagina.locator('[data-horario]')).toHaveCount(2);
  await pagina.locator('[data-horario]').first().check();
  await pagina.getByRole('button', { name: 'Tarde (1)', exact: true }).click();
  await expect(pagina.locator('[data-horario]')).toHaveCount(1);
  await expect(pagina.locator('.portal-horario-elegido')).toContainText('10:00');
  await capturar('horarios');
  disponibilidad = 'loading';
  await pagina.locator(`.portal-calendario-dia[data-seleccion-fecha="${fechaPosterior}"]`).click();
  await expect(pagina.locator('.portal-esqueleto-horarios')).toBeVisible();
  await expect(pagina.locator('[data-horario]')).toHaveCount(0);
  await capturar('skeleton-horarios');
  resolverHorarios(); disponibilidad = 'empty';
  await expect(pagina.getByRole('heading', { name: 'No hay horarios disponibles para esta fecha', exact: true })).toBeVisible();
  await expect(pagina.getByRole('button', { name: 'Ver siguiente día disponible' })).toHaveCount(0);
  disponibilidad = 'error';
  await pagina.getByRole('button', { name: 'Consultar fechas siguientes' }).click();
  await expect(pagina.getByRole('button', { name: 'Reintentar consulta' })).toBeVisible();
  await expect(pagina.getByRole('heading', { name: 'No hay horarios disponibles para esta fecha', exact: true })).toHaveCount(0);
  modo = 'single'; disponibilidad = 'normal'; await pagina.goto(url);
  await pagina.locator('[data-seleccion]').first().check(); await pagina.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(pagina.getByRole('heading', { name: 'Elige fecha y hora', exact: true })).toBeVisible();
  await expect(pagina.locator('.portal-nota-automatica')).toContainText('Sucursal y Profesional');
  await pagina.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(pagina.getByRole('heading', { name: 'Elige un servicio', exact: true })).toBeVisible();
  modo = 'loading'; await pagina.goto(url);
  await expect(pagina.locator('.portal-esqueleto').last()).toBeVisible();
  await capturar('skeleton-catalogo');
  resolverCatalogo(); modo = 'many'; await expect(pagina.locator('[data-seleccion]')).toHaveCount(6);
  await pagina.goto(`${origen}/reservas/clinica-bienestar?demo=1`);
  await expect(pagina.locator('.reserva-demo-opcion').first()).toBeVisible();
  await expect(pagina.locator('.reserva-demo-opcion')).toHaveCount(6);
  await pagina.getByLabel('Buscar servicio').fill('Servicio QA 9');
  await expect(pagina.locator('.reserva-demo-opcion')).toHaveCount(1);
  await pagina.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await capturar('demo-servicios');
  await pagina.locator('[data-reserva-demo-opcion=servicioId][data-valor-opcion="1"]').click();
  await pagina.locator('[data-reserva-demo-continuar]').click();
  await expect(pagina.locator('[data-reserva-demo-opcion=sucursalId]').first()).toBeVisible();
  await pagina.locator('[data-reserva-demo-opcion=sucursalId]').first().click(); await pagina.locator('[data-reserva-demo-continuar]').click();
  await expect(pagina.getByRole('heading', { name: 'Elige fecha y hora', exact: true })).toBeVisible();
  await expect(pagina.locator('[data-reserva-demo-continuar]')).toBeDisabled();
  await pagina.locator('.reserva-demo-calendario-dia[data-reserva-demo-fecha]').first().click();
  await pagina.locator('[data-reserva-demo-horario]').first().click();
  await pagina.locator('[data-reserva-demo-continuar]').click();
  await expect(pagina.getByRole('heading', { name: 'Completa tus datos' })).toBeVisible();
  await pagina.getByLabel('Nombre completo').fill('Cliente ficticio');
  await pagina.getByLabel('Teléfono de WhatsApp').fill('6140000001');
  await pagina.getByRole('button', { name: 'Confirmar mi cita' }).click();
  await expect(pagina.getByRole('heading', { name: 'Tu cita está pendiente' })).toBeVisible();
  await expect(pagina.locator('.reserva-demo-confirmacion-folio')).toBeVisible();
  assert.deepEqual(errores, []); assert.ok(escrituras.every((ruta) => ruta === 'sesion'));
  console.log('OK: portal público, API interceptada, búsquedas sin consultas, 6/7/13, selección conservada, saltos, vuelta, filtros de hora, vacíos/error/skeleton y 48 capturas claro/oscuro a cuatro anchos; demo incluida.');
} finally { await navegador.close(); }
