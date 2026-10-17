import { replaceData } from '../../../shared/data.js';

const base = (import.meta.env?.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
let token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cita-session') : null;
export let user = null;
export const roleLabel = (role) => ({ admin_negocio: 'Administración', superadmin: 'Superadministración', profesional: 'Profesional', recepcionista: 'Recepción' })[role] || '';
export async function api(path, method = 'GET', body) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    const error = new Error('No se pudo conectar con el backend. Comprueba que esté iniciado y revisa VITE_API_URL.');
    error.status = 0;
    throw error;
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/activar-administrador', '/auth/recuperar-contrasena'].includes(path)) {
      clearSession();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('cita-session-expired'));
    }
    const error = new Error(Array.isArray(data?.message) ? data.message.join(' · ') : data?.message || `Error del servidor (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}
function clearSession() {
  token = null; user = null; replaceData(undefined);
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('cita-session');
}
export function forgetSession() { clearSession(); }
export async function login(email, password) {
  const result = await api('/auth/login', 'POST', { email, password });
  token = result.accessToken;
  sessionStorage.setItem('cita-session', token);
  user = result.usuario;
}
export async function logout() {
  await api('/auth/logout', 'POST');
  clearSession();
}
export async function restoreSession() {
  if (!token) return false;
  const result = await api('/auth/profile');
  const businessName = [
    result.user?.nombreNegocio,
    result.user?.negocioNombre,
    result.user?.negocio?.nombre,
    result.nombreNegocio,
    result.negocioNombre,
    result.negocio?.nombre,
  ].find((name) => typeof name === 'string' && name.trim());
  user = { ...result.user, id: result.user.sub, nombreNegocio: businessName?.trim() || null };
  return true;
}
