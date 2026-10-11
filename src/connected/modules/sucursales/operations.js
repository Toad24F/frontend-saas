import { api } from '../auth/session.js';

export function deleteBranch(id, request = api) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Sucursal no válida.');
  return request(`/sucursales/${id}`, 'DELETE');
}
