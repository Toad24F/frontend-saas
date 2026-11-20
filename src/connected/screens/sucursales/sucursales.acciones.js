import { cargarDatosBackend, usuarioActual } from '../../backend.js';
import { inhabilitarSucursal } from '../../modules/sucursales/sucursales.operaciones.js';
import { render, estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { obtenerRecurso } from '../../../shared/aplicacion.datos.js';
import { espacioErrorFormulario } from '../../../shared/formularios.componentes.js';
import { escaparHtml, abrirDialogo, mostrarAviso } from '../../../shared/interfaz.componentes.js';

export function confirmarInhabilitacionSucursal(id) {
  if (usuarioActual?.rol !== 'admin_negocio' || estadoAplicacion.pagina !== 'sucursales') return;
  const sucursal = obtenerRecurso('branches', id, estadoAplicacion.negocioId);
  // No se promete que el retiro libere un cupo: la lectura posterior del
  // servidor decide cuántas sucursales activas quedan disponibles.
  const dialogo = abrirDialogo('Inhabilitar sucursal', `<div class="dialogo-cuerpo"><p><strong>${escaparHtml(sucursal.name)}</strong> saldrá de los listados operativos. Podrás consultarla en Inhabilitados y restaurarla como inactiva más adelante.</p>${espacioErrorFormulario}</div><div class="dialogo-pie"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn accion-peligro" data-confirm>Inhabilitar sucursal</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const boton = evento.currentTarget;
    const etiqueta = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    try {
      await inhabilitarSucursal(sucursal.id);
      dialogo.close();
      try { await cargarDatosBackend(); render(); mostrarAviso('Sucursal inhabilitada.'); }
      catch (error) { mostrarAviso(`Sucursal inhabilitada. No se pudo actualizar la lista y el cupo: ${error.message}`); }
    } catch (error) {
      const destino = dialogo.querySelector('#error-formulario');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally {
      boton.disabled = false;
      boton.textContent = etiqueta;
    }
  };
}
