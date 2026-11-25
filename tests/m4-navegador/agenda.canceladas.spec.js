import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const ancho of [1366, 390]) for (const tema of ['dark', 'light']) {
  test(`agrupa las canceladas en las dos vistas diarias a ${ancho}px en tema ${tema}`, async ({ page: pagina }, prueba) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.emulateMedia({ reducedMotion: 'reduce' });
    await pagina.clock.setFixedTime(new Date('2026-11-27T18:00:00Z'));
    await prepararSesion(pagina, 'recepcionista', tema);
    const dia = '2026-11-27';
    const cita = (id, estado, nombreContacto, personalId = 1, horaInicio = '08:00:00', horaFin = '08:30:00') => ({
      id, version: 1, estado, nombreContacto, personalId, sucursalId: 1, nombreSucursal: 'Norte', nombreServicio: 'Valoración',
      nombreProfesional: personalId === 1 ? 'Ana Beltrán Demo' : 'María Soto Demo', fechaLocal: dia, fechaFinLocal: dia,
      horaInicio, horaFin, zonaHoraria: 'America/Chihuahua', causas: [], origen: 'manual',
    });
    const registros = [cita(1, 'pendiente', 'Jesús Navarro'), cita(7, 'cancelada', 'Jesús Mora'),
      cita(8, 'cancelada', 'Jesús Félix'), cita(9, 'cancelada', 'Jesús Lara', 1, '08:00:00', '08:45:00'),
      cita(10, 'confirmada', 'Laura Pérez', 2), cita(11, 'confirmada', 'Nora Paz', 1, '09:00:00', '09:30:00')];
    await pagina.route((url) => url.pathname === '/citas', (ruta) => {
      const filtro = new URL(ruta.request().url()).searchParams;
      const desde = filtro.get('desde'), hasta = filtro.get('hasta');
      return ruta.fulfill({ json: { desde, hasta, citas: registros.filter((elemento) => desde <= dia && dia <= hasta &&
        (!filtro.has('personalId') || elemento.personalId === Number(filtro.get('personalId')))) } });
    });
    await pagina.route((url) => url.pathname === '/citas/7', (ruta) => ruta.fulfill({ json: registros[1] }));
    await pagina.goto('/admin/agenda');
    await pagina.locator('[data-agenda-vista="day"]').click();

    const grupo = pagina.getByRole('button', { name: /Ver 3 citas canceladas de Ana Beltrán Demo/ });
    const pendiente = pagina.locator('[data-agenda-cita="1"]');
    const panel = pagina.getByRole('dialog', { name: 'Citas canceladas' });
    for (const vista of ['varios', 'individual']) {
      await expect(grupo).toBeVisible();
      await expect(pagina.locator('.calendario-evento.cancelada')).toHaveCount(0);
      const bloquePendiente = await pendiente.boundingBox(), bloqueCanceladas = await grupo.boundingBox();
      expect(Math.abs(bloquePendiente.y - bloqueCanceladas.y)).toBeLessThanOrEqual(2);
      expect(bloquePendiente.x + bloquePendiente.width).toBeLessThan(bloqueCanceladas.x);
      expect(bloquePendiente.width).toBeGreaterThan(bloqueCanceladas.width);
      if (vista === 'varios') {
        await expect(pagina.locator('[data-calendario-profesional="1"] [data-agenda-canceladas]')).toHaveCount(1);
        await expect(pagina.locator('[data-calendario-profesional="2"] [data-agenda-cita="10"]')).toBeVisible();
      }
      await grupo.scrollIntoViewIfNeeded();
      await pagina.screenshot({ path: prueba.outputPath(`bloque-${vista}.png`), animations: 'disabled' });
      await grupo.click();
      await expect(panel).toContainText('08:00–08:45 · Ana Beltrán Demo');
      await expect(panel).toHaveCSS('width', ancho === 1366 ? '420px' : '390px');
      await expect(panel.getByRole('listitem')).toHaveCount(3);
      await expect(panel.getByRole('button', { name: /Jesús Lara/ })).toContainText('08:00–08:45');
      await pagina.screenshot({ path: prueba.outputPath(`canceladas-${vista}.png`), animations: 'disabled' });
      if (vista === 'varios') {
        await pagina.keyboard.press('Escape');
        await expect(grupo).toBeFocused();
        await pagina.getByLabel('Profesional', { exact: true }).selectOption('1');
        await expect(pagina.locator('[data-calendario-profesional]')).toHaveCount(0);
        await expect(pagina.locator('[data-agenda-cita="10"]')).toHaveCount(0);
      }
    }
    await panel.getByRole('button', { name: /Jesús Mora/ }).click();
    const detalle = pagina.getByRole('dialog', { name: 'Detalle de la cita' });
    await expect(detalle).toContainText('Jesús Mora');
    await pagina.keyboard.press('Escape');
    await expect(grupo).toBeFocused();
  });
}

test('la demo abre el detalle de una cancelada desde su grupo', async ({ page: pagina }) => {
  await pagina.goto('/admin/agenda?demo=1');
  await pagina.getByRole('heading', { name: 'Agenda', exact: true }).waitFor();
  await pagina.evaluate(async () => {
    const { datosAplicacion, HOY } = await import('/src/shared/aplicacion.datos.js');
    const cita = datosAplicacion.appointments.find((elemento) => elemento.date === HOY && elemento.status === 'confirmada');
    datosAplicacion.appointments.push({ ...cita, id: 9001, status: 'cancelada' }, { ...cita, id: 9002, clientId: 1, status: 'cancelada' });
  });
  await pagina.getByLabel('Sucursal', { exact: true }).selectOption('all');
  await pagina.locator('[data-agenda-vista-demo="day"]').click();
  const grupo = pagina.getByRole('button', { name: /Ver 2 citas canceladas/ });
  await grupo.click();
  const panel = pagina.getByRole('dialog', { name: 'Citas canceladas' });
  await expect(panel.getByRole('listitem')).toHaveCount(2);
  await panel.getByRole('button', { name: /María González/ }).click();
  await expect(pagina.getByRole('dialog', { name: 'Detalle de la cita' })).toContainText('María González');
  await pagina.keyboard.press('Escape');
  await expect(grupo).toBeFocused();
});
