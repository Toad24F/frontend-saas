import { user } from '../auth/session.js';
import { pagesForRole } from './roles.js';

export function defaultPage() {
  return pagesForRole(user?.rol)[0] || 'cuenta';
}

export function availablePage(page) {
  return pagesForRole(user?.rol).includes(page);
}
