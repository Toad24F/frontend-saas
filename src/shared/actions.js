import { catalog } from './screens/catalogos/actions.js';
import { newBlock, editBlock } from './screens/disponibilidad/actions.js';
import { switchTenant, newTenant } from './screens/plataforma/actions.js';
import { isDemo, pending, api, user, loadBackendData, schedulePayload } from '../connected/backend.js';
import { state, render, navigate } from './app.js';
import {
  db,
  list,
  resource,
  tenantById,
  TODAY,
  minutes,
  date,
} from './data.js';
import { icon } from './icons.js';
import { modal, toast, escape as esc } from './ui.js';
import { reportState } from '../demo/screens/reportes/state.js';
import { appointmentTable } from './screens/agenda/table.js';
import { scheduleRow, setBlockScope } from './screens/disponibilidad/view.js';
import { appointmentCovered } from '../demo/schedule.js';
import { clearAvailabilityErrors, clearAvailabilityField, showAvailabilityErrors, showAvailabilityGeneralError, validateScheduleRows, scheduleApiErrors } from './screens/disponibilidad/errors.js';
import { validateConfiguration, validateInclusiveRange } from './screens/disponibilidad/operational-contract.js';
let draftScheduleId = -1;

export async function handleClick(e) {
  try {
    if (isDemo && state.page === 'disponibilidad') {
      const slot = e.target.closest('[data-availability-slot]');
      const operationalAction = e.target.closest('[data-availability-action]');
      if (slot) {
        (await import('../demo/screens/disponibilidad/view.js')).demoSelectSlot(slot.dataset.slotDate, slot.dataset.slotTime);
        return;
      }
      if (operationalAction?.dataset.availabilityAction === 'switch-manual') {
        (await import('../demo/screens/disponibilidad/view.js')).demoSwitchManual();
        return;
      }
    }
    if (!isDemo && user.rol === 'admin_negocio' && state.page === 'servicios') {
      const service = e.target.closest('[data-delete-service]');
      if (service) {
        (await import('../connected/screens/servicios/actions.js')).confirmServiceDeletion(Number(service.dataset.deleteService));
        return;
      }
    }
    if (!isDemo && user.rol === 'admin_negocio' && state.page === 'sucursales') {
      const branch = e.target.closest('[data-delete-branch]');
      if (branch) {
        (await import('../connected/screens/sucursales/actions.js')).confirmBranchDeletion(Number(branch.dataset.deleteBranch));
        return;
      }
    }
    if (!isDemo && user.rol === 'admin_negocio' && state.page === 'profesionales') {
      const professional = e.target.closest('[data-professional-action]');
      if (professional) {
        (await import('../connected/screens/profesionales/actions.js')).professionalAction(professional.dataset.professionalAction, Number(professional.dataset.professionalId));
        return;
      }
    }
    if (!isDemo && state.page === 'disponibilidad') {
      const availability = await import('../connected/screens/disponibilidad/actions.js');
      if (await availability.handleAvailabilityClick(e)) return;
    }
    if (!isDemo && user.rol === 'superadmin' && state.page === 'negocio') {
      const businessAction = e.target.closest('[data-business-action]');
      const retryDelivery = e.target.closest('[data-retry-delivery]');
      if (businessAction || retryDelivery) {
        const { businessAction: run } = await import('../connected/screens/negocio/actions.js');
        run(businessAction?.dataset.businessAction || 'retry', retryDelivery?.dataset.retryDelivery);
        return;
      }
    }
    if (!isDemo && user.rol === 'admin_negocio' && state.page === 'recepcionistas') {
      const detail = e.target.closest('[data-reception-detail]');
      const accountAction = e.target.closest('[data-reception-action]');
      if (detail || accountAction) {
        const reception = await import('../connected/screens/recepcionistas/actions.js');
        if (detail) await reception.receptionistDetail(Number(detail.dataset.receptionDetail));
        else reception.receptionistAction(accountAction.dataset.receptionAction, Number(accountAction.dataset.receptionId));
        return;
      }
    }
    const serviceToggle = e.target.closest('[data-toggle-service]');
    if (serviceToggle) {
      const service = resource('services', Number(serviceToggle.dataset.toggleService), state.tenantId);
      serviceToggle.disabled = true;
      try {
        if (isDemo) service.active = service.active === false;
        else if (user.rol === 'profesional') {
          const professional = list('professionals', state.tenantId)[0];
          const serviceIds = professional.serviceIds.includes(service.id)
            ? professional.serviceIds.filter((id) => id !== service.id)
            : [...professional.serviceIds, service.id];
          await api(`/profesionales/${user.id}/servicios`, 'PUT', { servicioIds: serviceIds });
        } else await api(`/servicios/${service.id}/${service.active === false ? 'reactivar' : 'desactivar'}`, 'POST', {});
        if (!isDemo) await loadBackendData();
        render();
        toast('Servicio actualizado.');
      } catch (error) { toast(error.message); serviceToggle.disabled = false; }
      return;
    }
    const branchToggle = e.target.closest('[data-toggle-branch]');
    if (branchToggle) {
      const branch = resource('branches', Number(branchToggle.dataset.toggleBranch), state.tenantId);
      branchToggle.disabled = true;
      try {
        if (isDemo) branch.active = branch.active === false;
        else if (user.rol === 'profesional') {
          await api(`/profesionales/${user.id}/sucursales/${branch.id}/atencion`, 'PUT', { activo: !branch.active });
        } else await api(`/sucursales/${branch.id}/${branch.active === false ? 'reactivar' : 'desactivar'}`, 'POST', {});
        if (!isDemo) await loadBackendData();
        render();
        toast(user?.rol === 'profesional' && !isDemo ? 'Disponibilidad en sucursal actualizada.' : 'Sucursal actualizada.');
      } catch (error) { toast(error.message); branchToggle.disabled = false; }
      return;
    }
    const addSchedule = e.target.closest('[data-add-schedule]');
    if (addSchedule) {
      const day = Number(addSchedule.dataset.addSchedule);
      const current = [...document.querySelectorAll(`[data-schedule-row][data-schedule-day="${day}"]`)];
      const selected = resource('professionals', document.querySelector('#schedule-professional').value, state.tenantId);
      const row = current.at(-1);
      const id = draftScheduleId--;
      row.insertAdjacentHTML('afterend', scheduleRow({ id, day, enabled: true, branchId: Number(row.querySelector('select').value), start: '', end: '', breakStart: '', breakEnd: '' }, selected, state.tenantId, true, current.length));
      document.querySelector(`[data-schedule-row][data-id="${id}"] input[type="time"]`).focus();
      return;
    }
    const removeSchedule = e.target.closest('[data-remove-schedule]');
    if (removeSchedule) {
      const row = removeSchedule.closest('[data-schedule-row]');
      const siblings = document.querySelectorAll(`[data-schedule-row][data-schedule-day="${row.dataset.scheduleDay}"]`);
      if (!isDemo && siblings.length === 1 && Number(row.dataset.id) > 0) {
        const selected = resource('professionals', document.querySelector('#schedule-professional').value, state.tenantId);
        row.insertAdjacentHTML('afterend', scheduleRow({ id: draftScheduleId--, day: Number(row.dataset.scheduleDay), branchId: selected.branchIds[0] || null, enabled: false, start: '', end: '', breakStart: '', breakEnd: '' }, selected, state.tenantId));
      }
      if (!isDemo || siblings.length > 1) row.remove();
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!isDemo && user.rol === 'profesional' && action === 'new-professional') { toast('Tu cuenta puede editar sus servicios desde Editar profesional.'); return; }
    if (!isDemo && (['new-appointment', 'new-client', 'copy-link', 'filter-reports', 'export-report'].includes(action) || e.target.closest('[data-slot-date], button[data-mode]'))) { toast(pending); return; }
    const actionMap = {
      'new-receptionist': async () => (await import('../connected/screens/recepcionistas/actions.js')).newReceptionist(),
      'change-password': async () => (await import('../connected/screens/cuenta/actions.js')).changePassword(),
      'logout-account': async () => (await import('../connected/screens/cuenta/actions.js')).closeAccountSession(),
      'refresh-license': async () => (await import('../connected/screens/cuenta/view.js')).refreshOwnLicense(),
      'back-platform': () => navigate('plataforma'),
      'retry-business-detail': async () => (await import('../connected/screens/negocio/view.js')).refreshBusinessDetail(),
      'new-appointment': async () => (await import('./screens/agenda/actions.js')).manualAppointment(),
      'go-agenda': () => navigate('agenda'),
      'new-client': async () => (await import('../demo/screens/clientes/actions.js')).newClient(),
      'new-service': () => catalog('services'),
      'new-branch': () => catalog('branches'),
      'new-professional': () => catalog('professionals'),
      'new-block': newBlock,
      'switch-tenant': switchTenant,
      'new-tenant': newTenant,
      'copy-link': async () => {
        const url = `${location.origin}/reservas/${tenantById(state.tenantId).slug}`;
        try {
          await navigator.clipboard.writeText(url);
          toast('Enlace copiado.');
        } catch {
          modal(
            'Enlace de reservas',
            `<div class="dialog-body"><label for="copy-url" class="form-label">Copia este enlace</label><input id="copy-url" class="form-control" readonly value="${esc(url)}"/></div>`,
          );
          document.querySelector('#copy-url').select();
        }
      },
      'filter-reports': () => {
        const from = document.querySelector('#report-from').value,
          to = document.querySelector('#report-to').value;
        if (!from || !to || from > to) {
          toast('Selecciona un rango válido de fechas.');
          return;
        }
        reportState.from = from;
        reportState.to = to;
        reportState.branch = document.querySelector('#report-branch').value;
        render();
      },
      'export-report': () => {
        toast('Elige “Guardar como PDF” en el diálogo de impresión.');
        window.print();
      },
    };
    if (actionMap[action]) {
      await actionMap[action]();
      return;
    }
    const app = e.target.closest('[data-appointment]');
    if (app) {
      (await import('./screens/agenda/actions.js')).detail(Number(app.dataset.appointment));
      return;
    }
    const cell = e.target.closest('[data-slot-date]');
    if (cell) {
      (await import('./screens/agenda/actions.js')).manualAppointment(cell.dataset.slotDate, cell.dataset.slotTime);
      return;
    }
    for (const [attr, type] of [
      ['editService', 'services'],
      ['editBranch', 'branches'],
      ['editProfessional', 'professionals'],
    ]) {
      const selector = attr.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
      const el = e.target.closest(`[data-${selector}]`);
      if (el) {
        await catalog(type, Number(el.dataset[attr]));
        return;
      }
    }
    const client = e.target.closest('[data-client]');
    if (client) {
      const c = resource(
        'clients',
        Number(client.dataset.client),
        state.tenantId,
      );
      modal(
        esc(c.name),
        `<div class="dialog-body"><p class="mb-4">${icon('message')} ${esc(c.phone)} · Historial de citas</p>${appointmentTable(list('appointments', state.tenantId).filter((a) => a.clientId === c.id))}</div>`,
        true,
      );
      return;
    }
    const mode = e.target.closest('[data-mode]');
    if (mode) {
      if (!['free', 'compact'].includes(mode.dataset.mode)) return;
      tenantById(state.tenantId).mode = mode.dataset.mode;
      render();
      toast('Modo de agenda actualizado para este negocio.');
      return;
    }
    const remove = e.target.closest('[data-remove-block]');
    if (remove) {
      const b = resource(
        'blocks',
        Number(remove.dataset.removeBlock),
        state.tenantId,
      );
      const el = modal(
        'Eliminar bloqueo',
        `<div class="dialog-body"><p>Se volverá a ofrecer disponibilidad durante “${esc(b.reason)}”.</p></div><div class="dialog-footer"><button id="keep-block" class="btn btn-light">Conservar</button><button id="confirm-remove-block" class="btn btn-danger-soft">Eliminar bloqueo</button></div>`,
      );
      el.querySelector('#keep-block').onclick = () => el.close();
      el.querySelector('#confirm-remove-block').onclick = async () => {
        if (!isDemo) {
          const submit = el.querySelector('#confirm-remove-block'); submit.disabled = true;
          try { await api(`/bloqueos/${b.id}`, 'DELETE'); (await import('../connected/screens/disponibilidad/view.js')).invalidateProjection(); el.close(); await loadBackendData(); render(); toast('Bloqueo eliminado.'); } catch (error) { toast(error.message); } finally { submit.disabled = false; }
          return;
        }
        db.blocks = db.blocks.filter(
          (x) => !(x.id === b.id && x.tenantId === state.tenantId),
        );
        el.close();
        render();
        toast('Bloqueo eliminado.');
      };
      return;
    }
    const edit = e.target.closest('[data-edit-block]');
    if (edit) {
      const block = resource('blocks', Number(edit.dataset.editBlock), state.tenantId);
      if (!isDemo && user.rol === 'profesional' && block.professionalId !== user.id) throw new Error('Solo puedes editar tus propios bloqueos.');
      editBlock(block);
      return;
    }
    const toggle = e.target.closest('[data-toggle-tenant]');
    if (toggle) {
      const t = tenantById(toggle.dataset.toggleTenant);
      const el = modal(
        t.suspended ? 'Reactivar negocio' : 'Suspender negocio',
        `<div class="dialog-body"><p>${esc(t.name)} ${isDemo ? (t.suspended ? 'volverá a mostrar' : 'dejará de mostrar') + ' su portal público en esta simulación.' : (t.suspended ? 'reactivará su licencia.' : 'solicitará la suspensión de su licencia según el plazo del servidor.')}</p></div><div class="dialog-footer"><button class="btn btn-light" id="dismiss-tenant">Volver</button><button class="btn btn-primary" id="confirm-tenant">${t.suspended ? 'Reactivar' : 'Suspender'}</button></div>`,
      );
      el.querySelector('#dismiss-tenant').onclick = () => el.close();
      el.querySelector('#confirm-tenant').onclick = async () => {
        if (!isDemo) {
          const submit = el.querySelector('#confirm-tenant'); submit.disabled = true;
          try { if (!t.licenseId) throw new Error('Este negocio aún no tiene una licencia disponible.'); const result = await api(`/licencias/${t.licenseId}/${t.suspended ? 'reactivar' : 'suspender'}`, 'POST', {}); el.close(); await loadBackendData(); render(); toast('Licencia: ' + result.estado); } catch (error) { toast(error.message); } finally { submit.disabled = false; }
          return;
        }
        t.suspended = !t.suspended;
        el.close();
        render();
        toast('Estado del negocio actualizado.');
      };
      return;
    }
    const license = e.target.closest('[data-license-tenant]');
    if (license) {
      if (!isDemo) {
        const t = tenantById(license.dataset.licenseTenant);
        if (!t.licenseId) throw new Error('Este negocio aún no tiene una licencia disponible.');
        const el = modal('Renovar licencia', `<div class="dialog-body"><p>Se agregará un año calendario a la licencia de ${esc(t.name)}.</p></div><div class="dialog-footer"><button class="btn btn-light" data-dismiss>Cancelar</button><button class="btn btn-primary" id="confirm-renew">Renovar licencia</button></div>`);
        el.querySelector('[data-dismiss]').onclick = () => el.close();
        el.querySelector('#confirm-renew').onclick = async () => {
          const submit = el.querySelector('#confirm-renew'); submit.disabled = true;
          try { await api(`/licencias/${t.licenseId}/renovar`, 'POST', {}); el.close(); await loadBackendData(); render(); toast('Licencia renovada.'); } catch (error) { toast(error.message); } finally { submit.disabled = false; }
        };
        return;
      }
      tenantById(license.dataset.licenseTenant).license = '90 días';
      render();
      toast('Licencia de demostración renovada por 90 días.');
    }
  } catch (error) {
    toast(error.message);
  }
}
document.addEventListener('input', (e) => {
  if (e.target.id === 'directory-search') {
    state.search = e.target.value;
    render();
    document.querySelector('#directory-search').focus();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'block-professional') {
    setBlockScope(e.target.value);
    if (e.target.value) state.scheduleProfessional = Number(e.target.value);
    render();
  } else if (['schedule-professional', 'offering-professional', 'projection-professional'].includes(e.target.id)) {
    state.scheduleProfessional = Number(e.target.value);
    render();
  }
});
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (isDemo && state.page === 'disponibilidad' && form.id === 'branch-assignments-form') {
    e.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      const branchIds = [...new FormData(form).getAll('branchIds')].map(Number);
      (await import('../demo/screens/disponibilidad/view.js')).saveDemoAssignedBranches(Number(form.dataset.personId), branchIds);
    } catch (error) {
      const target = form.querySelector('[data-assignment-error]');
      target.textContent = error.message;
      target.hidden = false;
      target.focus();
    } finally { submit.disabled = false; }
    return;
  }
  if (isDemo && state.page === 'disponibilidad' && ['agenda-configuration-form', 'availability-query-form', 'availability-validation-form', 'affected-appointments-form'].includes(form.id)) {
    e.preventDefault();
    const demo = await import('../demo/screens/disponibilidad/view.js');
    const data = new FormData(form);
    if (form.id === 'agenda-configuration-form') {
      const values = { modo: data.get('modo'), intervaloMinutos: Number(data.get('intervaloMinutos')), anticipacionMinutos: Number(data.get('anticipacionMinutos')), diasFuturos: Number(data.get('diasFuturos')) };
      if (demo.demoSaveConfiguration(values, validateConfiguration(values))) toast('Reglas guardadas en esta demostración.');
    } else if (form.id === 'availability-query-form') {
      const values = { personalId: Number(data.get('personalId')), sucursalId: Number(data.get('sucursalId')), servicioId: Number(data.get('servicioId')), from: data.get('from'), to: data.get('to'), modalidad: data.get('modalidad') };
      const errors = validateInclusiveRange(values.from, values.to);
      for (const key of ['personalId', 'sucursalId', 'servicioId']) if (!Number.isSafeInteger(values[key]) || values[key] <= 0) errors[key] = 'Selecciona un identificador válido.';
      demo.demoQuery(values, errors);
    } else if (form.id === 'availability-validation-form') {
      demo.demoValidate({ personalId: Number(data.get('personalId')), sucursalId: Number(data.get('sucursalId')), servicioId: Number(data.get('servicioId')), fechaLocal: data.get('fechaLocal'), horaInicio: data.get('horaInicio'), modalidad: data.get('modalidad') });
    } else {
      const values = { personalId: data.get('personalId') ? Number(data.get('personalId')) : '', sucursalId: data.get('sucursalId') ? Number(data.get('sucursalId')) : '', from: data.get('from'), to: data.get('to') };
      demo.demoAffected(values, validateInclusiveRange(values.from, values.to));
    }
    return;
  }
  if (
    !['schedule-form', 'business-form', 'notification-form'].includes(form.id)
  )
    return;
  e.preventDefault();
  if (!isDemo && form.id !== 'schedule-form') { toast(pending); return; }
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  let scheduleRows = [];
  try {
    const f = new FormData(form),
      t = tenantById(state.tenantId);
    if (form.id === 'business-form') {
      if (!f.get('name').trim())
        throw new Error('El nombre del negocio es obligatorio.');
      t.name = f.get('name').trim();
      t.email = f.get('email');
      t.phone = f.get('phone');
    }
    if (form.id === 'notification-form') {
      t.confirmations = f.has('confirm');
      t.reminders = f.has('remind');
      t.reminder = Number(f.get('hours'));
    }
    if (form.id === 'schedule-form') {
      const p = Number(document.querySelector('#schedule-professional').value);
      const professional = resource('professionals', p, state.tenantId);
      const updates = [...form.querySelectorAll('[data-schedule-row]')].map((row) => {
        const id = Number(row.dataset.id);
        return {
          id, tenantId: state.tenantId, professionalId: p, day: Number(row.dataset.scheduleDay),
          enabled: f.has(`enabled-${id}`), branchId: Number(f.get(`branch-${id}`)),
          start: f.get(`start-${id}`), end: f.get(`end-${id}`),
          breakStart: f.get(`breakStart-${id}`), breakEnd: f.get(`breakEnd-${id}`),
        };
      });
      scheduleRows = updates;
      const scheduleErrors = validateScheduleRows(updates, professional.branchIds, isDemo);
      if (Object.keys(scheduleErrors).length) {
        showAvailabilityErrors(form, scheduleErrors);
        return;
      }
      clearAvailabilityErrors(form);
      if (!isDemo) {
        await api(`/profesionales/${p}/horario`, 'PUT', schedulePayload(updates));
        (await import('../connected/screens/disponibilidad/view.js')).invalidateProjection();
        try { await loadBackendData(); render(); toast('Horario guardado.'); } catch (error) { toast('Horario guardado. No se pudo actualizar la vista: ' + error.message); }
        return;
      }
      const active = list('appointments', state.tenantId).filter((a) =>
        a.professionalId === p && a.date >= TODAY &&
        !['cancelada', 'no_asistio', 'completada'].includes(a.status));
      if (active.some((a) => !appointmentCovered(a, updates)))
        throw new Error('El cambio dejaría citas activas fuera del horario. Reprograma esas citas primero.');
      let nextId = Math.max(0, ...db.schedules.map((s) => s.id)) + 1;
      db.schedules = db.schedules.filter((s) => !(s.tenantId === state.tenantId && s.professionalId === p))
        .concat(updates.map((s) => ({ ...s, id: s.id < 0 ? nextId++ : s.id })));
    }
    render();
    toast('Configuración guardada en esta demostración.');
  } catch (error) {
    if (form.id === 'schedule-form') {
      const errors = scheduleApiErrors(error, scheduleRows);
      if (errors) showAvailabilityErrors(form, errors);
      else showAvailabilityGeneralError(form, error, '#schedule-error');
    } else toast(error.message);
  } finally { submit.disabled = false; }
});

document.addEventListener('input', (event) => {
  if (event.target.closest('#schedule-form')) clearAvailabilityField(event.target.form, event.target);
});
document.addEventListener('change', (event) => {
  if (event.target.closest('#schedule-form')) clearAvailabilityField(event.target.form, event.target);
});
