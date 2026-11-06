import { loadBackendData, user } from '../../backend.js';
import { disableBranch } from '../../modules/sucursales/operations.js';
import { render, state } from '../../../shared/app.js';
import { resource } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { escape, modal, toast } from '../../../shared/ui.js';

export function confirmBranchDisable(id) {
  if (user?.rol !== 'admin_negocio' || state.page !== 'sucursales') return;
  const branch = resource('branches', id, state.tenantId);
  // No se promete que el retiro libere un cupo: la lectura posterior del
  // servidor decide cuántas sucursales activas quedan disponibles.
  const dialog = modal('Inhabilitar sucursal', `<div class="dialog-body"><p><strong>${escape(branch.name)}</strong> saldrá de los listados operativos. Podrás consultarla en Inhabilitados y restaurarla como inactiva más adelante.</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn action-danger" data-confirm>Inhabilitar sucursal</button></div>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('[data-confirm]').onclick = async (event) => {
    const button = event.currentTarget;
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Procesando…';
    try {
      await disableBranch(branch.id);
      dialog.close();
      try { await loadBackendData(); render(); toast('Sucursal inhabilitada.'); }
      catch (error) { toast(`Sucursal inhabilitada. No se pudo actualizar la lista y el cupo: ${error.message}`); }
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
