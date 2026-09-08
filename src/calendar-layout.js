/** Agrupa intervalos conectados y asigna columnas estables para que varias
 * citas simultáneas de distintos profesionales no se tapen en el calendario. */
export function calendarColumns(appointments) {
  const result = new Map();
  let group = [];
  let groupEnd = '';
  function flush() {
    const ends = [];
    const assigned = group.map((a) => {
      let lane = ends.findIndex((end) => end <= a.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = a.end;
      return { id: a.id, lane };
    });
    assigned.forEach(({ id, lane }) =>
      result.set(id, { lane, width: 100 / ends.length }),
    );
    group = [];
  }
  for (const appointment of [...appointments].sort(
    (a, b) => a.start.localeCompare(b.start) || a.id - b.id,
  )) {
    if (group.length && appointment.start >= groupEnd) flush();
    if (!group.length) groupEnd = appointment.end;
    groupEnd = groupEnd > appointment.end ? groupEnd : appointment.end;
    group.push(appointment);
  }
  flush();
  return result;
}
