import { api, loadBackendData } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { field, basicForm, errorSlot } from '../../../shared/forms.js';
import { modal, toast, escape } from '../../../shared/ui.js';
import { businessDetailData, invalidateBusinessDetail } from './view.js';

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
  if (action === 'suspend') confirmBusiness('Programar suspensión', 'El acceso continuará durante el plazo de 48 horas, salvo que la licencia venza antes. Después se bloquearán las sesiones del negocio.', 'Programar suspensión', async () => {
    const business = await api(`/negocios/${id}`);
    return api(`/licencias/${business.licencia.id}/suspender`, 'POST', {});
  }, 'Suspensión programada.');
  if (action === 'reactivate') confirmBusiness('Reactivar licencia', 'Se reanudará la licencia con el tiempo conservado. Las cuentas desactivadas no se reactivan por esta acción.', 'Reactivar licencia', async () => {
    const business = await api(`/negocios/${id}`);
    return api(`/licencias/${business.licencia.id}/reactivar`, 'POST', {});
  }, 'Licencia reactivada.');
  if (action === 'renew') confirmBusiness('Renovar licencia', 'Se añadirá un año calendario. La renovación no elimina una suspensión activa.', 'Renovar un año', async () => {
    const business = await api(`/negocios/${id}`);
    return api(`/licencias/${business.licencia.id}/renovar`, 'POST', {});
  }, 'Licencia renovada.');
  if (action === 'retry' && typeof value === 'string' && /^\d+$/.test(value)) confirmBusiness('Reintentar correo', `Se volverá a dejar pendiente el envío ${escape(value)} si su código y destinatario siguen vigentes.`, 'Reintentar', () => api(`/negocios/${id}/reintentar-envio`, 'POST', { envioId: value }), 'Correo encolado para reintento.');
}
