// Punto de entrada de la versión conectada para las vistas compartidas.
export { isDemo, pending, modeUrl } from './mode.js';
export { api, user, roleLabel, login, logout, restoreSession, forgetSession } from './modules/auth/session.js';
export { crearPayloadCatalogo } from './modules/catalogos/catalogos.payload.js';
export { crearPayloadHorario } from './modules/disponibilidad/disponibilidad.payload.js';
export { loadBackendData } from './modules/datos/load.js';
export { availablePage, defaultPage } from './modules/permisos/pages.js';
