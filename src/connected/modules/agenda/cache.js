// Solo snapshots completos y autorizados; la instancia pertenece a una sesión y se limpia al salir.
const fold = (value) => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
const project = (data, query) => ({ ...data, desde: query.desde, hasta: query.hasta, citas: data.citas.filter((item) =>
  item.fechaLocal >= query.desde && item.fechaLocal <= query.hasta &&
  (!query.sucursalId || query.sucursalId === 'all' || String(item.sucursalId) === String(query.sucursalId)) &&
  (!query.personalId || query.personalId === 'all' || String(item.personalId) === String(query.personalId)) &&
  (!query.estado || query.estado === 'all' || item.estado === query.estado) &&
  (!query.busqueda || fold(item.nombreContacto).includes(fold(query.busqueda.trim()))) &&
  (!query.afectadas || item.causas?.length)) });
export function createAgendaCache(read, { maxEntries = 6, ttl = 30000, now = Date.now } = {}) {
  const entries = new Map(), pending = new Map();
  let generation = 0;
  const clear = () => { generation++; entries.clear(); pending.clear(); };
  function peek(query) {
    for (const entry of [...entries.values()].reverse()) {
      if (now() - entry.at <= ttl && entry.query.desde <= query.desde && entry.query.hasta >= query.hasta &&
        (!entry.exact || entry.exact === JSON.stringify(query))) return project(entry.data, query);
    }
    return null;
  }
  return {
    clear, peek, get size() { return entries.size; },
    async read(query, { force = false } = {}) {
      const cached = !force && peek(query);
      if (cached) return cached;
      const base = { desde: query.desde, hasta: query.hasta }, key = JSON.stringify(base);
      const revision = generation;
      // Compartir la lectura base, pero no la proyección de los filtros de cada consumidor.
      if (!pending.has(key)) {
        const task = (async () => {
          const data = await read(base);
          if (revision === generation) {
            entries.delete(key); entries.set(key, { query: base, data, at: now() });
            while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
          }
          return data;
        })();
        pending.set(key, task);
      }
      const task = pending.get(key);
      try { return project(await task, query); }
      catch (error) {
        if ([401, 403, 404, 409].includes(error.status) && revision === generation) clear();
        // El límite técnico se resuelve en servidor, jamás truncando un snapshot.
        if (revision !== generation || error.status !== 400 || !/1[.,]?000/.test(error.message) ||
          ![query.personalId, query.sucursalId, query.estado, query.busqueda].some((v) => v && v !== 'all')) throw error;
        let data;
        try { data = await read(query); }
        catch (fallbackError) {
          if ([401, 403, 404, 409].includes(fallbackError.status) && revision === generation) clear();
          throw fallbackError;
        }
        if (revision === generation) {
          const exact = JSON.stringify(query);
          entries.set(exact, { query: base, exact, data, at: now() });
          while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
        }
        return project(data, query);
      } finally { if (pending.get(key) === task) pending.delete(key); }
    },
  };
}
