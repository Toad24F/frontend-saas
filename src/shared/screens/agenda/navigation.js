import { currentTimePosition } from './utility.js';

let pending = null, previous = null, highlighted = null, pendingReturn = null;
let observedRoot, observer;
export function resetAgendaNavigation() { pending = previous = highlighted = pendingReturn = null; }
export const hasAgendaReturn = () => Boolean(previous);
export function renderAgendaPreserving(render) {
  const focused = document.activeElement;
  const name = focused?.name;
  const attribute = [...(focused?.attributes || [])].find((x) => x.name.startsWith('data-'));
  const form = document.querySelector('#m4-agenda-filters');
  const draft = form ? new FormData(form) : null;
  const scroll = scroller();
  const pageTop = window.scrollY;
  const position = scroll && { top: scroll.scrollTop, left: scroll.scrollLeft };
  render();
  const nextScroll = scroller();
  if (position && nextScroll) { nextScroll.scrollTop = position.top; nextScroll.scrollLeft = position.left; }
  window.scrollTo({ top: pageTop, behavior: 'instant' });
  const nextForm = document.querySelector('#m4-agenda-filters');
  for (const [key, value] of draft || []) if (nextForm?.elements[key]) nextForm.elements[key].value = value;
  const next = name ? document.getElementsByName(name)[0] : attribute ? [...document.querySelectorAll(`[${attribute.name}]`)].find((x) => x.getAttribute(attribute.name) === attribute.value) : null;
  next?.focus({ preventScroll: true });
}
const scroller = () => document.querySelector('.agenda-calendar .calendar-scroll');
export function handleAgendaNavigation(event, state, render) {
  const group = event.target.closest('[data-agenda-density]');
  if (group) {
    const scroll = scroller();
    previous = { date: state.date, top: scroll?.scrollTop || 0, left: scroll?.scrollLeft || 0, pageTop: window.scrollY, day: group.dataset.groupDay, ids: group.dataset.ids };
    pending = { ids: group.dataset.ids.split(',').map(Number), start: Number(group.dataset.start), day: group.dataset.groupDay };
    state.date = group.dataset.groupDay; state.calendarView = 'day'; render(); return true;
  }
  if (event.target.closest('[data-agenda-back]') && previous) {
    const saved = previous; previous = null; highlighted = null; pending = null; pendingReturn = saved;
    state.date = saved.date; state.calendarView = 'week'; render();
    return true;
  }
  // Una navegación explícita distinta cancela un salto pendiente de una respuesta remota.
  if (event.target.closest('[data-m4-view], [data-view], [data-m4-move], [data-action="previous"], [data-action="next"], [data-m4-today], [data-action="today"], [data-m4-date], [data-day]')) pending = highlighted = previous = null;
  return false;
}
export function applyAgendaEffects() {
  queueMicrotask(() => {
    const root = document.querySelector('.agenda-calendar');
    if (!root) return;
    if (root !== observedRoot && typeof ResizeObserver !== 'undefined') {
      observer?.disconnect(); observedRoot = root;
      const capacity = () => Math.max(1, Math.floor(((Math.max(1178, root.clientWidth) - 58) / 7) / 105));
      let previousCapacity = capacity();
      observer = new ResizeObserver(() => {
        if (!root.isConnected) { observer.disconnect(); return; }
        const next = capacity();
        if (next !== previousCapacity) { previousCapacity = next; window.dispatchEvent(new Event('agenda-layout-change')); }
      });
      observer.observe(root);
    }
    updateAgendaClock();
    if (pendingReturn && root.querySelector('.week-calendar:not(.single-day)')) {
      const saved = pendingReturn; pendingReturn = null;
      const scroll = scroller();
      if (scroll) { scroll.scrollTop = saved.top; scroll.scrollLeft = saved.left; }
      window.scrollTo({ top: saved.pageTop, behavior: 'instant' });
      const group = [...root.querySelectorAll('[data-agenda-density]')].find((x) => x.dataset.groupDay === saved.day && x.dataset.ids === saved.ids);
      (group || root.querySelector('[data-m4-view="week"], [data-view="week"]'))?.focus({ preventScroll: true });
    }
    const cards = [...root.querySelectorAll('.calendar-event[data-m4-appointment], .calendar-event[data-appointment]')];
    const id = (card) => Number(card.dataset.m4Appointment || card.dataset.appointment);
    if (pending && cards.length) {
      const selected = cards.filter((card) => pending.ids.includes(id(card)));
      if (selected.length) {
        const scroll = scroller();
        if (scroll) scroll.scrollLeft = 0;
        window.scrollTo({ top: window.scrollY + selected[0].getBoundingClientRect().top - 100, behavior: 'instant' });
        selected[0].focus({ preventScroll: true });
        const announcement = root.querySelector('[data-agenda-announcement]');
        if (announcement) announcement.textContent = `${selected.length} citas en el tramo seleccionado`;
        highlighted = { ids: pending.ids, until: Date.now() + 2200 }; pending = null;
      }
    }
    if (highlighted && highlighted.until > Date.now()) {
      for (const card of cards.filter((card) => highlighted.ids.includes(id(card)))) {
        card.classList.add('agenda-highlight');
        setTimeout(() => card.classList.remove('agenda-highlight'), highlighted.until - Date.now());
      }
    }
  });
}
export function updateAgendaClock() {
  for (const marker of document.querySelectorAll('[data-agenda-clock]')) {
    const minutes = currentTimePosition(marker.dataset.clockDay, [marker.dataset.zone]);
    const first = Number(marker.dataset.first), last = Number(marker.dataset.last);
    marker.hidden = minutes == null || minutes < first || minutes >= last;
    if (!marker.hidden) { marker.style.top = `${(minutes - first) / 60 * 96}px`; marker.setAttribute('aria-label', `Hora actual ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`); }
  }
}
if (typeof window !== 'undefined') {
  setInterval(updateAgendaClock, 60000);
  window.addEventListener('focus', updateAgendaClock);
}
