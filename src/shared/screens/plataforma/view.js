import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../ui.js';
export function platform() {
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
