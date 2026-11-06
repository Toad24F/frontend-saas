export const licenseNames = { pendiente: 'Pendiente', vigente: 'Vigente', suspension_pendiente: 'Suspensión programada', suspendida: 'Suspendida', vencida: 'Vencida' };
export const followUps = { pending: 'Por activar', expiring: 'Próximas a vencer', blocked: 'Acceso bloqueado', failed: 'Con correos fallidos' };
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matchesFollowUp(tenant, followUp) {
  if (followUp === 'pending') return tenant.category === 'Pendiente de activación';
  if (followUp === 'expiring') return tenant.license === 'vigente' && Number.isFinite(tenant.validity?.tiempoRestante?.dias) && tenant.validity.tiempoRestante.dias >= 0 && tenant.validity.tiempoRestante.dias < 30;
  if (followUp === 'blocked') return tenant.validity?.condicionAcceso === false;
  if (followUp === 'failed') return tenant.failedDeliveries > 0;
  return true;
}
export function directoryPage(tenants, { query = '', license = '', followUp = '', page = 1 } = {}) {
  const search = normalize(query.trim());
  const filtered = tenants.filter((tenant) => (!license || tenant.license === license) && matchesFollowUp(tenant, followUp)
    && (!search || [tenant.name, tenant.slug, tenant.email].some((value) => normalize(value).includes(search))));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(pages, Math.max(1, Number.isSafeInteger(page) ? page : 1));
  return { rows: filtered.slice((current - 1) * 10, current * 10), total: filtered.length, pages, page: current };
}
export function remainingLabel(tenant) {
  if (tenant.license === 'vencida') return 'Vencida';
  if (tenant.license === 'pendiente') return 'Sin iniciar';
  const time = tenant.validity?.tiempoRestante;
  if (!time || !Number.isSafeInteger(time.dias) || time.dias < 0) return 'No disponible';
  const days = time.dias === 0 ? 'Menos de 1 día' : `${time.dias} ${time.dias === 1 ? 'día' : 'días'}`;
  return tenant.license === 'suspendida' || tenant.validity?.tiempoCongelado ? `${days} ${time.dias <= 1 ? 'conservado' : 'conservados'}`
    : tenant.license === 'suspension_pendiente' ? `${days} hasta bloqueo o vencimiento` : days;
}
