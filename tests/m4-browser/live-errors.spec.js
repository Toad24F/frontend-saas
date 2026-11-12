import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

// Cambios de otra sesión simulados en HTTP: esta suite nunca arranca ni escribe en Nest/MariaDB.
async function fixture(page, theme = 'light') {
  const { errors } = await setup(page, 'recepcionista', theme);
  const control = {
    version: 2,
    name: 'Contacto inicial',
    status: 0,
    reads: 0,
    writes: [],
    empty: false,
  };
  await page.route(
    (url) =>
      ['/citas', '/citas/7', '/clientes', '/clientes/1'].includes(url.pathname),
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname;
      if (req.method() !== 'GET') control.writes.push(path);
      if (control.status && ['/citas', '/clientes'].includes(path)) {
        await route.fulfill({
          status: control.status,
          json: { message: 'SQL SELECT contacto secreto stack trace' },
        });
        return;
      }
      const summary = {
        id: 7,
        folio: 'LIVE-7',
        version: control.version,
        estado: 'confirmada',
        origen: 'manual',
        nombreContacto: control.name,
        nombreServicio: 'Consulta',
        nombreSucursal: 'Centro',
        nombreProfesional: 'Profesional QA',
        sucursalId: 1,
        personalId: 1,
        fechaLocal: url.searchParams.get('desde') || '2030-12-20',
        fechaFinLocal: url.searchParams.get('desde') || '2030-12-20',
        horaInicio: '09:00:00',
        horaFin: '09:30:00',
        inicioUtc: '2030-12-20T15:00:00Z',
        zonaHoraria: 'America/Chihuahua',
        causas: [],
      };
      const customer = {
        id: 1,
        negocioId: 1,
        version: control.version,
        nombreCompleto: control.name,
        telefono: '6145550101',
      };
      let data;
      if (path === '/citas') {
        control.reads++;
        data = {
          desde: url.searchParams.get('desde'),
          hasta: url.searchParams.get('hasta'),
          citas: control.empty ? [] : [summary],
        };
      } else if (path === '/citas/7') data = summary;
      else if (path === '/clientes')
        data = {
          clientes: [customer],
          pagina: Number(url.searchParams.get('pagina') || 1),
          limite: 50,
          hayMas: true,
        };
      else data = customer;
      await route.fulfill({ json: data });
    },
  );
  return { control, errors };
}

test('T100: refresco temporizado actualiza la agenda sin acción manual', async ({
  page,
}) => {
  await page.clock.install();
  const { control, errors } = await fixture(page);
  await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toContainText(
    'Contacto inicial',
  );
  control.name = 'Cambio externo';
  control.version++;
  await page.clock.runFor(30001);
  await expect(page.locator('[data-m4-appointment="7"]')).toContainText(
    'Cambio externo',
  );
  expect(control.reads).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('T100: foco verifica versión y conserva borrador; Guardar queda bloqueado antes del PATCH', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.goto('/admin/agenda');
  await page.locator('[data-m4-appointment="7"]').click();
  const panel = page.getByRole('dialog');
  await panel.getByLabel('Motivo del cambio').fill('Texto pendiente');
  control.version++;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(panel.locator('[data-state-error]')).toContainText(
    'otra sesión',
  );
  await expect(panel.getByLabel('Motivo del cambio')).toHaveValue(
    'Texto pendiente',
  );
  await expect(panel.getByLabel('Motivo del cambio')).toBeFocused();
  await expect(
    panel.getByRole('button', { name: 'Guardar estado', exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByRole('button', { name: 'Guardar horario', exact: true }),
  ).toBeDisabled();
  expect(control.writes).toEqual([]);
});

test('T100/T101: refresco fallido conserva snapshot con aviso explícito; reintento recupera', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  control.status = 503;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('[data-live-warning]')).toContainText(
    'sin actualizar',
  );
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('SELECT');
  control.status = 0;
  control.name = 'Recuperado';
  await page.locator('[data-m4-retry]').click();
  await expect(page.locator('[data-m4-appointment="7"]')).toContainText(
    'Recuperado',
  );
  await expect(page.locator('[data-live-warning]')).toHaveCount(0);
});

for (const [status, text] of [
  [400, 'Entrada inválida'],
  [403, 'Acceso no permitido'],
  [404, 'Recurso no disponible'],
  [409, 'Conflicto'],
  [500, 'Fallo técnico'],
  [503, 'Fallo técnico'],
])
  test(`T101: directorio diferencia ${status} y no imprime trazas`, async ({
    page,
  }) => {
    const { control } = await fixture(page);
    control.status = status;
    await page.goto('/admin/clientes');
    await expect(page.getByRole('main')).toContainText(text);
    await expect(page.getByRole('main')).not.toContainText('SELECT');
    await expect(page.getByRole('main')).not.toContainText('Sin clientes');
  });

test('T100/T102: corrección de ficha conserva teclado y detecta obsolescencia sin reemplazar campos', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.goto('/admin/clientes');
  await page.locator('[data-directory-open="1"]:visible').click();
  const panel = page.getByRole('dialog');
  await panel
    .getByRole('button', { name: 'Corregir ficha', exact: true })
    .click();
  const input = panel.getByLabel('Nombre completo', { exact: true });
  await input.fill('Mi borrador');
  control.version++;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(panel.locator('[data-customer-error]')).toContainText(
    'otra sesión',
  );
  await expect(input).toHaveValue('Mi borrador');
  await expect(input).toBeFocused();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  expect(control.writes).toEqual([]);
});

test('T100: un cambio externo invalida la selección manual sin borrar contacto', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.route(
    (url) => url.pathname === '/disponibilidad',
    (route) =>
      route.fulfill({
        json: {
          personalId: 1,
          sucursalId: 1,
          servicioId: 1,
          desde: '2030-12-20',
          hasta: '2030-12-20',
          modalidad: 'manual',
          zonaHoraria: 'America/Chihuahua',
          ranuras: [
            {
              inicioUtc: '2030-12-20T15:00:00Z',
              finUtc: '2030-12-20T15:30:00Z',
            },
          ],
          omisiones: [],
        },
      }),
  );
  await page.goto('/admin/agenda');
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  const panel = page.getByRole('dialog');
  for (const name of ['servicioId', 'sucursalId', 'personalId'])
    await panel.locator(`[name="${name}"]`).fill('1');
  await panel.getByLabel('Fecha', { exact: true }).fill('2030-12-20');
  await panel
    .getByRole('button', { name: 'Consultar horarios', exact: true })
    .click();
  await panel.locator('[name="horario"]').selectOption('0');
  await panel
    .getByLabel('Nombre completo', { exact: true })
    .fill('Conservar contacto');
  control.version++;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(panel.locator('[data-manual-error]')).toContainText(
    'otra sesión',
  );
  await expect(panel.locator('[name="horario"]')).toBeDisabled();
  await expect(
    panel.getByLabel('Nombre completo', { exact: true }),
  ).toHaveValue('Conservar contacto');
  await expect(
    panel.getByRole('button', { name: 'Confirmar cita', exact: true }),
  ).toBeDisabled();
  expect(control.writes).toEqual([]);
});

test('T100/T102: refresco conserva búsqueda en edición y posición del cursor; no sondea fuera de agenda', async ({
  page,
}) => {
  await page.clock.install();
  const { control } = await fixture(page);
  await page.goto('/admin/agenda');
  await expect(page.locator('[data-m4-appointment="7"]')).toBeVisible();
  const search = page.getByRole('searchbox', {
    name: 'Buscar paciente',
    exact: true,
  });
  // Cambiar el DOM sin input representa un borrador aún no aplicado por el debounce.
  await search.evaluate((el) => {
    el.value = 'Texto pendiente';
    el.focus();
    el.setSelectionRange(3, 3);
  });
  await page.clock.runFor(30001);
  await expect(search).toHaveValue('Texto pendiente');
  await expect(search).toBeFocused();
  expect(await search.evaluate((el) => el.selectionStart)).toBe(3);
  await page.goto('/admin/clientes');
  const reads = control.reads;
  await page.clock.runFor(60001);
  expect(control.reads).toBe(reads);
});

test('T101: 401 vuelve al acceso; un fallo de red no parece directorio vacío', async ({
  page,
}) => {
  const { control } = await fixture(page);
  control.status = 401;
  await page.goto('/admin/clientes');
  await expect(
    page.getByText('Tu sesión expiró. Inicia sesión nuevamente.'),
  ).toBeVisible();
  await expect(page.locator('[data-directory-open]')).toHaveCount(0);
  control.status = 0;
  await page.goto('/admin/clientes');
  await page.route(
    (url) => url.pathname === '/clientes',
    (route) => route.abort('failed'),
  );
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Sin conexión');
  await expect(page.getByRole('main')).not.toContainText('Sin clientes');
});

test('T102: cerrar detalle devuelve foco a Hoy cuando la cita deja de estar en el periodo', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.goto('/admin/agenda');
  await page.locator('[data-m4-appointment="7"]').click();
  control.empty = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('[data-m4-appointment="7"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Hoy', exact: true }),
  ).toBeFocused();
});

for (const width of [1366, 390])
  for (const theme of ['light', 'dark'])
    test(`T102: teclado y paneles ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { errors } = await fixture(page, theme);
      await page.goto('/admin/clientes');
      const ficha = page.locator('[data-directory-open="1"]:visible');
      await ficha.focus();
      await page.keyboard.press('Enter');
      const panel = page.getByRole('dialog');
      await panel
        .getByRole('button', { name: 'Corregir ficha', exact: true })
        .click();
      await expect(
        panel.getByLabel('Nombre completo', { exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(panel.getByLabel('Teléfono', { exact: true })).toBeFocused();
      await expect
        .poll(() =>
          panel.evaluate(
            (el) => Math.abs(el.getBoundingClientRect().right - innerWidth) < 1,
          ),
        )
        .toBe(true);
      await expect(
        panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
      ).toBeInViewport();
      await page.screenshot({
        path: `test-results/m4/t102-${width}-${theme}.png`,
      });
      await page.keyboard.press('Escape');
      await expect(ficha).toBeFocused();
      await page
        .getByRole('button', { name: 'Siguiente página', exact: true })
        .click();
      await expect(page.getByRole('main')).toContainText('Página 2');
      await expect(
        page.getByRole('button', { name: 'Siguiente página', exact: true }),
      ).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });

// El calendario semanal usa desplazamiento horizontal en móvil; el refresco conserva esa referencia temporal.
test('T102: el refresco conserva el desplazamiento y foco del calendario móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 }); await page.clock.install(); const { control } = await fixture(page);
  await page.goto('/admin/agenda'); await page.getByRole('button', { name: 'Semana', exact: true }).click();
  await expect(page.locator('.week-calendar:not(.single-day)')).toBeVisible();
  const scroll = page.locator('.calendar-scroll'); await expect(scroll).toBeVisible(); await scroll.focus();
  await scroll.evaluate((el) => { el.scrollLeft = 120; }); const left = await scroll.evaluate((el) => el.scrollLeft); expect(left).toBeGreaterThan(0);
  const reads = control.reads; await page.clock.runFor(30001); await expect.poll(() => control.reads).toBeGreaterThan(reads);
  await expect(scroll).toBeFocused(); expect(await scroll.evaluate((el) => el.scrollLeft)).toBe(left);
});
