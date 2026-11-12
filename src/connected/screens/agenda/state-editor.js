import { statuses } from '../../../shared/data.js';
import { escape as esc } from '../../../shared/ui.js';
import { canManageAppointments, createManualClient } from '../../modules/agenda/manual-contract.js';

// La versión procede del detalle observado. Un conflicto exige releer y nunca se reenvía con una versión nueva automáticamente.
export function attachStateEditor(dialog, detail, { role, request, onChanged, onReload }) {
  if (!canManageAppointments(role)) return;
  dialog.querySelector('.m4-history').insertAdjacentHTML('beforebegin', `<form class="m4-state-editor"><h3>Gestionar estado</h3><label class="form-label" for="cita-estado">Estado de la cita</label><select class="form-select" id="cita-estado" name="estado">${Object.entries(statuses).map(([value, label]) => `<option value="${value}" ${value === detail.estado ? 'selected' : ''}>${label}</option>`).join('')}</select><label class="form-label" for="cita-motivo">Motivo del cambio <span class="optional">(opcional)</span></label><textarea class="form-control" id="cita-motivo" name="motivo" rows="2" maxlength="2000"></textarea><p class="field-hint">Solo Cancelada libera el horario. No asistió lo conserva. Los estados finales y la reactivación se comprueban en el servidor.</p><p class="form-error" data-state-error role="alert" tabindex="-1" hidden></p><div class="m4-history-pages"><button type="submit" class="btn btn-primary">Guardar estado</button><button type="button" class="btn btn-light" data-state-reload hidden>Actualizar detalle</button></div></form>`);
  const form = dialog.querySelector('.m4-state-editor'), save = form.querySelector('[type="submit"]'), reload = form.querySelector('[data-state-reload]'), errorBox = form.querySelector('[data-state-error]');
  const client = createManualClient(request); let busy = false, stale = false;
  reload.onclick = () => { if (!busy) void onReload(); };
  form.onsubmit = async (event) => {
    event.preventDefault(); if (busy || stale) return;
    busy = true; save.disabled = true; errorBox.hidden = true;
    try {
      const values = new FormData(form);
      form.querySelectorAll('select,textarea').forEach((control) => { control.disabled = true; });
      const result = await client.changeState(detail.id, { estado: values.get('estado'), motivo: values.get('motivo'), version: detail.version });
      if (!form.isConnected || !dialog.open) return;
      if (result?.id !== detail.id || result.folio !== detail.folio || result.estado !== values.get('estado') || !Number.isInteger(result.version) || result.version < detail.version) throw new Error('No se pudo comprobar el cambio.');
      stale = true;
      await onChanged();
    } catch (error) {
      if (!form.isConnected || !dialog.open) return;
      stale = error.status !== 400;
      errorBox.textContent = error.status === 409 ? 'Hay un conflicto con la versión o las condiciones actuales de la cita. Actualiza el detalle antes de volver a guardar.' : error.status === 400 ? error.message : 'No se pudo confirmar el cambio de estado. Actualiza el detalle antes de volver a guardar.';
      errorBox.hidden = false; reload.hidden = !stale; errorBox.focus();
    } finally {
      busy = false;
      if (form.isConnected) { save.disabled = stale; form.querySelectorAll('select,textarea').forEach((control) => { control.disabled = false; }); }
    }
  };
}
