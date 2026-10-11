import { loadBackendData, user } from '../../backend.js';
import { submitProfessionalAction } from '../../modules/profesionales/operations.js';
import { render, state } from '../../../shared/app.js';
import { resource } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { escape, modal, toast } from '../../../shared/ui.js';

const operations = {
  deactivate: { title: 'Desactivar profesional', label: 'Desactivar', message: 'Se cerrarán sus sesiones. Se conservan su perfil, horarios, asignaciones e historial.', success: 'Profesional desactivado.' },
  reactivate: { title: 'Reactivar profesional', label: 'Reactivar', message: 'Podrá iniciar sesión de nuevo. Las sesiones anteriores no se restauran.', success: 'Profesional reactivado.' },
  delete: { title: 'Eliminar profesional', label: 'Eliminar', message: 'Se eliminarán su perfil y cuenta solo si no tienen uso o historial que impida la baja. Esta acción no se puede deshacer.', success: 'Profesional eliminado.' },
};

export function professionalAction(action, id) {
  if (user?.rol !== 'admin_negocio' || state.page !== 'profesionales' || !operations[action]) return;
  const person = resource('professionals', id, state.tenantId);
  if (action === 'deactivate' && person.active === false || action === 'reactivate' && person.active !== false) {
    toast('El estado de este profesional cambió. Actualiza la lista.');
    return;
  }
  const operation = operations[action];
  const dialog = modal(operation.title, `<div class="dialog-body"><p><strong>${escape(person.name)}</strong>: ${operation.message}</p>${action === 'delete' ? '<p class="field-hint">Si el backend encuentra vínculos o historial, conservará la cuenta y mostrará el motivo.</p>' : ''}${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn ${action === 'reactivate' ? 'btn-primary' : 'btn-danger-soft'}" data-confirm>${operation.label}</button></div>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('[data-confirm]').onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = 'Procesando…';
    try {
      await submitProfessionalAction(person.id, action);
      if (action === 'delete' && state.scheduleProfessional === person.id) state.scheduleProfessional = null;
      dialog.close();
      try { await loadBackendData(); render(); toast(operation.success); }
      catch (error) { toast(`${operation.success} No se pudo actualizar la lista: ${error.message}`); }
    } catch (error) {
      const target = dialog.querySelector('#form-error');
      target.textContent = error.message;
      target.hidden = false;
      target.focus();
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  };
}
