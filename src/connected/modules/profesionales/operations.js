import { api } from '../auth/session.js';

export async function submitProfessionalAction(id, action, request = api) {
  if (!Number.isSafeInteger(id) || id < 1 || !['deactivate', 'reactivate', 'delete'].includes(action)) {
    throw new Error('Acción de profesional no válida.');
  }
  if (action === 'delete') return request(`/profesionales/${id}`, 'DELETE');
  return request(`/profesionales/${id}/${action === 'deactivate' ? 'desactivar' : 'reactivar'}`, 'POST', {});
}
