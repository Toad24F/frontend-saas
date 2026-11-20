import { user } from '../../backend.js';
import { obtenerCupoSucursales } from '../../modules/sucursales/sucursales.cupo.js';
import { sucursales as sucursalesCompartidas } from '../../../shared/screens/sucursales/sucursales.vista.js';
import { escape } from '../../../shared/ui.js';
import { renderAccesoInhabilitados } from '../recursos/inhabilitados.vista.js';

export function sucursales() {
  if (user?.rol !== 'admin_negocio') return sucursalesCompartidas();
  const cupo = obtenerCupoSucursales();
  return `${sucursalesCompartidas({ cupo, accionesEncabezado: renderAccesoInhabilitados('sucursales'), administrar: (sucursal) =>
    `<button type="button" class="action-danger" data-inhabilitar-sucursal="${sucursal.id}" aria-label="Inhabilitar ${escape(sucursal.name)}">Inhabilitar</button>` })}`;
}
