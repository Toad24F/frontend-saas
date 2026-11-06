import { escape as esc } from '../../ui.js';

const drafts = new Map();
const sorted = (ids) => [...ids].map(Number).sort((a, b) => a - b);
export const sameBranchIds = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

export function validateAssignmentSnapshot(original, selected, latest, branches) {
  if (!sameBranchIds(original, latest)) throw new Error('Las asignaciones cambiaron desde que abriste esta vista. Actualiza la página y revisa tu selección.');
  if (selected.some((id) => !branches.some((branch) => branch.id === id && (branch.activo || latest.includes(id))))) {
    throw new Error('Una sucursal ya no está disponible. Actualiza la página y revisa tu selección.');
  }
}

export function assignmentDraft(personId, assignedIds) {
  if (!drafts.has(personId)) drafts.set(personId, { personId, original: sorted(assignedIds), selected: sorted(assignedIds) });
  return drafts.get(personId);
}

export function clearAssignmentDraft(personId) {
  if (personId == null) drafts.clear();
  else drafts.delete(personId);
}

export function updateAssignmentDraft(form) {
  const current = assignmentDraft(Number(form.dataset.personId), []);
  current.selected = sorted([...form.querySelectorAll('input[name="branchIds"]:checked')].map((input) => input.value));
  const changed = !sameBranchIds(current.original, current.selected);
  const removed = current.original.filter((id) => !current.selected.includes(id));
  form.querySelector('[type="submit"]').disabled = !changed;
  form.querySelector('[data-assignment-summary]').textContent = changed
    ? `${current.selected.filter((id) => !current.original.includes(id)).length} por asignar · ${removed.length} por quitar`
    : 'Sin cambios pendientes';
  form.querySelector('[data-assignment-warning]').hidden = !removed.length;
  form.querySelectorAll('[data-assignment-row]').forEach((row) => {
    const checked = row.querySelector('input').checked;
    row.querySelector('[data-assignment-status]').textContent = checked ? 'Asignada' : row.dataset.inactive === 'true' ? 'Inactiva' : 'Sin asignar';
  });
  const error = form.querySelector('[data-assignment-error]');
  error.hidden = true;
  error.textContent = '';
  return current;
}

export function assignmentLocks(person, schedules, appointments = []) {
  const locks = new Map();
  schedules.filter((row) => row.professionalId === person.id && row.branchId != null && row.id > 0).forEach((row) => locks.set(row.branchId, 'Conserva franjas de horario, aunque estén inactivas. Revísalas antes de quitar la asignación.'));
  appointments.filter((item) => item.professionalId === person.id && !['cancelada', 'no_asistio', 'completada'].includes(item.status)).forEach((item) => locks.set(item.branchId, 'Conserva citas activas en esta demostración.'));
  return locks;
}

export function branchAssignmentForm(person, branches, demo = false, locks = new Map()) {
  const current = assignmentDraft(person.id, person.branchIds || []);
  current.selected = sorted([...new Set([...current.selected, ...current.original.filter((id) => locks.has(id))])]);
  const changed = !sameBranchIds(current.original, current.selected);
  const removed = current.original.filter((id) => !current.selected.includes(id));
  const added = current.selected.filter((id) => !current.original.includes(id));
  return `<form id="branch-assignments-form" data-person-id="${person.id}">
    <div class="assigned-branch-list" role="group" aria-label="Sucursales disponibles">${branches.map((branch) => {
      const active = branch.active !== false;
      const initiallyAssigned = current.original.includes(branch.id);
      const selected = current.selected.includes(branch.id);
      const reason = initiallyAssigned && locks.get(branch.id);
      const reasonId = `assignment-lock-${person.id}-${branch.id}`;
      return `<label class="assigned-branch-row" data-assignment-row data-inactive="${!active}"><span class="assigned-branch-name"><strong>${esc(branch.name)}</strong>${!active ? '<small>Sucursal inactiva</small>' : ''}${reason ? `<small id="${reasonId}">Asignación requerida: ${esc(reason)}</small>` : ''}</span><span class="assigned-branch-control"><span data-assignment-status>${selected ? 'Asignada' : active ? 'Sin asignar' : 'Inactiva'}</span><input class="form-check-input" type="checkbox" name="branchIds" value="${branch.id}" ${selected ? 'checked' : ''} ${reason || !active && !initiallyAssigned ? 'disabled' : ''} ${reason ? `aria-describedby="${reasonId}"` : ''} aria-label="Asignar ${esc(branch.name)}" />${reason && selected ? `<input type="hidden" name="branchIds" value="${branch.id}">` : ''}</span></label>`;
    }).join('')}</div>
    <p class="availability-note" data-assignment-warning ${removed.length ? '' : 'hidden'}>Al quitar una asignación se eliminan sus ajustes de servicios. Si conserva horarios u otros ajustes de atención, primero tendrás que resolverlos.</p>
    <p class="form-error" role="alert" tabindex="-1" data-assignment-error hidden></p>
    <div class="assignment-footer"><span data-assignment-summary aria-live="polite">${changed ? `${added.length} por asignar · ${removed.length} por quitar` : 'Sin cambios pendientes'}</span><button type="submit" class="btn btn-primary" ${changed ? '' : 'disabled'}>Guardar asignaciones</button></div>
    ${demo ? '<p class="availability-note">Los cambios de esta demo se restablecen al recargar.</p>' : ''}
  </form>`;
}
