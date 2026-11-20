import { usuarioActual } from '../../backend.js';
import { obtenerCupoSucursales } from '../../modules/sucursales/sucursales.cupo.js';
import { sucursales as sucursalesCompartidas } from '../../../shared/screens/sucursales/sucursales.vista.js';
import { escaparHtml } from '../../../shared/interfaz.componentes.js';
import { renderAccesoInhabilitados } from '../recursos/inhabilitados.vista.js';

export function sucursales() {
  if (usuarioActual?.rol !== 'admin_negocio') return sucursalesCompartidas();
  const cupo = obtenerCupoSucursales();
  return `${sucursalesCompartidas({ cupo, accionesEncabezado: renderAccesoInhabilitados('sucursales'), administrar: (sucursal) =>
    `<button type="button" class="accion-peligro" data-inhabilitar-sucursal="${sucursal.id}" aria-label="Inhabilitar ${escaparHtml(sucursal.name)}">Inhabilitar</button>` })}`;
}
