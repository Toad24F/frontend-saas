import { user } from '../auth/session.js';

const pagesByRole = {
  superadmin: ['plataforma', 'negocio', 'cuenta'],
  admin_negocio: ['profesionales', 'recepcionistas', 'servicios', 'sucursales', 'disponibilidad', 'cuenta'],
  profesional: ['servicios', 'sucursales', 'disponibilidad', 'cuenta'],
  recepcionista: ['cuenta'],
};

export function defaultPage() {
  return pagesByRole[user?.rol]?.[0] || 'cuenta';
}

export function availablePage(page) {
  return pagesByRole[user?.rol]?.includes(page) || false;
}
