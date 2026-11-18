export { segmentosLineaTiempo, rangoLineaTiempo, renderLineaTiempo } from '../../../shared/screens/agenda/agenda.linea-tiempo.js';
export { tituloCalendario, renderMes } from '../../../shared/screens/agenda/agenda.mes.js';
import { metricasAgenda } from '../../../shared/screens/agenda/agenda.presentacion.js';
// Resumen compacto compartido; los valores siguen procediendo de la consulta autorizada.
export function renderMetricas(citas, dia, cargando = citas == null) {
  return metricasAgenda(citas?.map((elemento) => ({ date: elemento.fechaLocal, status: elemento.estado })), dia, { loading: cargando });
}
