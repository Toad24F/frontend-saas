import { reemplazarDatos } from '../../../shared/aplicacion.datos.js';

const baseApi = (import.meta.env?.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const claveSesion = 'cita-session';
const leerToken = (tipoAlmacenamiento) => {
  try { return globalThis[tipoAlmacenamiento]?.getItem(claveSesion) || null; }
  catch { return null; }
};
const guardarToken = (tipoAlmacenamiento, valor) => {
  try {
    if (valor == null) globalThis[tipoAlmacenamiento]?.removeItem(claveSesion);
    else globalThis[tipoAlmacenamiento]?.setItem(claveSesion, valor);
  } catch { /* El almacenamiento bloqueado no impide el acceso en memoria. */ }
};
const persistirToken = () => { guardarToken('localStorage', token); guardarToken('sessionStorage', token); };
// La vigencia siempre se comprueba con /auth/profile, nunca a partir de este valor local.
let token = leerToken('localStorage') || leerToken('sessionStorage');
export let usuarioActual = null;
export const etiquetaRol = (rol) => ({ admin_negocio: 'Administración', superadmin: 'Superadministración', profesional: 'Profesional', recepcionista: 'Recepción' })[rol] || '';
export async function api(ruta, method = 'GET', cuerpo, opciones = {}) {
  const tokenPeticion = token;
  // El navegador genera el límite de cada parte para las cargas multipart.
  const esMultipart = cuerpo instanceof FormData;
  let respuesta;
  try {
    respuesta = await fetch(`${baseApi}${ruta}`, {
      // Cabeceras adicionales solo se pasan cuando la llamada las solicita;
      // los demás consumidores conservan exactamente sus cabeceras previas.
      method, headers: { ...(cuerpo === undefined || esMultipart ? {} : { 'Content-Type': 'application/json' }), ...(tokenPeticion ? { Authorization: `Bearer ${tokenPeticion}` } : {}), ...opciones.headers },
      ...(cuerpo === undefined ? {} : { body: esMultipart ? cuerpo : JSON.stringify(cuerpo) }),
    });
  } catch {
    const error = new Error('No se pudo conectar con el backend. Comprueba que esté iniciado y revisa VITE_API_URL.');
    error.status = 0;
    throw error;
  }
  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token === tokenPeticion && !['/auth/login', '/auth/activar-administrador', '/auth/recuperar-contrasena'].includes(ruta)) {
      limpiarSesion();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('cita-sesion-expirada'));
    }
    const error = new Error(Array.isArray(datos?.message) ? datos.message.join(' · ') : datos?.message || `Error del servidor (${respuesta.status}).`);
    error.status = respuesta.status;
    // Conservar únicamente la proyección tipada para que el editor pueda ofrecer
    // una unión explícita sin mostrar el cuerpo libre de cualquier error HTTP.
    if (respuesta.status === 409 && datos?.codigo === 'cliente_coincidente') {
      error.codigo = datos.codigo;
      error.destino = datos.destino;
    }
    if (respuesta.status === 400 && ruta.startsWith('/citas?') && datos?.codigo === 'agenda_demasiado_amplia') {
      error.codigo = datos.codigo;
    }
    throw error;
  }
  return datos;
}
function limpiarSesion(limpiarPersistente = true) {
  const tokenAnterior = token;
  token = null; usuarioActual = null; reemplazarDatos(undefined);
  guardarToken('sessionStorage', null);
  if (limpiarPersistente && (!leerToken('localStorage') || leerToken('localStorage') === tokenAnterior)) guardarToken('localStorage', null);
}
export function olvidarSesion() { limpiarSesion(); }
export async function iniciarSesion(correo, contrasena) {
  const resultado = await api('/auth/login', 'POST', { email: correo, password: contrasena });
  token = resultado.accessToken;
  persistirToken();
  usuarioActual = resultado.usuario;
}
export async function cerrarSesion() {
  const tokenObservado = token;
  await api('/auth/logout', 'POST');
  if (token === tokenObservado) limpiarSesion();
}
export async function restaurarSesion() {
  if (!token) return false;
  const tokenObservado = token;
  const resultado = await api('/auth/profile');
  if (token !== tokenObservado) return false;
  const nombreNegocio = [
    resultado.user?.nombreNegocio,
    resultado.user?.negocioNombre,
    resultado.user?.negocio?.nombre,
    resultado.nombreNegocio,
    resultado.negocioNombre,
    resultado.negocio?.nombre,
  ].find((nombre) => typeof nombre === 'string' && nombre.trim());
  usuarioActual = { ...resultado.user, id: resultado.user.sub, nombreNegocio: nombreNegocio?.trim() || null };
  persistirToken();
  return true;
}

if (typeof window !== 'undefined') window.addEventListener('storage', (evento) => {
  if (typeof document !== 'undefined' && document.documentElement.dataset.appMode === 'demo') return;
  if (!token || (evento.key !== claveSesion && evento.key !== null) || evento.newValue === token) return;
  try { if (evento.storageArea !== globalThis.localStorage) return; }
  catch { return; }
  // Otra pestaña cerró/cambió la cuenta: retirar su UI sin borrar la nueva sesión de esa pestaña.
  limpiarSesion(false);
  window.dispatchEvent(new Event('cita-sesion-expirada'));
});
