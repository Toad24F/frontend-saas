import { modal } from '../../ui.js';

// Conserva el dialog nativo (Escape, foco y capa superior) con la misma carcasa lateral de otros formularios.
export function agendaPanel(title, body, wide = true) {
  const panel = modal(title, body, wide);
  panel.classList.add('form-drawer', 'agenda-drawer');
  return panel;
}
// Borradores sin enviar solo en memoria de esta pestaña. No se mezclan con el marcador durable del escritor manual.
const drafts = new Map();
export const agendaDraft = (key) => drafts.get(key);
export const saveAgendaDraft = (key, value) => drafts.set(key, value);
export const clearAgendaDraft = (key) => drafts.delete(key);
if (typeof window !== 'undefined') window.addEventListener('cita-session-expired', () => drafts.clear());
