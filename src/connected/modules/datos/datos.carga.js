import { reemplazarDatos, minutosAHora } from '../../../shared/aplicacion.datos.js';
import { api, usuarioActual } from '../autenticacion/sesion.estado.js';
import { cargarCuposPorRol, limpiarCuposPorRol } from '../catalogos/catalogos.cupo.js';
import { establecerCupoSucursales } from '../sucursales/sucursales.cupo.js';

const iniciales = (nombre) => nombre.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('');
const formatearMinutos = (valor) => valor == null ? '' : minutosAHora(valor % 1440);
export async function cargarDatosBackend() {
  establecerCupoSucursales(null);
  limpiarCuposPorRol();
  const negocioId = usuarioActual.negocioId || 1;
  const datos = { tenants: [], professionals: [], receptionists: [], branches: [], services: [], schedules: [], blocks: [], appointments: [], clients: [], holds: [] };
  const nombreNegocio = usuarioActual.nombreNegocio || 'Mi negocio';
  // Login y perfil entregan el identificador público del negocio reconstruido
  // en servidor. Una respuesta antigua/inválida no reutiliza otro enlace.
  const identificador = usuarioActual.identificadorPublico;
  const slug = usuarioActual.rol !== 'superadmin' && typeof identificador === 'string' && identificador.length <= 80 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(identificador) ? identificador : '';
  datos.tenants = [{ id: negocioId, name: usuarioActual.rol === 'superadmin' ? 'Plataforma' : nombreNegocio, slug, initials: iniciales(usuarioActual.rol === 'superadmin' ? 'Plataforma' : nombreNegocio), mode: null }];
  if (usuarioActual.rol === 'superadmin') {
    const negocios = await api('/negocios');
    datos.tenants = await Promise.all(negocios.map(async (registro) => {
      const [vigencia, envios] = await Promise.all([
        registro.licencia ? api(`/licencias/${registro.licencia.id}/vigencia`) : null,
        api(`/negocios/${registro.id}/envios`),
      ]);
      return { id: registro.id, name: registro.nombre, slug: registro.identificadorPublico, initials: iniciales(registro.nombre), email: registro.administrador?.email || registro.emailContacto || '', phone: registro.telefonoContacto || '', category: registro.administrador?.activadoEn ? 'Activado' : 'Pendiente de activación', suspended: ['suspendida', 'suspension_pendiente'].includes(vigencia?.estado), licenseId: registro.licencia?.id, license: vigencia?.estado || 'pendiente', validity: vigencia, failedDeliveries: envios.filter((envio) => envio.estado === 'fallido').length };
    }));
    if (!datos.tenants.length) datos.tenants.push({ id: 1, name: 'Plataforma', initials: 'PL', slug: '' });
  } else if (usuarioActual.rol === 'profesional') {
    const [servicios, horarios, bloqueos, oferta, catalogoSucursales] = await Promise.all([
      api(`/profesionales/${usuarioActual.id}/servicios`),
      api(`/profesionales/${usuarioActual.id}/horario`),
      api('/bloqueos'),
      api(`/profesionales/${usuarioActual.id}/oferta`),
      api('/sucursales').catch(() => null),
    ]);
    const sucursalesIds = oferta.sucursales.map((sucursal) => sucursal.id);
    const detallesSucursales = new Map((catalogoSucursales || []).map((sucursal) => [sucursal.id, sucursal]));
    datos.services = servicios.map((registro) => ({ id: registro.id, tenantId: negocioId, name: registro.nombre, duration: registro.duracionMinutos, price: Number(registro.costo), active: registro.activo, description: registro.descripcion || '', creatorId: registro.creadorPersonalId, icon: 'briefcase', color: 'azul' }));
    datos.professionals = [{ id: usuarioActual.id, tenantId: negocioId, name: usuarioActual.nombre, email: usuarioActual.email, active: oferta.cuentaActiva, specialty: '', initials: iniciales(usuarioActual.nombre), color: 'durazno', branchIds: sucursalesIds, serviceIds: servicios.filter((registro) => registro.seleccionado).map((registro) => registro.id) }];
    datos.branches = oferta.sucursales.map((sucursal) => {
      const detalle = detallesSucursales.get(sucursal.id);
      return { id: sucursal.id, tenantId: negocioId, name: detalle?.nombre || sucursal.nombre,
        address: detalle?.direccion || '', phone: detalle?.telefono || '',
        timezone: detalle?.zonaHoraria || '', maps: detalle?.urlGoogleMaps || '',
        notes: detalle?.notasLlegada || '', active: sucursal.atencionActiva,
        globalActive: sucursal.sucursalActiva, color: 'naranja' };
    });
    // La semana conectada lee solo franjas completas; los descansos históricos no son editables.
    datos.schedules = horarios.map((registro) => ({ id: registro.id, tenantId: negocioId, professionalId: usuarioActual.id, day: registro.diaSemana, branchId: registro.sucursalId, start: formatearMinutos(registro.inicioMinutos), end: formatearMinutos(registro.finMinutos), enabled: registro.activo }));
    datos.blocks = bloqueos.map((registro) => ({ id: registro.id, tenantId: negocioId, professionalId: registro.personalId, branchId: registro.sucursalId, date: registro.fechaInicio.slice(0, 10), endDate: registro.fechaFin.slice(0, 10), start: formatearMinutos(registro.inicioMinutos), end: formatearMinutos(registro.finMinutos), type: registro.tipo, reason: registro.motivo }));
  } else if (usuarioActual.rol === 'admin_negocio') {
    await cargarCuposPorRol(api);
    const [servicios, sucursales, cupo, profesionales, recepcionistas, bloqueos] = await Promise.all([api('/servicios'), api('/sucursales'), api('/sucursales/cupo'), api('/profesionales'), api('/recepcionistas'), api('/bloqueos')]);
    establecerCupoSucursales(cupo);
    datos.receptionists = recepcionistas.map((registro) => ({ id: registro.id, tenantId: negocioId, name: registro.nombre, email: registro.email, active: registro.activo, activatedAt: registro.activadoEn, initials: iniciales(registro.nombre) }));
    datos.services = servicios.map((registro) => ({ id: registro.id, tenantId: negocioId, name: registro.nombre, duration: registro.duracionMinutos, price: Number(registro.costo), active: registro.activo, description: registro.descripcion || '', creatorId: registro.creadorPersonalId, icon: 'briefcase', color: 'azul' }));
    datos.branches = sucursales.map((registro) => ({ id: registro.id, tenantId: negocioId, name: registro.nombre, address: registro.direccion, phone: registro.telefono, timezone: registro.zonaHoraria, maps: registro.urlGoogleMaps, notes: registro.notasLlegada || '', active: registro.activo, color: 'naranja' }));
    await Promise.all(profesionales.map(async (profesional, indice) => {
      const [sucursalesIds, servicios, horarios] = await Promise.all([api(`/profesionales/${profesional.id}/sucursales`), api(`/profesionales/${profesional.id}/servicios`), api(`/profesionales/${profesional.id}/horario`)]);
      datos.professionals.push({ id: profesional.id, tenantId: negocioId, name: profesional.nombre, email: profesional.correo, active: profesional.activo, specialty: profesional.especialidad || '', initials: iniciales(profesional.nombre), color: ['durazno', 'menta', 'azul'][indice % 3], branchIds: sucursalesIds, serviceIds: servicios.filter((registro) => registro.seleccionado).map((registro) => registro.id) });
      datos.schedules.push(...horarios.map((registro) => ({ id: registro.id, tenantId: negocioId, professionalId: profesional.id, day: registro.diaSemana, branchId: registro.sucursalId, start: formatearMinutos(registro.inicioMinutos), end: formatearMinutos(registro.finMinutos), enabled: registro.activo })));
    }));
    datos.professionals.sort((primero, registro) => primero.id - registro.id);
    datos.blocks = bloqueos.map((registro) => ({ id: registro.id, tenantId: negocioId, professionalId: registro.personalId, branchId: registro.sucursalId, date: registro.fechaInicio.slice(0, 10), endDate: registro.fechaFin.slice(0, 10), start: formatearMinutos(registro.inicioMinutos), end: formatearMinutos(registro.finMinutos), type: registro.tipo, reason: registro.motivo }));
  }
  reemplazarDatos(datos);
  return datos.tenants[0].id;
}
