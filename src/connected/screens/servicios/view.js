import { user } from '../../backend.js';
import { services as sharedServices } from '../../../shared/screens/servicios/view.js';
import { escape } from '../../../shared/ui.js';
import './style.css';

export function services() {
  if (user?.rol !== 'admin_negocio') return sharedServices();
  return `<div class="connected-services">${sharedServices((service, toggle) =>
    `<div class="service-management">${toggle}<button type="button" class="btn btn-danger-soft" data-delete-service="${service.id}" aria-label="Eliminar ${escape(service.name)}">Eliminar</button></div>`)}</div>`;
}
