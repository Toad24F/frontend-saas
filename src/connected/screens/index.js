import { professionals } from './profesionales/view.js';
import { servicios } from './servicios/servicios.vista.js';
import { sucursales } from './sucursales/sucursales.vista.js';
import { availability } from './disponibilidad/view.js';
import { platform } from '../../shared/screens/plataforma/view.js';
import { account } from './cuenta/view.js';
import { businessDetail } from './negocio/view.js';
import { receptionists } from './recepcionistas/view.js';
import { empty } from '../../shared/ui.js';
import { agenda } from './agenda/view.js';
import { clients } from './clientes/view.js';
import './disponibilidad/actions.js';
import './cuenta/actions.js';

const views = {
  agenda,
  clientes: clients,
  profesionales: professionals,
  servicios,
  sucursales,
  disponibilidad: availability,
  plataforma: platform,
  cuenta: account,
  negocio: businessDetail,
  recepcionistas: receptionists,
};

export function renderView(page) {
  return views[page]?.() ?? empty('Esta página no existe', 'Vuelve a tu agenda para continuar.');
}
