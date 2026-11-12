// Una generación por consulta evita que una respuesta lenta reemplace los filtros actuales.
export function createAgendaStore(read) {
  let generation = 0;
  const state = {
    key: null,
    busy: false,
    refreshing: false,
    data: null,
    error: null,
    refreshError: null,
  };
  return {
    state,
    reset() {
      generation++;
      Object.assign(state, {
        key: null,
        busy: false,
        refreshing: false,
        data: null,
        error: null,
        refreshError: null,
      });
    },
    async load(filters, { background = false } = {}) {
      const current = ++generation;
      // Solo la MISMA consulta puede retener su último snapshot durante un refresco; nunca otro filtro o sesión.
      const retain =
        background &&
        state.key === JSON.stringify(filters) &&
        state.data != null;
      Object.assign(state, {
        key: JSON.stringify(filters),
        busy: !retain,
        refreshing: retain,
        data: retain ? state.data : null,
        error: null,
        refreshError: null,
      });
      try {
        const result = await read(filters);
        if (current === generation) state.data = result;
      } catch (error) {
        if (current === generation) {
          // Un fallo técnico permite mostrar el último snapshot con aviso; una denegación nunca lo conserva.
          if (retain && ![400, 401, 403, 404, 409].includes(error.status))
            state.refreshError = error;
          else {
            state.error = error;
            state.data = null;
          }
        }
      } finally {
        if (current === generation) {
          state.busy = false;
          state.refreshing = false;
        }
      }
      return current === generation;
    },
  };
}
