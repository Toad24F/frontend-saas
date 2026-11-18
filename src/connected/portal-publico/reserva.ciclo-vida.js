// pagehide también cubre recarga y BFCache. No se impide cerrar la página: la
// liberación es de mejor esfuerzo y el vencimiento del servidor sigue vigente.
export function vincularCicloReserva(flujo, entorno = {
  window: globalThis.window, document: globalThis.document,
  setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval,
}) {
  const { window, document } = entorno;
  const verificarAlEnfocar = () => { if (document.visibilityState !== 'hidden') void flujo.verificarVigencia(); };
  const visibilidad = () => document.visibilityState === 'hidden' ? flujo.marcarSinVerificar() : verificarAlEnfocar();
  const salir = () => {
    flujo.salir();
    // El HTML cacheado tampoco debe restaurar datos personales al volver atrás.
    document.querySelectorAll?.('[data-campo-contacto]').forEach((entrada) => { entrada.value = ''; entrada.defaultValue = ''; });
  };
  const restaurar = (evento) => { if (evento.persisted) window.location.reload(); };
  const enlaces = [[window, 'focus', verificarAlEnfocar], [document, 'visibilitychange', visibilidad],
    [window, 'pagehide', salir], [window, 'pageshow', restaurar]];
  for (const [destino, evento, handler] of enlaces) destino.addEventListener(evento, handler);
  // Los métodos nativos de Window exigen su receptor, incluso con dependencias inyectadas.
  const intervalo = entorno.setInterval.call(window, () => flujo.actualizarContador(), 1000);
  return () => {
    entorno.clearInterval.call(window, intervalo);
    for (const [destino, evento, handler] of enlaces) destino.removeEventListener(evento, handler);
  };
}
