import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../ui.js';
export function platform() {
  if (!isDemo) return connectedPlatform();
  return `${pageHead('Negocios de la plataforma', isDemo ? 'Vista de superadministración · Entorno de demostración.' : 'Vista de superadministración.', button('Registrar negocio', 'new-tenant'))}<div class="stats-grid">${[
    [db.tenants.length, 'Negocios registrados'],
    [db.tenants.filter((t) => !t.suspended).length, 'Negocios activos'],
    [db.tenants.filter((t) => t.suspended).length, 'Suspendidos'],
    [isDemo ? db.professionals.length : '—', 'Profesionales totales'],
  ]
    .map(
      ([n, l]) =>
        `<div class="stat-card"><div class="stat-top">${l}</div><div class="stat-number">${n}</div><span class="stat-caption">${isDemo ? 'Plataforma · Datos ficticios' : 'Plataforma · Backend'}</span></div>`,
    )
    .join(
      '',
    )}</div><section class="surface"><div class="section-heading"><h2>Espacios de trabajo</h2><span class="soft-tag">${isDemo ? 'Rol simulado: superadministrador' : 'Superadministrador'}</span></div><div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Negocio</th><th>Enlace público</th><th>Licencia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${db.tenants.map((t) => `<tr><td><div class="person-cell">${avatar(t.initials, 'mint')}<span><strong>${esc(t.name)}</strong><small>${esc(t.email)}</small></span></div></td><td>/reservas/${esc(t.slug)}</td><td><span class="soft-tag">${isDemo ? 'Demo · ' : ''}${t.license || (isDemo ? '30 días' : 'Pendiente')}</span></td><td>${t.suspended ? '<span class="status-badge cancelada">Suspendido</span>' : '<span class="status-badge completada">Activo</span>'}</td><td><button class="text-button" data-toggle-tenant="${t.id}">${t.suspended ? 'Reactivar' : 'Suspender'}</button><button class="text-button ms-3" data-license-tenant="${t.id}">Renovar licencia</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

const licenseNames = {
  pendiente: 'Pendiente',
  vigente: 'Vigente',
  suspension_pendiente: 'Suspensión programada',
  suspendida: 'Suspendida',
  vencida: 'Vencida',
};

function connectedPlatform() {
  const businesses = db.tenants.filter((tenant) => tenant.slug);
  const metrics = [
    [businesses.length, 'Negocios registrados', 'grid'],
    [businesses.filter((tenant) => tenant.category !== 'Activado').length, 'Por activar', 'clock'],
    [businesses.filter((tenant) => tenant.license === 'suspension_pendiente').length, 'Suspensión programada', 'lock'],
    [businesses.reduce((sum, tenant) => sum + tenant.failedDeliveries, 0), 'Correos fallidos', 'message'],
  ];
  return `${pageHead('Panel de superadministración', 'Estado de negocios, licencias e invitaciones.', button('Registrar negocio', 'new-tenant'))}<div class="stats-grid">${metrics.map(([value, label, symbol]) => `<div class="stat-card"><div class="stat-top">${label}<span class="stat-icon green">${icon(symbol)}</span></div><div class="stat-number">${value}</div><span class="stat-caption">Datos actuales del backend</span></div>`).join('')}</div><section class="surface"><div class="section-heading"><div><h2>Negocios</h2><p>Abre un negocio para administrar su invitación, cupo, licencia y correos.</p></div><span class="soft-tag">${businesses.length} en total</span></div>${businesses.length ? `<div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Negocio</th><th>Administrador</th><th>Licencia</th><th>Envíos fallidos</th><th>Detalle</th></tr></thead><tbody>${businesses.map((tenant) => `<tr><td><div class="person-cell">${avatar(tenant.initials, 'mint')}<span><strong>${esc(tenant.name)}</strong><small>${esc(tenant.slug)}</small></span></div></td><td>${esc(tenant.email || 'Sin correo')}<small class="d-block">${esc(tenant.category)}</small></td><td><span class="soft-tag">${esc(licenseNames[tenant.license] || tenant.license)}</span>${tenant.validity?.tiempoRestante && tenant.license === 'vigente' ? `<small class="d-block">${tenant.validity.tiempoRestante.dias} días restantes</small>` : ''}</td><td>${tenant.failedDeliveries}</td><td><button type="button" class="text-button" data-business-detail="${tenant.id}">Ver detalle ${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>` : empty('Aún no hay negocios', 'Registra el primero para iniciar su invitación.')}</section>`;
}
