import { replaceData } from '../../../shared/data.js';

const base = (import.meta.env?.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const sessionKey = 'cita-session';
const stored = (kind) => {
  try { return globalThis[kind]?.getItem(sessionKey) || null; }
  catch { return null; }
};
const store = (kind, value) => {
  try {
    if (value == null) globalThis[kind]?.removeItem(sessionKey);
    else globalThis[kind]?.setItem(sessionKey, value);
  } catch { /* El almacenamiento bloqueado no impide el acceso en memoria. */ }
};
const persistToken = () => { store('localStorage', token); store('sessionStorage', token); };
// La vigencia siempre se comprueba con /auth/profile, nunca a partir de este valor local.
let token = stored('localStorage') || stored('sessionStorage');
export let user = null;
export const roleLabel = (role) => ({ admin_negocio: 'Administración', superadmin: 'Superadministración', profesional: 'Profesional', recepcionista: 'Recepción' })[role] || '';
export async function api(path, method = 'GET', body, options = {}) {
  const requestToken = token;
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      // Cabeceras adicionales solo se pasan cuando la llamada las solicita;
      // los demás consumidores conservan exactamente sus cabeceras previas.
      method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}), ...options.headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    const error = new Error('No se pudo conectar con el backend. Comprueba que esté iniciado y revisa VITE_API_URL.');
    error.status = 0;
    throw error;
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token === requestToken && !['/auth/login', '/auth/activar-administrador', '/auth/recuperar-contrasena'].includes(path)) {
      clearSession();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('cita-session-expired'));
    }
    const error = new Error(Array.isArray(data?.message) ? data.message.join(' · ') : data?.message || `Error del servidor (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}
function clearSession(removePersistent = true) {
  const previousToken = token;
  token = null; user = null; replaceData(undefined);
  store('sessionStorage', null);
  if (removePersistent && (!stored('localStorage') || stored('localStorage') === previousToken)) store('localStorage', null);
}
export function forgetSession() { clearSession(); }
export async function login(email, password) {
  const result = await api('/auth/login', 'POST', { email, password });
  token = result.accessToken;
  persistToken();
  user = result.usuario;
}
export async function logout() {
  const observed = token;
  await api('/auth/logout', 'POST');
  if (token === observed) clearSession();
}
export async function restoreSession() {
  if (!token) return false;
  const observed = token;
  const result = await api('/auth/profile');
  if (token !== observed) return false;
  const businessName = [
    result.user?.nombreNegocio,
    result.user?.negocioNombre,
    result.user?.negocio?.nombre,
    result.nombreNegocio,
    result.negocioNombre,
    result.negocio?.nombre,
  ].find((name) => typeof name === 'string' && name.trim());
  user = { ...result.user, id: result.user.sub, nombreNegocio: businessName?.trim() || null };
  persistToken();
  return true;
}

if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (typeof document !== 'undefined' && document.documentElement.dataset.appMode === 'demo') return;
  if (!token || (event.key !== sessionKey && event.key !== null) || event.newValue === token) return;
  try { if (event.storageArea !== globalThis.localStorage) return; }
  catch { return; }
  // Otra pestaña cerró/cambió la cuenta: retirar su UI sin borrar la nueva sesión de esa pestaña.
  clearSession(false);
  window.dispatchEvent(new Event('cita-session-expired'));
});
