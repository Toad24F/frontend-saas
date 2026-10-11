import { loadBackendData, user } from '../../backend.js';
import { deleteBranch } from '../../modules/sucursales/operations.js';
import { render, state } from '../../../shared/app.js';
import { resource } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { escape, modal, toast } from '../../../shared/ui.js';

export function confirmBranchDeletion(id) {
  if (user?.rol !== 'admin_negocio' || state.page !== 'sucursales') return;
  const branch = resource('branches', id, state.tenantId);
  const dialog = modal('Eliminar sucursal', `<div class="dialog-body"><p><strong>${escape(branch.name)}</strong> se eliminará definitivamente si no tiene uso ni historial que impidan la baja. Esta acción no se puede deshacer.</p><p class="field-hint">Si hay vínculos o historial, la sucursal se conservará y verás el motivo. Puedes desactivarla para liberar cupo sin borrar sus datos.</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn btn-danger-soft" data-confirm>Eliminar sucursal</button></div>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('[data-confirm]').onclick = async (event) => {
    const button = event.currentTarget;
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Procesando…';
    try {
      await deleteBranch(branch.id);
      dialog.close();
      try { await loadBackendData(); render(); toast('Sucursal eliminada.'); }
      catch (error) { toast(`Sucursal eliminada. No se pudo actualizar la lista y el cupo: ${error.message}`); }
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
