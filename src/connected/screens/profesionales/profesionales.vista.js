import { capacityHtml } from '../../../shared/screens/catalog-header.js';
import { roleCapacity } from '../../modules/catalogos/capacity.js';
import { profesionales as profesionalesCompartidos } from '../../../shared/screens/profesionales/profesionales.vista.js';
import { icon } from '../../../shared/icons.js';
import { escape } from '../../../shared/ui.js';
import './profesionales.estilos.css';
import { retiredSection } from '../recursos/retired-view.js';

export function profesionales() {
  return `<div class="profesionales-conectados">${profesionalesCompartidos((persona) =>
    `<details class="profesional-mas"><summary aria-label="Más acciones para ${escape(persona.name)}">${icon('more')}</summary><div class="profesional-menu-mas">
      <button type="button" class="${persona.active === false ? '' : 'action-caution'}" data-accion-profesional="${persona.active === false ? 'reactivar' : 'desactivar'}" data-profesional-id="${persona.id}">${persona.active === false ? 'Reactivar' : 'Desactivar'}</button>
      <button type="button" class="action-danger" data-accion-profesional="inhabilitar" data-profesional-id="${persona.id}">Inhabilitar</button>
    </div></details>`, { accionesEncabezado: retiredSection('profesionales'), cupo: capacityHtml('Profesionales activos', roleCapacity('profesionales')) })}</div>`;
}
