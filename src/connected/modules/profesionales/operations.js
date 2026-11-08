import { api } from '../auth/session.js';

export async function submitProfessionalAction(id, action, request = api) {
  if (!Number.isSafeInteger(id) || id < 1 || !['deactivate', 'reactivate', 'disable'].includes(action)) {
    throw new Error('Acción de profesional no válida.');
  }
  // El retiro recuperable reemplaza a DELETE; desactivar permanece separado.
  if (action === 'disable') return request(`/profesionales/${id}/inhabilitar`, 'POST', {});
  return request(`/profesionales/${id}/${action === 'deactivate' ? 'desactivar' : 'reactivar'}`, 'POST', {});
}
