import { overview } from './resumen/view.js';
import { clientes } from './clientes/clientes.vista.js';
import { profesionales } from '../../shared/screens/profesionales/profesionales.vista.js';
import { servicios } from '../../shared/screens/servicios/servicios.vista.js';
import { sucursales } from '../../shared/screens/sucursales/sucursales.vista.js';
import { renderDisponibilidadDemo } from './disponibilidad/disponibilidad.vista.js';
import { reports } from './reportes/view.js';
import { notifications } from './notificaciones/view.js';
import { settings } from './configuracion/view.js';
import { platform } from '../../shared/screens/plataforma/view.js';
import { empty, button } from '../../shared/ui.js';

const views = {
  resumen: overview,
  clientes,
  profesionales,
  servicios,
  sucursales,
  disponibilidad: renderDisponibilidadDemo,
  reportes: reports,
  notificaciones: notifications,
  configuracion: settings,
  plataforma: platform,
};

export function renderView(page) {
  return views[page]?.() ?? empty('Esta página no existe', 'Vuelve a tu agenda para continuar.', button('Ir a la agenda', 'go-agenda', 'calendar'));
}
