import { profesionales } from './profesionales/profesionales.vista.js';
import { servicios } from './servicios/servicios.vista.js';
import { sucursales } from './sucursales/sucursales.vista.js';
import { renderDisponibilidadConectada } from './disponibilidad/disponibilidad.vista.js';
import { platform } from '../../shared/screens/plataforma/view.js';
import { account } from './cuenta/view.js';
import { businessDetail } from './negocio/view.js';
import { recepcionistas } from './recepcionistas/recepcionistas.vista.js';
import { empty } from '../../shared/ui.js';
import { agenda } from './agenda/agenda.vista.js';
import { clientes } from './clientes/clientes.vista.js';
import './disponibilidad/disponibilidad.acciones.js';
import './cuenta/actions.js';

const views = {
  agenda,
  clientes,
  profesionales,
  servicios,
  sucursales,
  disponibilidad: renderDisponibilidadConectada,
  plataforma: platform,
  cuenta: account,
  negocio: businessDetail,
  recepcionistas,
};

export function renderView(page) {
  return views[page]?.() ?? empty('Esta página no existe', 'Vuelve a tu agenda para continuar.');
}
