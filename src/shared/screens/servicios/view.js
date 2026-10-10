import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../ui.js';
import './style.css';
export function services() {
  const own = !isDemo && user?.rol === 'profesional';
  const professional = own ? list('professionals', state.tenantId)[0] : null;
  return `${pageHead('Servicios', own ? 'Los servicios que ofreces a tus clientes.' : 'Una oferta clara, con el tiempo que cada consulta merece.', button('Nuevo servicio', 'new-service'))}<div class="entity-grid">${list('services', state.tenantId).map((s) => {
    const assigned = professional?.serviceIds.includes(s.id);
    const people = list('professionals', state.tenantId).filter((p) => p.serviceIds.includes(s.id));
    const active = own ? assigned : s.active !== false;
    return `<article class="surface service-card"><div class="card-top"><span class="service-icon ${s.color}">${icon(s.icon)}</span>${!own || s.creatorId === user.id ? `<button class="icon-btn" data-edit-service="${s.id}" aria-label="Editar ${esc(s.name)}">${icon('edit')}</button>` : ''}</div><h2>${esc(s.name)}</h2><p>${esc(s.description)}</p><div class="service-facts"><span>${icon('clock')}${s.duration} minutos</span><strong>${money(s.price)} <small>MXN</small></strong></div><div class="card-bottom"><div class="card-assignees"><span class="avatar-stack">${people.map((p) => avatar(p.initials, p.color)).join('')}</span><span class="subtle-text">${own ? s.active === false ? 'Inactivo en el negocio' : assigned ? 'Seleccionado' : 'Sin seleccionar' : `${people.length} profesionales`}</span></div><button type="button" class="btn btn-light entity-toggle" data-toggle-service="${s.id}" aria-label="${own ? active ? 'Quitar selección de' : 'Seleccionar' : active ? 'Desactivar' : 'Activar'} ${esc(s.name)}" ${own && s.active === false && !assigned ? 'disabled title="Servicio inactivo en el negocio"' : ''}>${own ? active ? 'Quitar selección' : 'Seleccionar' : active ? 'Desactivar' : 'Activar'}</button></div></article>`;
  }).join('')}</div><div class="information-note">${icon('info')} La duración de cada servicio determina los horarios disponibles en tu portal. El precio es informativo; no se realizan cobros en línea.</div>`;
}
