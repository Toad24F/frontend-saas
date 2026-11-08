// pagehide también cubre recarga y BFCache. No se impide cerrar la página: la
// liberación es de mejor esfuerzo y el vencimiento del servidor sigue vigente.
export function bindBookingLifecycle(flow, environment = {
  window: globalThis.window, document: globalThis.document,
  setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval,
}) {
  const { window, document } = environment;
  const focus = () => { if (document.visibilityState !== 'hidden') void flow.recheck(); };
  const visibility = () => document.visibilityState === 'hidden' ? flow.markUnverified() : focus();
  const exit = () => {
    flow.exit();
    // El HTML cacheado tampoco debe restaurar datos personales al volver atrás.
    document.querySelectorAll?.('[data-contact-field]').forEach((input) => { input.value = ''; input.defaultValue = ''; });
  };
  const restore = (event) => { if (event.persisted) window.location.reload(); };
  const bindings = [[window, 'focus', focus], [document, 'visibilitychange', visibility],
    [window, 'pagehide', exit], [window, 'pageshow', restore]];
  for (const [target, event, listener] of bindings) target.addEventListener(event, listener);
  // Los métodos nativos de Window exigen su receptor, incluso con dependencias inyectadas.
  const interval = environment.setInterval.call(window, () => flow.tick(), 1000);
  return () => {
    environment.clearInterval.call(window, interval);
    for (const [target, event, listener] of bindings) target.removeEventListener(event, listener);
  };
}
