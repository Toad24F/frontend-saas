// Fixtures ficticias con los nombres exactos del contrato privado M4, incluidos snapshots nulos.
export async function setup(page, role = 'recepcionista', theme = 'light') {
  const seen = [], errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((theme) => { sessionStorage.setItem('cita-session', 'm4-test'); localStorage.setItem('cita-theme', theme); }, theme);
  await page.route((url) => url.port === '3000', async (route) => {
    const url = new URL(route.request().url()), path = url.pathname;
    seen.push(`${route.request().method()} ${path}`);
    let data;
    if (path === '/auth/profile') data = { user: { sub: 1, rol: role, negocioId: 1, nombre: 'Personal QA', negocioNombre: 'Negocio QA' } };
    else if (path === '/negocios') data = [];
    else if (path === '/citas') {
      const desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta');
      if (url.searchParams.get('busqueda') === 'error') { await route.fulfill({ status: 503, json: { message: 'Servicio temporalmente no disponible.' } }); return; }
      if (url.searchParams.get('busqueda') === 'exceso') { await route.fulfill({ status: 400, json: { message: 'La consulta supera 1.000 citas. Acota el periodo o los filtros.' } }); return; }
      const cita = { id: 7, version: 2, folio: 'M4-0007', estado: 'confirmada', origen: 'manual', nombreContacto: 'Paciente <QA>', nombreServicio: 'Consulta histórica', nombreSucursal: 'Sucursal histórica', nombreProfesional: 'Profesional QA', sucursalId: 1, personalId: 1, fechaLocal: desde, horaInicio: '07:15:00', fechaFinLocal: desde, horaFin: '08:00:00', zonaHoraria: 'America/Tijuana', causas: [{ codigo: 'servicio_inactivo' }] };
      data = { desde, hasta, citas: url.searchParams.get('busqueda') === 'vacío' ? [] : [cita] };
    } else if (path === '/citas/7') data = { id: 7, folio: 'M4-0007', version: 2, estado: 'confirmada', origen: 'manual', nombreContacto: 'Paciente <QA>', telefonoContacto: '6145550101', motivoConsulta: 'Nota <segura>', nombreServicio: 'Consulta histórica', nombreSucursal: 'Sucursal histórica', nombreProfesional: null, costoAceptado: '200.00', fechaLocal: '2026-11-11', horaInicio: '23:30:00', fechaFinLocal: '2026-11-12', horaFin: '00:15:00', zonaHoraria: 'America/Tijuana', causas: [] };
    else if (path === '/citas/7/historial') {
      const pagina = Number(url.searchParams.get('pagina'));
      data = { pagina, limite: 50, hayMas: pagina === 1, eventos: [{ id: pagina === 1 ? '9007199254740993' : '9007199254740994', accion: pagina === 1 ? 'alta' : 'cambio_horario', ocurridoEn: '2026-11-11T15:00:00Z', versionResultante: pagina, origenActor: pagina === 1 ? 'portal_publico' : 'personal', actorUsuarioId: pagina === 1 ? null : 1, valoresAntes: null, valoresDespues: { estado: 'confirmada' }, motivo: 'Motivo <seguro>' }] };
    } else if (path.endsWith('/cupo')) data = { limite: 5, activos: 0, disponibles: 5, limiteSucursalesActivas: 5, sucursalesActivas: 0 };
    else if (path.endsWith('/oferta')) data = { cuentaActiva: true, sucursales: [] };
    else if (['/servicios', '/sucursales', '/profesionales', '/recepcionistas', '/bloqueos'].includes(path) || path.endsWith('/horario') || path.endsWith('/servicios')) data = [];
    else { await route.fulfill({ status: 404, json: { message: 'Ruta no preparada' } }); return; }
    await route.fulfill({ json: data });
  });
  return { seen, errors };
}

