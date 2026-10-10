const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function validateSchedules(rows, branchIds) {
  for (const row of rows) {
    if (!branchIds.includes(row.branchId))
      throw new Error('Selecciona una sucursal asignada al profesional.');
    if (!row.enabled) continue;
    if (!clock.test(row.start) || !clock.test(row.end) || row.start >= row.end)
      throw new Error(`La franja del ${dayName[row.day]} debe iniciar y terminar el mismo día, en orden.`);
    if ((row.breakStart || row.breakEnd) &&
      (!clock.test(row.breakStart) || !clock.test(row.breakEnd) ||
        row.breakStart < row.start || row.breakStart >= row.breakEnd || row.breakEnd > row.end))
      throw new Error(`Revisa el descanso del ${dayName[row.day]}. Debe quedar dentro de su franja.`);
  }
  for (let day = 0; day < 7; day++) {
    const active = rows.filter((row) => row.enabled && row.day === day)
      .sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < active.length; i++) {
      const previous = active[i - 1], current = active[i];
      if (current.start < previous.end)
        throw new Error(`Empalme el ${dayName[day]}: ${previous.start}–${previous.end} y ${current.start}–${current.end}.`);
    }
  }
}

export function appointmentCovered(appointment, rows) {
  return rows.some((row) => row.enabled && row.day === new Date(`${appointment.date}T12:00:00`).getDay() &&
    row.branchId === appointment.branchId && appointment.start >= row.start && appointment.end <= row.end &&
    !(row.breakStart && appointment.start < row.breakEnd && appointment.end > row.breakStart));
}
