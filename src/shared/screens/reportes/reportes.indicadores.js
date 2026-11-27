import { etiquetasEstadoCita, formatearFecha } from '../../aplicacion.datos.js';
import { escaparHtml } from '../../interfaz.componentes.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { periodoCalendario, sumarDiasCiviles } from '../../../connected/modules/agenda/agenda.calendario.js';
import './reportes.indicadores.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const formatoCantidad = new Intl.NumberFormat('es-MX');
const formatoPorcentaje = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const cantidad = (valor) => formatoCantidad.format(valor);
const porcentaje = (valor) => valor === null ? 'Sin datos' : `${formatoPorcentaje.format(valor)} %`;
export const monedaReporte = (valor) => formatoMoneda.format(valor);
const estadosCita = Object.entries(etiquetasEstadoCita);
const nombres = (grupo) => escaparHtml(grupo.nombres.join(' / ') || 'Sin registro histórico');

export function inicioPeriodoReporte(fecha, agrupacion) {
  return agrupacion === 'mes' ? `${fecha.slice(0, 7)}-01` : periodoCalendario('week', fecha).desde;
}

function periodosDeGrafica({ filtros, evolucion }) {
  if (!evolucion.length) return [];
  const totales = new Map(evolucion.map(({ inicioPeriodo, totalCitas }) => [inicioPeriodo, totalCitas]));
  const mensual = filtros.agrupacion === 'mes';
  const periodos = [];
  let fecha = inicioPeriodoReporte(filtros.desde, filtros.agrupacion);
  const ultimoPeriodo = inicioPeriodoReporte(filtros.hasta, filtros.agrupacion);
  while (periodos.length < 120) {
    periodos.push({ fecha, total: totales.get(fecha) ?? 0 });
    if (fecha === ultimoPeriodo) return periodos;
    if (mensual) {
      const siguiente = new Date(`${fecha}T00:00:00Z`);
      siguiente.setUTCMonth(siguiente.getUTCMonth() + 1);
      fecha = siguiente.toISOString().split('T')[0];
    } else fecha = sumarDiasCiviles(fecha, 7);
  }
  return null;
}

function renderEvolucion(resumen) {
  const mensual = resumen.filtros.agrupacion === 'mes';
  const titulo = mensual ? 'Evolución mensual' : 'Evolución semanal';
  const periodos = periodosDeGrafica(resumen);
  const maximo = Math.max(1, ...(periodos || []).map(({ total }) => total));
  const escala = maximo < 4 ? maximo : Math.ceil(maximo / 4) * 4;
  const columnas = periodos?.map(({ fecha, total }) => {
    const etiqueta = formatearFecha(fecha, mensual ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' });
    return `<li class="reportes-columna" aria-label="${formatearFecha(fecha)}: ${cantidad(total)} ${total === 1 ? 'cita' : 'citas'}">
      <div class="reportes-carril"><div class="reportes-barra-evolucion" style="height:${total / escala * 100}%"><strong>${cantidad(total)}</strong></div></div>
      <span>${etiqueta}</span>
    </li>`;
  }).join('');
  const grafica = columnas ? `<div class="reportes-evolucion-desplazamiento" role="region" aria-label="Gráfica de ${titulo.toLowerCase()}" tabindex="0">
    <ul class="reportes-grafica-evolucion" role="list">${columnas}</ul></div>`
    : `<p class="reportes-tabla-vacia">${periodos ? 'Sin citas para graficar.' : 'Consulta el desglose para ver los periodos del rango completo.'}</p>`;
  return `<section class="superficie reportes-evolucion" aria-labelledby="reportes-evolucion-titulo">
    <div class="encabezado-seccion"><h2 id="reportes-evolucion-titulo">${titulo}</h2></div>
    <div class="reportes-evolucion-visual">${grafica}</div>
    <details class="reportes-evolucion-detalle"><summary>Ver desglose por estado</summary>
      ${renderTablaReporte('Desglose por estado', ['Inicio del periodo', 'Citas', ...estadosCita.map(([, etiqueta]) => etiqueta)],
        resumen.evolucion.map(({ inicioPeriodo, totalCitas, estados }) => [formatearFecha(inicioPeriodo), cantidad(totalCitas),
          ...estadosCita.map(([estado]) => cantidad(estados[estado]))]))}
    </details>
  </section>`;
}

function renderOrigen({ origen, totalCitas }) {
  const grupos = [['Personal', origen.manual], ['Portal', origen.portal_publico]];
  const proporciones = grupos.map(([, grupo]) => totalCitas ? grupo.cantidad / totalCitas * 100 : 0);
  return `<section class="superficie reportes-origen" aria-labelledby="reportes-origen-titulo">
    <div class="encabezado-seccion"><h2 id="reportes-origen-titulo">Origen de las citas</h2></div>
    ${totalCitas ? `<div class="reportes-barra-origen" aria-hidden="true">${proporciones.map((valor) => `<span style="width:${valor}%"></span>`).join('')}</div>` : ''}
    <dl class="reportes-origen-leyenda">${grupos.map(([etiqueta, grupo]) => `<div>
      <dt><span aria-hidden="true"></span>${etiqueta}</dt><dd>${cantidad(grupo.cantidad)} · ${porcentaje(grupo.porcentaje)}</dd>
    </div>`).join('')}</dl>
  </section>`;
}

function renderEstimacion(titulo, agrupador, grupos) {
  return renderTablaReporte(titulo, [agrupador, 'Subtotal conocido', 'Sin costo'], grupos.map((grupo) =>
    [nombres(grupo), monedaReporte(grupo.subtotalConocido), cantidad(grupo.sinCosto)]));
}

// El panel conectado muestra los agregados y denominadores del corte, sin recalcularlos a partir de una página de citas.
export function renderIndicadoresReporte(resumen, demo = false) {
  const { estados, denominadoresTasas, ingresosEstimados, totalCitas } = resumen;
  const sinCosto = ingresosEstimados.sinCosto;
  const detalleImporte = ingresosEstimados.incompleta
    ? `Subtotal conocido · ${cantidad(sinCosto)} ${sinCosto === 1 ? 'cita sin costo histórico' : 'citas sin costo histórico'}`
    : 'MXN · Servicios completados';
  const tarjetas = [
    ['Citas del periodo', cantidad(totalCitas)],
    ['Citas atendidas', cantidad(estados.completada)],
    ['Tasa de inasistencia', porcentaje(resumen.tasaInasistencia), denominadoresTasas.inasistencia
      ? `${cantidad(estados.no_asistio)} de ${cantidad(denominadoresTasas.inasistencia)} citas con resultado de asistencia` : 'Sin asistencia registrada'],
    ['Ingresos estimados', monedaReporte(ingresosEstimados.subtotalConocido), detalleImporte],
  ];
  const cancelaciones = `${cantidad(estados.cancelada)} ${estados.cancelada === 1 ? 'cancelada' : 'canceladas'}${resumen.tasaCancelacion === null ? '' : ` (${porcentaje(resumen.tasaCancelacion)})`}`;
  const automaticas = resumen.cancelacionesAutomaticas == null ? '' : ` · ${cantidad(resumen.cancelacionesAutomaticas)} ${resumen.cancelacionesAutomaticas === 1 ? 'automática' : 'automáticas'}`;
  const pasadas = resumen.pasadasSinResultado;
  return `<div class="cuadricula-indicadores reportes-indicadores">${tarjetas.map(([etiqueta, valor, detalle]) =>
    `<article class="tarjeta-indicador"><h2 class="reportes-etiqueta">${etiqueta}</h2><strong class="indicador-valor">${valor}</strong>${detalle ? `<small>${detalle}</small>` : ''}</article>`).join('')}</div>
    <div class="reportes-contexto">
      <p>${demo ? 'Estimación de demostración según precios de catálogo.' : 'Estimación de servicios completados con costo histórico.'} No representa cobros ni un comprobante fiscal.</p>
      <p>${cancelaciones}${automaticas}</p>
      ${pasadas ? `<p class="reportes-aviso-pasadas">${renderIcono('info')} ${cantidad(pasadas)} ${pasadas === 1 ? 'cita pasada' : 'citas pasadas'} sin resultado</p>` : ''}
    </div>
    <div class="reportes-graficas">${renderEvolucion(resumen)}${renderOrigen(resumen)}</div>
    <div class="reportes-desgloses">
      ${renderTablaReporte('Citas por servicio', ['Servicio', 'Citas'], resumen.serviciosSolicitados.map((grupo) => [nombres(grupo), cantidad(grupo.cantidad)]))}
      <div class="reportes-desgloses-ingresos">
        ${renderEstimacion('Ingresos estimados por sucursal', 'Sucursal', ingresosEstimados.porSucursal)}
        ${renderEstimacion('Ingresos estimados por servicio', 'Servicio', ingresosEstimados.porServicio)}
      </div>
    </div>`;
}

export function renderTablaReporte(titulo, columnas, filas, clase = '', total = '') {
  return `<section class="superficie reportes-tabla ${clase}"><div class="encabezado-seccion"><h2>${titulo}</h2></div>${
    filas.length ? `<div class="table-responsive" tabindex="0" role="region" aria-label="${titulo}"><table class="tabla-app">
    <thead><tr>${columnas.map((columna) => `<th scope="col">${columna}</th>`).join('')}</tr></thead>
    <tbody>${filas.map((fila) => `<tr>${fila.map((celda) => `<td>${celda}</td>`).join('')}</tr>`).join('')}</tbody>
    ${total ? `<tfoot><tr><th colspan="${columnas.length}">${total}</th></tr></tfoot>` : ''}
    </table></div>` : `<p class="reportes-tabla-vacia">Sin registros.</p>${total ? `<p>${total}</p>` : ''}`}</section>`;
}
