import { capacityHtml } from '../../../shared/screens/catalog-header.js';
import { roleCapacity } from '../../modules/catalogos/capacity.js';
import { professionals as sharedProfessionals } from '../../../shared/screens/profesionales/view.js';
import { icon } from '../../../shared/icons.js';
import { escape } from '../../../shared/ui.js';
import './style.css';
import { retiredSection } from '../recursos/retired-view.js';

export function professionals() {
  return `<div class="connected-professionals">${sharedProfessionals((person) =>
    `<details class="professional-more"><summary aria-label="Más acciones para ${escape(person.name)}">${icon('more')}</summary><div class="professional-more-menu">
      <button type="button" class="${person.active === false ? '' : 'action-caution'}" data-professional-action="${person.active === false ? 'reactivate' : 'deactivate'}" data-professional-id="${person.id}">${person.active === false ? 'Reactivar' : 'Desactivar'}</button>
      <button type="button" class="action-danger" data-professional-action="disable" data-professional-id="${person.id}">Inhabilitar</button>
    </div></details>`, { headerActions: retiredSection('profesionales'), capacity: capacityHtml('Profesionales activos', roleCapacity('profesionales')) })}</div>`;
}
