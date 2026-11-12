// Contrato existente de atención: no descuenta ocupación ni equivale a disponibilidad.
export async function readAgendaAttention(request, personalId, period) {
  if (!/^[1-9]\d*$/.test(String(personalId))) throw new Error('Profesional inválido.');
  const result = await request(`/profesionales/${personalId}/atencion?${new URLSearchParams(period)}`);
  const validDate = (date) => typeof date === 'string' && date >= period.desde && date <= period.hasta;
  if (!result || result.desde !== period.desde || result.hasta !== period.hasta || result.personalId !== Number(personalId) ||
    !Array.isArray(result.intervalos) || !Array.isArray(result.omisiones) ||
    !result.intervalos.every((x) => validDate(x.fecha) && Number.isInteger(x.sucursalId) && x.sucursalId > 0 &&
      Number.isInteger(x.inicioMinutos) && Number.isInteger(x.finMinutos) && x.inicioMinutos >= 0 && x.finMinutos <= 1440 && x.inicioMinutos < x.finMinutos &&
      Number.isFinite(Date.parse(x.inicioUtc)) && Number.isFinite(Date.parse(x.finUtc)) && Date.parse(x.inicioUtc) < Date.parse(x.finUtc)) ||
    !result.omisiones.every((x) => validDate(x.fecha) && Number.isInteger(x.sucursalId))) throw new Error('La atención recibida está incompleta.');
  return result;
}
