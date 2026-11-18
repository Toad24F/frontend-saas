import { state } from '../../../shared/app.js';
import { list, resource, appointmentInfo } from '../../../shared/data.js';
import { field, basicForm } from '../../../shared/forms.js';
import { validarContactoDemo } from '../../disponibilidad.motor.js';
import { guardarRegistroCatalogo } from '../../../shared/screens/catalogos/catalogos.acciones.js';
import { corregirClienteDemo } from '../../clientes.horario.js';
import { agendaPanel } from '../../../shared/screens/agenda/panels.js';
import { escape as esc } from '../../../shared/ui.js';
import '../../../shared/screens/agenda/polish.css';
export function nuevoCliente() {
  basicForm(
    'Nuevo cliente',
    `${field('Nombre completo', 'nombreCompleto', '', 'text', 'required maxlength="150"')}${field('Teléfono de WhatsApp', 'telefono', '', 'tel', 'required pattern="[0-9]{10}" maxlength="10" inputmode="numeric"')}<p class="field-hint">Usa datos ficticios en esta demostración.</p>`,
    (formulario) => {
      validarContactoDemo(formulario.get('nombreCompleto'), formulario.get('telefono'));
      // El teléfono no identifica por sí solo a una persona: cada alta crea una ficha independiente.
      guardarRegistroCatalogo('clients', null, {
        name: formulario.get('nombreCompleto').trim(),
        phone: formulario.get('telefono'),
      });
    }, false, { drawer: true },
  );
}

// Ficha ficticia con el mismo panel lateral y separación entre datos actuales e históricos del producto conectado.
export function abrirFichaClienteDemo(id) {
  const cliente = resource('clients', id, state.tenantId);
  const citas = list('appointments', state.tenantId).filter((cita) => cita.clientId === id);
  const dialogo = agendaPanel('Ficha del cliente', `<div class="dialog-body"><h3>${esc(cliente.name)}</h3><p>${esc(cliente.phone)} · Cliente #${id}</p><button class="btn btn-primary" data-ficha-demo-corregir>Corregir ficha</button><section class="historial-cliente"><h3>Historial de citas</h3><p class="field-hint">Solo datos ficticios. Las correcciones no alteran los contactos anteriores.</p>${citas.length ? `<ol>${citas.map((cita) => `<li><strong>${esc(cita.folio)}</strong><p>${esc(cita.date)} · ${esc(cita.start)} · ${esc(appointmentInfo(cita).client.name)}</p></li>`).join('')}</ol>` : '<p>Sin citas registradas para esta ficha.</p>'}</section></div>`);
  dialogo.querySelector('[data-ficha-demo-corregir]').onclick = () => basicForm('Corregir ficha', `${field('Nombre completo', 'nombreCompleto', cliente.name, 'text', 'required maxlength="150"')}${field('Teléfono', 'telefono', cliente.phone, 'tel', 'required pattern="[0-9]{10}" maxlength="10"')}<p class="field-hint">Datos ficticios. Las citas anteriores conservan su contacto.</p>`, (valores) => corregirClienteDemo(id, state.tenantId, { nombreCompleto: valores.get('nombreCompleto'), telefono: valores.get('telefono') }), false, { drawer: true });
}
