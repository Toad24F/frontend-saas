import { professionals as sharedProfessionals } from '../../../shared/screens/profesionales/view.js';
import { escape } from '../../../shared/ui.js';
import './style.css';

export function professionals() {
  return `<div class="connected-professionals">${sharedProfessionals((person) =>
    `<div class="professional-management" aria-label="Acciones para ${escape(person.name)}">
      <button type="button" class="btn btn-light" data-professional-action="${person.active === false ? 'reactivate' : 'deactivate'}" data-professional-id="${person.id}">${person.active === false ? 'Reactivar' : 'Desactivar'}</button>
      <button type="button" class="btn btn-danger-soft" data-professional-action="delete" data-professional-id="${person.id}">Eliminar</button>
    </div>`)}
  </div>`;
}
