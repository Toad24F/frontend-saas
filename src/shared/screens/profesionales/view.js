import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../ui.js';
import './style.css';
export function professionals() {
  return `${pageHead('Profesionales', 'El equipo que hace posible una mejor atención.', button('Nuevo profesional', 'new-professional'))}<div class="entity-grid">${list(
    'professionals',
    state.tenantId,
  )
    .map(
      (p) =>
        `<article class="surface professional-card"><div class="card-top">${avatar(p.initials, p.color, 'avatar-large')}<span class="availability-label"><i></i>${p.active === false ? 'Inactivo' : 'Activo'}</span></div><h2>${esc(p.name)}</h2><p>${esc(p.specialty)}</p><div class="professional-meta"><span>${icon('briefcase')}${p.serviceIds.length} servicios asignados</span><span>${icon('pin')}${p.branchIds.length} ${p.branchIds.length === 1 ? 'sucursal' : 'sucursales'}</span></div><div class="service-tags">${p.serviceIds.map((id) => `<span>${esc(resource('services', id, state.tenantId).name)}</span>`).join('')}</div><div class="card-bottom"><a href="/admin/disponibilidad" data-nav="disponibilidad" data-nav-professional="${p.id}" class="text-button">Ver disponibilidad ${icon('arrow')}</a><button class="icon-btn" data-edit-professional="${p.id}" aria-label="Editar a ${esc(p.name)}">${icon('edit')}</button></div></article>`,
    )
    .join('')}</div>`;
}
