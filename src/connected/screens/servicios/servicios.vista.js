import { user } from '../../backend.js';
import { servicios as serviciosCompartidos } from '../../../shared/screens/servicios/servicios.vista.js';
import { escape } from '../../../shared/ui.js';
import { retiredSection } from '../recursos/retired-view.js';

export function servicios() {
  if (user?.rol !== 'admin_negocio') return serviciosCompartidos();
  return `${serviciosCompartidos((servicio) =>
    `<button type="button" class="action-danger" data-inhabilitar-servicio="${servicio.id}" aria-label="Inhabilitar ${escape(servicio.name)}">Inhabilitar</button>`, { accionesEncabezado: retiredSection('servicios') })}`;
}
