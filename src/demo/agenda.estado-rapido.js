import { instalarMenuEstado, motivoOpcionEstado } from '../shared/screens/agenda/agenda.menu-estado.js';
import { state as estado, render } from '../shared/app.js';
import { TODAY, resource, appointmentInfo, statuses } from '../shared/data.js';
import { toast } from '../shared/ui.js';
import { abrirDetalleDemo as abrirDetalle } from '../shared/screens/agenda/agenda.acciones.js';

const ahora = () => new Date(`${TODAY}T18:00:00Z`);
const leer = (id) => {
  const a = resource('appointments', id, estado.tenantId), info = appointmentInfo(a);
  return { id: a.id, estado: a.status, fechaLocal: a.date, fechaFinLocal: a.date, horaInicio: a.start, horaFin: a.end,
    zonaHoraria: 'America/Chihuahua', nombreContacto: info.client.name, nombreSucursal: info.branch.name, nombreServicio: info.service.name };
};
instalarMenuEstado({
  active: () => document.documentElement.dataset.appMode === 'demo' && estado.page === 'agenda' ? `demo:${estado.tenantId}` : null,
  read: leer, now: ahora, openDetail: abrirDetalle,
  errorText: (error) => error.message,
  change: async (observado, estado) => {
    const vigente = leer(observado.id);
    if (vigente.estado !== observado.estado) throw new Error('La cita cambió. Actualiza la cita antes de guardar.');
    const motivo = motivoOpcionEstado(vigente, estado, ahora());
    if (motivo) throw new Error(motivo);
    if (vigente.estado === 'cancelada') throw new Error('La reactivación requiere revisar el horario desde el detalle de la demostración.');
    resource('appointments', observado.id, estado.tenantId).status = estado;
    return { id: observado.id, estado };
  },
  changed: ({ id, estado }, { restoreFocus: restaurarFoco }) => {
    render();
    if (restaurarFoco) document.querySelector(`[data-agenda-menu-estado="${id}"]`)?.focus({ preventScroll: true });
    toast(`Demostración: estado ${statuses[estado]}. Solo datos locales.`);
  },
});
