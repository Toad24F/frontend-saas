export function schedulePayload(rows) {
  const order = new Map();
  return { franjas: rows.filter((row) => row.id > 0 || row.enabled || row.start || row.end || row.breakStart || row.breakEnd).map((row) => {
    const orden = order.get(row.day) || 0;
    order.set(row.day, orden + 1);
    const min = (value) => value ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null;
    return { ...(row.id > 0 ? { id: row.id } : {}), diaSemana: row.day, orden, sucursalId: row.branchId || null,
      inicioMinutos: min(row.start), finMinutos: row.end === '00:00' ? 1440 : min(row.end), descansoInicioMinutos: min(row.breakStart), descansoFinMinutos: row.breakEnd === '00:00' ? 1440 : min(row.breakEnd), activo: row.enabled };
  }) };
}
