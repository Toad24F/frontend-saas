import { isDemo, pending, user } from '../../../connected/backend.js';
import { state } from '../../../shared/app.js';
import { db, list, resource, appointmentInfo, tenantById, TODAY, addDays, formatDate, money } from '../../../shared/data.js';
import { icon } from '../../../shared/icons.js';
import { escape as esc, avatar, badge, pageHead, button, empty } from '../../../shared/ui.js';
import './style.css';
import { reportState } from './state.js';
export function reportData() {
  return list('appointments', state.tenantId).filter(
    (a) =>
      a.date >= reportState.from &&
      a.date <= reportState.to &&
      (reportState.branch === 'all' ||
        a.branchId === Number(reportState.branch)),
  );
}
export function reports() {
  const apps = reportData(),
    completed = apps.filter((a) => a.status === 'completada'),
    cancelled = apps.filter((a) => a.status === 'cancelada'),
    noShows = apps.filter((a) => a.status === 'no_asistio'),
    income = completed.reduce(
      (sum, a) => sum + resource('services', a.serviceId, state.tenantId).price,
      0,
    );
  const table = (kind) =>
    `<table class="table app-table"><thead><tr><th>${kind === 'services' ? 'Servicio' : 'Sucursal'}</th><th>Atendidas</th><th>Ingreso estimado</th></tr></thead><tbody>${list(
      kind,
      state.tenantId,
    )
      .map((item) => {
        const grouped = completed.filter(
          (a) => a[kind === 'services' ? 'serviceId' : 'branchId'] === item.id,
        );
        return `<tr><td>${esc(item.name)}</td><td>${grouped.length}</td><td><strong>${money(grouped.reduce((sum, a) => sum + resource('services', a.serviceId, state.tenantId).price, 0))}</strong></td></tr>`;
      })
      .join('')}</tbody></table>`;
  return `${pageHead('Reportes', 'Convierte tu actividad en decisiones más claras.', button('Guardar como PDF', 'export-report', 'download'))}<section class="surface report-filters"><label>Desde<input type="date" class="form-control" id="report-from" value="${reportState.from}"/></label><label>Hasta<input type="date" class="form-control" id="report-to" value="${reportState.to}"/></label><label>Sucursal<select id="report-branch" class="form-select"><option value="all">Todas las sucursales</option>${list(
    'branches',
    state.tenantId,
  )
    .map(
      (b) =>
        `<option value="${b.id}" ${reportState.branch === String(b.id) ? 'selected' : ''}>${esc(b.name)}</option>`,
    )
    .join(
      '',
    )}</select></label><button class="btn btn-light" data-action="filter-reports">Aplicar filtros ${icon('arrow')}</button></section><div id="printable-report"><div class="print-heading"><h1>${esc(tenantById(state.tenantId).name)} · Reporte de citas</h1><p>${formatDate(reportState.from)} al ${formatDate(reportState.to)} · Datos de demostración</p></div><div class="stats-grid">${[
    [completed.length, 'Citas atendidas', 'circleCheck', 'green'],
    [cancelled.length, 'Canceladas', 'x', 'orange'],
    [noShows.length, 'No asistieron', 'user', 'purple'],
    [money(income), 'Ingresos estimados', 'money', 'blue'],
  ]
    .map(
      ([n, l, i, c]) =>
        `<div class="stat-card"><div class="stat-top"><span>${l}</span><span class="stat-icon ${c}">${icon(i)}</span></div><div class="stat-number">${n}</div><div class="stat-caption">${l === 'Ingresos estimados' ? 'MXN · Solo citas completadas' : 'En el periodo seleccionado'}</div></div>`,
    )
    .join(
      '',
    )}</div><div class="report-tables"><section class="surface"><div class="section-heading"><h2>Ingresos por servicio</h2></div><div class="table-responsive">${table('services')}</div></section><section class="surface"><div class="section-heading"><h2>Ingresos por sucursal</h2></div><div class="table-responsive">${table('branches')}</div></section></div><div class="information-note">${icon('info')} Importes estimados a partir del precio del catálogo y las citas completadas. Este reporte no representa cobros ni un comprobante fiscal.</div></div>`;
}
