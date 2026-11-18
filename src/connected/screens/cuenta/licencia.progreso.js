export function progresoLicencia(licencia) {
  const restante = licencia?.tiempoRestante;
  const duracionTotalMs = Number(licencia?.duracionTotalMs);
  if (!restante || !Number.isFinite(duracionTotalMs) || duracionTotalMs <= 0) return null;

  const minutos = Number(restante.dias) * 1440 + Number(restante.horas) * 60 + Number(restante.minutos);
  if (!Number.isFinite(minutos) || minutos < 0) return null;

  return {
    valor: Math.min(100, Math.round((minutos * 60000 / duracionTotalMs) * 1000) / 10),
  };
}
