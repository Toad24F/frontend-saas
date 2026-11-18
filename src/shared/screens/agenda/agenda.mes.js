import { botonMenuEstado } from './agenda.menu-estado.js';
import { icon } from '../../icons.js';
import { escape as esc } from '../../ui.js';
import { periodoCalendario, sumarDiasCiviles } from '../../../connected/modules/agenda/agenda.calendario.js';
import { textoMotivoDisponibilidad } from '../disponibilidad/disponibilidad.contrato-operativo.js';
const etiquetaFecha = (valor, opciones) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', ...opciones }).format(new Date(valor + 'T12:00:00Z'));
const valorHistorico = (valor) => valor == null ? 'Sin registro histórico' : valor;
export function tituloCalendario(vista, valor) {
  if (vista === 'month') return etiquetaFecha(valor, { month: 'long', year: 'numeric' });
  if (vista === 'day') return etiquetaFecha(valor, { day: 'numeric', month: 'long', year: 'numeric' });
  const periodo = periodoCalendario(vista, valor);
  return `${etiquetaFecha(periodo.desde, { day: 'numeric' })} – ${etiquetaFecha(periodo.hasta, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

// El mes conserva la densidad de la demo. «Más» abre el día completo, sin perder citas del periodo recibido.
export function renderMes(valor, citas, hoy, opciones = {}) {
  const atributoDia = opciones.demo ? 'data-agenda-dia-demo' : 'data-agenda-fecha';
  const atributoElemento = opciones.demo ? 'data-cita' : 'data-agenda-cita';
  const { desde } = periodoCalendario('month', valor);
  return `<div class="mes-desplazamiento" tabindex="0" aria-label="Calendario mensual"><div class="calendario-mes">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia) => `<div class="mes-etiqueta">${dia}</div>`).join('')}${Array.from({ length: 42 }, (_, indice) => {
    const dia = sumarDiasCiviles(desde, indice), elementos = citas.filter((elemento) => elemento.fechaLocal === dia);
    return `<div class="mes-dia ${dia.slice(0, 7) !== valor.slice(0, 7) ? 'dia-atenuado' : ''} ${dia === hoy ? 'es-hoy' : ''}"><button class="mes-fecha" ${atributoDia}="${dia}" aria-label="Ver día ${dia}">${Number(dia.slice(-2))}</button>${elementos.slice(0, 3).map((elemento) => `<button class="mes-evento ${esc(elemento.estado)}" ${atributoElemento}="${elemento.id}" ${opciones.permitirCambiosEstado ? botonMenuEstado(elemento) : ""} title="${esc(`${valorHistorico(elemento.nombreContacto)} · ${elemento.zonaHoraria}${elemento.causas.length ? ` · ${elemento.causas.map((x) => textoMotivoDisponibilidad(x.codigo)).join(" · ")}` : ""}`)}"><span class="mes-etiqueta-evento">${esc(elemento.horaInicio.slice(0, 5))} ${esc(valorHistorico(elemento.nombreContacto))}</span>${elemento.causas.length ? `<span class="agenda-advertencia" aria-label="Cita afectada">${icon("info")}</span>` : ""}</button>`).join('')}${elementos.length > 3 ? `<button class="mes-mas" ${atributoDia}="${dia}">+${elementos.length - 3} citas más</button>` : ''}</div>`;
  }).join('')}</div></div>`;
}
