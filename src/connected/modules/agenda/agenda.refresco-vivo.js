// Cada disparo comparte el trabajo pendiente: foco y temporizador nunca duplican una ronda de consultas.
export function crearCoordinadorRefresco() {
  const comprobaciones = new Set();
  let pendiente = null;
  return {
    add(comprobar) {
      comprobaciones.add(comprobar);
      return () => comprobaciones.delete(comprobar);
    },
    clear() {
      comprobaciones.clear();
    },
    run() {
      if (pendiente) return pendiente;
      pendiente = Promise.allSettled(
        [...comprobaciones].map((comprobar) => Promise.resolve().then(comprobar)),
      ).finally(() => {
        pendiente = null;
      });
      return pendiente;
    },
  };
}

// La versión observada es inmutable. Una comprobación fallida también exige releer antes de guardar.
export function crearComprobacionVersion({ version, read: leer, active: activo, notify: notificar }) {
  let terminal = false;
  return async () => {
    if (terminal || !activo()) return;
    try {
      const resultado = await leer();
      if (!activo()) return;
      if (!Number.isInteger(resultado?.version) || resultado.version < 1)
        throw new Error('Versión no comprobada.');
      if (resultado.version !== version) {
        terminal = true;
        notificar({ kind: 'stale' });
      }
    } catch (error) {
      if (activo()) {
        terminal = true;
        notificar({ kind: 'unverified', error });
      }
    }
  };
}
