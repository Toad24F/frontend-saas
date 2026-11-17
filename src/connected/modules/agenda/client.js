// Cliente de lectura inyectable: listas cerradas impiden enviar campos de identidad o filtros de la demo.
const query = (values, keys) => new URLSearchParams(keys.flatMap((key) => values[key] == null || values[key] === '' || values[key] === 'all' ? [] : [[key, String(values[key])]])).toString();
const id = (value) => {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 4294967295) throw new Error('Identificador inválido.');
  return value;
};
// Validar las piezas usadas al dibujar impide perder citas silenciosamente por un resumen incompleto.
function validSummary(item, filters) {
  if (!item || !Number.isInteger(item.id) || item.id < 1 || !['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'].includes(item.estado)) return false;
  for (const key of ['fechaLocal', 'fechaFinLocal']) {
    if (typeof item[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item[key])) return false;
  }
  if (item.fechaLocal < filters.desde || item.fechaLocal > filters.hasta) return false;
  if (![item.horaInicio, item.horaFin].every((value) => typeof value === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(value))) return false;
  try { new Intl.DateTimeFormat('es-MX', { timeZone: item.zonaHoraria }).format(); } catch { return false; }
  return typeof item.zonaHoraria === 'string' && Array.isArray(item.causas);
}
export function createAgendaClient(request) {
  return {
    async list(filters) {
      const result = await request(`/citas?${query(filters, ['desde', 'hasta', 'sucursalId', 'personalId', 'estado', 'busqueda'])}`);
      // Una respuesta parcial o de otro periodo jamás representa un calendario vacío o completo.
      if (!result || result.desde !== filters.desde || result.hasta !== filters.hasta || !Array.isArray(result.citas)) throw new Error('La respuesta de agenda no es válida. Reintenta la consulta.');
      if (result.citas.length > 1000) throw new Error('El periodo supera 1.000 citas. Acota la consulta con los filtros.');
      if (!result.citas.every((item) => validSummary(item, filters))) throw new Error('La respuesta de agenda está incompleta. Reintenta la consulta.');
      return result;
    },
    detail: (value) => request(`/citas/${id(value)}`),
    history: (value, pagina = 1) => request(`/citas/${id(value)}/historial?${query({ pagina, limite: 50 }, ['pagina', 'limite'])}`),
    clients: (filters = {}) => request(`/clientes?${query(filters, ['busqueda', 'pagina', 'limite'])}`),
    customer: (value) => request(`/clientes/${id(value)}`),
    customerHistory: (value, pagina = 1) => request(`/clientes/${id(value)}/citas?${query({ pagina, limite: 50 }, ['pagina', 'limite'])}`),
  };
}
