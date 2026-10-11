import { professionals } from './profesionales/view.js';
import { services } from '../../shared/screens/servicios/view.js';
import { branches } from '../../shared/screens/sucursales/view.js';
import { availability } from './disponibilidad/view.js';
import { platform } from '../../shared/screens/plataforma/view.js';
import { account } from './cuenta/view.js';
import { businessDetail } from './negocio/view.js';
import { receptionists } from './recepcionistas/view.js';
import { empty } from '../../shared/ui.js';

const views = {
  profesionales: professionals,
  servicios: services,
  sucursales: branches,
  disponibilidad: availability,
  plataforma: platform,
  cuenta: account,
  negocio: businessDetail,
  recepcionistas: receptionists,
};

export function renderView(page) {
  return views[page]?.() ?? empty('Esta página no existe', 'Vuelve a tu agenda para continuar.');
}
