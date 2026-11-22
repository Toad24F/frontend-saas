// Solo el 409 tipado y una proyección mínima autorizan mostrar una propuesta de unión.
export function reconocerCoincidencia(error) {
  const destino = error?.destino;
  if (error?.status !== 409 || error.codigo !== 'cliente_coincidente' ||
    !destino || !Number.isInteger(destino.id) || destino.id < 1 ||
    !Number.isInteger(destino.version) || destino.version < 1 ||
    typeof destino.nombreCompleto !== 'string' || !destino.nombreCompleto ||
    Object.keys(destino).some((clave) => !['id', 'version', 'nombreCompleto'].includes(clave))) return null;
  return destino;
}

export function crearIntentoUnion(origen, destino, datosPropuestos, clave = crypto.randomUUID()) {
  if (!Number.isInteger(origen?.id) || origen.id < 1 ||
    !Number.isInteger(origen.version) || origen.version < 1 ||
    !Number.isInteger(destino?.id) || destino.id < 1 || destino.id === origen.id ||
    !Number.isInteger(destino.version) || destino.version < 1 ||
    !/^[A-Za-z0-9_-]{16,64}$/.test(clave)) throw new Error('La selección de fichas no es válida.');
  return {
    destinoId: destino.id, versionOrigen: origen.version, versionDestino: destino.version, clave,
    ...(datosPropuestos ? { datosPropuestos: Object.freeze({ ...datosPropuestos }) } : {}),
  };
}

export function validarResultadoUnion(resultado, intento) {
  if (!resultado || typeof resultado.id !== 'string' || !/^\d+$/.test(resultado.id) ||
    resultado.origenId < 1 || resultado.destinoId !== intento.destinoId ||
    resultado.versionOrigen !== intento.versionOrigen + 1 ||
    resultado.versionDestino !== intento.versionDestino + 1 ||
    !Number.isFinite(Date.parse(resultado.ocurridoEn))) throw new Error('El resultado de unión no es válido.');
  return resultado;
}

export function leerUnionPendiente(identidad) {
  try {
    const prefijo = `union-cliente:${identidad}:`;
    for (let indice = 0; indice < sessionStorage.length; indice++) {
      const clave = sessionStorage.key(indice);
      if (!clave?.startsWith(prefijo)) continue;
      const origenId = Number(clave.slice(prefijo.length));
      const intento = JSON.parse(sessionStorage.getItem(clave));
      if (Number.isSafeInteger(origenId) && origenId > 0 &&
        Number.isSafeInteger(intento?.destinoId) && intento.destinoId > 0 &&
        /^[A-Za-z0-9_-]{16,64}$/.test(intento?.clave))
        return { clave, origenId, intento };
    }
  } catch { /* El almacenamiento inaccesible deja la recuperación dentro del panel abierto. */ }
  return null;
}
