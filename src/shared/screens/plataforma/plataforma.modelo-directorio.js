export const etiquetasLicencia = { pendiente: 'Pendiente', vigente: 'Vigente', suspension_pendiente: 'Suspensión programada', suspendida: 'Suspendida', vencida: 'Vencida' };
export const opcionesSeguimiento = { 'por-activar': 'Por activar', 'por-vencer': 'Próximas a vencer', 'acceso-bloqueado': 'Acceso bloqueado', 'correos-fallidos': 'Con correos fallidos' };
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function coincideSeguimiento(negocio, seguimiento) {
  if (seguimiento === 'por-activar') return negocio.category === 'Pendiente de activación';
  if (seguimiento === 'por-vencer') return negocio.license === 'vigente' && Number.isFinite(negocio.validity?.tiempoRestante?.dias) && negocio.validity.tiempoRestante.dias >= 0 && negocio.validity.tiempoRestante.dias < 30;
  if (seguimiento === 'acceso-bloqueado') return negocio.validity?.condicionAcceso === false;
  if (seguimiento === 'correos-fallidos') return negocio.failedDeliveries > 0;
  return true;
}
export function paginarDirectorio(negocios, { busqueda = '', estadoLicencia = '', seguimiento = '', pagina = 1 } = {}) {
  const consulta = normalizar(busqueda.trim());
  const filtrados = negocios.filter((negocio) => (!estadoLicencia || negocio.license === estadoLicencia) && coincideSeguimiento(negocio, seguimiento)
    && (!consulta || [negocio.name, negocio.slug, negocio.email].some((valor) => normalizar(valor).includes(consulta))));
  const paginas = Math.max(1, Math.ceil(filtrados.length / 10));
  const actual = Math.min(paginas, Math.max(1, Number.isSafeInteger(pagina) ? pagina : 1));
  return { filas: filtrados.slice((actual - 1) * 10, actual * 10), total: filtrados.length, paginas, pagina: actual };
}
export function textoTiempoRestante(negocio) {
  if (negocio.license === 'vencida') return 'Vencida';
  if (negocio.license === 'pendiente') return 'Sin iniciar';
  const tiempo = negocio.validity?.tiempoRestante;
  if (!tiempo || !Number.isSafeInteger(tiempo.dias) || tiempo.dias < 0) return 'No disponible';
  const dias = tiempo.dias === 0 ? 'Menos de 1 día' : `${tiempo.dias} ${tiempo.dias === 1 ? 'día' : 'días'}`;
  return negocio.license === 'suspendida' || negocio.validity?.tiempoCongelado ? `${dias} ${tiempo.dias <= 1 ? 'conservado' : 'conservados'}`
    : negocio.license === 'suspension_pendiente' ? `${dias} hasta bloqueo o vencimiento` : dias;
}
