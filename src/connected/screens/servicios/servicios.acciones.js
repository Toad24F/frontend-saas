import { cargarDatosBackend, usuarioActual } from '../../backend.js';
import { inhabilitarServicio } from '../../modules/servicios/servicios.operaciones.js';
import { render, estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { obtenerRecurso } from '../../../shared/aplicacion.datos.js';
import { espacioErrorFormulario } from '../../../shared/formularios.componentes.js';
import { escaparHtml, abrirDialogo, mostrarAviso } from '../../../shared/interfaz.componentes.js';

export function confirmarInhabilitacionServicio(id) {
  if (usuarioActual?.rol !== 'admin_negocio' || estadoAplicacion.pagina !== 'servicios') return;
  const servicio = obtenerRecurso('services', id, estadoAplicacion.negocioId);
  // El usuario confirma un retiro recuperable. Desactivar sigue disponible
  // como estado operativo distinto en el menú de la tarjeta.
  const dialogo = abrirDialogo('Inhabilitar servicio', `<div class="dialog-body"><p><strong>${escaparHtml(servicio.name)}</strong> saldrá de los listados operativos. Podrás consultarlo en Inhabilitados y restaurarlo como inactivo más adelante.</p>${espacioErrorFormulario}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn action-danger" data-confirm>Inhabilitar servicio</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const boton = evento.currentTarget;
    const etiqueta = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    try {
      await inhabilitarServicio(servicio.id);
      dialogo.close();
      try { await cargarDatosBackend(); render(); mostrarAviso('Servicio inhabilitado.'); }
      catch (error) { mostrarAviso(`Servicio inhabilitado. No se pudo actualizar el catálogo: ${error.message}`); }
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
