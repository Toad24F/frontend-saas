import { botonMenuEstado } from './agenda.menu-estado.js';
import { icon } from '../../icons.js';
import { escape as esc } from '../../ui.js';
import { statuses } from '../../data.js';
import { distribuirEventos } from './agenda.presentacion.js';
import { huecosAtencion, motivoFaltaAtencion, gruposDensos, minutosAHora, horaAMinutos } from './agenda.utilidades.js';
import { textoMotivoDisponibilidad } from '../disponibilidad/disponibilidad.contrato-operativo.js';

const etiquetaFecha = (dia) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short' }).format(new Date(`${dia}T12:00:00Z`));
const valorHistorico = (valor) => valor == null ? 'Sin registro histórico' : valor;
export function segmentosLineaTiempo(citas, dias) {
  return dias.flatMap((dia) => citas.filter((elemento) => elemento.fechaLocal <= dia && elemento.fechaFinLocal >= dia).flatMap((elemento) => {
    const inicio = dia === elemento.fechaLocal ? elemento.horaInicio : '00:00';
    const fin = dia === elemento.fechaFinLocal ? elemento.horaFin : '24:00';
    return horaAMinutos(fin) <= horaAMinutos(inicio) ? [] : [{ ...elemento, day: dia, start: inicio, end: fin }];
  }));
}
export function rangoLineaTiempo(segmentos) {
  return { primeraHora: Math.min(9, ...segmentos.map((elemento) => Math.floor(horaAMinutos(elemento.start) / 60))),
    ultimaHora: Math.max(18, ...segmentos.map((elemento) => Math.ceil(horaAMinutos(elemento.end) / 60))) };
}

// Presentación común; cada modo proporciona exclusivamente sus datos y acciones autorizadas.
export function renderLineaTiempo(dias, citas, hoy, opciones = {}) {
  const segmentos = segmentosLineaTiempo(citas, dias);
  const { primeraHora, ultimaHora } = rangoLineaTiempo(segmentos), horas = ultimaHora - primeraHora;
  const unico = dias.length === 1;
  const atributoDia = opciones.demo ? 'data-agenda-dia-demo' : 'data-agenda-fecha';
  const atributoElemento = opciones.demo ? 'data-cita' : 'data-agenda-cita';
  const zonas = [...new Set(opciones.zonas || citas.map((x) => x.zonaHoraria))];
  const equipo = !unico ? opciones.atencionEquipo : null;
  const avisoEquipo = equipo?.busy ? 'Consultando atención del equipo…' : equipo?.error;
  const porProfesional = unico && opciones.profesional === 'all';
  const personas = new Map((opciones.profesionales || []).filter((p) => p.active !== false && (opciones.sucursal === 'all' || !Array.isArray(p.branchIds) || p.branchIds.includes(Number(opciones.sucursal)))).map((p) => [p.id, p.name]));
  // Las citas históricas siguen visibles aunque el profesional ya no figure en el catálogo.
  for (const elemento of segmentos) personas.set(elemento.personalId, personas.get(elemento.personalId) || valorHistorico(elemento.nombreProfesional));
  const conteos = new Map();
  for (const elemento of segmentos) conteos.set(elemento.personalId, (conteos.get(elemento.personalId) || 0) + 1);
  const encabezados = porProfesional && personas.size ? [...personas].sort((a, b) => (conteos.get(b[0]) || 0) - (conteos.get(a[0]) || 0) || a[1].localeCompare(b[1], 'es') || a[0] - b[0]).map(([persona, nombre]) => ({ day: dias[0], person: persona, name: nombre })) : dias.map((dia) => ({ day: dia }));
  const mostrarProfesional = !unico && opciones.profesional === 'all';
  const mostrarSucursal = opciones.sucursal === 'all';
  const distribuciones = encabezados.map((tituloColumna) => {
    const elementos = segmentos.filter((elemento) => elemento.day === tituloColumna.day && (tituloColumna.person == null || elemento.personalId === tituloColumna.person));
    const grupos = unico ? [] : gruposDensos(elementos, opciones.anchoColumna || 160);
    const agrupado = new Set(grupos.flatMap((g) => g.ids));
    const base = distribuirEventos(elementos, primeraHora * 60, 96);
    const carriles = Math.max(1, ...[...base.values()].map((x) => Math.round(100 / x.baseWidth)));
    return { ...tituloColumna, items: elementos, groups: grupos, grouped: agrupado, lanes: carriles, base };
  });
  const totalCarriles = distribuciones.reduce((suma, x) => suma + x.lanes, 0);
  const minimoAncho = porProfesional ? `calc(58px + ${distribuciones.length} * var(--agenda-ancho-columna-profesional, 260px))` : `${unico ? 58 + totalCarriles * 260 : 1178}px`;
  // Estimación conservadora de líneas con la tipografía de 13px; el navegador verifica
  // la altura real tras renderizar y puede aumentar uniformemente la escala si hace falta.
  const altoNecesario = (elemento, ancho) => {
    const caracteres = Math.max(8, Math.floor((ancho - 30) / 8));
    const lineas = (texto) => Math.max(1, Math.ceil(String(valorHistorico(texto)).length / caracteres));
    return 44 + 18 * (lineas(elemento.nombreContacto) + lineas(elemento.nombreServicio) + (mostrarProfesional ? lineas(elemento.nombreProfesional) : 0) + (mostrarSucursal ? lineas(elemento.nombreSucursal) : 0)) + (elemento.causas.length ? 18 : 0);
  };
  let altoHora = 96;
  for (const distribucion of distribuciones) {
    for (const elemento of distribucion.items.filter((x) => !distribucion.grouped.has(x.id))) {
      const ancho = unico ? 260 : (opciones.anchoColumna || 160) * distribucion.base.get(elemento.id).width / 100;
      altoHora = Math.max(altoHora, (altoNecesario(elemento, ancho) + 4) * 60 / (horaAMinutos(elemento.end) - horaAMinutos(elemento.start)));
    }
    for (const grupo of distribucion.groups) altoHora = Math.max(altoHora, 92 * 60 / (grupo.end - grupo.start));
  }
  altoHora = Math.ceil(altoHora);
  for (const distribucion of distribuciones) distribucion.columns = distribuirEventos(distribucion.items, primeraHora * 60, altoHora);
  const carriles = Math.max(1, ...distribuciones.map((x) => x.lanes));
  const cuadricula = porProfesional ? `repeat(${distribuciones.length},minmax(0,1fr))` : unico ? distribuciones.map((x) => x.lanes + 'fr').join(' ') : 'repeat(7,minmax(0,1fr))';
  return `${avisoEquipo ? `<p class="agenda-aviso-atencion" role="status">${esc(avisoEquipo)}</p>` : ''}${!unico ? '<p class="calendario-aviso-desplazamiento">Los tramos agrupados abren el día completo. Desplázate para ver todos los días.</p>' : (carriles > 1 || porProfesional) ? '<p class="calendario-aviso-desplazamiento">Desplázate horizontalmente para ver los profesionales y sus citas.</p>' : ''}<div class="calendario-desplazamiento" tabindex="0" aria-label="Calendario de citas por horas"><div class="calendario-semana ${unico ? 'dia-unico' : ''} ${porProfesional ? 'por-profesional' : ''} ${mostrarSucursal ? 'todas-sucursales' : ''}" data-primera-hora="${primeraHora}" style="--dias:${distribuciones.length};--agenda-columnas:${cuadricula};--alto-hora:${altoHora}px;min-width:${minimoAncho}"><div class="semana-encabezado"><span class="encabezado-hora">Hora local</span>${distribuciones.map(({ day: dia, items: elementos, person: persona, name: nombre }) => `<button class="encabezado-dia ${dia === hoy ? 'es-hoy' : ''}" ${atributoDia}="${dia}"><span>${esc(etiquetaFecha(dia).replace('.', ''))}</span><strong>${Number(dia.slice(-2))}</strong>${persona != null ? `<b class="titulo-profesional">${esc(nombre)}</b>` : ''}<small>${elementos.length} ${elementos.length === 1 ? 'cita' : 'citas'}</small></button>`).join('')}</div><div class="semana-cuerpo" style="height:${horas * altoHora}px"><div class="columna-horas">${Array.from({ length: horas + 1 }, (_, indice) => `<span style="top:${indice * altoHora}px">${String(primeraHora + indice).padStart(2, '0')}:00</span>`).join('')}</div>${distribuciones.map(({ day: dia, items: elementos, columns: columnas, groups: grupos, grouped: agrupado, person: persona }) => {
    const modelo = persona != null ? opciones.atencionPorProfesional?.[persona] : equipo;
    const datos = modelo ? modelo.data : opciones.atencion;
    const avisoAtencion = equipo ? motivoFaltaAtencion(datos, dia, opciones.sucursal) : modelo?.busy ? 'Consultando atención…' : modelo?.error || motivoFaltaAtencion(datos, dia, opciones.sucursal);
    const huecos = huecosAtencion(datos, dia, opciones.sucursal, primeraHora * 60, ultimaHora * 60);
    const etiquetaHueco = equipo ? (opciones.sucursal === 'all' ? 'Sin atención de ningún profesional en ninguna sucursal' : 'Sin atención de ningún profesional') : opciones.sucursal === 'all' ? 'Sin atención en ninguna sucursal' : 'Sin atención';
    return `<div class="columna-dia ${dia === hoy ? 'es-hoy' : ''}" data-calendario-fecha="${dia}" ${persona != null ? `data-calendario-profesional="${persona}"` : ''}>${avisoAtencion ? `<span class="agenda-atencion-columna" role="status">${esc(avisoAtencion)}</span>` : ''}${Array.from({ length: horas }, (_, indice) => opciones.demo ? `<button class="calendario-celda" data-horario-fecha="${dia}" data-horario-hora="${minutosAHora((primeraHora + indice) * 60)}" aria-label="Nueva cita el ${dia} a las ${minutosAHora((primeraHora + indice) * 60)}"></button>` : '<div class="calendario-celda" aria-hidden="true"></div>').join('')}${huecos.map(({ start: inicio, end: fin }) => `<div class="agenda-sin-atencion" style="top:${(inicio / 60 - primeraHora) * altoHora}px;height:${(fin - inicio) / 60 * altoHora}px" title="${etiquetaHueco} · ${minutosAHora(inicio)}–${minutosAHora(fin)}"><span>${etiquetaHueco}</span></div>`).join('')}${elementos.filter((x) => !agrupado.has(x.id)).map((elemento) => {
      const inicio = horaAMinutos(elemento.start), fin = horaAMinutos(elemento.end), { top: superior, height: alto, left: izquierda, width: ancho } = columnas.get(elemento.id);
      const causas = elemento.causas.map((causa) => textoMotivoDisponibilidad(causa.codigo)).join(' · ');
      const etiqueta = `${valorHistorico(elemento.nombreContacto)}, ${elemento.start.slice(0, 5)} a ${elemento.end.slice(0, 5)}, ${valorHistorico(elemento.nombreServicio)}, ${valorHistorico(elemento.nombreProfesional)}, ${valorHistorico(elemento.nombreSucursal)}, ${statuses[elemento.estado]}, ${elemento.zonaHoraria}${causas ? ` · ${causas}` : ''}`;
      return `<button class="calendario-evento ${esc(elemento.estado)} ${fin - inicio <= 30 ? 'evento-corto' : ''}" ${atributoElemento}="${elemento.id}" ${opciones.permitirCambiosEstado ? botonMenuEstado(elemento) : ""} style="top:${superior}px;height:${alto}px;left:calc(${izquierda}% + 5px);width:calc(${ancho}% - 10px)" aria-label="${esc(etiqueta)}" title="${esc(etiqueta)}"><span class="evento-hora"><span>${esc(elemento.start.slice(0, 5))}<span class="evento-fin-rango"> – ${esc(elemento.end.slice(0, 5))}</span></span>${causas ? `<span class="agenda-advertencia" aria-label="Cita afectada">${icon('info')}</span>` : elemento.estado === 'completada' ? icon('check') : ''}</span><strong class="evento-cliente">${esc(valorHistorico(elemento.nombreContacto))}</strong><span class="evento-servicio">${esc(valorHistorico(elemento.nombreServicio))}</span>${mostrarProfesional ? `<span class="evento-profesional">${esc(valorHistorico(elemento.nombreProfesional))}</span>` : ''}${mostrarSucursal ? `<span class="evento-sucursal">${esc(valorHistorico(elemento.nombreSucursal))}</span>` : ''}${causas && alto >= 80 ? `<span class="evento-causa">${esc(textoMotivoDisponibilidad(elemento.causas[0].codigo))}</span>` : ''}</button>`;
    }).join('')}${grupos.map((grupo) => {
      const afectadas = elementos.filter((x) => grupo.ids.includes(x.id) && x.causas.length).length;
      return `<button class="agenda-densidad" data-agenda-densidad data-grupo-dia="${dia}" data-grupo-inicio="${grupo.start}" data-ids="${grupo.ids.join(',')}" style="top:${(grupo.start / 60 - primeraHora) * altoHora + 2}px;height:${Math.max(44, (grupo.end - grupo.start) / 60 * altoHora - 4)}px" aria-label="Ver ${grupo.ids.length} citas del ${dia}, ${minutosAHora(grupo.start)} a ${minutosAHora(grupo.end)}${afectadas ? `, ${afectadas} con afectaciones` : ''}"><span>${minutosAHora(grupo.start)}–${minutosAHora(grupo.end)}</span><strong>${grupo.ids.length} citas</strong>${afectadas ? `<small>${icon('info')}${afectadas} con afectaciones</small>` : ''}<span class="abrir-tramo">Ver día ${icon('chevron')}</span></button>`;
    }).join('')}${zonas.length === 1 ? `<div class="hora-actual" data-agenda-reloj data-reloj-dia="${dia}" data-reloj-zona="${esc(zonas[0])}" data-alto-hora="${altoHora}" data-reloj-primero="${primeraHora * 60}" data-reloj-ultimo="${ultimaHora * 60}" hidden><i></i></div>` : ''}${!elementos.length && !huecos.length ? '<span class="dia-sin-atencion">Sin citas</span>' : ''}</div>`;
  }).join('')}</div></div></div>`;
}
