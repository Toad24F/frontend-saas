// Punto de entrada de la versión conectada para las vistas compartidas.
export { esDemo, mensajePendiente, urlSegunModo } from './conexion.modo.js';
export { api, usuarioActual, etiquetaRol, iniciarSesion, cerrarSesion, restaurarSesion, olvidarSesion } from './modules/autenticacion/sesion.estado.js';
export { crearPayloadCatalogo } from './modules/catalogos/catalogos.payload.js';
export { crearPayloadHorario } from './modules/disponibilidad/disponibilidad.payload.js';
export { cargarDatosBackend } from './modules/datos/datos.carga.js';
export { paginaPermitida, paginaInicial } from './modules/permisos/permisos.paginas.js';
