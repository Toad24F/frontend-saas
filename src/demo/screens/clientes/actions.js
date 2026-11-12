import { state } from '../../../shared/app.js';
import { list, resource, appointmentInfo } from '../../../shared/data.js';
import { field, basicForm } from '../../../shared/forms.js';
import { validateContact } from '../../availability.js';
import { save } from '../../../shared/screens/catalogos/actions.js';
import { correctDemoCustomer } from '../../customer-schedule.js';
import { agendaPanel } from '../../../shared/screens/agenda/panels.js';
import { escape as esc } from '../../../shared/ui.js';
import '../../../shared/screens/agenda/polish.css';
export function newClient() {
  basicForm(
    'Nuevo cliente',
    `${field('Nombre completo', 'name', '', 'text', 'required maxlength="150"')}${field('Teléfono de WhatsApp', 'phone', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"')}<p class="field-hint">Usa datos ficticios en esta demostración.</p>`,
    (f) => {
      validateContact(f.get('name'), f.get('phone'));
      // El teléfono no identifica por sí solo a una persona: cada alta crea una ficha independiente.
      save('clients', null, {
        name: f.get('name').trim(),
        phone: f.get('phone'),
      });
    }, false, { drawer: true },
  );
}

// Ficha ficticia con el mismo panel lateral y separación entre datos actuales e históricos del producto conectado.
export function openDemoCustomer(id) {
  const customer = resource('clients', id, state.tenantId);
  const citas = list('appointments', state.tenantId).filter((row) => row.clientId === id);
  const dialog = agendaPanel('Ficha del cliente', `<div class="dialog-body"><h3>${esc(customer.name)}</h3><p>${esc(customer.phone)} · Cliente #${id}</p><button class="btn btn-primary" data-demo-customer-edit>Corregir ficha</button><section class="customer-history"><h3>Historial de citas</h3><p class="field-hint">Solo datos ficticios. Las correcciones no alteran los contactos anteriores.</p>${citas.length ? `<ol>${citas.map((cita) => `<li><strong>${esc(cita.folio)}</strong><p>${esc(cita.date)} · ${esc(cita.start)} · ${esc(appointmentInfo(cita).client.name)}</p></li>`).join('')}</ol>` : '<p>Sin citas registradas para esta ficha.</p>'}</section></div>`);
  dialog.querySelector('[data-demo-customer-edit]').onclick = () => basicForm('Corregir ficha', `${field('Nombre completo', 'name', customer.name, 'text', 'required maxlength="150"')}${field('Teléfono', 'phone', customer.phone, 'tel', 'required pattern="[0-9]{10}" maxlength="10"')}<p class="field-hint">Datos ficticios. Las citas anteriores conservan su contacto.</p>`, (values) => correctDemoCustomer(id, state.tenantId, { nombreCompleto: values.get('name'), telefono: values.get('phone') }), false, { drawer: true });
}
