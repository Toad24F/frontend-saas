export const minutesToClock = (value) => value == null ? '' : `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
export const minutesToLabel = (value) => value === 1440 ? '24:00' : minutesToClock(value);

export function validateProjectionRange(from, to) {
  const valid = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!valid(from) || !valid(to) || from > to) throw new Error('Selecciona un rango válido de fechas.');
  const days = (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000;
  if (days >= 366) throw new Error('El rango puede abarcar hasta 366 días inclusive.');
}
