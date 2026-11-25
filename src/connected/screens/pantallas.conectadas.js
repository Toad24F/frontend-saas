import { profesionales } from './profesionales/profesionales.vista.js';
import { servicios } from './servicios/servicios.vista.js';
import { sucursales } from './sucursales/sucursales.vista.js';
import { renderDisponibilidadConectada } from './disponibilidad/disponibilidad.vista.js';
import { plataforma } from '../../shared/screens/plataforma/plataforma.vista.js';
import { cuenta } from './cuenta/cuenta.vista.js';
import { renderDetalleNegocio } from './negocio/negocio.vista.js';
import { recepcionistas } from './recepcionistas/recepcionistas.vista.js';
import { renderEstadoVacio } from '../../shared/interfaz.componentes.js';
import { agenda } from './agenda/agenda.vista.js';
import { clientes } from './clientes/clientes.vista.js';
import { renderReportesConectados } from './reportes/reportes.vista.js';
import { renderResumenConectado, reiniciarResumen } from './resumen/resumen.vista.js';
import './disponibilidad/disponibilidad.acciones.js';
import './cuenta/cuenta.acciones.js';

const pantallas = {
  agenda,
  resumen: renderResumenConectado,
  clientes,
  reportes: renderReportesConectados,
  profesionales,
  servicios,
  sucursales,
  disponibilidad: renderDisponibilidadConectada,
  plataforma,
  cuenta,
  negocio: renderDetalleNegocio,
  recepcionistas,
};

export function renderPantalla(pagina) {
  if (pagina !== 'resumen') reiniciarResumen();
  return pantallas[pagina]?.() ?? renderEstadoVacio('Esta página no existe', 'Vuelve a tu agenda para continuar.');
}
