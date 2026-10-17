const reasonLabels = {
  cuenta_inactiva: 'Cuenta profesional inactiva', sucursal_inactiva: 'Sucursal inactiva',
  servicio_inactivo: 'Servicio inactivo', servicio_no_seleccionado: 'Servicio no seleccionado por el profesional',
  atencion_inactiva: 'Atención pausada en la sucursal', servicio_no_ofrecido_en_sucursal: 'Servicio no ofrecido en la sucursal',
  fuera_de_horizonte: 'Fuera del horizonte de reservas', anticipacion_insuficiente: 'No cumple la anticipación mínima',
  fuera_de_atencion: 'Fuera del horario de atención', ocupado: 'El profesional ya está ocupado',
  fuera_de_secuencia: 'No coincide con el intervalo entre inicios', no_ofrecido_por_estrategia: 'No es ofrecido por la estrategia de agenda',
  inicio_pasado: 'La hora ya pasó', horario_insuficiente: 'El horario vigente no cubre toda la cita',
  descanso: 'La cita coincide con un descanso', bloqueo: 'La cita coincide con un bloqueo',
};

export const reasonText = (code) => reasonLabels[code] || String(code).replaceAll('_', ' ');

export function validateInclusiveRange(from, to) {
  const valid = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  const errors = {};
  if (!valid(from)) errors.from = 'Selecciona una fecha inicial válida.';
  if (!valid(to)) errors.to = 'Selecciona una fecha final válida.';
  if (Object.keys(errors).length) return errors;
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  if (days < 0) errors.to = 'La fecha final debe ser igual o posterior a la inicial.';
  else if (days >= 31) errors.to = 'El rango puede abarcar hasta 31 fechas inclusive.';
  return errors;
}

export function validateConfiguration(values) {
  const errors = {};
  if (!['ventana_libre', 'agenda_compacta'].includes(values.modo)) errors.modo = 'Selecciona un modo de agenda.';
  if (![5, 10, 15, 20, 30, 60].includes(Number(values.intervaloMinutos))) errors.intervaloMinutos = 'Selecciona un intervalo permitido.';
  const lead = Number(values.anticipacionMinutos);
  if (!Number.isSafeInteger(lead) || lead < 0 || lead % 5 !== 0) errors.anticipacionMinutos = 'Usa minutos enteros, no negativos y múltiplos de 5.';
  const horizon = Number(values.diasFuturos);
  if (!Number.isSafeInteger(horizon) || horizon < 0) errors.diasFuturos = 'Usa un número entero de días igual o mayor que cero.';
  return errors;
}

export function zonedParts(value, zone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
    const get = (type) => parts.find((part) => part.type === type)?.value;
    return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
  } catch { return { date: '', time: '' }; }
}

export function formatZoned(value, zone) {
  try {
    return new Intl.DateTimeFormat('es-MX', { timeZone: zone, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
  } catch { return String(value || ''); }
}
