// Ancla el presupuesto a servidorAhora y expiraEn originales. El tiempo de red
// se descuenta conservadoramente; actividad o consultas no recuperan segundos.
export function crearRelojApartado(ahoraMonotono = () => performance.now()) {
  let vencimiento = 0;
  let observado = -Infinity;
  const actual = () => (observado = Math.max(observado, ahoraMonotono()));
  function calcularPresupuesto(vencimientoServidor, ahoraServidor, solicitadoEn) {
    const fin = actual();
    const duracion = Date.parse(vencimientoServidor) - Date.parse(ahoraServidor);
    if (!Number.isFinite(duracion) || duracion > 300000) throw new Error('Reloj de apartado inválido.');
    return fin + Math.max(0, duracion - Math.max(0, fin - solicitadoEn));
  }
  return {
    iniciar(vencimientoServidor, ahoraServidor, solicitadoEn) { vencimiento = calcularPresupuesto(vencimientoServidor, ahoraServidor, solicitadoEn); },
    sincronizar(vencimientoServidor, ahoraServidor, solicitadoEn) { vencimiento = Math.min(vencimiento, calcularPresupuesto(vencimientoServidor, ahoraServidor, solicitadoEn)); },
    restante: () => Math.max(0, vencimiento - actual()),
  };
}
