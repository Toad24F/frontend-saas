import { escaparHtml as esc, renderEtiquetaEstado } from '../../interfaz.componentes.js';
import { renderIcono } from '../../iconos.catalogo.js';
import { panelAgenda } from './agenda.paneles.js';
import { distribuirEventos } from './agenda.presentacion.js';
import { horaAMinutos } from './agenda.utilidades.js';

export function agruparCanceladas(elementos) {
  const porHorario = new Map();
  for (const cita of elementos) {
    if (cita.estado !== 'cancelada') continue;
    const clave = `${cita.day}-${cita.personalId}-${cita.fechaLocal}-${horaAMinutos(cita.horaInicio)}`;
    if (!porHorario.has(clave)) porHorario.set(clave, []);
    porHorario.get(clave).push(cita);
  }
  const grupos = [], agrupadas = new Set();
  for (const [clave, citas] of porHorario) {
    if (citas.length < 2) continue;
    for (const cita of citas) agrupadas.add(cita.id);
    const [primera] = citas;
    const ultima = citas.reduce((mayor, cita) => horaAMinutos(cita.end) > horaAMinutos(mayor.end) ? cita : mayor);
    grupos.push({ id: -primera.id, clave, start: primera.start, end: ultima.end, citas });
  }
  return [...elementos.filter((elemento) => !agrupadas.has(elemento.id)), ...grupos];
}

export function distribuirDia(elementos, primerMinuto, altoHora) {
  if (!elementos.some((elemento) => elemento.citas)) return distribuirEventos(elementos, primerMinuto, altoHora);

  // Reservar un lateral solo dentro de los intervalos que se empalman con un grupo.
  const posiciones = new Map();
  let tramo = [], finTramo = 0;
  const distribuirTramo = () => {
    const tarjetas = tramo.filter((elemento) => !elemento.citas);
    const grupos = tramo.filter((elemento) => elemento.citas);
    const anchoTarjetas = grupos.length ? 66 : 100;
    const inicioGrupos = tarjetas.length ? anchoTarjetas : 0;
    const anchoGrupos = tarjetas.length || grupos.length === 1 ? 34 : 100;
    for (const [id, posicion] of distribuirEventos(tarjetas, primerMinuto, altoHora)) {
      posiciones.set(id, { ...posicion, left: posicion.left * anchoTarjetas / 100, width: posicion.width * anchoTarjetas / 100 });
    }
    for (const [id, posicion] of distribuirEventos(grupos, primerMinuto, altoHora)) {
      posiciones.set(id, { ...posicion, left: inicioGrupos + posicion.left * anchoGrupos / 100, width: posicion.width * anchoGrupos / 100 });
    }
  };
  for (const elemento of [...elementos].sort((primero, segundo) => horaAMinutos(primero.start) - horaAMinutos(segundo.start))) {
    const inicio = horaAMinutos(elemento.start);
    if (tramo.length && inicio >= finTramo) {
      distribuirTramo();
      tramo = [];
    }
    finTramo = tramo.length ? Math.max(finTramo, horaAMinutos(elemento.end)) : horaAMinutos(elemento.end);
    tramo.push(elemento);
  }
  distribuirTramo();
  return posiciones;
}

const horario = (elemento) => `${elemento.start.slice(0, 5)}–${elemento.end.slice(0, 5)}`;

export function renderGrupoCanceladas(grupo, { top: superior, height: alto, left: izquierda, width: ancho }) {
  const texto = `${grupo.citas.length} citas canceladas`;
  const profesional = grupo.citas[0].nombreProfesional || 'Sin registro histórico';
  const variaciones = grupo.citas.some((cita) => horario(cita) !== horario(grupo));
  const filas = grupo.citas.map((cita) => `<li>
    <button type="button" class="agenda-canceladas-detalle" data-agenda-cancelada-detalle="${cita.id}">
      <span><strong>${esc(cita.nombreContacto || 'Sin registro histórico')}</strong><small>${esc(cita.nombreServicio || 'Sin registro histórico')}${variaciones ? ` · ${esc(horario(cita))}` : ''}</small></span>
      ${renderEtiquetaEstado('cancelada')}${renderIcono('chevron')}
    </button>
  </li>`).join('');
  return `<button type="button" class="agenda-densidad agenda-grupo-canceladas" data-agenda-canceladas="${esc(grupo.clave)}"
    data-agenda-canceladas-ids="${grupo.citas.map((cita) => cita.id).join(',')}" aria-haspopup="dialog"
    aria-label="Ver ${texto} de ${esc(profesional)}, ${esc(horario(grupo))}" title="${texto} · ${esc(horario(grupo))}"
    style="top:${superior}px;height:${alto}px;left:calc(${izquierda}% + 5px);width:calc(${ancho}% - 10px)">
    <span>${esc(horario(grupo))}</span><strong>${texto}</strong><span class="abrir-tramo" aria-hidden="true">${renderIcono('chevron')}</span>
  </button><template><div class="dialogo-cuerpo agenda-canceladas-cuerpo">
    <p>${esc(horario(grupo))} · ${esc(profesional)}</p><ul role="list">${filas}</ul>
  </div></template>`;
}

export function handleClicGrupoCanceladas(evento, abrirDetalle) {
  const origen = evento.target.closest('[data-agenda-canceladas]');
  if (!origen) return false;

  const panel = panelAgenda('Citas canceladas', origen.nextElementSibling.innerHTML, false);
  panel.classList.add('agenda-panel-canceladas');
  const clave = origen.dataset.agendaCanceladas;
  panel.onclose = () => {
    const control = origen.isConnected ? origen : document.querySelector(`[data-agenda-canceladas="${CSS.escape(clave)}"]`);
    (control || document.querySelector('[data-agenda-hoy], [data-action="agenda-hoy"]'))?.focus();
  };
  panel.querySelector('[data-close]').focus();
  for (const boton of panel.querySelectorAll('[data-agenda-cancelada-detalle]')) {
    boton.onclick = () => {
      panel.addEventListener('close', () => abrirDetalle(Number(boton.dataset.agendaCanceladaDetalle)), { once: true });
      panel.close();
    };
  }
  return true;
}
