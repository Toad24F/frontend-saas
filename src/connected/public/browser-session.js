import { PublicPortalError } from './http.js';

// Concesiones y envíos comparten un lock del navegador por negocio. Durante un
// resultado incierto se conserva la concesión del lock hasta resolver o salir;
// así otra pestaña viva no reemplaza el apartado con un envío aún sin comprobar.
export function acquirePublicMutation(slug, { locks = globalThis.navigator?.locks } = {}) {
  return new Promise((resolve, reject) => {
    if (!locks?.request) { reject(new PublicPortalError('coordination', 'No se puede coordinar este navegador.')); return; }
    locks.request(`citalendar:portal:mutacion:${slug}`, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
      if (!lock) { resolve(null); return; }
      let release;
      const finished = new Promise((done) => { release = done; });
      resolve({ release: () => release() });
      await finished;
    }).catch(() => reject(new PublicPortalError('coordination', 'No se pudo coordinar la operación entre pestañas.')));
  });
}

// Web Locks coordina todas las pestañas del mismo origen y negocio. No reemplaza
// los bloqueos del servidor. BroadcastChannel se comprueba aquí; sus avisos son T108.
export async function initializePublicBrowser(slug, client, environment = {
  locks: globalThis.navigator?.locks,
  cookieEnabled: globalThis.navigator?.cookieEnabled,
  isSecureContext: globalThis.isSecureContext,
  BroadcastChannel: globalThis.BroadcastChannel,
}) {
  if (environment.cookieEnabled === false) {
    throw new PublicPortalError('cookies', 'Las cookies están bloqueadas. Permita las cookies de este sitio para continuar.');
  }
  const unavailable = () => new PublicPortalError('coordination',
    'No se puede coordinar este navegador. Abra el portal en un navegador compatible mediante HTTPS o localhost.');
  if (!environment.isSecureContext || !environment.locks?.request || !environment.BroadcastChannel) throw unavailable();
  try {
    const channel = new environment.BroadcastChannel(`citalendar:portal:${slug}`);
    channel.close();
  } catch { throw unavailable(); }
  try {
    return await environment.locks.request(`citalendar:portal:sesion:${slug}`, {
      mode: 'exclusive', signal: AbortSignal.timeout(15000),
    }, () => client.initializeVerifiedSession());
  } catch (error) {
    if (error instanceof PublicPortalError) throw error;
    throw unavailable();
  }
}
