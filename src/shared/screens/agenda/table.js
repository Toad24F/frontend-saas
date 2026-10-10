import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../data.js';
import { icon } from '../../icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../ui.js';
export function appointmentTable(appointments) {
  if (!appointments.length)
    return empty(
      'Sin citas para mostrar',
      'Prueba otra fecha o agrega una nueva cita.',
    );
  return `<div class="table-responsive"><table class="table app-table align-middle"><thead><tr><th>Paciente</th><th>Servicio y profesional</th><th>Fecha y hora</th><th>Sucursal</th><th>Estado</th><th><span class="visually-hidden">Acciones</span></th></tr></thead><tbody>${appointments
    .map((a) => {
      const e = appointmentInfo(a);
      return `<tr><td><div class="person-cell">${avatar(
        e.client.name
          .split(' ')
          .map((p) => p[0])
          .slice(0, 2)
          .join(''),
        'mint',
      )}<span><strong>${esc(e.client.name)}</strong><small>${a.folio}</small></span></div></td><td><strong>${esc(e.service.name)}</strong><small>${esc(e.professional.name)}</small></td><td><strong>${formatDate(a.date, { day: 'numeric', month: 'short' })}</strong><small>${a.start} – ${a.end}</small></td><td>${esc(e.branch.name)}</td><td>${badge(a.status)}</td><td><button class="icon-btn" data-appointment="${a.id}" aria-label="Ver cita de ${esc(e.client.name)}">${icon('chevron')}</button></td></tr>`;
    })
    .join('')}</tbody></table></div>`;
}
