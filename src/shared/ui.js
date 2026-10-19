import { icon } from './icons.js';
import { statuses } from './data.js';
import { animateDialog, animateToast, animateToastOut } from './motion.js';
export const escape = (v = '') =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export const avatar = (initials, color = 'peach', cls = '') =>
  `<span class="avatar ${color} ${cls}">${escape(initials)}</span>`;
export const badge = (status) =>
  `<span class="status-badge ${status}"><span></span>${statuses[status]}</span>`;
export const empty = (title, detail, action = '') =>
  `<div class="empty-state">${icon('calendar')}<h3>${title}</h3><p>${detail}</p>${action}</div>`;
export function toast(message) {
  const el = document.createElement('div');
  el.className = 'app-toast glass-effect';
  el.textContent = message;
  document.querySelector('#toast-region').append(el);
  animateToast(el);
  setTimeout(async () => {
    await animateToastOut(el);
    el.remove();
  }, 4320);
}
let returnFocus;
export function modal(title, body, wide = false) {
  const el = document.querySelector('#app-dialog');
  returnFocus = document.activeElement;
  el.className = wide ? 'app-dialog glass-effect wide' : 'app-dialog glass-effect';
  el.innerHTML = `<header class="dialog-header"><div><span class="eyebrow">${document.documentElement.dataset.appMode === 'connected' ? 'MI NEGOCIO' : 'CLÍNICA · DEMOSTRACIÓN'}</span><h2 id="dialog-title">${title}</h2></div><button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></header>${body}`;
  if (!el.open) el.showModal();
  animateDialog(el);
  el.querySelector('[data-close]').onclick = () => el.close();
  el.onclose = () => returnFocus?.focus();
  el.onclick = (e) => {
    if (
      e.target === el &&
      (e.clientX < el.getBoundingClientRect().left ||
        e.clientX > el.getBoundingClientRect().right ||
        e.clientY < el.getBoundingClientRect().top ||
        e.clientY > el.getBoundingClientRect().bottom)
    )
      el.close();
  };
  return el;
}
export const pageHead = (title, description, actions = '') =>
  `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;
export const button = (text, action, ico = 'plus', cls = 'btn-primary') =>
  `<button class="btn ${cls}" data-action="${action}">${icon(ico)}${text}</button>`;
