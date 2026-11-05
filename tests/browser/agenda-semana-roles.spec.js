import { test, expect } from '@playwright/test';
import { rows, portalUrl } from './support.js';

const origin = () => process.env.PORTAL_TEST_ORIGIN;
const dateAt = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
let adminSession;

async function login(page, email, path = '/admin/disponibilidad/equipo') {
  // Reutiliza el token ficticio del mismo worker para respetar el límite real
  // de cinco inicios de sesión por IP al correr junto con otras pruebas.
  if (email === 'admin-qa-1@example.test' && adminSession) {
    await page.addInitScript((token) => sessionStorage.setItem('cita-session', token), adminSession);
    await page.goto(`${origin()}${path}`);
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toHaveCount(0);
    return;
  }
  await page.goto(`${origin()}${path}`);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#login-password').fill('PruebaLicencia2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toHaveCount(0);
  if (email === 'admin-qa-1@example.test') adminSession = await page.evaluate(() => sessionStorage.getItem('cita-session'));
  await page.goto(`${origin()}${path}`);
}

// El render conectado deja Bloqueos y franjas, sin tocar rutas ya retiradas.
test('FALA-T051: semana sin descanso ni excepciones; bloqueos permanecen', async ({ page }) => {
  const calls = [];
  page.on('request', (request) => { if (request.url().includes('/excepciones')) calls.push(request.url()); });
  await login(page, 'admin-qa-1@example.test');
  await page.getByRole('tab', { name: 'Horario semanal' }).click();
  await expect(page.locator('#schedule-form')).toBeVisible();
  await expect(page.locator('#schedule-form input[name^="break"]')).toHaveCount(0);
  await expect(page.locator('#schedule-form')).not.toContainText('Descanso opcional');
  // Revisión visual del horario real en escritorio/móvil y ambos temas.
  await page.screenshot({ path: 'test-results/semana-conectada-escritorio-claro.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/semana-conectada-movil-claro.png' });
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/semana-conectada-movil-oscuro.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/semana-conectada-escritorio-oscuro.png' });
  await page.getByRole('tab', { name: 'Bloqueos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Agregar bloqueo' })).toBeVisible();
  await expect(page.getByText('Excepciones por fecha')).toHaveCount(0);
  expect(calls).toEqual([]);
  await page.goto(`${origin()}/admin/disponibilidad/equipo?demo=1`);
  await page.getByRole('tab', { name: 'Horario semanal' }).click();
  await expect(page.locator('#schedule-form input[name^="break"]')).not.toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/semana-demo-movil.png' });
});

// La navegación, identidad de consulta y modalidad manual se mantienen privadas.
test('FALA-T052: Administrador, Recepción y Profesional ven solo su consulta privada', async ({ browser }) => {
  const [person] = await rows('SELECT personal_id AS id FROM personal_sucursales WHERE negocio_id=1 LIMIT 1');
  const [other] = await rows('SELECT id FROM personal WHERE negocio_id=1 AND id<>? LIMIT 1', [person.id]);
  const [branch] = await rows('SELECT id FROM sucursales WHERE negocio_id=1 LIMIT 1');
  const [service] = await rows('SELECT id FROM servicios WHERE negocio_id=1 LIMIT 1');
  for (const [email, role] of [
    ['admin-qa-1@example.test', 'admin'],
    ['recepcion-1-qa@example.test', 'recepcion'],
    ['qa-prof-1@example.test', 'profesional'],
  ]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await login(page, email, '/admin/disponibilidad/comprobar');
      await page.getByRole('tab', { name: 'Horarios disponibles' }).click();
      await expect(page.locator('#availability-query-form')).toBeVisible();
      await expect(page.locator('#availability-query-form [name="modalidad"] option[value="manual"]')).toHaveCount(1);
      if (role === 'recepcion') await expect(page.getByRole('link', { name: 'Reglas del negocio' })).toHaveCount(0);
      if (role === 'profesional') {
        await expect(page.locator('#availability-query-form [name="personalId"]')).toHaveAttribute('type', 'hidden');
        await expect(page.locator('#availability-query-form input[readonly]')).toHaveCount(1);
      }
      if (role === 'admin') await expect(page.getByRole('link', { name: 'Reglas del negocio' })).toBeVisible();
      const form = page.locator('#availability-query-form');
      if (role === 'recepcion') {
        await form.locator('[name="personalId"]').fill(String(person.id));
        await form.locator('[name="sucursalId"]').fill(String(branch.id));
        await form.locator('[name="servicioId"]').fill(String(service.id));
      }
      await form.locator('[name="from"]').fill(dateAt(7));
      await form.locator('[name="to"]').fill(dateAt(7));
      await form.locator('[name="modalidad"]').selectOption('manual');
      const response = page.waitForResponse((item) => item.url().includes('/disponibilidad?') && item.request().method() === 'GET');
      await form.getByRole('button', { name: 'Consultar horarios' }).click();
      const consulted = await response;
      expect(consulted.status()).toBe(200);
      await expect(page.getByText('RESULTADO PRIVADO')).toBeVisible();
      await expect(page.getByRole('button', { name: /reservar|apartar/i })).toHaveCount(0);
      if (role === 'profesional') {
        const token = await page.evaluate(() => sessionStorage.getItem('cita-session'));
        const unauthorized = new URL(consulted.url());
        unauthorized.searchParams.set('personalId', String(other.id));
        const denied = await page.request.get(unauthorized.toString(), { headers: { Authorization: `Bearer ${token}` } });
        expect([403, 404]).toContain(denied.status());
      }
    } finally { await context.close(); }
  }
  const publicContext = await browser.newContext();
  const portal = await publicContext.newPage();
  try {
    await portal.goto(portalUrl());
    await expect(portal.getByRole('radio', { name: /Corte QA/ })).toBeVisible();
    await expect(portal.locator('[name="modalidad"]')).toHaveCount(0);
    await expect(portal.getByText('Manual', { exact: true })).toHaveCount(0);
  } finally { await publicContext.close(); }
});

// El mismo servidor de test verifica valores, semana separada, bloqueo y 404
// de rutas antiguas sin escribir en la base habitual del backend.
test('FALA-T053: agenda 0/5/60, semana, bloqueo y rutas retiradas contra API', async ({ page }) => {
  await login(page, 'admin-qa-1@example.test', '/admin/disponibilidad/negocio');
  const token = await page.evaluate(() => sessionStorage.getItem('cita-session'));
  const configResponse = page.waitForResponse((response) => response.url().endsWith('/disponibilidad/configuracion') && response.request().method() === 'GET');
  await page.reload();
  const apiOrigin = new URL((await configResponse).url()).origin;
  const headers = { Authorization: `Bearer ${token}` };
  const config = (gap) => ({ modo: 'ventana_libre', tiempoEntreCitasMinutos: gap, anticipacionMinutos: 15, diasFuturos: 60 });
  for (const gap of [0, 5, 60]) {
    const saved = await page.request.put(`${apiOrigin}/disponibilidad/configuracion`, { headers, data: config(gap) });
    expect(saved.status()).toBe(200);
    expect((await saved.json()).tiempoEntreCitasMinutos).toBe(gap);
  }
  for (const gap of [-5, 7, 65]) {
    const rejected = await page.request.put(`${apiOrigin}/disponibilidad/configuracion`, { headers, data: config(gap) });
    expect(rejected.status()).toBe(400);
  }
  const [person] = await rows('SELECT personal_id AS id FROM personal_sucursales WHERE negocio_id=1 LIMIT 1');
  const [branch] = await rows('SELECT id FROM sucursales WHERE negocio_id=1 LIMIT 1');
  const [service] = await rows('SELECT id FROM servicios WHERE negocio_id=1 LIMIT 1');
  const weekday = new Date(`${dateAt(7)}T12:00:00Z`).getUTCDay();
  const week = { franjas: [
    { diaSemana: weekday, orden: 0, sucursalId: branch.id, inicioMinutos: 540, finMinutos: 720, activo: true },
    { diaSemana: weekday, orden: 1, sucursalId: branch.id, inicioMinutos: 780, finMinutos: 1020, activo: true },
  ] };
  expect((await page.request.put(`${apiOrigin}/profesionales/${person.id}/horario`, { headers, data: week })).status()).toBe(200);
  const date = dateAt(7);
  const query = new URLSearchParams({ personalId: String(person.id), sucursalId: String(branch.id), servicioId: String(service.id), desde: date, hasta: date, modalidad: 'manual' });
  const before = await page.request.get(`${apiOrigin}/disponibilidad?${query}`, { headers });
  expect(before.status()).toBe(200);
  expect((await before.json()).ranuras.length).toBeGreaterThan(0);
  const block = await page.request.post(`${apiOrigin}/bloqueos`, { headers, data: {
    personalId: person.id, sucursalId: branch.id, tipo: 'vacaciones', motivo: 'Prueba temporal',
    fechaInicio: date, fechaFin: date, inicioMinutos: null, finMinutos: null,
  } });
  expect(block.status()).toBe(201);
  const after = await page.request.get(`${apiOrigin}/disponibilidad?${query}`, { headers });
  expect(after.status()).toBe(200);
  expect((await after.json()).ranuras).toHaveLength(0);
  const retired = `${apiOrigin}/profesionales/${person.id}/excepciones`;
  expect((await page.request.get(retired, { headers })).status()).toBe(404);
  expect((await page.request.put(`${retired}/${date}`, { headers, data: { sucursalId: branch.id, franjas: [] } })).status()).toBe(404);
  expect((await page.request.delete(`${retired}/${date}?sucursalId=${branch.id}`, { headers })).status()).toBe(404);
});
