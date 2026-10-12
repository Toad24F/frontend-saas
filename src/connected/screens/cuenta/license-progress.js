export function licenseProgress(license) {
  const remaining = license?.tiempoRestante;
  const totalMs = Number(license?.duracionTotalMs);
  if (!remaining || !Number.isFinite(totalMs) || totalMs <= 0) return null;

  const minutes = Number(remaining.dias) * 1440 + Number(remaining.horas) * 60 + Number(remaining.minutos);
  if (!Number.isFinite(minutes) || minutes < 0) return null;

  return {
    value: Math.min(100, Math.round((minutes * 60000 / totalMs) * 1000) / 10),
  };
}
