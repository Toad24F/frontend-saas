import { state } from '../../../shared/app.js';
import { list } from '../../../shared/data.js';
import { field, basicForm } from '../../../shared/forms.js';
import { validateContact } from '../../availability.js';
import { save } from '../../../shared/screens/catalogos/actions.js';
export function newClient() {
  basicForm(
    'Nuevo cliente',
    `${field('Nombre completo', 'name', '', 'text', 'required maxlength="150"')}${field('Teléfono de WhatsApp', 'phone', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"')}<p class="field-hint">Usa datos ficticios en esta demostración.</p>`,
    (f) => {
      validateContact(f.get('name'), f.get('phone'));
      if (
        list('clients', state.tenantId).some((c) => c.phone === f.get('phone'))
      )
        throw new Error(
          'Ya existe un cliente con ese teléfono en este negocio.',
        );
      save('clients', null, {
        name: f.get('name').trim(),
        phone: f.get('phone'),
      });
    },
  );
}
