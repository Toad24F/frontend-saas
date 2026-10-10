import { replaceData, time } from '../../../shared/data.js';
import { api, user } from '../auth/session.js';
import { pending } from '../../mode.js';

const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
const clock = (value) => value == null ? '' : time(value % 1440);
export async function loadBackendData() {
  const tenantId = user.negocioId || 1;
  const next = { tenants: [], professionals: [], branches: [], services: [], schedules: [], blocks: [], appointments: [], clients: [], holds: [] };
  next.tenants = [{ id: tenantId, name: user.rol === 'superadmin' ? 'Plataforma' : 'Mi negocio', slug: '', initials: 'MN', mode: null }];
  if (user.rol === 'superadmin') {
    const businesses = await api('/negocios');
    next.tenants = await Promise.all(businesses.map(async (b) => {
      const validity = b.licencia ? await api(`/licencias/${b.licencia.id}/vigencia`) : null;
      return { id: b.id, name: b.nombre, slug: b.identificadorPublico, initials: initials(b.nombre), email: b.emailContacto || b.administrador?.email || '', phone: b.telefonoContacto || '', category: b.administrador?.activadoEn ? 'Activado' : 'Pendiente de activación', suspended: ['suspendida', 'suspension_pendiente'].includes(validity?.estado), licenseId: b.licencia?.id, license: validity?.estado || 'Pendiente' };
    }));
    if (!next.tenants.length) next.tenants.push({ id: 1, name: 'Plataforma', initials: 'PL', slug: '' });
  } else if (user.rol === 'profesional') {
    const [services, schedules, blocks] = await Promise.all([api(`/profesionales/${user.id}/servicios`), api(`/profesionales/${user.id}/horario`), api('/bloqueos')]);
    const branchIds = [...new Set(schedules.map((s) => s.sucursalId).filter(Boolean))];
    next.services = services.map((s) => ({ id: s.id, tenantId, name: s.nombre, duration: s.duracionMinutos, price: Number(s.costo), active: s.activo, description: pending, icon: 'briefcase', color: 'blue' }));
    next.professionals = [{ id: user.id, tenantId, name: user.nombre, email: user.email, active: true, specialty: pending, initials: initials(user.nombre), color: 'peach', branchIds, serviceIds: services.filter((s) => s.seleccionado).map((s) => s.id) }];
    // La API de sucursales es administrativa: conservar los IDs reales del horario.
    next.branches = branchIds.map((id) => ({ id, tenantId, name: `Sucursal ${id}`, active: schedules.some((s) => s.sucursalId === id && s.activo) }));
    next.schedules = schedules.map((s) => ({ id: s.id, tenantId, professionalId: user.id, day: s.diaSemana, branchId: s.sucursalId, start: clock(s.inicioMinutos), end: clock(s.finMinutos), breakStart: clock(s.descansoInicioMinutos), breakEnd: clock(s.descansoFinMinutos), enabled: s.activo }));
    next.blocks = blocks.map((b) => ({ id: b.id, tenantId, professionalId: b.personalId, branchId: b.sucursalId, date: b.fechaInicio.slice(0, 10), endDate: b.fechaFin.slice(0, 10), start: clock(b.inicioMinutos), end: clock(b.finMinutos), type: b.tipo, reason: b.motivo }));
  } else if (user.rol === 'admin_negocio') {
    const [services, branches, professionals, blocks] = await Promise.all([api('/servicios'), api('/sucursales'), api('/profesionales'), api('/bloqueos')]);
    next.services = services.map((s) => ({ id: s.id, tenantId, name: s.nombre, duration: s.duracionMinutos, price: Number(s.costo), active: s.activo, description: pending, icon: 'briefcase', color: 'blue' }));
    next.branches = branches.map((b) => ({ id: b.id, tenantId, name: b.nombre, address: b.direccion, phone: b.telefono, timezone: b.zonaHoraria, maps: b.urlGoogleMaps, notes: b.notasLlegada || '', active: b.activo, color: 'orange' }));
    await Promise.all(professionals.map(async (p, index) => {
      const [branchIds, services, schedules] = await Promise.all([api(`/profesionales/${p.id}/sucursales`), api(`/profesionales/${p.id}/servicios`), api(`/profesionales/${p.id}/horario`)]);
      next.professionals.push({ id: p.id, tenantId, name: p.nombre, email: p.correo, active: p.activo, specialty: pending, initials: initials(p.nombre), color: ['peach', 'mint', 'blue'][index % 3], branchIds, serviceIds: services.filter((s) => s.seleccionado).map((s) => s.id) });
      next.schedules.push(...schedules.map((s) => ({ id: s.id, tenantId, professionalId: p.id, day: s.diaSemana, branchId: s.sucursalId, start: clock(s.inicioMinutos), end: clock(s.finMinutos), breakStart: clock(s.descansoInicioMinutos), breakEnd: clock(s.descansoFinMinutos), enabled: s.activo })));
    }));
    next.professionals.sort((a, b) => a.id - b.id);
    next.blocks = blocks.map((b) => ({ id: b.id, tenantId, professionalId: b.personalId, branchId: b.sucursalId, date: b.fechaInicio.slice(0, 10), endDate: b.fechaFin.slice(0, 10), start: clock(b.inicioMinutos), end: clock(b.finMinutos), type: b.tipo, reason: b.motivo }));
  }
  replaceData(next);
  return next.tenants[0].id;
}
