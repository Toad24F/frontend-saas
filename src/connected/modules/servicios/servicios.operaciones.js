import { api } from '../auth/session.js';

export function inhabilitarServicio(id, peticion = api) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Servicio no válido.');
  // Inhabilitar retira el servicio del catálogo operativo sin borrarlo.
  return peticion(`/servicios/${id}/inhabilitar`, 'POST', {});
}
