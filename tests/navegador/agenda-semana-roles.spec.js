import { test, expect } from './integracion.utilidades.js';
import { consultarFilas, urlPortal } from './integracion.utilidades.js';

const origen = () => process.env.PORTAL_TEST_ORIGIN;
const fechaConDesplazamiento = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
let sesionAdmin;

async function iniciarSesion(pagina, correo, ruta = '/admin/disponibilidad/equipo') {
  // Reutiliza el token ficticio del mismo worker para respetar el límite real
  // de cinco inicios de sesión por IP al correr junto con otras pruebas.
  if (correo === 'admin-qa-1@example.test' && sesionAdmin) {
    await pagina.addInitScript((token) => sessionStorage.setItem('cita-session', token), sesionAdmin);
    await pagina.goto(`${origen()}${ruta}`);
    await expect(pagina.getByRole('heading', { name: 'Inicia sesión' })).toHaveCount(0);
    return;
  }
  await pagina.goto(`${origen()}${ruta}`);
  await pagina.getByLabel('Correo electrónico').fill(correo);
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Inicia sesión' })).toHaveCount(0);
  if (correo === 'admin-qa-1@example.test') sesionAdmin = await pagina.evaluate(() => sessionStorage.getItem('cita-session'));
  await pagina.goto(`${origen()}${ruta}`);
}

// El render conectado deja Bloqueos y franjas, sin tocar rutas ya retiradas.
test('FALA-T051: semana sin descanso ni excepciones; bloqueos permanecen', async ({ page: pagina }) => {
  const llamadas = [];
  pagina.on('request', (solicitud) => { if (solicitud.url().includes('/excepciones')) llamadas.push(solicitud.url()); });
  await iniciarSesion(pagina, 'admin-qa-1@example.test');
  await pagina.getByRole('tab', { name: 'Horario semanal' }).click();
  await expect(pagina.locator('#formulario-horario')).toBeVisible();
  await expect(pagina.locator('#formulario-horario input[name^="inicioDescanso-"]')).toHaveCount(0);
  await expect(pagina.locator('#formulario-horario')).not.toContainText('Descanso opcional');
  // Revisión visual del horario real en escritorio/móvil y ambos temas.
  await pagina.screenshot({ path: 'test-results/semana-conectada-escritorio-claro.png' });
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: 'test-results/semana-conectada-movil-claro.png' });
  await pagina.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: 'test-results/semana-conectada-movil-oscuro.png' });
  await pagina.setViewportSize({ width: 1280, height: 720 });
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: 'test-results/semana-conectada-escritorio-oscuro.png' });
  await pagina.getByRole('tab', { name: 'Bloqueos', exact: true }).click();
  await expect(pagina.getByRole('button', { name: 'Agregar bloqueo' })).toBeVisible();
  await expect(pagina.getByText('Excepciones por fecha')).toHaveCount(0);
  expect(llamadas).toEqual([]);
  await pagina.goto(`${origen()}/admin/disponibilidad/equipo?demo=1`);
  await pagina.getByRole('tab', { name: 'Horario semanal' }).click();
  await expect(pagina.locator('#formulario-horario input[name^="inicioDescanso-"]')).not.toHaveCount(0);
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: 'test-results/semana-demo-movil.png' });
});

// La navegación, identidad de consulta y modalidad manual se mantienen privadas.
test('FALA-T052: Administrador, Recepción y Profesional ven solo su consulta privada', async ({ browser: navegador }) => {
  const [persona] = await consultarFilas('SELECT personal_id AS id FROM personal_sucursales WHERE negocio_id=1 LIMIT 1');
  const [otro] = await consultarFilas('SELECT id FROM personal WHERE negocio_id=1 AND id<>? LIMIT 1', [persona.id]);
  const [sucursal] = await consultarFilas('SELECT id FROM sucursales WHERE negocio_id=1 LIMIT 1');
  const [servicio] = await consultarFilas('SELECT id FROM servicios WHERE negocio_id=1 LIMIT 1');
  for (const [correo, rol] of [
    ['admin-qa-1@example.test', 'admin'],
    ['recepcion-1-qa@example.test', 'recepcion'],
    ['qa-prof-1@example.test', 'profesional'],
  ]) {
    const contexto = await navegador.newContext();
    const pagina = await contexto.newPage();
    try {
      await iniciarSesion(pagina, correo, '/admin/disponibilidad/comprobar');
      await pagina.getByRole('tab', { name: 'Horarios disponibles' }).click();
      await expect(pagina.locator('#formulario-consulta-horarios')).toBeVisible();
      await expect(pagina.locator('#formulario-consulta-horarios [name="modalidad"] option[value="manual"]')).toHaveCount(1);
      if (rol === 'recepcion') await expect(pagina.getByRole('link', { name: 'Reglas del negocio' })).toHaveCount(0);
      if (rol === 'profesional') {
        await expect(pagina.locator('#formulario-consulta-horarios [name="personalId"]')).toHaveAttribute('type', 'hidden');
        await expect(pagina.locator('#formulario-consulta-horarios input[readonly]')).toHaveCount(1);
      }
      if (rol === 'admin') await expect(pagina.getByRole('link', { name: 'Reglas del negocio' })).toBeVisible();
      const formulario = pagina.locator('#formulario-consulta-horarios');
      if (rol === 'recepcion') {
        await formulario.locator('[name="personalId"]').fill(String(persona.id));
        await formulario.locator('[name="sucursalId"]').fill(String(sucursal.id));
        await formulario.locator('[name="servicioId"]').fill(String(servicio.id));
      }
      await formulario.locator('[name="from"]').fill(fechaConDesplazamiento(7));
      await formulario.locator('[name="to"]').fill(fechaConDesplazamiento(7));
      await formulario.locator('[name="modalidad"]').selectOption('manual');
      const respuesta = pagina.waitForResponse((elemento) => elemento.url().includes('/disponibilidad?') && elemento.request().method() === 'GET');
      await formulario.getByRole('button', { name: 'Consultar horarios' }).click();
      const consultado = await respuesta;
      expect(consultado.status()).toBe(200);
      await expect(pagina.getByText('RESULTADO PRIVADO')).toBeVisible();
      await expect(pagina.getByRole('button', { name: /reservar|apartar/i })).toHaveCount(0);
      if (rol === 'profesional') {
        const token = await pagina.evaluate(() => sessionStorage.getItem('cita-session'));
        const sinAutorizacion = new URL(consultado.url());
        sinAutorizacion.searchParams.set('personalId', String(otro.id));
        const denegado = await pagina.request.get(sinAutorizacion.toString(), { headers: { Authorization: `Bearer ${token}` } });
        expect([403, 404]).toContain(denegado.status());
      }
    } finally { await contexto.close(); }
  }
  const contextoPublico = await navegador.newContext();
  const portal = await contextoPublico.newPage();
  try {
    await portal.goto(urlPortal());
    await expect(portal.getByRole('radio', { name: /Corte QA/ })).toBeVisible();
    await expect(portal.locator('[name="modalidad"]')).toHaveCount(0);
    await expect(portal.getByText('Manual', { exact: true })).toHaveCount(0);
  } finally { await contextoPublico.close(); }
});

// El mismo servidor de test verifica valores, semana separada, bloqueo y 404
// de rutas antiguas sin escribir en la base habitual del backend.
test('FALA-T053: agenda 0/5/60, semana, bloqueo y rutas retiradas contra API', async ({ page: pagina }) => {
  await iniciarSesion(pagina, 'admin-qa-1@example.test', '/admin/disponibilidad/negocio');
  const token = await pagina.evaluate(() => sessionStorage.getItem('cita-session'));
  const respuestaConfiguracion = pagina.waitForResponse((respuesta) => respuesta.url().endsWith('/disponibilidad/configuracion') && respuesta.request().method() === 'GET');
  await pagina.reload();
  const origenApi = new URL((await respuestaConfiguracion).url()).origin;
  const cabeceras = { Authorization: `Bearer ${token}` };
  const configuracion = (espacio) => ({ modo: 'ventana_libre', tiempoEntreCitasMinutos: espacio, anticipacionMinutos: 15, diasFuturos: 60 });
  for (const espacio of [0, 5, 60]) {
    const guardado = await pagina.request.put(`${origenApi}/disponibilidad/configuracion`, { headers: cabeceras, data: configuracion(espacio) });
    expect(guardado.status()).toBe(200);
    expect((await guardado.json()).tiempoEntreCitasMinutos).toBe(espacio);
  }
  for (const espacioPrueba of [-5, 7, 65]) {
    const rechazado = await pagina.request.put(`${origenApi}/disponibilidad/configuracion`, { headers: cabeceras, data: configuracion(espacioPrueba) });
    expect(rechazado.status()).toBe(400);
  }
  const [persona] = await consultarFilas('SELECT personal_id AS id FROM personal_sucursales WHERE negocio_id=1 LIMIT 1');
  const [sucursal] = await consultarFilas('SELECT id FROM sucursales WHERE negocio_id=1 LIMIT 1');
  const [servicio] = await consultarFilas('SELECT id FROM servicios WHERE negocio_id=1 LIMIT 1');
  const diaSemana = new Date(`${fechaConDesplazamiento(7)}T12:00:00Z`).getUTCDay();
  const semana = { franjas: [
    { diaSemana: diaSemana, orden: 0, sucursalId: sucursal.id, inicioMinutos: 540, finMinutos: 720, activo: true },
    { diaSemana: diaSemana, orden: 1, sucursalId: sucursal.id, inicioMinutos: 780, finMinutos: 1020, activo: true },
  ] };
  expect((await pagina.request.put(`${origenApi}/profesionales/${persona.id}/horario`, { headers: cabeceras, data: semana })).status()).toBe(200);
  const fecha = fechaConDesplazamiento(7);
  const consulta = new URLSearchParams({ personalId: String(persona.id), sucursalId: String(sucursal.id), servicioId: String(servicio.id), desde: fecha, hasta: fecha, modalidad: 'manual' });
  const anterior = await pagina.request.get(`${origenApi}/disponibilidad?${consulta}`, { headers: cabeceras });
  expect(anterior.status()).toBe(200);
  expect((await anterior.json()).ranuras.length).toBeGreaterThan(0);
  const bloque = await pagina.request.post(`${origenApi}/bloqueos`, { headers: cabeceras, data: {
    personalId: persona.id, sucursalId: sucursal.id, tipo: 'vacaciones', motivo: 'Prueba temporal',
    fechaInicio: fecha, fechaFin: fecha, inicioMinutos: null, finMinutos: null,
  } });
  expect(bloque.status()).toBe(201);
  const posterior = await pagina.request.get(`${origenApi}/disponibilidad?${consulta}`, { headers: cabeceras });
  expect(posterior.status()).toBe(200);
  expect((await posterior.json()).ranuras).toHaveLength(0);
  const retirado = `${origenApi}/profesionales/${persona.id}/excepciones`;
  expect((await pagina.request.get(retirado, { headers: cabeceras })).status()).toBe(404);
  expect((await pagina.request.put(`${retirado}/${fecha}`, { headers: cabeceras, data: { sucursalId: sucursal.id, franjas: [] } })).status()).toBe(404);
  expect((await pagina.request.delete(`${retirado}/${fecha}?sucursalId=${sucursal.id}`, { headers: cabeceras })).status()).toBe(404);
});
