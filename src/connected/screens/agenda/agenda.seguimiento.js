import { escaparHtml as esc } from '../../../shared/interfaz.componentes.js';

const politicas = new Map([
  ['plazo_activo', 'Plazo activo'], ['plazo_vencido', 'Plazo vencido'],
  ['seguimiento_manual', 'Seguimiento manual'], ['confirmada', 'Confirmación registrada'],
  ['sin_plazo', 'Sin plazo automático'], ['cancelada', 'Cancelada'], ['anulada', 'Condición anulada'],
]);
const tipos = new Map([
  ['inicial_pendiente', 'Mensaje inicial'], ['inicial_confirmada', 'Mensaje inicial'], ['recordatorio', 'Recordatorio'],
]);
const estados = new Map([
  ['pendiente', 'En cola'], ['en_proceso', 'En proceso'], ['aceptado', 'Aceptado por WhatsApp'],
  ['entregado', 'Entregado'], ['leido', 'Leído'], ['fallido', 'Fallido'],
  ['incierto', 'Resultado incierto'], ['descartado', 'Descartado'],
]);

export function textoActorCita(evento) {
  if (evento.origenActor === 'cliente_whatsapp') return 'Cliente por WhatsApp';
  if (evento.origenActor === 'sistema') return 'Sistema';
  if (evento.origenActor === 'portal_publico') return 'Portal público';
  return `Personal #${evento.actorUsuarioId}`;
}

function fechaLimite(iso, zona) {
  if (!iso || !zona) return null;
  try {
    const fecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short',
      hourCycle: 'h23', timeZone: zona }).format(new Date(iso));
    return `${fecha} · ${zona}`;
  } catch { return null; }
}

/** La política y los acuses tienen etiquetas propias, independientes del estado de la cita. */
export function renderSeguimientoCita(seguimiento, zona) {
  const politica = politicas.get(seguimiento?.estado);
  if (!politica) return '';
  const filas = [['Confirmación', politica]];
  if (seguimiento.estado === 'plazo_activo' || seguimiento.estado === 'plazo_vencido') {
    const fecha = fechaLimite(seguimiento.vencimientoUtc, zona);
    if (fecha) filas.push(['Vencimiento', fecha]);
  }
  if (seguimiento.motivoSeguimiento) filas.push(['Motivo de seguimiento', seguimiento.motivoSeguimiento]);
  const envios = Array.isArray(seguimiento.envios) ? seguimiento.envios : [];
  for (const { tipo, estado } of envios) {
    if (tipos.has(tipo) && estados.has(estado)) filas.push([`${tipos.get(tipo)} de WhatsApp`, estados.get(estado)]);
  }
  return `<section class="agenda-historial" aria-label="Confirmación y comunicación"><h3>Confirmación y comunicación</h3>
    <dl class="agenda-campos-detalle">${filas.map(([etiqueta, valor]) =>
    `<div><dt>${esc(etiqueta)}</dt><dd>${esc(valor)}</dd></div>`).join('')}</dl></section>`;
}
