import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

// Todos los datos y mutaciones de esta suite son dobles HTTP; no escriben en el backend real.
async function prepararEscenario(pagina, rol = 'recepcionista', tema = 'light') {
  const { errores } = await prepararSesion(pagina, rol, tema);
  const control = {
    escrituras: [],
    estadoHttp: 0,
    estadoHistorial: 0,
    version: 2,
    citaMovida: false,
    nombreFicha: 'Ana actual',
    directorioVacio: false,
    esperaEscritura: null,
  };
  const ficha = (id = 1) => ({
    id,
    negocioId: 1,
    version: control.version,
    nombreCompleto: id === 1 ? control.nombreFicha : 'Otra persona',
    telefono: '6145550101',
    creadoEn: '2026-11-12T12:00:00Z',
  });
  await pagina.route(
    (url) =>
      /^\/clientes(?:\/\d+(?:\/citas)?)?$/.test(url.pathname) ||
      url.pathname === '/citas/7/horario' ||
      url.pathname === '/citas/7',
    async (rutaInterceptada) => {
      const solicitud = rutaInterceptada.request(),
        url = new URL(solicitud.url()),
        ruta = url.pathname;
      if (solicitud.method() !== 'GET') {
        control.escrituras.push({
          path: ruta,
          method: solicitud.method(),
          body: solicitud.postDataJSON(),
        });
        if (control.esperaEscritura) await control.esperaEscritura;
        if (control.estadoHttp) {
          await rutaInterceptada.fulfill({
            status: control.estadoHttp,
            json: { message: 'Rechazo de prueba' },
          });
          return;
        }
        control.version++;
        if (ruta.endsWith('/horario')) control.citaMovida = true;
        else control.nombreFicha = solicitud.postDataJSON().nombreCompleto;
      }
      let datos;
      if (ruta === '/citas/7' || ruta.endsWith('/horario'))
        datos = {
          id: 7,
          folio: 'M4-0007',
          version: control.version,
          estado: 'confirmada',
          inicioUtc: control.citaMovida
            ? '2030-12-21T16:00:00Z'
            : '2030-12-20T15:00:00Z',
          finUtc: '2030-12-21T16:30:00Z',
          finOcupacionUtc: '2030-12-21T16:35:00Z',
          fechaLocal: control.citaMovida ? '2030-12-21' : '2030-12-20',
          horaInicio: control.citaMovida ? '10:00:00' : '09:00:00',
          zonaHoraria: 'America/Chihuahua',
          nombreContacto: 'Contacto histórico',
        };
      else if (ruta.endsWith('/citas')) {
        if (control.estadoHistorial) {
          await rutaInterceptada.fulfill({
            status: control.estadoHistorial,
            json: { message: 'Historial no disponible' },
          });
          return;
        }
        datos = {
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
      } else if (ruta === '/clientes' && solicitud.method() === 'GET')
        datos = {
          clientes: control.directorioVacio ? [] : [ficha(), ficha(2)],
          pagina: Number(url.searchParams.get('pagina')),
          limite: 50,
          hayMas: url.searchParams.get('pagina') === '1',
        };
      else datos = ficha();
      await rutaInterceptada.fulfill({ json: datos });
    },
  );
  return { control, errores };
}

test('T097: rechazo conserva horario y borrador; relectura explícita permite mover el mismo folio', async ({
  page: pagina,
}) => {
  const { control } = await prepararEscenario(pagina);
  await pagina.goto('/admin/agenda');
  await pagina.locator('[data-agenda-cita="7"]').click();
  const panel = pagina.getByRole('dialog');
  await panel.getByLabel('Nueva fecha').fill('2030-12-21');
  await panel.getByLabel('Nueva hora').fill('10:00');
  control.estadoHttp = 409;
  await panel
    .getByRole('button', { name: 'Guardar horario', exact: true })
    .click();
  await expect(panel.locator('[data-horario-error]')).toContainText(
    'conflicto',
  );
  await expect(panel).toContainText('2030-12-20');
  await expect(panel.getByLabel('Nueva fecha')).toHaveValue('2030-12-21');
  await expect(
    panel.getByRole('button', { name: 'Guardar horario', exact: true }),
  ).toBeDisabled();
  await pagina.keyboard.press('Escape');
  await pagina.locator('[data-agenda-cita="7"]').click();
  await expect(panel.getByLabel('Nueva fecha')).toHaveValue('2030-12-21');
  control.estadoHttp = 0;
  await panel
    .getByRole('button', { name: 'Releer horario', exact: true })
    .click();
  await panel.getByLabel('Nueva fecha').fill('2030-12-21');
  await panel.getByLabel('Nueva hora').fill('10:00');
  await panel
    .getByRole('button', { name: 'Guardar horario', exact: true })
    .click();
  await expect(panel.locator('.agenda-campos-detalle')).toContainText('2030-12-21');
  expect(control.escrituras.at(-1)).toEqual({
    path: '/citas/7/horario',
    method: 'PATCH',
    body: { fechaLocal: '2030-12-21', horaInicio: '10:00', version: 2 },
  });
  await expect(panel).toContainText('M4-0007');
});

test('T098/T099: fichas distintas con teléfono compartido, historial separado, alta y corrección versionada', async ({
  page: pagina,
}) => {
  const { control, errores } = await prepararEscenario(pagina);
  await pagina.goto('/admin/clientes');
  await expect(pagina.locator('[data-directorio-abrir]')).toHaveCount(4); // Tabla y tarjetas comparten las dos fichas.
  await pagina.getByLabel('Buscar clientes', { exact: true }).fill('Ana');
  await pagina.getByRole('button', { name: 'Buscar', exact: true }).click();
  await pagina.locator('[data-directorio-abrir="1"]:visible').click();
  const panel = pagina.getByRole('dialog');
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
  control.estadoHttp = 409;
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(
    panel.getByLabel('Nombre completo', { exact: true }),
  ).toHaveValue('Nombre corregido');
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  control.estadoHttp = 0;
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
  await pagina.keyboard.press('Escape');
  await pagina
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
  expect(control.escrituras.map((fila) => fila.path)).toEqual([
    '/clientes/1',
    '/clientes/1',
    '/clientes',
  ]);
  expect(control.escrituras[1].body.version).toBe(2);
  expect(control.escrituras[2].body.version).toBeUndefined();
  expect(errores).toEqual([]);
});

for (const ancho of [1366, 390])
  for (const tema of ['light', 'dark'])
    test(`T098/T099: directorio y panel ${ancho}px ${tema}`, async ({
      page: pagina,
    }) => {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      const { errores } = await prepararEscenario(pagina, 'admin_negocio', tema);
      await pagina.goto('/admin/clientes');
      await expect(pagina.locator('[data-directorio-abrir="1"]:visible')).toBeVisible();
      await pagina.screenshot({ path: `test-results/m4/directorio-${ancho}-${tema}.png` });
      await pagina.locator('[data-directorio-abrir="1"]:visible').click();
      const panel = pagina.getByRole('dialog');
      await expect(panel).toContainText('Contacto histórico');
      await expect(panel).toHaveClass(/agenda-panel-lateral/);
      await expect
        .poll(() =>
          panel.evaluate(
            (elemento) => Math.abs(elemento.getBoundingClientRect().right - innerWidth) < 1,
          ),
        )
        .toBe(true);
      expect(
        await pagina.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await pagina.screenshot({
        path: `test-results/m4/clientes-${ancho}-${tema}.png`,
      });
      await panel.getByRole('button', { name: 'Corregir ficha', exact: true }).click();
      // El panel vuelve a animarse al reemplazar detalle por formulario: capturar solo su posición final.
      await expect.poll(() => panel.evaluate((elemento) => Math.abs(elemento.getBoundingClientRect().right - innerWidth) < 1)).toBe(true);
      await expect(panel.getByRole('button', { name: 'Guardar ficha', exact: true })).toBeInViewport();
      await pagina.screenshot({ path: `test-results/m4/ficha-editor-${ancho}-${tema}.png` });
      await pagina.keyboard.press('Escape');
      await expect(
        pagina.locator('[data-directorio-abrir="1"]:visible'),
      ).toBeFocused();
      await pagina.goto('/admin/agenda');
      await pagina.locator('[data-agenda-cita="7"]').click();
      const guardarHorario = panel.getByRole('button', { name: 'Guardar horario', exact: true });
      await guardarHorario.scrollIntoViewIfNeeded(); await expect(guardarHorario).toBeInViewport();
      await pagina.screenshot({ path: `test-results/m4/horario-editor-${ancho}-${tema}.png` });
      expect(errores).toEqual([]);
    });

test('T098/T099: vacío real, historial fallido independiente y alta incierta sin reenvío', async ({
  page: pagina,
}) => {
  const { control } = await prepararEscenario(pagina);
  await pagina.goto('/admin/clientes');
  await pagina.locator('[data-directorio-abrir="1"]:visible').click();
  const panel = pagina.getByRole('dialog');
  await expect(panel).toContainText('Contacto histórico');
  control.estadoHistorial = 503;
  await panel
    .getByRole('button', { name: 'Siguiente página', exact: true })
    .click();
  await expect(panel).toContainText('Ana actual');
  await expect(panel.locator('[data-ficha-historial]')).toContainText(
    'Reintentar',
  );
  await pagina.keyboard.press('Escape');
  await pagina
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  await panel.getByLabel('Nombre completo', { exact: true }).fill('Borrador');
  await panel.getByLabel('Teléfono', { exact: true }).fill('6145550101');
  control.estadoHttp = 503;
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByLabel('Nombre completo', { exact: true }),
  ).toHaveValue('Borrador');
  await pagina.keyboard.press('Escape');
  await pagina
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  expect(control.escrituras).toHaveLength(1);
  await pagina.keyboard.press('Escape');
  control.directorioVacio = true;
  await pagina.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(pagina.getByRole('main')).toContainText('Sin clientes');
});

test('T097/T098: profesional no recibe editor de horario ni directorio', async ({
  page: pagina,
}) => {
  await prepararEscenario(pagina, 'profesional');
  await pagina.goto('/admin/agenda');
  await pagina.locator('[data-agenda-cita="7"]').click();
  await expect(pagina.getByLabel('Nueva fecha')).toHaveCount(0);
  await expect(
    pagina.getByRole('link', { name: 'Clientes', exact: true }),
  ).toHaveCount(0);
});

test('T099: cerrar durante el envío no habilita otro POST y un 400 permite corregir', async ({
  page: pagina,
}) => {
  const { control } = await prepararEscenario(pagina);
  await pagina.goto('/admin/clientes');
  await pagina
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  const panel = pagina.getByRole('dialog');
  await panel
    .getByLabel('Nombre completo', { exact: true })
    .fill('Borrador lento');
  await panel.getByLabel('Teléfono', { exact: true }).fill('6145550101');
  control.estadoHttp = 400;
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(panel.locator('[data-ficha-error]')).toContainText('Entrada inválida');
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeEnabled();
  let liberar;
  control.esperaEscritura = new Promise((resolverPromesa) => {
    liberar = resolverPromesa;
  });
  control.estadoHttp = 0;
  await panel
    .getByRole('button', { name: 'Guardar ficha', exact: true })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  await pagina.keyboard.press('Escape');
  await pagina
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  liberar();
  await expect(
    panel.getByLabel('Nombre completo', { exact: true }),
  ).toHaveValue('Borrador lento');
  expect(control.escrituras).toHaveLength(2);
});

test('T097: borrador de otra versión exige relectura; una cita cancelada no se puede mover', async ({
  page: pagina,
}) => {
  const { control } = await prepararEscenario(pagina);
  await pagina.goto('/admin/agenda');
  await pagina.locator('[data-agenda-cita="7"]').click();
  const panel = pagina.getByRole('dialog');
  await panel.getByLabel('Nueva hora').fill('11:00');
  await pagina.keyboard.press('Escape');
  control.version++;
  await pagina.locator('[data-agenda-cita="7"]').click();
  await expect(panel.getByLabel('Nueva hora')).toHaveValue('11:00');
  await expect(
    panel.getByRole('button', { name: 'Guardar horario', exact: true }),
  ).toBeDisabled();
  await pagina.keyboard.press('Escape');
  await pagina.route(
    (url) => url.pathname === '/citas/7',
    async (rutaInterceptada) =>
      rutaInterceptada.fulfill({
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
  await pagina.locator('[data-agenda-cita="7"]').click();
  await expect(
    panel.getByRole('button', { name: 'Guardar horario', exact: true }),
  ).toBeDisabled();
  expect(control.escrituras).toEqual([]);
});

for (const ancho of [1366, 390])
  for (const tema of ['light', 'dark'])
    test(`demo: directorio, corrección y teléfono compartido ${ancho}px ${tema}`, async ({
      page: pagina,
    }) => {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      await pagina.addInitScript(
        (valor) => localStorage.setItem('cita-theme', valor),
        tema,
      );
      await pagina.goto('/admin/clientes?demo=1');
      const primeraFicha = pagina.locator('[data-ficha-demo-abrir]:visible').first();
      await primeraFicha.click();
      const panel = pagina.getByRole('dialog');
      await expect(panel).toHaveClass(/agenda-panel-lateral/);
      await panel
        .getByRole('button', { name: 'Corregir ficha', exact: true })
        .click();
      await panel
        .getByLabel('Nombre completo', { exact: true })
        .fill('Cliente demo corregido');
      const telefono = await panel
        .getByLabel('Teléfono', { exact: true })
        .inputValue();
      await panel.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(pagina.getByRole('main')).toContainText(
        'Cliente demo corregido',
      );
      await pagina
        .getByRole('button', { name: 'Nuevo cliente', exact: true })
        .click();
      await panel
        .getByLabel('Nombre completo', { exact: true })
        .fill('Teléfono compartido demo');
      await panel.getByLabel('Teléfono de WhatsApp').fill(telefono);
      await panel.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(pagina.getByRole('main')).toContainText(
        'Teléfono compartido demo',
      );
      expect(
        await pagina.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await pagina.screenshot({
        path: `test-results/m4/demo-clientes-${ancho}-${tema}.png`,
      });
    });
