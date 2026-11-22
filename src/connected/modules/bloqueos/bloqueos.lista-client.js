const hora = minutos => minutos == null ? '' : `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/** Traduce una página autorizada del backend al modelo visual compartido con la demo. */
export async function consultarPaginaBloqueos(solicitar, negocioId, filtros = {}) {
  const pagina = filtros.pagina || 1;
  const parametros = new URLSearchParams({ pagina: String(pagina), limite: '25', vigencia: filtros.vigencia || 'vigentes_proximos' });
  for (const [origen, destino] of [['busqueda', 'motivo'], ['tipo', 'tipo'], ['sucursal', 'sucursalId'], ['personalId', 'personalId'], ['desde', 'desde'], ['hasta', 'hasta']]) {
    if (filtros[origen] && filtros[origen] !== 'todos') parametros.set(destino, String(filtros[origen]));
  }
  const respuesta = await solicitar(`/bloqueos?${parametros}`);
  if (!respuesta || respuesta.pagina !== pagina || respuesta.limite !== 25 ||
    !Number.isSafeInteger(respuesta.total) || respuesta.total < 0 || !Array.isArray(respuesta.bloqueos) ||
    respuesta.bloqueos.length > 25 || (respuesta.total > 0 && pagina <= Math.ceil(respuesta.total / 25) && !respuesta.bloqueos.length)) {
    throw new Error('La página de bloqueos recibida no es válida.');
  }
  return { ...respuesta, bloqueos: respuesta.bloqueos.map(registro => ({
    id: registro.id, tenantId: negocioId, professionalId: registro.personalId,
    branchId: registro.sucursalId, date: registro.fechaInicio.slice(0, 10),
    endDate: registro.fechaFin.slice(0, 10), start: hora(registro.inicioMinutos),
    end: hora(registro.finMinutos), type: registro.tipo, reason: registro.motivo,
    vigencia: registro.vigencia,
  })) };
}
