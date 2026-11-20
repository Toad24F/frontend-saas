import { instalarMenuEstado, motivoOpcionEstado } from '../shared/screens/agenda/agenda.menu-estado.js';
import { estadoAplicacion as estado, render } from '../shared/aplicacion.nucleo.js';
import { HOY, obtenerRecurso, ampliarDatosCita, etiquetasEstadoCita } from '../shared/aplicacion.datos.js';
import { mostrarAviso } from '../shared/interfaz.componentes.js';
import { abrirDetalleDemo as abrirDetalle } from '../shared/screens/agenda/agenda.acciones.js';

const ahora = () => new Date(`${HOY}T18:00:00Z`);
const leer = (id) => {
  const a = obtenerRecurso('appointments', id, estado.negocioId), info = ampliarDatosCita(a);
  return { id: a.id, estado: a.status, fechaLocal: a.date, fechaFinLocal: a.date, horaInicio: a.start, horaFin: a.end,
    zonaHoraria: 'America/Chihuahua', nombreContacto: info.client.name, nombreSucursal: info.branch.name, nombreServicio: info.service.name };
};
instalarMenuEstado({
  active: () => document.documentElement.dataset.appMode === 'demo' && estado.pagina === 'agenda' ? `demo:${estado.negocioId}` : null,
  read: leer, now: ahora, openDetail: abrirDetalle,
  errorText: (error) => error.message,
  change: async (observado, siguienteEstado) => {
    const vigente = leer(observado.id);
    if (vigente.estado !== observado.estado) throw new Error('La cita cambió. Actualiza la cita antes de guardar.');
    const motivo = motivoOpcionEstado(vigente, siguienteEstado, ahora());
    if (motivo) throw new Error(motivo);
    if (vigente.estado === 'cancelada') throw new Error('La reactivación requiere revisar el horario desde el detalle de la demostración.');
    obtenerRecurso('appointments', observado.id, estado.negocioId).status = siguienteEstado;
    return { id: observado.id, estado: siguienteEstado };
  },
  changed: ({ id, estado }, { restoreFocus: restaurarFoco }) => {
    render();
    if (restaurarFoco) document.querySelector(`[data-agenda-menu-estado="${id}"]`)?.focus({ preventScroll: true });
    mostrarAviso(`Demostración: estado ${etiquetasEstadoCita[estado]}. Solo datos locales.`);
  },
});
