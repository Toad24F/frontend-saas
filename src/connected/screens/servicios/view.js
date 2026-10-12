import { user } from '../../backend.js';
import { services as sharedServices } from '../../../shared/screens/servicios/view.js';
import { escape } from '../../../shared/ui.js';

export function services() {
  if (user?.rol !== 'admin_negocio') return sharedServices();
  return sharedServices((service) =>
    `<button type="button" data-delete-service="${service.id}" aria-label="Eliminar ${escape(service.name)}">Eliminar</button>`);
}
