import { escaparHtml } from '../../../shared/interfaz.componentes.js';
import { etiquetasEstadoCita, formatearFecha } from '../../../shared/aplicacion.datos.js';
import { monedaReporte, renderTablaReporte } from '../../../shared/screens/reportes/reportes.indicadores.js';

const formatoCantidad = new Intl.NumberFormat('es-MX');

export function renderFilasReporte(filas, impresion = false) {
  return renderTablaReporte('Citas del corte', ['Fecha en sucursal', 'Sucursal', 'Profesional', 'Servicio', 'Estado', 'Origen', 'Costo histórico'],
    filas.map((fila) => [
      formatearFecha(fila.fechaCivil, impresion ? { day: 'numeric', month: 'short', year: 'numeric' } : undefined),
      escaparHtml(fila.nombreSucursal ?? '—'),
      escaparHtml(fila.nombreProfesional ?? '—'),
      escaparHtml(fila.nombreServicio ?? '—'),
      escaparHtml(etiquetasEstadoCita[fila.estado] ?? '—'),
      fila.origen === 'portal_publico' ? 'Portal' : 'Personal',
      fila.costoAceptado === null ? 'Sin costo' : monedaReporte(fila.costoAceptado),
    // El pie impreso concilia la colección verificada con el total del corte.
    ]), impresion ? 'reportes-coleccion-impresion' : '', impresion ? `Total de citas: ${formatoCantidad.format(filas.length)}` : '');
}
