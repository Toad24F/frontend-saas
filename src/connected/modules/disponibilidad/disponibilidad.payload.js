export function crearPayloadHorario(filas) {
  const ordenPorDia = new Map();
  // El contrato semanal vigente representa pausas como huecos entre franjas.
  return { franjas: filas.filter((fila) => fila.id > 0 || fila.enabled || fila.start || fila.end).map((fila) => {
    const orden = ordenPorDia.get(fila.day) || 0;
    ordenPorDia.set(fila.day, orden + 1);
    const convertirAMinutos = (valor) => valor ? Number(valor.slice(0, 2)) * 60 + Number(valor.slice(3)) : null;
    return { ...(fila.id > 0 ? { id: fila.id } : {}), diaSemana: fila.day, orden, sucursalId: fila.branchId || null,
      inicioMinutos: convertirAMinutos(fila.start), finMinutos: fila.end === '00:00' ? 1440 : convertirAMinutos(fila.end), activo: fila.enabled };
  }) };
}
