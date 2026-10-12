import { professionals as sharedProfessionals } from '../../../shared/screens/profesionales/view.js';
import { icon } from '../../../shared/icons.js';
import { escape } from '../../../shared/ui.js';
import './style.css';

export function professionals() {
  return `<div class="connected-professionals">${sharedProfessionals((person) =>
    `<details class="professional-more"><summary aria-label="Más acciones para ${escape(person.name)}">${icon('more')}</summary><div class="professional-more-menu">
      <button type="button" data-professional-action="${person.active === false ? 'reactivate' : 'deactivate'}" data-professional-id="${person.id}">${person.active === false ? 'Reactivar' : 'Desactivar'}</button>
      <button type="button" data-professional-action="delete" data-professional-id="${person.id}">Eliminar</button>
    </div></details>`)}
  </div>`;
}
