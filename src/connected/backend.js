// Punto de entrada de la versión conectada para las vistas compartidas.
export { isDemo, pending, modeUrl } from './mode.js';
export { api, usuarioActual as user, etiquetaRol, iniciarSesion, cerrarSesion, restaurarSesion, olvidarSesion } from './modules/autenticacion/sesion.estado.js';
export { crearPayloadCatalogo } from './modules/catalogos/catalogos.payload.js';
export { crearPayloadHorario } from './modules/disponibilidad/disponibilidad.payload.js';
export { loadBackendData } from './modules/datos/load.js';
export { paginaPermitida, paginaInicial } from './modules/permisos/permisos.paginas.js';
