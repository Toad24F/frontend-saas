import { loadBackendData, user } from '../../backend.js';
import { deleteService } from '../../modules/servicios/operations.js';
import { render, state } from '../../../shared/app.js';
import { resource } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { escape, modal, toast } from '../../../shared/ui.js';

export function confirmServiceDeletion(id) {
  if (user?.rol !== 'admin_negocio' || state.page !== 'servicios') return;
  const service = resource('services', id, state.tenantId);
  const dialog = modal('Eliminar servicio', `<div class="dialog-body"><p><strong>${escape(service.name)}</strong> se eliminará definitivamente si no tiene selecciones, uso anterior ni historial que impidan la baja. Esta acción no se puede deshacer.</p><p class="field-hint">Si el backend rechaza la baja, el servicio se conservará y verás el motivo. Puedes desactivarlo para retirarlo de la oferta sin borrar las preferencias.</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn btn-danger-soft" data-confirm>Eliminar servicio</button></div>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('[data-confirm]').onclick = async (event) => {
    const button = event.currentTarget;
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Procesando…';
    try {
      await deleteService(service.id);
      dialog.close();
      try { await loadBackendData(); render(); toast('Servicio eliminado.'); }
      catch (error) { toast(`Servicio eliminado. No se pudo actualizar el catálogo: ${error.message}`); }
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
