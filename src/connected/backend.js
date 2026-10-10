// Punto de entrada de la versión conectada para las vistas compartidas.
export { isDemo, pending, modeUrl } from './mode.js';
export { api, user, roleLabel, login, logout, restoreSession } from './modules/auth/session.js';
export { catalogPayload } from './modules/catalogos/payload.js';
export { schedulePayload } from './modules/disponibilidad/payload.js';
export { loadBackendData } from './modules/datos/load.js';
export { availablePage, defaultPage } from './modules/permisos/pages.js';
