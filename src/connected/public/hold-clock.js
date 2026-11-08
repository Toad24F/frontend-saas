// Ancla el presupuesto a servidorAhora y expiraEn originales. El tiempo de red
// se descuenta conservadoramente; actividad o consultas no recuperan segundos.
export function createHoldClock(monotonicNow = () => performance.now()) {
  let deadline = 0;
  let observed = -Infinity;
  const current = () => (observed = Math.max(observed, monotonicNow()));
  function budget(expires, serverNow, requestedAt) {
    const finish = current();
    const duration = Date.parse(expires) - Date.parse(serverNow);
    if (!Number.isFinite(duration) || duration > 300000) throw new Error('Reloj de apartado inválido.');
    return finish + Math.max(0, duration - Math.max(0, finish - requestedAt));
  }
  return {
    start(expires, serverNow, requestedAt) { deadline = budget(expires, serverNow, requestedAt); },
    sync(expires, serverNow, requestedAt) { deadline = Math.min(deadline, budget(expires, serverNow, requestedAt)); },
    remaining: () => Math.max(0, deadline - current()),
  };
}
