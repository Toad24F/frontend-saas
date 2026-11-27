import { etiquetasEstadoCita, HOY } from '../../../shared/aplicacion.datos.js';
import { inicioPeriodoReporte } from '../../../shared/screens/reportes/reportes.indicadores.js';

const contarEstados = () => Object.fromEntries(Object.keys(etiquetasEstadoCita).map((estado) => [estado, 0]));
const porcentaje = (cantidad, total) => total ? cantidad / total * 100 : null;
const estimacion = () => ({ subtotalConocido: 0, sinCosto: 0, incompleta: false });

export function calcularReporteDemo(citas, filtros) {
  const estados = contarEstados();
  const evolucion = new Map();
  const servicios = new Map();
  const porServicio = new Map(), porSucursal = new Map();
  const ingresosEstimados = estimacion();
  const agruparEstimado = (grupos, { id, name }) => {
    if (!grupos.has(id)) grupos.set(id, { nombres: [name], ...estimacion() });
    return grupos.get(id);
  };
  let manual = 0, pasadasSinResultado = 0;
  for (const cita of citas) {
    estados[cita.status] += 1;
    if (cita.origin === 'manual') manual += 1;
    const inicioPeriodo = inicioPeriodoReporte(cita.date, filtros.agrupacion);
    if (!evolucion.has(inicioPeriodo)) evolucion.set(inicioPeriodo, { inicioPeriodo, totalCitas: 0, estados: contarEstados() });
    const periodo = evolucion.get(inicioPeriodo);
    periodo.totalCitas += 1;
    periodo.estados[cita.status] += 1;
    if (!servicios.has(cita.service.id)) servicios.set(cita.service.id, { nombres: [cita.service.name], cantidad: 0 });
    servicios.get(cita.service.id).cantidad += 1;
    if (['pendiente', 'confirmada'].includes(cita.status) && (cita.date < HOY || cita.date === HOY && cita.end <= '11:20')) pasadasSinResultado += 1;
    if (cita.status !== 'completada') continue;
    const precio = cita.service.price;
    for (const grupo of [ingresosEstimados, agruparEstimado(porServicio, cita.service), agruparEstimado(porSucursal, cita.branch)]) {
      if (precio == null) {
        grupo.sinCosto += 1;
        grupo.incompleta = true;
      } else grupo.subtotalConocido += precio;
    }
  }
  const totalCitas = citas.length, portal = totalCitas - manual;
  const inasistencia = estados.completada + estados.no_asistio;
  return {
    filtros, totalCitas, estados, pasadasSinResultado,
    denominadoresTasas: { inasistencia },
    tasaInasistencia: porcentaje(estados.no_asistio, inasistencia),
    tasaCancelacion: porcentaje(estados.cancelada, totalCitas),
    origen: { manual: { cantidad: manual, porcentaje: porcentaje(manual, totalCitas) },
      portal_publico: { cantidad: portal, porcentaje: porcentaje(portal, totalCitas) } },
    evolucion: [...evolucion.values()].sort((primero, segundo) => primero.inicioPeriodo.localeCompare(segundo.inicioPeriodo)),
    serviciosSolicitados: [...servicios.values()].sort((primero, segundo) => segundo.cantidad - primero.cantidad),
    ingresosEstimados: { ...ingresosEstimados, porServicio: [...porServicio.values()], porSucursal: [...porSucursal.values()] },
  };
}
