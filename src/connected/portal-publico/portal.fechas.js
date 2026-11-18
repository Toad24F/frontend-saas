// Solo presentación de instantes del servidor; no calcula candidatos ni aplica
// reglas de disponibilidad. La fecha inicial se expresa en la zona de la sucursal.
function partesDeFecha(instante, zona, soloHora = false) {
  return new Intl.DateTimeFormat('en-US', { timeZone: zona,
    ...(soloHora ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } :
      { year: 'numeric', month: '2-digit', day: '2-digit' }),
  }).formatToParts(new Date(instante));
}
export function fechaLocal(instante, zona) {
  const valores = partesDeFecha(instante, zona);
  const obtener = (tipo) => valores.find((parte) => parte.type === tipo).value;
  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}
export function horaLocal(instante, zona) {
  const valores = partesDeFecha(instante, zona, true);
  return `${valores.find((parte) => parte.type === 'hour').value}:${valores.find((parte) => parte.type === 'minute').value}`;
}
export function relojCabeceraPortal(instante, zona = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const valores = new Intl.DateTimeFormat('es-MX', { timeZone: zona, day: 'numeric', month: 'short', year: 'numeric' })
    .formatToParts(new Date(instante));
  const obtener = (tipo) => valores.find((parte) => parte.type === tipo).value;
  const hora = horaLocal(instante, zona);
  return {
    etiqueta: `${obtener('day')} ${obtener('month').replace('.', '')} ${obtener('year')} · ${hora}`,
    dateTime: `${fechaLocal(instante, zona)}T${hora}`,
  };
}
export function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) return false;
  const marcaTiempo = Date.parse(`${valor}T00:00:00Z`);
  return Number.isFinite(marcaTiempo) && new Date(marcaTiempo).toISOString().slice(0, 10) === valor;
}
export function etiquetaFecha(valor) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${valor}T12:00:00Z`));
}
