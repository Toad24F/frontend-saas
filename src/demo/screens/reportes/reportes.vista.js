import { estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { ampliarDatosCita, etiquetasEstadoCita, listarRegistros, obtenerNegocio, formatearFecha } from '../../../shared/aplicacion.datos.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { escaparHtml as escapar, renderEncabezadoPagina, renderBoton } from '../../../shared/interfaz.componentes.js';
import { monedaReporte, renderIndicadoresReporte, renderTablaReporte } from '../../../shared/screens/reportes/reportes.indicadores.js';
import { calcularReporteDemo } from './reportes.modelo.js';
import { estadoReportes } from './reportes.estado.js';
import './reportes.estilos.css';

export function renderReportesDemo() {
  const { negocioId } = estadoAplicacion;
  const { desde, hasta, sucursal } = estadoReportes;
  const citas = listarRegistros('appointments', negocioId)
    .filter((cita) => cita.date >= desde && cita.date <= hasta && (sucursal === 'todas' || cita.branchId === Number(sucursal)))
    .map(ampliarDatosCita);
  const corte = calcularReporteDemo(citas, { desde, hasta, agrupacion: 'semana' });
  const periodo = `${formatearFecha(desde)} al ${formatearFecha(hasta)} · Datos de demostración`;
  return `<section class="reportes-demo">${renderEncabezadoPagina('Reportes', 'Consulta citas e ingresos estimados por periodo.', renderBoton('Guardar como PDF', 'imprimir-reporte', 'download'))}
    <section class="superficie reportes-filtros">
      <label>Desde<input type="date" class="form-control" id="reportes-desde" value="${desde}"></label>
      <label>Hasta<input type="date" class="form-control" id="reportes-hasta" value="${hasta}"></label>
      <label>Sucursal<select id="reportes-sucursal" class="form-select"><option value="todas">Todas las sucursales</option>${listarRegistros('branches', negocioId)
        .map((sede) => `<option value="${sede.id}" ${sucursal === String(sede.id) ? 'selected' : ''}>${escapar(sede.name)}</option>`).join('')}</select></label>
      <button type="button" class="btn btn-primary" data-action="filtrar-reportes">Aplicar filtros ${renderIcono('arrow')}</button>
    </section>
    <p class="reportes-periodo-demo">${periodo}</p>
    <div id="reportes-imprimible">
      <div class="reportes-encabezado-impresion"><h1>${escapar(obtenerNegocio(negocioId).name)} · Reporte de citas</h1><p>${periodo}</p></div>
      ${renderIndicadoresReporte(corte, true)}
      ${renderTablaReporte('Detalle de citas', ['Fecha en sucursal', 'Sucursal', 'Profesional', 'Servicio', 'Estado', 'Origen', 'Costo de catálogo'],
        citas.map((cita) => [formatearFecha(cita.date), escapar(cita.branch.name), escapar(cita.professional.name), escapar(cita.service.name),
          etiquetasEstadoCita[cita.status], cita.origin === 'manual' ? 'Personal' : 'Portal', cita.service.price == null ? 'Sin costo' : monedaReporte(cita.service.price)]))}
    </div>
  </section>`;
}
