import { user } from '../auth/session.js';

export function availablePage(page) {
  return user?.rol === 'admin_negocio' && ['profesionales', 'servicios', 'sucursales', 'disponibilidad'].includes(page) || user?.rol === 'profesional' && ['servicios', 'sucursales', 'disponibilidad'].includes(page) || user?.rol === 'superadmin' && page === 'plataforma';
}
