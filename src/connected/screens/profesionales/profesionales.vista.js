import { renderCupoCatalogo } from '../../../shared/screens/catalogos/catalogos.encabezado.js';
import { consultarCupoRol } from '../../modules/catalogos/catalogos.cupo.js';
import { profesionales as profesionalesCompartidos } from '../../../shared/screens/profesionales/profesionales.vista.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { escaparHtml } from '../../../shared/interfaz.componentes.js';
import './profesionales.estilos.css';
import { renderAccesoInhabilitados } from '../recursos/inhabilitados.vista.js';

export function profesionales() {
  return `<div class="profesionales-conectados">${profesionalesCompartidos((persona) =>
    `<details class="profesional-mas"><summary aria-label="Más acciones para ${escaparHtml(persona.name)}">${renderIcono('more')}</summary><div class="profesional-menu-mas">
      <button type="button" class="${persona.active === false ? '' : 'accion-precaucion'}" data-accion-profesional="${persona.active === false ? 'reactivar' : 'desactivar'}" data-profesional-id="${persona.id}">${persona.active === false ? 'Reactivar' : 'Desactivar'}</button>
      <button type="button" class="accion-peligro" data-accion-profesional="inhabilitar" data-profesional-id="${persona.id}">Inhabilitar</button>
    </div></details>`, { accionesEncabezado: renderAccesoInhabilitados('profesionales'), cupo: renderCupoCatalogo('Profesionales activos', consultarCupoRol('profesionales')) })}</div>`;
}
