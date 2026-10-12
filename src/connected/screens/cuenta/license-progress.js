export function licenseProgress(license) {
  const now = new Date(license?.ahora);
  const remaining = license?.tiempoRestante;
  if (Number.isNaN(now.getTime()) || !remaining) return null;

  const minutes = Number(remaining.dias) * 1440 + Number(remaining.horas) * 60 + Number(remaining.minutos);
  if (!Number.isFinite(minutes) || minutes < 0) return null;

  const nextYear = new Date(now);
  nextYear.setUTCFullYear(now.getUTCFullYear() + 1);
  const yearMinutes = (nextYear.getTime() - now.getTime()) / 60000;

  return {
    value: Math.min(100, Math.round((minutes / yearMinutes) * 1000) / 10),
    overYear: minutes > yearMinutes,
  };
}
