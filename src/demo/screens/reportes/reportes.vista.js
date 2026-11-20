import { state } from '../../../shared/app.js';
import { list, resource, tenantById, formatDate, money } from '../../../shared/data.js';
import { icon } from '../../../shared/icons.js';
import { escape as escapar, pageHead, button } from '../../../shared/ui.js';
import './reportes.estilos.css';
import { estadoReportes } from './reportes.estado.js';
function filtrarCitasReporte() {
  return list('appointments', state.tenantId).filter(
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
      (total, cita) => total + resource('services', cita.serviceId, state.tenantId).price,
      0,
    );
  const renderTablaIngresos = (tipo) =>
    `<table class="table app-table"><thead><tr><th>${tipo === 'services' ? 'Servicio' : 'Sucursal'}</th><th>Atendidas</th><th>Ingreso estimado</th></tr></thead><tbody>${list(
      tipo,
      state.tenantId,
    )
      .map((recurso) => {
        const agrupadas = atendidas.filter(
          (cita) => cita[tipo === 'services' ? 'serviceId' : 'branchId'] === recurso.id,
        );
        return `<tr><td>${escapar(recurso.name)}</td><td>${agrupadas.length}</td><td><strong>${money(agrupadas.reduce((total, cita) => total + resource('services', cita.serviceId, state.tenantId).price, 0))}</strong></td></tr>`;
      })
      .join('')}</tbody></table>`;
  return `${pageHead('Reportes', 'Convierte tu actividad en decisiones más claras.', button('Guardar como PDF', 'imprimir-reporte', 'download'))}<section class="surface reportes-filtros"><label>Desde<input type="date" class="form-control" id="reportes-desde" value="${estadoReportes.desde}"/></label><label>Hasta<input type="date" class="form-control" id="reportes-hasta" value="${estadoReportes.hasta}"/></label><label>Sucursal<select id="reportes-sucursal" class="form-select"><option value="todas">Todas las sucursales</option>${list(
    'branches',
    state.tenantId,
  )
    .map(
      (sucursal) =>
        `<option value="${sucursal.id}" ${estadoReportes.sucursal === String(sucursal.id) ? 'selected' : ''}>${escapar(sucursal.name)}</option>`,
    )
    .join(
      '',
    )}</select></label><button class="btn btn-light" data-action="filtrar-reportes">Aplicar filtros ${icon('arrow')}</button></section><div id="reportes-imprimible"><div class="reportes-encabezado-impresion"><h1>${escapar(tenantById(state.tenantId).name)} · Reporte de citas</h1><p>${formatDate(estadoReportes.desde)} al ${formatDate(estadoReportes.hasta)} · Datos de demostración</p></div><div class="stats-grid">${[
    [atendidas.length, 'Citas atendidas', 'circleCheck', 'green'],
    [canceladas.length, 'Canceladas', 'x', 'orange'],
    [ausencias.length, 'No asistieron', 'user', 'purple'],
    [money(ingresos), 'Ingresos estimados', 'money', 'blue'],
  ]
    .map(
      ([valor, etiqueta, simbolo, color]) =>
        `<div class="stat-card"><div class="stat-top"><span>${etiqueta}</span><span class="stat-icon ${color}">${icon(simbolo)}</span></div><div class="stat-number">${valor}</div><div class="stat-caption">${etiqueta === 'Ingresos estimados' ? 'MXN · Solo citas completadas' : 'En el periodo seleccionado'}</div></div>`,
    )
    .join(
      '',
    )}</div><div class="reportes-tablas"><section class="surface"><div class="section-heading"><h2>Ingresos por servicio</h2></div><div class="table-responsive">${renderTablaIngresos('services')}</div></section><section class="surface"><div class="section-heading"><h2>Ingresos por sucursal</h2></div><div class="table-responsive">${renderTablaIngresos('branches')}</div></section></div><div class="information-note">${icon('info')} Importes estimados a partir del precio del catálogo y las citas completadas. Este reporte no representa cobros ni un comprobante fiscal.</div></div>`;
}
