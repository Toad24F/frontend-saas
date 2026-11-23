import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

for (const tema of ['light', 'dark']) {
  for (const ancho of [390, 1280]) {
    test('M5-T097 presentación de seguimiento ' + tema + ' ' + ancho, async ({ page: pagina }) => {
      await pagina.setViewportSize({ width: ancho, height: 850 });
      await prepararSesion(pagina, 'recepcionista', tema);
      let estadoMensaje = 'fallido';
      await pagina.route((url) => url.pathname === '/citas/7', (ruta) => ruta.fulfill({ json: {
        id: 7, version: 2, estado: 'pendiente', fechaLocal: '2026-11-23', horaInicio: '12:00:00',
        fechaFinLocal: '2026-11-23', horaFin: '12:30:00', zonaHoraria: 'America/Chihuahua',
        nombreContacto: 'Paciente QA', seguimiento: { estado: 'seguimiento_manual',
          motivoSeguimiento: 'WhatsApp informó un fallo de entrega.',
          envios: [{ tipo: 'inicial_pendiente', estado: estadoMensaje }, { tipo: 'recordatorio', estado: 'leido' }] },
      } }));
      await pagina.goto('/admin/agenda');
      const cita = pagina.locator('[data-agenda-cita="7"]');
      await cita.click();
      const detalle = pagina.getByRole('dialog');
      const seguimiento = detalle.getByRole('region', { name: 'Confirmación y comunicación' });
      await expect(seguimiento).toContainText('Seguimiento manual');
      await expect(seguimiento).toContainText('Fallido');
      await expect(seguimiento).toContainText('Leído');
      await expect(seguimiento).toContainText('WhatsApp informó un fallo de entrega.');
      await expect(detalle).toContainText('Pendiente');
      expect(await seguimiento.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      if (tema === 'light' && ancho === 1280) {
        // Un acuse cambia la comunicación sin incrementar la versión de la cita.
        estadoMensaje = 'entregado';
        await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect(seguimiento).toContainText('Entregado');
      }
      await pagina.keyboard.press('Escape');
      await expect(cita).toBeFocused();
    });
  }
}

test('M5-T097 identifica la comunicación inactiva en el detalle de la demo', async ({ page: pagina }) => {
  await pagina.setViewportSize({ width: 390, height: 850 });
  await pagina.addInitScript(() => localStorage.setItem('cita-theme', 'dark'));
  await pagina.goto('/admin/agenda?demo=1');
  await pagina.locator('[data-cita]').first().click();
  await expect(pagina.getByRole('dialog').getByRole('region', { name: 'Confirmación y comunicación' }))
    .toContainText('La comunicación por WhatsApp está inactiva en esta demostración.');
});