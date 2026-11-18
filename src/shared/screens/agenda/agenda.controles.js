import { escape as esc } from '../../ui.js';
import { icon } from '../../icons.js';
import { leyendaAgenda } from './agenda.presentacion.js';
import { puedeVolverAgenda } from './agenda.navegacion.js';

export function resumenAgenda(elementos, ocupado = false) {
  if (ocupado) return '<div class="agenda-resumen" role="status">Cargando citas…</div>';
  if (!elementos) return '<div class="agenda-resumen">Resumen no disponible</div>';
  const pendiente = elementos.filter((x) => x.estado === 'pendiente').length;
  const afectadas = elementos.filter((x) => x.causas.length).length;
  return `<div class="agenda-resumen" aria-label="Resumen de resultados filtrados"><strong>${elementos.length} ${elementos.length === 1 ? 'cita' : 'citas'} en el periodo</strong><span>${pendiente} ${pendiente === 1 ? 'pendiente' : 'pendientes'}</span><span>${afectadas} con afectaciones</span></div>`;
}
export function barraAgenda(titulo, vista, { demo = false, refrescando: refrescando = false } = {}) {
  const attr = demo ? 'data-action' : 'data-agenda-mover';
  return `<div class="calendario-barra agenda-barra"><div class="calendario-fecha"><h2>${esc(titulo)}</h2><div class="flechas-fecha"><button class="icon-btn" ${attr}="${demo ? 'periodo-anterior' : '-1'}" aria-label="Periodo anterior">${icon('left')}</button><button class="icon-btn" ${attr}="${demo ? 'periodo-siguiente' : '1'}" aria-label="Periodo siguiente">${icon('chevron')}</button></div><button class="btn btn-hoy" ${demo ? 'data-action="agenda-hoy"' : 'data-agenda-hoy'}>Hoy</button></div>${leyendaAgenda()}<div class="agenda-acciones-vista"><button type="button" class="btn btn-light agenda-actualizar" ${demo ? 'data-agenda-demo-actualizar' : 'data-agenda-actualizar'} aria-label="Actualizar agenda" aria-busy="${refrescando}" ${refrescando ? 'disabled' : ''}>${icon('refresh')}<span>${refrescando ? 'Actualizando…' : 'Actualizar'}</span></button><div class="segmented" aria-label="Vista del calendario">${[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([valor, texto]) => `<button ${demo ? 'data-agenda-vista-demo' : 'data-agenda-vista'}="${valor}" aria-pressed="${vista === valor}" class="${vista === valor ? 'selected' : ''}">${texto}</button>`).join('')}</div></div></div>${puedeVolverAgenda() && vista === 'day' ? '<div class="agenda-retorno"><button class="btn btn-light" data-agenda-volver>← Volver a la semana</button></div>' : ''}`;
}
export const anuncioAgenda = '<span class="visually-hidden" role="status" aria-live="polite" data-agenda-anuncio></span>';
