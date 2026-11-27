// Edge y el servidor de pruebas del portal, con dos pestañas de un mismo contexto.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origen = process.env.BUSINESS_UI_URL || 'http://127.0.0.1:5193';
const url = origen + '/reservas/qa-portal';
const navegador = await chromium.launch({ channel: 'msedge' });
const errores = [];
const contexto = await navegador.newContext({ reducedMotion: 'reduce' });
const primera = await contexto.newPage();
const segunda = await contexto.newPage();
for (const pagina of [primera, segunda])
  pagina.on('pageerror', (error) => errores.push(error.message));
const elegirHorario = async (pagina, indice = 0) => {
  await pagina.goto(url);
  await expect(
    pagina.getByRole('heading', {
      name: 'Consultorio de prueba · API simulada',
    }),
  ).toBeVisible();
  await pagina.getByRole('radio', { name: /Consulta general/ }).check();
  await pagina.getByRole('button', { name: 'Continuar', exact: true }).click();
  await pagina.locator('.portal-horario').nth(indice).click();
  await pagina.getByRole('button', { name: 'Apartar este horario' }).click();
  await expect(
    pagina.getByRole('heading', { name: 'Completa tus datos' }),
  ).toBeVisible();
};
const reservar = (pagina) =>
  pagina.getByRole('button', { name: 'Reservar', exact: true });
const carpeta = 'test-results/portal-flujo-navegador';
async function capturar(pagina, estado) {
  for (const ancho of [1366, 390]) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    for (const tema of ['light', 'dark']) {
      if (
        (await pagina.evaluate(
          () => document.documentElement.dataset.theme,
        )) !== tema
      )
        await pagina.locator('#portal-tema').click();
      assert.ok(
        await pagina.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await pagina.screenshot({
        path: `${carpeta}/${estado}-${ancho}-${tema}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
}
try {
  await mkdir(carpeta, { recursive: true });
  await elegirHorario(primera);
  await reservar(primera).click();
  await expect(primera.getByLabel('Nombre completo')).toBeFocused();
  await primera.getByLabel('Nombre completo').fill('Cliente ficticio');
  await primera.getByLabel('País o región').selectOption('US');
  await expect(primera.locator('#portal-contacto-telefono-ayuda')).toContainText('Ejemplo:');
  await primera.getByLabel('Teléfono', { exact: true }).fill('2025550123');
  await primera.getByRole('button', { name: 'Revisar datos' }).click();
  await expect(primera.getByText(/Los datos tienen un formato válido/).first()).toBeVisible();
  await primera.getByLabel('País o región').selectOption('MX');
  await primera.getByLabel('Teléfono', { exact: true }).fill('6140000010');
  await primera.getByRole('button', { name: 'Revisar datos' }).click();
  await expect(
    primera.getByText(/Los datos tienen un formato válido/).first(),
  ).toBeVisible();
  await capturar(primera, 'contacto');
  await elegirHorario(segunda, 1);
  await expect(
    primera.getByText(/ya no está disponible en esta pestaña/).first(),
  ).toBeVisible();
  await expect(reservar(primera)).toBeDisabled();
  await expect(primera.getByLabel('Nombre completo')).toHaveValue(
    'Cliente ficticio',
  );
  await segunda.request.get(origen + '/__qa/advance?ms=300000');
  await segunda.bringToFront();
  await segunda.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(segunda.getByText(/El apartado venció/).first()).toBeVisible();
  await segunda.getByRole('button', { name: 'Volver a horarios' }).click();
  await expect(
    segunda.getByRole('heading', { name: 'Elige fecha y hora' }),
  ).toBeVisible();

  await elegirHorario(primera);
  await primera.getByLabel('Nombre completo').fill('Cliente ficticio');
  await primera.getByLabel('Teléfono', { exact: true }).fill('6140000010');
  await primera.request.get(origen + '/__qa/mode?value=lost_after');
  const escrituras = [],
    preparaciones = [];
  const registrar = (peticion) => {
    if (peticion.method() === 'POST' && peticion.url().endsWith('/reservar'))
      escrituras.push(peticion.url());
    if (peticion.url().endsWith('/intentos'))
      preparaciones.push(peticion.postDataJSON());
  };
  primera.on('request', registrar);
  await reservar(primera).click();
  await expect(
    primera.getByRole('button', { name: 'Comprobar resultado' }),
  ).toBeVisible();
  await primera
    .getByRole('button', { name: 'Reintentar el mismo envío' })
    .click();
  await expect(
    primera.getByRole('heading', { name: 'Reserva registrada' }),
  ).toBeVisible();
  assert.equal(escrituras.length, 1);
  assert.deepEqual(preparaciones[0], preparaciones[1]);
  primera.off('request', registrar);
  await elegirHorario(primera);
  await primera.getByLabel('Nombre completo').fill('Cliente ficticio');
  await primera.getByLabel('Teléfono', { exact: true }).fill('6140000011');
  await primera.request.get(origen + '/__qa/mode?value=lost_after');
  await reservar(primera).click();
  await expect(
    primera.getByRole('button', { name: 'Comprobar resultado' }),
  ).toBeVisible();
  const marcador = await primera.evaluate(() =>
    JSON.parse(sessionStorage.getItem('citalendar:public:attempt:qa-portal')),
  );
  assert.deepEqual(Object.keys(marcador).sort(), [
    'apartadoId',
    'clave',
    'negocio',
  ]);
  assert.equal(marcador.negocio, 'qa-portal');
  await primera.reload();
  await expect(
    primera.getByRole('heading', { name: 'Reserva registrada' }),
  ).toBeVisible();
  await expect(primera.getByText('Tu reserva quedó registrada y está pendiente de confirmación.')).toBeVisible();
  assert.equal(
    await primera.evaluate(() =>
      sessionStorage.getItem('citalendar:public:attempt:qa-portal'),
    ),
    null,
  );
  await capturar(primera, 'resultado');
  assert.deepEqual(errores, []);
  console.log(
    'OK: dos pestañas, vencimiento, foco de error, reintento con misma clave, recuperación tras recarga, resultado y ocho capturas.',
  );
} finally {
  await navegador.close();
}
