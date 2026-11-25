import { test, expect } from '@playwright/test';
import { prepararSesion } from './agenda.respuestas-simuladas.js';

// Cambios de otra sesión simulados en HTTP: esta suite nunca arranca ni escribe en Nest/MariaDB.
async function datosPrueba(pagina, tema = 'light') {
  const { errores } = await prepararSesion(pagina, 'recepcionista', tema);
  const control = {
    version: 2,
    nombre: 'Contacto inicial',
    estadoHttp: 0,
    lecturas: 0,
    escrituras: [],
    vacio: false,
  };
  await pagina.route(
    (url) =>
      ['/citas', '/citas/7', '/clientes', '/clientes/1'].includes(url.pathname),
    async (rutaInterceptada) => {
      const peticion = rutaInterceptada.request(),
        url = new URL(peticion.url()),
        ruta = url.pathname;
      if (peticion.method() !== 'GET') control.escrituras.push(ruta);
      if (control.estadoHttp && ['/citas', '/clientes'].includes(ruta)) {
        await rutaInterceptada.fulfill({
          status: control.estadoHttp,
          json: { message: 'SQL SELECT contacto secreto stack trace' },
        });
        return;
      }
      const resumen = {
        id: 7,
        version: control.version,
        estado: 'confirmada',
        origen: 'manual',
        nombreContacto: control.nombre,
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
      const ficha = {
        id: 1,
        negocioId: 1,
        version: control.version,
        nombreCompleto: control.nombre,
        telefono: '6145550101',
      };
      let datos;
      if (ruta === '/citas') {
        control.lecturas++;
        datos = {
          desde: url.searchParams.get('desde'),
          hasta: url.searchParams.get('hasta'),
          citas: control.vacio ? [] : [resumen],
        };
      } else if (ruta === '/citas/7') datos = resumen;
      else if (ruta === '/clientes')
        datos = {
          clientes: [ficha],
          pagina: Number(url.searchParams.get('pagina') || 1),
          limite: 50,
          hayMas: true,
        };
      else datos = ficha;
      await rutaInterceptada.fulfill({ json: datos });
    },
  );
  return { control, errores };
}

test('T100: refresco temporizado actualiza la agenda sin acción manual', async ({
  page: pagina,
}) => {
  await pagina.clock.install();
  const { control, errores } = await datosPrueba(pagina);
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toContainText(
    'Contacto inicial',
  );
  control.nombre = 'Cambio externo';
  control.version++;
  await pagina.clock.runFor(30001);
  await expect(pagina.locator('[data-agenda-cita="7"]')).toContainText(
    'Cambio externo',
  );
  expect(control.lecturas).toBeGreaterThan(1);
  expect(errores).toEqual([]);
});

test('T100: foco verifica versión y conserva borrador; Guardar queda bloqueado antes del PATCH', async ({
  page: pagina,
}) => {
  const { control } = await datosPrueba(pagina);
  await pagina.goto('/admin/agenda');
  await pagina.locator('[data-agenda-cita="7"]').click();
  const panel = pagina.getByRole('dialog');
  await panel.getByLabel('Motivo del cambio').fill('Texto pendiente');
  control.version++;
  await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(panel.locator('[data-estado-error]')).toContainText(
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
  expect(control.escrituras).toEqual([]);
});

test('T100/T101: refresco fallido conserva datos previos con aviso explícito; reintento recupera', async ({
  page: pagina,
}) => {
  const { control } = await datosPrueba(pagina);
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  control.estadoHttp = 503;
  await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(pagina.locator('[data-aviso-en-vivo]')).toContainText(
    'sin actualizar',
  );
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  await expect(pagina.getByRole('main')).not.toContainText('SELECT');
  control.estadoHttp = 0;
  control.nombre = 'Recuperado';
  await pagina.locator('[data-agenda-reintentar]').click();
  await expect(pagina.locator('[data-agenda-cita="7"]')).toContainText(
    'Recuperado',
  );
  await expect(pagina.locator('[data-aviso-en-vivo]')).toHaveCount(0);
});

for (const [estadoHttp, texto] of [
  [400, 'Entrada inválida'],
  [403, 'Acceso no permitido'],
  [404, 'Recurso no disponible'],
  [409, 'Conflicto'],
  [500, 'Fallo técnico'],
  [503, 'Fallo técnico'],
])
  test(`T101: directorio diferencia ${estadoHttp} y no imprime trazas`, async ({
    page: pagina,
  }) => {
    const { control } = await datosPrueba(pagina);
    control.estadoHttp = estadoHttp;
    await pagina.goto('/admin/clientes');
    await expect(pagina.getByRole('main')).toContainText(texto);
    await expect(pagina.getByRole('main')).not.toContainText('SELECT');
    await expect(pagina.getByRole('main')).not.toContainText('Sin clientes');
  });

test('T100/T102: corrección de ficha conserva teclado y detecta obsolescencia sin reemplazar campos', async ({
  page: pagina,
}) => {
  const { control } = await datosPrueba(pagina);
  await pagina.goto('/admin/clientes');
  await pagina.locator('[data-directorio-abrir="1"]:visible').click();
  const panel = pagina.getByRole('dialog');
  await panel
    .getByRole('button', { name: 'Corregir ficha', exact: true })
    .click();
  const campo = panel.getByLabel('Nombre completo', { exact: true });
  await campo.fill('Mi borrador');
  control.version++;
  await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(panel.locator('[data-ficha-error]')).toContainText(
    'otra sesión',
  );
  await expect(campo).toHaveValue('Mi borrador');
  await expect(campo).toBeFocused();
  await expect(
    panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
  ).toBeDisabled();
  expect(control.escrituras).toEqual([]);
});

test('T100: un cambio externo invalida la selección manual sin borrar contacto', async ({
  page: pagina,
}) => {
  const { control } = await datosPrueba(pagina);
  await pagina.route(
    (url) => url.pathname === '/disponibilidad',
    (rutaInterceptada) =>
      rutaInterceptada.fulfill({
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
  await pagina.goto('/admin/agenda');
  await pagina.getByRole('button', { name: 'Nueva cita', exact: true }).click();
  const panel = pagina.getByRole('dialog');
  for (const nombre of ['servicioId', 'sucursalId', 'personalId'])
    await panel.locator(`[name="${nombre}"]`).fill('1');
  await panel.getByLabel('Fecha', { exact: true }).fill('2030-12-20');
  await panel
    .getByRole('button', { name: 'Consultar horarios', exact: true })
    .click();
  await panel.locator('[name="horario"]').selectOption('0');
  await panel
    .getByLabel('Nombre completo', { exact: true })
    .fill('Conservar contacto');
  control.version++;
  await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
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
  expect(control.escrituras).toEqual([]);
});

test('T100/T102: refresco conserva búsqueda en edición y posición del cursor; no sondea fuera de agenda', async ({
  page: pagina,
}) => {
  await pagina.clock.install();
  const { control } = await datosPrueba(pagina);
  await pagina.goto('/admin/agenda');
  await expect(pagina.locator('[data-agenda-cita="7"]')).toBeVisible();
  const busqueda = pagina.getByRole('searchbox', {
    name: 'Buscar paciente',
    exact: true,
  });
  // Cambiar el DOM sin input representa un borrador aún no aplicado por el debounce.
  await busqueda.evaluate((elemento) => {
    elemento.value = 'Texto pendiente';
    elemento.focus();
    elemento.setSelectionRange(3, 3);
  });
  await pagina.clock.runFor(30001);
  await expect(busqueda).toHaveValue('Texto pendiente');
  await expect(busqueda).toBeFocused();
  expect(await busqueda.evaluate((elemento) => elemento.selectionStart)).toBe(3);
  await pagina.goto('/admin/clientes');
  const lecturas = control.lecturas;
  await pagina.clock.runFor(60001);
  expect(control.lecturas).toBe(lecturas);
});

test('T101: 401 vuelve al acceso; un fallo de red no parece directorio vacío', async ({
  page: pagina,
}) => {
  const { control } = await datosPrueba(pagina);
  control.estadoHttp = 401;
  await pagina.goto('/admin/clientes');
  await expect(
    pagina.getByText('Tu sesión venció. Por favor, inicia sesión de nuevo.'),
  ).toBeVisible();
  await expect(pagina.locator('[data-directorio-abrir]')).toHaveCount(0);
  control.estadoHttp = 0;
  await pagina.goto('/admin/clientes');
  await pagina.route(
    (url) => url.pathname === '/clientes',
    (rutaInterceptada) => rutaInterceptada.abort('failed'),
  );
  await pagina.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(pagina.getByRole('main')).toContainText('Sin conexión');
  await expect(pagina.getByRole('main')).not.toContainText('Sin clientes');
});

test('T102: cerrar detalle devuelve foco a Hoy cuando la cita deja de estar en el periodo', async ({
  page: pagina,
}) => {
  const { control } = await datosPrueba(pagina);
  await pagina.goto('/admin/agenda');
  await pagina.locator('[data-agenda-cita="7"]').click();
  control.vacio = true;
  await pagina.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(pagina.locator('[data-agenda-cita="7"]')).toHaveCount(0);
  await pagina.keyboard.press('Escape');
  await expect(
    pagina.getByRole('button', { name: 'Hoy', exact: true }),
  ).toBeFocused();
});

for (const ancho of [1366, 390])
  for (const tema of ['light', 'dark'])
    test(`T102: teclado y paneles ${ancho}px ${tema}`, async ({ page: pagina }) => {
      await pagina.setViewportSize({ width: ancho, height: 900 });
      const { errores } = await datosPrueba(pagina, tema);
      await pagina.goto('/admin/clientes');
      const ficha = pagina.locator('[data-directorio-abrir="1"]:visible');
      await ficha.focus();
      await pagina.keyboard.press('Enter');
      const panel = pagina.getByRole('dialog');
      await panel
        .getByRole('button', { name: 'Corregir ficha', exact: true })
        .click();
      await expect(
        panel.getByLabel('Nombre completo', { exact: true }),
      ).toBeFocused();
      await pagina.keyboard.press('Tab');
      await expect(panel.getByLabel('Teléfono', { exact: true })).toBeFocused();
      await expect
        .poll(() =>
          panel.evaluate(
            (elemento) => Math.abs(elemento.getBoundingClientRect().right - innerWidth) < 1,
          ),
        )
        .toBe(true);
      await expect(
        panel.getByRole('button', { name: 'Guardar ficha', exact: true }),
      ).toBeInViewport();
      await pagina.screenshot({
        path: `test-results/m4/t102-${ancho}-${tema}.png`,
      });
      await pagina.keyboard.press('Escape');
      await expect(ficha).toBeFocused();
      await pagina
        .getByRole('button', { name: 'Siguiente página', exact: true })
        .click();
      await expect(pagina.getByRole('main')).toContainText('Página 2');
      await expect(
        pagina.getByRole('button', { name: 'Siguiente página', exact: true }),
      ).toBeFocused();
      expect(
        await pagina.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errores).toEqual([]);
    });

// El calendario semanal usa desplazamiento horizontal en móvil; el refresco conserva esa referencia temporal.
test('T102: el refresco conserva el desplazamiento y foco del calendario móvil', async ({ page: pagina }) => {
  await pagina.setViewportSize({ width: 390, height: 900 }); await pagina.clock.install(); const { control } = await datosPrueba(pagina);
  await pagina.goto('/admin/agenda'); await pagina.getByRole('button', { name: 'Semana', exact: true }).click();
  await expect(pagina.locator('.calendario-semana:not(.dia-unico)')).toBeVisible();
  const desplazamiento = pagina.locator('.calendario-desplazamiento'); await expect(desplazamiento).toBeVisible(); await desplazamiento.focus();
  await desplazamiento.evaluate((elemento) => { elemento.scrollLeft = 120; }); const izquierda = await desplazamiento.evaluate((elemento) => elemento.scrollLeft); expect(izquierda).toBeGreaterThan(0);
  const lecturas = control.lecturas; await pagina.clock.runFor(30001); await expect.poll(() => control.lecturas).toBeGreaterThan(lecturas);
  await expect(desplazamiento).toBeFocused(); expect(await desplazamiento.evaluate((elemento) => elemento.scrollLeft)).toBe(izquierda);
});
