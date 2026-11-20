import { renderResumenDemo } from './resumen/resumen.vista.js';
import { clientes } from './clientes/clientes.vista.js';
import { profesionales } from '../../shared/screens/profesionales/profesionales.vista.js';
import { servicios } from '../../shared/screens/servicios/servicios.vista.js';
import { sucursales } from '../../shared/screens/sucursales/sucursales.vista.js';
import { renderDisponibilidadDemo } from './disponibilidad/disponibilidad.vista.js';
import { renderReportesDemo } from './reportes/reportes.vista.js';
import { renderNotificacionesDemo } from './notificaciones/notificaciones.vista.js';
import { renderConfiguracionDemo } from './configuracion/configuracion.vista.js';
import { plataforma } from '../../shared/screens/plataforma/plataforma.vista.js';
import { renderEstadoVacio, renderBoton } from '../../shared/interfaz.componentes.js';

const pantallas = {
  resumen: renderResumenDemo,
  clientes,
  profesionales,
  servicios,
  sucursales,
  disponibilidad: renderDisponibilidadDemo,
  reportes: renderReportesDemo,
  notificaciones: renderNotificacionesDemo,
  configuracion: renderConfiguracionDemo,
  plataforma,
};

export function renderPantalla(pagina) {
  return pantallas[pagina]?.() ?? renderEstadoVacio('Esta página no existe', 'Vuelve a tu agenda para continuar.', renderBoton('Ir a la agenda', 'ir-agenda', 'calendar'));
}
