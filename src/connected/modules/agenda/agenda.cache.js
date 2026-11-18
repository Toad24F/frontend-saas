// Solo snapshots completos y autorizados; la instancia pertenece a una sesión y se limpia al salir.
const normalizarBusqueda = (valor) => String(valor || '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
const proyectar = (datos, consulta) => ({ ...datos, desde: consulta.desde, hasta: consulta.hasta, citas: datos.citas.filter((elemento) =>
  elemento.fechaLocal >= consulta.desde && elemento.fechaLocal <= consulta.hasta &&
  (!consulta.sucursalId || consulta.sucursalId === 'all' || String(elemento.sucursalId) === String(consulta.sucursalId)) &&
  (!consulta.personalId || consulta.personalId === 'all' || String(elemento.personalId) === String(consulta.personalId)) &&
  (!consulta.estado || consulta.estado === 'all' || elemento.estado === consulta.estado) &&
  (!consulta.busqueda || normalizarBusqueda(elemento.nombreContacto).includes(normalizarBusqueda(consulta.busqueda.trim()))) &&
  (!consulta.afectadas || elemento.causas?.length)) });
export function crearCacheAgenda(leer, { maxEntries: maxEntradas = 6, ttl: vigencia = 30000, now: ahora = Date.now } = {}) {
  const entradas = new Map(), pendiente = new Map();
  let generacion = 0;
  const limpiar = () => { generacion++; entradas.clear(); pendiente.clear(); };
  function peek(consulta) {
    for (const entrada of [...entradas.values()].reverse()) {
      if (ahora() - entrada.at <= vigencia && entrada.query.desde <= consulta.desde && entrada.query.hasta >= consulta.hasta &&
        (!entrada.exact || entrada.exact === JSON.stringify(consulta))) return proyectar(entrada.data, consulta);
    }
    return null;
  }
  return {
    clear: limpiar, peek, get size() { return entradas.size; },
    async read(consulta, { force: forzar = false } = {}) {
      const enCache = !forzar && peek(consulta);
      if (enCache) return enCache;
      const base = { desde: consulta.desde, hasta: consulta.hasta }, claveInterna = JSON.stringify(base);
      const revision = generacion;
      // Compartir la lectura base, pero no la proyección de los filtros de cada consumidor.
      if (!pendiente.has(claveInterna)) {
        const tarea = (async () => {
          const datos = await leer(base);
          if (revision === generacion) {
            entradas.delete(claveInterna); entradas.set(claveInterna, { query: base, data: datos, at: ahora() });
            while (entradas.size > maxEntradas) entradas.delete(entradas.keys().next().value);
          }
          return datos;
        })();
        pendiente.set(claveInterna, tarea);
      }
      const tarea = pendiente.get(claveInterna);
      try { return proyectar(await tarea, consulta); }
      catch (error) {
        if ([401, 403, 404, 409].includes(error.status) && revision === generacion) limpiar();
        // El límite técnico se resuelve en servidor, jamás truncando un snapshot.
        if (revision !== generacion || error.status !== 400 || !/1[.,]?000/.test(error.message) ||
          ![consulta.personalId, consulta.sucursalId, consulta.estado, consulta.busqueda].some((v) => v && v !== 'all')) throw error;
        let datos;
        try { datos = await leer(consulta); }
        catch (errorRespaldo) {
          if ([401, 403, 404, 409].includes(errorRespaldo.status) && revision === generacion) limpiar();
          throw errorRespaldo;
        }
        if (revision === generacion) {
          const exacta = JSON.stringify(consulta);
          entradas.set(exacta, { query: base, exact: exacta, data: datos, at: ahora() });
          while (entradas.size > maxEntradas) entradas.delete(entradas.keys().next().value);
        }
        return proyectar(datos, consulta);
      } finally { if (pendiente.get(claveInterna) === tarea) pendiente.delete(claveInterna); }
    },
  };
}
