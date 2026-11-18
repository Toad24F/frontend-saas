import { ErrorPortalPublico } from './portal.http.js';

// Concesiones y envíos comparten un lock del navegador por negocio. Durante un
// resultado incierto se conserva la concesión del lock hasta resolver o salir;
// así otra pestaña viva no reemplaza el apartado con un envío aún sin comprobar.
export function adquirirMutacionPublica(slug, { locks: bloqueos = globalThis.navigator?.locks } = {}) {
  return new Promise((resolver, rechazar) => {
    if (!bloqueos?.request) { rechazar(new ErrorPortalPublico('coordination', 'No se puede coordinar este navegador.')); return; }
    bloqueos.request(`citalendar:portal:mutacion:${slug}`, { mode: 'exclusive', ifAvailable: true }, async (bloqueo) => {
      if (!bloqueo) { resolver(null); return; }
      let liberar;
      const finalizado = new Promise((finalizar) => { liberar = finalizar; });
      resolver({ liberar: () => liberar() });
      await finalizado;
    }).catch(() => rechazar(new ErrorPortalPublico('coordination', 'No se pudo coordinar la operación entre pestañas.')));
  });
}

// Web Locks coordina todas las pestañas del mismo origen y negocio. No reemplaza
// los bloqueos del servidor. BroadcastChannel se comprueba aquí; sus avisos son T108.
export async function iniciarSesionNavegador(slug, client, entorno = {
  locks: globalThis.navigator?.locks,
  cookieEnabled: globalThis.navigator?.cookieEnabled,
  isSecureContext: globalThis.isSecureContext,
  BroadcastChannel: globalThis.BroadcastChannel,
}) {
  if (entorno.cookieEnabled === false) {
    throw new ErrorPortalPublico('cookies', 'Las cookies están bloqueadas. Permita las cookies de este sitio para continuar.');
  }
  const noDisponible = () => new ErrorPortalPublico('coordination',
    'No se puede coordinar este navegador. Abra el portal en un navegador compatible mediante HTTPS o localhost.');
  if (!entorno.isSecureContext || !entorno.locks?.request || !entorno.BroadcastChannel) throw noDisponible();
  try {
    const canal = new entorno.BroadcastChannel(`citalendar:portal:${slug}`);
    canal.close();
  } catch { throw noDisponible(); }
  try {
    return await entorno.locks.request(`citalendar:portal:sesion:${slug}`, {
      mode: 'exclusive', signal: AbortSignal.timeout(15000),
    }, () => client.iniciarSesionVerificada());
  } catch (error) {
    if (error instanceof ErrorPortalPublico) throw error;
    throw noDisponible();
  }
}
