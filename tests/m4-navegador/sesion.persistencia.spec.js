import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

test('nuevo contexto de navegador restaura el acceso persistente y valida perfil', async ({ page: pagina, browser: navegador }) => {
  await prepararSesion(pagina);
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  await expect.poll(() => pagina.evaluate(() => localStorage.getItem('cita-session'))).toBe('m4-test');
  // storageState conserva localStorage; las sesiones de pestaña no forman parte de esa instantánea.
  const persistido = await pagina.context().storageState();
  await pagina.close();
  const contextoReabierto = await navegador.newContext({ storageState: persistido });
  try {
    const reabierta = await contextoReabierto.newPage();
    const { solicitudesObservadas: observado, errores } = await prepararSesion(reabierta, 'recepcionista', 'light', false);
    await reabierta.addInitScript(() => sessionStorage.removeItem('cita-session'));
    await reabierta.goto('/admin/agenda');
    await expect(reabierta.locator('[data-agenda-cita="7"]')).toBeVisible();
    expect(observado).toContain('GET /auth/profile');
    expect(observado).not.toContain('POST /auth/login');
    expect(errores).toEqual([]);
  } finally { await contextoReabierto.close(); }
});

test('acceso persistido vencido exige iniciar sesión y limpia el almacenamiento', async ({ page: pagina }) => {
  const { solicitudesObservadas: observado } = await prepararSesion(pagina);
  await pagina.addInitScript(() => { sessionStorage.removeItem('cita-session'); localStorage.setItem('cita-session', 'expired-test'); });
  await pagina.route((url) => url.pathname === '/auth/profile', (rutaInterceptada) => rutaInterceptada.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('input[type="password"]').first()).toBeVisible();
  await expect(pagina.getByText('Tu sesión venció. Por favor, inicia sesión de nuevo.', { exact: true })).toBeVisible();
  await expect(pagina.getByText('Unauthorized', { exact: true })).toHaveCount(0);
  expect(await pagina.evaluate(() => localStorage.getItem('cita-session'))).toBeNull();
  expect(await pagina.evaluate(() => sessionStorage.getItem('cita-session'))).toBeNull();
  expect(observado).not.toContain('GET /citas');
});

test('cerrar sesión en otra pestaña retira el panel de la pestaña abierta', async ({ page: pagina, context: contexto }) => {
  await prepararSesion(pagina); await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  const otro = await contexto.newPage();
  try {
    await prepararSesion(otro); await otro.goto('/admin/agenda');
    await expect(otro.locator('[data-agenda-cita="7"]')).toBeVisible();
    await otro.evaluate(() => localStorage.removeItem('cita-session'));
    await expect(pagina.locator('input[type="password"]').first()).toBeVisible();
    expect(await pagina.evaluate(() => sessionStorage.getItem('cita-session'))).toBeNull();
  } finally { await otro.close(); }
});

test('cerrar la sesión conectada no sustituye la demo por el formulario de ingreso', async ({ page: pagina, context: contexto }) => {
  await prepararSesion(pagina); await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  const demo = await contexto.newPage();
  try {
    await demo.goto('/admin/agenda?demo=1');
    await expect(demo.locator('[data-cita]').first()).toBeVisible();
    await pagina.evaluate(() => localStorage.removeItem('cita-session'));
    await demo.evaluate(() => new Promise((resolverPromesa) => requestAnimationFrame(() => requestAnimationFrame(resolverPromesa))));
    await expect(demo.locator('[data-cita]').first()).toBeVisible();
    await expect(demo.locator('input[type="password"]')).toHaveCount(0);
  } finally { await demo.close(); }
});
