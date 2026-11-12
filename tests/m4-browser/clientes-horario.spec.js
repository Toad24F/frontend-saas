import { test, expect } from '@playwright/test';
import { setup } from './agenda-fixture.js';

// Todos los datos y mutaciones de esta suite son dobles HTTP; no escriben en el backend real.
async function fixture(page, role = 'recepcionista', theme = 'light') {
  const { errors } = await setup(page, role, theme);
  const control = {
    writes: [],
    status: 0,
    historyStatus: 0,
    version: 2,
    moved: false,
    name: 'Ana actual',
    empty: false,
    delayWrite: null,
  };
  const ficha = (id = 1) => ({
    id,
    negocioId: 1,
    version: control.version,
    nombreCompleto: id === 1 ? control.name : 'Otra persona',
    telefono: '6145550101',
    creadoEn: '2026-11-12T12:00:00Z',
  });
  await page.route(
    (url) =>
      /^\/clientes(?:\/\d+(?:\/citas)?)?$/.test(url.pathname) ||
      url.pathname === '/citas/7/horario' ||
      url.pathname === '/citas/7',
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname;
      if (req.method() !== 'GET') {
        control.writes.push({
          path,
          method: req.method(),
          body: req.postDataJSON(),
        });
        if (control.delayWrite) await control.delayWrite;
        if (control.status) {
          await route.fulfill({
            status: control.status,
            json: { message: 'Rechazo de prueba' },
          });
          return;
        }
        control.version++;
        if (path.endsWith('/horario')) control.moved = true;
        else control.name = req.postDataJSON().nombreCompleto;
      }
      let data;
      if (path === '/citas/7' || path.endsWith('/horario'))
        data = {
          id: 7,
          folio: 'M4-0007',
          version: control.version,
          estado: 'confirmada',
          inicioUtc: control.moved
            ? '2030-12-21T16:00:00Z'
            : '2030-12-20T15:00:00Z',
          finUtc: '2030-12-21T16:30:00Z',
          finOcupacionUtc: '2030-12-21T16:35:00Z',
          fechaLocal: control.moved ? '2030-12-21' : '2030-12-20',
          horaInicio: control.moved ? '10:00:00' : '09:00:00',
          zonaHoraria: 'America/Chihuahua',
          nombreContacto: 'Contacto histórico',
        };
      else if (path.endsWith('/citas')) {
        if (control.historyStatus) {
          await route.fulfill({
            status: control.historyStatus,
            json: { message: 'Historial no disponible' },
          });
          return;
        }
        data = {
          citas: [
            {
              id: 7,
              clienteId: 1,
              folio: 'M4-0007',
              nombreContacto: 'Contacto histórico',
              telefonoContacto: '6145550199',
              nombreServicio: null,
              costoAceptado: null,
              estado: 'confirmada',
              inicioUtc: '2030-12-20T15:00:00Z',
              finUtc: '2030-12-20T15:30:00Z',
              fechaLocal: '2030-12-20',
              horaInicio: '09:00:00',
              zonaHoraria: 'America/Chihuahua',
            },
          ],
          pagina: Number(url.searchParams.get('pagina')),
          limite: 50,
          hayMas: url.searchParams.get('pagina') === '1',
        };
      } else if (path === '/clientes' && req.method() === 'GET')
        data = {
          clientes: control.empty ? [] : [ficha(), ficha(2)],
          pagina: Number(url.searchParams.get('pagina')),
          limite: 50,
          hayMas: url.searchParams.get('pagina') === '1',
        };
      else data = ficha();
      await route.fulfill({ json: data });
    },
  );
  return { control, errors };
}

test('T097: rechazo conserva horario y borrador; relectura explícita permite mover el mismo folio', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.goto('/admin/agenda');
  await page.locator('[data-m4-appointment="7"]').click();
  const panel = page.getByRole('dialog');
  await panel.getByLabel('Nueva fecha').fill('2030-12-21');
  await panel.getByLabel('Nueva hora').fill('10:00');
  control.status = 409;
  await panel
    .getByRole('button', { name: 'Guardar horario', exact: true })
    .click();
  await expect(panel.locator('[data-schedule-error]')).toContainText(
    'conflicto',
  );
  await expect(panel).toContainText('2030-12-20');
  await expect(panel.getByLabel('Nueva fecha')).toHaveValue('2030-12-21');
  await expect(
    panel.getByRole('button', { name: 'Guardar horario', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('[data-m4-appointment="7"]').click();
  await expect(panel.getByLabel('Nueva fecha')).toHaveValue('2030-12-21');
  control.status = 0;
  await panel
    .getByRole('button', { name: 'Releer horario', exact: true })
    .click();
  await panel.getByLabel('Nueva fecha').fill('2030-12-21');
  await panel.getByLabel('Nueva hora').fill('10:00');
  await panel
    .getByRole('button', { name: 'Guardar horario', exact: true })
    .click();
  await expect(panel.locator('.m4-detail-fields')).toContainText('2030-12-21');
  expect(control.writes.at(-1)).toEqual({
    path: '/citas/7/horario',
    method: 'PATCH',
    body: { fechaLocal: '2030-12-21', horaInicio: '10:00', version: 2 },
  });
  await expect(panel).toContainText('M4-0007');
});

test('T098/T099: fichas distintas con teléfono compartido, historial separado, alta y corrección versionada', async ({
  page,
}) => {
  const { control, errors } = await fixture(page);
  await page.goto('/admin/clientes');
  await expect(page.locator('[data-directory-open]')).toHaveCount(4); // Tabla y tarjetas comparten las dos fichas.
  await page.getByLabel('Buscar clientes', { exact: true }).fill('Ana');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.locator('[data-directory-open="1"]:visible').click();
  const panel = page.getByRole('dialog');
  await expect(panel).toContainText('Contacto histórico');
  await expect(panel).toContainText('Sin registro histórico');
  await panel
    .getByRole('button', { name: 'Siguiente página', exact: true })
    .click();
  await expect(panel).toContainText('Página 2');
  await panel
    .getByRole('button', { name: 'Corregir ficha', exact: true })
    .click();
  await panel
    .getByLabel('Nombre completo', { exact: true })
    .fill('Nombre corregido');
  control.status = 409;
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(
    panel.getByLabel('Nombre completo', { exact: true }),
  ).toHaveValue('Nombre corregido');
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  control.status = 0;
  await panel
    .getByRole('button', { name: 'Releer ficha', exact: true })
    .click();
  await panel
    .getByRole('button', { name: 'Corregir ficha', exact: true })
    .click();
  await panel
    .getByLabel('Nombre completo', { exact: true })
    .fill('Nombre corregido');
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(panel).toContainText('Contacto histórico');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  await panel
    .getByLabel('Nombre completo', { exact: true })
    .fill('Nueva ficha');
  await panel.getByLabel('Teléfono', { exact: true }).fill('6145550101');
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(panel).toContainText('Nueva ficha');
  expect(control.writes.map((row) => row.path)).toEqual([
    '/clientes/1',
    '/clientes/1',
    '/clientes',
  ]);
  expect(control.writes[1].body.version).toBe(2);
  expect(control.writes[2].body.version).toBeUndefined();
  expect(errors).toEqual([]);
});

for (const width of [1366, 390])
  for (const theme of ['light', 'dark'])
    test(`T098/T099: directorio y panel ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const { errors } = await fixture(page, 'admin_negocio', theme);
      await page.goto('/admin/clientes');
      await expect(page.locator('[data-directory-open="1"]:visible')).toBeVisible();
      await page.screenshot({ path: `test-results/m4/directorio-${width}-${theme}.png` });
      await page.locator('[data-directory-open="1"]:visible').click();
      const panel = page.getByRole('dialog');
      await expect(panel).toContainText('Contacto histórico');
      await expect(panel).toHaveClass(/agenda-drawer/);
      await expect
        .poll(() =>
          panel.evaluate(
            (el) => Math.abs(el.getBoundingClientRect().right - innerWidth) < 1,
          ),
        )
        .toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/m4/clientes-${width}-${theme}.png`,
      });
      await panel.getByRole('button', { name: 'Corregir ficha', exact: true }).click();
      // El panel vuelve a animarse al reemplazar detalle por formulario: capturar solo su posición final.
      await expect.poll(() => panel.evaluate((el) => Math.abs(el.getBoundingClientRect().right - innerWidth) < 1)).toBe(true);
      await expect(panel.getByRole('button', { name: 'Guardar ficha', exact: true })).toBeInViewport();
      await page.screenshot({ path: `test-results/m4/ficha-editor-${width}-${theme}.png` });
      await page.keyboard.press('Escape');
      await expect(
        page.locator('[data-directory-open="1"]:visible'),
      ).toBeFocused();
      await page.goto('/admin/agenda');
      await page.locator('[data-m4-appointment="7"]').click();
      const saveSchedule = panel.getByRole('button', { name: 'Guardar horario', exact: true });
      await saveSchedule.scrollIntoViewIfNeeded(); await expect(saveSchedule).toBeInViewport();
      await page.screenshot({ path: `test-results/m4/horario-editor-${width}-${theme}.png` });
      expect(errors).toEqual([]);
    });

test('T098/T099: vacío real, historial fallido independiente y alta incierta sin reenvío', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.goto('/admin/clientes');
  await page.locator('[data-directory-open="1"]:visible').click();
  const panel = page.getByRole('dialog');
  await expect(panel).toContainText('Contacto histórico');
  control.historyStatus = 503;
  await panel
    .getByRole('button', { name: 'Siguiente página', exact: true })
    .click();
  await expect(panel).toContainText('Ana actual');
  await expect(panel.locator('[data-customer-history]')).toContainText(
    'Reintentar',
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  await panel.getByLabel('Nombre completo', { exact: true }).fill('Borrador');
  await panel.getByLabel('Teléfono', { exact: true }).fill('6145550101');
  control.status = 503;
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByLabel('Nombre completo', { exact: true }),
  ).toHaveValue('Borrador');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  expect(control.writes).toHaveLength(1);
  await page.keyboard.press('Escape');
  control.empty = true;
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Sin clientes');
});

test('T097/T098: profesional no recibe editor de horario ni directorio', async ({
  page,
}) => {
  await fixture(page, 'profesional');
  await page.goto('/admin/agenda');
  await page.locator('[data-m4-appointment="7"]').click();
  await expect(page.getByLabel('Nueva fecha')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Clientes', exact: true }),
  ).toHaveCount(0);
});

test('T099: cerrar durante el envío no habilita otro POST y un 400 permite corregir', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.goto('/admin/clientes');
  await page
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  const panel = page.getByRole('dialog');
  await panel
    .getByLabel('Nombre completo', { exact: true })
    .fill('Borrador lento');
  await panel.getByLabel('Teléfono', { exact: true }).fill('6145550101');
  control.status = 400;
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(panel.locator('[data-customer-error]')).toContainText('Rechazo');
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeEnabled();
  let release;
  control.delayWrite = new Promise((resolve) => {
    release = resolve;
  });
  control.status = 0;
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  release();
  await expect(
    panel.getByLabel('Nombre completo', { exact: true }),
  ).toHaveValue('Borrador lento');
  expect(control.writes).toHaveLength(2);
});

test('T097: borrador de otra versión exige relectura; una cita cancelada no se puede mover', async ({
  page,
}) => {
  const { control } = await fixture(page);
  await page.goto('/admin/agenda');
  await page.locator('[data-m4-appointment="7"]').click();
  const panel = page.getByRole('dialog');
  await panel.getByLabel('Nueva hora').fill('11:00');
  await page.keyboard.press('Escape');
  control.version++;
  await page.locator('[data-m4-appointment="7"]').click();
  await expect(panel.getByLabel('Nueva hora')).toHaveValue('11:00');
  await expect(
    panel.getByRole('button', { name: 'Guardar horario', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.route(
    (url) => url.pathname === '/citas/7',
    async (route) =>
      route.fulfill({
        json: {
          id: 7,
          version: 4,
          folio: 'M4-0007',
          estado: 'cancelada',
          inicioUtc: '2030-12-20T15:00:00Z',
          fechaLocal: '2030-12-20',
          horaInicio: '09:00:00',
          zonaHoraria: 'America/Chihuahua',
        },
      }),
  );
  await page.locator('[data-m4-appointment="7"]').click();
  await expect(
    panel.getByRole('button', { name: 'Guardar horario', exact: true }),
  ).toBeDisabled();
  expect(control.writes).toEqual([]);
});

for (const width of [1366, 390])
  for (const theme of ['light', 'dark'])
    test(`demo: directorio, corrección y teléfono compartido ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem('cita-theme', value),
        theme,
      );
      await page.goto('/admin/clientes?demo=1');
      const first = page.locator('[data-client]:visible').first();
      await first.click();
      const panel = page.getByRole('dialog');
      await expect(panel).toHaveClass(/agenda-drawer/);
      await panel
        .getByRole('button', { name: 'Corregir ficha', exact: true })
        .click();
      await panel
        .getByLabel('Nombre completo', { exact: true })
        .fill('Cliente demo corregido');
      const phone = await panel
        .getByLabel('Teléfono', { exact: true })
        .inputValue();
      await panel.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByRole('main')).toContainText(
        'Cliente demo corregido',
      );
      await page
        .getByRole('button', { name: 'Nuevo cliente', exact: true })
        .click();
      await panel
        .getByLabel('Nombre completo', { exact: true })
        .fill('Teléfono compartido demo');
      await panel.getByLabel('Teléfono de WhatsApp').fill(phone);
      await panel.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByRole('main')).toContainText(
        'Teléfono compartido demo',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/m4/demo-clientes-${width}-${theme}.png`,
      });
    });
