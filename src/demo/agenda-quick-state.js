import { installStateMenu, stateOptionReason } from '../shared/screens/agenda/state-menu.js';
import { state, render } from '../shared/app.js';
import { TODAY, resource, appointmentInfo, statuses } from '../shared/data.js';
import { toast } from '../shared/ui.js';
import { detail as openDetail } from '../shared/screens/agenda/actions.js';

const now = () => new Date(`${TODAY}T18:00:00Z`);
const read = (id) => {
  const a = resource('appointments', id, state.tenantId), info = appointmentInfo(a);
  return { id: a.id, estado: a.status, fechaLocal: a.date, fechaFinLocal: a.date, horaInicio: a.start, horaFin: a.end,
    zonaHoraria: 'America/Chihuahua', nombreContacto: info.client.name, nombreSucursal: info.branch.name, nombreServicio: info.service.name };
};
installStateMenu({
  active: () => document.documentElement.dataset.appMode === 'demo' && state.page === 'agenda' ? `demo:${state.tenantId}` : null,
  read, now, openDetail,
  errorText: (error) => error.message,
  change: async (observed, estado) => {
    const current = read(observed.id);
    if (current.estado !== observed.estado) throw new Error('La cita cambió. Actualiza la cita antes de guardar.');
    const reason = stateOptionReason(current, estado, now());
    if (reason) throw new Error(reason);
    if (current.estado === 'cancelada') throw new Error('La reactivación requiere revisar el horario desde el detalle de la demostración.');
    resource('appointments', observed.id, state.tenantId).status = estado;
    return { id: observed.id, estado };
  },
  changed: ({ id, estado }, { restoreFocus }) => {
    render();
    if (restoreFocus) document.querySelector(`[data-agenda-state-menu="${id}"]`)?.focus({ preventScroll: true });
    toast(`Demostración: estado ${statuses[estado]}. Solo datos locales.`);
  },
});
