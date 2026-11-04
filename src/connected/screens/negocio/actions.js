import { api, loadBackendData, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { field, basicForm, errorSlot } from '../../../shared/forms.js';
import { modal, toast, escape } from '../../../shared/ui.js';
import { businessDetailData, invalidateBusinessDetail } from './view.js';
import { createLicenseOperations, validateSuspensionDays } from './license-operations.js';

const licenseOperations = () => createLicenseOperations({ api, actorId: user.id });

async function runBusinessAction(request, message) {
  const result = await request();
  invalidateBusinessDetail();
  try { await loadBackendData(); }
  catch (error) { toast('Cambio guardado. No se pudo actualizar el panel: ' + error.message); }
  render();
  toast(message);
  return result;
}

function confirmBusiness(title, description, label, request, success) {
  const dialog = modal(title, `<div class="dialog-body"><p>${description}</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="button" class="btn btn-primary" data-confirm>${label}</button></div>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('[data-confirm]').onclick = async (event) => {
    const submit = event.currentTarget;
    submit.disabled = true;
    try {
      await runBusinessAction(request, success);
      dialog.close();
    } catch (error) {
      const target = dialog.querySelector('#form-error');
      target.textContent = error.message;
      target.hidden = false;
      target.focus();
    } finally {
      submit.disabled = false;
    }
  };
}

export function businessAction(action, value = null) {
  if (user?.rol !== 'superadmin') return;
  const id = Number(state.businessId);
  if (!Number.isSafeInteger(id) || id < 1) return;
  const detail = businessDetailData();
  if (action === 'email') {
    basicForm('Corregir correo de invitación', `<p class="form-intro">Se invalidará el código anterior y se encolará un nuevo correo si cambias el destinatario.</p>${field('Nuevo correo del administrador', 'email', detail?.business.administrador?.email || detail?.business.emailContacto || '', 'email', 'required autocomplete="email"')}`, async (form) => {
      await api(`/negocios/${id}/correo-administrador`, 'PATCH', { correo: form.get('email').trim() });
      invalidateBusinessDetail();
    });
  }
  if (action === 'limit') {
    basicForm('Cambiar límite de sucursales', field('Sucursales activas permitidas', 'limit', detail?.quota.limiteSucursalesActivas || 1, 'number', 'required min="1" step="1"'), async (form) => {
      await api(`/negocios/${id}/limite-sucursales`, 'PATCH', { limiteSucursales: Number(form.get('limit')) });
      invalidateBusinessDetail();
    });
  }
  if (action === 'reissue') confirmBusiness('Reemitir código', 'El código anterior dejará de funcionar y se encolará otra invitación. El envío se confirma por separado.', 'Reemitir código', () => api(`/negocios/${id}/reemitir-codigo`, 'POST', {}), 'Invitación encolada.');
  if (action === 'recovery') confirmBusiness('Autorizar recuperación', 'Se encolará un código de un solo uso para el administrador activado. Los códigos anteriores dejarán de funcionar.', 'Autorizar', async () => {
    const business = await api(`/negocios/${id}`);
    if (!business.administrador?.id || !business.administrador?.activadoEn) throw new Error('El administrador aún no está activado.');
    return api(`/auth/administradores/${business.administrador.id}/autorizar-recuperacion`, 'POST', {});
  }, 'Recuperación encolada.');
  if (action === 'suspend' && detail?.validity?.estado === 'vigente') {
    // Se muestra un borrador; el cuerpo exacto queda congelado al primer POST.
    const dialog = modal('Programar suspensión', `<form id="license-suspension-form" class="dialog-body"><p>El plazo inicia en dos días. Cero bloquea el acceso inmediatamente; el bloqueo programado que responda el servidor será la fecha efectiva.</p><label for="license-delay">Plazo en días</label><input class="form-control" id="license-delay" name="plazoDias" type="number" min="0" max="30" step="1" value="2" required>${errorSlot}<div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Cancelar</button><button type="submit" class="btn btn-primary">Programar suspensión</button></div></form>`);
    dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      const submit = dialog.querySelector('[type="submit"]'); submit.disabled = true;
      try {
        const days = validateSuspensionDays(Number(dialog.querySelector('#license-delay').value));
        await runBusinessAction(() => licenseOperations().run('suspender', id, detail.business.licencia.id,
          { plazoDias: days }), 'Suspensión solicitada. Consulta el historial para comprobar el correo.');
        dialog.close();
      } catch (error) {
        const target = dialog.querySelector('#form-error'); target.textContent = error.message;
        target.hidden = false; target.focus();
      } finally { submit.disabled = false; }
    };
  }
  if (action === 'reactivate' && ['suspendida', 'suspension_pendiente'].includes(detail?.validity?.estado))
    confirmBusiness('Reactivar licencia', 'Se reanudará la licencia con el tiempo conservado. Las cuentas desactivadas no se reactivan por esta acción.', 'Reactivar licencia',
      () => licenseOperations().run('reactivar', id, detail.business.licencia.id, {}), 'Licencia reactivada. Consulta el historial para comprobar el correo.');
  if (action === 'renew' && detail?.validity && detail.validity.estado !== 'pendiente')
    confirmBusiness('Renovar licencia', 'Se añadirá un año calendario. Renovar no elimina una suspensión activa; el nuevo estado lo confirma el servidor.', 'Renovar un año',
      () => licenseOperations().run('renovar', id, detail.business.licencia.id, {}), 'Renovación registrada. Consulta el historial para comprobar el correo.');
  if (action === 'retry' && typeof value === 'string' && /^\d+$/.test(value)) confirmBusiness('Reintentar correo', `Se volverá a dejar pendiente el envío ${escape(value)} si su código y destinatario siguen vigentes.`, 'Reintentar', () => api(`/negocios/${id}/reintentar-envio`, 'POST', { envioId: value }), 'Correo encolado para reintento.');
}

export async function retryLicenseOperation() {
  if (user?.rol !== 'superadmin') return;
  try { await runBusinessAction(() => licenseOperations().retry(), 'Operación comprobada. Consulta el historial para comprobar el correo.'); }
  catch (error) { toast(error.message); }
}
