import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

test.use({ timezoneId: 'UTC' });

const prepararResumen = async (pagina, rol, tema = 'light') => {
  await prepararSesion(pagina, rol, tema);
  await pagina.route((url) => url.pathname === '/bloqueos', (ruta) => ruta.fulfill({ json: { pagina: 1, limite: 25, total: 0, bloqueos: [] } }));
  await pagina.clock.setFixedTime(new Date('2026-11-25T10:00:00Z'));
};
const cita = (id, estado, hora, causas = [], fechaLocal = '2026-11-25') => ({
  id, version: 1, estado, fechaLocal, fechaFinLocal: fechaLocal, horaInicio: `${hora}:00`, horaFin: '23:45:00',
  inicioUtc: `${fechaLocal}T${hora}:00Z`, zonaHoraria: 'UTC', nombreContacto: `Paciente ${id}`, nombreSucursal: 'Centro',
  nombreServicio: 'Consulta', nombreProfesional: 'Personal QA', personalId: 1, sucursalId: 1, causas,
});

for (const [rol, tema, ancho] of [
  ['admin_negocio', 'light', 1366],
  ['recepcionista', 'dark', 390],
  ['profesional', 'light', 390],
  ['recepcionista', 'dark', 1366],
]) {
  test(`Resumen de ${rol} a ${ancho}px en tema ${tema}`, async ({ page: pagina }, prueba) => {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.emulateMedia({ reducedMotion: 'reduce' });
    await prepararResumen(pagina, rol, tema);
    let liberar;
    const espera = new Promise((resolver) => { liberar = resolver; });
    const consultas = [];
    await pagina.route((url) => url.pathname === '/citas', async (ruta) => {
      const filtros = new URL(ruta.request().url()).searchParams;
      consultas.push(Object.fromEntries(filtros));
      await espera;
      const causas = [{ codigo: 'servicio_inactivo' }];
      await ruta.fulfill({ json: { desde: filtros.get('desde'), hasta: filtros.get('hasta'), citas: [
        cita(1, 'confirmada', '07:15'), cita(2, 'cancelada', '11:00', causas), cita(7, 'pendiente', '15:30', causas),
        cita(8, 'completada', '09:00'), cita(9, 'no_asistio', '09:30'), cita(10, 'pendiente', '15:30', [], '2026-11-26'),
      ] } });
    });
    await pagina.goto('/admin/resumen');
    await expect(pagina.getByRole('heading', { name: 'Buenos días, Personal', exact: true })).toBeVisible();
    await expect(pagina.locator('.resumen-esqueleto')).toHaveCount(4);
    await expect(pagina.getByRole('status').filter({ hasText: 'Cargando resumen de citas' })).toHaveCount(1);
    if (ancho === 390 && tema === 'dark') await pagina.screenshot({ path: prueba.outputPath('resumen-cargando.png') });
    liberar();
    const estados = pagina.getByRole('region', { name: 'Estados de hoy' });
    const semana = pagina.getByRole('region', { name: 'Esta semana' });
    const lista = pagina.getByRole('region', { name: 'Citas de hoy' });
    await expect(estados.locator('.resumen-dona strong')).toHaveText('5');
    await expect(estados.locator('.resumen-leyenda strong')).toHaveText(['1', '1', '1', '1', '1']);
    await expect(semana.locator('.resumen-columna strong')).toHaveText(['0', '0', '5', '1', '0', '0', '0']);
    const diaActual = semana.locator('[aria-current="date"]');
    const colorHoy = tema === 'dark' ? 'rgb(239, 140, 109)' : 'rgb(152, 55, 31)';
    const gris = tema === 'dark' ? 'rgb(180, 179, 186)' : 'rgb(98, 105, 112)';
    await expect(diaActual).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(diaActual.locator('.resumen-nombre-filtro')).toHaveCSS('text-decoration-line', 'underline');
    await expect(diaActual.locator('.resumen-nombre-filtro')).toHaveCSS('color', colorHoy);
    await expect(diaActual.locator('.resumen-nombre-filtro')).toHaveCSS('text-decoration-color', colorHoy);
    const colorMayor = tema === 'dark' ? 'rgb(172, 155, 218)' : 'rgb(118, 98, 168)';
    const leyendaSemana = semana.getByRole('list', { name: 'Colores de la gráfica semanal' });
    await expect(diaActual.locator('.resumen-barra-mayor')).toHaveCSS('background-color', colorMayor);
    await expect(leyendaSemana.getByRole('listitem')).toHaveText(['Más citas', 'Menos citas']);
    await expect(leyendaSemana.locator('.resumen-barra-mayor')).toHaveCSS('background-color', colorMayor);
    await expect(leyendaSemana.locator('.resumen-barra-menor')).toHaveCSS('background-color', 'rgb(96, 134, 165)');
    await expect(lista.locator('tbody tr')).toHaveCount(5);
    const proxima = pagina.getByRole('region', { name: 'Próxima cita', exact: true });
    await expect(proxima.locator('time')).toHaveText('15:30');
    await expect(proxima.getByRole('button', { name: 'Ver cita de Paciente 7' })).toHaveText(/Paciente 7[\s\S]*Pendiente/);
    await expect(lista.getByText('1 cita afectada')).toBeVisible();
    await expect(pagina.locator('.resumen-esqueleto')).toHaveCount(0);
    expect(consultas).toEqual([{ desde: '2026-11-23', hasta: '2026-11-29' }]);
    const cajaEstados = await estados.boundingBox(), cajaSemana = await semana.boundingBox();
    if (ancho === 390) {
      expect(cajaEstados.y).toBeLessThan(cajaSemana.y);
      await expect(pagina.getByRole('navigation', { name: 'Navegación inferior' }).getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page');
    } else expect(cajaEstados.x).toBeLessThan(cajaSemana.x);
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho);
    await pagina.screenshot({ path: prueba.outputPath('resumen-' + tema + '.png'), fullPage: true });
    const dona = estados.locator('[data-resumen-dona]');
    await expect(dona).toHaveAttribute('style', /#e1bd6e 0% 20%,#82a6e1 20% 40%/);
    const cajaDona = await dona.boundingBox();
    await dona.click({ position: { x: cajaDona.width * 0.81, y: cajaDona.height * 0.19 } });
    const porConfirmar = estados.getByRole('button', { name: 'Por confirmar 1' });
    await expect(porConfirmar).toHaveAttribute('aria-pressed', 'true');
    await expect(dona).toHaveAttribute('style', /#e1bd6e 0% 20%,color-mix\(in srgb, #82a6e1 38%, var\(--superficie\)\)/);
    await expect(porConfirmar).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(porConfirmar.locator('.resumen-nombre-filtro')).toHaveCSS('text-decoration-line', 'underline');
    await expect(porConfirmar).toBeFocused();
    await expect(pagina.getByRole('region', { name: 'Citas de hoy · Por confirmar' }).locator('tbody tr')).toHaveCount(1);
    await pagina.screenshot({ path: prueba.outputPath('dona-filtrada-' + tema + '.png'), fullPage: true });

    const jueves = semana.getByRole('button', { name: 'jueves, 26 de noviembre, 1 cita' });
    await jueves.focus();
    await pagina.keyboard.press('Enter');
    await expect(jueves).toHaveAttribute('aria-pressed', 'true');
    await expect(jueves.locator('.resumen-barra-menor')).toHaveCSS('background-color', 'rgb(96, 134, 165)');
    await expect(diaActual.locator('.resumen-barra-mayor')).toHaveCount(1);
    await expect(diaActual.locator('.resumen-nombre-filtro')).toHaveCSS('text-decoration-line', 'none');
    await expect(diaActual.locator('.resumen-nombre-filtro')).toHaveCSS('color', colorHoy);
    await expect(jueves.locator('.resumen-nombre-filtro')).toHaveCSS('color', gris);
    await expect(jueves.locator('.resumen-nombre-filtro')).toHaveCSS('text-decoration-color', gris);
    await expect(jueves).toBeFocused();
    await expect(jueves).toHaveCSS('outline-style', 'none');
    await expect(jueves.locator('.resumen-nombre-filtro')).toHaveCSS('outline-style', 'solid');
    await expect(pagina.getByRole('region', { name: 'Estados del jueves' }).locator('.resumen-dona strong')).toHaveText('1');
    await expect(pagina.getByRole('region', { name: 'Citas del jueves · Por confirmar' }).locator('tbody')).toContainText('Paciente 10');
    await pagina.screenshot({ path: prueba.outputPath('resumen-filtrado-' + tema + '.png'), fullPage: true });
    await semana.getByRole('button', { name: 'viernes, 27 de noviembre, 0 citas' }).click();
    const viernes = pagina.getByRole('region', { name: 'Citas del viernes · Por confirmar' });
    await expect(viernes.getByText('Sin citas en este día', { exact: true })).toBeVisible();
    await viernes.getByRole('button', { name: 'Quitar filtro de estado' }).click();
    await expect(pagina.getByRole('heading', { name: 'Citas del viernes', exact: true })).toBeFocused();
    await semana.getByRole('button', { name: 'miércoles, 25 de noviembre, 5 citas' }).click();
    const canceladas = estados.getByRole('button', { name: 'Canceladas 1' });
    await canceladas.focus();
    await pagina.keyboard.press('Space');
    await expect(pagina.getByRole('region', { name: 'Citas de hoy · Canceladas' }).locator('tbody')).toContainText('Paciente 2');
    await expect(proxima).toHaveCount(0);
    await pagina.keyboard.press('Space');
    await expect(lista.locator('tbody tr')).toHaveCount(5);
    expect(consultas).toHaveLength(1);

    await lista.getByRole('button', { name: 'Ver cita de Paciente 7' }).click();
    const dialogo = pagina.getByRole('dialog', { name: 'Detalle de la cita' });
    await expect(dialogo.getByText('Paciente <QA>')).toBeVisible();
    await pagina.keyboard.press('Escape');
    await expect(lista.getByRole('button', { name: 'Ver cita de Paciente 7' })).toBeFocused();
    await pagina.getByRole('button', { name: 'Nueva cita' }).click();
    await expect(pagina.getByRole('dialog', { name: 'Nueva cita' })).toBeVisible();
  });
}

test('el saludo usa la hora local en el panel conectado y en la demo', async ({ page: pagina }) => {
  await prepararSesion(pagina);
  for (const [hora, saludo] of [['08:00', 'Buenos días'], ['12:00', 'Buenas tardes'], ['19:00', 'Buenas noches']]) {
    await pagina.clock.setFixedTime(new Date(`2026-11-25T${hora}:00Z`));
    await pagina.goto('/admin/resumen');
    await expect(pagina.getByRole('heading', { name: `${saludo}, Personal`, exact: true })).toBeVisible();
    await pagina.goto('/admin/resumen?demo=1');
    await expect(pagina.getByRole('heading', { name: `${saludo}, Adriana`, exact: true })).toBeVisible();
  }
});

test('la tarjeta reúne todos los inicios simultáneos y permite abrir el detalle', async ({ page: pagina }, prueba) => {
  await pagina.emulateMedia({ reducedMotion: 'reduce' });
  await prepararResumen(pagina, 'recepcionista');
  await pagina.route((url) => url.pathname === '/citas', (ruta) => {
    const consulta = new URL(ruta.request().url()).searchParams;
    const otraZona = { ...cita(9, 'confirmada', '15:30'), zonaHoraria: 'America/Chihuahua', horaInicio: '09:30:00', nombreSucursal: 'Norte' };
    const mismoRelojOtroInstante = { ...cita(10, 'pendiente', '15:30'), zonaHoraria: 'America/Chihuahua', inicioUtc: '2026-11-25T21:30:00Z' };
    return ruta.fulfill({ json: { desde: consulta.get('desde'), hasta: consulta.get('hasta'), citas: [
      cita(1, 'confirmada', '07:15'), cita(2, 'cancelada', '15:30'), cita(7, 'pendiente', '15:30'),
      cita(8, 'confirmada', '15:30'), otraZona, mismoRelojOtroInstante,
    ] } });
  });
  await pagina.goto('/admin/resumen');
  const tarjeta = pagina.getByRole('region', { name: 'Próximas citas', exact: true });
  const opciones = tarjeta.getByRole('button');
  await expect(tarjeta.locator('time')).toHaveText('15:30');
  await expect(tarjeta.getByText('3 citas a la misma hora')).toBeVisible();
  await expect(tarjeta.getByText('Hora de Centro')).toBeVisible();
  await expect(opciones).toHaveCount(3);
  await expect(tarjeta.getByRole('button', { name: 'Ver cita de Paciente 9' })).toContainText('09:30 hora local');
  await expect(pagina.getByRole('region', { name: 'Citas de hoy' }).locator('tbody tr')).toHaveCount(6);

  await pagina.setViewportSize({ width: 1366, height: 900 });
  const primera = await opciones.first().boundingBox();
  const segunda = await opciones.nth(1).boundingBox();
  expect(primera.x).toBeLessThan(segunda.x);
  await pagina.screenshot({ path: prueba.outputPath('proximas-escritorio.png'), fullPage: true, animations: 'disabled' });
  await pagina.setViewportSize({ width: 390, height: 844 });
  const primeraMovil = await opciones.first().boundingBox();
  const segundaMovil = await opciones.nth(1).boundingBox();
  expect(primeraMovil.y).toBeLessThan(segundaMovil.y);
  expect(await pagina.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await pagina.screenshot({ path: prueba.outputPath('proximas-movil.png'), fullPage: true, animations: 'disabled' });
  await opciones.first().click();
  await expect(pagina.getByRole('dialog', { name: 'Detalle de la cita' })).toBeVisible();
  await pagina.keyboard.press('Escape');
  await expect(opciones.first()).toBeFocused();
});

test('un exceso de citas semanal conserva el día y distingue fallo de vacío', async ({ page: pagina }) => {
  await prepararResumen(pagina, 'recepcionista');
  const consultas = [];
  await pagina.route((url) => url.pathname === '/citas', async (ruta) => {
    const filtros = new URL(ruta.request().url()).searchParams;
    const desde = filtros.get('desde'), hasta = filtros.get('hasta');
    consultas.push(desde === hasta ? 'dia' : 'semana');
    if (consultas.length === 1) return ruta.fulfill({ status: 400, json: { codigo: 'agenda_demasiado_amplia', message: 'Hay demasiadas citas para mostrar el periodo completo. Reduce el rango o filtra por sucursal o Profesional.' } });
    return ruta.fulfill({ json: { desde, hasta, citas: [] } });
  });
  await pagina.goto('/admin/resumen');
  await expect(pagina.getByRole('alert')).toContainText('La semana supera 1.000 citas.');
  await expect(pagina.getByRole('region', { name: 'Citas de hoy' }).getByText('Sin citas hoy', { exact: true })).toBeVisible();
  expect(consultas).toEqual(['semana', 'dia']);
  await pagina.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(pagina.locator('.resumen-columna strong')).toHaveText(['0', '0', '0', '0', '0', '0', '0']);
  await expect(pagina.getByRole('list', { name: 'Colores de la gráfica semanal' })).toHaveCount(0);
  await expect(pagina.getByRole('alert')).toHaveCount(0);
});

test('Superadministración conserva su pantalla y no consulta citas', async ({ page: pagina }) => {
  const { solicitudesObservadas } = await prepararSesion(pagina, 'superadmin');
  await pagina.goto('/admin/resumen');
  await expect(pagina).toHaveURL(/\/admin\/plataforma$/);
  expect(solicitudesObservadas).not.toContain('GET /citas');
});
