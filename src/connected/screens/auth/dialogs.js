import { api, login, modeUrl } from '../../backend.js';
import { validateNewPassword } from '../../modules/auth/password-policy.js';
import { icon } from '../../../shared/icons.js';
import { escape } from '../../../shared/ui.js';
import './style.css';

const input = (label, id, type, autocomplete, extra = '') =>
  '<div class="auth-field"><label for="' + id + '">' + label + '</label>' +
  '<input id="' + id + '" name="' + id + '" type="' + type +
  '" autocomplete="' + autocomplete + '" ' + extra + ' required></div>';

const passwordInput = (label, id, autocomplete, extra = '') =>
  '<div class="auth-field"><label for="' + id + '">' + label + '</label>' +
  '<div class="auth-password-control"><input id="' + id + '" name="' + id +
  '" type="password" autocomplete="' + autocomplete + '" ' + extra +
  ' required><button type="button" data-auth-toggle="' + id +
  '" aria-label="Mostrar ' + label.toLowerCase() + '">Mostrar</button></div></div>';

function showError(root, error) {
  const target = root.querySelector('#auth-error');
  target.textContent = error.message;
  target.hidden = false;
  target.focus();
}

export function showConnectedLogin(message = '', onLogin) {
  const app = document.querySelector('#app');

  function mount(title, content, onSubmit) {
    document.title = 'Citalendar · ' + title;
    const dark = document.documentElement.dataset.theme === 'dark';
    app.innerHTML = '<main class="auth-page"><section class="auth-content">' +
      '<header class="auth-header"><div class="auth-brand" aria-label="Citalendar">' +
      '<img class="auth-logo-light" src="/brand/citalendar-logo.svg" alt="Citalendar">' +
      '<img class="auth-logo-dark" src="/brand/citalendar-logo-light.svg" alt="">' +
      '</div><div class="auth-header-actions"><a class="auth-demo-link" href="' +
      modeUrl('/admin/agenda', true) + '">Ver demo <span aria-hidden="true">↗</span></a>' +
      '<button type="button" class="auth-theme-toggle theme-toggle" data-action="theme" ' +
      'aria-label="Activar modo ' + (dark ? 'claro' : 'oscuro') + '" aria-pressed="' + dark +
      '" title="Modo ' + (dark ? 'claro' : 'oscuro') + '">' + icon(dark ? 'sun' : 'moon') +
      '</button></div></header>' +
      '<div class="auth-content-inner">' + content + '</div>' +
      '<footer class="auth-footer">Un poco más de orden. Más tiempo para cuidar.</footer></section>' +
      '<aside class="auth-visual"><img src="/brand/login-workspace.png" alt="Agenda abierta sobre un escritorio iluminado por el sol">' +
      '<div class="auth-visual-copy"><span>Tu negocio, a tu ritmo</span>' +
      '<p>La agenda lista para el día que tienes por delante.</p></div></aside></main>';

    const root = app.querySelector('.auth-page');
    root.querySelector('input')?.focus();
    root.onclick = (event) => {
      const toggle = event.target.closest('[data-auth-toggle]');
      if (toggle) {
        const field = root.querySelector('#' + toggle.dataset.authToggle);
        const visible = field.type === 'password';
        field.type = visible ? 'text' : 'password';
        toggle.textContent = visible ? 'Ocultar' : 'Mostrar';
        toggle.setAttribute('aria-label', (visible ? 'Ocultar ' : 'Mostrar ') +
          field.closest('.auth-field').querySelector('label').textContent.toLowerCase());
        field.focus();
        return;
      }
      const action = event.target.closest('[data-auth]')?.dataset.auth;
      if (action === 'recover') showRecovery();
      if (action === 'activate') showActivation(root.querySelector('#login-email')?.value || '');
      if (action === 'back') showLogin();
    };
    root.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Espera un momento…';
      try {
        await onSubmit(new FormData(event.currentTarget));
      } catch (error) {
        showError(root, error);
        submit.disabled = false;
        submit.textContent = submit.dataset.label;
      }
    };
  }

  function showLogin(notice = '', email = '') {
    mount('Iniciar sesión',
      '<div class="auth-intro"><h1>Inicia sesión</h1><p>Entra a la agenda de tu negocio.</p></div>' +
      '<form id="login-form" class="auth-form">' +
      input('Correo electrónico', 'login-email', 'email', 'username', 'value="' + escape(email) + '"') +
      passwordInput('Contraseña', 'login-password', 'current-password') +
      '<div class="auth-support"><button type="button" data-auth="recover">¿Olvidaste tu contraseña?</button></div>' +
      '<p class="auth-notice" role="status" ' + (notice ? '' : 'hidden') + '>' + escape(notice) + '</p>' +
      '<p class="auth-error" id="auth-error" role="alert" tabindex="-1" hidden></p>' +
      '<button class="auth-submit" type="submit" data-label="Entrar">Entrar</button></form>' +
      '<p class="auth-alternative">¿Tienes una invitación? <button type="button" data-auth="activate">Activa tu cuenta</button></p>',
      async (form) => {
        await login(form.get('login-email').trim(), form.get('login-password'));
        await onLogin();
      });
  }

  function showActivation(email = '') {
    mount('Activar cuenta',
      '<div class="auth-intro"><h1>Activa tu cuenta</h1><p>Usa el código que recibiste por correo para comenzar.</p></div>' +
      '<form id="activate-form" class="auth-form">' +
      input('Código de activación', 'activation-code', 'text', 'one-time-code', 'spellcheck="false"') +
      input('Correo invitado', 'activation-email', 'email', 'email', 'value="' + escape(email) + '"') +
      input('Nombre completo', 'activation-name', 'text', 'name', 'maxlength="150"') +
      passwordInput('Contraseña', 'activation-password', 'new-password', 'minlength="12"') +
      passwordInput('Confirmar contraseña', 'activation-confirm', 'new-password', 'minlength="12"') +
      '<p class="auth-helper">La contraseña debe tener al menos 12 caracteres.</p>' +
      '<p class="auth-error" id="auth-error" role="alert" tabindex="-1" hidden></p>' +
      '<button class="auth-submit" type="submit" data-label="Activar cuenta">Activar cuenta</button></form>' +
      '<button class="auth-back" type="button" data-auth="back">Volver a iniciar sesión</button>',
      async (form) => {
        const password = form.get('activation-password');
        validateNewPassword(password, form.get('activation-confirm'));
        const invitedEmail = form.get('activation-email').trim();
        await api('/auth/activar-administrador', 'POST', {
          codigo: form.get('activation-code').trim(),
          correo: invitedEmail,
          nombre: form.get('activation-name').trim(),
          password,
        });
        showLogin('Cuenta activada. Inicia sesión con tu contraseña.', invitedEmail);
      });
  }

  function showRecovery() {
    mount('Recuperar contraseña',
      '<div class="auth-intro"><h1>Recupera tu acceso</h1>' +
      '<p>Solicita al superadministrador un código de recuperación. Este formulario no envía códigos por correo.</p></div>' +
      '<form id="recovery-form" class="auth-form">' +
      input('Código de recuperación', 'recovery-code', 'text', 'one-time-code', 'spellcheck="false"') +
      passwordInput('Nueva contraseña', 'recovery-password', 'new-password', 'minlength="12"') +
      passwordInput('Confirmar contraseña', 'recovery-confirm', 'new-password', 'minlength="12"') +
      '<p class="auth-helper">La contraseña debe tener al menos 12 caracteres.</p>' +
      '<p class="auth-error" id="auth-error" role="alert" tabindex="-1" hidden></p>' +
      '<button class="auth-submit" type="submit" data-label="Cambiar contraseña">Cambiar contraseña</button></form>' +
      '<button class="auth-back" type="button" data-auth="back">Volver a iniciar sesión</button>',
      async (form) => {
        const password = form.get('recovery-password');
        validateNewPassword(password, form.get('recovery-confirm'));
        await api('/auth/recuperar-contrasena', 'POST', {
          codigo: form.get('recovery-code').trim(),
          password,
        });
        showLogin('Contraseña actualizada. Inicia sesión de nuevo.');
      });
  }

  showLogin(message);
}
