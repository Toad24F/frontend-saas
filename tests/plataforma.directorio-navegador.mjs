// Vite activo; API totalmente simulada. No usa la base de datos.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origen = process.env.BUSINESS_UI_URL || 'http://localhost:5173';
const navegador = await chromium.launch({ channel: 'msedge', headless: true });
let negocios = Array.from({ length: 23 }, (_, indice) => ({ id: indice + 1, nombre: `Clínica ${indice + 1}`, identificadorPublico: `clinica-${indice + 1}`, administrador: { id: indice + 100, email: `admin${indice + 1}@example.test`, activadoEn: indice % 5 === 0 ? null : '2026-10-01T12:00:00Z' }, licencia: { id: indice + 1 } }));
const vigencia = (id) => {
  const estado = ['pendiente', 'vigente', 'suspension_pendiente', 'suspendida', 'vencida'][(id - 1) % 5];
  return { estado, condicionAcceso: ['vigente', 'suspension_pendiente'].includes(estado), tiempoRestante: estado === 'pendiente' ? null : { dias: estado === 'vencida' ? 0 : 18, horas: 0, minutos: 0 }, duracionTotalMs: 365 * 86400000, tiempoCongelado: estado === 'suspendida' };
};
const errores = [];
await mkdir('test-results/plataforma', { recursive: true });
try {
  const contexto = await navegador.newContext({ reducedMotion: 'reduce' });
  await contexto.addInitScript(() => sessionStorage.setItem('cita-session', 'qa-simulado'));
  await contexto.route((url) => /^\/(auth|negocios|licencias)(\/|$)/.test(url.pathname), async (rutaInterceptada) => {
    assert.equal(rutaInterceptada.request().method(), 'GET');
    const ruta = new URL(rutaInterceptada.request().url()).pathname;
    const id = Number(ruta.split('/')[2]);
    const datos = ruta === '/auth/profile' ? { user: { sub: 1, rol: 'superadmin', nombre: 'Superadmin QA' } }
      : ruta === '/negocios' ? negocios
        : ruta.endsWith('/vigencia') ? vigencia(id)
          : ruta.endsWith('/envios') ? (id % 2 ? [] : [{ id: String(id), estado: 'fallido', tipo: 'recuperacion', intentos: 1 }])
            : ruta.endsWith('/cupo-sucursales') ? { sucursalesActivas: 1, limiteSucursalesActivas: 3, disponibles: 2 }
              : ruta.endsWith('/cupo-usuarios') ? { profesionales: { activos: 1, limite: 5, disponibles: 4 }, recepcionistas: { activos: 1, limite: 3, disponibles: 2 } }
                : negocios.find((negocio) => negocio.id === id);
    assert.ok(datos, ruta);
    await rutaInterceptada.fulfill({ json: datos });
  });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (error) => errores.push(error.message));
  await pagina.goto(`${origen}/admin/plataforma`);
  await pagina.locator('.plataforma-tabla').waitFor();
  assert.equal(await pagina.locator('.plataforma-tabla tbody tr').count(), 10);
  assert.equal(await pagina.locator('button.plataforma-indicador, [data-plataforma-indicador]').count(), 0);
  assert.equal(await pagina.locator('.plataforma-filtros [data-plataforma-limpiar]').isDisabled(), true);
  await pagina.route('**/negocios', (rutaInterceptada) => rutaInterceptada.request().method() === 'POST'
    ? rutaInterceptada.fulfill({ status: 201, json: { id: 24 } })
    : rutaInterceptada.fallback());
  await pagina.getByRole('button', { name: 'Registrar negocio', exact: true }).click();
  const altaConectada = pagina.getByRole('dialog');
  await altaConectada.getByLabel('Nombre del negocio').fill('Consultorio conectado');
  await altaConectada.getByLabel('Slug del portal').fill('consultorio-conectado');
  await altaConectada.getByLabel('Correo del administrador').fill('admin@example.test');
  await altaConectada.getByLabel('RFC').fill('XAXX010101000');
  await altaConectada.getByLabel('Límite de sucursales').fill('3');
  const [respuestaAlta] = await Promise.all([
    pagina.waitForResponse((respuesta) => new URL(respuesta.url()).pathname === '/negocios' && respuesta.request().method() === 'POST'),
    altaConectada.getByRole('button', { name: 'Guardar' }).click(),
  ]);
  assert.deepEqual(respuestaAlta.request().postDataJSON(), {
    nombre: 'Consultorio conectado',
    identificadorPublico: 'consultorio-conectado',
    emailAdministrador: 'admin@example.test',
    rfc: 'XAXX010101000',
    limiteSucursales: 3,
  });
  await altaConectada.waitFor({ state: 'hidden' });
  await pagina.unroute('**/negocios');
  for (const ancho of [1366, 1159, 390, 320]) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    for (const tema of ['light', 'dark']) {
      await pagina.evaluate((tema) => document.documentElement.dataset.theme = tema, tema);
      assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${ancho}/${tema}`);
      await pagina.evaluate(async () => { await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))); });
      await pagina.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/plataforma/${ancho}-${tema}.png` });
    }
  }
  await pagina.locator('[data-plataforma-busqueda]').fill('CLINICA');
  assert.equal(await pagina.locator('.plataforma-filtros [data-plataforma-limpiar]').isEnabled(), true);
  await pagina.getByRole('button', { name: 'Siguiente', exact: true }).click();
  assert.match(await pagina.locator('.plataforma-pie').innerText(), /11–20 de 23/);
  await pagina.locator('[data-detalle-negocio]').first().click();
  await pagina.getByRole('tab', { name: 'General', exact: true }).waitFor();
  await pagina.getByRole('button', { name: 'Volver al panel' }).click();
  assert.equal(await pagina.locator('[data-plataforma-busqueda]').inputValue(), 'CLINICA');
  assert.match(await pagina.locator('.plataforma-pie').innerText(), /11–20 de 23/);
  await pagina.locator('[data-plataforma-filtro=estadoLicencia]').selectOption('vigente');
  assert.equal(await pagina.locator('.plataforma-tabla tbody tr').count(), 5);
  assert.equal(await pagina.locator('[data-plataforma-pagina]').count(), 0);
  await pagina.locator('[data-plataforma-filtro=seguimiento]').selectOption('correos-fallidos');
  assert.equal(await pagina.locator('.plataforma-tabla tbody tr').count(), 3);
  await pagina.locator('[data-plataforma-busqueda]').fill('no existe');
  await pagina.getByRole('heading', { name: 'No hay negocios con estos filtros' }).waitFor();
  await pagina.locator('[data-plataforma-resultados] [data-plataforma-limpiar]').click();
  for (const [filtro, cantidad] of [['por-activar', 5], ['por-vencer', 5], ['acceso-bloqueado', 13], ['', 23]]) {
    await pagina.locator('[data-plataforma-filtro=seguimiento]').selectOption(filtro);
    assert.match(await pagina.locator('.plataforma-pie').innerText(), new RegExp(`de ${cantidad} negocios`));
    assert.equal(await pagina.locator('[data-plataforma-filtro=seguimiento]').inputValue(), filtro);
  }
  assert.equal(await pagina.locator('.plataforma-filtros [data-plataforma-limpiar]').isDisabled(), true);
  negocios = negocios.slice(0, 10);
  await pagina.locator('[data-plataforma-actualizar]').click();
  await pagina.waitForFunction(() => document.querySelector('.plataforma-pie')?.textContent.includes('de 10 negocios'));
  assert.equal(await pagina.locator('[data-plataforma-pagina]').count(), 0);
  await pagina.route('**/negocios', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 503, json: { message: 'No disponible' } }));
  await pagina.locator('[data-plataforma-actualizar]').click();
  await pagina.getByRole('alert').waitFor();
  assert.match(await pagina.getByRole('alert').innerText(), /última consulta/);
  await pagina.unroute('**/negocios');
  negocios = [];
  await pagina.locator('[data-plataforma-actualizar]').click();
  await pagina.getByRole('heading', { name: 'Aún no hay negocios' }).waitFor();
  await pagina.goto(`${origen}/admin/plataforma?demo=1`);
  await pagina.locator('.plataforma-tabla').waitFor();
  for (const ancho of [1366, 390]) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    for (const tema of ['light', 'dark']) {
      await pagina.evaluate((tema) => document.documentElement.dataset.theme = tema, tema);
      assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `demo/${ancho}/${tema}`);
      await pagina.screenshot({ animations: 'disabled', fullPage: true, path: `test-results/plataforma/demo-${ancho}-${tema}.png` });
    }
  }
  await pagina.locator('[data-cambiar-estado-negocio]').first().click();
  await pagina.locator('#confirmar-estado-negocio').click();
  await pagina.getByText('Estado del negocio actualizado.', { exact: true }).waitFor();
  await pagina.getByRole('button', { name: 'Renovar licencia', exact: true }).first().click();
  await pagina.getByText('Licencia de demostración renovada por 90 días.', { exact: true }).waitFor();
  assert.equal(await pagina.locator('[data-detalle-negocio]').count(), 0);
  await pagina.getByRole('button', { name: 'Registrar negocio', exact: true }).click();
  const formulario = pagina.getByRole('dialog');
  await formulario.getByLabel('Nombre del negocio').fill('Consultorio de prueba');
  await formulario.getByLabel('Slug del portal').fill('consultorio-prueba');
  await formulario.getByLabel('Correo de contacto').fill('consultorio@example.test');
  await formulario.getByRole('button', { name: 'Guardar' }).click();
  await pagina.getByText('Consultorio de prueba', { exact: true }).waitFor();
  await pagina.goto(`${origen}/admin/configuracion?demo=1`);
  await pagina.getByRole('button', { name: 'Cambiar negocio' }).click();
  const espacios = pagina.getByRole('dialog');
  await espacios.locator('[data-elegir-negocio]:enabled:not(.seleccionada)').first().click();
  await pagina.getByText(/^Espacio actual:/).waitFor();
  assert.deepEqual(errores, []);
  console.log('OK: Plataforma en escritorio y móvil, ambos temas, alta conectada, búsqueda, filtros, paginación, detalle, actualización, error y vacío. Demo: suspensión, renovación, alta y cambio de negocio. API simulada.');
} finally { await navegador.close(); }
