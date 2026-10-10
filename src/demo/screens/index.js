import { overview } from './resumen/view.js';
import { clients } from './clientes/view.js';
import { professionals } from '../../shared/screens/profesionales/view.js';
import { services } from '../../shared/screens/servicios/view.js';
import { branches } from '../../shared/screens/sucursales/view.js';
import { availability } from '../../shared/screens/disponibilidad/view.js';
import { reports } from './reportes/view.js';
import { notifications } from './notificaciones/view.js';
import { settings } from './configuracion/view.js';
import { platform } from '../../shared/screens/plataforma/view.js';
import { empty, button } from '../../shared/ui.js';

const views = {
  resumen: overview,
  clientes: clients,
  profesionales: professionals,
  servicios: services,
  sucursales: branches,
  disponibilidad: availability,
  reportes: reports,
  notificaciones: notifications,
  configuracion: settings,
  plataforma: platform,
};

export function renderView(page) {
  return views[page]?.() ?? empty('Esta página no existe', 'Vuelve a tu agenda para continuar.', button('Ir a la agenda', 'go-agenda', 'calendar'));
}
