import { escaparHtml } from '../../../shared/interfaz.componentes.js';
import { etiquetasEstadoCita, formatearFecha } from '../../../shared/aplicacion.datos.js';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const formatoCantidad = new Intl.NumberFormat('es-MX');
const formatoPorcentaje = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cantidad = (valor) => formatoCantidad.format(valor);
const porcentaje = (valor) => valor === null ? 'Sin datos' : `${formatoPorcentaje.format(valor)} %`;
const moneda = (valor) => formatoMoneda.format(valor);
const estados = Object.entries(etiquetasEstadoCita);
const nombres = (grupo) => escaparHtml(grupo.nombres.join(' / '));

// Los agregados y sus denominadores llegan del servidor. Los nombres vienen de las filas históricas.
export function renderIndicadoresReporte(resumen) {
  const { estados, denominadoresTasas, ingresosEstimados, totalCitas } = resumen;
  const tarjetas = [
    ['Atendidas', cantidad(estados.completada)],
    ['Canceladas', cantidad(estados.cancelada)],
    ['No asistencias', cantidad(estados.no_asistio)],
    ['Ingresos estimados', moneda(ingresosEstimados.subtotalConocido), ingresosEstimados.incompleta ? 'Subtotal conocido' : 'Servicios completados'],
    ['Tasa de inasistencia', porcentaje(resumen.tasaInasistencia), `${cantidad(estados.no_asistio)} de ${cantidad(denominadoresTasas.inasistencia)}`],
    ['Tasa de cancelación', porcentaje(resumen.tasaCancelacion), `${cantidad(estados.cancelada)} de ${cantidad(denominadoresTasas.cancelacion)}`],
    ['Pasadas sin resultado', cantidad(resumen.pasadasSinResultado)],
    ['Cancelaciones automáticas', cantidad(resumen.cancelacionesAutomaticas), `De ${cantidad(estados.cancelada)} canceladas`],
  ];
  return `<div class="cuadricula-indicadores reportes-indicadores">${tarjetas.map(([etiqueta, valor, detalle]) =>
    `<article class="tarjeta-indicador"><h2 class="reportes-etiqueta">${etiqueta}</h2><strong class="indicador-valor">${valor}</strong>${detalle ? `<small>${detalle}</small>` : ''}</article>`).join('')}</div>
    <p class="nota-informativa">Estimación de servicios completados con costo histórico. No representa cobros ni un comprobante fiscal.</p>
    ${ingresosEstimados.incompleta ? `<p class="nota-informativa">Estimación incompleta · ${cantidad(ingresosEstimados.sinCosto)} ${ingresosEstimados.sinCosto === 1 ? 'cita sin costo histórico' : 'citas sin costo histórico'}.</p>` : ''}
    <div class="reportes-desgloses">
      ${renderTabla('Origen de reservas', ['Origen', 'Citas', 'Proporción'], [
        ['Personal', resumen.origen.manual], ['Portal', resumen.origen.portal_publico],
      ].map(([origen, grupo]) => [origen, `${cantidad(grupo.cantidad)} de ${cantidad(totalCitas)}`, porcentaje(grupo.porcentaje)]))}
      ${renderTabla('Servicios más solicitados', ['Servicio', 'Citas'], resumen.serviciosSolicitados.map((grupo) => [nombres(grupo), cantidad(grupo.cantidad)]))}
      ${renderEstimacion('Ingresos estimados por servicio', 'Servicio', ingresosEstimados.porServicio)}
      ${renderEstimacion('Ingresos estimados por sucursal', 'Sucursal', ingresosEstimados.porSucursal)}
    </div>
    ${renderEvolucion(resumen)}`;
}

function renderEstimacion(titulo, agrupador, grupos) {
  return renderTabla(titulo, [agrupador, 'Subtotal conocido', 'Sin costo'], grupos.map((grupo) =>
    [nombres(grupo), moneda(grupo.subtotalConocido), cantidad(grupo.sinCosto)]));
}

function renderEvolucion(resumen) {
  const titulo = resumen.filtros.agrupacion === 'mes' ? 'Evolución mensual' : 'Evolución semanal';
  return renderTabla(titulo, ['Inicio del periodo', 'Citas', ...estados.map(([, etiqueta]) => etiqueta)],
    resumen.evolucion.map((periodo) => [
      formatearFecha(periodo.inicioPeriodo), cantidad(periodo.totalCitas),
      ...estados.map(([estado]) => cantidad(periodo.estados[estado])),
    ]));
}

function renderTabla(titulo, columnas, filas, clase = '', total = '') {
  return `<section class="superficie reportes-tabla ${clase}"><div class="encabezado-seccion"><h2>${titulo}</h2></div>${
    filas.length ? `<div class="table-responsive" tabindex="0" role="region" aria-label="${titulo}"><table class="tabla-app">
    <thead><tr>${columnas.map((columna) => `<th scope="col">${columna}</th>`).join('')}</tr></thead>
    <tbody>${filas.map((fila) => `<tr>${fila.map((celda) => `<td>${celda}</td>`).join('')}</tr>`).join('')}</tbody>
    ${total ? `<tfoot><tr><th colspan="${columnas.length}">${total}</th></tr></tfoot>` : ''}
    </table></div>` : `<p class="reportes-tabla-vacia">Sin registros.</p>${total ? `<p>${total}</p>` : ''}`}</section>`;
}

export function renderFilasReporte(filas, impresion = false) {
  return renderTabla('Citas del corte', ['Fecha en sucursal', 'Sucursal', 'Profesional', 'Servicio', 'Estado', 'Origen', 'Costo histórico'],
    filas.map((fila) => [
      formatearFecha(fila.fechaCivil, impresion ? { day: 'numeric', month: 'short', year: 'numeric' } : undefined),
      escaparHtml(fila.nombreSucursal ?? '—'),
      escaparHtml(fila.nombreProfesional ?? '—'), escaparHtml(fila.nombreServicio ?? '—'),
      escaparHtml(etiquetasEstadoCita[fila.estado] ?? '—'),
      fila.origen === 'portal_publico' ? 'Portal' : 'Personal',
      fila.costoAceptado === null ? 'Sin costo' : moneda(fila.costoAceptado),
    // El pie impreso concilia la colección verificada con el total del corte.
    ]), impresion ? 'reportes-coleccion-impresion' : '', impresion ? `Total de citas: ${cantidad(filas.length)}` : '');
}
