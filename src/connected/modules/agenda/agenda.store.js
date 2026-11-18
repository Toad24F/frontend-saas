// Una generación por consulta evita que una respuesta lenta reemplace los filtros actuales.
export function crearAgendaStore(leer) {
  let generacion = 0;
  const estado = {
    key: null,
    busy: false,
    refreshing: false,
    data: null,
    error: null,
    refreshError: null,
  };
  return {
    state: estado,
    use(filtros, datos) {
      generacion++;
      Object.assign(estado, { key: JSON.stringify(filtros), data: datos, busy: false, refreshing: false, error: null, refreshError: null });
    },
    reset() {
      generacion++;
      Object.assign(estado, {
        key: null,
        busy: false,
        refreshing: false,
        data: null,
        error: null,
        refreshError: null,
      });
    },
    async load(filtros, { background: segundoPlano = false, force: forzar = false } = {}) {
      const vigente = ++generacion;
      // Solo la MISMA consulta puede retener su último snapshot durante un refresco; nunca otro filtro o sesión.
      const conservar =
        segundoPlano &&
        estado.key === JSON.stringify(filtros) &&
        estado.data != null;
      Object.assign(estado, {
        key: JSON.stringify(filtros),
        busy: !conservar,
        refreshing: conservar,
        data: conservar ? estado.data : null,
        error: null,
        refreshError: null,
      });
      try {
        const resultado = await leer(filtros, { force: forzar });
        if (vigente === generacion) estado.data = resultado;
      } catch (error) {
        if (vigente === generacion) {
          // Un fallo técnico permite mostrar el último snapshot con aviso; una denegación nunca lo conserva.
          if (conservar && ![400, 401, 403, 404, 409].includes(error.status))
            estado.refreshError = error;
          else {
            estado.error = error;
            estado.data = null;
          }
        }
      } finally {
        if (vigente === generacion) {
          estado.busy = false;
          estado.refreshing = false;
        }
      }
      return vigente === generacion;
    },
  };
}
