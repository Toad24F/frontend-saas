import { modal } from '../../ui.js';

// Conserva el dialog nativo (Escape, foco y capa superior) con la misma carcasa lateral de otros formularios.
export function panelAgenda(titulo, cuerpo, ancho = true) {
  const panel = modal(titulo, cuerpo, ancho);
  panel.classList.add('form-drawer', 'agenda-panel-lateral');
  return panel;
}
// Borradores sin enviar solo en memoria de esta pestaña. No se mezclan con el marcador durable del escritor manual.
const borradores = new Map();
export const borradorAgenda = (claveInterna) => borradores.get(claveInterna);
export const guardarBorradorAgenda = (claveInterna, valor) => borradores.set(claveInterna, valor);
export const borrarBorradorAgenda = (claveInterna) => borradores.delete(claveInterna);
if (typeof window !== 'undefined') window.addEventListener('cita-sesion-expirada', () => borradores.clear());
