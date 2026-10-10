import { catalog } from './screens/catalogos/actions.js';
import { newBlock } from './screens/disponibilidad/actions.js';
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
import { scheduleRow } from './screens/disponibilidad/view.js';
import { validateSchedules, appointmentCovered } from '../demo/schedule.js';
let draftScheduleId = -1;

export async function handleClick(e) {
  try {
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
          await api(`/profesionales/${user.id}/servicios`, 'PUT', { servicioIds });
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
          const rows = list('schedules', state.tenantId).filter((s) => s.professionalId === user.id);
          const target = rows.filter((s) => s.branchId === branch.id);
          if (!target.length) throw new Error('Esta sucursal no tiene franjas de horario para activar.');
          const active = target.some((s) => s.enabled);
          await api(`/profesionales/${user.id}/horario`, 'PUT', schedulePayload(rows.map((s) => s.branchId === branch.id ? { ...s, enabled: !active } : s)));
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
      if (document.querySelectorAll(`[data-schedule-row][data-schedule-day="${row.dataset.scheduleDay}"]`).length > 1) row.remove();
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!isDemo && user.rol === 'profesional' && action === 'new-professional') { toast('Tu cuenta puede editar sus servicios desde Editar profesional.'); return; }
    if (!isDemo && (['new-appointment', 'new-client', 'copy-link', 'filter-reports', 'export-report'].includes(action) || e.target.closest('[data-slot-date], button[data-mode]'))) { toast(pending); return; }
    const actionMap = {
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
        catalog(type, Number(el.dataset[attr]));
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
          try { await api(`/bloqueos/${b.id}`, 'DELETE'); el.close(); await loadBackendData(); render(); toast('Bloqueo eliminado.'); } catch (error) { toast(error.message); } finally { submit.disabled = false; }
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
  if (e.target.id === 'schedule-professional') {
    state.scheduleProfessional = Number(e.target.value);
    render();
  }
});
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (
    !['schedule-form', 'business-form', 'notification-form'].includes(form.id)
  )
    return;
  e.preventDefault();
  if (!isDemo && form.id !== 'schedule-form') { toast(pending); return; }
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
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
      if (!isDemo) {
        await api(`/profesionales/${p}/horario`, 'PUT', schedulePayload(updates));
        try { await loadBackendData(); render(); toast('Horario guardado.'); } catch (error) { toast('Horario guardado. No se pudo actualizar la vista: ' + error.message); }
        return;
      }
      validateSchedules(updates, professional.branchIds);
      if (updates.some((s) => s.enabled && (s.start < '09:00' || s.end > '18:00')))
        throw new Error('Este prototipo admite atención de 09:00 a 18:00.');
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
      const target = form.querySelector('#schedule-error');
      target.textContent = error.message;
      target.hidden = false;
      target.focus();
    } else toast(error.message);
  } finally { submit.disabled = false; }
});
