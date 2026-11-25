import { api, iniciarSesion, urlSegunModo } from '../../backend.js';
import { mensajeErrorIngreso } from '../../modules/autenticacion/autenticacion.errores.js';
import { validarContrasenaNueva } from '../../modules/autenticacion/contrasena.politica.js';
import { renderIcono } from '../../../shared/iconos.catalogo.js';
import { escaparHtml as escapar } from '../../../shared/interfaz.componentes.js';
import './autenticacion.estilos.css';

const campoEntrada = (etiqueta, id, tipo, autocomplete, extra = '') =>
  '<div class="autenticacion-campo"><label for="' + id + '">' + etiqueta + '</label>' +
  '<input id="' + id + '" name="' + id + '" type="' + tipo +
  '" autocomplete="' + autocomplete + '" ' + extra + ' required></div>';

const campoContrasena = (etiqueta, id, autocomplete, extra = '') =>
  '<div class="autenticacion-campo"><label for="' + id + '">' + etiqueta + '</label>' +
  '<div class="autenticacion-control-contrasena"><input id="' + id + '" name="' + id +
  '" type="password" autocomplete="' + autocomplete + '" ' + extra +
  ' required><button type="button" data-autenticacion-alternar="' + id +
  '" aria-label="Mostrar ' + etiqueta.toLowerCase() + '">Mostrar</button></div></div>';

function mostrarError(raiz, mensaje) {
  const destino = raiz.querySelector('#autenticacion-error');
  destino.textContent = mensaje;
  destino.hidden = false;
  destino.focus();
}

export function renderAutenticacion(mensaje = '', alIngresar) {
  const aplicacion = document.querySelector('#app');

  function montar(titulo, contenido, alEnviar) {
    document.title = 'Citalendar · ' + titulo;
    const oscuro = document.documentElement.dataset.theme === 'dark';
    aplicacion.innerHTML = '<main class="autenticacion-pagina"><section class="autenticacion-contenido">' +
      '<header class="autenticacion-cabecera"><div class="autenticacion-marca" aria-label="Citalendar">' +
      '<img class="autenticacion-logo-claro" src="/brand/citalendar-logo.svg" alt="Citalendar">' +
      '<img class="autenticacion-logo-oscuro" src="/brand/citalendar-logo-light.svg" alt="">' +
      '</div><div class="autenticacion-acciones-cabecera"><a class="autenticacion-enlace-demo" href="' +
      urlSegunModo('/admin/agenda', true) + '">Ver demo <span aria-hidden="true">↗</span></a>' +
      '<button type="button" class="autenticacion-selector-tema selector-tema" data-action="theme" ' +
      'aria-label="Activar modo ' + (oscuro ? 'claro' : 'oscuro') + '" aria-pressed="' + oscuro +
      '" title="Modo ' + (oscuro ? 'claro' : 'oscuro') + '">' + renderIcono(oscuro ? 'sun' : 'moon') +
      '</button></div></header>' +
      '<div class="autenticacion-contenido-interior">' + contenido + '</div></section>' +
      '<aside class="autenticacion-visual"><img src="/brand/login-workspace.png" alt="Agenda abierta sobre un escritorio iluminado por el sol">' +
      '<div class="autenticacion-texto-visual"><p>Citalendar, la agenda de tu negocio</p></div></aside></main>';

    const raiz = aplicacion.querySelector('.autenticacion-pagina');
    raiz.querySelector('input')?.focus();
    raiz.onclick = (evento) => {
      const alternar = evento.target.closest('[data-autenticacion-alternar]');
      if (alternar) {
        const campo = raiz.querySelector('#' + alternar.dataset.autenticacionAlternar);
        const visible = campo.type === 'password';
        campo.type = visible ? 'text' : 'password';
        alternar.textContent = visible ? 'Ocultar' : 'Mostrar';
        alternar.setAttribute('aria-label', (visible ? 'Ocultar ' : 'Mostrar ') +
          campo.closest('.autenticacion-campo').querySelector('label').textContent.toLowerCase());
        campo.focus();
        return;
      }
      const accion = evento.target.closest('[data-autenticacion]')?.dataset.autenticacion;
      if (accion === 'recuperar') mostrarRecuperacion();
      if (accion === 'activar') mostrarActivacion(raiz.querySelector('#ingreso-correo')?.value || '');
      if (accion === 'volver') mostrarIngreso();
    };
    raiz.querySelector('form').onsubmit = async (evento) => {
      evento.preventDefault();
      const formulario = evento.currentTarget;
      const envio = formulario.querySelector('[type="submit"]');
      envio.disabled = true;
      envio.textContent = 'Espera un momento…';
      try {
        await alEnviar(new FormData(formulario));
      } catch (error) {
        mostrarError(raiz, formulario.id === 'ingreso-formulario' ? mensajeErrorIngreso(error) : error.message);
        envio.disabled = false;
        envio.textContent = envio.dataset.etiquetaEnvio;
      }
    };
  }

  function mostrarIngreso(aviso = '', correo = '') {
    montar('Iniciar sesión',
      '<div class="autenticacion-introduccion"><h1>Inicia sesión</h1><p>Entra a la agenda de tu negocio.</p></div>' +
      '<form id="ingreso-formulario" class="autenticacion-formulario">' +
      campoEntrada('Correo electrónico', 'ingreso-correo', 'email', 'username', 'value="' + escapar(correo) + '"') +
      campoContrasena('Contraseña', 'ingreso-contrasena', 'current-password') +
      '<div class="autenticacion-ayuda"><button type="button" data-autenticacion="recuperar">¿Olvidaste tu contraseña?</button></div>' +
      '<p class="autenticacion-aviso" role="status" ' + (aviso ? '' : 'hidden') + '>' + escapar(aviso) + '</p>' +
      '<p class="autenticacion-error" id="autenticacion-error" role="alert" tabindex="-1" hidden></p>' +
      '<button class="autenticacion-enviar" type="submit" data-etiqueta-envio="Entrar">Entrar</button></form>' +
      '<p class="autenticacion-alternativa">¿Tienes una invitación? <button type="button" data-autenticacion="activar">Activa tu cuenta</button></p>',
      async (formulario) => {
        await iniciarSesion(formulario.get('ingreso-correo').trim(), formulario.get('ingreso-contrasena'));
        await alIngresar();
      });
  }

  function mostrarActivacion(correo = '') {
    montar('Activar cuenta',
      '<div class="autenticacion-introduccion"><h1>Activa tu cuenta</h1><p>Usa el código que recibiste por correo para comenzar.</p></div>' +
      '<form id="activacion-formulario" class="autenticacion-formulario">' +
      campoEntrada('Código de activación', 'activacion-codigo', 'text', 'one-time-code', 'spellcheck="false"') +
      campoEntrada('Correo invitado', 'activacion-correo', 'email', 'email', 'value="' + escapar(correo) + '"') +
      campoEntrada('Nombre completo', 'activacion-nombre', 'text', 'name', 'maxlength="150"') +
      campoContrasena('Contraseña', 'activacion-contrasena', 'new-password', 'minlength="12"') +
      campoContrasena('Confirmar contraseña', 'activacion-confirmacion', 'new-password', 'minlength="12"') +
      '<p class="autenticacion-indicacion">La contraseña debe tener al menos 12 caracteres.</p>' +
      '<p class="autenticacion-error" id="autenticacion-error" role="alert" tabindex="-1" hidden></p>' +
      '<button class="autenticacion-enviar" type="submit" data-etiqueta-envio="Activar cuenta">Activar cuenta</button></form>' +
      '<button class="autenticacion-volver" type="button" data-autenticacion="volver">Volver a iniciar sesión</button>',
      async (formulario) => {
        const contrasena = formulario.get('activacion-contrasena');
        validarContrasenaNueva(contrasena, formulario.get('activacion-confirmacion'));
        const correoInvitado = formulario.get('activacion-correo').trim();
        await api('/auth/activar-administrador', 'POST', {
          codigo: formulario.get('activacion-codigo').trim(),
          correo: correoInvitado,
          nombre: formulario.get('activacion-nombre').trim(),
          password: contrasena,
        });
        mostrarIngreso('Cuenta activada. Inicia sesión con tu contraseña.', correoInvitado);
      });
  }

  function mostrarRecuperacion() {
    montar('Recuperar contraseña',
      '<div class="autenticacion-introduccion"><h1>Recupera tu acceso</h1>' +
      '<p>Solicita al superadministrador un código de recuperación. Este formulario no envía códigos por correo.</p></div>' +
      '<form id="recuperacion-formulario" class="autenticacion-formulario">' +
      campoEntrada('Código de recuperación', 'recuperacion-codigo', 'text', 'one-time-code', 'spellcheck="false"') +
      campoContrasena('Nueva contraseña', 'recuperacion-contrasena', 'new-password', 'minlength="12"') +
      campoContrasena('Confirmar contraseña', 'recuperacion-confirmacion', 'new-password', 'minlength="12"') +
      '<p class="autenticacion-indicacion">La contraseña debe tener al menos 12 caracteres.</p>' +
      '<p class="autenticacion-error" id="autenticacion-error" role="alert" tabindex="-1" hidden></p>' +
      '<button class="autenticacion-enviar" type="submit" data-etiqueta-envio="Cambiar contraseña">Cambiar contraseña</button></form>' +
      '<button class="autenticacion-volver" type="button" data-autenticacion="volver">Volver a iniciar sesión</button>',
      async (formulario) => {
        const contrasena = formulario.get('recuperacion-contrasena');
        validarContrasenaNueva(contrasena, formulario.get('recuperacion-confirmacion'));
        await api('/auth/recuperar-contrasena', 'POST', {
          codigo: formulario.get('recuperacion-codigo').trim(),
          password: contrasena,
        });
        mostrarIngreso('Contraseña actualizada. Inicia sesión de nuevo.');
      });
  }

  mostrarIngreso(mensaje);
}
