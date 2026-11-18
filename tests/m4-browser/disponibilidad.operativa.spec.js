import { test, expect } from '@playwright/test';
import { setup as prepararSesion } from './agenda-fixture.js';

const FECHA = '2030-11-12';
const REGLAS = { modo: 'ventana_libre', tiempoEntreCitasMinutos: 5, anticipacionMinutos: 15, diasFuturos: 60 };
const FRANJA = { inicioUtc: `${FECHA}T15:00:00Z`, finUtc: `${FECHA}T15:30:00Z` };
const ZONA = 'America/Chihuahua';

for (const [rol, ancho, tema] of [['profesional', 1366, 'light'], ['recepcionista', 390, 'dark']]) {
  test(`${rol} consulta, recupera un fallo y valida un horario sin reservar`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    const { errors: erroresPagina } = await prepararSesion(pagina, rol, tema);
    let consultas = 0;
    const validaciones = [];

    await pagina.route((url) => url.port === '3000' && url.pathname === '/profesionales/1/servicios', (ruta) =>
      ruta.fulfill({ json: [{ id: 2, nombre: 'Consulta QA', duracionMinutos: 30, costo: '200', activo: true, seleccionado: true }] }));
    await pagina.route((url) => url.port === '3000' && url.pathname === '/profesionales/1/oferta', (ruta) =>
      ruta.fulfill({ json: { cuentaActiva: true, sucursales: [{ id: 1, nombre: 'Centro QA', sucursalActiva: true, atencionActiva: true, servicios: [] }] } }));
    await pagina.route((url) => url.port === '3000' && url.pathname === '/disponibilidad', async (ruta) => {
      expect(ruta.request().method()).toBe('GET');
      expect(Object.fromEntries(new URL(ruta.request().url()).searchParams)).toEqual({
        personalId: '1', sucursalId: '1', servicioId: '2', desde: FECHA, hasta: FECHA, modalidad: 'manual',
      });
      if (++consultas === 2) {
        await ruta.fulfill({ status: 503, json: { message: 'Consulta temporalmente no disponible.' } });
        return;
      }
      await ruta.fulfill({ json: {
        ranuras: [FRANJA], omisiones: [], modalidad: 'manual', zonaHoraria: ZONA, calculadoEn: FRANJA.inicioUtc, reglas: REGLAS,
      } });
    });
    await pagina.route((url) => url.port === '3000' && url.pathname === '/disponibilidad/validar', async (ruta) => {
      expect(ruta.request().method()).toBe('POST');
      validaciones.push(ruta.request().postDataJSON());
      await ruta.fulfill({ json: { ...FRANJA, valido: true, zonaHoraria: ZONA, modalidad: 'manual', motivos: [] } });
    });

    await pagina.goto('/admin/disponibilidad/comprobar');
    await pagina.getByRole('tab', { name: 'Horarios disponibles', exact: true }).click();
    const formulario = pagina.locator('#formulario-consulta-horarios');
    await expect(formulario).toBeVisible();
    await expect(pagina.locator('[data-grupo-disponibilidad="negocio"]')).toHaveCount(0);
    if (rol === 'profesional') {
      await expect(formulario.locator('[name="personalId"]')).toHaveAttribute('type', 'hidden');
    } else {
      await expect(pagina.locator('[data-grupo-disponibilidad="equipo"]')).toHaveCount(0);
      await formulario.getByLabel('Identificador del profesional').fill('1');
      await formulario.getByLabel('Identificador de sucursal').fill('1');
      await formulario.getByLabel('Identificador del servicio').fill('2');
    }

    await formulario.getByLabel('Desde').fill(FECHA);
    await formulario.getByLabel('Hasta').fill(FECHA);
    await formulario.getByLabel('Modalidad').selectOption('manual');
    await formulario.getByRole('button', { name: 'Consultar horarios', exact: true }).click();
    await expect(pagina.getByText('RESULTADO PRIVADO')).toBeVisible();
    await formulario.getByRole('button', { name: 'Consultar horarios', exact: true }).click();
    await expect(pagina.getByText('Estos resultados están desactualizados.', { exact: false })).toBeVisible();
    await expect(pagina.locator('[data-disponibilidad-horario]')).toBeDisabled();
    await formulario.getByRole('button', { name: 'Reintentar consulta', exact: true }).click();

    await pagina.locator('[data-disponibilidad-horario]').click();
    const validacion = pagina.locator('#formulario-validacion-horario');
    await expect(validacion.getByLabel('Fecha', { exact: true })).toHaveValue(FECHA);
    await expect(validacion.getByLabel('Hora de inicio')).toHaveValue('09:00');
    await validacion.getByRole('button', { name: 'Validar horario' }).click();
    await expect(pagina.getByText('El horario sigue disponible')).toBeVisible();
    expect(validaciones).toEqual([{ personalId: 1, sucursalId: 1, servicioId: 2, fechaLocal: FECHA, horaInicio: '09:00', modalidad: 'manual' }]);
    await expect(pagina.getByRole('button', { name: /reservar|apartar/i })).toHaveCount(0);
    expect(erroresPagina).toEqual([]);
    await pagina.screenshot({ path: `test-results/m4/disponibilidad-${rol}-${ancho}-${tema}.png`, fullPage: true });
  });
}

for (const [ancho, tema] of [[1366, 'dark'], [1366, 'light'], [390, 'light'], [390, 'dark']]) {
  test(`demo conserva los descansos, el teclado y la consulta simulada a ${ancho}px en tema ${tema}`, async ({ page: pagina }) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.addInitScript((preferencia) => localStorage.setItem('cita-theme', preferencia), tema);
    const solicitudes = [];
    await pagina.route((url) => url.port === '3000', (ruta) => { solicitudes.push(ruta.request().url()); return ruta.abort(); });
    await pagina.goto('/admin/disponibilidad/equipo?demo=1');
    await pagina.getByRole('tab', { name: 'Sucursales asignadas' }).focus();
    await pagina.keyboard.press('ArrowRight');
    await expect(pagina.getByRole('tab', { name: 'Horario semanal' })).toBeFocused();
    await expect(pagina.locator('#formulario-horario input[name^="inicioDescanso-"]').first()).toBeVisible();
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await pagina.screenshot({ path: `test-results/m4/disponibilidad-demo-${ancho}-${tema}.png`, fullPage: true });

    await pagina.goto('/admin/disponibilidad/comprobar?demo=1');
    await expect(pagina.getByText('Datos de demostración', { exact: true }).filter({ visible: true })).toBeVisible();
    await pagina.getByRole('button', { name: 'Consultar horarios', exact: true }).click();
    await pagina.locator('[data-disponibilidad-horario]').first().click();
    await pagina.getByRole('button', { name: 'Validar horario' }).click();
    await expect(pagina.getByText('El horario sigue disponible')).toBeVisible();
    expect(solicitudes).toEqual([]);
  });
}
