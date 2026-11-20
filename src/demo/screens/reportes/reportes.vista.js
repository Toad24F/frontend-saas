import { estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { listarRegistros, obtenerRecurso, obtenerNegocio, formatearFecha, formatearMoneda } from '../../../shared/aplicacion.datos.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { escaparHtml as escapar, renderEncabezadoPagina, renderBoton } from '../../../shared/interfaz.componentes.js';
import './reportes.estilos.css';
import { estadoReportes } from './reportes.estado.js';
function filtrarCitasReporte() {
  return listarRegistros('appointments', estadoAplicacion.negocioId).filter(
    (cita) =>
      cita.date >= estadoReportes.desde &&
      cita.date <= estadoReportes.hasta &&
      (estadoReportes.sucursal === 'todas' ||
        cita.branchId === Number(estadoReportes.sucursal)),
  );
}
export function renderReportesDemo() {
  const citas = filtrarCitasReporte(),
    atendidas = citas.filter((cita) => cita.status === 'completada'),
    canceladas = citas.filter((cita) => cita.status === 'cancelada'),
    ausencias = citas.filter((cita) => cita.status === 'no_asistio'),
    ingresos = atendidas.reduce(
      (total, cita) => total + obtenerRecurso('services', cita.serviceId, estadoAplicacion.negocioId).price,
      0,
    );
  const renderTablaIngresos = (tipo) =>
    `<table class="table app-table"><thead><tr><th>${tipo === 'services' ? 'Servicio' : 'Sucursal'}</th><th>Atendidas</th><th>Ingreso estimado</th></tr></thead><tbody>${listarRegistros(
      tipo,
      estadoAplicacion.negocioId,
    )
      .map((recurso) => {
        const agrupadas = atendidas.filter(
          (cita) => cita[tipo === 'services' ? 'serviceId' : 'branchId'] === recurso.id,
        );
        return `<tr><td>${escapar(recurso.name)}</td><td>${agrupadas.length}</td><td><strong>${formatearMoneda(agrupadas.reduce((total, cita) => total + obtenerRecurso('services', cita.serviceId, estadoAplicacion.negocioId).price, 0))}</strong></td></tr>`;
      })
      .join('')}</tbody></table>`;
  return `${renderEncabezadoPagina('Reportes', 'Convierte tu actividad en decisiones más claras.', renderBoton('Guardar como PDF', 'imprimir-reporte', 'download'))}<section class="surface reportes-filtros"><label>Desde<input type="date" class="form-control" id="reportes-desde" value="${estadoReportes.desde}"/></label><label>Hasta<input type="date" class="form-control" id="reportes-hasta" value="${estadoReportes.hasta}"/></label><label>Sucursal<select id="reportes-sucursal" class="form-select"><option value="todas">Todas las sucursales</option>${listarRegistros(
    'branches',
    estadoAplicacion.negocioId,
  )
    .map(
      (sucursal) =>
        `<option value="${sucursal.id}" ${estadoReportes.sucursal === String(sucursal.id) ? 'selected' : ''}>${escapar(sucursal.name)}</option>`,
    )
    .join(
      '',
    )}</select></label><button class="btn btn-light" data-action="filtrar-reportes">Aplicar filtros ${renderIcono('arrow')}</button></section><div id="reportes-imprimible"><div class="reportes-encabezado-impresion"><h1>${escapar(obtenerNegocio(estadoAplicacion.negocioId).name)} · Reporte de citas</h1><p>${formatearFecha(estadoReportes.desde)} al ${formatearFecha(estadoReportes.hasta)} · Datos de demostración</p></div><div class="stats-grid">${[
    [atendidas.length, 'Citas atendidas', 'circleCheck', 'green'],
    [canceladas.length, 'Canceladas', 'x', 'orange'],
    [ausencias.length, 'No asistieron', 'user', 'purple'],
    [formatearMoneda(ingresos), 'Ingresos estimados', 'money', 'blue'],
  ]
    .map(
      ([valor, etiqueta, simbolo, color]) =>
        `<div class="stat-card"><div class="stat-top"><span>${etiqueta}</span><span class="stat-icon ${color}">${renderIcono(simbolo)}</span></div><div class="stat-number">${valor}</div><div class="stat-caption">${etiqueta === 'Ingresos estimados' ? 'MXN · Solo citas completadas' : 'En el periodo seleccionado'}</div></div>`,
    )
    .join(
      '',
    )}</div><div class="reportes-tablas"><section class="surface"><div class="section-heading"><h2>Ingresos por servicio</h2></div><div class="table-responsive">${renderTablaIngresos('services')}</div></section><section class="surface"><div class="section-heading"><h2>Ingresos por sucursal</h2></div><div class="table-responsive">${renderTablaIngresos('branches')}</div></section></div><div class="information-note">${renderIcono('info')} Importes estimados a partir del precio del catálogo y las citas completadas. Este reporte no representa cobros ni un comprobante fiscal.</div></div>`;
}
