import { api, loadBackendData } from '../../backend.js';
import { validateNewPassword } from '../../modules/auth/password-policy.js';
import { render } from '../../../shared/app.js';
import { field, basicForm, errorSlot } from '../../../shared/forms.js';
import { modal, toast } from '../../../shared/ui.js';
import { showProfessionalErrors, clearProfessionalErrors, clearProfessionalField } from '../../../shared/screens/profesionales/errors.js';
import { validateReceptionist, receptionistError } from './errors.js';

const markedField = (...args) => field(...args).replace('class="form-field"', `class="form-field" data-professional-field="${args[1]}"`);
const passwordFields = () => markedField('Contraseña', 'password', '', 'password', 'required minlength="12" autocomplete="new-password"');

function receptionistForm(title, content, onSubmit, reset = false) {
  const dialog = basicForm(title, content, onSubmit, false, {
    validate(form) {
      const errors = validateReceptionist(new FormData(form), reset);
      if (!Object.keys(errors).length) { clearProfessionalErrors(form); return true; }
      showProfessionalErrors(form, errors);
      return false;
    },
    onError(error, form) {
      const errors = receptionistError(error);
      if (errors) showProfessionalErrors(form, errors);
      else {
        const target = form.querySelector('#form-error');
        target.textContent = error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
        target.hidden = false;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.focus({ preventScroll: true });
      }
    },
  });
  const form = dialog.querySelector('#editor-form');
  form.addEventListener('input', (event) => clearProfessionalField(form, event.target));
  form.addEventListener('change', (event) => clearProfessionalField(form, event.target));
  return dialog;
}

export function newReceptionist() {
  receptionistForm('Nueva recepcionista', `${markedField('Nombre completo', 'name', '', 'text', 'required maxlength="150"')}${markedField('Correo', 'email', '', 'email', 'required maxlength="150" autocomplete="email"')}${passwordFields()}`, async (form) => {
    const password = form.get('password');
    validateNewPassword(password);
    await api('/recepcionistas', 'POST', { nombre: form.get('name').trim(), emailRecepcionista: form.get('email').trim(), password });
  });
}

export function receptionistAction(action, id) {
  if (action === 'reset') {
    receptionistForm('Restablecer contraseña', `${passwordFields()}<p class="form-intro">Se cerrarán las sesiones de esta recepcionista.</p>`, async (form) => {
      const password = form.get('password');
      validateNewPassword(password);
      await api(`/recepcionistas/${id}/restablecer-contrasena`, 'POST', { nuevaPassword: password });
    }, true);
    return;
  }
  if (!['deactivate', 'reactivate'].includes(action)) return;
  const activating = action === 'reactivate';
  const dialog = modal(activating ? 'Reactivar recepcionista' : 'Desactivar recepcionista', `<div class="dialog-body"><p>${activating ? 'Se habilitará de nuevo su cuenta. Tendrá que iniciar sesión.' : 'Se desactivará la cuenta y se cerrarán sus sesiones.'}</p>${errorSlot}</div><div class="dialog-footer"><button class="btn btn-light" data-dismiss>Cancelar</button><button class="btn ${activating ? 'btn-primary' : 'btn-danger-soft'}" data-confirm>${activating ? 'Reactivar' : 'Desactivar'}</button></div>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('[data-confirm]').onclick = async (event) => {
    const submit = event.currentTarget;
    submit.disabled = true;
    try {
      await api(`/recepcionistas/${id}/${activating ? 'reactivar' : 'desactivar'}`, 'POST', {});
      try { await loadBackendData(); }
      catch (error) { toast('Cambio guardado. No se pudo actualizar la lista: ' + error.message); }
      dialog.close();
      render();
      toast(activating ? 'Recepcionista reactivada.' : 'Recepcionista desactivada.');
    } catch (error) {
      const target = dialog.querySelector('#form-error');
      target.textContent = error.message;
      target.hidden = false;
      target.focus();
    } finally { submit.disabled = false; }
  };
}
