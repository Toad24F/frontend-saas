import { usuarioActual as usuario } from '../autenticacion/sesion.estado.js';
import { paginasPorRol } from './permisos.roles.js';

export function paginaInicial() {
  return paginasPorRol(usuario?.rol)[0] || 'cuenta';
}

export function paginaPermitida(pagina) {
  return paginasPorRol(usuario?.rol).includes(pagina);
}
