import { api } from '../auth/session.js';

export function disableService(id, request = api) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Servicio no válido.');
  // Inhabilitar retira el servicio del catálogo operativo sin borrarlo.
  return request(`/servicios/${id}/inhabilitar`, 'POST', {});
}
