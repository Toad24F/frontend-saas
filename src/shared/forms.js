import { isDemo, loadBackendData } from '../connected/backend.js';
import { render } from './app.js';
import { icon } from './icons.js';
import { modal, toast, escape as esc } from './ui.js';
export const field = (label, name, value = '', type = 'text', extra = '') =>
  `<div class="form-field"><label class="form-label" for="f-${name}">${label}</label><input class="form-control" id="f-${name}" name="${name}" value="${esc(value)}" type="${type}" ${extra}/></div>`;
export const select = (label, name, items, selected = '') =>
  `<div class="form-field"><label class="form-label" for="f-${name}">${label}</label><select class="form-select" id="f-${name}" name="${name}" required>${items.map((x) => `<option value="${x.id}" ${String(x.id) === String(selected) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`;
export const formError = (error) => {
  const target = document.querySelector('#form-error');
  if (target) {
    target.textContent = error.message;
    target.hidden = false;
    target.focus();
  } else toast(error.message);
};
export const errorSlot =
  '<p id="form-error" class="form-error" role="alert" tabindex="-1" hidden></p>';
export function basicForm(title, content, onSubmit, wide = false) {
  const el = modal(
    title,
    `<form id="editor-form"><div class="dialog-body">${content}${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="submit" class="btn btn-primary">${icon('check')}Guardar</button></div></form>`,
    wide,
  );
  el.querySelector('[data-dismiss]').onclick = () => el.close();
  el.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.target.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await onSubmit(new FormData(e.target));
      el.close();
      render();
      if (!isDemo) {
        try { await loadBackendData(); render(); } catch (error) { toast('Guardado completado. No se pudo actualizar la vista: ' + error.message); return; }
      }
      toast(isDemo ? 'Cambios guardados en esta demostración.' : 'Cambios guardados.');
    } catch (error) {
      formError(error);
    } finally { submit.disabled = false; }
  };
  return el;
}
