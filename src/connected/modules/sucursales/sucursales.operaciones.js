import { api } from '../auth/session.js';

export function inhabilitarSucursal(id, peticion = api) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Sucursal no válida.');
  // La sucursal queda recuperable; el cupo se relee tras confirmar el POST.
  return peticion(`/sucursales/${id}/inhabilitar`, 'POST', {});
}
