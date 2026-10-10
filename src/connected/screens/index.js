import { professionals } from '../../shared/screens/profesionales/view.js';
import { services } from '../../shared/screens/servicios/view.js';
import { branches } from '../../shared/screens/sucursales/view.js';
import { availability } from '../../shared/screens/disponibilidad/view.js';
import { platform } from '../../shared/screens/plataforma/view.js';
import { empty } from '../../shared/ui.js';

const views = {
  profesionales: professionals,
  servicios: services,
  sucursales: branches,
  disponibilidad: availability,
  plataforma: platform,
};

export function renderView(page) {
  return views[page]?.() ?? empty('Esta página no existe', 'Vuelve a tu agenda para continuar.');
}
