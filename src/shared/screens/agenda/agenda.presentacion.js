import { renderIcono } from '../../iconos.catalogo.js';
import { escaparHtml as esc } from '../../interfaz.componentes.js';
import { etiquetasEstadoCita } from '../../aplicacion.datos.js';
import { columnasCalendario } from '../../calendario.distribucion.js';

// Componentes de presentación compartidos: demo y conectado conservan los mismos estados y jerarquía.
export function leyendaAgenda() {
  return `<div class="leyenda agenda-leyenda" role="list" aria-label="Estados de las citas">${Object.entries(etiquetasEstadoCita).map(([estadoActual, etiqueta]) => `<span role="listitem"><i class="legend-dot ${estadoActual}" aria-hidden="true"></i>${etiqueta}</span>`).join('')}</div>`;
}
export function metricasAgenda(citas, dia, { loading: cargando = citas == null } = {}) {
  const elementos = citas?.filter((elemento) => elemento.date === dia);
  const cantidad = (estadoActual) => elementos == null ? null : estadoActual ? elementos.filter((elemento) => elemento.status === estadoActual).length : elementos.length;
  return `<div class="cuadricula-indicadores agenda-metricas" aria-label="Resumen del día ${esc(dia)}" aria-busy="${cargando}">${cargando ? '<span class="visually-hidden" role="status">Cargando resumen del día…</span>' : ''}${[
    [cantidad(), 'Citas del día', 'calendar', 'naranja'], [cantidad('confirmada'), 'Confirmadas', 'circleCheck', 'azul'],
    [cantidad('pendiente'), 'Por confirmar', 'clock', 'ambar'], [cantidad('completada'), 'Completadas', 'check', 'verde'],
  ].map(([numero, etiqueta, imagen, color]) => `<div class="tarjeta-indicador"><div class="indicador-cabecera"><span>${etiqueta}</span><span class="indicador-icono ${color}">${renderIcono(imagen)}</span></div><div class="indicador-valor">${numero == null ? cargando ? '<span class="esqueleto-relleno esqueleto-numero" aria-hidden="true"></span>' : '<span class="metrica-no-disponible">Sin datos</span>' : String(numero).padStart(2, '0')}</div></div>`).join('')}</div>`;
}
export function esqueletoCalendario(vista) {
  const mes = vista === 'month', dias = vista === 'day' ? 1 : 7;
  const contenido = mes
    ? `<div class="esqueleto-mes">${Array.from({ length: 7 }, () => '<div class="esqueleto-etiqueta-mes"><span class="esqueleto-relleno"></span></div>').join('')}${Array.from({ length: 42 }, () => '<div class="esqueleto-celda-mes"><span class="esqueleto-relleno"></span></div>').join('')}</div>`
    : `<div class="calendario-semana ${dias === 1 ? 'dia-unico' : ''}"><div class="esqueleto-encabezado-semana" style="--dias-esqueleto:${dias}"><span></span>${Array.from({ length: dias }, () => '<span><i class="esqueleto-relleno"></i></span>').join('')}</div><div class="esqueleto-cuerpo-semana" style="--dias-esqueleto:${dias}"><span></span>${Array.from({ length: dias }, () => '<span></span>').join('')}</div></div>`;
  // Ningún placeholder tiene estado, paciente ni acción de cita; solo comunica carga sin datos ficticios.
  return `<div data-agenda-esqueleto class="agenda-skeleton" aria-busy="true"><span class="visually-hidden" role="status">Cargando citas…</span><div class="${mes ? 'mes-desplazamiento' : 'calendario-desplazamiento'}" aria-hidden="true">${contenido}</div></div>`;
}
const horaAMinutos = (valor) => Number(valor.slice(0, 2)) * 60 + Number(valor.slice(3, 5)) + Number(valor.slice(6, 8) || 0) / 60;
const reloj = (valor) => {
  const segundos = Math.round(valor * 60);
  return `${String(Math.floor(segundos / 3600)).padStart(2, '0')}:${String(Math.floor(segundos % 3600 / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
};
export function distribuirEventos(elementos, primerMinuto = 540, altoHora = 96) {
  // Solo los intervalos reales generan columnas; la escala global garantiza legibilidad.
  const hueco = 4;
  const huellas = elementos.map((elemento) => ({ ...elemento, start: reloj(horaAMinutos(elemento.start)), end: reloj(horaAMinutos(elemento.end)) }));
  const columnas = columnasCalendario(huellas);
  return new Map(elementos.map((elemento) => {
    const { carril, ancho } = columnas.get(elemento.id);
    const huella = huellas.find((x) => x.id === elemento.id);
    let extension = 1;
    for (let siguiente = carril + 1; siguiente < Math.round(100 / ancho); siguiente++) {
      if (huellas.some((otro) => columnas.get(otro.id).carril === siguiente && otro.start < huella.end && otro.end > huella.start)) break;
      extension++;
    }
    return [elemento.id, { top: (horaAMinutos(elemento.start) - primerMinuto) / 60 * altoHora + hueco / 2,
      height: Math.max(0, (horaAMinutos(elemento.end) - horaAMinutos(elemento.start)) / 60 * altoHora - hueco), left: carril * ancho, width: ancho * extension, baseWidth: ancho }];
  }));
}
