import { api, forgetSession, logout } from '../../backend.js';
import { validateNewPassword } from '../../modules/auth/password-policy.js';
import { field, errorSlot } from '../../../shared/forms.js';
import { modal, toast } from '../../../shared/ui.js';

export function changePassword() {
  const dialog = modal('Cambiar contraseña', `<form id="change-password-form"><div class="dialog-body"><p class="form-intro">Después de guardar tendrás que iniciar sesión de nuevo.</p>${field('Contraseña actual', 'current', '', 'password', 'required autocomplete="current-password"')}${field('Nueva contraseña', 'password', '', 'password', 'required minlength="12" autocomplete="new-password"')}${field('Confirmar nueva contraseña', 'confirm', '', 'password', 'required minlength="12" autocomplete="new-password"')}${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="submit" class="btn btn-primary">Guardar contraseña</button></div></form>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const form = new FormData(event.currentTarget);
      const next = form.get('password');
      validateNewPassword(next, form.get('confirm'));
      await api('/auth/cambiar-contrasena', 'POST', { passwordActual: form.get('current'), nuevaPassword: next });
      forgetSession();
      dialog.close();
      location.reload();
    } catch (error) {
      const target = dialog.querySelector('#form-error');
      target.textContent = error.message;
      target.hidden = false;
      target.focus();
    } finally { submit.disabled = false; }
  };
}

export async function closeAccountSession() {
  try {
    await logout();
    location.reload();
  } catch (error) { toast(error.message); }
}
