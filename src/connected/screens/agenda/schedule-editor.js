import { escape as esc } from '../../../shared/ui.js';
import {
  agendaDraft,
  saveAgendaDraft,
  clearAgendaDraft,
} from '../../../shared/screens/agenda/panels.js';
import { canManageAppointments } from '../../modules/agenda/manual-contract.js';
import {
  createScheduleClient,
  scheduleChange,
} from '../../modules/agenda/schedule-change.js';
import { createVersionedMutation } from '../../modules/agenda/versioned-mutation.js';

// Proponer un horario no cambia la tarjeta: la disponibilidad y duración histórica las verifica el servidor.
export function attachScheduleEditor(
  dialog,
  detail,
  { role, scope, request, onChanged, onReload, isCurrent },
) {
  if (!canManageAppointments(role)) return;
  const blocked =
    detail.estado === 'cancelada' ||
    (detail.inicioUtc && Date.parse(detail.inicioUtc) <= Date.now());
  const key = `schedule:${scope}:${detail.id}`,
    draft = agendaDraft(key);
  dialog
    .querySelector('.m4-history')
    .insertAdjacentHTML(
      'beforebegin',
      `<form class="m4-state-editor m4-schedule-editor"><h3>Cambiar horario</h3><p class="field-hint">Se conserva el folio, servicio, profesional, sucursal y costo histórico. La propuesta se interpreta en la zona vigente de la sucursal; la zona guardada de esta cita es ${esc(detail.zonaHoraria)}. El servidor comprueba disponibilidad y duración.</p>${blocked ? '<p role="status">Solo puedes mover citas futuras que no estén canceladas.</p>' : ''}<div class="form-row-two"><label class="form-label">Nueva fecha<input class="form-control" type="date" name="fechaLocal" required></label><label class="form-label">Nueva hora<input class="form-control" type="time" name="horaInicio" required></label></div><p class="form-error" data-schedule-error role="alert" tabindex="-1" hidden></p><div class="m4-history-pages"><button type="submit" class="btn btn-primary">Guardar horario</button><button type="button" class="btn btn-light" data-schedule-reload hidden>Releer horario</button></div></form>`,
    );
  const form = dialog.querySelector('.m4-schedule-editor'),
    save = form.querySelector('[type="submit"]'),
    reload = form.querySelector('[data-schedule-reload]'),
    errorBox = form.querySelector('[data-schedule-error]');
  form.elements.fechaLocal.value = draft?.fechaLocal ?? detail.fechaLocal;
  form.elements.horaInicio.value =
    draft?.horaInicio ?? detail.horaInicio?.slice(0, 5);
  const mutation = createVersionedMutation(
    detail.version,
    (values) => createScheduleClient(request).change(detail.id, values),
    (result) =>
      result?.id === detail.id &&
      result.folio === detail.folio &&
      result.estado === detail.estado &&
      Number.isInteger(result.version) &&
      result.version >= detail.version &&
      [result.inicioUtc, result.finUtc, result.finOcupacionUtc].every((value) =>
        Number.isFinite(Date.parse(value)),
      ) &&
      Boolean(result.zonaHoraria),
  );
  mutation.state.stale = Boolean(
    draft && (draft.stale || draft.version !== detail.version),
  );
  const active = () => form.isConnected && dialog.open && isCurrent();
  const remember = () => {
    if (isCurrent())
      saveAgendaDraft(key, {
        fechaLocal: form.elements.fechaLocal.value,
        horaInicio: form.elements.horaInicio.value,
        version: detail.version,
        stale: mutation.state.stale || mutation.state.busy,
      });
  };
  function sync(message) {
    save.disabled = Boolean(
      blocked || mutation.state.busy || mutation.state.stale,
    );
    reload.hidden = !mutation.state.stale;
    form.querySelectorAll('input').forEach((input) => {
      input.disabled = Boolean(blocked || mutation.state.busy);
    });
    if (message) {
      errorBox.textContent = message;
      errorBox.hidden = false;
    }
  }
  sync(
    mutation.state.stale
      ? 'Hay un conflicto pendiente o cambió la versión. Relee el horario antes de guardar.'
      : '',
  );
  form.oninput = remember;
  dialog.addEventListener(
    'close',
    () => {
      if (form.isConnected) remember();
    },
    { once: true },
  );
  reload.onclick = () => {
    if (!mutation.state.busy) {
      clearAgendaDraft(key);
      void onReload();
    }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (blocked || mutation.state.busy || mutation.state.stale || !isCurrent())
      return;
    const values = Object.fromEntries(new FormData(form));
    try {
      scheduleChange({ ...values, version: detail.version });
    } catch (error) {
      sync(error.message);
      errorBox.focus();
      return;
    }
    // Persistir el bloqueo antes de esperar evita reenviar al cerrar y reabrir durante una respuesta lenta.
    const pending = mutation.submit(values);
    remember();
    sync();
    errorBox.hidden = true;
    await pending;
    if (!active()) return;
    if (mutation.state.result) {
      clearAgendaDraft(key);
      await onChanged(mutation.state.result);
      return;
    }
    remember();
    sync(
      mutation.state.error?.status === 400
        ? mutation.state.error.message
        : 'Hay un conflicto o no se pudo confirmar el cambio. El horario anterior sigue visible; relee antes de guardar.',
    );
    errorBox.focus();
  };
}
