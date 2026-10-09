import { replaceData, time } from './data.js';

export const isDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';
export const pending = 'Aún no forma parte de esta entrega';
export const modeUrl = (path, demo = isDemo) => `${path}${demo ? '?demo=1' : ''}`;
const base = (import.meta.env?.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
let token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cita-session') : null;
export let user = null;
export const roleLabel = (role) => ({ admin_negocio: 'Administración', superadmin: 'Superadministración', profesional: 'Profesional', recepcionista: 'Recepción' })[role] || '';
export async function api(path, method = 'GET', body) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new Error('No se pudo conectar con el backend. Comprueba que esté iniciado y revisa VITE_API_URL.'); }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      clearSession();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('cita-session-expired'));
    }
    throw new Error(Array.isArray(data?.message) ? data.message.join(' · ') : data?.message || `Error del servidor (${response.status}).`);
  }
  return data;
}
function clearSession() {
  token = null; user = null; replaceData(undefined);
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('cita-session');
}
export async function login(email, password) {
  const result = await api('/auth/login', 'POST', { email, password });
  token = result.accessToken;
  sessionStorage.setItem('cita-session', token);
  user = result.usuario;
}
export async function logout() {
  await api('/auth/logout', 'POST');
  clearSession();
}
export async function restoreSession() {
  if (!token) return false;
  const result = await api('/auth/profile');
  user = { ...result.user, id: result.user.sub };
  return true;
}
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
const clock = (value) => value == null ? '' : time(value % 1440);
export function catalogPayload(table, values) {
  return table === 'services'
    ? { nombre: values.name, costo: String(values.price), duracionMinutos: values.duration }
    : { nombre: values.name, direccion: values.address, telefono: values.phone, notasLlegada: values.notes || null, zonaHoraria: values.timezone, urlGoogleMaps: values.maps || null };
}
export function schedulePayload(rows) {
  const order = new Map();
  return { franjas: rows.filter((row) => row.id > 0 || row.enabled || row.start || row.end || row.breakStart || row.breakEnd).map((row) => {
    const orden = order.get(row.day) || 0;
    order.set(row.day, orden + 1);
    const min = (value) => value ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null;
    return { ...(row.id > 0 ? { id: row.id } : {}), diaSemana: row.day, orden, sucursalId: row.branchId || null,
      inicioMinutos: min(row.start), finMinutos: row.end === '00:00' ? 1440 : min(row.end), descansoInicioMinutos: min(row.breakStart), descansoFinMinutos: row.breakEnd === '00:00' ? 1440 : min(row.breakEnd), activo: row.enabled };
  }) };
}
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
    next.branches = branchIds.map((id) => ({ id, tenantId, name: `Sucursal ${id}` }));
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
export function availablePage(page) {
  return user?.rol === 'admin_negocio' && ['profesionales', 'servicios', 'sucursales', 'disponibilidad'].includes(page) || user?.rol === 'profesional' && ['profesionales', 'disponibilidad'].includes(page) || user?.rol === 'superadmin' && page === 'plataforma';
}
