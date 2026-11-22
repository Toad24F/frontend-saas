import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

async function preparar(pagina, rol = 'recepcionista', tema = 'light', ajustes = {}) {
  const datosPrueba = await prepararSesion(pagina, rol, tema);
  await pagina.clock.setFixedTime(new Date('2026-11-12T18:00:00Z'));
  let detalle = { id: 7, version: 2, folio: 'M4-0007', estado: 'confirmada', origen: 'manual',
    nombreContacto: 'Paciente <QA>', telefonoContacto: '6145550101', motivoConsulta: 'Nota', nombreServicio: 'Consulta',
    nombreSucursal: 'Sucursal QA', nombreProfesional: 'Profesional QA', costoAceptado: '200.00',
    fechaLocal: '2026-11-13', fechaFinLocal: '2026-11-13', horaInicio: '10:00:00', horaFin: '10:30:00',
    inicioUtc: '2026-11-13T17:00:00Z', finUtc: '2026-11-13T17:30:00Z', zonaHoraria: 'America/Mazatlan', causas: [], ...ajustes };
  const escrituras = [];
  await pagina.route((url) => url.pathname === '/citas/7', (rutaInterceptada) => rutaInterceptada.fulfill({ json: detalle }));
  await pagina.route((url) => url.pathname === '/citas/7/estado', async (rutaInterceptada) => {
    const cuerpo = rutaInterceptada.request().postDataJSON(); escrituras.push(cuerpo);
    detalle = { ...detalle, estado: cuerpo.estado, version: detalle.version + 1 };
    await rutaInterceptada.fulfill({ json: { id: 7, folio: detalle.folio, estado: detalle.estado, version: detalle.version } });
  });
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  return { ...datosPrueba, escrituras };
}
async function pulsacionLarga(tarjeta) {
  await tarjeta.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 120, clientY: 300 });
  await expect(tarjeta.page().getByRole('menu', { name: 'Cambiar estado de la cita' })).toBeVisible();
  await tarjeta.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 1 });
  await tarjeta.dispatchEvent('click');
}
const disparador = (pagina) => pagina.locator('[data-agenda-menu-estado="7"]');
const menu = (pagina) => pagina.getByRole('menu', { name: 'Cambiar estado de la cita' });
const cancelar = (pagina) => menu(pagina).getByRole('menuitemradio', { name: 'Cancelada', exact: true });

test('móvil: sin tres puntos, toque abre detalle y pulsación larga abre menú sin abrir detalle', async ({ page: pagina }) => {
  await pagina.setViewportSize({ width: 390, height: 900 });
  const { escrituras } = await preparar(pagina);
  await expect(pagina.locator('.agenda-state-trigger')).toHaveCount(0);
  await disparador(pagina).click();
  await expect(pagina.locator('#dialogo-app')).toBeVisible();
  await pagina.keyboard.press('Escape');
  await pulsacionLarga(disparador(pagina));
  await expect(menu(pagina)).toBeVisible();
  await expect(pagina.locator('#dialogo-app')).not.toBeVisible();
  expect(escrituras).toEqual([]);
});

test('móvil: mover, soltar o cancelar el toque impide una apertura accidental', async ({ page: pagina }) => {
  await preparar(pagina);
  await pagina.clock.install();
  for (const tipo of ['pointermove', 'pointerup', 'pointercancel', 'scroll']) {
    await disparador(pagina).dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 });
    if (tipo === 'scroll') await pagina.evaluate(() => document.dispatchEvent(new Event('scroll')));
    else await disparador(pagina).dispatchEvent(tipo, { pointerType: 'touch', pointerId: 1, clientX: 130, clientY: 300 });
    await pagina.clock.runFor(600);
    await expect(menu(pagina)).toHaveCount(0);
  }
});

test('menú: clic derecho, teclado, estado vigente y restricciones temporales', async ({ page: pagina }) => {
  const { escrituras, errores } = await preparar(pagina);
  await pagina.locator('[data-agenda-cita="7"]').click({ button: 'right' });
  await expect(menu(pagina)).toContainText('Paciente <QA>');
  await expect(menu(pagina).getByRole('menuitemradio', { checked: true })).toContainText('Confirmada');
  await expect(menu(pagina).getByRole('menuitemradio', { name: /Completada/ })).toBeDisabled();
  await expect(menu(pagina).getByRole('menuitemradio', { name: /No asistió/ })).toBeDisabled();
  await expect(menu(pagina).getByRole('menuitemradio', { name: 'Pendiente', exact: true })).toBeFocused();
  await pagina.keyboard.press('ArrowDown'); await expect(cancelar(pagina)).toBeFocused();
  await pagina.keyboard.press('Escape'); await expect(disparador(pagina)).toBeFocused();
  await pagina.locator('[data-agenda-cita="7"]').focus(); await pagina.keyboard.press('Shift+F10');
  await expect(menu(pagina)).toBeVisible();
  await pagina.getByRole('heading', { name: 'Agenda', exact: true }).click();
  await expect(menu(pagina)).toHaveCount(0);
  expect(escrituras).toEqual([]); expect(errores).toEqual([]);
});

test('cambio rápido usa la versión observada, sin abrir el detalle ni duplicar envíos', async ({ page: pagina }) => {
  const { escrituras, errores } = await preparar(pagina);
  await disparador(pagina).click({ button: 'right' });
  await menu(pagina).getByRole('menuitemradio', { name: 'Pendiente', exact: true }).evaluate((boton) => { boton.click(); boton.click(); });
  await expect(pagina.getByText('Estado actualizado: Pendiente.', { exact: true })).toBeVisible();
  await expect(disparador(pagina)).toBeFocused();
  expect(escrituras).toEqual([{ estado: 'pendiente', motivo: null, version: 2 }]);
  await expect(pagina.locator('#dialogo-app')).not.toBeVisible();
  expect(errores).toEqual([]);
});

test('demo: el cambio rápido conserva el negocio de la cita y se guarda en memoria', async ({ page: pagina }) => {
  const solicitudes = [];
  await pagina.route((url) => url.port === '3000', (ruta) => {
    solicitudes.push(ruta.request().url());
    return ruta.abort();
  });
  await pagina.goto('/admin/agenda?demo=1');
  await pagina.getByLabel('Sucursal', { exact: true }).selectOption('2');
  const cita = pagina.locator('[data-agenda-menu-estado="9"]');
  await cita.click({ button: 'right' });
  await menu(pagina).getByRole('menuitemradio', { name: 'Pendiente', exact: true }).click();
  await expect(pagina.getByText('Demostración: estado Pendiente. Solo datos locales.')).toBeVisible();
  await cita.click({ button: 'right' });
  await expect(menu(pagina).getByRole('menuitemradio', { checked: true })).toContainText('Pendiente');
  expect(solicitudes).toEqual([]);
});

test('cancelar exige confirmación; conservar y Escape no escriben; confirmar incluye motivo', async ({ page: pagina }) => {
  const { escrituras, errores } = await preparar(pagina);
  await disparador(pagina).click({ button: 'right' }); await cancelar(pagina).click();
  const dialogo = pagina.getByRole('dialog', { name: '¿Cancelar esta cita?' });
  await expect(dialogo).toContainText('Paciente <QA>');
  await expect(dialogo.getByRole('button', { name: 'Conservar cita' })).toBeFocused();
  await dialogo.getByRole('button', { name: 'Conservar cita' }).click();
  expect(escrituras).toEqual([]); await expect(cancelar(pagina)).toBeFocused();
  await cancelar(pagina).click(); await pagina.keyboard.press('Escape'); expect(escrituras).toEqual([]);
  await cancelar(pagina).click(); await dialogo.getByLabel('Motivo de cancelación').fill('Solicitud del paciente <QA>');
  await dialogo.getByRole('button', { name: 'Sí, cancelar cita' }).click();
  await expect(pagina.getByText('Estado actualizado: Cancelada.', { exact: true })).toBeVisible();
  expect(escrituras).toEqual([{ estado: 'cancelada', motivo: 'Solicitud del paciente <QA>', version: 2 }]);
  expect(errores).toEqual([]);
});

test('cancelación desde el editor conserva el detalle y borrador al rechazar', async ({ page: pagina }) => {
  const { escrituras, errores } = await preparar(pagina);
  await pagina.locator('[data-agenda-cita="7"]').click();
  const detalle = pagina.locator('#dialogo-app');
  await detalle.getByLabel('Estado de la cita', { exact: true }).selectOption('cancelada');
  await detalle.getByLabel('Motivo del cambio').fill('Borrador de motivo');
  await detalle.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  await expect(pagina.locator('.agenda-dialogo-cancelacion')).toContainText('liberará el horario');
  await pagina.getByRole('button', { name: 'Conservar cita', exact: true }).click();
  await expect(detalle.getByLabel('Motivo del cambio')).toHaveValue('Borrador de motivo');
  await expect(detalle.getByRole('button', { name: 'Guardar estado', exact: true })).toBeFocused();
  expect(escrituras).toEqual([]);
  await detalle.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  await pagina.getByRole('button', { name: 'Sí, cancelar cita' }).click();
  await expect.poll(() => escrituras.length).toBe(1);
  expect(escrituras[0]).toEqual({ estado: 'cancelada', motivo: 'Borrador de motivo', version: 2 });
  expect(errores).toEqual([]);
});

test('409 obliga a actualizar antes de otro cambio y no anuncia éxito', async ({ page: pagina }) => {
  const { escrituras } = await preparar(pagina);
  let intentos = 0;
  await pagina.route((url) => url.pathname === '/citas/7/estado', async (rutaInterceptada) => {
    intentos++; await rutaInterceptada.fulfill({ status: 409, json: { message: 'Conflicto' } });
  });
  await disparador(pagina).click({ button: 'right' }); await menu(pagina).getByRole('menuitemradio', { name: 'Pendiente', exact: true }).click();
  await expect(menu(pagina).getByRole('alert')).toContainText('Conflicto');
  await expect(menu(pagina).getByRole('menuitemradio')).toHaveCount(0);
  await expect(pagina.getByText('Estado actualizado: Pendiente.', { exact: true })).toHaveCount(0);
  expect(intentos).toBe(1); expect(escrituras).toEqual([]);
  await menu(pagina).getByRole('menuitem', { name: 'Actualizar cita', exact: true }).click();
  await expect(cancelar(pagina)).toBeEnabled();
});

test('cita cancelada pasada bloquea reactivación; cita terminada permite estados finales', async ({ page: pagina }) => {
  await preparar(pagina, 'recepcionista', 'light', { estado: 'cancelada', fechaLocal: '2026-11-11', fechaFinLocal: '2026-11-11', inicioUtc: '2026-11-11T17:00:00Z', finUtc: '2026-11-11T17:30:00Z' });
  await disparador(pagina).click({ button: 'right' });
  for(const siguiente of ['Pendiente', 'Confirmada', 'Completada', 'No asistió']) await expect(menu(pagina).getByRole('menuitemradio', { name: new RegExp(siguiente) })).toBeDisabled();
  await pagina.keyboard.press('Escape');
  await pagina.route((url) => url.pathname === '/citas/7', (rutaInterceptada) => rutaInterceptada.fulfill({ json: { id: 7, version: 2, folio:'M4-0007', estado:'confirmada', nombreContacto:'Paciente QA', fechaLocal:'2026-11-11', fechaFinLocal:'2026-11-11', horaInicio:'10:00:00', horaFin:'10:30:00', zonaHoraria:'America/Mazatlan' } }));
  await disparador(pagina).click({ button: 'right' });
  await expect(menu(pagina).getByRole('menuitemradio', { name: 'Completada', exact: true })).toBeEnabled();
});

test('T033: Profesional consulta y abre su menú de gestión en las tres vistas', async ({ page: pagina }) => {
  const { escrituras } = await preparar(pagina, 'profesional');
  for(const vista of ['day','week','month']) {
    await pagina.locator(`[data-agenda-vista="${vista}"]`).click();
    await expect(pagina.locator('[data-agenda-menu-estado]')).not.toHaveCount(0);
    await pagina.locator('[data-agenda-cita="7"]').click({ button: 'right' });
    await expect(menu(pagina)).toBeVisible();
    await pagina.keyboard.press('Escape');
  }
  expect(escrituras).toEqual([]);
});

for (const ancho of [1366,390]) for (const tema of ['light','dark']) {
 test(`menú y confirmación en ${ancho}px ${tema}, conectado/demo`, async ({ page: pagina }) => {
  await pagina.setViewportSize({width: ancho,height:900});
  const {errores}=await preparar(pagina,'recepcionista',tema);
  for(const modo of ['connected','demo']) {
   if(modo==='demo') {await pagina.goto('/admin/agenda?demo=1'); await expect(pagina.locator('[data-cita]').first()).toBeVisible();}
   const boton=pagina.locator('[data-agenda-menu-estado]').first();
   if (ancho === 390) await pulsacionLarga(boton); else await boton.click({ button: "right" }); await expect(menu(pagina)).toBeVisible();
   const rectangulo=await menu(pagina).boundingBox(); expect(rectangulo.x).toBeGreaterThanOrEqual(0);expect(rectangulo.x+rectangulo.width).toBeLessThanOrEqual(ancho);
   await pagina.screenshot({path:`test-results/m4/state-menu-${modo}-${ancho}-${tema}.png`});
   await cancelar(pagina).click(); const dialogo=pagina.locator('.agenda-dialogo-cancelacion');await expect(dialogo).toBeVisible();
   const cuadro=await dialogo.boundingBox();expect(cuadro.x).toBeGreaterThanOrEqual(0);expect(cuadro.x+cuadro.width).toBeLessThanOrEqual(ancho);
   await pagina.screenshot({path:`test-results/m4/state-cancel-${modo}-${ancho}-${tema}.png`});
   await pagina.keyboard.press('Escape');await pagina.keyboard.press('Escape');
   expect(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(errores).toEqual([]);
 });
}
