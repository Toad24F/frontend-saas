export { timelineSegments, timelineRange, renderTimeline } from '../../../shared/screens/agenda/timeline.js';
export { calendarTitle, renderMonth } from '../../../shared/screens/agenda/month.js';
import { agendaMetrics } from '../../../shared/screens/agenda/presentation.js';
// Resumen compacto compartido; los valores siguen procediendo de la consulta autorizada.
export function renderMetrics(appointments, day, loading = appointments == null) {
  return agendaMetrics(appointments?.map((item) => ({ date: item.fechaLocal, status: item.estado })), day, { loading });
}
