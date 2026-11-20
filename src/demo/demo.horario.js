const patronHora = /^([01]\d|2[0-3]):[0-5]\d$/;
const nombresDias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function validarFranjasDemo(franjas, sucursalesAsignadas) {
  for (const franja of franjas) {
    if (!sucursalesAsignadas.includes(franja.branchId))
      throw new Error('Selecciona una sucursal asignada al profesional.');
    if (!franja.enabled) continue;
    if (!patronHora.test(franja.start) || !patronHora.test(franja.end) || franja.start >= franja.end)
      throw new Error(`La franja del ${nombresDias[franja.day]} debe iniciar y terminar el mismo día, en orden.`);
    if ((franja.breakStart || franja.breakEnd) &&
      (!patronHora.test(franja.breakStart) || !patronHora.test(franja.breakEnd) ||
        franja.breakStart < franja.start || franja.breakStart >= franja.breakEnd || franja.breakEnd > franja.end))
      throw new Error(`Revisa el descanso del ${nombresDias[franja.day]}. Debe quedar dentro de su franja.`);
  }
  for (let dia = 0; dia < 7; dia++) {
    const activas = franjas.filter((franja) => franja.enabled && franja.day === dia)
      .sort((primera, segunda) => primera.start.localeCompare(segunda.start));
    for (let indice = 1; indice < activas.length; indice++) {
      const anterior = activas[indice - 1], actual = activas[indice];
      if (actual.start < anterior.end)
        throw new Error(`Empalme el ${nombresDias[dia]}: ${anterior.start}–${anterior.end} y ${actual.start}–${actual.end}.`);
    }
  }
}

export function citaCubiertaPorHorarioDemo(cita, franjas) {
  return franjas.some((franja) => franja.enabled && franja.day === new Date(`${cita.date}T12:00:00`).getDay() &&
    franja.branchId === cita.branchId && cita.start >= franja.start && cita.end <= franja.end &&
    !(franja.breakStart && cita.start < franja.breakEnd && cita.end > franja.breakStart));
}
