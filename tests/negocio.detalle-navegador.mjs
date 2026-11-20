// Prueba aislada: intercepta toda la API; no utiliza ni modifica el backend.
// Con Vite iniciado: node tests/negocio.detalle-navegador.mjs
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const origen = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const navegador = await chromium.launch({ channel: 'msedge', headless: true });
const negocio = { id: 1, nombre: 'Negocio de prueba', identificadorPublico: 'negocio-prueba', creadoEn: '2026-10-01T12:00:00Z', administrador: { id: 2, email: 'admin@example.test', activadoEn: null }, licencia: { id: 1 } };
const vigencia = { duracionTotalMs: 365 * 86400000, estado: 'vigente', condicionAcceso: true, venceEn: '2027-11-05T12:00:00Z', tiempoRestante: { dias: 365, horas: 0, minutos: 0 } };
let envios = Array.from({ length: 23 }, (_, indice) => ({ id: String(indice + 1), tipo: indice % 2 ? 'recuperacion' : 'activacion_admin', estado: ['enviado', 'fallido', 'pendiente', 'tomado', 'descartado'][indice % 5], intentos: indice % 3, confirmadoEn: indice % 5 === 0 ? '2026-11-05T12:00:00Z' : null, proximoIntentoEn: '2026-11-05T13:00:00Z', ultimoError: indice % 5 === 1 ? 'No se pudo entregar el correo.' : null }));
const errores = [];
await mkdir('test-results/business-detail', { recursive: true });
try {
  const contexto = await navegador.newContext({ reducedMotion: 'reduce' });
  await contexto.addInitScript(() => sessionStorage.setItem('cita-session', 'qa-ficticio'));
  await contexto.route((url) => url.pathname.startsWith('/auth/') || url.pathname.startsWith('/negocios') || url.pathname.startsWith('/licencias'), async (rutaInterceptada) => {
    const ruta = new URL(rutaInterceptada.request().url()).pathname;
    assert.equal(rutaInterceptada.request().method(), 'GET', `Petición inesperada: ${ruta}`);
    const datos = ruta === '/auth/profile' ? { user: { sub: 1, rol: 'superadmin', nombre: 'Superadmin QA' } }
      : ruta === '/negocios' ? [negocio] : ruta === '/negocios/1' ? negocio
        : ruta === '/negocios/1/envios' ? envios : ruta === '/licencias/1/vigencia' ? vigencia
          : ruta === '/negocios/1/cupo-sucursales' ? { sucursalesActivas: 3, limiteSucursalesActivas: 5, disponibles: 2 }
            : ruta === '/negocios/1/cupo-usuarios' ? { profesionales: { activos: 4, limite: 5, disponibles: 1 }, recepcionistas: { activos: 3, limite: 3, disponibles: 0 } } : null;
    assert.notEqual(datos, null, `Ruta inesperada: ${ruta}`);
    await rutaInterceptada.fulfill({ json: datos });
  });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (error) => { errores.push(error.message); console.error(error.message); });
  await pagina.goto(`${origen}/admin/negocio/1`);
  try { await pagina.getByRole('tab', { name: 'General', exact: true }).waitFor({ timeout: 10000 }); } catch (error) { console.log(await pagina.locator('body').innerText()); throw error; }
  assert.equal(await pagina.locator('[role=tabpanel]:visible').count(), 1);
  await pagina.getByRole('tab', { name: 'General', exact: true }).focus();
  await pagina.keyboard.press('ArrowRight');
  assert.equal(await pagina.getByRole('tab', { name: 'Límites y uso' }).getAttribute('aria-selected'), 'true');
  assert.equal(await pagina.locator('meter:visible').count(), 3);
  for (const ancho of [1920, 1532, 1366, 390, 320]) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    for (const tema of ['light', 'dark']) {
      await pagina.evaluate((tema) => document.documentElement.dataset.theme = tema, tema);
      for (const pestana of ['general', 'limites', 'correo']) {
        await pagina.locator(`[data-negocio-pestana=${pestana}]`).click();
        assert.equal(await pagina.locator('[role=tabpanel]:visible').count(), 1);
        assert.equal(await pagina.locator(`#negocio-panel-${pestana} .superficie`).count(), 0);
        assert.equal(await pagina.locator('.negocio-resumen-licencia').count(), 0);
        if (pestana === 'general') {
          assert.equal(await pagina.locator('#negocio-panel-general .etiqueta-suave').count(), 0);
          assert.equal(await pagina.locator('.negocio-etiqueta-licencia:visible').innerText(), 'Vigente');
          assert.equal(await pagina.locator('progress:visible').getAttribute('value'), '100');
        }
        if (pestana === 'general' || pestana === 'limites') {
          const alineados = await pagina.locator(pestana === 'general' ? '.negocio-tiempo-licencia progress' : '.negocio-limites meter').evaluateAll((barras) => barras.every((barra) => {
            const seccion = barra.closest('section').getBoundingClientRect();
            const rectangulo = barra.getBoundingClientRect();
            return Math.abs(rectangulo.left - seccion.left) < 2 && Math.abs(rectangulo.right - seccion.right) < 2;
          }));
          assert.ok(alineados, `${ancho}/${tema}/${pestana}: ancho de barra`);
        }
        assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${ancho}/${tema}/${pestana}: desbordamiento`);
        await pagina.evaluate(async () => { await Promise.all(document.getAnimations().map((animacion) => animacion.finished.catch(() => {}))); await new Promise(requestAnimationFrame); });
        await pagina.screenshot({ animations: 'disabled', path: `test-results/business-detail/${ancho}-${tema}-${pestana}.png`, fullPage: true });
        if (pestana === 'general') {
          const rojoNormal = tema === 'light' ? 'rgb(203, 70, 70)' : 'rgb(91, 21, 27)';
          const rojoAlPasar = tema === 'light' ? 'rgb(169, 39, 39)' : 'rgb(148, 28, 38)';
          const suspender = pagina.locator('[data-accion-negocio=suspender]');
          const color = (destino) => destino.evaluate((elemento) => ({ bg: getComputedStyle(elemento).backgroundColor, text: getComputedStyle(elemento).color }));
          await pagina.mouse.move(0, 0);
          assert.deepEqual(await color(suspender), { bg: rojoNormal, text: 'rgb(255, 255, 255)' });
          await suspender.hover();
          assert.deepEqual(await color(suspender), { bg: rojoAlPasar, text: 'rgb(255, 255, 255)' });
          await suspender.click();
          const formulario = pagina.locator('#licencia-formulario-suspension');
          await formulario.waitFor();
          assert.equal(await formulario.locator('.dialogo-pie').evaluate((elemento) => getComputedStyle(elemento).backgroundColor), 'rgba(0, 0, 0, 0)');
          const confirmar = formulario.getByRole('button', { name: 'Programar suspensión', exact: true });
          assert.deepEqual(await color(confirmar), { bg: rojoNormal, text: 'rgb(255, 255, 255)' });
          await confirmar.hover();
          assert.deepEqual(await color(confirmar), { bg: rojoAlPasar, text: 'rgb(255, 255, 255)' });
          await pagina.keyboard.press('Tab');
          await confirmar.focus();
          assert.equal(await confirmar.evaluate((elemento) => getComputedStyle(elemento).outlineStyle), 'solid');
          await pagina.screenshot({ animations: 'disabled', path: `test-results/business-detail/${ancho}-${tema}-suspension.png` });
          await formulario.getByRole('button', { name: 'Cancelar' }).click();
        }
      }
    }
  }
  assert.equal(await pagina.locator('.correo-tabla tbody tr').count(), 10);
  assert.equal(await pagina.locator('.correo-id').count(), 0);
  assert.doesNotMatch(await pagina.locator('.correo-tabla').innerText(), /Envío #/);
  await pagina.getByRole('button', { name: 'Siguiente', exact: true }).click();
  assert.match(await pagina.locator('.correo-pie').innerText(), /11–20 de 23/);
  await pagina.locator('[data-correo-filtro=estado]').selectOption('fallido');
  assert.equal(await pagina.getByRole('navigation', { name: 'Paginación de correos' }).count(), 0);
  assert.equal(await pagina.locator('.correo-tabla tbody tr').count(), 5);
  await pagina.locator('[data-correo-filtro=tipo]').selectOption('activacion_admin');
  assert.equal(await pagina.locator('.correo-tabla tbody tr').count(), 2);
  await pagina.getByRole('button', { name: /Reintentar ahora:/ }).first().click();
  await pagina.getByRole('dialog').waitFor();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await pagina.getByRole('button', { name: 'Limpiar filtros', exact: true }).first().click();
  await pagina.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await pagina.locator('.correo-tabla').waitFor();
  assert.equal(await pagina.locator('[data-negocio-pestana=correo]').getAttribute('aria-selected'), 'true');
  envios = envios.slice(0, 10);
  await pagina.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await pagina.waitForFunction(() => document.querySelector('.correo-pie')?.textContent.includes('de 10 correos'));
  assert.equal(await pagina.locator('[data-correo-pagina]').count(), 0);
  envios = [];
  await pagina.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await pagina.getByRole('heading', { name: 'Sin correos registrados' }).waitFor();
  assert.equal(await pagina.locator('[data-correo-pagina]').count(), 0);
  envios = [{ id: '1', tipo: 'recuperacion', estado: 'enviado', intentos: 1 }];
  await pagina.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await pagina.locator('.correo-tabla').waitFor();
  await pagina.locator('[data-correo-filtro=estado]').selectOption('fallido');
  await pagina.getByRole('heading', { name: 'No hay correos con estos filtros' }).waitFor();
  await pagina.locator('[data-correo-resultados] [data-correo-limpiar]').click();
  await pagina.locator('.correo-tabla').waitFor();
  await pagina.route('**/negocios/1/envios', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 503, json: { message: 'Correo temporalmente no disponible' } }));
  await pagina.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await pagina.getByRole('alert').waitFor();
  assert.equal(await pagina.locator('.correo-tabla').count(), 0);
  await pagina.unroute('**/negocios/1/envios');
  await pagina.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await pagina.locator('.correo-tabla').waitFor();

  const cambiosCupo = [];
  const cupoActualizado = { profesionales: { activos: 4, limite: 6, disponibles: 2 }, recepcionistas: { activos: 3, limite: 3, disponibles: 0 } };
  await pagina.route('**/negocios/1/cupo-usuarios', (ruta) => cambiosCupo.length > 1 ? ruta.fulfill({ json: cupoActualizado }) : ruta.fallback());
  await pagina.route('**/negocios/1/limites-usuarios', (ruta) => {
    assert.equal(ruta.request().method(), 'PATCH');
    cambiosCupo.push(ruta.request().postDataJSON());
    return cambiosCupo.length === 1
      ? ruta.fulfill({ status: 409, json: { message: 'El límite es inferior al número de cuentas activas.' } })
      : ruta.fulfill({ json: cupoActualizado });
  });
  await pagina.getByRole('tab', { name: 'Límites y uso' }).click();
  await pagina.getByRole('button', { name: 'Cambiar cupos de usuarios' }).click();
  const dialogo = pagina.getByRole('dialog');
  const limite = dialogo.getByLabel('Límite de profesionales activos');
  await limite.fill('3');
  await dialogo.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialogo.getByRole('alert')).toHaveText('El límite es inferior al número de cuentas activas.');
  await expect(limite).toHaveValue('3');
  await limite.fill('6');
  await dialogo.getByRole('button', { name: 'Guardar' }).click();
  await expect(pagina.getByRole('meter', { name: 'Profesionales activos: 4 de 6' })).toBeVisible();
  assert.deepEqual(cambiosCupo, [
    { limiteProfesionalesActivos: 3, limiteRecepcionistasActivos: 3 },
    { limiteProfesionalesActivos: 6, limiteRecepcionistasActivos: 3 },
  ]);

  const marcador = { action: 'suspender', businessId: 1, licenseId: 1, body: { plazoDias: 2 }, key: 'operacion_licencia_qa' };
  const claveAlmacenamiento = 'citalendar:license:pending:1';
  let comprobada = false;
  await pagina.route('**/licencias/1/suspender', (ruta) => {
    assert.equal(ruta.request().method(), 'POST');
    assert.equal(ruta.request().headers()['idempotency-key'], marcador.key);
    assert.deepEqual(ruta.request().postDataJSON(), marcador.body);
    comprobada = true;
    return ruta.fulfill({ json: { ...vigencia, estado: 'suspension_pendiente' } });
  });
  await pagina.route('**/licencias/1/vigencia', (ruta) => comprobada
    ? ruta.fulfill({ json: { ...vigencia, estado: 'suspension_pendiente' } })
    : ruta.fallback());
  await pagina.evaluate(({ claveAlmacenamiento, marcador }) => sessionStorage.setItem(claveAlmacenamiento, JSON.stringify(marcador)), { claveAlmacenamiento, marcador });
  await pagina.reload();
  await expect(pagina.getByRole('button', { name: 'Programar suspensión' })).toHaveCount(0);
  await pagina.getByRole('button', { name: 'Comprobar operación' }).click();
  await expect(pagina.locator('.negocio-etiqueta-licencia')).toHaveText('Suspensión programada');
  assert.equal(await pagina.evaluate((clave) => sessionStorage.getItem(clave), claveAlmacenamiento), null);

  await pagina.goto(`${origen}/admin/plataforma?demo=1`);
  await pagina.locator('.encabezado-pagina').waitFor();
  assert.equal(await pagina.locator('.negocio-espacio-trabajo').count(), 0);
  assert.deepEqual(errores, []);
  console.log('OK: pestañas y teclado, 40 capturas, filtros, errores, actualización de cupos y recuperación de licencia con API simulada. Plataforma demo verificada.');
} finally { await navegador.close(); }
