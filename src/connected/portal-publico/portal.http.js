// Los fallos de transporte no son conflictos ni resultados funcionales de la API.
export class ErrorPortalPublico extends Error {
  constructor(tipo, mensaje, { status: estado = 0, codigo = tipo, accion = 'reintentar' } = {}) {
    super(mensaje);
    this.name = 'PublicPortalError';
    Object.assign(this, { tipo, status: estado, codigo, accion });
  }
}

// Solo se admiten las nueve rutas públicas; nunca una URL remota o una ruta privada.
const rutas = /^(catalogo|disponibilidad|apartados|apartados\/[1-9]\d*(?:\/liberar)?|intentos|intentos\/[A-Za-z0-9_-]{16,64}\/(?:reservar|resolver))$/;
export function crearPortalClient(slug, { ejecutarFetch = globalThis.fetch, tiempoLimiteMs = 15000 } = {}) {
  const rutaBase = `/publico/negocios/${encodeURIComponent(slug)}`;
  let csrfToken = null;

  // La cookie HttpOnly viaja con fetch; JWT y VITE_API_URL no intervienen aquí.
  async function enviar(ruta, { method = 'GET', body, consulta, signal, keepalive = false } = {}, inicializacion = false) {
    if ((!rutas.test(ruta) && !(inicializacion && ruta === 'sesion')) || !['GET', 'POST'].includes(method)) {
      throw new ErrorPortalPublico('protocol', 'Ruta pública no permitida.');
    }
    if (method !== 'GET' && !inicializacion && !csrfToken) {
      throw new ErrorPortalPublico('session', 'Inicie la sesión pública antes de continuar.', { accion: 'reiniciar' });
    }
    // Solo una liberación pequeña puede sobrevivir a la salida de la página.
    if (keepalive && (method !== 'POST' || !/^apartados\/[1-9]\d*\/liberar$/.test(ruta))) {
      throw new ErrorPortalPublico('protocol', 'Keepalive solo está permitido para liberar un apartado.');
    }
    const headers = { Accept: 'application/json' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      if (inicializacion) headers['X-Portal-Inicializacion'] = '1';
      else headers['X-CSRF-Token'] = csrfToken;
    }
    const parametros = new URLSearchParams(consulta);
    const sufijo = parametros.size ? `?${parametros}` : '';
    let respuesta;
    try {
      const tiempoLimite = AbortSignal.timeout(tiempoLimiteMs);
      respuesta = await ejecutarFetch(`${rutaBase}/${ruta}${sufijo}`, {
        method, headers, credentials: 'same-origin', cache: 'no-store', redirect: 'error', keepalive,
        signal: signal ? AbortSignal.any([signal, tiempoLimite]) : tiempoLimite,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new ErrorPortalPublico('network', 'No se pudo contactar con el portal. Compruebe su conexión e inténtelo de nuevo.');
    }
    if (respuesta.status === 204) return null;
    let datos;
    try { datos = await respuesta.json(); }
    catch { throw new ErrorPortalPublico('protocol', 'El portal devolvió una respuesta no válida.', { status: respuesta.status }); }
    if (!respuesta.ok) {
      // Solo se muestran mensajes del contrato público, nunca HTML o excepciones internas.
      // El único código funcional especial es el cupo telefónico. Se admite
      // solo con 409; los demás errores siguen el contrato portal_<estado>.
      const valido = (datos?.codigo === `portal_${respuesta.status}` ||
        (respuesta.status === 409 && datos?.codigo === 'cupo_telefono_excedido')) && typeof datos.mensaje === 'string';
      if (respuesta.status === 401) csrfToken = null;
      throw new ErrorPortalPublico('http', valido ? datos.mensaje : 'No se pudo completar la solicitud pública.', {
        status: respuesta.status, codigo: valido ? datos.codigo : 'portal_error',
        accion: valido && ['corregir', 'reiniciar', 'volver', 'reintentar'].includes(datos.accion) ? datos.accion : 'reintentar',
      });
    }
    return datos;
  }

  return {
    solicitar: (ruta, opciones) => enviar(ruta, opciones),
    // Un segundo POST inocuo prueba la cookie sin crear apartados ni leerla desde JS.
    // El CSRF solo queda disponible tras confirmar el mismo negocio y credencial.
    async iniciarSesionVerificada() {
      csrfToken = null;
      const valido = (datos) => datos?.negocio?.slug === slug && typeof datos.negocio.nombre === 'string' &&
        /^[a-f0-9]{64}$/.test(datos.csrfToken);
      const primera = await enviar('sesion', { method: 'POST', body: {} }, true);
      if (!valido(primera)) throw new ErrorPortalPublico('protocol', 'La sesión pública devolvió una respuesta no válida.');
      const segunda = await enviar('sesion', { method: 'POST', body: {} }, true);
      if (!valido(segunda)) throw new ErrorPortalPublico('protocol', 'No se pudo comprobar la sesión pública.');
      if (primera.csrfToken !== segunda.csrfToken) {
        throw new ErrorPortalPublico('cookies', 'El navegador no conserva la cookie del portal. Permita las cookies de este sitio para continuar.', { accion: 'reiniciar' });
      }
      csrfToken = segunda.csrfToken;
      return { negocio: segunda.negocio };
    },
  };
}
