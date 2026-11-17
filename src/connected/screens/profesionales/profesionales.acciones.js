import { api, loadBackendData, user } from '../../backend.js';
import { ejecutarAccionProfesional } from '../../modules/profesionales/profesionales.operaciones.js';
import { render, state } from '../../../shared/app.js';
import { resource } from '../../../shared/data.js';
import { errorSlot } from '../../../shared/forms.js';
import { escape, modal, toast } from '../../../shared/ui.js';
import { readOwnRoleQuota, ownQuotaNotice } from '../negocio/user-quota.js';

const operaciones = {
  desactivar: { titulo: 'Desactivar profesional', etiqueta: 'Desactivar', mensaje: 'Se cerrarán sus sesiones. Se conservan su perfil, horarios, asignaciones e historial.', exito: 'Profesional desactivado.' },
  reactivar: { titulo: 'Reactivar profesional', etiqueta: 'Reactivar', mensaje: 'Podrá iniciar sesión de nuevo. Las sesiones anteriores no se restauran.', exito: 'Profesional reactivado.' },
  inhabilitar: { titulo: 'Inhabilitar profesional', etiqueta: 'Inhabilitar', mensaje: 'Se retirará de los listados operativos y se cerrarán sus sesiones. Podrás consultarlo en Inhabilitados y restaurarlo como inactivo más adelante.', exito: 'Profesional inhabilitado.' },
};

export async function accionProfesional(accion, id) {
  if (user?.rol !== 'admin_negocio' || state.page !== 'profesionales' || !operaciones[accion]) return;
  const persona = resource('professionals', id, state.tenantId);
  if (accion === 'desactivar' && persona.active === false || accion === 'reactivar' && persona.active !== false) {
    toast('El estado de este profesional cambió. Actualiza la lista.');
    return;
  }
  const operacion = operaciones[accion];
  let introduccionCupo = '';
  if (accion === 'reactivar') {
    // La reactivación puede consumir un lugar; se consulta el cupo propio justo
    // antes de confirmar y la respuesta final sigue siendo autoridad del servidor.
    try { introduccionCupo = ownQuotaNotice('profesionales', await readOwnRoleQuota('profesionales', api)); }
    catch { introduccionCupo = '<p class="form-intro">No se pudo consultar el cupo vigente. El servidor lo comprobará al reactivar.</p>'; }
  }
  // El retiro conserva historial y no equivale a desactivar ni a borrar.
  const dialogo = modal(operacion.titulo, `<div class="dialog-body">${introduccionCupo}<p><strong>${escape(persona.name)}</strong>: ${operacion.mensaje}</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn ${accion === 'reactivar' ? 'btn-primary' : accion === 'inhabilitar' ? 'action-danger' : 'action-caution'}" data-confirm>${operacion.etiqueta}</button></div>`);
  dialogo.querySelector('[data-dismiss]').onclick = () => dialogo.close();
  dialogo.querySelector('[data-confirm]').onclick = async (evento) => {
    const boton = evento.currentTarget;
    boton.disabled = true;
    const etiqueta = boton.textContent;
    boton.textContent = 'Procesando…';
    try {
      await ejecutarAccionProfesional(persona.id, accion);
      if (accion === 'inhabilitar' && state.scheduleProfessional === persona.id) state.scheduleProfessional = null;
      dialogo.close();
      try { await loadBackendData(); render(); toast(operacion.exito); }
      catch (error) { toast(`${operacion.exito} No se pudo actualizar la lista: ${error.message}`); }
    } catch (error) {
      const destino = dialogo.querySelector('#form-error');
      destino.textContent = error.message;
      destino.hidden = false;
      destino.focus();
    } finally {
      boton.disabled = false;
      boton.textContent = etiqueta;
    }
  };
}
