import { professionals } from './profesionales/view.js';
import { services } from './servicios/view.js';
import { branches } from './sucursales/view.js';
import { availability } from './disponibilidad/view.js';
import { platform } from '../../shared/screens/plataforma/view.js';
import { account } from './cuenta/view.js';
import { businessDetail } from './negocio/view.js';
import { receptionists } from './recepcionistas/view.js';
import { empty } from '../../shared/ui.js';
import { agenda } from './agenda/view.js';
import './disponibilidad/actions.js';
import './cuenta/actions.js';

const views = {
  // Clientes obtiene navegación en T088; la consulta del directorio corresponde a T098.
  agenda,
  clientes: () => '<div class="page-heading"><div><h1>Clientes</h1><p>Directorio de clientes de tu negocio.</p></div></div>' + empty('Directorio pendiente de conexión', 'La consulta y gestión de fichas se habilitarán en M4-T098–T099.'),
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
