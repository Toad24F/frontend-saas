import { escape as esc } from '../../ui.js';
import { icon } from '../../icons.js';
import { agendaLegend } from './presentation.js';
import { hasAgendaReturn } from './navigation.js';

export function agendaSummary(items, busy = false) {
  if (busy) return '<div class="agenda-summary" role="status">Cargando citas…</div>';
  if (!items) return '<div class="agenda-summary">Resumen no disponible</div>';
  const pending = items.filter((x) => x.estado === 'pendiente').length;
  const affected = items.filter((x) => x.causas.length).length;
  return `<div class="agenda-summary" aria-label="Resumen de resultados filtrados"><strong>${items.length} ${items.length === 1 ? 'cita' : 'citas'} en el periodo</strong><span>${pending} ${pending === 1 ? 'pendiente' : 'pendientes'}</span><span>${affected} con afectaciones</span></div>`;
}
export function agendaToolbar(title, view, { demo = false, refreshing = false } = {}) {
  const attr = demo ? 'data-action' : 'data-m4-move';
  return `<div class="calendar-toolbar agenda-toolbar"><div class="calendar-date"><h2>${esc(title)}</h2><div class="date-arrows"><button class="icon-btn" ${attr}="${demo ? 'previous' : '-1'}" aria-label="Periodo anterior">${icon('left')}</button><button class="icon-btn" ${attr}="${demo ? 'next' : '1'}" aria-label="Periodo siguiente">${icon('chevron')}</button></div><button class="btn btn-today" ${demo ? 'data-action="today"' : 'data-m4-today'}>Hoy</button></div>${agendaLegend()}<div class="agenda-view-actions"><button type="button" class="btn btn-light agenda-refresh" ${demo ? 'data-agenda-demo-refresh' : 'data-m4-refresh'} aria-label="Actualizar agenda" aria-busy="${refreshing}" ${refreshing ? 'disabled' : ''}>${icon('refresh')}<span>${refreshing ? 'Actualizando…' : 'Actualizar'}</span></button><div class="segmented" aria-label="Vista del calendario">${[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([value, text]) => `<button ${demo ? 'data-view' : 'data-m4-view'}="${value}" aria-pressed="${view === value}" class="${view === value ? 'selected' : ''}">${text}</button>`).join('')}</div></div></div>${hasAgendaReturn() && view === 'day' ? '<div class="agenda-return"><button class="btn btn-light" data-agenda-back>← Volver a la semana</button></div>' : ''}`;
}
export const agendaAnnouncement = '<span class="visually-hidden" role="status" aria-live="polite" data-agenda-announcement></span>';
