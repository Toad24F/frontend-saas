import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../ui.js';
import './style.css';
export function branches() {
  const own = !isDemo && user?.rol === 'profesional';
  const professional = own ? list('professionals', state.tenantId)[0] : null;
  const branches = list('branches', state.tenantId).filter((b) => !own || professional?.branchIds.includes(b.id));
  return `${pageHead('Sucursales', own ? 'Consulta y activa la disponibilidad de tus sucursales asignadas.' : 'Cada ubicación, conectada con tu agenda.', own ? '' : button('Nueva sucursal', 'new-branch'))}<div class="entity-grid branch-grid">${branches.map((b) => {
    const people = list('professionals', state.tenantId).filter((p) => p.branchIds.includes(b.id));
    const active = b.active !== false;
    return `<article class="surface branch-card"><div class="branch-visual ${b.color || 'orange'}"><div class="map-street street-one"></div><div class="map-street street-two"></div><div class="map-street street-three"></div><div class="map-street street-four"></div><span class="map-pin">${icon('pin')}</span><span class="map-label">CHIHUAHUA · ILUSTRACIÓN</span></div><div class="branch-content"><div class="card-top"><div class="branch-title">${avatar(people[0]?.initials || (own ? professional.initials : 'SC'), 'peach')}<h2>${esc(b.name)}</h2></div><span class="availability-label"><i></i>${own ? (active ? 'Con horario activo' : 'Sin horario activo') : (active ? 'Activa' : 'Inactiva')}</span></div>${b.address ? `<div class="branch-line">${icon('pin')}<span>${esc(b.address)}</span></div>` : ''}${b.phone ? `<div class="branch-line">${icon('message')}<span>${esc(b.phone)}</span></div>` : ''}${b.notes ? `<div class="branch-notes"><strong>Antes de tu visita</strong><p>${esc(b.notes)}</p></div>` : ''}<div class="card-bottom"><span class="subtle-text">${own ? 'Asignada a tu horario' : `${people.length} profesionales asignados`}</span><div class="branch-actions">${own ? '' : `<button class="text-button" data-edit-branch="${b.id}">Editar ${icon('edit')}</button>`}<button type="button" class="btn btn-light entity-toggle" data-toggle-branch="${b.id}" aria-label="${active ? 'Desactivar' : 'Activar'} ${own ? 'disponibilidad en ' : ''}${esc(b.name)}">${active ? 'Desactivar' : 'Activar'}</button></div></div></div></article>`;
  }).join('')}</div>`;
}
