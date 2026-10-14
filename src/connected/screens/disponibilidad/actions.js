import { api, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { list, TODAY, formatDate } from '../../../shared/data.js';
import { basicForm, field, select, errorSlot } from '../../../shared/forms.js';
import { modal, toast, escape as esc } from '../../../shared/ui.js';
import { exceptionPayload, minutesToClock } from './payload.js';
import { currentAvailabilityData, findAvailabilityException, invalidateProjection, refreshAvailabilityData, retryTeamExceptions, selectedProfessional, setProjection } from './view.js';
import { getBlockScope } from '../../../shared/screens/disponibilidad/view.js';
import { clearAvailabilityErrors, clearAvailabilityField, exceptionApiErrors, showAvailabilityErrors, showAvailabilityGeneralError, validateException, validateProjection } from '../../../shared/screens/disponibilidad/errors.js';

const route = (personId = selectedProfessional().id) => `/profesionales/${personId}`;
const branchOptions = (personId) => {
  const person = list('professionals', state.tenantId).find((item) => item.id === personId);
  return list('branches', state.tenantId).filter((branch) => person?.branchIds.includes(branch.id)).map((branch) => ({ id: branch.id, name: branch.name }));
};
const markedField = (...args) => field(...args).replace('class="form-field"', `class="form-field" data-availability-field="${args[1]}"`);
const markedSelect = (...args) => select(...args).replace('class="form-field"', `class="form-field" data-availability-field="${args[1]}"`);
const checkboxes = (items, selected) => `<div class="offering-checks" data-availability-field="serviceIds" tabindex="-1">${items.map((item) => `<label class="form-check"><input class="form-check-input" type="checkbox" name="serviceIds" value="${item.id}" ${selected.includes(item.id) ? 'checked' : ''} ${item.disabled ? 'disabled' : ''}><span>${esc(item.name)}</span></label>`).join('')}</div>`;
const serviceFormOptions = {
  onError(error, form) {
    if (/servicio|serviceIds/i.test(error.message || '')) showAvailabilityErrors(form, { serviceIds: error.message });
    else showAvailabilityGeneralError(form, error, '#form-error');
  },
};

async function editGeneral() {
  const services = await api(`${route()}/servicios`);
  const dialog = basicForm('Servicios generales', `<p class="field-hint">Selecciona los servicios que ofrece este profesional. Los ajustes por sucursal se conservan al desmarcar.</p>${checkboxes(services.map((item) => ({ id: item.id, name: item.nombre, disabled: !item.activo && !item.seleccionado })), services.filter((item) => item.seleccionado).map((item) => item.id))}`, async (form) => {
    await api(`${route()}/servicios`, 'PUT', { servicioIds: form.getAll('serviceIds').map(Number) });
    await refreshAvailabilityData(true);
  }, true, serviceFormOptions);
  const form = dialog.querySelector('#editor-form');
  form.addEventListener('change', (event) => clearAvailabilityField(form, event.target));
}

async function editBranch(branchId) {
  const branch = currentAvailabilityData()?.offering?.sucursales.find((item) => item.id === branchId);
  if (!branch) throw new Error('La sucursal no está asignada a este profesional.');
  const choice = await api(`${route()}/sucursales/${branchId}/servicios`);
  const allowed = branch.servicios.filter((item) => item.servicioActivo && item.seleccionGeneralActiva);
  const dialog = basicForm(`Servicios en ${esc(branch.nombre)}`, `<p class="field-hint">Solo aparecen los servicios activos y seleccionados en general.</p>${checkboxes(allowed.map((item) => ({ id: item.id, name: item.nombre })), choice.servicioIds || [])}`, async (form) => {
    await api(`${route()}/sucursales/${branchId}/servicios`, 'PUT', { servicioIds: form.getAll('serviceIds').map(Number) });
    await refreshAvailabilityData(true);
  }, true, serviceFormOptions);
  const form = dialog.querySelector('#editor-form');
  form.addEventListener('change', (event) => clearAvailabilityField(form, event.target));
}

async function toggleAttention(branchId, button) {
  const branch = currentAvailabilityData()?.offering?.sucursales.find((item) => item.id === branchId);
  if (!branch) throw new Error('La sucursal no está asignada.');
  button.disabled = true;
  try {
    await api(`${route()}/sucursales/${branchId}/atencion`, 'PUT', { activo: !branch.atencionActiva });
    await refreshAvailabilityData(true);
    toast(branch.atencionActiva ? 'Atención pausada en la sucursal.' : 'Atención activada en la sucursal.');
  } catch (error) { button.disabled = false; throw error; }
}

const slotRow = (slot = {}, index = 0) => `<div class="exception-row" data-exception-row data-row-index="${index}" data-id="${slot.id || ''}"><div class="exception-time-field" data-availability-field="slot-${index}-start"><label>Entrada<input class="form-control" type="time" name="start-${index}" required value="${minutesToClock(slot.inicioMinutos)}"></label></div><div class="exception-time-field" data-availability-field="slot-${index}-end"><label>Salida<input class="form-control" type="time" name="end-${index}" required value="${minutesToClock(slot.finMinutos)}"></label></div><div class="exception-break" data-availability-field="slot-${index}-break"><label>Descanso desde<input class="form-control" type="time" name="breakStart-${index}" value="${minutesToClock(slot.descansoInicioMinutos)}"></label><label>Descanso hasta<input class="form-control" type="time" name="breakEnd-${index}" value="${minutesToClock(slot.descansoFinMinutos)}"></label></div><button class="icon-btn" type="button" data-remove-exception-row aria-label="Quitar franja">×</button></div>`;

function editException(existing = null, fixedPersonId = null) {
  const people = list('professionals', state.tenantId);
  const scope = getBlockScope();
  const initialPersonId = fixedPersonId || (scope ? Number(scope) : user.rol === 'admin_negocio' ? null : selectedProfessional().id);
  const options = branchOptions(initialPersonId);
  if (initialPersonId && !options.length) throw new Error('Este profesional no tiene sucursales asignadas.');
  const branch = existing?.sucursalId || options[0]?.id || '';
  const professionalField = existing
    ? `<p class="field-hint">Profesional: ${esc(people.find((person) => person.id === initialPersonId)?.name || 'Profesional')}</p>`
    : markedSelect('Profesional', 'professionalId', [{ id: '', name: 'Selecciona profesional' }, ...people], initialPersonId || '');
  const branchChoices = options.length ? options : [{ id: '', name: 'Selecciona primero un profesional' }];
  const initialSlots = existing?.franjas?.length ? existing.franjas : existing ? [] : [{}];
  const dialog = basicForm(existing ? 'Editar excepción' : 'Nueva excepción', `${professionalField}<div class="form-row-two">${markedField('Fecha', 'date', existing?.fechaLocal || TODAY, 'date', `required ${existing ? 'readonly' : ''}`)}${markedSelect('Sucursal', 'branchId', branchChoices, branch)}</div><label class="form-check"><input class="form-check-input" type="checkbox" id="exception-closed" ${existing && !existing.franjas.length ? 'checked' : ''}><span>Cierre de todo el día</span></label><div id="exception-slots" data-availability-field="slots" tabindex="-1">${initialSlots.map(slotRow).join('')}</div><button type="button" class="btn btn-light" id="add-exception-row">Agregar franja</button><p class="field-hint">Al eliminar la excepción se restablece el horario semanal. Guardar un cierre registra una excepción explícita.</p>`, async (form) => {
    const date = form.get('date');
    const personId = existing ? initialPersonId : Number(form.get('professionalId'));
    const branchId = existing?.sucursalId || Number(form.get('branchId'));
    const closed = dialog.querySelector('#exception-closed').checked;
    const rows = closed ? [] : [...dialog.querySelectorAll('[data-exception-row]')].map((row) => ({
      id: row.dataset.id, start: row.querySelector('[name^="start-"]').value,
      end: row.querySelector('[name^="end-"]').value,
      breakStart: row.querySelector('[name^="breakStart-"]').value,
      breakEnd: row.querySelector('[name^="breakEnd-"]').value,
    }));
    await api(`${route(personId)}/excepciones/${date}`, 'PUT', exceptionPayload(branchId, rows));
    invalidateProjection();
    await refreshAvailabilityData(true);
  }, true, {
    validate(form) {
      const data = new FormData(form);
      const personId = existing ? initialPersonId : Number(data.get('professionalId'));
      const branchId = existing?.sucursalId || Number(data.get('branchId'));
      if (existing) { data.set('professionalId', String(initialPersonId)); data.set('branchId', String(existing.sucursalId)); }
      const rows = dialog.querySelector('#exception-closed').checked ? [] : [...dialog.querySelectorAll('[data-exception-row]')].map((row) => ({
        index: Number(row.dataset.rowIndex),
        start: row.querySelector('[name^="start-"]').value, end: row.querySelector('[name^="end-"]').value,
        breakStart: row.querySelector('[name^="breakStart-"]').value, breakEnd: row.querySelector('[name^="breakEnd-"]').value,
      }));
      const errors = validateException(data, rows, dialog.querySelector('#exception-closed').checked, branchOptions(personId).some((item) => item.id === branchId));
      if (!Object.keys(errors).length) { clearAvailabilityErrors(form); return true; }
      showAvailabilityErrors(form, errors);
      return false;
    },
    onError(error, form) {
      const rowIndexes = [...form.querySelectorAll('[data-exception-row]')].map((row) => Number(row.dataset.rowIndex));
      const errors = exceptionApiErrors(error, rowIndexes);
      if (errors) showAvailabilityErrors(form, errors);
      else showAvailabilityGeneralError(form, error, '#form-error');
    },
  });
  if (existing) dialog.querySelector('#f-branchId').disabled = true;
  else dialog.querySelector('#f-professionalId').onchange = (event) => {
    const branches = branchOptions(Number(event.target.value));
    const selectBranch = dialog.querySelector('#f-branchId');
    selectBranch.replaceChildren(...(branches.length ? branches : [{ id: '', name: 'Sin sucursales asignadas' }]).map((item) => new Option(item.name, item.id)));
  };
  let nextIndex = initialSlots.length;
  const slots = dialog.querySelector('#exception-slots');
  const closed = dialog.querySelector('#exception-closed');
  const add = dialog.querySelector('#add-exception-row');
  const sync = () => { slots.hidden = closed.checked; add.hidden = closed.checked; slots.querySelectorAll('input[required]').forEach((input) => input.disabled = closed.checked); };
  closed.onchange = sync;
  add.onclick = () => { slots.insertAdjacentHTML('beforeend', slotRow({}, nextIndex++)); slots.querySelector('.exception-row:last-child input')?.focus(); };
  slots.onclick = (event) => { if (event.target.closest('[data-remove-exception-row]')) event.target.closest('[data-exception-row]').remove(); };
  const form = dialog.querySelector('#editor-form');
  form.addEventListener('input', (event) => clearAvailabilityField(form, event.target));
  form.addEventListener('change', (event) => clearAvailabilityField(form, event.target));
  sync();
}

function deleteException(date, branchId, personId) {
  const dialog = modal('Eliminar excepción', `<div class="dialog-body"><p>Se restaurará el horario semanal del ${esc(formatDate(date))} en esta sucursal.</p>${errorSlot}</div><div class="dialog-footer"><button type="button" class="btn btn-light" data-dismiss>Conservar</button><button type="button" class="btn btn-danger-soft" data-confirm>Eliminar excepción</button></div>`);
  dialog.querySelector('[data-dismiss]').onclick = () => dialog.close();
  dialog.querySelector('[data-confirm]').onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await api(`${route(personId)}/excepciones/${date}?sucursalId=${branchId}`, 'DELETE');
      invalidateProjection();
      dialog.close();
      await refreshAvailabilityData(true);
      toast('Excepción eliminada.');
    } catch (error) {
      const target = dialog.querySelector('#form-error'); target.textContent = error.message; target.hidden = false; target.focus();
    } finally { button.disabled = false; }
  };
}

export async function handleAvailabilityClick(event) {
  const button = event.target.closest('[data-availability-action]');
  if (!button) return false;
  if (button.disabled) return true;
  button.disabled = true;
  const action = button.dataset.availabilityAction;
  const branchId = Number(button.dataset.branchId);
  const professionalId = Number(button.dataset.professionalId);
  try {
    if (action === 'general') await editGeneral();
    else if (action === 'branch-services') await editBranch(branchId);
    else if (action === 'attention') await toggleAttention(branchId, button);
    else if (action === 'new-exception') editException();
    else if (action === 'edit-exception') {
      const item = findAvailabilityException(professionalId, button.dataset.date, branchId);
      if (item) editException(item, professionalId);
    } else if (action === 'delete-exception') deleteException(button.dataset.date, branchId, professionalId);
    else if (action === 'retry') await refreshAvailabilityData(true);
    else if (action === 'retry-team') retryTeamExceptions();
  } finally { button.disabled = false; }
  return true;
}

document.addEventListener('submit', async (event) => {
  if (event.target.id !== 'projection-form' || state.page !== 'disponibilidad') return;
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('[type="submit"]');
  const from = form.elements.from.value, to = form.elements.to.value;
  button.disabled = true;
  try {
    const errors = validateProjection(from, to);
    if (Object.keys(errors).length) { showAvailabilityErrors(form, errors); return; }
    clearAvailabilityErrors(form);
    const data = await api(`${route()}/atencion?desde=${from}&hasta=${to}`);
    setProjection(data, from, to);
  } catch (error) { showAvailabilityGeneralError(form, error, '#projection-error'); }
  finally { button.disabled = false; }
});

document.addEventListener('input', (event) => {
  if (event.target.closest('#projection-form')) clearAvailabilityField(event.target.form, event.target);
});
document.addEventListener('change', (event) => {
  if (event.target.closest('#projection-form')) clearAvailabilityField(event.target.form, event.target);
});
