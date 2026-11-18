import { usuarioActual as user } from '../autenticacion/sesion.estado.js';
import { pagesForRole } from './roles.js';

export function defaultPage() {
  return pagesForRole(user?.rol)[0] || 'cuenta';
}

export function availablePage(page) {
  return pagesForRole(user?.rol).includes(page);
}
