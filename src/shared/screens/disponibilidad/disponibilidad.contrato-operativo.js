const ETIQUETAS_MOTIVOS = {
  cuenta_inactiva: 'Cuenta profesional inactiva', sucursal_inactiva: 'Sucursal inactiva',
  cuenta_inhabilitada: 'Profesional inhabilitado', sucursal_inhabilitada: 'Sucursal inhabilitada',
  servicio_inhabilitado: 'Servicio inhabilitado',
  servicio_inactivo: 'Servicio inactivo', servicio_no_seleccionado: 'Servicio no seleccionado por el profesional',
  atencion_inactiva: 'Atención pausada en la sucursal', servicio_no_ofrecido_en_sucursal: 'Servicio no ofrecido en la sucursal',
  fuera_de_horizonte: 'Fuera del horizonte de reservas', anticipacion_insuficiente: 'No cumple la anticipación mínima',
  fuera_de_atencion: 'Fuera del horario de atención', ocupado: 'El profesional ya está ocupado',
  fuera_de_secuencia: 'No coincide con el intervalo entre inicios', no_ofrecido_por_estrategia: 'No es ofrecido por la estrategia de agenda',
  inicio_pasado: 'La hora ya pasó', horario_insuficiente: 'El horario vigente no cubre toda la cita',
  descanso: 'La cita coincide con un descanso', bloqueo: 'La cita coincide con un bloqueo',
};

export const textoMotivoDisponibilidad = (codigo) => ETIQUETAS_MOTIVOS[codigo] || String(codigo).replaceAll('_', ' ');

export function validarRangoInclusivo(desde, hasta) {
  const fechaValida = (valor) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || '')) return false;
    const fecha = new Date(`${valor}T12:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
  };
  const errores = {};
  if (!fechaValida(desde)) errores.from = 'Selecciona una fecha inicial válida.';
  if (!fechaValida(hasta)) errores.to = 'Selecciona una fecha final válida.';
  if (Object.keys(errores).length) return errores;
  const dias = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;
  if (dias < 0) errores.to = 'La fecha final debe ser igual o posterior a la inicial.';
  else if (dias >= 31) errores.to = 'El rango puede abarcar hasta 31 fechas inclusive.';
  return errores;
}

export function validarConfiguracionDemo(valores) {
  const errores = {};
  if (!['ventana_libre', 'agenda_compacta'].includes(valores.modo)) errores.modo = 'Selecciona un modo de agenda.';
  if (![5, 10, 15, 20, 30, 60].includes(Number(valores.intervaloMinutos))) errores.intervaloMinutos = 'Selecciona un intervalo permitido.';
  const anticipacion = Number(valores.anticipacionMinutos);
  if (!Number.isSafeInteger(anticipacion) || anticipacion < 0 || anticipacion % 5 !== 0) errores.anticipacionMinutos = 'Usa minutos enteros, no negativos y múltiplos de 5.';
  const horizonte = Number(valores.diasFuturos);
  if (!Number.isSafeInteger(horizonte) || horizonte < 0) errores.diasFuturos = 'Usa un número entero de días igual o mayor que cero.';
  return errores;
}

// La API conectada exige el nuevo campo y admite cero como separación válida.
export function validarConfiguracionConectada(valores) {
  const errores = {};
  if (!['ventana_libre', 'agenda_compacta'].includes(valores.modo)) errores.modo = 'Selecciona un modo de agenda.';
  const separacion = valores.tiempoEntreCitasMinutos;
  if (!Number.isSafeInteger(separacion) || separacion < 0 || separacion > 60 || separacion % 5 !== 0) errores.tiempoEntreCitasMinutos = 'Usa cero o múltiplos de 5 hasta 60 minutos.';
  const anticipacion = valores.anticipacionMinutos;
  if (!Number.isSafeInteger(anticipacion) || anticipacion < 0 || anticipacion % 5 !== 0) errores.anticipacionMinutos = 'Usa minutos enteros, no negativos y múltiplos de 5.';
  const horizonte = valores.diasFuturos;
  if (!Number.isSafeInteger(horizonte) || horizonte < 0) errores.diasFuturos = 'Usa un número entero de días igual o mayor que cero.';
  return errores;
}

// Rechaza lecturas antiguas/incompletas para que la vista no seleccione cero por defecto.
export function leerConfiguracionConectada(datos) {
  if (!datos || Object.keys(validarConfiguracionConectada(datos)).length) throw new Error('La configuración de agenda recibida no es válida.');
  return datos;
}

export function partesEnZonaHoraria(valor, zona) {
  try {
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(valor));
    const leerParte = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
    return { date: `${leerParte('year')}-${leerParte('month')}-${leerParte('day')}`, time: `${leerParte('hour')}:${leerParte('minute')}` };
  } catch { return { date: '', time: '' }; }
}

export function formatearEnZonaHoraria(valor, zona) {
  try {
    return new Intl.DateTimeFormat('es-MX', { timeZone: zona, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(valor));
  } catch { return String(valor || ''); }
}
