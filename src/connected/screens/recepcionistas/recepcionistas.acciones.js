import { api, loadBackendData } from '../../backend.js';
import { validarContrasenaNueva } from '../../modules/autenticacion/contrasena.politica.js';
import { list } from '../../../shared/data.js';
import { escape } from '../../../shared/ui.js';
import { render, state } from '../../../shared/app.js';
import { field, basicForm, errorSlot } from '../../../shared/forms.js';
import { modal, toast } from '../../../shared/ui.js';
import { mostrarErroresProfesional, limpiarErroresProfesional, limpiarCampoProfesional } from '../../../shared/screens/profesionales/profesionales.errores.js';
import { validarRecepcionista, interpretarErrorRecepcionista } from './recepcionistas.errores.js';
import { readOwnRoleQuota, ownQuotaNotice } from '../negocio/user-quota.js';
import { disableReceptionist } from '../../modules/recursos/retired.js';

const campoMarcado = (...argumentos) => field(...argumentos).replace('class="form-field"', `class="form-field" data-campo-profesional="${argumentos[1]}"`);
const camposContrasena = () => campoMarcado('Contraseña', 'password', '', 'password', 'required minlength="12" autocomplete="new-password"');

function formularioRecepcionista(titulo, contenido, alGuardar, restablecimiento = false) {
  const dialogo = basicForm(titulo, contenido, alGuardar, false, {
    drawer: !restablecimiento,
    validate(formulario) {
      const errores = validarRecepcionista(new FormData(formulario), restablecimiento);
      if (!Object.keys(errores).length) { limpiarErroresProfesional(formulario); return true; }
      mostrarErroresProfesional(formulario, errores);
      return false;
    },
    onError(error, formulario) {
      const errores = interpretarErrorRecepcionista(error);
      if (errores) mostrarErroresProfesional(formulario, errores);
      else {
        const destino = formulario.querySelector('#form-error');
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
  try { return ownQuotaNotice('recepcionistas', await readOwnRoleQuota('recepcionistas', api)); }
  catch { return '<p class="form-intro">No se pudo consultar el cupo vigente. El servidor lo comprobará al guardar.</p>'; }
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
    formularioRecepcionista('Restablecer contraseña', `${camposContrasena()}<p class="form-intro">Se cerrarán las sesiones de esta recepcionista.</p>`, async (formulario) => {
      const password = formulario.get('password');
      validarContrasenaNueva(password);
      await api(`/recepcionistas/${id}/restablecer-contrasena`, 'POST', { nuevaPassword: password });
    }, true);
    return;
  }
  if (!['desactivar', 'reactivar', 'inhabilitar'].includes(accion)) return;
  const persona = list('receptionists', state.tenantId).find((elemento) => elemento.id === id);
  if (!persona) return;
  const reactivando = accion === 'reactivar';
  const inhabilitando = accion === 'inhabilitar';
  // Inhabilitar retira la cuenta de la lista; desactivar conserva la cuenta
  // visible y reactivar sigue sujeto al cupo del servidor.
  const dialogo = modal(reactivando ? 'Reactivar recepcionista' : inhabilitando ? 'Inhabilitar recepcionista' : 'Desactivar recepcionista', `<div class="dialog-body">${reactivando ? await introduccionCupo() : ''}<p><strong>${escape(persona.name)}</strong>: ${reactivando ? 'Se habilitará de nuevo su cuenta. Tendrá que iniciar sesión.' : inhabilitando ? 'Se retirará de los listados operativos y se cerrarán sus sesiones. Podrás consultarla en Inhabilitados y restaurarla como inactiva más adelante.' : 'Se desactivará la cuenta y se cerrarán sus sesiones.'}</p>${errorSlot}</div><div class="dialog-footer"><button class="btn btn-light" data-dismiss>Cancelar</button><button class="btn ${reactivando ? 'btn-primary' : inhabilitando ? 'action-danger' : 'action-caution'}" data-confirm>${reactivando ? 'Reactivar' : inhabilitando ? 'Inhabilitar' : 'Desactivar'}</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const boton = evento.currentTarget;
    boton.disabled = true;
    try {
      if (inhabilitando) await disableReceptionist(id);
      else await api(`/recepcionistas/${id}/${reactivando ? 'reactivar' : 'desactivar'}`, 'POST', {});
      try { await loadBackendData(); }
      catch (error) { toast('Cambio guardado. No se pudo actualizar la lista: ' + error.message); }
      dialogo.close();
      render();
      toast(reactivando ? 'Recepcionista reactivada.' : inhabilitando ? 'Recepcionista inhabilitada.' : 'Recepcionista desactivada.');
    } catch (error) {
      const destino = dialogo.querySelector('#form-error');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally { boton.disabled = false; }
  };
}
