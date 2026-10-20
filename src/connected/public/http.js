// Los fallos de transporte no son conflictos ni resultados funcionales de la API.
export class PublicPortalError extends Error {
  constructor(kind, message, { status = 0, code = kind, action = 'reintentar' } = {}) {
    super(message);
    this.name = 'PublicPortalError';
    Object.assign(this, { kind, status, code, action });
  }
}

// Solo se admiten las nueve rutas públicas; nunca una URL remota o una ruta privada.
const routes = /^(catalogo|disponibilidad|apartados|apartados\/[1-9]\d*(?:\/liberar)?|intentos|intentos\/[A-Za-z0-9_-]{16,64}\/(?:reservar|resolver))$/;
export function createPublicClient(slug, { fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const base = `/publico/negocios/${encodeURIComponent(slug)}`;
  let csrfToken = null;

  // La cookie HttpOnly viaja con fetch; JWT y VITE_API_URL no intervienen aquí.
  async function send(path, { method = 'GET', body, query, signal, keepalive = false } = {}, initialization = false) {
    if ((!routes.test(path) && !(initialization && path === 'sesion')) || !['GET', 'POST'].includes(method)) {
      throw new PublicPortalError('protocol', 'Ruta pública no permitida.');
    }
    if (method !== 'GET' && !initialization && !csrfToken) {
      throw new PublicPortalError('session', 'Inicie la sesión pública antes de continuar.', { action: 'reiniciar' });
    }
    // Solo una liberación pequeña puede sobrevivir a la salida de la página.
    if (keepalive && (method !== 'POST' || !/^apartados\/[1-9]\d*\/liberar$/.test(path))) {
      throw new PublicPortalError('protocol', 'Keepalive solo está permitido para liberar un apartado.');
    }
    const headers = { Accept: 'application/json' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      if (initialization) headers['X-Portal-Inicializacion'] = '1';
      else headers['X-CSRF-Token'] = csrfToken;
    }
    const params = new URLSearchParams(query);
    const suffix = params.size ? `?${params}` : '';
    let response;
    try {
      const timeout = AbortSignal.timeout(timeoutMs);
      response = await fetchImpl(`${base}/${path}${suffix}`, {
        method, headers, credentials: 'same-origin', cache: 'no-store', redirect: 'error', keepalive,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new PublicPortalError('network', 'No se pudo contactar con el portal. Compruebe su conexión e inténtelo de nuevo.');
    }
    if (response.status === 204) return null;
    let data;
    try { data = await response.json(); }
    catch { throw new PublicPortalError('protocol', 'El portal devolvió una respuesta no válida.', { status: response.status }); }
    if (!response.ok) {
      // Solo se muestran mensajes del contrato público, nunca HTML o excepciones internas.
      const valid = data?.codigo === `portal_${response.status}` && typeof data.mensaje === 'string';
      if (response.status === 401) csrfToken = null;
      throw new PublicPortalError('http', valid ? data.mensaje : 'No se pudo completar la solicitud pública.', {
        status: response.status, code: valid ? data.codigo : 'portal_error',
        action: valid && ['corregir', 'reiniciar', 'volver', 'reintentar'].includes(data.accion) ? data.accion : 'reintentar',
      });
    }
    return data;
  }

  return {
    request: (path, options) => send(path, options),
    // Un segundo POST inocuo prueba la cookie sin crear apartados ni leerla desde JS.
    // El CSRF solo queda disponible tras confirmar el mismo negocio y credencial.
    async initializeVerifiedSession() {
      csrfToken = null;
      const valid = (data) => data?.negocio?.slug === slug && typeof data.negocio.nombre === 'string' &&
        /^[a-f0-9]{64}$/.test(data.csrfToken);
      const first = await send('sesion', { method: 'POST', body: {} }, true);
      if (!valid(first)) throw new PublicPortalError('protocol', 'La sesión pública devolvió una respuesta no válida.');
      const second = await send('sesion', { method: 'POST', body: {} }, true);
      if (!valid(second)) throw new PublicPortalError('protocol', 'No se pudo comprobar la sesión pública.');
      if (first.csrfToken !== second.csrfToken) {
        throw new PublicPortalError('cookies', 'El navegador no conserva la cookie del portal. Permita las cookies de este sitio para continuar.', { action: 'reiniciar' });
      }
      csrfToken = second.csrfToken;
      return { negocio: second.negocio };
    },
  };
}
