import { horaAMinutos } from '../shared/screens/agenda/agenda.utilidades.js';
import { appointmentCovered as citaCubierta } from './schedule.js';

export function atencionDemo(dias, persona, sucursal, horarios, bloqueos) {
  if (persona === 'all') return null;
  const intervalos = [];
  for (const dia of dias) {
    const diaSemana = new Date(`${dia}T12:00:00Z`).getUTCDay();
    for (const fila of horarios.filter((x) => x.enabled && x.professionalId === Number(persona) && (sucursal === 'all' || x.branchId === Number(sucursal)) && x.day === diaSemana)) {
      let extensiones = [[horaAMinutos(fila.start), horaAMinutos(fila.end)]];
      const cortes = bloqueos.filter((x) => (!x.professionalId || x.professionalId === Number(persona)) && (!x.branchId || x.branchId === fila.branchId) && x.date <= dia && x.endDate >= dia)
        .map((x) => [x.start ? horaAMinutos(x.start) : 0, x.end ? horaAMinutos(x.end) : 1440]);
      if (fila.breakStart && fila.breakEnd) cortes.push([horaAMinutos(fila.breakStart), horaAMinutos(fila.breakEnd)]);
      for (const [a, b] of cortes) extensiones = extensiones.flatMap(([inicio, fin]) => b <= inicio || a >= fin ? [[inicio, fin]] : [[inicio, Math.min(a, fin)], [Math.max(inicio, b), fin]].filter(([a, b]) => a < b));
      for (const [inicio, fin] of extensiones) intervalos.push({ fecha: dia, sucursalId: fila.branchId, inicioMinutos: inicio, finMinutos: fin });
    }
  }
  return { intervalos, omisiones: [] };
}
export function causasCitaDemo(elemento, horarios, bloqueos) {
  const causas = [];
  if (!citaCubierta(elemento, horarios.filter((x) => x.professionalId === elemento.professionalId))) causas.push({ codigo: 'horario_insuficiente' });
  if (bloqueos.some((x) => (!x.professionalId || x.professionalId === elemento.professionalId) && (!x.branchId || x.branchId === elemento.branchId) && x.date <= elemento.date && x.endDate >= elemento.date && (!x.start || elemento.start < x.end && elemento.end > x.start))) causas.push({ codigo: 'bloqueo' });
  return causas;
}
