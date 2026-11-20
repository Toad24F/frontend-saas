import { usuarioActual } from '../../backend.js';
import { servicios as serviciosCompartidos } from '../../../shared/screens/servicios/servicios.vista.js';
import { escaparHtml } from '../../../shared/interfaz.componentes.js';
import { renderAccesoInhabilitados } from '../recursos/inhabilitados.vista.js';

export function servicios() {
  if (usuarioActual?.rol !== 'admin_negocio') return serviciosCompartidos();
  return `${serviciosCompartidos((servicio) =>
    `<button type="button" class="accion-peligro" data-inhabilitar-servicio="${servicio.id}" aria-label="Inhabilitar ${escaparHtml(servicio.name)}">Inhabilitar</button>`, { accionesEncabezado: renderAccesoInhabilitados('servicios') })}`;
}
