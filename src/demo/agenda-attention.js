import { clockMinutes as minutes } from '../shared/screens/agenda/utility.js';
import { appointmentCovered } from './schedule.js';

export function demoAttention(days, person, branch, schedules, blocks) {
  if (person === 'all' || branch === 'all') return null;
  const intervalos = [];
  for (const day of days) {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    for (const row of schedules.filter((x) => x.enabled && x.professionalId === Number(person) && x.branchId === Number(branch) && x.day === weekday)) {
      let spans = [[minutes(row.start), minutes(row.end)]];
      const cuts = blocks.filter((x) => (!x.professionalId || x.professionalId === Number(person)) && (!x.branchId || x.branchId === Number(branch)) && x.date <= day && x.endDate >= day)
        .map((x) => [x.start ? minutes(x.start) : 0, x.end ? minutes(x.end) : 1440]);
      if (row.breakStart && row.breakEnd) cuts.push([minutes(row.breakStart), minutes(row.breakEnd)]);
      for (const [a, b] of cuts) spans = spans.flatMap(([start, end]) => b <= start || a >= end ? [[start, end]] : [[start, Math.min(a, end)], [Math.max(start, b), end]].filter(([a, b]) => a < b));
      for (const [start, end] of spans) intervalos.push({ fecha: day, sucursalId: Number(branch), inicioMinutos: start, finMinutos: end });
    }
  }
  return { intervalos, omisiones: [] };
}
export function demoAppointmentCauses(item, schedules, blocks) {
  const causes = [];
  if (!appointmentCovered(item, schedules.filter((x) => x.professionalId === item.professionalId))) causes.push({ codigo: 'horario_insuficiente' });
  if (blocks.some((x) => (!x.professionalId || x.professionalId === item.professionalId) && (!x.branchId || x.branchId === item.branchId) && x.date <= item.date && x.endDate >= item.date && (!x.start || item.start < x.end && item.end > x.start))) causes.push({ codigo: 'bloqueo' });
  return causes;
}
