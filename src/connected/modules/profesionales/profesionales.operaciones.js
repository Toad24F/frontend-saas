import { api } from '../auth/session.js';

export async function ejecutarAccionProfesional(id, accion, peticion = api) {
  if (!Number.isSafeInteger(id) || id < 1 || !['desactivar', 'reactivar', 'inhabilitar'].includes(accion)) {
    throw new Error('Acción de profesional no válida.');
  }
  // El retiro recuperable reemplaza a DELETE; desactivar permanece separado.
  if (accion === 'inhabilitar') return peticion(`/profesionales/${id}/inhabilitar`, 'POST', {});
  return peticion(`/profesionales/${id}/${accion}`, 'POST', {});
}
