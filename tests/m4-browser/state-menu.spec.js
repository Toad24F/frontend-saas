import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

async function prepare(page, role = 'recepcionista', theme = 'light', overrides = {}) {
  const fixture = await setup(page, role, theme);
  await page.clock.setFixedTime(new Date('2026-11-12T18:00:00Z'));
  let detail = { id: 7, version: 2, folio: 'M4-0007', estado: 'confirmada', origen: 'manual',
    nombreContacto: 'Paciente <QA>', telefonoContacto: '6145550101', motivoConsulta: 'Nota', nombreServicio: 'Consulta',
    nombreSucursal: 'Sucursal QA', nombreProfesional: 'Profesional QA', costoAceptado: '200.00',
    fechaLocal: '2026-11-13', fechaFinLocal: '2026-11-13', horaInicio: '10:00:00', horaFin: '10:30:00',
    inicioUtc: '2026-11-13T17:00:00Z', finUtc: '2026-11-13T17:30:00Z', zonaHoraria: 'America/Mazatlan', causas: [], ...overrides };
  const writes = [];
  await page.route((url) => url.pathname === '/citas/7', (route) => route.fulfill({ json: detail }));
  await page.route((url) => url.pathname === '/citas/7/estado', async (route) => {
    const body = route.request().postDataJSON(); writes.push(body);
    detail = { ...detail, estado: body.estado, version: detail.version + 1 };
    await route.fulfill({ json: { id: 7, folio: detail.folio, estado: detail.estado, version: detail.version } });
  });
  await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  return { ...fixture, writes };
}
async function longPress(card) {
  await card.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 120, clientY: 300 });
  await expect(card.page().getByRole('menu', { name: 'Cambiar estado de la cita' })).toBeVisible();
  await card.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 1 });
  await card.dispatchEvent('click');
}
const trigger = (page) => page.locator('[data-agenda-state-menu="7"]');
const menu = (page) => page.getByRole('menu', { name: 'Cambiar estado de la cita' });
const cancel = (page) => menu(page).getByRole('menuitemradio', { name: 'Cancelada', exact: true });

test('móvil: sin tres puntos, toque abre detalle y pulsación larga abre menú sin abrir detalle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const { writes } = await prepare(page);
  await expect(page.locator('.agenda-state-trigger')).toHaveCount(0);
  await trigger(page).click();
  await expect(page.locator('#app-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await longPress(trigger(page));
  await expect(menu(page)).toBeVisible();
  await expect(page.locator('#app-dialog')).not.toBeVisible();
  expect(writes).toEqual([]);
});

test('móvil: mover, soltar o cancelar el toque impide una apertura accidental', async ({ page }) => {
  await prepare(page);
  await page.clock.install();
  for (const type of ['pointermove', 'pointerup', 'pointercancel', 'scroll']) {
    await trigger(page).dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 });
    if (type === 'scroll') await page.evaluate(() => document.dispatchEvent(new Event('scroll')));
    else await trigger(page).dispatchEvent(type, { pointerType: 'touch', pointerId: 1, clientX: 130, clientY: 300 });
    await page.clock.runFor(600);
    await expect(menu(page)).toHaveCount(0);
  }
});

test('menú: clic derecho, teclado, estado vigente y restricciones temporales', async ({ page }) => {
  const { writes, errors } = await prepare(page);
  await page.locator('[data-m4-appointment="7"]').click({ button: 'right' });
  await expect(menu(page)).toContainText('Paciente <QA>');
  await expect(menu(page).getByRole('menuitemradio', { checked: true })).toContainText('Confirmada');
  await expect(menu(page).getByRole('menuitemradio', { name: /Completada/ })).toBeDisabled();
  await expect(menu(page).getByRole('menuitemradio', { name: /No asistió/ })).toBeDisabled();
  await expect(menu(page).getByRole('menuitemradio', { name: 'Pendiente', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(cancel(page)).toBeFocused();
  await page.keyboard.press('Escape'); await expect(trigger(page)).toBeFocused();
  await page.locator('[data-m4-appointment="7"]').focus(); await page.keyboard.press('Shift+F10');
  await expect(menu(page)).toBeVisible();
  await page.getByRole('heading', { name: 'Agenda', exact: true }).click();
  await expect(menu(page)).toHaveCount(0);
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});

test('cambio rápido usa la versión observada, sin abrir el detalle ni duplicar envíos', async ({ page }) => {
  const { writes, errors } = await prepare(page);
  await trigger(page).click({ button: 'right' });
  await menu(page).getByRole('menuitemradio', { name: 'Pendiente', exact: true }).evaluate((button) => { button.click(); button.click(); });
  await expect(page.getByText('Estado actualizado: Pendiente.', { exact: true })).toBeVisible();
  await expect(trigger(page)).toBeFocused();
  expect(writes).toEqual([{ estado: 'pendiente', motivo: null, version: 2 }]);
  await expect(page.locator('#app-dialog')).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('cancelar exige confirmación; conservar y Escape no escriben; confirmar incluye motivo', async ({ page }) => {
  const { writes, errors } = await prepare(page);
  await trigger(page).click({ button: 'right' }); await cancel(page).click();
  const dialog = page.getByRole('dialog', { name: '¿Cancelar esta cita?' });
  await expect(dialog).toContainText('Paciente <QA>');
  await expect(dialog.getByRole('button', { name: 'Conservar cita' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Conservar cita' }).click();
  expect(writes).toEqual([]); await expect(cancel(page)).toBeFocused();
  await cancel(page).click(); await page.keyboard.press('Escape'); expect(writes).toEqual([]);
  await cancel(page).click(); await dialog.getByLabel('Motivo de cancelación').fill('Solicitud del paciente <QA>');
  await dialog.getByRole('button', { name: 'Sí, cancelar cita' }).click();
  await expect(page.getByText('Estado actualizado: Cancelada.', { exact: true })).toBeVisible();
  expect(writes).toEqual([{ estado: 'cancelada', motivo: 'Solicitud del paciente <QA>', version: 2 }]);
  expect(errors).toEqual([]);
});

test('cancelación desde el editor conserva el detalle y borrador al rechazar', async ({ page }) => {
  const { writes, errors } = await prepare(page);
  await page.locator('[data-m4-appointment="7"]').click();
  const detail = page.locator('#app-dialog');
  await detail.getByLabel('Estado de la cita', { exact: true }).selectOption('cancelada');
  await detail.getByLabel('Motivo del cambio').fill('Borrador de motivo');
  await detail.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  await expect(page.locator('.agenda-cancel-dialog')).toContainText('liberará el horario');
  await page.getByRole('button', { name: 'Conservar cita', exact: true }).click();
  await expect(detail.getByLabel('Motivo del cambio')).toHaveValue('Borrador de motivo');
  await expect(detail.getByRole('button', { name: 'Guardar estado', exact: true })).toBeFocused();
  expect(writes).toEqual([]);
  await detail.getByRole('button', { name: 'Guardar estado', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, cancelar cita' }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toEqual({ estado: 'cancelada', motivo: 'Borrador de motivo', version: 2 });
  expect(errors).toEqual([]);
});

test('409 obliga a actualizar antes de otro cambio y no anuncia éxito', async ({ page }) => {
  const { writes } = await prepare(page);
  let attempts = 0;
  await page.route((url) => url.pathname === '/citas/7/estado', async (route) => {
    attempts++; await route.fulfill({ status: 409, json: { message: 'Conflicto' } });
  });
  await trigger(page).click({ button: 'right' }); await menu(page).getByRole('menuitemradio', { name: 'Pendiente', exact: true }).click();
  await expect(menu(page).getByRole('alert')).toContainText('Conflicto');
  await expect(menu(page).getByRole('menuitemradio')).toHaveCount(0);
  await expect(page.getByText('Estado actualizado: Pendiente.', { exact: true })).toHaveCount(0);
  expect(attempts).toBe(1); expect(writes).toEqual([]);
  await menu(page).getByRole('menuitem', { name: 'Actualizar cita', exact: true }).click();
  await expect(cancel(page)).toBeEnabled();
});

test('cita cancelada pasada bloquea reactivación; cita terminada permite estados finales', async ({ page }) => {
  await prepare(page, 'recepcionista', 'light', { estado: 'cancelada', fechaLocal: '2026-11-11', fechaFinLocal: '2026-11-11', inicioUtc: '2026-11-11T17:00:00Z', finUtc: '2026-11-11T17:30:00Z' });
  await trigger(page).click({ button: 'right' });
  for(const next of ['Pendiente', 'Confirmada', 'Completada', 'No asistió']) await expect(menu(page).getByRole('menuitemradio', { name: new RegExp(next) })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.route((url) => url.pathname === '/citas/7', (route) => route.fulfill({ json: { id: 7, version: 2, folio:'M4-0007', estado:'confirmada', nombreContacto:'Paciente QA', fechaLocal:'2026-11-11', fechaFinLocal:'2026-11-11', horaInicio:'10:00:00', horaFin:'10:30:00', zonaHoraria:'America/Mazatlan' } }));
  await trigger(page).click({ button: 'right' });
  await expect(menu(page).getByRole('menuitemradio', { name: 'Completada', exact: true })).toBeEnabled();
});

test('Profesional conserva consulta sin menú de gestión en las tres vistas', async ({ page }) => {
  const { writes } = await prepare(page, 'profesional');
  for(const view of ['day','week','month']) {
    await page.locator(`[data-m4-view="${view}"]`).click();
    await expect(page.locator('[data-agenda-state-menu]')).toHaveCount(0);
    await page.locator('[data-m4-appointment="7"]').click({ button: 'right' });
    await expect(menu(page)).toHaveCount(0);
  }
  expect(writes).toEqual([]);
});

for (const width of [1366,390]) for (const theme of ['light','dark']) {
 test(`menú y confirmación en ${width}px ${theme}, conectado/demo`, async ({ page }) => {
  await page.setViewportSize({width,height:900});
  const {errors}=await prepare(page,'recepcionista',theme);
  for(const mode of ['connected','demo']) {
   if(mode==='demo') {await page.goto('/admin/agenda?demo=1'); await expect(page.locator('[data-appointment]').first()).toBeVisible();}
   const button=page.locator('[data-agenda-state-menu]').first();
   if (width === 390) await longPress(button); else await button.click({ button: "right" }); await expect(menu(page)).toBeVisible();
   const rect=await menu(page).boundingBox(); expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width);
   await page.screenshot({path:`test-results/m4/state-menu-${mode}-${width}-${theme}.png`});
   await cancel(page).click(); const dialog=page.locator('.agenda-cancel-dialog');await expect(dialog).toBeVisible();
   const box=await dialog.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
   await page.screenshot({path:`test-results/m4/state-cancel-${mode}-${width}-${theme}.png`});
   await page.keyboard.press('Escape');await page.keyboard.press('Escape');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
 });
}
