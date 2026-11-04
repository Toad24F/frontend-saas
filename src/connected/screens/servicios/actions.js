import { loadBackendData, user } from '../../backend.js';
import { disableService } from '../../modules/servicios/operations.js';
import { render, state } from '../../../shared/app.js';
import { resource } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { escape, modal, toast } from '../../../shared/ui.js';

export function confirmServiceDisable(id) {
  if (user?.rol !== 'admin_negocio' || state.page !== 'servicios') return;
  const service = resource('services', id, state.tenantId);
  // El usuario confirma un retiro recuperable. Desactivar sigue disponible
  // como estado operativo distinto en el menú de la tarjeta.
  const dialog = modal('Inhabilitar servicio', `<div class="dialog-body"><p><strong>${escape(service.name)}</strong> saldrá de los listados operativos. Podrás consultarlo en Inhabilitados y restaurarlo como inactivo más adelante.</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn btn-danger-soft" data-confirm>Inhabilitar servicio</button></div>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('[data-confirm]').onclick = async (event) => {
    const button = event.currentTarget;
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Procesando…';
    try {
      await disableService(service.id);
      dialog.close();
      try { await loadBackendData(); render(); toast('Servicio inhabilitado.'); }
      catch (error) { toast(`Servicio inhabilitado. No se pudo actualizar el catálogo: ${error.message}`); }
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
