// Una generación por consulta evita que una respuesta lenta reemplace los filtros actuales.
export function createAgendaStore(read) {
  let generation = 0;
  const state = { key: null, busy: false, data: null, error: null };
  return {
    state,
    reset() { generation++; Object.assign(state, { key: null, busy: false, data: null, error: null }); },
    async load(filters) {
      const current = ++generation;
      Object.assign(state, { key: JSON.stringify(filters), busy: true, data: null, error: null });
      try { const result = await read(filters); if (current === generation) state.data = result; }
      catch (error) { if (current === generation) state.error = error; }
      finally { if (current === generation) state.busy = false; }
      return current === generation;
    },
  };
}
