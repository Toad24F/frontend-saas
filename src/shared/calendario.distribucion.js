/** Agrupa intervalos conectados y asigna columnas estables para que varias
 * citas simultáneas de distintos profesionales no se tapen en el calendario. */
export function columnasCalendario(citas) {
  const resultado = new Map();
  let grupo = [];
  let finGrupo = '';
  function asignarGrupo() {
    const finales = [];
    const asignaciones = grupo.map((cita) => {
      let carril = finales.findIndex((fin) => fin <= cita.start);
      if (carril < 0) carril = finales.length;
      finales[carril] = cita.end;
      return { id: cita.id, carril };
    });
    asignaciones.forEach(({ id, carril }) =>
      resultado.set(id, { carril, ancho: 100 / finales.length }),
    );
    grupo = [];
  }
  for (const cita of [...citas].sort(
    (cita, otra) => cita.start.localeCompare(otra.start) || cita.id - otra.id,
  )) {
    if (grupo.length && cita.start >= finGrupo) asignarGrupo();
    if (!grupo.length) finGrupo = cita.end;
    finGrupo = finGrupo > cita.end ? finGrupo : cita.end;
    grupo.push(cita);
  }
  asignarGrupo();
  return resultado;
}
