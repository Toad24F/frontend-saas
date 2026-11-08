export function setScheduleRowEnabled(row, enabled) {
  row.classList.toggle('schedule-disabled', !enabled);
  row.querySelectorAll('select, input[type="time"], [data-remove-schedule]').forEach((control) => {
    control.disabled = !enabled;
  });
}

export function readScheduleRows(form, tenantId, professionalId) {
  return [...form.querySelectorAll('[data-schedule-row]')].map((row) => {
    const id = Number(row.dataset.id);
    const value = (field) => row.querySelector(`[name="${field}-${id}"]`)?.value || '';
    return {
      id, tenantId, professionalId, day: Number(row.dataset.scheduleDay),
      enabled: row.querySelector(`[name="enabled-${id}"]`).checked,
      branchId: Number(value('branch')),
      start: value('start'), end: value('end'),
      breakStart: value('breakStart'), breakEnd: value('breakEnd'),
    };
  });
}
