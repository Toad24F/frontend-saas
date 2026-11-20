import { api, cargarDatosBackend } from '../../backend.js';
import { validarContrasenaNueva } from '../../modules/autenticacion/contrasena.politica.js';
import { listarRegistros } from '../../../shared/aplicacion.datos.js';
import { escaparHtml } from '../../../shared/interfaz.componentes.js';
import { render, estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { renderCampo, abrirFormulario, espacioErrorFormulario } from '../../../shared/formularios.componentes.js';
import { abrirDialogo, mostrarAviso } from '../../../shared/interfaz.componentes.js';
import { mostrarErroresProfesional, limpiarErroresProfesional, limpiarCampoProfesional } from '../../../shared/screens/profesionales/profesionales.errores.js';
import { validarRecepcionista, interpretarErrorRecepcionista } from './recepcionistas.errores.js';
import { leerCupoRolPropio, renderAvisoCupoPropio } from '../negocio/usuarios.cupo.js';
import { inhabilitarRecepcionista } from '../../modules/recursos/recursos.inhabilitados.js';

const campoMarcado = (...argumentos) => renderCampo(...argumentos).replace('class="campo-formulario"', `class="campo-formulario" data-campo-profesional="${argumentos[1]}"`);
const camposContrasena = () => campoMarcado('Contraseña', 'password', '', 'password', 'required minlength="12" autocomplete="new-password"');

function formularioRecepcionista(titulo, contenido, alGuardar, restablecimiento = false) {
  const dialogo = abrirFormulario(titulo, contenido, alGuardar, false, {
    panelLateral: !restablecimiento,
    validar(formulario) {
      const errores = validarRecepcionista(new FormData(formulario), restablecimiento);
      if (!Object.keys(errores).length) { limpiarErroresProfesional(formulario); return true; }
      mostrarErroresProfesional(formulario, errores);
      return false;
    },
    alFallar(error, formulario) {
      const errores = interpretarErrorRecepcionista(error);
      if (errores) mostrarErroresProfesional(formulario, errores);
      else {
        const destino = formulario.querySelector('#error-formulario');
        destino.textContent = error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
        destino.hidden = false;
        destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
        destino.focus({ preventScroll: true });
      }
    },
  });
  const formulario = dialogo.querySelector('#editor-form');
  formulario.addEventListener('input', (evento) => limpiarCampoProfesional(formulario, evento.target));
  formulario.addEventListener('change', (evento) => limpiarCampoProfesional(formulario, evento.target));
  return dialogo;
}

async function introduccionCupo() {
  // Alta y reactivación comparten la lectura autorizada del negocio de sesión.
  // Si falla la lectura, la operación final aún deja validar el cupo al backend.
  try { return renderAvisoCupoPropio('recepcionistas', await leerCupoRolPropio('recepcionistas', api)); }
  catch { return '<p class="introduccion-formulario">No se pudo consultar el cupo vigente. El servidor lo comprobará al guardar.</p>'; }
}

export async function nuevaRecepcionista() {
  formularioRecepcionista('Nueva recepcionista', `${await introduccionCupo()}${campoMarcado('Nombre completo', 'name', '', 'text', 'required maxlength="150"')}${campoMarcado('Correo', 'email', '', 'email', 'required maxlength="150" autocomplete="email"')}${camposContrasena()}`, async (formulario) => {
    const password = formulario.get('password');
    validarContrasenaNueva(password);
    await api('/recepcionistas', 'POST', { nombre: formulario.get('name').trim(), emailRecepcionista: formulario.get('email').trim(), password });
  });
}

export async function accionRecepcionista(accion, id) {
  if (accion === 'restablecer') {
    formularioRecepcionista('Restablecer contraseña', `${camposContrasena()}<p class="introduccion-formulario">Se cerrarán las sesiones de esta recepcionista.</p>`, async (formulario) => {
      const password = formulario.get('password');
      validarContrasenaNueva(password);
      await api(`/recepcionistas/${id}/restablecer-contrasena`, 'POST', { nuevaPassword: password });
    }, true);
    return;
  }
  if (!['desactivar', 'reactivar', 'inhabilitar'].includes(accion)) return;
  const persona = listarRegistros('receptionists', estadoAplicacion.negocioId).find((elemento) => elemento.id === id);
  if (!persona) return;
  const reactivando = accion === 'reactivar';
  const inhabilitando = accion === 'inhabilitar';
  // Inhabilitar retira la cuenta de la lista; desactivar conserva la cuenta
  // visible y reactivar sigue sujeto al cupo del servidor.
  const dialogo = abrirDialogo(reactivando ? 'Reactivar recepcionista' : inhabilitando ? 'Inhabilitar recepcionista' : 'Desactivar recepcionista', `<div class="dialogo-cuerpo">${reactivando ? await introduccionCupo() : ''}<p><strong>${escaparHtml(persona.name)}</strong>: ${reactivando ? 'Se habilitará de nuevo su cuenta. Tendrá que iniciar sesión.' : inhabilitando ? 'Se retirará de los listados operativos y se cerrarán sus sesiones. Podrás consultarla en Inhabilitados y restaurarla como inactiva más adelante.' : 'Se desactivará la cuenta y se cerrarán sus sesiones.'}</p>${espacioErrorFormulario}</div><div class="dialogo-pie"><button class="btn btn-light" data-dismiss>Cancelar</button><button class="btn ${reactivando ? 'btn-primary' : inhabilitando ? 'accion-peligro' : 'accion-precaucion'}" data-confirm>${reactivando ? 'Reactivar' : inhabilitando ? 'Inhabilitar' : 'Desactivar'}</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const boton = evento.currentTarget;
    boton.disabled = true;
    try {
      if (inhabilitando) await inhabilitarRecepcionista(id);
      else await api(`/recepcionistas/${id}/${reactivando ? 'reactivar' : 'desactivar'}`, 'POST', {});
      try { await cargarDatosBackend(); }
      catch (error) { mostrarAviso('Cambio guardado. No se pudo actualizar la lista: ' + error.message); }
      dialogo.close();
      render();
      mostrarAviso(reactivando ? 'Recepcionista reactivada.' : inhabilitando ? 'Recepcionista inhabilitada.' : 'Recepcionista desactivada.');
    } catch (error) {
      const destino = dialogo.querySelector('#error-formulario');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally { boton.disabled = false; }
  };
}
