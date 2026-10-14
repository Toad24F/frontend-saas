const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function clearAvailabilityErrors(root) {
  root.querySelectorAll('.availability-field-error').forEach((item) => item.remove());
  root.querySelectorAll('[data-availability-field].has-error').forEach((container) => {
    container.classList.remove('has-error');
    container.querySelectorAll('input, select, textarea').forEach((control) => {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    });
  });
  root.querySelectorAll('.availability-general-error, #form-error, #schedule-error, #projection-error').forEach((target) => {
    target.hidden = true; target.textContent = '';
  });
}

export function clearAvailabilityField(root, control) {
  const container = control.closest('[data-availability-field]');
  if (!container?.classList.contains('has-error')) return;
  container.querySelectorAll('.availability-field-error').forEach((item) => item.remove());
  container.classList.remove('has-error');
  container.querySelectorAll('input, select, textarea').forEach((item) => {
    item.removeAttribute('aria-invalid'); item.removeAttribute('aria-describedby');
  });
}

export function showAvailabilityErrors(root, errors) {
  clearAvailabilityErrors(root);
  const entries = Object.entries(errors);
  for (const [field, message] of entries) {
    const container = root.querySelector(`[data-availability-field="${field}"]`);
    if (!container) continue;
    const id = `availability-error-${field.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const note = document.createElement('p');
    note.id = id; note.className = 'availability-field-error'; note.setAttribute('role', 'alert');
    note.textContent = message;
    container.append(note);
    container.classList.add('has-error');
    container.querySelectorAll('input:not(:disabled), select:not(:disabled), textarea:not(:disabled)').forEach((control) => {
      control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', id);
    });
  }
  const first = root.querySelector(`[data-availability-field="${entries[0]?.[0]}"]`);
  const focus = first?.querySelector('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button') || first;
  focus?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  focus?.focus({ preventScroll: true });
}

export function showAvailabilityGeneralError(form, error, selector = '.availability-general-error') {
  clearAvailabilityErrors(form);
  const target = form.querySelector(selector);
  if (!target) return;
  target.textContent = error.message || 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
  target.hidden = false;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.focus({ preventScroll: true });
}

export function validateBlock(data) {
  const errors = {};
  const reason = String(data.get('reason') || '').trim();
  const from = String(data.get('date') || '');
  const to = String(data.get('endDate') || '');
  const start = String(data.get('start') || '');
  const end = String(data.get('end') || '');
  if (!reason) errors.reason = 'Escribe el motivo del bloqueo.';
  else if (reason.length > 500) errors.reason = 'El motivo no puede superar 500 caracteres.';
  if (!validDate(from)) errors.date = 'Selecciona una fecha inicial válida.';
  if (!validDate(to)) errors.endDate = 'Selecciona una fecha final válida.';
  else if (validDate(from) && from > to) errors.endDate = 'La fecha final debe ser igual o posterior a la fecha inicial.';
  if (Boolean(start) !== Boolean(end)) {
    if (!start) errors.start = 'Indica también la hora inicial.';
    if (!end) errors.end = 'Indica también la hora final.';
  } else if (start && end && from === to && start >= end) {
    errors.end = 'La hora final debe ser posterior a la hora inicial.';
  }
  return errors;
}

export function blockApiErrors(error) {
  const message = String(error.message || '');
  const errors = {};
  for (const detail of message.split(' · ')) {
    if (/motivo/i.test(detail)) errors.reason = 'Escribe un motivo válido de hasta 500 caracteres.';
    else if (/fechaInicio/i.test(detail)) errors.date = 'Selecciona una fecha inicial válida.';
    else if (/fechaFin|anterior/i.test(detail)) errors.endDate = 'La fecha final debe ser igual o posterior a la fecha inicial.';
    else if (/inicioMinutos/i.test(detail)) errors.start = 'Revisa la hora inicial.';
    else if (/finMinutos|intervalo/i.test(detail)) errors.end = 'Revisa la hora final; debe ser posterior a la inicial.';
    else if (/personalId|profesional/i.test(detail)) errors.professionalId = detail;
    else if (/sucursalId|sucursal/i.test(detail)) errors.branchId = detail;
  }
  return Object.keys(errors).length ? errors : null;
}

export function validateException(data, rows, closed, validBranch) {
  const errors = {};
  if (!Number(data.get('professionalId')) && data.has('professionalId')) errors.professionalId = 'Selecciona un profesional.';
  if (!Number(data.get('branchId')) || !validBranch) errors.branchId = 'Selecciona una sucursal asignada al profesional.';
  if (!validDate(String(data.get('date') || ''))) errors.date = 'Selecciona una fecha válida.';
  if (!closed && !rows.length) errors.slots = 'Agrega una franja o marca cierre de todo el día.';
  if (!closed) rows.forEach((row, index) => {
    const key = row.index ?? index;
    if (!clock.test(row.start)) errors[`slot-${key}-start`] = 'Indica la hora de entrada.';
    if (!clock.test(row.end)) errors[`slot-${key}-end`] = 'Indica la hora de salida.';
    else if (clock.test(row.start) && row.start >= row.end && row.end !== '00:00')
      errors[`slot-${key}-end`] = 'La salida debe ser posterior a la entrada.';
    if (Boolean(row.breakStart) !== Boolean(row.breakEnd)) {
      if (!row.breakStart) errors[`slot-${key}-break`] = 'Indica el inicio y el fin del descanso.';
      else errors[`slot-${key}-break`] = 'Indica el inicio y el fin del descanso.';
    } else if (row.breakStart && (row.breakStart < row.start || row.breakStart >= row.breakEnd || (row.end !== '00:00' && row.breakEnd > row.end)))
      errors[`slot-${key}-break`] = 'El descanso debe quedar dentro de la franja.';
  });
  return errors;
}

export function exceptionApiErrors(error, rowIndexes = []) {
  const message = String(error.message || '');
  const rowMatch = message.match(/fila(?:s)?\s+(\d+)/i);
  const apiIndex = Number(rowMatch?.[1] || 0);
  const index = rowIndexes[apiIndex] ?? apiIndex;
  if (/sucursalId|sucursal/i.test(message)) return { branchId: 'Selecciona una sucursal asignada al profesional.' };
  if (/fecha/i.test(message)) return { date: 'Selecciona una fecha válida.' };
  if (/descanso/i.test(message)) return { [`slot-${index}-break`]: 'El descanso debe quedar dentro de la franja.' };
  if (/finMinutos/i.test(message)) return { [`slot-${index}-end`]: 'La salida debe ser posterior a la entrada.' };
  if (/inicioMinutos|empalme/i.test(message)) return { [`slot-${index}-start`]: 'Esta franja se empalma con otra. Ajusta la hora de entrada.' };
  return null;
}

export function validateScheduleRows(rows, branchIds, demo = false) {
  const errors = {};
  for (const row of rows) {
    const prefix = `schedule-${row.id}`;
    if (row.enabled && !branchIds.includes(row.branchId)) errors[`${prefix}-branch`] = 'Selecciona una sucursal asignada al profesional.';
    if (!row.enabled) continue;
    if (!clock.test(row.start)) errors[`${prefix}-start`] = `Indica la entrada del ${dayName[row.day]}.`;
    if (!clock.test(row.end)) errors[`${prefix}-end`] = `Indica la salida del ${dayName[row.day]}.`;
    else if (clock.test(row.start) && row.start >= row.end) errors[`${prefix}-end`] = 'La salida debe ser posterior a la entrada.';
    if (demo && clock.test(row.start) && clock.test(row.end) && (row.start < '09:00' || row.end > '18:00'))
      errors[`${prefix}-${row.start < '09:00' ? 'start' : 'end'}`] = 'En la demostración, la atención debe quedar entre 09:00 y 18:00.';
    if (row.breakStart || row.breakEnd) {
      if (!clock.test(row.breakStart) || !clock.test(row.breakEnd)) errors[`${prefix}-break`] = 'Indica el inicio y el fin del descanso.';
      else if (row.breakStart < row.start || row.breakStart >= row.breakEnd || row.breakEnd > row.end)
        errors[`${prefix}-break`] = 'El descanso debe quedar dentro de esta franja.';
    }
  }
  for (let day = 0; day < 7; day++) {
    const active = rows.filter((row) => row.enabled && row.day === day && clock.test(row.start) && clock.test(row.end)).sort((a, b) => a.start.localeCompare(b.start));
    for (let index = 1; index < active.length; index++) if (active[index].start < active[index - 1].end)
      errors[`schedule-${active[index].id}-start`] = `Esta franja se empalma con ${active[index - 1].start}–${active[index - 1].end}.`;
  }
  return errors;
}

export function scheduleApiErrors(error, rows) {
  const message = String(error.message || '');
  const indexes = [...message.matchAll(/(?:filas?\s+| y )(\d+)/gi)].map((match) => Number(match[1]));
  const fields = /sucursalId/i.test(message) ? 'branch' : /descanso/i.test(message) ? 'break' : /finMinutos/i.test(message) ? 'end' : /inicioMinutos|empalme/i.test(message) ? 'start' : null;
  if (!fields || !indexes.length) return null;
  return Object.fromEntries(indexes.filter((index) => rows[index]).map((index) => [`schedule-${rows[index].id}-${fields}`, message]));
}

export function validateProjection(from, to) {
  const errors = {};
  if (!validDate(from)) errors.from = 'Selecciona una fecha inicial válida.';
  if (!validDate(to)) errors.to = 'Selecciona una fecha final válida.';
  else if (validDate(from) && from > to) errors.to = 'La fecha final debe ser igual o posterior a la inicial.';
  else if (validDate(from) && (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000 >= 366)
    errors.to = 'El rango puede abarcar hasta 366 días inclusive.';
  return errors;
}
