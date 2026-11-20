import { test, expect } from './integracion.utilidades.js';

// El mismo formulario pasa por 400, 503 y una escritura real en la base efímera;
// solo esta última puede cambiar el estado confirmado en la pantalla.
test('FALA-T048–T049: PUT completo y borrador estable ante 400/503', async ({ page: pagina }) => {
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/disponibilidad/negocio`);
  await pagina.getByLabel('Correo electrónico').fill('admin-qa-1@example.test');
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Inicia sesión' })).toHaveCount(0);
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/disponibilidad/negocio`);
  const formulario = pagina.locator('#formulario-configuracion-agenda');
  await expect(formulario).toBeVisible();
  await formulario.locator('label.configuracion-opcion').nth(1).click();
  await formulario.locator('[name="tiempoEntreCitasMinutos"]').selectOption('5');
  await formulario.locator('[name="anticipacionMinutos"]').fill('20');
  await formulario.locator('[name="diasFuturos"]').fill('30');

  await pagina.route('**/disponibilidad/configuracion', (rutaInterceptada) => rutaInterceptada.request().method() === 'PUT'
    ? rutaInterceptada.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'tiempoEntreCitasMinutos inválido' }) })
    : rutaInterceptada.continue());
  await formulario.getByRole('button', { name: 'Guardar reglas' }).click();
  await expect(formulario.locator('[data-disponibilidad-campo="tiempoEntreCitasMinutos"]')).toContainText('inválido');
  await expect(formulario.locator('[name="tiempoEntreCitasMinutos"]')).toHaveValue('5');
  await expect(formulario.locator('[name="anticipacionMinutos"]')).toHaveValue('20');
  await pagina.unroute('**/disponibilidad/configuracion');

  await pagina.route('**/disponibilidad/configuracion', (rutaInterceptada) => rutaInterceptada.request().method() === 'PUT'
    ? rutaInterceptada.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Servicio no disponible' }) })
    : rutaInterceptada.continue());
  await formulario.getByRole('button', { name: 'Guardar reglas' }).click();
  await expect(pagina.getByText('Servicio no disponible')).toBeVisible();
  await expect(formulario.locator('[name="diasFuturos"]')).toHaveValue('30');
  await pagina.unroute('**/disponibilidad/configuracion');

  const respuesta = pagina.waitForResponse((elemento) => elemento.url().endsWith('/disponibilidad/configuracion') && elemento.request().method() === 'PUT');
  await formulario.getByRole('button', { name: 'Guardar reglas' }).click();
  const guardado = await respuesta;
  expect(guardado.status()).toBe(200);
  expect(guardado.request().postDataJSON()).toEqual({ modo: 'agenda_compacta', tiempoEntreCitasMinutos: 5,
    anticipacionMinutos: 20, diasFuturos: 30 });
  await expect(formulario.locator('[name="tiempoEntreCitasMinutos"]')).toHaveValue('5');
  await expect(pagina.getByText('Servicio no disponible')).toHaveCount(0);
  // Capturas de revisión del formulario conectado en los dos anchos y temas.
  await expect(pagina.locator('.aviso-app')).toHaveCount(0);
  await pagina.screenshot({ path: 'test-results/agenda-desktop-light.png', fullPage: true });
  await pagina.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await pagina.keyboard.press('Escape');
  await expect(pagina.locator('.estructura-admin')).not.toHaveClass(/menu-abierto/);
  await pagina.screenshot({ path: 'test-results/agenda-desktop-dark.png', fullPage: true });
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.keyboard.press('Escape');
  await pagina.screenshot({ path: 'test-results/agenda-mobile-dark.png', fullPage: true });
  await pagina.getByRole('button', { name: 'Activar modo claro' }).click();
  await pagina.keyboard.press('Escape');
  await pagina.screenshot({ path: 'test-results/agenda-mobile-light.png', fullPage: true });
});

// El formulario semanal manda la sustitución real del horario. El hueco de
// 12:00 a 13:00 queda entre dos filas, sin campos de descanso incrustados.
test('FALA-T050: dos franjas semanales representan la pausa en la API', async ({ page: pagina }) => {
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/disponibilidad/equipo`);
  await pagina.getByLabel('Correo electrónico').fill('admin-qa-1@example.test');
  await pagina.locator('#ingreso-contrasena').fill('PruebaLicencia2026!');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Inicia sesión' })).toHaveCount(0);
  await pagina.goto(`${process.env.PORTAL_TEST_ORIGIN}/admin/disponibilidad/equipo`);
  await pagina.getByRole('tab', { name: 'Horario semanal' }).click();
  const lunes = pagina.locator('[data-horario-franja][data-horario-dia="1"]');
  await expect(lunes.first()).toBeVisible();
  await lunes.first().locator('input[name^="entrada-"]').fill('09:00');
  await lunes.first().locator('input[name^="salida-"]').fill('12:00');
  await lunes.first().locator('[data-agregar-franja="1"]').click();
  await expect(lunes).toHaveCount(2);
  await lunes.nth(1).locator('input[name^="entrada-"]').fill('13:00');
  await lunes.nth(1).locator('input[name^="salida-"]').fill('17:00');
  const respuesta = pagina.waitForResponse((elemento) => /\/profesionales\/\d+\/horario$/.test(elemento.url()) && elemento.request().method() === 'PUT');
  await pagina.locator('#formulario-horario').getByRole('button', { name: 'Guardar horario' }).click();
  const guardado = await respuesta;
  expect(guardado.status()).toBe(200);
  const enviado = guardado.request().postDataJSON().franjas.filter((fila) => fila.diaSemana === 1 && fila.activo);
  expect(enviado).toHaveLength(2);
  expect(enviado.map(({ inicioMinutos, finMinutos }) => [inicioMinutos, finMinutos])).toEqual([[540, 720], [780, 1020]]);
  expect(enviado.every((fila) => !Object.hasOwn(fila, 'descansoInicioMinutos') && !Object.hasOwn(fila, 'descansoFinMinutos'))).toBe(true);
});
