import { estadoAplicacion } from '../../../shared/aplicacion.nucleo.js';
import { ampliarDatosCita, HOY, listarRegistros } from '../../../shared/aplicacion.datos.js';
import { renderBoton } from '../../../shared/interfaz.componentes.js';
import { renderResumen } from '../../../shared/screens/resumen/resumen.vista.js';
import { filtrosResumen } from '../../../shared/screens/resumen/resumen.filtros.js';
import { causasCitaDemo } from '../../agenda.atencion.js';

export function renderResumenDemo() {
  const { negocioId } = estadoAplicacion;
  const { fecha, estado } = filtrosResumen(HOY, negocioId);
  const citas = listarRegistros('appointments', negocioId);
  const horarios = listarRegistros('schedules', negocioId);
  const bloqueos = listarRegistros('blocks', negocioId);
  const citasDia = citas.filter((cita) => cita.date === fecha).map((cita) => {
    const datos = ampliarDatosCita(cita);
    return {
      id: cita.id, estado: cita.status, horaInicio: cita.start, horaFin: cita.end,
      inicioUtc: `${cita.date}T${cita.start}:00Z`, nombreContacto: datos.client.name,
      nombreServicio: datos.service.name, nombreProfesional: datos.professional.name,
      nombreSucursal: datos.branch.name, causas: causasCitaDemo(cita, horarios, bloqueos),
    };
  });
  // La hora ficticia coincide con la referencia visual de Agenda en la demo.
  return renderResumen({ hoy: HOY, fecha, estado, ahora: Date.parse(`${HOY}T11:20:00Z`), nombre: 'Adriana',
    descripcion: 'Un nuevo día para hacer sentir bien a tus pacientes.',
    demo: true, acciones: renderBoton('Nueva cita', 'nueva-cita'), citasDia,
    citasSemana: citas.map((cita) => ({ fechaLocal: cita.date })),
  });
}
