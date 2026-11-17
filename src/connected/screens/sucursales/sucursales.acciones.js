import { loadBackendData, user } from '../../backend.js';
import { inhabilitarSucursal } from '../../modules/sucursales/sucursales.operaciones.js';
import { render, state } from '../../../shared/app.js';
import { resource } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { escape, modal, toast } from '../../../shared/ui.js';

export function confirmarInhabilitacionSucursal(id) {
  if (user?.rol !== 'admin_negocio' || state.page !== 'sucursales') return;
  const sucursal = resource('branches', id, state.tenantId);
  // No se promete que el retiro libere un cupo: la lectura posterior del
  // servidor decide cuántas sucursales activas quedan disponibles.
  const dialogo = modal('Inhabilitar sucursal', `<div class="dialog-body"><p><strong>${escape(sucursal.name)}</strong> saldrá de los listados operativos. Podrás consultarla en Inhabilitados y restaurarla como inactiva más adelante.</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn action-danger" data-confirm>Inhabilitar sucursal</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const boton = evento.currentTarget;
    const etiqueta = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    try {
      await inhabilitarSucursal(sucursal.id);
      dialogo.close();
      try { await loadBackendData(); render(); toast('Sucursal inhabilitada.'); }
      catch (error) { toast(`Sucursal inhabilitada. No se pudo actualizar la lista y el cupo: ${error.message}`); }
    } catch (error) {
      const destino = dialogo.querySelector('#form-error');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally {
      boton.disabled = false;
      boton.textContent = etiqueta;
    }
  };
}
