export const LIMITE_REPORTE = 100;
const camposFiltros = ['desde', 'hasta', 'agrupacion', 'sucursalId', 'personalId', 'servicioId'];

export function coincidenFiltrosReporte(primero, segundo) {
  return Boolean(primero && segundo && camposFiltros.every((campo) => primero[campo] === segundo[campo]));
}

// Las tres rutas exponen la misma cabecera. Verificarla antes de usar datos de otra respuesta.
export function coincideCorteReporte(corte, respuesta) {
  return Boolean(respuesta && respuesta.id === corte.id && respuesta.fechaCorte === corte.fechaCorte &&
    respuesta.expiraEn === corte.expiraEn && coincidenFiltrosReporte(corte.filtros, respuesta.filtros));
}

export function validarPaginaReporte(corte, total, numero, pagina) {
  const inicio = (numero - 1) * LIMITE_REPORTE;
  const cantidad = Math.min(LIMITE_REPORTE, Math.max(0, total - inicio));
  if (!Number.isSafeInteger(total) || total < 0 || !coincideCorteReporte(corte, pagina) ||
      pagina.pagina !== numero || pagina.limite !== LIMITE_REPORTE || pagina.total !== total ||
      !Array.isArray(pagina.filas) || pagina.filas.length !== cantidad ||
      pagina.hayMas !== (inicio + cantidad < total)) {
    throw new Error('Página de reporte incoherente.');
  }
  return pagina;
}

export async function reunirFilasParaImpresion(corte, total, obtenerPagina) {
  const filas = [];
  const citas = new Set();
  let numero = 1;
  let hayMas;
  // La colección se publica en un solo paso, después de verificar cada página y cada cita.
  do {
    const pagina = validarPaginaReporte(corte, total, numero, await obtenerPagina(numero));
    for (const fila of pagina.filas) {
      const id = String(fila?.citaId);
      if (!/^[1-9]\d*$/.test(id) || citas.has(id)) throw new Error('Cita inválida o repetida en el reporte.');
      citas.add(id);
      filas.push(fila);
    }
    hayMas = pagina.hayMas;
    numero += 1;
  } while (hayMas);
  return filas;
}
