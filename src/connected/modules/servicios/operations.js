import { api } from '../auth/session.js';

export function deleteService(id, request = api) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Servicio no válido.');
  return request(`/servicios/${id}`, 'DELETE');
}
