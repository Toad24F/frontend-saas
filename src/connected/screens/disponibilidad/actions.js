import { api, loadBackendData, user } from '../../backend.js';
import { state, render } from '../../../shared/app.js';
import { list } from '../../../shared/data.js';
import { basicForm } from '../../../shared/forms.js';
import { toast, escape as esc } from '../../../shared/ui.js';
import { consultAffected, consultAvailability, currentAvailabilityData, invalidateProjection, refreshAvailabilityData, refreshConfiguration, saveConfiguration, selectSlot, selectedProfessional, setAffectedErrors, setProjection, setQueryErrors, setQueryFilters, validateStart } from './view.js';
import { assignmentDraft, clearAssignmentDraft, validateAssignmentSnapshot } from '../../../shared/screens/disponibilidad/branch-assignments.js';
import { validateInclusiveRange } from '../../../shared/screens/disponibilidad/operational-contract.js';
import { clearAvailabilityErrors, clearAvailabilityField, showAvailabilityErrors, showAvailabilityGeneralError, validateProjection } from '../../../shared/screens/disponibilidad/errors.js';

const route = (personId = selectedProfessional().id) => `/profesionales/${personId}`;
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

async function saveAssignedBranches(form) {
  if (user.rol !== 'admin_negocio') throw new Error('No tienes permiso para cambiar asignaciones.');
  const person = selectedProfessional();
  if (!person || person.id !== Number(form.dataset.personId)) throw new Error('La selección de profesional cambió. Actualiza la vista.');
  const current = assignmentDraft(person.id, person.branchIds);
  const branchIds = [...new FormData(form).getAll('branchIds')].map(Number);
  const [latestIds, branches] = await Promise.all([
    api(`/profesionales/${person.id}/sucursales`),
    api('/sucursales'),
  ]);
  validateAssignmentSnapshot(current.original, branchIds, latestIds, branches);
  await api(`/profesionales/${person.id}/sucursales`, 'PUT', { sucursalIds: branchIds });
  clearAssignmentDraft(person.id);
  invalidateProjection();
  try {
    await loadBackendData();
    await refreshAvailabilityData(true);
    render();
    toast('Asignaciones guardadas.');
  } catch (error) {
    render();
    toast('Asignaciones guardadas. No se pudo actualizar la vista: ' + error.message);
  }
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

export async function handleAvailabilityClick(event) {
  const slot = event.target.closest('[data-availability-slot]');
  if (slot) {
    selectSlot(slot.dataset.slotDate, slot.dataset.slotTime);
    return true;
  }
  const button = event.target.closest('[data-availability-action]');
  if (!button) return false;
  if (button.disabled) return true;
  button.disabled = true;
  const action = button.dataset.availabilityAction;
  const branchId = Number(button.dataset.branchId);
  // Las rutas de excepción por fecha ya no existen; Bloqueos sigue en su módulo.
  try {
    if (action === 'general') await editGeneral();
    else if (action === 'branch-services') await editBranch(branchId);
    else if (action === 'attention') await toggleAttention(branchId, button);
    else if (action === 'retry') await refreshAvailabilityData(true);
    else if (action === 'retry-configuration') await refreshConfiguration();
    else if (action === 'retry-query') await consultAvailability();
    else if (action === 'retry-affected') await consultAffected();
    else if (action === 'switch-manual') { setQueryFilters({ modalidad: 'manual' }); render(); }
  } finally { button.disabled = false; }
  return true;
}

document.addEventListener('submit', async (event) => {
  if (state.page !== 'disponibilidad') return;
  event.preventDefault();
  const form = event.target;
  if (form.id === 'branch-assignments-form') {
    const button = form.querySelector('[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    try { await saveAssignedBranches(form); }
    catch (error) {
      const target = form.querySelector('[data-assignment-error]');
      target.textContent = error.status === 409
        ? 'No se pudo quitar la sucursal: conserva horarios u otros ajustes de atención. Revísalos antes de reintentar.'
        : [403, 404].includes(error.status)
          ? 'La asignación o la sucursal ya no está disponible. Actualiza la página y vuelve a intentarlo.'
          : error.message || 'No se pudieron guardar las asignaciones. Inténtalo de nuevo.';
      target.hidden = false;
      target.focus();
    } finally { button.disabled = false; }
    return;
  }
  if (form.id === 'agenda-configuration-form') {
    const data = new FormData(form);
    // El contrato conectado usa el tiempo después de cada cita; el campo viejo pertenece solo a la demo.
    const numberField = (name) => data.get(name) === null || data.get(name) === '' ? Number.NaN : Number(data.get(name));
    const values = { modo: data.get('modo'), tiempoEntreCitasMinutos: numberField('tiempoEntreCitasMinutos'), anticipacionMinutos: numberField('anticipacionMinutos'), diasFuturos: numberField('diasFuturos') };
    const saved = await saveConfiguration(values);
    if (saved) toast('Reglas de agenda guardadas.');
    return;
  }
  if (form.id === 'availability-query-form') {
    const data = new FormData(form);
    const values = { personalId: Number(data.get('personalId')), sucursalId: Number(data.get('sucursalId')), servicioId: Number(data.get('servicioId')), from: data.get('from'), to: data.get('to'), modalidad: data.get('modalidad') };
    const errors = validateInclusiveRange(values.from, values.to);
    for (const key of ['personalId', 'sucursalId', 'servicioId']) if (!Number.isSafeInteger(values[key]) || values[key] <= 0) errors[key] = 'Selecciona un identificador válido.';
    if (Object.keys(errors).length) { setQueryFilters(values); setQueryErrors(errors); return; }
    await consultAvailability(values);
    return;
  }
  if (form.id === 'availability-validation-form') {
    const data = new FormData(form);
    const values = { personalId: Number(data.get('personalId')), sucursalId: Number(data.get('sucursalId')), servicioId: Number(data.get('servicioId')), fechaLocal: data.get('fechaLocal'), horaInicio: data.get('horaInicio'), modalidad: data.get('modalidad') };
    if ([values.personalId, values.sucursalId, values.servicioId]
      .some((value) => !Number.isSafeInteger(value) || value <= 0)) {
      showAvailabilityGeneralError(form, new Error('Consulta primero una combinación válida.'), '#availability-validation-error');
      return;
    }
    if (Object.keys(validateInclusiveRange(values.fechaLocal, values.fechaLocal)).length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.horaInicio || '')) {
      showAvailabilityGeneralError(form, new Error('Selecciona una fecha y hora válidas.'), '#availability-validation-error');
      return;
    }
    await validateStart(values);
    return;
  }
  if (form.id === 'affected-appointments-form') {
    const data = new FormData(form);
    const values = { personalId: data.get('personalId') ? Number(data.get('personalId')) : '', sucursalId: data.get('sucursalId') ? Number(data.get('sucursalId')) : '', from: data.get('from'), to: data.get('to') };
    const errors = validateInclusiveRange(values.from, values.to);
    for (const key of ['personalId', 'sucursalId']) if (values[key] !== '' && (!Number.isSafeInteger(values[key]) || values[key] <= 0)) errors[key] = 'Usa un identificador entero positivo.';
    if (Object.keys(errors).length) { setAffectedErrors(errors, values); return; }
    await consultAffected(values);
    return;
  }
  if (form.id !== 'projection-form') return;
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
  if (event.target.form?.id === 'availability-query-form' && event.target.name === 'modalidad') {
    const data = new FormData(event.target.form);
    setQueryFilters({ personalId: Number(data.get('personalId')) || '', sucursalId: Number(data.get('sucursalId')) || '', servicioId: Number(data.get('servicioId')) || '', from: data.get('from'), to: data.get('to'), modalidad: data.get('modalidad') });
    render();
  }
});
