// Cliente de lectura inyectable: listas cerradas impiden enviar campos de identidad o filtros de la demo.
const consulta = (valores, claves) => new URLSearchParams(claves.flatMap((claveInterna) => valores[claveInterna] == null || valores[claveInterna] === '' || valores[claveInterna] === 'all' ? [] : [[claveInterna, String(valores[claveInterna])]])).toString();
const validarId = (valor) => {
  if (!/^[1-9]\d*$/.test(String(valor)) || Number(valor) > 4294967295) throw new Error('Identificador inválido.');
  return valor;
};
// Validar las piezas usadas al dibujar impide perder citas silenciosamente por un resumen incompleto.
function resumenValido(elemento, filtros) {
  if (!elemento || !Number.isInteger(elemento.id) || elemento.id < 1 || !['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'].includes(elemento.estado)) return false;
  for (const claveInterna of ['fechaLocal', 'fechaFinLocal']) {
    if (typeof elemento[claveInterna] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(elemento[claveInterna])) return false;
  }
  if (elemento.fechaLocal < filtros.desde || elemento.fechaLocal > filtros.hasta) return false;
  if (![elemento.horaInicio, elemento.horaFin].every((valor) => typeof valor === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(valor))) return false;
  try { new Intl.DateTimeFormat('es-MX', { timeZone: elemento.zonaHoraria }).format(); } catch { return false; }
  return typeof elemento.zonaHoraria === 'string' && Array.isArray(elemento.causas);
}
export function crearAgendaClient(solicitar) {
  return {
    async listar(filtros) {
      const resultado = await solicitar(`/citas?${consulta(filtros, ['desde', 'hasta', 'sucursalId', 'personalId', 'estado', 'busqueda'])}`);
      // Una respuesta parcial o de otro periodo jamás representa un calendario vacío o completo.
      if (!resultado || resultado.desde !== filtros.desde || resultado.hasta !== filtros.hasta || !Array.isArray(resultado.citas)) throw new Error('La respuesta de agenda no es válida. Reintenta la consulta.');
      if (resultado.citas.length > 1000) throw new Error('El periodo supera 1.000 citas. Acota la consulta con los filtros.');
      if (!resultado.citas.every((elemento) => resumenValido(elemento, filtros))) throw new Error('La respuesta de agenda está incompleta. Reintenta la consulta.');
      return resultado;
    },
    consultarDetalle: (valor) => solicitar(`/citas/${validarId(valor)}`),
    consultarHistorial: (valor, pagina = 1) => solicitar(`/citas/${validarId(valor)}/historial?${consulta({ pagina, limite: 50 }, ['pagina', 'limite'])}`),
    listarClientes: (filtros = {}) => solicitar(`/clientes?${consulta(filtros, ['busqueda', 'pagina', 'limite'])}`),
    consultarCliente: (valor) => solicitar(`/clientes/${validarId(valor)}`),
    consultarHistorialCliente: (valor, pagina = 1) => solicitar(`/clientes/${validarId(valor)}/citas?${consulta({ pagina, limite: 50 }, ['pagina', 'limite'])}`),
  };
}
