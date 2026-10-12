import { api, login, modeUrl } from '../../backend.js';
import { validateNewPassword } from '../../modules/auth/password-policy.js';
import { modal, escape } from '../../../shared/ui.js';

const input = (label, id, type, autocomplete, extra = '') => `<div class="form-field"><label class="form-label" for="${id}">${label}</label><input class="form-control" id="${id}" name="${id}" type="${type}" autocomplete="${autocomplete}" ${extra} required/></div>`;

function authDialog(title, content) {
  const dialog = modal(title, content);
  dialog.classList.add('auth-screen-transition');
  dialog.onclose = () => document.querySelector('#open-login')?.focus();
  dialog.querySelector('input')?.focus();
  return dialog;
}

function showError(dialog, error) {
  const target = dialog.querySelector('#auth-error');
  target.textContent = error.message;
  target.hidden = false;
  target.focus();
}

export function showConnectedLogin(message = '', onLogin) {
  document.querySelector('#app').innerHTML = `<div class="startup-error"><img src="/brand/citalendar-icon.svg" alt=""/><h1>Tu espacio en Citalendar</h1><p>Inicia sesión para trabajar con tu negocio.</p><div class="startup-actions"><button class="btn btn-primary" id="open-login">Iniciar sesión</button><a class="btn btn-light" href="${modeUrl('/admin/agenda', true)}">Ver demo</a></div></div>`;

  const showLoginDialog = (notice = '', email = '') => {
    const dialog = authDialog('Iniciar sesión', `<form id="login-form"><div class="dialog-body">${input('Correo', 'login-email', 'email', 'username', `value="${escape(email)}"`)}${input('Contraseña', 'login-password', 'password', 'current-password')}<div class="login-actions"><button type="button" data-auth="recover">Recuperar contraseña</button><button type="button" data-auth="activate">Activar invitación</button></div><p class="login-notice" role="status" ${notice ? '' : 'hidden'}>${escape(notice)}</p><p class="form-error" id="auth-error" role="alert" tabindex="-1" hidden></p></div><div class="dialog-footer login-footer"><button class="btn btn-primary" type="submit">Entrar</button></div></form>`);
    dialog.querySelector('[data-auth="recover"]').onclick = () => showRecoveryDialog();
    dialog.querySelector('[data-auth="activate"]').onclick = () => showActivationDialog(dialog.querySelector('#login-email').value);
    dialog.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const form = new FormData(event.currentTarget);
        await login(form.get('login-email').trim(), form.get('login-password'));
        dialog.close();
        await onLogin();
      } catch (error) { showError(dialog, error); }
      finally { submit.disabled = false; }
    };
  };

  const showActivationDialog = (email = '') => {
    const dialog = authDialog('Activar cuenta de administrador', `<form id="activate-form"><div class="dialog-body"><p class="form-intro">Usa el código recibido en el correo de invitación. La activación habilita la licencia del negocio.</p>${input('Código de activación', 'activation-code', 'text', 'one-time-code', 'spellcheck="false"')}${input('Correo invitado', 'activation-email', 'email', 'email', `value="${escape(email)}"`)}${input('Nombre completo', 'activation-name', 'text', 'name', 'maxlength="150"')}${input('Contraseña', 'activation-password', 'password', 'new-password', 'minlength="12"')}${input('Confirmar contraseña', 'activation-confirm', 'password', 'new-password', 'minlength="12"')}<div class="login-actions"><button type="button" data-auth="back">Volver a iniciar sesión</button></div><p class="form-error" id="auth-error" role="alert" tabindex="-1" hidden></p></div><div class="dialog-footer login-footer"><button class="btn btn-primary" type="submit">Activar cuenta</button></div></form>`);
    dialog.querySelector('[data-auth="back"]').onclick = () => showLoginDialog();
    dialog.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const form = new FormData(event.currentTarget);
        const password = form.get('activation-password');
        validateNewPassword(password, form.get('activation-confirm'));
        const invitedEmail = form.get('activation-email').trim();
        await api('/auth/activar-administrador', 'POST', { codigo: form.get('activation-code').trim(), correo: invitedEmail, nombre: form.get('activation-name').trim(), password });
        showLoginDialog('Cuenta activada. Inicia sesión con tu contraseña.', invitedEmail);
      } catch (error) { showError(dialog, error); }
      finally { submit.disabled = false; }
    };
  };

  const showRecoveryDialog = () => {
    const dialog = authDialog('Recuperar contraseña', `<form id="recovery-form"><div class="dialog-body"><p class="form-intro">Solicita al superadministrador un código de recuperación. Este formulario no envía códigos por correo.</p>${input('Código de recuperación', 'recovery-code', 'text', 'one-time-code', 'spellcheck="false"')}${input('Nueva contraseña', 'recovery-password', 'password', 'new-password', 'minlength="12"')}${input('Confirmar contraseña', 'recovery-confirm', 'password', 'new-password', 'minlength="12"')}<div class="login-actions"><button type="button" data-auth="back">Volver a iniciar sesión</button></div><p class="form-error" id="auth-error" role="alert" tabindex="-1" hidden></p></div><div class="dialog-footer login-footer"><button class="btn btn-primary" type="submit">Cambiar contraseña</button></div></form>`);
    dialog.querySelector('[data-auth="back"]').onclick = () => showLoginDialog();
    dialog.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const form = new FormData(event.currentTarget);
        const password = form.get('recovery-password');
        validateNewPassword(password, form.get('recovery-confirm'));
        await api('/auth/recuperar-contrasena', 'POST', { codigo: form.get('recovery-code').trim(), password });
        showLoginDialog('Contraseña actualizada. Inicia sesión de nuevo.');
      } catch (error) { showError(dialog, error); }
      finally { submit.disabled = false; }
    };
  };

  document.querySelector('#open-login').onclick = () => showLoginDialog(message);
  document.querySelector('#open-login').click();
}
