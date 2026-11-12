// Cada disparo comparte el trabajo pendiente: foco y temporizador nunca duplican una ronda de consultas.
export function createRefreshCoordinator() {
  const checks = new Set();
  let pending = null;
  return {
    add(check) {
      checks.add(check);
      return () => checks.delete(check);
    },
    clear() {
      checks.clear();
    },
    run() {
      if (pending) return pending;
      pending = Promise.allSettled(
        [...checks].map((check) => Promise.resolve().then(check)),
      ).finally(() => {
        pending = null;
      });
      return pending;
    },
  };
}

// La versión observada es inmutable. Una comprobación fallida también exige releer antes de guardar.
export function createVersionCheck({ version, read, active, notify }) {
  let terminal = false;
  return async () => {
    if (terminal || !active()) return;
    try {
      const result = await read();
      if (!active()) return;
      if (!Number.isInteger(result?.version) || result.version < 1)
        throw new Error('Versión no comprobada.');
      if (result.version !== version) {
        terminal = true;
        notify({ kind: 'stale' });
      }
    } catch (error) {
      if (active()) {
        terminal = true;
        notify({ kind: 'unverified', error });
      }
    }
  };
}
