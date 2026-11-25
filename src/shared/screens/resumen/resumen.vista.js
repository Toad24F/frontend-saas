import { escaparHtml as esc, renderEncabezadoPagina, renderEtiquetaEstado, renderEstadoVacio } from '../../interfaz.componentes.js';
import { formatearFecha } from '../../aplicacion.datos.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { periodoCalendario, sumarDiasCiviles } from '../../../connected/modules/agenda/agenda.calendario.js';
import './resumen.estilos.css';

const estados = {
  pendiente: ['Por confirmar', '#e1bd6e'],
  confirmada: ['Confirmadas', '#82a6e1'],
  completada: ['Completadas', '#78b497'],
  cancelada: ['Canceladas', '#d49ca0'],
  no_asistio: ['No asistió', '#b5a4ca'],
};
const fechaCorta = (dia) => formatearFecha(dia, { day: 'numeric', month: 'short' });
const horaCorta = (hora) => hora.slice(0, 5);
const citaActiva = (cita) => cita.estado === 'pendiente' || cita.estado === 'confirmada';
const textoHistorico = (valor) => esc(valor || 'Sin registro histórico');
const compararCitas = (primera, segunda) => Date.parse(primera.inicioUtc) - Date.parse(segunda.inicioUtc) || primera.id - segunda.id;
const relleno = '<span class="esqueleto-relleno" aria-hidden="true"></span>';

function saludoResumen(nombre) {
  const hora = new Date().getHours();
  const saludo = hora < 5 || hora >= 19 ? 'Buenas noches' : hora < 12 ? 'Buenos días' : 'Buenas tardes';
  const primerNombre = nombre?.trim().split(/\s+/, 1)[0];
  return primerNombre ? `${saludo}, ${esc(primerNombre)}` : saludo;
}

function renderDona(citas, seleccionado, mensajeVacio) {
  if (!citas.length) return `<p class="resumen-sin-datos">${mensajeVacio}</p>`;
  let acumulo = 0;
  const porEstado = Object.entries(estados).map(([estado, [etiqueta, color]]) => {
    const cantidad = citas.filter((cita) => cita.estado === estado).length;
    const inicio = acumulo / citas.length;
    acumulo += cantidad;
    const fin = acumulo / citas.length;
    const colorSegmento = seleccionado && seleccionado !== estado
      ? `color-mix(in srgb, ${color} 38%, var(--superficie))`
      : color;
    return { estado, etiqueta, color, cantidad, fin, tramo: `${colorSegmento} ${inicio * 100}% ${fin * 100}%` };
  });
  const segmentos = porEstado.filter(({ cantidad }) => cantidad > 0);
  const fondo = `conic-gradient(${segmentos.map(({ tramo }) => tramo).join(',')})`;
  const referencias = segmentos.map(({ estado, fin }) => `<span data-resumen-segmento="${estado}" data-resumen-fin="${fin}" hidden></span>`).join('');
  const leyenda = porEstado.map(({ estado, etiqueta, color, cantidad }) => `<li>
    <button class="resumen-estado" type="button" data-resumen-estado="${estado}" aria-pressed="${seleccionado === estado}">
      <span class="resumen-muestra" style="background:${color}" aria-hidden="true"></span><span class="resumen-nombre-filtro">${etiqueta}</span><strong>${cantidad}</strong>
    </button></li>`).join('');
  return `<div class="resumen-estados">
    <div class="resumen-dona" data-resumen-dona style="--resumen-dona-fondo:${fondo}"><strong>${citas.length}</strong><span>${citas.length === 1 ? 'cita' : 'citas'}</span>${referencias}</div>
    <ul class="resumen-leyenda" aria-label="Citas por estado">${leyenda}</ul>
  </div>`;
}

function renderSemana(citas, hoy, fecha, desde) {
  const dias = Array.from({ length: 7 }, (_, indice) => sumarDiasCiviles(desde, indice));
  const totales = dias.map((dia) => citas.filter((cita) => cita.fechaLocal === dia).length);
  const maximo = Math.max(...totales);
  const minimo = Math.min(...totales.filter((cantidad) => cantidad > 0));
  const distinguirExtremos = minimo < maximo;
  const columnas = dias.map((dia, indice) => {
    const cantidad = totales[indice];
    const mayor = distinguirExtremos && cantidad === maximo;
    const menor = distinguirExtremos && cantidad === minimo;
    return `<li class="resumen-columna">
    <button class="resumen-dia" type="button" data-resumen-fecha="${dia}" aria-pressed="${dia === fecha}" ${dia === hoy ? 'aria-current="date"' : ''}>
      <span class="visually-hidden">${formatearFecha(dia, { weekday: 'long', day: 'numeric', month: 'long' })}, </span><strong>${cantidad}</strong><span class="visually-hidden"> ${cantidad === 1 ? 'cita' : 'citas'}</span>
      <span class="resumen-carril" aria-hidden="true"><span class="resumen-barra${mayor ? ' resumen-barra-mayor' : ''}${menor ? ' resumen-barra-menor' : ''}" style="height:${100 * cantidad / Math.max(1, maximo)}%"></span></span>
      <span class="resumen-nombre-filtro" aria-hidden="true">${formatearFecha(dia, { weekday: 'short' })}</span>
    </button>
  </li>`;
  }).join('');
  const leyenda = distinguirExtremos ? `<ul class="resumen-leyenda-semana" aria-label="Colores de la gráfica semanal">
    <li><span class="resumen-muestra resumen-barra-mayor" aria-hidden="true"></span>Más citas</li>
    <li><span class="resumen-muestra resumen-barra-menor" aria-hidden="true"></span>Menos citas</li>
  </ul>` : '';
  return `<ul class="resumen-grafica" aria-label="Citas por día de lunes a domingo">${columnas}</ul>${leyenda}`;
}

function renderProximas(citas, ahora, demo) {
  const futuras = citas.filter((cita) => citaActiva(cita) && Date.parse(cita.inicioUtc) >= ahora).sort(compararCitas);
  if (!futuras.length) return '';

  const primera = futuras[0];
  const inicio = Date.parse(primera.inicioUtc);
  const grupo = futuras.filter((cita) => Date.parse(cita.inicioUtc) === inicio);
  const hora = horaCorta(primera.horaInicio);
  const variasHorasLocales = grupo.some((cita) => horaCorta(cita.horaInicio) !== hora);
  const lista = grupo.map((cita) => `<li>
    <button type="button" class="resumen-proxima-cita" ${demo ? 'data-cita' : 'data-resumen-cita'}="${cita.id}"
      aria-label="Ver cita de ${esc(cita.nombreContacto || 'paciente')}">
      <span class="resumen-proxima-datos">
        <strong>${textoHistorico(cita.nombreContacto)}</strong>
        <span>${textoHistorico(cita.nombreServicio)}</span>
        <small>${textoHistorico(cita.nombreProfesional)}</small>
        <small>${textoHistorico(cita.nombreSucursal)}${variasHorasLocales && horaCorta(cita.horaInicio) !== hora ? ` · ${horaCorta(cita.horaInicio)} hora local` : ''}</small>
      </span>
      ${renderEtiquetaEstado(cita.estado)}
      <span class="resumen-proxima-flecha" aria-hidden="true">${renderIcono('chevron')}</span>
    </button>
  </li>`).join('');
  return `<section class="superficie resumen-proximas" aria-labelledby="resumen-proximas-titulo">
    <div class="encabezado-seccion"><h2 id="resumen-proximas-titulo">${grupo.length === 1 ? 'Próxima cita' : 'Próximas citas'}</h2></div>
    <div class="resumen-proximas-contenido">
      <div class="resumen-proximas-horario">
        <time datetime="${hora}">${hora}</time>
        ${variasHorasLocales ? `<span>Hora de ${esc(primera.nombreSucursal || primera.zonaHoraria)}</span>` : ''}
        ${grupo.length > 1 ? `<span>${grupo.length} citas a la misma hora</span>` : ''}
      </div>
      <ul class="resumen-proximas-lista" role="list">${lista}</ul>
    </div>
  </section>`;
}

function renderCitas(citas, demo, mensajeVacio, estado) {
  if (!citas.length) return estado
    ? renderEstadoVacio('Sin citas para este estado', 'Elige otro estado o quita el filtro para ver las citas del día.')
    : renderEstadoVacio(mensajeVacio, 'Las citas de esta fecha aparecerán aquí.');
  const ordenadas = [...citas].sort(compararCitas);
  const zonas = new Set(citas.map((cita) => cita.zonaHoraria));
  const variasZonas = zonas.size > 1;
  const filas = ordenadas.map((cita) => `<tr>
    <td><strong>${textoHistorico(cita.nombreContacto)}</strong></td>
    <td><strong>${textoHistorico(cita.nombreServicio)}</strong><small>${textoHistorico(cita.nombreProfesional)}</small></td>
    <td><strong>${horaCorta(cita.horaInicio)} – ${horaCorta(cita.horaFin)}</strong>${variasZonas ? `<small>${esc(cita.zonaHoraria)}</small>` : ''}</td>
    <td>${textoHistorico(cita.nombreSucursal)}</td><td>${renderEtiquetaEstado(cita.estado)}</td>
    <td><button type="button" class="boton-icono" ${demo ? 'data-cita' : 'data-resumen-cita'}="${cita.id}" aria-label="Ver cita de ${esc(cita.nombreContacto || 'paciente')}">${renderIcono('chevron')}</button></td>
  </tr>`).join('');
  return `<div class="table-responsive"><table class="table tabla-app align-middle">
    <thead><tr><th scope="col">Paciente</th><th scope="col">Servicio y profesional</th><th scope="col">Horario</th><th scope="col">Sucursal</th><th scope="col">Estado</th><th scope="col"><span class="visually-hidden">Acciones</span></th></tr></thead>
    <tbody>${filas}</tbody>
  </table></div>`;
}

export function renderResumen({ hoy, fecha = hoy, estado = '', ahora, nombre, descripcion = '', acciones, demo = false, citasDia, citasSemana, errorDia, errorSemana }) {
  const { desde, hasta } = periodoCalendario('week', hoy);
  const cargandoDia = !citasDia && !errorDia;
  const cargandoSemana = !citasSemana && !errorSemana;
  const citasVisibles = estado ? citasDia?.filter((cita) => cita.estado === estado) : citasDia;
  const proximas = cargandoDia ? `<div class="superficie resumen-proximas resumen-esqueleto" aria-hidden="true">
    <div class="resumen-proximas-carga">${relleno.repeat(2)}</div>
  </div>` : citasVisibles ? renderProximas(citasVisibles, ahora, demo) : '';
  const afectadas = citasVisibles?.filter((cita) => citaActiva(cita) && cita.causas.length).length;
  const referenciaDia = fecha === hoy ? 'de hoy' : `del ${formatearFecha(fecha, { weekday: 'long' })}`;
  const mensajeVacio = fecha === hoy ? 'Sin citas hoy' : 'Sin citas en este día';
  const estadoSeleccionado = estados[estado]?.[0];
  const error = (mensaje) => `<div class="resumen-error"><p role="alert">${esc(mensaje)}</p><button type="button" class="btn btn-light" data-resumen-reintentar>Reintentar consulta</button></div>`;
  const graficaDia = cargandoDia ? `<div class="resumen-estados resumen-esqueleto" aria-hidden="true"><div class="resumen-dona-esqueleto">${relleno}</div><div class="resumen-leyenda-esqueleto">${relleno.repeat(5)}</div></div>` : errorDia ? `<p class="resumen-sin-datos">Estados ${referenciaDia} no disponibles.</p>` : renderDona(citasDia, estado, mensajeVacio);
  const graficaSemana = cargandoSemana ? `<div class="resumen-grafica resumen-esqueleto" aria-hidden="true">${relleno.repeat(7)}</div>`
    : errorSemana && errorSemana === errorDia ? '<p class="resumen-sin-datos">Semana no disponible.</p>'
    : errorSemana ? error(errorSemana) : renderSemana(citasSemana, hoy, fecha, desde);
  const lista = cargandoDia ? `<div class="resumen-lista-esqueleto resumen-esqueleto" aria-hidden="true">${relleno.repeat(3)}</div>` : errorDia ? error(errorDia) : renderCitas(citasVisibles, demo, mensajeVacio, citasDia.length > 0 && estado);
  const avisoAfectadas = afectadas ? `<span class="resumen-afectadas">${renderIcono('info')} ${afectadas} ${afectadas === 1 ? 'cita afectada' : 'citas afectadas'}</span>` : '';
  const quitarFiltro = estadoSeleccionado ? '<button class="btn btn-light" type="button" data-resumen-limpiar>Quitar filtro de estado</button>' : '';
  return `${renderEncabezadoPagina(saludoResumen(nombre), descripcion, acciones)}
  ${proximas}
  <div class="resumen-cuadricula">
    <section class="superficie" aria-labelledby="resumen-estados-titulo" aria-busy="${cargandoDia}">
      <div class="encabezado-seccion"><div><h2 id="resumen-estados-titulo">Estados ${referenciaDia}</h2><p>${fechaCorta(fecha)}</p></div></div>
      ${graficaDia}
    </section>
    <section class="superficie resumen-semana" aria-labelledby="resumen-semana-titulo" aria-busy="${cargandoSemana}">
      <div class="encabezado-seccion"><div><h2 id="resumen-semana-titulo">Esta semana</h2><p>${fechaCorta(desde)} – ${fechaCorta(hasta)}</p></div></div>
      ${graficaSemana}
    </section>
  </div>
  <section class="superficie resumen-citas-hoy" aria-labelledby="resumen-citas-titulo" aria-busy="${cargandoDia}">
    <div class="encabezado-seccion resumen-cabecera-citas"><div><h2 id="resumen-citas-titulo" tabindex="-1">Citas ${referenciaDia}${estadoSeleccionado ? ` · ${estadoSeleccionado}` : ''}</h2><p>${formatearFecha(fecha, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>${avisoAfectadas || quitarFiltro ? `<div class="resumen-controles-citas">${avisoAfectadas}${quitarFiltro}</div>` : ''}</div>
    ${lista}
  </section>
  ${cargandoDia || cargandoSemana ? '<p class="visually-hidden" role="status">Cargando resumen de citas…</p>' : ''}`;
}
