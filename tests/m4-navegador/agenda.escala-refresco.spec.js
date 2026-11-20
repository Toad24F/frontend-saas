import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

test('refresco conserva la hora explorada y escala también marcas y reloj', async ({ page: pagina }) => {
  await prepararSesion(pagina);
  await pagina.clock.setFixedTime(new Date('2026-11-16T18:20:00Z'));
  let corto = false;
  await pagina.route((url) => url.pathname === '/citas', async (rutaInterceptada) => {
    const q = new URL(rutaInterceptada.request().url()).searchParams, dia = '2026-11-16';
    await rutaInterceptada.fulfill({ json: { desde: q.get('desde'), hasta: q.get('hasta'), citas: [
      { id: 1, version: 1, estado: 'confirmada', nombreContacto: 'Paciente', nombreServicio: 'Consulta', nombreProfesional: 'Ana', nombreSucursal: 'Norte', personalId: 1, sucursalId: 1, fechaLocal: dia, fechaFinLocal: dia, horaInicio: '08:00:00', horaFin: corto ? '08:05:00' : '08:20:00', zonaHoraria: 'America/Chihuahua', causas: [] },
    ] } });
  });
  await pagina.goto('/admin/agenda');
  await pagina.evaluate(() => document.documentElement.style.setProperty('--agenda-alto-hora-maximo', '2000px'));
  await pagina.locator('[data-agenda-vista="day"]').click();
  const cuadricula = pagina.locator('.calendario-semana');
  await expect(pagina.locator('.calendario-evento')).toHaveCount(1);
  await expect.poll(() => cuadricula.evaluate((elemento) => parseFloat(elemento.style.getPropertyValue('--alto-hora')))).toBe(180);
  const escala = await cuadricula.evaluate((elemento) => parseFloat(elemento.style.getPropertyValue('--alto-hora')));
  await pagina.evaluate(() => {
    const cuadricula = document.querySelector('.calendario-semana'), cuerpo = cuadricula.querySelector('.semana-cuerpo');
    window.scrollTo({ top: window.scrollY + cuerpo.getBoundingClientRect().top + 2 * parseFloat(cuadricula.style.getPropertyValue('--alto-hora')) - 100, behavior: 'instant' });
  });
  const ancla = () => pagina.evaluate(async () => (await import('/src/shared/screens/agenda/agenda.navegacion.js')).anclaDesplazamientoAgenda()?.minuto ?? -1);
  const anterior = await ancla();
  corto = true;
  await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => cuadricula.evaluate((elemento) => parseFloat(elemento.style.getPropertyValue('--alto-hora')))).toBeGreaterThan(escala * 3);
  expect(Math.abs(await ancla() - anterior)).toBeLessThan(1);
  const geometria = await cuadricula.evaluate((elemento) => {
    const alto = parseFloat(elemento.style.getPropertyValue('--alto-hora'));
    return { uniform: [...elemento.querySelectorAll('.columna-horas > span')].every((etiqueta, indice) => Math.abs(parseFloat(etiqueta.style.top) - indice * alto) < .1), clock: parseFloat(elemento.querySelector('[data-agenda-reloj]').style.top), height: alto };
  });
  expect(geometria.uniform).toBe(true);
  // 18:20 UTC son 12:20 en Chihuahua: 260 minutos después de las 08:00.
  expect(geometria.clock).toBeCloseTo(260 / 60 * geometria.height, 0);
});
