export const minutosAHora = (valor) => valor == null ? '' : `${String(Math.floor(valor / 60) % 24).padStart(2, '0')}:${String(valor % 60).padStart(2, '0')}`;
export const etiquetaHoraDesdeMinutos = (valor) => valor === 1440 ? '24:00' : minutosAHora(valor);

export function validarRangoProyeccion(desde, hasta) {
  const fechaValida = (valor) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(`${valor}T12:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
  };
  if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) throw new Error('Selecciona un rango válido de fechas.');
  const dias = (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000;
  if (dias >= 366) throw new Error('El rango puede abarcar hasta 366 días inclusive.');
}
