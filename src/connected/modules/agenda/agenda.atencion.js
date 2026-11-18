// Contrato existente de atención: no descuenta ocupación ni equivale a disponibilidad.
export async function consultarAtencionAgenda(solicitar, personalId, periodo) {
  if (!/^[1-9]\d*$/.test(String(personalId))) throw new Error('Profesional inválido.');
  const resultado = await solicitar(`/profesionales/${personalId}/atencion?${new URLSearchParams(periodo)}`);
  const fechaValida = (fecha) => typeof fecha === 'string' && fecha >= periodo.desde && fecha <= periodo.hasta;
  if (!resultado || resultado.desde !== periodo.desde || resultado.hasta !== periodo.hasta || resultado.personalId !== Number(personalId) ||
    !Array.isArray(resultado.intervalos) || !Array.isArray(resultado.omisiones) ||
    !resultado.intervalos.every((x) => fechaValida(x.fecha) && Number.isInteger(x.sucursalId) && x.sucursalId > 0 &&
      Number.isInteger(x.inicioMinutos) && Number.isInteger(x.finMinutos) && x.inicioMinutos >= 0 && x.finMinutos <= 1440 && x.inicioMinutos < x.finMinutos &&
      Number.isFinite(Date.parse(x.inicioUtc)) && Number.isFinite(Date.parse(x.finUtc)) && Date.parse(x.inicioUtc) < Date.parse(x.finUtc)) ||
    !resultado.omisiones.every((x) => fechaValida(x.fecha) && Number.isInteger(x.sucursalId))) throw new Error('La atención recibida está incompleta.');
  return resultado;
}
