import { loadBackendData, user } from '../../backend.js';
import { inhabilitarServicio } from '../../modules/servicios/servicios.operaciones.js';
import { render, state } from '../../../shared/app.js';
import { resource } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { escape, modal, toast } from '../../../shared/ui.js';

export function confirmarInhabilitacionServicio(id) {
  if (user?.rol !== 'admin_negocio' || state.page !== 'servicios') return;
  const servicio = resource('services', id, state.tenantId);
  // El usuario confirma un retiro recuperable. Desactivar sigue disponible
  // como estado operativo distinto en el menú de la tarjeta.
  const dialogo = modal('Inhabilitar servicio', `<div class="dialog-body"><p><strong>${escape(servicio.name)}</strong> saldrá de los listados operativos. Podrás consultarlo en Inhabilitados y restaurarlo como inactivo más adelante.</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn action-danger" data-confirm>Inhabilitar servicio</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const boton = evento.currentTarget;
    const etiqueta = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    try {
      await inhabilitarServicio(servicio.id);
      dialogo.close();
      try { await loadBackendData(); render(); toast('Servicio inhabilitado.'); }
      catch (error) { toast(`Servicio inhabilitado. No se pudo actualizar el catálogo: ${error.message}`); }
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
