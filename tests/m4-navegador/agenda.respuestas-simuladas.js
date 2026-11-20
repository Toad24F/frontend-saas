// Respuestas simuladas con los nombres exactos del contrato privado M4, incluidos los valores históricos nulos.
export async function prepararSesion(pagina, rol = 'recepcionista', tema = 'light', sembrarToken = true) {
  const solicitudesObservadas = [], errores = [];
  pagina.on('pageerror', (error) => errores.push(error.message));
  await pagina.addInitScript(({ tema, sembrarToken }) => {
    if (sembrarToken) sessionStorage.setItem('cita-session', 'm4-test');
    localStorage.setItem('cita-theme', tema);
  }, { tema, sembrarToken });
  await pagina.route((url) => url.port === '3000', async (rutaInterceptada) => {
    const url = new URL(rutaInterceptada.request().url()), ruta = url.pathname;
    solicitudesObservadas.push(`${rutaInterceptada.request().method()} ${ruta}`);
    let datos;
    if (ruta === '/auth/profile') datos = { user: { sub: 1, rol, negocioId: 1, nombre: 'Personal QA', negocioNombre: 'Negocio QA' } };
    else if (ruta === '/negocios') datos = [];
    else if (ruta === '/clientes') datos = { clientes: [], pagina: Number(url.searchParams.get('pagina') || 1), limite: 50, hayMas: false };
    else if (ruta === '/citas') {
      const desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta');
      if (url.searchParams.get('busqueda') === 'error') { await rutaInterceptada.fulfill({ status: 503, json: { message: 'Servicio temporalmente no disponible.' } }); return; }
      if (url.searchParams.get('busqueda') === 'exceso') { await rutaInterceptada.fulfill({ status: 400, json: { message: 'La consulta supera 1.000 citas. Acota el periodo o los filtros.' } }); return; }
      let hoyLocal;
      try { hoyLocal = await pagina.evaluate(() => new Date().toLocaleDateString('en-CA')); }
      catch (error) {
        if (!/context was destroyed|closed|test ended/i.test(error.message)) throw error;
        await rutaInterceptada.abort().catch(() => {}); return; // La navegación o la prueba ya terminó.
      }
      const dia = desde <= hoyLocal && hoyLocal <= hasta ? hoyLocal : desde;
      const cita = { id: 7, version: 2, folio: 'M4-0007', estado: 'confirmada', origen: 'manual', nombreContacto: 'Paciente <QA>', nombreServicio: 'Consulta histórica', nombreSucursal: 'Sucursal histórica', nombreProfesional: 'Profesional QA', sucursalId: 1, personalId: 1, fechaLocal: dia, horaInicio: '07:15:00', fechaFinLocal: dia, horaFin: '08:00:00', zonaHoraria: 'America/Tijuana', causas: [{ codigo: 'servicio_inactivo' }] };
      datos = { desde, hasta, citas: url.searchParams.get('busqueda') === 'vacío' ? [] : [cita] };
    } else if (ruta === '/citas/7') datos = { id: 7, folio: 'M4-0007', version: 2, estado: 'confirmada', origen: 'manual', nombreContacto: 'Paciente <QA>', telefonoContacto: '6145550101', motivoConsulta: 'Nota <segura>', nombreServicio: 'Consulta histórica', nombreSucursal: 'Sucursal histórica', nombreProfesional: null, costoAceptado: '200.00', fechaLocal: '2026-11-11', horaInicio: '23:30:00', fechaFinLocal: '2026-11-12', horaFin: '00:15:00', zonaHoraria: 'America/Tijuana', causas: [] };
    else if (ruta === '/citas/7/historial') {
      const pagina = Number(url.searchParams.get('pagina'));
      datos = { pagina, limite: 50, hayMas: pagina === 1, eventos: [{ id: pagina === 1 ? '9007199254740993' : '9007199254740994', accion: pagina === 1 ? 'alta' : 'cambio_horario', ocurridoEn: '2026-11-11T15:00:00Z', versionResultante: pagina, origenActor: pagina === 1 ? 'portal_publico' : 'personal', actorUsuarioId: pagina === 1 ? null : 1, valoresAntes: null, valoresDespues: { estado: 'confirmada' }, motivo: 'Motivo <seguro>' }] };
    } else if (ruta.endsWith('/cupo')) datos = { limite: 5, activos: 0, disponibles: 5, limiteSucursalesActivas: 5, sucursalesActivas: 0 };
    else if (ruta.endsWith('/oferta')) datos = { cuentaActiva: true, sucursales: rol === 'profesional' ? [{ id: 1, nombre: 'Sucursal histórica', atencionActiva: true, sucursalActiva: true }] : [] };
    else if (['/servicios', '/sucursales', '/profesionales', '/recepcionistas', '/bloqueos'].includes(ruta) || ruta.endsWith('/horario') || ruta.endsWith('/servicios')) datos = [];
    else { await rutaInterceptada.fulfill({ status: 404, json: { message: 'Ruta no preparada' } }); return; }
    await rutaInterceptada.fulfill({ json: datos });
  });
  return { solicitudesObservadas, errores };
}

